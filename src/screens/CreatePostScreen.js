import React, { useState } from 'react';
import { Image, View, StyleSheet, TouchableOpacity, Text, ScrollView, TextInput } from 'react-native';
import { Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PostEditor from '../components/PostEditor';
import api, { getFullImageUrl } from '../api/config';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import CourseSelector from '../components/CourseSelector';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { triggerPressHaptic, triggerSuccessHaptic } from '../utils/haptics';
import KeyboardResizingScreen from '../components/KeyboardResizingScreen';
import ScreenHeaderSpacer from '../components/ScreenHeaderSpacer';
import { useUser } from '../context/userContext';

const CreatePostScreen = () => {
  const params = useLocalSearchParams();
  const { user } = useUser();
  const postType = params?.type || 'standard'; // 'standard' or 'poll'
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isIdentityMenuOpen, setIsIdentityMenuOpen] = useState(false);
  const [allowTeacher, setAllowTeacher] = useState(true);
  const [editorKey, setEditorKey] = useState(Date.now());
  const [isCourseBottomSheetVisible, setIsCourseBottomSheetVisible] = useState(false);
  
  // Poll-specific state
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isPublicVoting, setIsPublicVoting] = useState(true);

  // Reset form when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // This cleanup function runs when screen loses focus
        setTitle('');
        setContent(null);
        setSelectedCourses([]);
        setIsAnonymous(false);
        setIsIdentityMenuOpen(false);
        setAllowTeacher(true);
        setError(null);
        setEditorKey(Date.now()); // Force editor remount
        setIsCourseBottomSheetVisible(false);
        setPollOptions(['', '']);
        setAllowMultiple(false);
        setIsPublicVoting(true);
      };
    }, [])
  );

  const handleAddOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const handleRemoveOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleUpdateOption = (index, text) => {
    const newOptions = [...pollOptions];
    newOptions[index] = text;
    setPollOptions(newOptions);
  };

  const handleSubmit = async () => {
    await triggerPressHaptic();

    if (!content || !title) return;
    const isPoll = postType === 'poll';
    let nonEmptyOptions = [];
    
    // Validate poll options if it's a poll
    if (isPoll) {
      nonEmptyOptions = pollOptions.filter(opt => opt.trim().length > 0);
      if (nonEmptyOptions.length < 2) {
        setError('Please provide at least 2 poll options');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const requestPayload = {
        title,
        is_anonymous: isAnonymous,
        allow_teacher: allowTeacher,
        courses: selectedCourses.map((course) => course.id),
        content: JSON.stringify(content),
      };

      if (isPoll) {
        requestPayload.poll_data = {
          isPoll: true,
          question: title,
          answers: nonEmptyOptions,
          allowMultiple,
          isPublicVoting,
        };

        console.log('[POLL CREATE] Request JSON:', JSON.stringify(requestPayload, null, 2));
      }

      const response = await api.post('/posts/create/', requestPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (isPoll) {
        console.log('[POLL CREATE] Response JSON:', JSON.stringify(response.data, null, 2));
      }

      if (response.status === 201) {
        await triggerSuccessHaptic();

        // Clear all form fields
        setTitle('');
        setContent(null);
        setSelectedCourses([]);
        setIsAnonymous(false);
        setIsIdentityMenuOpen(false);
        setAllowTeacher(true);
        setError(null);
        setIsCourseBottomSheetVisible(false);
        setPollOptions(['', '']);
        setAllowMultiple(false);
        setIsPublicVoting(true);
        
        // Force editor to remount with fresh state
        setEditorKey(Date.now());
        
        // Navigate to home tab
        setTimeout(() => {
          router.push('/(tabs)');
        }, 100);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      if (isPoll && error.response?.data) {
        console.log('[POLL CREATE] Error Response JSON:', JSON.stringify(error.response.data, null, 2));
      }
      setError(error.response?.data?.error || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardResizingScreen>
      <ScrollableScreenWrapper title={postType === 'poll' ? 'New Poll' : 'New Post'}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <ScreenHeaderSpacer />
          <View style={[styles.composerSurface, postType === 'poll' && styles.pollComposerSurface]}>
            <View style={styles.authorPreview}>
              {isAnonymous ? (
                <View style={styles.authorAvatarPlaceholder}>
                  <MaterialIcons name="visibility-off" size={18} color="#6B7280" />
                </View>
              ) : user?.userprofile?.profile_picture ? (
                <Image
                  source={{ uri: getFullImageUrl(user.userprofile.profile_picture) }}
                  style={styles.authorAvatar}
                />
              ) : (
                <View style={styles.authorAvatarPlaceholder}>
                  <MaterialIcons name="person" size={20} color="#6B7280" />
                </View>
              )}
              <TouchableOpacity
                style={styles.authorDropdownTrigger}
                onPress={() => setIsIdentityMenuOpen((open) => !open)}
              >
                <Text style={styles.authorPreviewName}>
                  {isAnonymous ? 'Anonymous' : user?.full_name || user?.username || 'My profile'}
                </Text>
                <MaterialIcons
                  name={isIdentityMenuOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={20}
                  color="#4B5563"
                />
              </TouchableOpacity>
            </View>

            {isIdentityMenuOpen && (
              <View style={styles.identityDropdown}>
                <TouchableOpacity
                  style={styles.identityDropdownOption}
                  onPress={() => {
                    setIsAnonymous(false);
                    setIsIdentityMenuOpen(false);
                  }}
                >
                  <MaterialIcons name="person" size={18} color="#374151" />
                  <Text style={styles.identityDropdownText}>Post as my profile</Text>
                  {!isAnonymous && <MaterialIcons name="check" size={18} color="#2563EB" />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.identityDropdownOption}
                  onPress={() => {
                    setIsAnonymous(true);
                    setIsIdentityMenuOpen(false);
                  }}
                >
                  <MaterialIcons name="visibility-off" size={18} color="#374151" />
                  <Text style={styles.identityDropdownText}>Post anonymously</Text>
                  {isAnonymous && <MaterialIcons name="check" size={18} color="#2563EB" />}
                </TouchableOpacity>
                <Text style={styles.identityDropdownHint}>
                  Staff and moderators can still see your identity for moderation.
                </Text>
              </View>
            )}

            <TextInput
              style={styles.titleInput}
              placeholder={postType === 'poll' ? "What's your poll question?" : "What's on your mind?"}
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              multiline
              autoFocus
            />

            <PostEditor
              key={editorKey}
              onSave={setContent}
              placeholder={postType === 'poll' ? "Add more context..." : "Add details..."}
            />
          </View>

          {/* Poll Options Section */}
          {postType === 'poll' && (
            <View style={styles.pollSection}>
              <Text style={styles.pollSectionTitle}>Options</Text>
              
              {pollOptions.map((option, index) => (
                <View key={index} style={styles.optionInputContainer}>
                  <TextInput
                    style={styles.optionInput}
                    placeholder="Type your option"
                    value={option}
                    onChangeText={(text) => handleUpdateOption(index, text)}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveOption(index)}
                      style={styles.deleteButton}
                    >
                      <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              <TouchableOpacity
                style={styles.addOptionButton}
                onPress={handleAddOption}
              >
                <MaterialIcons name="add" size={20} color="#2563EB" />
                <Text style={styles.addOptionButtonText}>Add another option</Text>
              </TouchableOpacity>

              {/* Poll Settings */}
              <View style={styles.pollSettingsContainer}>
                <View style={styles.anonRow}>
                  <Switch
                    value={allowMultiple}
                    onValueChange={setAllowMultiple}
                    style={styles.switch}
                  />
                  <Text style={styles.anonLabel}>Allow Multiple Options</Text>
                </View>

                <View style={styles.anonRow}>
                  <Switch
                    value={isPublicVoting}
                    onValueChange={setIsPublicVoting}
                    style={styles.switch}
                  />
                  <Text style={styles.anonLabel}>Public Voting (show voter profiles)</Text>
                </View>
              </View>
            </View>
          )}

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </ScrollView>

        <View style={styles.stickyControls}>
          <View style={styles.metadataSection}>
            <TouchableOpacity
              style={styles.courseButton}
              onPress={() => setIsCourseBottomSheetVisible(true)}
            >
              <MaterialIcons name="add" size={18} color="#374151" />
              <Text style={styles.courseButtonText}>
                {selectedCourses.length ? 'Edit courses' : 'Add courses'}
              </Text>
            </TouchableOpacity>

            {selectedCourses.length > 0 && (
              <View style={styles.selectedCoursesContainer}>
                {selectedCourses.map(course => (
                  <View key={course.id} style={styles.courseChip}>
                    <Text style={styles.courseChipText}>{course.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.bottomActionBar}>
            <View style={styles.teacherControl}>
              <Switch
                value={allowTeacher}
                onValueChange={setAllowTeacher}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={allowTeacher ? '#2563EB' : '#F9FAFB'}
              />
              <Text style={styles.teacherLabel}>Visible to teachers</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || !content || !title) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !content || !title}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Posting...' : 'Post'}
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollableScreenWrapper>

      {/* Course Selector Bottom Sheet */}
      <CourseSelector 
        isVisible={isCourseBottomSheetVisible}
        onClose={() => setIsCourseBottomSheetVisible(false)}
        onCourseSelect={setSelectedCourses}
        selectedCourses={selectedCourses}
      />
    </KeyboardResizingScreen>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flexGrow: 1,
  },
  stickyControls: {
    backgroundColor: 'rgba(243, 243, 243, 0.96)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 18,
  },
  composerSurface: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    marginTop: 8,
  },
  pollComposerSurface: {
    flex: 0,
    paddingBottom: 0,
  },
  authorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  authorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
  },
  authorAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 6,
  },
  authorPreviewName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  identityDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  identityDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  identityDropdownText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  identityDropdownHint: {
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  switch: {
    marginRight: 8,
  },
  anonLabel: {
    fontSize: 16,
    color: '#374151',
    marginRight: 8,
  },
  titleInput: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '600',
    color: '#111827',
    minHeight: 42,
    marginBottom: 0,
  },
  metadataSection: {
    marginTop: 0,
  },
  courseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 18,
    gap: 3,
  },
  courseButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCoursesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  courseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  courseChipText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 2,
    paddingTop: 10,
  },
  teacherControl: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  teacherLabel: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  errorText: {
    color: '#DC2626',
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  // Poll-specific styles
  pollSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 16,
    marginTop: 0,
    marginBottom: 12,

  },
  pollSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  optionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#eeeeee',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 0,
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2563EB',
    borderRadius: 8,
    gap: 6,
  },
  addOptionButtonText: {
    color: '#2563EB',
    fontWeight: '500',
    fontSize: 14,
  },
  pollSettingsContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

export default CreatePostScreen;
