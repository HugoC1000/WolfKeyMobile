import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import EditorJsRenderer from './EditorJsRenderer';
import { globalStyles } from '../utils/styles';
import CommentList from './CommentList';
import api from '../api/config';
import { deleteComment } from '../api/commentService';
import { useUser } from '../context/userContext';
import { formatDateTime } from '../utils/timeUtils';
import { getFullImageUrl } from '../api/config';


const SolutionCard = ({ 
  solution, 
  isAccepted: initialIsAccepted, 
  postAuthorId, 
  onRefresh,
  onCommentAction
}) => {
  const { user } = useUser();
  const [votes, setVotes] = useState(solution.upvotes - solution.downvotes);
  const [userVote, setUserVote] = useState(solution.user_vote || 0);
  const [isAccepted, setIsAccepted] = useState(solution.is_accepted || initialIsAccepted || false);

  const handleVote = async (voteType) => {
    try {
      const endpoint = `solutions/${solution.id}/vote/`;
      const response = await api.post(endpoint, { vote_type: voteType });
      setVotes(response.data.upvotes - response.data.downvotes);
      setUserVote(response.data.user_vote);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleToggleAcceptSolution = async () => {
    try {
      await api.post(`solutions/${solution.id}/accept/`);
      if (isAccepted) {
        setIsAccepted(false);
      } else {
        setIsAccepted(true);
      }
      onRefresh();
    } catch (error) {
      console.error('Error toggling solution acceptance:', error);
    }
  };

  // Comment handlers
  const handleAddComment = () => {
    onCommentAction?.({
      type: 'add',
      solutionId: solution.id
    });
  };

  const handleReplyToComment = (comment) => {
    onCommentAction?.({
      type: 'reply',
      solutionId: solution.id,
      parentComment: comment
    });
  };

  const handleEditComment = (comment) => {
    onCommentAction?.({
      type: 'edit',
      solutionId: solution.id,
      editingComment: comment
    });
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComment(commentId);
              onRefresh();
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderVoteButtons = () => (
    <View style={styles.votingContainer}>
      <TouchableOpacity 
        style={[styles.voteButton, userVote === 1 && styles.votedUpButton]}
        onPress={() => handleVote(1)}
      >
        <MaterialIcons 
          name="keyboard-arrow-up" 
          size={20} 
          color={userVote === 1 ? '#FF4500' : '#878A8C'} 
        />
      </TouchableOpacity>
      
      <Text style={[styles.voteCount, userVote !== 0 && styles.votedCount]}>
        {votes}
      </Text>
      
      <TouchableOpacity 
        style={[styles.voteButton, userVote === -1 && styles.votedDownButton]}
        onPress={() => handleVote(-1)}
      >
        <MaterialIcons 
          name="keyboard-arrow-down" 
          size={20} 
          color={userVote === -1 ? '#7193FF' : '#878A8C'} 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[
      styles.container,
      isAccepted && styles.acceptedContainer
    ]}>
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          {solution.author.userprofile.profile_picture ? (
            <Image 
              source={{ uri:  getFullImageUrl(solution.author.userprofile.profile_picture) }}
              style={styles.profilePic}
            />
          ) : (
            <View style={styles.profilePicPlaceholder} />
          )}
          <View style={styles.authorMeta}>
            <Text style={styles.author}>{solution.author.full_name}</Text>
            <Text style={styles.date}>
              {formatDateTime(solution.created_at)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <EditorJsRenderer blocks={solution.content?.blocks} />
      </View>

      <View style={styles.footer}>
        {renderVoteButtons()}
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.commentButton}
            onPress={handleAddComment}
          >
            <MaterialIcons name="comment" size={16} color="#666" />
            <Text style={styles.commentButtonText}>Comment</Text>
          </TouchableOpacity>
          
          {user?.id === postAuthorId && (
            <TouchableOpacity
              style={[
                styles.acceptButton,
                isAccepted && styles.acceptedButton
              ]}
              onPress={handleToggleAcceptSolution}
            >
              <MaterialIcons 
                name={isAccepted ? "check-circle" : "check"} 
                size={16} 
                color={isAccepted ? "white" : "#4CAF50"} 
              />
              <Text style={[
                styles.acceptButtonText,
                isAccepted && styles.acceptedButtonText
              ]}>
                {isAccepted ? "Accepted" : "Accept"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <CommentList 
        comments={solution.comments || []} 
        onReply={handleReplyToComment}
        onEdit={handleEditComment}
        onDelete={handleDeleteComment}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  acceptedContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePic: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  profilePicPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
    backgroundColor: '#DDD6FE',
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  author: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1b',
  },
  date: {
    fontSize: 11,
    color: '#787c82',
    marginLeft: 8,
  },
  content: {
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  votingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteButton: {
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  votedUpButton: {
    backgroundColor: '#FFE8D6',
  },
  votedDownButton: {
    backgroundColor: '#E3ECFF',
  },
  voteCount: {
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 8,
    color: '#1a1a1b',
    minWidth: 20,
    textAlign: 'center',
  },
  votedCount: {
    color: '#FF4500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  commentButtonText: {
    color: '#666',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  acceptedButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: '#4CAF50',
    marginLeft: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  acceptedButtonText: {
    color: 'white',
  },
});

export default SolutionCard;