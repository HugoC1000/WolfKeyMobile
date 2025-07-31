import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { globalStyles } from '../utils/styles';
import EditorJsRenderer from './EditorJsRenderer';
import { useUser } from '../context/userContext';

const CommentList = ({ comments = [], onReply, onEdit, onDelete }) => {
  const { user } = useUser();
  const [expandedComments, setExpandedComments] = useState(new Set());

  if (!comments || !Array.isArray(comments) || comments.length === 0) {
    return null;
  }

  const toggleComment = (commentId) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const renderComment = (comment, depth = 0) => {
    const isExpanded = expandedComments.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;
    
    return (
      <View key={comment.id} style={styles.commentWrapper}>
        <View style={[
          styles.commentContainer, 
          { marginLeft: depth * 12 },
          depth > 0 && styles.nestedComment
        ]}>
          {/* Left border for nested comments */}
          {depth > 0 && <View style={styles.nestingIndicator} />}
          
          <View style={styles.commentHeader}>
            <View style={styles.authorInfo}>
              {comment.author.userprofile?.profile_picture ? (
                <Image 
                  source={{ uri: comment.author.userprofile.profile_picture }}
                  style={styles.profilePic}
                />
              ) : (
                <View style={styles.profilePicPlaceholder}>
                  <Text style={styles.profilePicText}>
                    {comment.author.first_name?.charAt(0) || comment.author.username?.charAt(0) || '?'}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.commentAuthor}>
                  {comment.author.first_name && comment.author.last_name 
                    ? `${comment.author.first_name} ${comment.author.last_name}`
                    : comment.author.username}
                </Text>
                <Text style={styles.commentDate}>
                  {new Date(comment.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            
            {user?.id === comment.author.id && (
              <View style={styles.commentActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => onEdit?.(comment)}
                >
                  <MaterialIcons name="edit" size={14} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => onDelete?.(comment.id)}
                >
                  <MaterialIcons name="delete" size={14} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.commentContent}>
            <EditorJsRenderer blocks={comment.content?.blocks} />
          </View>
          
          <View style={styles.commentFooter}>
            <TouchableOpacity 
              style={styles.replyButton}
              onPress={() => onReply?.(comment)}
            >
              <MaterialIcons name="reply" size={14} color="#666" />
              <Text style={styles.replyText}>Reply</Text>
            </TouchableOpacity>
            
            {hasReplies && (
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={() => toggleComment(comment.id)}
              >
                <MaterialIcons 
                  name={isExpanded ? "expand-less" : "expand-more"} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.toggleText}>
                  {isExpanded ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Render nested replies */}
        {hasReplies && isExpanded && (
          <View style={styles.repliesContainer}>
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.commentTitle}>
          Comments ({comments.length})
        </Text>
      </View>
      {comments.map(comment => renderComment(comment))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  headerContainer: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 12,
  },
  commentTitle: {
    ...globalStyles.regularText,
    fontWeight: '600',
    color: '#1a1a1b',
  },
  commentWrapper: {
    marginBottom: 8,
  },
  commentContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 12,
    position: 'relative',
  },
  nestedComment: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
  },
  nestingIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#4CAF50',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePic: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  profilePicPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1b',
  },
  commentDate: {
    fontSize: 10,
    color: '#787c82',
    marginTop: 1,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  commentContent: {
    marginBottom: 8,
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  replyText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toggleText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 8,
  },
});

export default CommentList;