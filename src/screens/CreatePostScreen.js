import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import EditorComponent from '../components/EditorComponent';
import api from '../api/config';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import CourseSelector from '../components/CourseSelector';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Course from '../models/Course';

const CreatePostScreen = () => {
  const params = useLocalSearchParams();
  const postType = params?.type || 'standard'; // 'standard' or 'poll'
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showAnonInfo, setShowAnonInfo] = useState(false);
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
        setShowAnonInfo(false);
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
        // Clear all form fields
        setTitle('');
        setContent(null);
        setSelectedCourses([]);
        setIsAnonymous(false);
        setShowAnonInfo(false);
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
    <View style={styles.screenContainer}>
      <ScrollableScreenWrapper title={postType === 'poll' ? 'Create a Poll' : 'Ask a Question'}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          
          <TextInput
            style={styles.titleInput}
            placeholder={postType === 'poll' ? "What's your poll question?" : "What's your question? Be specific."}
            value={title}
            onChangeText={setTitle}
          />
          
          <EditorComponent 
            key={editorKey}
            onSave={setContent}
            placeholder={postType === 'poll' ? "Provide more details about your poll..." : "Provide more details about your question..."}
          />

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

          {/* Course Selection Button */}
          <TouchableOpacity 
            style={styles.courseButton}
            onPress={() => setIsCourseBottomSheetVisible(true)}
          >
            <Text style={styles.courseButtonText}>
              Select courses (Recommended)
            </Text>
          </TouchableOpacity>

          {/* Display selected courses */}
          {selectedCourses.length > 0 && (
            <View style={styles.selectedCoursesContainer}>
              {selectedCourses.map(course => (
                <View key={course.id} style={styles.courseChip}>
                  <Text style={styles.courseChipText}>{course.name}</Text>
                </View>
              ))}
            </View>
          )}
          
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

        <View style={styles.anonRow}>
          <Switch
            value={allowTeacher}
            onValueChange={setAllowTeacher}
            style={styles.switch}
          />
          <Text style={styles.anonLabel}>Teacher visible</Text>
        </View>

        <View style={styles.anonRow}>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            style={styles.switch}
          />
          <Text style={styles.anonLabel}>Post as anonymous</Text>
          <Pressable onPress={() => setShowAnonInfo(!showAnonInfo)}>
            <Text style={styles.infoIcon}>ⓘ</Text>
          </Pressable>
        </View>
        {showAnonInfo && (
          <View style={styles.anonInfoBox}>
            <Text style={styles.anonInfoText}>
              Your identity will be hidden from the public. Staff and moderators can still see your identity for moderation purposes.
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={[
            styles.submitButton, 
            (isSubmitting || !content || !title) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !content || !title}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? (postType === 'poll' ? 'Creating Poll...' : 'Posting...') : (postType === 'poll' ? 'Create Poll' : 'Post Question')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </ScrollableScreenWrapper>

      {/* Course Selector Bottom Sheet */}
      <CourseSelector 
        isVisible={isCourseBottomSheetVisible}
        onClose={() => setIsCourseBottomSheetVisible(false)}
        onCourseSelect={setSelectedCourses}
        selectedCourses={selectedCourses}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    marginBottom: 40,
  },
  contentContainer: {
    padding: 16,
    marginTop: 60,
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
  infoIcon: {
    fontSize: 18,
    color: '#232323ff',
    marginLeft: 4,
  },
  anonInfoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  anonInfoText: {
    color: '#374151',
    fontSize: 14,
  },
  titleInput: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  courseButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  courseButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCoursesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
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
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#DC2626',
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  // Poll-specific styles
  pollSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
