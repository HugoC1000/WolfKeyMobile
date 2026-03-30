import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import {
  getCurrentProfile,
  getProfileByUsername,
  uploadProfilePicture,
} from '../api/profileService';

const ProfileScreen = () => {
  const { user } = useUser();
  const params = useLocalSearchParams();
  const username = params?.username;
  const isCurrentUser = !username || username === user?.username;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
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
      const response = await api.get(`profile/${profileUsername}/posts/`);
      setPosts(response?.data?.posts || []);
    } catch (error) {
      console.error('Error fetching profile posts:', error);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      let profileData;
      if (isCurrentUser) {
        profileData = await getCurrentProfile();
      } else {
        profileData = await getProfileByUsername(username);
      }

      setProfile(profileData);
      const profileUsername = profileData?.username || profileData?.user?.username || user?.username || username;
      await fetchProfilePosts(profileUsername);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
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
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentPanel}>
            <ProfileCard
              profile={profile}
              isCurrentUser={isCurrentUser}
              onEditPress={handleEditPress}
              onCompareSchedules={handleCompareSchedules}
              onImagePress={handleImagePress}
            />

            <View style={styles.postsSection}>
              {postsLoading ? (
                <ActivityIndicator size="small" color="#2563eb" style={styles.postsLoadingIndicator} />
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <Text style={styles.placeholderText}>No posts yet.</Text>
              )}
            </View>
          </View>
        </ScrollView>
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
    paddingTop: 0,
  },
  contentPanel: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 16,
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
  postsSection: {
    marginTop: 10,
  },
  placeholderText: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 10,
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
