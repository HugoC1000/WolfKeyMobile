import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { Switch } from 'react-native';
import EditorComponent from '../components/EditorComponent';
import api from '../api/config';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import CourseSelector from '../components/CourseSelector';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Course from '../models/Course';

const CreatePostScreen = () => {
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
      };
    }, [])
  );

  const handleSubmit = async () => {
    if (!content || !title) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      formData.append('title', title);
      formData.append('is_anonymous', isAnonymous ? 'true' : 'false');
      formData.append('allow_teacher', allowTeacher ? 'true' : 'false');
      
      selectedCourses.forEach(course => {
        formData.append('courses', course.id);
      });

      formData.append('content', JSON.stringify(content));

      const response = await api.post('/posts/create/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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
        
        // Force editor to remount with fresh state
        setEditorKey(Date.now());
        
        // Navigate to home tab
        setTimeout(() => {
          router.push('/(tabs)');
        }, 100);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.response?.data?.error || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollableScreenWrapper title="Ask a Question">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          
          <TextInput
            style={styles.titleInput}
            placeholder="What's your question? Be specific."
            value={title}
            onChangeText={setTitle}
          />
          
          <EditorComponent 
            key={editorKey}
            onSave={setContent}
            placeholder="Provide more details about your question..."
          />

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
            trackColor={{ false: '#6B7280', true: '#9ba0e2ff' }}
            thumbColor={allowTeacher ? '#2563EB' : '#f4f3f4'}
            style={styles.switch}
          />
          <Text style={styles.anonLabel}>Teacher visible</Text>
        </View>

        <View style={styles.anonRow}>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: '#6B7280', true: '#9ba0e2ff' }}
            thumbColor={isAnonymous ? '#2563EB' : '#f4f3f4'}
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
            {isSubmitting ? 'Posting...' : 'Post Question'}
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
});

export default CreatePostScreen;
