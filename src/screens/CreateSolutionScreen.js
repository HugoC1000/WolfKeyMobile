import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import PostDetailCard from '../components/PostDetailCard';
import EditorComponent from '../components/EditorComponent';
import api from '../api/config';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';

const CreateSolutionScreen = () => {
  const params = useLocalSearchParams();
  const { postId } = params;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [solution, setSolution] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clearEditor, setClearEditor] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await api.get(`/posts/${postId}/`);
        setPost(response.data);
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const hasValidContent = () => {
    if (!solution) return false;
    return solution.blocks && solution.blocks.some(block => {
      if (block.type === 'paragraph' && block.data.text.trim()) return true;
      if (block.type === 'image' && block.data.file?.url) return true;
      return false;
    });
  };

  const handleSubmit = async () => {
    if (!solution) return;
    
    const hasContent = solution.blocks && solution.blocks.some(block => {
      if (block.type === 'paragraph' && block.data.text.trim()) return true;
      if (block.type === 'image' && block.data.file?.url) return true;
      return false;
    });
    
    if (!hasContent) return;
    
    setIsSubmitting(true);
    try {
      await api.post(`/posts/${postId}/solutions/create/`, {
        content: solution
      });
      
      setSolution(null);
      if (clearEditor) {
        clearEditor();
      }
      router.back();
    } catch (error) {
      console.error('Error creating solution:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollableScreenWrapper title="Create Solution">
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {post && <PostDetailCard post={post} isReference={true} />}
        <Text style={styles.sectionTitle}>Your Solution</Text>
        <EditorComponent 
          onSave={setSolution}
          onClearRef={setClearEditor}
          placeholder="Write your solution here..."
        />
        <TouchableOpacity 
          style={[styles.submitButton, (isSubmitting || !hasValidContent()) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !hasValidContent()}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Solution'}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      )}
    </ScrollableScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 0
  },
  contentContainer: {
    padding: 16,
    marginTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 16,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 300
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  
});

export default CreateSolutionScreen;
