import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../context/authContext';
import { useUser } from '../context/userContext';
import Course from '../models/Course';
import BackgroundSvg from '../components/BackgroundSVG';
import { deleteAccount } from '../api/deleteAccountService';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import ProfileCard from '../components/ProfileCard';
import ScheduleTab from '../components/ScheduleTab';
import ExperienceTab from '../components/ExperienceTab';
import CourseSelector from '../components/CourseSelector';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import {
  getCurrentProfile,
  getProfileByUsername,
  uploadProfilePicture,
  addExperience,
  addHelpRequest,
  removeExperience,
  removeHelpRequest,
  updateCourses,
  updatePrivacyPreferences,
} from '../api/profileService';

const ProfileScreen = () => {
  const { logout } = useAuth();
  const { user, clearUser } = useUser();
  const params = useLocalSearchParams();
  const username = params?.username;
  const isCurrentUser = !username || username === user?.username;
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [autoCompleteLoading, setAutoCompleteLoading] = useState(false);

  // Privacy preferences state
  const [allowScheduleComparison, setAllowScheduleComparison] = useState(true);

  // Course selector states
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfile = async () => {
    try {
      let profileData;
      if (isCurrentUser) {
        profileData = await getCurrentProfile();
      } else {
        profileData = await getProfileByUsername(username);
      }
      
      setProfile(profileData);
      
      // Update preference states if this is the current user
      if (isCurrentUser) {
        setAllowScheduleComparison(profileData.user?.userprofile?.allow_schedule_comparison ?? true);
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
    fetchProfile();
  }, [username]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = async () => {
    try {
      await logout(clearUser);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              await logout(clearUser);
              Alert.alert('Account Deleted', 'Your account has been deleted.');
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Account deletion failed:', error);
              Alert.alert('Error', 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const handleImagePress = async () => {
    if (!isCurrentUser) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant camera roll permissions to upload a profile picture.');
      return;
    }

    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Take Photo', onPress: takePhoto },
      ]
    );
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
    try{
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera permissions to take a photo.');
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
    } catch(error){
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

  const handleCompareSchedules = () => {
    // TODO: Implement CompareSchedules route in Expo Router
    // router.push('/compare-schedules');
    Alert.alert('Coming Soon', 'Schedule comparison feature is being updated.');
  };

  const handleAddExperience = async (courseId) => {
    try {
      await addExperience(courseId);
      await fetchProfile();
      Alert.alert('Success', 'Course experience added!');
    } catch (error) {
      console.error('Error adding experience:', error);
      Alert.alert('Error', 'Failed to add course experience');
    }
  };

  const handleAddHelp = async (courseId) => {
    try {
      await addHelpRequest(courseId);
      await fetchProfile();
      Alert.alert('Success', 'Help request added!');
    } catch (error) {
      console.error('Error adding help request:', error);
      Alert.alert('Error', 'Failed to add help request');
    }
  };

  const handleRemoveExperience = async (experienceId) => {
    Alert.alert(
      'Remove Experience',
      'Are you sure you want to remove this course experience?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeExperience(experienceId);
              await fetchProfile();
              Alert.alert('Success', 'Course experience removed!');
            } catch (error) {
              console.error('Error removing experience:', error);
              Alert.alert('Error', 'Failed to remove course experience');
            }
          },
        },
      ]
    );
  };

  const handleRemoveHelp = async (helpId) => {
    Alert.alert(
      'Remove Help Request',
      'Are you sure you want to remove this help request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeHelpRequest(helpId);
              await fetchProfile();
              Alert.alert('Success', 'Help request removed!');
            } catch (error) {
              console.error('Error removing help request:', error);
              Alert.alert('Error', 'Failed to remove help request');
            }
          },
        },
      ]
    );
  };


  const handleUpdatePreference = async (preferenceKey, value) => {
    try {
      // Optimistically update the UI
      if (preferenceKey === 'allow_schedule_comparison') {
        setAllowScheduleComparison(value);
      }

      // Update on backend
      const preferences = {
        [preferenceKey]: value,
      };
      
      await updatePrivacyPreferences(preferences);
      
      // Refresh profile to ensure we have the latest data
      await fetchProfile();
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert the optimistic update on error
      if (preferenceKey === 'allow_schedule_comparison') {
        setAllowScheduleComparison(!value);
      }
      Alert.alert('Error', 'Failed to update privacy preference');
    }
  };

  // Course selection handlers
  const handleCoursePress = (courseOrBlock, block) => {
    if (isCurrentUser) {
      const blockToEdit = block || courseOrBlock;
      setSelectedBlock(blockToEdit);
      setSelectedCourses([]);
      setShowCourseSelector(true);
    }
  };

  const handleCourseSelection = (courses) => {
    setSelectedCourses(courses);
  };

    const handleSubmitCourseSelection = async () => {
    if (selectedCourses.length > 0 && selectedBlock) {
      setIsSubmitting(true);
      
      try {
        if (selectedBlock === 'experience') {
          // Add all selected courses as experience
          await Promise.all(selectedCourses.map(course => addExperience(course.id)));
          Alert.alert('Success', `${selectedCourses.length} course${selectedCourses.length > 1 ? 's' : ''} added to experience!`);
        } else if (selectedBlock === 'help') {
          // Add all selected courses as help requests
          await Promise.all(selectedCourses.map(course => addHelpRequest(course.id)));
          Alert.alert('Success', `${selectedCourses.length} help request${selectedCourses.length > 1 ? 's' : ''} added!`);
        } else {
          // Update schedule block - only use first course
          const course = selectedCourses[0];
          const scheduleUpdate = {
            [`block_${selectedBlock}`]: course.id
          };
          await updateCourses(scheduleUpdate);
          Alert.alert('Success', 'Course updated successfully!');
        }
        
        await fetchProfile();
        handleCloseCourseSelector();
      } catch (error) {
        console.error('Error updating course:', error);
        Alert.alert('Error', 'Failed to update course');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCloseCourseSelector = () => {
    setSelectedCourses([]);
    setShowCourseSelector(false);
    setSelectedBlock(null);
  };

  const handleAddExperienceFromTab = () => {
    setSelectedBlock('experience');
    setSelectedCourses([]);
    setShowCourseSelector(true);
  };

  const handleAddHelpFromTab = () => {
    setSelectedBlock('help');
    setSelectedCourses([]);
    setShowCourseSelector(true);
  };

  const renderTabButton = (tabKey, title, iconName) => {
    const glassAvailable = isLiquidGlassAvailable();
    
    return (
      <TouchableOpacity
        key={tabKey}
        style={[styles.tabButton, activeTab === tabKey && styles.activeTabButton]}
        onPress={() => setActiveTab(tabKey)}
      >
        {glassAvailable ? (
          <GlassView
            glassEffectStyle="regular"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              padding: 8,
              flex: 1,
            }}
            isInteractive
          >
            <MaterialIcons 
              name={iconName} 
              size={20} 
              color={activeTab === tabKey ? '#2563eb' : '#6b7280'} 
            />
            <Text style={[
              styles.tabButtonText,
              activeTab === tabKey && styles.activeTabButtonText
            ]}>
              {title}
            </Text>
          </GlassView>
        ) : (
          <View style={[
            styles.fallbackTabView,
            activeTab === tabKey && styles.fallbackTabViewActive
          ]}>
            <MaterialIcons 
              name={iconName} 
              size={20} 
              color={activeTab === tabKey ? '#2563eb' : '#6b7280'} 
            />
            <Text style={[
              styles.tabButtonText,
              activeTab === tabKey && styles.activeTabButtonText
            ]}>
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Transform schedule_blocks (block_1A, block_1B, ...) to normalized objects for ScheduleTab
  const scheduleForTab = useMemo(() => {
    const blocks = profile?.userprofile?.schedule_blocks || {};
    const result = {};
    Object.entries(blocks).forEach(([blockKey, courseObj]) => {
      result[blockKey] = courseObj
        ? {
            course: courseObj.name || null,
            course_id: courseObj.id || null,
            category: courseObj.category || null,
          }
        : {
            course: null,
            course_id: null,
            category: null,
          };
    });
    return result;
  }, [profile]);

  const renderTabContent = () => {
    if (!profile) return null;

    switch (activeTab) {
      case 'profile':
        return (
          <View>
            <ProfileCard
              profile={profile}
              isCurrentUser={isCurrentUser}
              onEditPress={handleEditPress}
              onCompareSchedules={handleCompareSchedules}
              onImagePress={handleImagePress}
            />
            {isCurrentUser && (
              <>
                {/* Privacy Preferences Section */}
                <View style={styles.preferencesCard}>
                  <Text style={styles.preferencesTitle}>Privacy Preferences</Text>
                  
                  <TouchableOpacity 
                    style={styles.preferenceItem}
                    onPress={() => handleUpdatePreference('allow_schedule_comparison', !allowScheduleComparison)}
                  >
                    <View style={styles.preferenceContent}>
                      <MaterialIcons 
                        name={allowScheduleComparison ? "check-box" : "check-box-outline-blank"} 
                        size={24} 
                        color={allowScheduleComparison ? "#2563eb" : "#9ca3af"} 
                      />
                      <View style={styles.preferenceTextContainer}>
                        <Text style={styles.preferenceTitle}>Allow Schedule Comparison</Text>
                        <Text style={styles.preferenceDescription}>
                          Let others see if you share classes with them
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <MaterialIcons name="logout" size={20} color="white" />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logoutButton, { backgroundColor: '#6b7280', marginTop: 8 }]}
                  onPress={handleDeleteAccount}
                >
                  <MaterialIcons name="delete" size={20} color="white" />
                  <Text style={styles.logoutButtonText}>Delete Account</Text>
                </TouchableOpacity>
              </View>
              </>
            )}
          </View>
        );
      case 'schedule':
        return (
          <ScheduleTab
            schedule={scheduleForTab}
            isCurrentUser={isCurrentUser}
            onCoursePress={handleCoursePress}
            onAddExperience={handleAddExperience}
            onAddHelp={handleAddHelp}
            experiencedCourses={profile.userprofile?.courses?.experienced_courses || []}
            helpNeededCourses={profile.userprofile?.courses?.help_needed_courses || []}
            autoCompleteLoading={autoCompleteLoading}
          />
        );
      case 'experience':
        return (
          <ExperienceTab
            experiencedCourses={profile.userprofile?.courses?.experienced_courses || []}
            helpNeededCourses={profile.userprofile?.courses?.help_needed_courses || []}
            isCurrentUser={isCurrentUser}
            onRemoveExperience={handleRemoveExperience}
            onRemoveHelp={handleRemoveHelp}
            onAddExperience={handleAddExperienceFromTab}
            onAddHelp={handleAddHelpFromTab}
          />
        );
      default:
        return null;
    }
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

  const tabs = [
    { key: 'profile', title: 'Profile', icon: 'person' },
    { key: 'schedule', title: 'Schedule', icon: 'schedule' },
    { key: 'experience', title: 'Experience', icon: 'school' },
  ];

  const glassAvailable = isLiquidGlassAvailable();

  return (
    <View style={styles.container}>
      <BackgroundSvg hue={user?.userprofile?.background_hue} />
      <ScrollableScreenWrapper 
        title={isCurrentUser ? 'My Profile' : `${profile?.user?.username}'s Profile`}
      >
        <View style={styles.content}>
          {/* Tab Navigation */}
          {glassAvailable ? (
            <GlassContainer style={styles.tabContainer} spacing={10}>
              <GlassView style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                flex: 1,
              }}>
                {tabs.map(tab => renderTabButton(tab.key, tab.title, tab.icon))}
              </GlassView>
            </GlassContainer>
          ) : (
            <View style={styles.fallbackTabContainer}>
              {tabs.map(tab => renderTabButton(tab.key, tab.title, tab.icon))}
            </View>
          )}

          {/* Tab Content */}
          <ScrollView
            style={styles.tabContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {renderTabContent()}
          </ScrollView>
        </View>
      </ScrollableScreenWrapper>

      {/* Course Selection Bottom Sheet */}
      <CourseSelector 
        isVisible={showCourseSelector}
        onClose={() => {
          // Only auto-submit if courses were selected
          if (selectedCourses.length > 0 && selectedBlock) {
            handleSubmitCourseSelection();
          } else {
            handleCloseCourseSelector();
          }
        }}
        onCourseSelect={handleCourseSelection}
        selectedCourses={selectedCourses}
      />
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 100,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 6,
  },
  activeTabButtonText: {
    color: '#2563eb',
  },
  fallbackTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 100,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 4,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  fallbackTabView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    padding: 8,
    flex: 1,
    backgroundColor: 'transparent',
  },
  fallbackTabViewActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  tabContent: {
    flex: 1,
    marginTop: 8,
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  preferencesCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  preferencesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  preferenceItem: {
    marginBottom: 12,
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  preferenceTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProfileScreen;