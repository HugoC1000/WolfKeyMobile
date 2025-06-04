import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import PostDetailCard from '../components/PostDetailCard';
import EditorComponent from '../components/EditorComponent';
import api from '../api/config';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';

const CreateSolutionScreen = ({ route, navigation }) => {
  const { postId, post } = route.params;
  const [solution, setSolution] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!solution) return;
    setIsSubmitting(true);
    console.log(solution);
    try {
      await api.post(`/solution/${postId}/create/`, {
        content: solution
      });
      navigation.goBack();
    } catch (error) {
      console.error('Error creating solution:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollableScreenWrapper title="Create Solution">
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <PostDetailCard post={post} isReference={true} />
        <Text style={styles.sectionTitle}>Your Solution</Text>
        <EditorComponent 
          onSave={setSolution}
          placeholder="Write your solution here..."
        />
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !solution}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Solution'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScrollableScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    marginTop: 60,
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
  
});

export default CreateSolutionScreen;
