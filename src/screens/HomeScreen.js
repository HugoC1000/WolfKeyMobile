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
} from 'react-native';
import Schedule from '../components/ScheduleCard';
import PostCard from '../components/PostCard';
import api from '../api/config';
import BackgroundSvg from '../components/BackgroundSVG';
import { useUser } from '../context/userContext';
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
  const { user } = useUser();
  const onEndReachedCalledDuringMomentum = useRef(false);

  const fetchPosts = async (pageNum, shouldRefresh = false) => {
    if ((pageNum > 1 && !hasNext) || loadingMore) return;

    shouldRefresh ? setRefreshing(true)
                  : pageNum === 1 ? setLoading(true)
                                  : setLoadingMore(true);

    try {
      const res = await api.get(`for-you/?page=${pageNum}&limit=${PAGE_SIZE}`);
      const data = res.data;

      setPosts(prev =>
        shouldRefresh || pageNum === 1 ? data.posts : [...prev, ...data.posts]
      );
      setHasNext(data.has_next);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

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

  const handleLoadMore = () => {
    if (!onEndReachedCalledDuringMomentum.current) {
      fetchPosts(page + 1);
      onEndReachedCalledDuringMomentum.current = true;
    }
  };

  const handleRefresh = () => {
    fetchPosts(1, true);
  };

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

      <ScrollableScreenWrapper title="Home" isHome = {true}>
        <Animated.FlatList
          data={posts}
          renderItem={({ item }) => <PostCard post={item} />}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.container}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          onMomentumScrollBegin={() => {
            onEndReachedCalledDuringMomentum.current = false;
          }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={
            loadingMore && hasNext ? (
              <ActivityIndicator style={styles.loader} />
            ) : (
              <View style={{ height: 40 }} />
            )
          }
          ListEmptyComponent={
            !loading && posts.length === 0 ? (
              <Text style={styles.emptyText}>No posts available</Text>
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
