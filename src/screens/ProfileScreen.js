import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useAuth } from '../context/authContext';
import { useUser } from '../context/userContext';
import BackgroundSvg from '../components/BackgroundSVG';
import { deleteAccount } from '../api/deleteAccountService';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import ProfileCard from '../components/ProfileCard';
import ScheduleTab from '../components/ScheduleTab';
import ExperienceTab from '../components/ExperienceTab';
import CourseSelector from '../components/CourseSelector';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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

const ProfileScreen = ({ route, navigation }) => {
  const { logout } = useAuth();
  const { user, clearUser } = useUser();
  const username = route?.params?.username;
  const isCurrentUser = !username || username === user?.username;
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [autoCompleteLoading, setAutoCompleteLoading] = useState(false);

  // Privacy preferences state
  const [allowScheduleComparison, setAllowScheduleComparison] = useState(true);
  const [allowGradeUpdates, setAllowGradeUpdates] = useState(true);

  // Bottom sheet states
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(-1);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomSheetRef = useRef(null);

  const snapPoints = useMemo(() => ['45%', '70%', '90%'], []);

  const handleSheetChanges = useCallback((index) => {
    setCurrentSnapIndex(index);
    if (index === -1) {
      setShowCourseSelector(false);
      setSelectedBlock(null);
      setSelectedCourses([]);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      let profileData;
      if (isCurrentUser) {
        profileData = await getCurrentProfile();
      } else {
        profileData = await getProfileByUsername(username);
      }
      
      // Transform the nested backend data structure to flat structure expected by components
      const transformedProfile = {
        // User basic info
        id: profileData.user?.id,
        username: profileData.user?.username,
        first_name: profileData.user?.first_name,
        last_name: profileData.user?.last_name,
        school_email: profileData.user?.school_email,
        personal_email: profileData.user?.personal_email,
        profile_picture: profileData.user?.profile_picture_url,
        bio: profileData.user?.bio,
        background_hue: profileData.user?.background_hue,
        
  // Schedule blocks - use schedule_blocks directly as it already contains the course data
  // Expected shape:
  // {
  //   "block_1A": { id: number, name: string, category: string, ... },
  //   "block_1B": { id: number, name: string, category: string, ... },
  //   // ... other blocks (block_1D, block_1E, block_2A, ...)
  // }
  // This is the format `ScheduleTab` expects (keys prefixed with "block_").
  schedule_blocks: profileData.user?.schedule_blocks || {},
  
        post_count: profileData.stats?.posts_count || 0,
        solution_count: profileData.stats?.solutions_count || 0,

        experience_courses: profileData.courses?.experienced_courses || [],
        help_needed_courses: profileData.courses?.help_needed_courses || [],
        schedule_courses: profileData.courses?.schedule_courses || {},
        
        recent_posts: profileData.recent_posts || [],
        can_compare: profileData.can_compare || false,
        allow_schedule_comparison: profileData.user?.allow_schedule_comparison ?? true,
        allow_grade_updates: profileData.user?.allow_grade_updates ?? true,
      };
      
      setProfile(transformedProfile);
      
      // Update preference states if this is the current user
      if (isCurrentUser) {
        setAllowScheduleComparison(transformedProfile.allow_schedule_comparison);
        setAllowGradeUpdates(transformedProfile.allow_grade_updates);
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
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
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
    navigation.navigate('EditProfile', { 
      profile,
      onRefresh: () => {
        console.log('Refreshing profile from edit screen');
        fetchProfile();
      }
    });
  };

  const handleCompareSchedules = () => {
    navigation.navigate('CompareSchedules', { 
      users: [user, profile],
      initialUsers: [user.username, profile.username]
    });
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
      } else if (preferenceKey === 'allow_grade_updates') {
        setAllowGradeUpdates(value);
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
      } else if (preferenceKey === 'allow_grade_updates') {
        setAllowGradeUpdates(!value);
      }
      Alert.alert('Error', 'Failed to update privacy preference');
    }
  };

  // Course selection handlers
  const handleCoursePress = (courseOrBlock, block) => {
    if (isCurrentUser) {
      const blockToEdit = block || courseOrBlock;
      setSelectedBlock(blockToEdit);
      setShowCourseSelector(true);
      bottomSheetRef.current?.snapToIndex(1);
    }
  };

  const handleCourseSelection = (courses) => {
    setSelectedCourses(courses);
  };

    const handleSubmitCourseSelection = async () => {
    if (selectedCourses.length > 0 && selectedBlock) {
      const course = selectedCourses[0];
      
      setIsSubmitting(true);
      
      try {
        if (selectedBlock === 'experience') {
          // Add experience
          await addExperience(course.id);
          Alert.alert('Success', 'Course experience added!');
        } else if (selectedBlock === 'help') {
          // Add help request
          await addHelpRequest(course.id);
          Alert.alert('Success', 'Help request added!');
        } else {
          // Update schedule block
          const scheduleUpdate = {
            [`block_${selectedBlock}`]: course.id
          };
          await updateCourses(scheduleUpdate);
          Alert.alert('Success', 'Course updated successfully!');
        }
        
        await fetchProfile();
        bottomSheetRef.current?.close();
        setSelectedCourses([]);
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
    bottomSheetRef.current?.close();
  };

  const handleHeaderTap = () => {
    if (currentSnapIndex === 0) {
      bottomSheetRef.current?.snapToIndex(1);
    }
  };


  const handleAddExperienceFromTab = () => {
    setSelectedBlock('experience');
    setShowCourseSelector(true);
    bottomSheetRef.current?.snapToIndex(1);
  };

  const handleAddHelpFromTab = () => {
    setSelectedBlock('help'); 
    setShowCourseSelector(true);
    bottomSheetRef.current?.snapToIndex(1);
  };

  const renderTabButton = (tabKey, title, iconName) => (
    <TouchableOpacity
      key={tabKey}
      style={[styles.tabButton, activeTab === tabKey && styles.activeTabButton]}
      onPress={() => setActiveTab(tabKey)}
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
    </TouchableOpacity>
  );

  // Transform schedule_blocks (block_1A, block_1B, ...) to normalized objects for ScheduleTab
  const scheduleForTab = useMemo(() => {
    const blocks = profile?.schedule_blocks || {};
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

                  <TouchableOpacity 
                    style={styles.preferenceItem}
                    onPress={() => handleUpdatePreference('allow_grade_updates', !allowGradeUpdates)}
                  >
                    <View style={styles.preferenceContent}>
                      <MaterialIcons 
                        name={allowGradeUpdates ? "check-box" : "check-box-outline-blank"} 
                        size={24} 
                        color={allowGradeUpdates ? "#2563eb" : "#9ca3af"} 
                      />
                      <View style={styles.preferenceTextContainer}>
                        <Text style={styles.preferenceTitle}>Allow Grade Updates</Text>
                        <Text style={styles.preferenceDescription}>
                          Receive notifications about grade changes
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
            experiencedCourses={profile.experience_courses || []}
            helpNeededCourses={profile.help_needed_courses || []}
            onAutoComplete={handleAutoComplete}
            autoCompleteLoading={autoCompleteLoading}
          />
        );
      case 'experience':
        return (
          <ExperienceTab
            experiencedCourses={profile.experience_courses || []}
            helpNeededCourses={profile.help_needed_courses || []}
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
        <BackgroundSvg hue={user?.background_hue} />
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

  return (
    <View style={styles.container}>
      <BackgroundSvg hue={user?.background_hue} />
      <ScrollableScreenWrapper 
        title={isCurrentUser ? 'My Profile' : `${profile?.username}'s Profile`}
      >
        <View style={styles.content}>
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            {tabs.map(tab => renderTabButton(tab.key, tab.title, tab.icon))}
          </View>

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
      {showCourseSelector && (
        <BottomSheet
          ref={bottomSheetRef}
          index={1}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          enablePanDownToClose={false}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.handleIndicator}
        >
          <BottomSheetView style={styles.bottomSheetContainer}>
            <KeyboardAvoidingView 
              style={styles.keyboardView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >

              <TouchableOpacity 
                style={styles.bottomSheetHeader} 
                onPress={handleHeaderTap}
                activeOpacity={currentSnapIndex === 0 ? 0.7 : 1}
                disabled={currentSnapIndex !== 0}
              >
                <View style={styles.headerLeft}>
                  <Text style={styles.bottomSheetTitle}>
                    {selectedBlock === 'experience' 
                      ? 'Add Course You Can Help With'
                      : selectedBlock === 'help'
                      ? 'Add Course You Need Help With'
                      : `Select Course for Block ${selectedBlock}`
                    }
                  </Text>
                  {currentSnapIndex === 0 && (
                    <Text style={styles.expandHint}>Tap to expand</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={handleCloseCourseSelector}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Course Selector */}
              <View style={[
                styles.courseSelectorContainer, 
                currentSnapIndex === 0 && styles.hiddenCourseSelector
              ]}>
                <CourseSelector onCourseSelect={handleCourseSelection} />
              </View>

              {/* Footer Actions */}
              {currentSnapIndex > 0 && (
                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={handleCloseCourseSelector}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.submitButton, 
                      (selectedCourses.length === 0 || isSubmitting) && styles.submitButtonDisabled
                    ]} 
                    onPress={handleSubmitCourseSelection}
                    disabled={selectedCourses.length === 0 || isSubmitting}
                  >
                    <Text style={[
                      styles.submitButtonText,
                      (selectedCourses.length === 0 || isSubmitting) && styles.submitButtonTextDisabled
                    ]}>
                      {isSubmitting 
                        ? 'Adding...' 
                        : selectedBlock === 'experience'
                        ? 'Add Experience'
                        : selectedBlock === 'help'
                        ? 'Add Help Request'
                        : 'Update Course'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>
          </BottomSheetView>
        </BottomSheet>
      )}
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
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 100,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: '#eff6ff',
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
  bottomSheetBackground: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handleIndicator: {
    backgroundColor: '#ddd',
    width: 40,
    height: 4,
  },
  bottomSheetContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  keyboardView: {
    flex: 1,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 30,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1b',
    marginBottom: 4,
  },
  expandHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 4,
  },
  courseSelectorContainer: {
    flex: 1,
  },
  hiddenCourseSelector: {
    position: 'absolute',
    left: -10000,
    opacity: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
    backgroundColor: 'white',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
});

export default ProfileScreen;