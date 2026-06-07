// screens/ExploreScreen.js
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import PostCard from '../components/PostCard';
import SearchBarCard from '../components/SearchBarCard';
import api from '../api/config';
import { searchUsers } from '../api/profileService';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import { transformPostsArray } from '../api/postService';

const HEADER_HEIGHT = 45;
const PAGE_SIZE = 10;

const ExploreScreen = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const onEndReachedCalledDuringMomentum = useRef(false);
  const initialLoadComplete = useRef(false);
  const lastFetchTime = useRef(0);

  const fetchPosts = async (pageNum, shouldRefresh = false) => {
    if ((pageNum > 1 && !hasNext) || loadingMore) return;

    shouldRefresh ? setRefreshing(true)
                  : pageNum === 1 ? setLoading(true)
                                : setLoadingMore(true);

    try {
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
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      if (pageNum === 1) {
        initialLoadComplete.current = true;
      }
    }
  };

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

  const handleSearchUsers = (query) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    if (query.trim()) {
      const timeout = setTimeout(async () => {
        const results = await searchUsers(query);
        setSearchResults(results);
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
    }
  };

  const handleUserResultPress = (username) => {
    setSearchQuery('');
    setSearchResults([]);
    router.push({ pathname: '/profile-screen', params: { username } });
  };

  // Fetch posts when component mounts
  useEffect(() => {
    fetchPosts(1);
  }, []);

  return (
    <View style={styles.rootContainer}>
      <ScrollableScreenWrapper title="Explore">
        <Animated.FlatList
          data={posts}
          renderItem={({ item }) => <PostCard post={item} />}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
            <View style={styles.searchBarContainer}>
              <SearchBarCard
                profileHue={220}
                searchResults={searchResults}
                onSearch={handleSearchUsers}
                onResultPress={handleUserResultPress}
              />
            </View>
          }
          contentContainerStyle={styles.container}
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
  searchBarContainer: {
    marginTop: 50,
    marginBottom: 16,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: HEADER_HEIGHT,
    flexGrow: 1,
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