import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import EditorJsRenderer from './EditorJsRenderer';
import { useUser } from '../context/userContext';
import { useRouter } from 'expo-router';
import { getFullImageUrl } from '../api/config';
import { formatDateTime } from '../utils/timeUtils';


const CommentList = ({ comments = [], onReply, onEdit, onDelete }) => {
  const { user } = useUser();
  const router = useRouter();
  // const [expandedComments, setExpandedComments] = useState(new Set());

  if (!comments || !Array.isArray(comments) || comments.length === 0) {
    return null;
  }

  // const toggleComment = (commentId) => {
  //   const newExpanded = new Set(expandedComments);
  //   if (newExpanded.has(commentId)) {
  //     newExpanded.delete(commentId);
  //   } else {
  //     newExpanded.add(commentId);
  //   }
  //   setExpandedComments(newExpanded);
  // };

  const renderComment = (comment, depth = 0) => {
    // const isExpanded = expandedComments.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;
    
    return (
      <View key={comment.id} style={styles.commentWrapper}>
        <View style={[
          styles.commentContainer,
          { marginLeft: 16 + depth * 12 },
          depth > 0 && styles.nestedComment
        ]}>
          {/* nesting indicator removed */}

          <View style={styles.commentRow}>
            <View style={styles.commentMain}>
              <View style={styles.commentHeader}>
                <View style={styles.authorInfo}>
                {comment.author?.username ? (
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/users/[username]', params: { username: comment.author.username } })}
                    activeOpacity={0.7}
                    style={styles.authorClickable}
                  >
                    {comment.author.userprofile?.profile_picture ? (
                      <Image
                        source={{ uri: getFullImageUrl(comment.author.userprofile.profile_picture) }}
                        style={styles.profilePic}
                      />
                    ) : (
                      <View style={styles.profilePicPlaceholder}>
                        <Text style={styles.profilePicText}>
                          {comment.author.first_name?.charAt(0) || comment.author.username?.charAt(0) || '?'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.authorClickable}>
                    {comment.author.userprofile?.profile_picture ? (
                      <Image
                        source={{ uri: getFullImageUrl(comment.author.userprofile.profile_picture) }}
                        style={styles.profilePic}
                      />
                    ) : (
                      <View style={styles.profilePicPlaceholder}>
                        <Text style={styles.profilePicText}>
                          {comment.author.first_name?.charAt(0) || comment.author.username?.charAt(0) || '?'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                  <View style={styles.authorDetails}>
                  {comment.author?.username ? (
                    <TouchableOpacity onPress={() => router.push({ pathname: '/users/[username]', params: { username: comment.author.username } })} activeOpacity={0.7}>
                      <Text style={styles.commentAuthor}>{comment.author.full_name}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.commentAuthor}>{comment.author.full_name}</Text>
                  )}
                  <Text style={styles.commentDateInline}>{formatDateTime(comment.created_at)}</Text>
                </View>
                </View>
              </View>

              <View style={styles.commentContent}>
                <EditorJsRenderer blocks={comment.content?.blocks} />
              </View>

              <View style={styles.commentActions}>
                <TouchableOpacity
                  style={styles.replyButton}
                  onPress={() => onReply?.(comment)}
                >
                  <MaterialIcons name="reply" size={14} color="#666" />
                  <Text style={styles.replyText}>Reply</Text>
                </TouchableOpacity>

                {user?.id === comment.author.id && (
                  <>
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
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {hasReplies && (
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
      </View>
      {comments.filter(comment => !comment.parent).map(comment => renderComment(comment))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },
  headerContainer: {
    marginBottom: 2,
  },
  commentWrapper: {
    marginBottom: 6,
  },
  commentContainer: {
    paddingTop: 6,
    paddingRight: 0,
    paddingBottom: 8,
    paddingLeft: 0,
    position: 'relative',
  },
  nestedComment: {
    borderLeftWidth: 2,
    borderLeftColor: '#D8D8DC',
    paddingLeft: 10,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentMain: {
    flex: 1,
    minWidth: 0,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 2,
    paddingBottom: 2,
  },
  profilePic: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 6,
  },
  profilePicPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 6,
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
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1b',
  },
  authorDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  commentDateInline: {
    fontSize: 11,
    color: '#787c82',
    marginLeft: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
    marginRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentContent: {
    marginBottom: 2,
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
    paddingHorizontal: 0,
    borderRadius: 4,
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
    marginTop: 6,
  },
});

export default CommentList;
