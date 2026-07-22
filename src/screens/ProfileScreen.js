import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useUser } from '../context/userContext';
import BackgroundSvg from '../components/BackgroundSVG';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import ProfileCard from '../components/ProfileCard';
import CourseComparisonCard from '../components/CourseComparisonCard';
import PostCard from '../components/PostCard';
import * as ImagePicker from 'expo-image-picker';
import {
  getCurrentProfile,
  getProfileByUsername,
  getProfilePosts,
  uploadProfilePicture,
} from '../api/profileService';

const ProfileScreen = () => {
  const { user } = useUser();
  const params = useLocalSearchParams();
  const username = params?.username;
  const isFocused = useIsFocused();
  const isCurrentUser = !username || username === user?.username;
  const cachedProfile = isCurrentUser ? user : null;

  const [profile, setProfile] = useState(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const fetchProfilePosts = async (profileUsername) => {
    if (!profileUsername) {
      setPosts([]);
      return;
    }

    try {
      setPostsLoading(true);
      const result = await getProfilePosts(profileUsername, 1, 3);
      setPosts(result.posts);
    } catch (error) {
      console.error('Error fetching profile posts:', error);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchProfile = async (postsAlreadyLoading = false) => {
    try {
      let profileData;
      if (isCurrentUser) {
        profileData = await getCurrentProfile();
      } else {
        profileData = await getProfileByUsername(username);
      }

      setProfile(profileData);
      // The profile itself is ready; posts can continue loading independently.
      setLoading(false);
      const profileUsername = profileData?.username || profileData?.user?.username || user?.username || username;
      // A current-user profile can open before its cached username is available.
      // In that case, start the posts request as soon as the profile resolves.
      if (!postsAlreadyLoading && profileUsername) {
        void fetchProfilePosts(profileUsername);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Native tabs may mount this route in the background at startup. Wait until
    // it is actually the active screen before requesting profile data.
    if (!isFocused) return;

    const locallyAvailableProfile = isCurrentUser ? user : null;
    const profileUsername = username || user?.username;

    setProfile(locallyAvailableProfile);
    setLoading(!locallyAvailableProfile);

    // Start loading posts from the route username immediately, in parallel with
    // the profile-detail request. This avoids making the posts request wait for
    // the detail endpoint to return.
    if (profileUsername) {
      void fetchProfilePosts(profileUsername);
    }
    void fetchProfile(Boolean(profileUsername));
  }, [isFocused, username, user?.username]);

  const onRefresh = () => {
    setRefreshing(true);
    const profileUsername = username || user?.username;
    if (profileUsername) {
      void fetchProfilePosts(profileUsername);
    }
    void fetchProfile(Boolean(profileUsername));
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
        title={'Profile'}
        onSettingsPress={handleSettingsPress}
        isSetting={isCurrentUser}
        contentPaddingTop={0}
      >
        <FlatList
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          data={posts}
          keyExtractor={(post) => String(post.id)}
          renderItem={({ item: post }) => <PostCard post={post} />}
          ListHeaderComponent={
            <View style={styles.contentPanel}>
              <ProfileCard
                profile={profile}
                isCurrentUser={isCurrentUser}
                onEditPress={handleEditPress}
                onCompareSchedules={handleCompareSchedules}
                onImagePress={handleImagePress}
              />

              {!isCurrentUser && (
                <CourseComparisonCard
                  viewedProfile={profile}
                  currentProfile={user}
                  isCurrentUser={isCurrentUser}
                />
              )}
            </View>
          }
          ListEmptyComponent={
            postsLoading ? (
              <ActivityIndicator size="small" color="#2563eb" style={styles.postsLoadingIndicator} />
            ) : (
              <Text style={styles.placeholderText}>No posts yet.</Text>
            )
          }
          ListFooterComponent={<View style={styles.listFooter} />}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
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
  },
  contentContainer: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  contentPanel: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
  },
  postsTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  postsLoadingIndicator: {
    marginVertical: 4,
  },
  placeholderText: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginVertical: 18,
  },
  listFooter: {
    height: 100,
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
