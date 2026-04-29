import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  AppState,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Schedule from '../components/ScheduleCard';
import PostCard from '../components/PostCard';
import api from '../api/config';
import { getAuthToken, removeAuthToken } from '../api/config';
import { useUser } from '../context/userContext';
import { useAuth } from '../context/authContext';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import { transformPostsArray } from '../api/postService';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { triggerPressHaptic } from '../utils/haptics';


const HEADER_HEIGHT = 45; // Height of the header
const PAGE_SIZE = 10;


const HomeScreen = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [fabState, setFabState] = useState({ open: false });
  const { user } = useUser();
  const { logout } = useAuth();
  const onEndReachedCalledDuringMomentum = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const initialLoadComplete = useRef(false);
  const lastFetchTime = useRef(0);
  const fabRotation = useRef(new Animated.Value(0)).current;

  const setFabOpen = useCallback((open) => {
    setFabState({ open });
    Animated.timing(fabRotation, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fabRotation]);

  const fabIconRotate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const fabActions = [
    {
      icon: 'help',
      label: 'Create Post',
      onPress: () => {
        void triggerPressHaptic();
        setFabOpen(false);
        router.push('/create-post?type=standard');
      },
    },
    {
      icon: 'poll',
      label: 'Create Poll',
      onPress: () => {
        void triggerPressHaptic();
        setFabOpen(false);
        router.push('/create-post?type=poll');
      },
    },
  ];

  // Handle token expiration and authentication errors
  const handleAuthError = useCallback(async () => {
    console.error('🔐 AUTH ERROR: Token expired or invalid, logging out user');
    setAuthError(true);
    try {
      await removeAuthToken();
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [logout]);

  const fetchPosts = useCallback(async (pageNum, shouldRefresh = false) => {
    if ((pageNum > 1 && !hasNext) || loadingMore) return;

    // Reset auth error state when trying to fetch
    if (authError) setAuthError(false);

    shouldRefresh ? setRefreshing(true)
                  : pageNum === 1 ? setLoading(true)
                                  : setLoadingMore(true);

    try {
      // Check if user is authenticated before making request
      const token = await getAuthToken();
      
      if (!token) {
        console.error('HOME SCREEN: No auth token found, cannot fetch posts');
        await handleAuthError();
        return;
      }

      const res = await api.get(`all-posts/?page=${pageNum}&limit=${PAGE_SIZE}`);
      const data = res.data;

      // Transform course data to Course instances
      const transformedPosts = transformPostsArray(data.posts);

      setPosts(prev =>
        shouldRefresh || pageNum === 1 ? transformedPosts : [...prev, ...transformedPosts]
      );
      setHasNext(data.has_next);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching posts:', err);
      
      // Handle token expiration and authentication errors
      if (err.response?.status === 401) {
        await handleAuthError();
        return;
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      if (pageNum === 1) {
        initialLoadComplete.current = true;
      }
    }
  }, [hasNext, loadingMore, authError, handleAuthError]);

  useEffect(() => {

    if (!user) {
      setPosts([]);
      setPage(1);
      setHasNext(true);
      return;
    }

    setPosts([]);
    setPage(1);
    setHasNext(true);
    setLoading(true);
    fetchPosts(1);
  }, [user?.id]);

  const handleAppStateChange = useCallback((nextAppState) => {
    if (
      nextAppState === 'active' &&
      appStateRef.current !== 'active' &&
      user &&
      !loading &&
      !loadingMore &&
      !refreshing &&
      !authError
    ) {
      fetchPosts(1, true);
    }
    appStateRef.current = nextAppState;
  }, [user, fetchPosts, loading, loadingMore, refreshing, authError]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [handleAppStateChange]);

  const handleLoadMore = () => {
    if (!onEndReachedCalledDuringMomentum.current) {
      // Only load more if initial load is complete and debounce time has passed
      const now = Date.now();
      if (initialLoadComplete.current && now - lastFetchTime.current > 300) {
        lastFetchTime.current = now;
        fetchPosts(page + 1);
      }
      onEndReachedCalledDuringMomentum.current = true;
    }
  };

  const handleRefresh = () => {
    fetchPosts(1, true);
  };

  const ListHeader = useCallback(() => {
    return (
      <View>
        <View style={styles.headerSpacer} />
        <View style={styles.scheduleContainer}>
          <Schedule key={user?.id} />
        </View>
      </View>
    );
  }, [user?.id]);

  return (
    <>
      <View style={styles.rootContainer}>
        <ScrollableScreenWrapper title="Home" isHome={true}>
            <Animated.FlatList
              data={posts}
              renderItem={({ item }) => <PostCard post={item} />}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={ListHeader}
              contentContainerStyle={{ ...styles.container, flexGrow: 1 }}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.1}
              onMomentumScrollBegin={() => {
                onEndReachedCalledDuringMomentum.current = false;
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#4A90E2']}
                  tintColor="#4A90E2"
                  progressBackgroundColor="#ffffff"
                  progressViewOffset={HEADER_HEIGHT +70}
                />
              }

            ListFooterComponent={
              loadingMore && hasNext ? (
                <ActivityIndicator style={styles.loader} />
              ) : (
                <View style={{ height: 40 }} />
              )
            }
            ListEmptyComponent={
              !loading && posts.length === 0 ? (
                <Text style={styles.emptyText}>
                  {authError 
                    ? 'Session expired. Please login again.' 
                    : 'No posts available'
                  }
                </Text>
              ) : null
            }
          />
        </ScrollableScreenWrapper>
      </View>
      
      {/* FAB Group with Glass Effect Container */}
      {fabState.open && (
        <TouchableOpacity
          style={styles.fabBackdrop}
          onPress={() => setFabOpen(false)}
        />
      )}

      {fabState.open && (
        <View style={styles.fabActionsStack}>
          {fabActions.map((action, index) => (
            <GlassContainer key={index} spacing={32} style={styles.fabActionPill}>
              <GlassView style={styles.fabActionPillGlass} glassEffectStyle="regular" isInteractive>
                <TouchableOpacity
                  style={styles.fabAction}
                  onPress={action.onPress}
                >
                  <MaterialIcons name={action.icon} size={20} />
                  <Text style={styles.fabActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              </GlassView>
            </GlassContainer>
          ))}
        </View>
      )}

      <GlassContainer spacing={32} style={styles.fabButtonContainer}>
        <GlassView style={styles.fabButtonGlass} glassEffectStyle="regular" isInteractive>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={() => {
              void triggerPressHaptic();
              setFabOpen(!fabState.open);
            }}
          >
            <Animated.View style={{ transform: [{ rotate: fabIconRotate }] }}>
              <MaterialIcons
                name="add"
                size={28}
                color="#000000"
              />
            </Animated.View>
          </TouchableOpacity>
        </GlassView>
      </GlassContainer>
    </>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    paddingTop: HEADER_HEIGHT,
    paddingHorizontal: 16,
  },
  headerSpacer: {
    height: HEADER_HEIGHT,
  },
  scheduleContainer: {
    marginBottom: 16,
  },
  loader: {
    marginVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#666',
  },
  fabBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  fabButtonContainer: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 9999,
  },
  fabActionsStack: {
    position: 'absolute',
    right: 20,
    bottom: 170,
    alignItems: 'flex-end',
    zIndex: 9999,
  },
  fabActionPill: {
    borderRadius: 999,
    marginBottom: 8,
    alignSelf: 'flex-end',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 9999,
  },
  fabActionPillGlass: {
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  fabAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabButtonGlass: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  fabActionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
});

export default HomeScreen;
