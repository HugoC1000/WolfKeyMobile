import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import ScreenHeaderSpacer from '../components/ScreenHeaderSpacer';
import PostCard from '../components/PostCard';
import api from '../api/config';
import { getFullImageUrl } from '../api/config';
import { transformPostsArray } from '../api/postService';
import { toggleCommunityFollow } from '../api/profileService';
import { useUser } from '../context/userContext';

const CommunityScreen = () => {
  const { user } = useUser();
  const [communities, setCommunities] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [followingId, setFollowingId] = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (!refresh && (loading || refreshing || !hasNext)) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const requestedPage = refresh ? 1 : page;
      const [accountsResponse, postsResponse] = await Promise.all([
        api.get('community/accounts/'),
        api.get(`community/posts/?page=${requestedPage}&limit=8`),
      ]);
      const postData = postsResponse.data;
      const incomingPosts = transformPostsArray(postData.posts || []);
      setCommunities(accountsResponse.data?.communities || []);
      setPosts((current) => {
        if (refresh) return incomingPosts;
        const existingIds = new Set(current.map((post) => post.id));
        return [...current, ...incomingPosts.filter((post) => !existingIds.has(post.id))];
      });
      setHasNext(Boolean(postData.has_next));
      setPage((Number(postData.page) || requestedPage) + 1);
    } catch (error) {
      console.error('Error loading community:', error);
    } finally { setLoading(false); setRefreshing(false); }
  }, [page, loading, refreshing, hasNext]);

  useEffect(() => { load(true); }, [user?.id]);

  const followCommunity = async (community) => {
    if (!community || community.id === user?.id) return;
    setFollowingId(community.id);
    try {
      const result = await toggleCommunityFollow(community.id);
      setCommunities((items) => items.map((item) => item.id === community.id ? { ...item, is_following: result.following } : item));
    } catch (error) { console.error('Error following community:', error); }
    finally { setFollowingId(null); }
  };

  const togglePostCommunityFollow = async (communityId) => {
    const community = communities.find((item) => item.id === communityId);
    if (community) await followCommunity(community);
  };

  const header = <View><ScreenHeaderSpacer /><Text style={styles.heading}>Communities</Text><FlatList horizontal data={communities} showsHorizontalScrollIndicator={false} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.accounts} renderItem={({ item }) => (
      <View style={styles.account}>
      <TouchableOpacity style={styles.accountProfile} onPress={() => router.push({ pathname: '/users/[username]', params: { username: item.username } })} accessibilityRole="button" accessibilityLabel={`Open ${item.full_name || item.username}`}>
        {item.profile_picture_url ? <Image source={{ uri: getFullImageUrl(item.profile_picture_url) }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{(item.full_name || item.username || '?')[0]}</Text></View>}
        <View style={styles.accountNameRow}><Text numberOfLines={2} style={styles.accountName}>{item.full_name || item.username}</Text></View>
      </TouchableOpacity>
      {item.id !== user?.id && <TouchableOpacity style={[styles.followButton, item.is_following && styles.following]} onPress={() => followCommunity(item)} disabled={followingId === item.id} accessibilityRole="button" accessibilityLabel={item.is_following ? `Leave ${item.full_name || item.username}` : `Join ${item.full_name || item.username}`}><Text style={[styles.followText, item.is_following && styles.followingText]}>{followingId === item.id ? 'Saving…' : item.is_following ? 'Joined' : 'Join'}</Text></TouchableOpacity>}
    </View>
  )} /><Text style={styles.heading}>Community posts</Text></View>;

  return <ScrollableScreenWrapper title="Community"><FlatList data={posts} renderItem={({ item }) => { const community = communities.find((account) => account.id === item.author?.id); const canToggleCommunity = Boolean(community && community.id !== user?.id); return <PostCard post={item} showCommunityPin isCommunityFollowing={Boolean(community?.is_following)} onToggleCommunityFollow={canToggleCommunity ? () => togglePostCommunityFollow(item.author.id) : undefined} isTogglingCommunityFollow={followingId === item.author?.id} />; }} keyExtractor={(item) => String(item.id)} ListHeaderComponent={header} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} onEndReached={() => hasNext && load(false)} onEndReachedThreshold={0.4} ListFooterComponent={loading ? <ActivityIndicator style={styles.loader} /> : null} contentContainerStyle={styles.container} /></ScrollableScreenWrapper>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 30,
  },
  heading: {
    color: '#1F2937',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  accounts: { gap: 12, paddingHorizontal: 4, paddingBottom: 20 },
  account: { width: 108, alignItems: 'center' },
  accountProfile: { alignItems: 'center', width: '100%' },
  avatar: { width: 42, height: 42, borderRadius: 99, marginBottom: 7},
  avatarFallback: { width: 42, height: 42, borderRadius: 99, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center'},
  avatarText: { color: '#1D4ED8', fontSize: 18, fontWeight: '700' },
  accountName: { color: '#1F2937', fontWeight: '700', fontSize: 13, lineHeight: 15, textAlign: 'center', maxWidth: 90 },
  accountNameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%', minHeight: 33 },
  followButton: { minWidth: 86, alignItems: 'center', backgroundColor: '#4fa6e5', borderRadius: 16, marginTop: 3, paddingHorizontal: 11, paddingVertical: 6 },
  following: { backgroundColor: '#E9D5FF' },
  followText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  followingText: { color: '#6B21A8' },
  loader: { padding: 18 },
});

export default CommunityScreen;
