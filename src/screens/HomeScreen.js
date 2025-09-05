// HomeScreen.js
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  FlatList,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
  Platform,
  RefreshControl,
  AppState,
} from 'react-native';
import Schedule from '../components/ScheduleCard';
import PostCard from '../components/PostCard';
import api from '../api/config';
import { getAuthToken, removeAuthToken } from '../api/config';
import BackgroundSvg from '../components/BackgroundSVG';
import { useUser } from '../context/userContext';
import { useAuth } from '../context/authContext';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';


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
  const { user } = useUser();
  const { logout } = useAuth();
  const onEndReachedCalledDuringMomentum = useRef(false);
  const appStateRef = useRef(AppState.currentState);

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
      // console.log('HOME SCREEN: Fetching posts for page:', pageNum);
      // console.log('HOME SCREEN: Auth token present:', !!token);
      // console.log('HOME SCREEN: User ID:', user?.id);
      
      if (!token) {
        console.error('HOME SCREEN: No auth token found, cannot fetch posts');
        await handleAuthError();
        return;
      }

      const res = await api.get(`all-posts/?page=${pageNum}&limit=${PAGE_SIZE}`);
      const data = res.data;

      setPosts(prev =>
        shouldRefresh || pageNum === 1 ? data.posts : [...prev, ...data.posts]
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
  }, [user?.id, fetchPosts]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [handleAppStateChange]);

  const handleLoadMore = () => {
    if (!onEndReachedCalledDuringMomentum.current) {
      fetchPosts(page + 1);
      onEndReachedCalledDuringMomentum.current = true;
    }
  };

  const handleRefresh = () => {
    fetchPosts(1, true);
  };

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

  const ListHeader = useCallback(() => (
    <View>
      <View style={styles.headerSpacer} />
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>
          Hello, {user?.first_name || 'Guest'}! Ready to explore?
        </Text>
      </View>
      <View style={styles.scheduleContainer}>
        <Schedule key={user?.id} />
      </View>
    </View>
  ), [user?.first_name, user?.id]);

  return (
    <View style={styles.rootContainer}>
      <ScrollableScreenWrapper title="Home" isHome={true}>
          <Animated.FlatList
            data={posts}
            renderItem={({ item }) => <PostCard post={item} />}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{ ...styles.container, flexGrow: 1 }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
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
  header: {
    height: HEADER_HEIGHT,
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    backgroundColor: "transparent"
  },
  headerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000, 
  },
  headerSpacer: {
    height: HEADER_HEIGHT,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 10,
  },
  greetingContainer: {
    marginBottom: 12,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
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
});

export default HomeScreen;
