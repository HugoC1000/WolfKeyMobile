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
import { router, useLocalSearchParams } from 'expo-router';
import PostCard from '../components/PostCard';
import SearchBarCard from '../components/SearchBarCard';
import api from '../api/config';
import { searchUsers } from '../api/profileService';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import ScreenHeaderSpacer from '../components/ScreenHeaderSpacer';
import { transformPostsArray } from '../api/postService';

const PAGE_SIZE = 10;

const ExploreScreen = () => {
  const { focusSearch } = useLocalSearchParams();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const searchTimeout = useRef(null);
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
    clearTimeout(searchTimeout.current);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        setSearchResults(await searchUsers(query));
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      }
    }, 300);
  };

  const handleUserResultPress = (username) => {
    setSearchResults([]);
    router.push({ pathname: '/users/[username]', params: { username } });
  };

  // Fetch posts when component mounts
  useEffect(() => {
    fetchPosts(1);

    return () => clearTimeout(searchTimeout.current);
  }, []);

  return (
    <View style={styles.rootContainer}>
      <ScrollableScreenWrapper title="Explore">
        <Animated.FlatList
          data={posts}
          renderItem={({ item }) => <PostCard post={item} />}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
            <>
              <ScreenHeaderSpacer />
              <View style={styles.searchBarContainer}>
                <SearchBarCard
                  profileHue={220}
                  searchResults={searchResults}
                  onSearch={handleSearchUsers}
                  onResultPress={handleUserResultPress}
                  focusRequestKey={focusSearch}
                />
              </View>
            </>
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
    marginBottom: 16,
  },
  container: {
    paddingHorizontal: 9,
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
