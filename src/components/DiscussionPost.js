import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DiscussionPost = ({ username, date, title, content, tag, replies }) => {
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postUser}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarText}>{username.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{username}</Text>
            <Text style={styles.postDate}>{date}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.postTitle}>{title}</Text>
      <Text style={styles.postContent}>{content}</Text>
      
      <TouchableOpacity style={styles.readMoreButton}>
        <Text style={styles.readMoreText}>Read More</Text>
      </TouchableOpacity>
      
      <View style={styles.postFooter}>
        <View style={styles.tagContainer}>
          <View style={[styles.tag, tag.includes("experienced") ? styles.experiencedTag : styles.helpTag]}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        </View>
        
        <View style={styles.interactionContainer}>
          <View style={styles.replyContainer}>
            <Ionicons name="chatbubble-outline" size={16} color="#555" />
            <Text style={styles.replyCount}>{replies}</Text>
          </View>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-social-outline" size={18} color="#555" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  postUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  postDate: {
    fontSize: 12,
    color: '#666',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  readMoreButton: {
    marginBottom: 12,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagContainer: {
    flex: 1,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  experiencedTag: {
    backgroundColor: '#E7F5E8',
  },
  helpTag: {
    backgroundColor: '#E7F7FA',
  },
  tagText: {
    fontSize: 12,
    color: '#333',
  },
  interactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  replyCount: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
  },
  shareButton: {
    padding: 2,
  },
});

export default DiscussionPost;