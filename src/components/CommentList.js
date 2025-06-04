import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { globalStyles } from '../utils/styles';

const CommentList = ({ comments }) => {
  const renderComment = (comment) => {
    return (
      <View
        key={comment.id}
        style={[styles.commentContainer, { marginLeft: comment.depth * 16 }]}
      >
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{comment.author}</Text>
          <Text style={styles.commentDate}>
            {new Date(comment.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.commentContent}>{comment.content}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {comments?.length > 0 && (
        <Text style={styles.commentTitle}>Comments</Text>
      )}
      {comments?.map(renderComment)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  commentTitle: {
    ...globalStyles.regularText,
    fontWeight: '600',
    marginBottom: 8,
  },
  commentContainer: {
    paddingVertical: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    paddingLeft: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    ...globalStyles.smallText,
    fontWeight: '600',
  },
  commentDate: {
    ...globalStyles.smallText,
    color: '#666',
  },
  commentContent: {
    ...globalStyles.smallText,
  },
});

export default CommentList;