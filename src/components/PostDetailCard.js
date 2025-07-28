import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import EditorJsRenderer from './EditorJsRenderer';
import { globalStyles } from '../utils/styles';
import BackgroundSvg from '../components/BackgroundSVG';


const PostDetailCard = ({ post, isReference }) => {
  return (
    <View style={[styles.postCard, isReference && styles.referenceCard]}>
      {!isReference && (
        <View style={styles.header}>
          <View style={styles.authorInfo}>
            {post.author.userprofile.profile_picture ? (
              <Image 
                source={{ uri: post.author.userprofile.profile_picture }}
                style={styles.profilePic}
              />
            ) : (
              <View style={styles.profilePicPlaceholder} />
            )}
            <View>
              <Text style={styles.authorName}>{post.author.full_name}</Text>
              <Text style={styles.timestamp}>
                {new Date(post.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      )}
      <Text style={[styles.title, isReference && styles.referenceTitle]}>
        {post.title}
      </Text>
      <EditorJsRenderer blocks={post.content?.blocks} />
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 45,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
    color: '#1a1a1b',
  },
  timestamp: {
    fontSize: 12,
    color: '#787c82',
    marginTop: 2,
  },
  referenceCard: {
    marginTop: 0,
    backgroundColor: '#F8F9FA',
  },
  referenceTitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  profilePicPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#DDD6FE',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1b',
  },
  courseContext: {
    fontSize: 11,
    color: '#ffffff',
    backgroundColor: '#0079D3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    margin: 2,
  },
});

export default PostDetailCard;