// screens/ExploreScreen.js
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import PostCard from '../components/PostCard';
import api from '../api/config';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';

const HEADER_HEIGHT = 45;
const PAGE_SIZE = 10;

const ExploreScreen = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const onEndReachedCalledDuringMomentum = useRef(false);

  const fetchPosts = async (pageNum, shouldRefresh = false) => {
    if ((pageNum > 1 && !hasNext) || loadingMore) return;

    shouldRefresh ? setRefreshing(true)
                  : pageNum === 1 ? setLoading(true)
                                : setLoadingMore(true);

    try {
      const res = await api.get(`all-posts/?page=${pageNum}&limit=${PAGE_SIZE}`);
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

  const handleLoadMore = () => {
    if (!onEndReachedCalledDuringMomentum.current) {
      fetchPosts(page + 1);
      onEndReachedCalledDuringMomentum.current = true;
    }
  };

  const handleRefresh = () => {
    fetchPosts(1, true);
  };

  // Fetch posts when component mounts
  useEffect(() => {
    fetchPosts(1);
  }, []);

  const ListHeader = useCallback(() => (
    <View>
      <View style={styles.headerSpacer} />
      <Text style={styles.exploreTitle}>Explore All Posts</Text>
    </View>
  ), []);

  return (
    <View style={styles.rootContainer}>
      <ScrollableScreenWrapper title="Explore">
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
              progressViewOffset={HEADER_HEIGHT + 70}
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
  headerSpacer: {
    height: HEADER_HEIGHT,
  },
  exploreTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 16,
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

export default ExploreScreen;