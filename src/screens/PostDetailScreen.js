import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PostDetailCard from '../components/PostDetailCard';
import SolutionCard from '../components/SolutionCard';
import CommentBottomSheet from '../components/CommentBottomSheet';
import api from '../api/config';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import BackgroundSvg from '../components/BackgroundSVG';
import { useUser } from '../context/userContext';
import { markNotificationsByPost } from '../api/notificationService';
import badgeManager from '../utils/badgeManager';

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const postId = id;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userHasSolution, setUserHasSolution] = useState(false);
  
  const [isCommentSheetVisible, setIsCommentSheetVisible] = useState(false);
  const [currentSolutionId, setCurrentSolutionId] = useState(null);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);

  const fetchPostDetail = async () => {
    try {
      const response = await api.get(`posts/${postId}/`);
      setPost(response.data);
      if (response.data.solutions) {
        setUserHasSolution(
          response.data.solutions.some((solution) => solution.author_id === user.id)
        );
      }
    } catch (error) {
      console.error('Error fetching post detail:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPostDetail();
    
    // Mark notifications related to this post as read
    markNotificationsByPost(postId).then(() => {
      // Update badge count after marking notifications
      badgeManager.updateBadge();
    });
  }, [postId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPostDetail();
  };

  // Comment handlers
  const handleCommentAction = (action) => {
    setCurrentSolutionId(action.solutionId);
    
    switch (action.type) {
      case 'add':
        setReplyingToComment(null);
        setEditingComment(null);
        setIsCommentSheetVisible(true);
        break;
      case 'reply':
        setReplyingToComment(action.parentComment);
        setEditingComment(null);
        setIsCommentSheetVisible(true);
        break;
      case 'edit':
        setEditingComment(action.editingComment);
        setReplyingToComment(null);
        setIsCommentSheetVisible(true);
        break;
    }
  };

  const handleCommentSubmitted = (newComment) => {
    fetchPostDetail();
    setIsCommentSheetVisible(false);
    setReplyingToComment(null);
    setEditingComment(null);
    setCurrentSolutionId(null);
    
    const action = editingComment ? 'updated' : 'posted';
    Alert.alert('Success', `Comment ${action} successfully!`);
  };

  const handleCloseCommentSheet = () => {
    setIsCommentSheetVisible(false);
    setReplyingToComment(null);
    setEditingComment(null);
    setCurrentSolutionId(null);
  };

  const renderSolutions = () => {
    if (!post.solutions || post.solutions.length === 0) {
      return (
        <View style={styles.noSolutionsContainer}>
          <Text style={styles.noSolutionsText}>
            No solutions yet. Be the first to help!
          </Text>
        </View>
      );
    }

    return post.solutions.map((solution) => (
      <SolutionCard
        key={solution.id}
        solution={solution}
        isAccepted={solution.id === post.accepted_solution_id}
        postAuthorId={post.author.id}
        onRefresh={fetchPostDetail}
        onCommentAction={handleCommentAction}
      />
    ));
  };

  const renderAddSolutionButton = () => {
    if (userHasSolution) return null;

    return (
      <TouchableOpacity
        style={styles.addSolutionButton}
        onPress={() => router.push({ pathname: '/create-solution', params: { postId, post: JSON.stringify(post) } })}
      >
        <Text style={styles.addSolutionButtonText}>Add Solution</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundSvg hue={user?.userprofile?.background_hue} />
      <ScrollableScreenWrapper title="Post Detail">
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {post && (
            <>
              <PostDetailCard post={post} />
              {renderSolutions()}
              {renderAddSolutionButton()}
            </>
          )}
        </Animated.ScrollView>
      </ScrollableScreenWrapper>
      
      <CommentBottomSheet
        isVisible={isCommentSheetVisible}
        onClose={handleCloseCommentSheet}
        solutionId={currentSolutionId}
        parentComment={replyingToComment}
        editingComment={editingComment}
        onCommentSubmitted={handleCommentSubmitted}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSolutionsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noSolutionsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addSolutionButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
    marginBottom: 75,
  },
  addSolutionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default PostDetailScreen;