import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { Switch } from 'react-native';
import EditorComponent from '../components/EditorComponent';
import api from '../api/config';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import CourseSelector from '../components/CourseSelector';

const CreatePostScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showAnonInfo, setShowAnonInfo] = useState(false);

  const handleSubmit = async () => {
    if (!content || !title) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      formData.append('title', title);
      formData.append('is_anonymous', isAnonymous ? 'true' : 'false');
      
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
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.response?.data?.error || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollableScreenWrapper title="Ask a Question">
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
        <TextInput
          style={styles.titleInput}
          placeholder="What's your question? Be specific."
          value={title}
          onChangeText={setTitle}
        />
        
        <EditorComponent 
          onSave={setContent}
          placeholder="Provide more details about your question..."
        />

        <CourseSelector onCourseSelect={setSelectedCourses} />
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

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
  );
};

const styles = StyleSheet.create({
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
    padding: 16,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
