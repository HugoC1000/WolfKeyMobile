import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/authContext';
import { useUser } from '../context/userContext';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import BackgroundSvg from '../components/BackgroundSVG';
import { deleteAccount } from '../api/deleteAccountService';
import {
  updatePrivacyPreferences,
  getCurrentProfile,
  addExperience,
  addHelpRequest,
  removeExperience,
  removeHelpRequest,
  updateCourses,
} from '../api/profileService';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import ScheduleTab from '../components/ScheduleTab';
import ExperienceTab from '../components/ExperienceTab';
import CourseSelector from '../components/CourseSelector';

const SettingsScreen = () => {
  const { logout } = useAuth();
  const { user, clearUser } = useUser();
  const router = useRouter();

  const [allowScheduleComparison, setAllowScheduleComparison] = useState(true);
  const [activeTab, setActiveTab] = useState('privacy');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);

  useEffect(() => {
    if (user?.userprofile?.allow_schedule_comparison !== undefined) {
      setAllowScheduleComparison(user.userprofile.allow_schedule_comparison);
    }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const profileData = await getCurrentProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout(clearUser);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to logout');
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

  const handleUpdatePreference = async (preferenceKey, value) => {
    try {
      setAllowScheduleComparison(value);
      await updatePrivacyPreferences({ [preferenceKey]: value });
    } catch (error) {
      console.error('Error updating preference:', error);
      setAllowScheduleComparison(!value);
      Alert.alert('Error', 'Failed to update privacy preference');
    }
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
    Alert.alert('Remove Experience', 'Are you sure you want to remove this course experience?', [
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
    ]);
  };

  const handleRemoveHelp = async (helpId) => {
    Alert.alert('Remove Help Request', 'Are you sure you want to remove this help request?', [
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
    ]);
  };

  const handleCoursePress = (courseOrBlock, block) => {
    const blockToEdit = block || courseOrBlock;
    setSelectedBlock(blockToEdit);
    setSelectedCourses([]);
    setShowCourseSelector(true);
  };

  const handleCourseSelection = (courses) => {
    setSelectedCourses(courses);
  };

  const handleSubmitCourseSelection = async () => {
    if (selectedCourses.length === 0 || !selectedBlock) {
      handleCloseCourseSelector();
      return;
    }

    try {
      if (selectedBlock === 'experience') {
        await Promise.all(selectedCourses.map((course) => addExperience(course.id)));
      } else if (selectedBlock === 'help') {
        await Promise.all(selectedCourses.map((course) => addHelpRequest(course.id)));
      } else {
        await updateCourses({ [`block_${selectedBlock}`]: selectedCourses[0].id });
      }
      await fetchProfile();
    } catch (error) {
      console.error('Error updating course:', error);
      Alert.alert('Error', 'Failed to update course');
    } finally {
      handleCloseCourseSelector();
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

  const glassAvailable = isLiquidGlassAvailable();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BackgroundSvg hue={user?.userprofile?.background_hue} />
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundSvg hue={user?.userprofile?.background_hue} />
      <ScrollableScreenWrapper title="Settings">
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.tabBar}>
            {[
              { key: 'privacy', label: 'Privacy' },
              { key: 'schedule', label: 'Schedule' },
              { key: 'experience', label: 'Experience' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, activeTab === tab.key && styles.activeTabButton]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'privacy' && (
            <>
              <Text style={styles.sectionTitle}>Privacy & Account</Text>
              {glassAvailable ? (
                <GlassContainer style={styles.glassCard} spacing={0}>
                  <GlassView style={styles.glassCardContent}>
                    <View style={styles.preferenceItem}>
                      <Text style={styles.preferenceTitle}>Schedule Visibility</Text>
                      <Switch
                        value={allowScheduleComparison}
                        onValueChange={(value) => handleUpdatePreference('allow_schedule_comparison', value)}
                      />
                    </View>
                    <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
                      <Text style={styles.actionText}>Logout</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount}>
                      <Text style={styles.actionTextDanger}>Delete Account</Text>
                    </TouchableOpacity>
                  </GlassView>
                </GlassContainer>
              ) : (
                <View style={styles.regularCard}>
                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceTitle}>Schedule Visibility</Text>
                    <Switch
                      value={allowScheduleComparison}
                      onValueChange={(value) => handleUpdatePreference('allow_schedule_comparison', value)}
                    />
                  </View>
                  <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
                    <Text style={styles.actionText}>Logout</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount}>
                    <Text style={styles.actionTextDanger}>Delete Account</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {activeTab === 'schedule' && (
            <ScheduleTab
              schedule={scheduleForTab}
              isCurrentUser
              onCoursePress={handleCoursePress}
              onAddExperience={handleAddExperience}
              onAddHelp={handleAddHelp}
              experiencedCourses={profile?.userprofile?.courses?.experienced_courses || []}
              helpNeededCourses={profile?.userprofile?.courses?.help_needed_courses || []}
              autoCompleteLoading={false}
            />
          )}

          {activeTab === 'experience' && (
            <ExperienceTab
              experiencedCourses={profile?.userprofile?.courses?.experienced_courses || []}
              helpNeededCourses={profile?.userprofile?.courses?.help_needed_courses || []}
              isCurrentUser
              onRemoveExperience={handleRemoveExperience}
              onRemoveHelp={handleRemoveHelp}
              onAddExperience={handleAddExperienceFromTab}
              onAddHelp={handleAddHelpFromTab}
            />
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </ScrollableScreenWrapper>

      <CourseSelector
        isVisible={showCourseSelector}
        onClose={handleSubmitCourseSelection}
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
    marginTop: 65,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: '#2563eb',
  },
  tabText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#111827',
    fontWeight: '700',
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  glassCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  glassCardContent: {
    padding: 14,
  },
  regularCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    padding: 14,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionText: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '600',
  },
  actionTextDanger: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SettingsScreen;
