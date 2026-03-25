import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useUser } from '../context/userContext';
import BackgroundSvg from '../components/BackgroundSVG';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import ProfileCard from '../components/ProfileCard';
import PostCard from '../components/PostCard';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/config';
import { transformPostsArray } from '../api/postService';
import {
  getCurrentProfile,
  getProfileByUsername,
  uploadProfilePicture,
} from '../api/profileService';

const PAGE_SIZE = 10;

const ProfileScreen = () => {
  const { user } = useUser();
  const params = useLocalSearchParams();
  const username = params?.username;
  const isCurrentUser = !username || username === user?.username;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchProfile = async () => {
    try {
      let profileData;
      if (isCurrentUser) {
        profileData = await getCurrentProfile();
      } else {
        profileData = await getProfileByUsername(username);
      }

      setProfile(profileData);
      await fetchProfilePosts(1, true, profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProfilePosts = async (pageNum = 1, reset = false, profileData = profile) => {
    if (!profileData) return;
    if (pageNum > 1 && (!hasNext || loadingMore)) return;

    if (reset) {
      setLoadingPosts(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await api.get(`all-posts/?page=${pageNum}&limit=${PAGE_SIZE}`);
      const transformedPosts = transformPostsArray(res.data.posts || []);
      const filtered = transformedPosts.filter((post) => {
        const authorId = post?.author?.id;
        const authorUsername = post?.author?.username;
        return authorId === profileData.id || authorUsername === profileData.username;
      });

      setPosts((prev) => (reset || pageNum === 1 ? filtered : [...prev, ...filtered]));
      setHasNext(Boolean(res.data.has_next));
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching profile posts:', error);
    } finally {
      setLoadingPosts(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasNext) {
      fetchProfilePosts(page + 1, false);
    }
  };

  const handleImagePress = async () => {
    if (!isCurrentUser) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please grant camera roll permissions to upload a profile picture.'
      );
      return;
    }

    Alert.alert('Profile Picture', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose from Gallery', onPress: pickImage },
      { text: 'Take Photo', onPress: takePhoto },
    ]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please grant camera permissions to take a photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadImage = async (imageAsset) => {
    try {
      setLoading(true);
      const imageData = {
        uri: imageAsset.uri,
        type: imageAsset.type || 'image/jpeg',
        fileName: imageAsset.fileName || 'profile_picture.jpg',
      };

      await uploadProfilePicture(imageData);
      await fetchProfile();
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPress = () => {
    router.push('/edit-profile');
  };

  const handleSettingsPress = () => {
    router.push('/settings');
  };

  const handleCompareSchedules = () => {
    Alert.alert('Coming Soon', 'Schedule comparison feature is being updated.');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BackgroundSvg hue={user?.userprofile?.background_hue} />
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundSvg hue={user?.userprofile?.background_hue} />
      <ScrollableScreenWrapper
        title={isCurrentUser ? 'My Profile' : `${profile?.user?.username}'s Profile`}
        onSettingsPress={isCurrentUser ? handleSettingsPress : undefined}
        showSettings={isCurrentUser}
      >
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <PostCard post={item} />}
          style={styles.content}
          ListHeaderComponent={
            <>
              <ProfileCard
                profile={profile}
                isCurrentUser={isCurrentUser}
                onEditPress={handleEditPress}
                onCompareSchedules={handleCompareSchedules}
                onImagePress={handleImagePress}
              />

              <View style={styles.contentPanel}>
                <Text style={styles.postsTitle}>Posts</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            !loadingPosts ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.placeholderText}>No posts yet.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.footerLoader} color="#2563eb" /> : <View style={{ height: 40 }} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      </ScrollableScreenWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 72,
  },
  contentPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
  },
  emptyContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    minHeight: 92,
  },
  footerLoader: {
    marginVertical: 16,
  },
  postsTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  placeholderText: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
});

export default ProfileScreen;
