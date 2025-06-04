import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import EditorJsRenderer from './EditorJsRenderer';
import { globalStyles } from '../utils/styles';
import BackgroundSvg from '../components/BackgroundSVG';


const PostDetailCard = ({ post, isReference }) => {
  return (
    <View style={[styles.postCard, isReference && styles.referenceCard]}>
      <Text style={[styles.title, isReference && styles.referenceTitle]}>
        {post.title}
      </Text>
      <EditorJsRenderer blocks={post.content?.blocks} />
      {!isReference && (
        <Text style={styles.timestamp}>
          {new Date(post.created_at).toLocaleString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 68,
  },
  title: {
    ...globalStyles.headingText,
    marginBottom: 12,
  },
  timestamp: {
    ...globalStyles.smallText,
    marginTop: 8,
  },
  referenceCard: {
    marginTop: 0,
    backgroundColor: '#F3F4F6',
  },
  referenceTitle: {
    fontSize: 14,
    color: '#4B5563',
  },
});

export default PostDetailCard;