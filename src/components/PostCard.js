import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert, Share, Clipboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useUser } from '../context/userContext';
import { likePost, unlikePost, followPost, unfollowPost } from '../api/postService';
import { getFullImageUrl } from '../api/config';
import { formatDateTime } from '../utils/timeUtils';


const PostCard = ({ post }) => {
  const navigation = useNavigation();
  const { user } = useUser();
  

  const [isLiked, setIsLiked] = useState(post.is_liked_by_user || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [isFollowing, setIsFollowing] = useState(post.is_following || false);
  const [followerCount, setFollowerCount] = useState(post.followers_count || 0);
  
  const handleLike = async () => {
    try {
      if (isLiked) {
        const response = await unlikePost(post.id);
        setIsLiked(false);
        setLikeCount(response.like_count);
      } else {
        const response = await likePost(post.id);
        setIsLiked(true);
        setLikeCount(response.like_count);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };
  
  const handleFollow = async () => {
    try {
      if (isFollowing) {
        const response = await unfollowPost(post.id);
        setIsFollowing(false);
        setFollowerCount(response.followers_count);
      } else {
        const response = await followPost(post.id);
        setIsFollowing(true);
        setFollowerCount(response.followers_count);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };
  
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this post: https://wolfkey.net/post/${post.id}`,
        url: `https://wolfkey.net/post/${post.id}`,
      });
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
        } else {
          // Shared
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share post');
    }
  };
  
  // Navigate to post detail, but not for interactive elements
  const handleCardPress = () => {
    navigation.navigate('PostDetail', { postId: post.id });
  };

  return (
    <TouchableOpacity 
      onPress={handleCardPress}
      style={[styles.postCard, post.solved && styles.highlightedCard]}
    >
      {/* Solved Banner */}
      {post.solved && (
        <View style={styles.solvedBanner}>
          <Text style={styles.solvedBannerText}>Solved</Text>
        </View>
      )}
      
      <View style={styles.cardBody}>
        {/* Author and Date Section */}
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
            <View style={styles.authorDetails}>
              <Text style={styles.authorName}>
                {post.is_anonymous ? 'Anonymous' : post.author_name}
              </Text>
              <Text style={styles.timestamp}>
                {formatDateTime(post.created_at)}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.title}>{post.title}</Text>
        {post.preview_text ? <Text style={styles.text}>{post.preview_text}</Text> : <View></View>}
        
        {/* First Image */}
        {post.first_image_url && (
          <Image 
            source={{ uri: getFullImageUrl(post.first_image_url) }}
            style={styles.contentImage}
            resizeMode="cover"
          />
        )}
        
        {/* Course Context */}
        {Array.isArray(post.courses) && post.courses.length > 0 && (
          <View style={styles.courseContextContainer}>
            {post.courses.map((course, idx) => (
              <Text
                key={idx}
                style={[styles.courseContext, {
                  backgroundColor:
                    course.needs_help ? '#3B82F6' :
                    course.is_experienced ? '#198754' :
                    '#6C757D'
                }]}
              >
                {course.name}
              </Text>
            ))}
          </View>
        )}
        
        {/* Non-Interactions Row */}
        <View style={styles.nonInteractions}>
          <Text style={styles.statText}>
            <Text style={styles.statLabel}>Views: </Text>
            {post.views || 0}
          </Text>
          <Text style={styles.statText}>
            <Text style={styles.statLabel}>Responses: </Text>
            {post.reply_count || 0}
          </Text>
        </View>
        
        {/* Interactions Row */}
        {user && (
          <View style={styles.interactions}>
            {/* Like Button */}
            <TouchableOpacity 
              style={[styles.interactionButton, isLiked && styles.activeButton]}
              onPress={handleLike}
            >
              <MaterialIcons 
                name={isLiked ? "favorite" : "favorite-border"} 
                size={20} 
                color={isLiked ? "#e91e63" : "#666"}
              />
              <Text style={[styles.interactionText, isLiked && styles.activeText]}>
                {likeCount}
              </Text>
            </TouchableOpacity>
            
            {/* Follow Button */}
            <TouchableOpacity 
              style={[styles.interactionButton, isFollowing && styles.activeButton]}
              onPress={handleFollow}
            >
              <MaterialIcons 
                name={isFollowing ? "notifications" : "notifications-none"} 
                size={20} 
                color={isFollowing ? "#2196f3" : "#666"}
              />
              <Text style={[styles.interactionText, isFollowing && styles.activeText]}>
                {followerCount}
              </Text>
            </TouchableOpacity>
            
            {/* Share Button */}
            <TouchableOpacity 
              style={styles.interactionButton}
              onPress={handleShare}
            >
              <MaterialIcons 
                name="share" 
                size={20} 
                color="#666"
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  highlightedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#198754',
  },
  solvedBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#198754',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    zIndex: 1,
  },
  solvedBannerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    flex: 1,
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
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 8,
  },
  profilePicPlaceholder: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
    color: '#1F2937',
    marginTop: 4,
  },
  text: {
    fontSize: 14,
    marginBottom: 8,
    color: '#4B5563',
    fontWeight: 400,
    lineHeight: 20,
  },
  contentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  courseContextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  courseContext: {
    fontSize: 12,
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    margin: 2,
    fontWeight: '500',
  },
  nonInteractions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 16,
  },
  statLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  interactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
  },
  interactionText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  activeText: {
    color: '#374151',
    fontWeight: '600',
  },
});

export default PostCard;