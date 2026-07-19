import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
  RefreshControl,
  Text,
  Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import PostDetailCard from '../components/PostDetailCard';
import SolutionCard from '../components/SolutionCard';
import CommentBottomSheet from '../components/CommentBottomSheet';
import api from '../api/config';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import ScreenHeaderSpacer from '../components/ScreenHeaderSpacer';
import BackgroundSvg from '../components/BackgroundSVG';
import { useUser } from '../context/userContext';
import { markNotificationsByPost } from '../api/notificationService';
import badgeManager from '../utils/badgeManager';
import { transformPostCourses } from '../api/postService';
import KeyboardResizingScreen from '../components/KeyboardResizingScreen';

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const { user } = useUser();
  const postId = id;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userHasSolution, setUserHasSolution] = useState(false);
  
  const [composerMode, setComposerMode] = useState('solution');
  const [currentSolutionId, setCurrentSolutionId] = useState(null);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);

  const fetchPostDetail = async () => {
    try {
      const response = await api.get(`posts/${postId}/`);
      // Transform course data to Course instances
      const transformedPost = transformPostCourses(response.data);
      setPost(transformedPost);
      if (transformedPost.solutions) {
        setUserHasSolution(
          transformedPost.solutions.some((solution) => solution.author.id === user.id)
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
        setComposerMode('comment');
        break;
      case 'reply':
        setReplyingToComment(action.parentComment);
        setEditingComment(null);
        setComposerMode('comment');
        break;
      case 'edit':
        setEditingComment(action.editingComment);
        setReplyingToComment(null);
        setComposerMode('comment');
        break;
    }
  };

  const handleResponseSubmitted = (_response, submittedMode) => {
    fetchPostDetail();
    setComposerMode('solution');
    setReplyingToComment(null);
    setEditingComment(null);
    setCurrentSolutionId(null);
    
    if (submittedMode === 'solution') {
      Alert.alert('Success', 'Solution posted successfully!');
    } else {
      const action = editingComment ? 'updated' : 'posted';
      Alert.alert('Success', `Comment ${action} successfully!`);
    }
  };

  const handleCloseCommentSheet = () => {
    setComposerMode('solution');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardResizingScreen>
      <BackgroundSvg hue={user?.userprofile?.background_hue} />
      <ScrollableScreenWrapper title="Post Detail">
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <ScreenHeaderSpacer includeSafeArea={false} />
          {post && (
            <>
              <PostDetailCard post={post} />
              {renderSolutions()}
            </>
          )}
        </Animated.ScrollView>
      </ScrollableScreenWrapper>
      
      <CommentBottomSheet
        isVisible
        mode={composerMode}
        postId={postId}
        canSubmitSolution={!userHasSolution}
        onClose={handleCloseCommentSheet}
        solutionId={currentSolutionId}
        parentComment={replyingToComment}
        editingComment={editingComment}
        onSubmitted={handleResponseSubmitted}
      />
    </KeyboardResizingScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 170,
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
});

export default PostDetailScreen;
