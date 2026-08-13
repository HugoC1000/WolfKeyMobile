import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Image,
  Linking,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import { GlassView } from 'expo-glass-effect';
import { useUser } from '../context/userContext';
import { likePost, unlikePost, followPost, unfollowPost } from '../api/postService';
import { getFullImageUrl } from '../api/config';
import { formatDateTime } from '../utils/timeUtils';
import { triggerPressHaptic } from '../utils/haptics';
import PollCard from './PollCard';
import { TextWithLinks } from '../utils/linkParser';

const MESSAGE_URL_FIELDS = {
  Snapchat: 'snapchat_url',
  Instagram: 'instagram_url',
  LinkedIn: 'linkedin_url',
};

const PostCard = ({ post }) => {
  const router = useRouter();
  const { user } = useUser();
  const authorProfile = post?.author?.userprofile;
  const currentUserProfile = user?.userprofile;
  const preferredMsgApp = authorProfile?.preferred_msg_app;
  const preferredMsgUrl = authorProfile?.[MESSAGE_URL_FIELDS[preferredMsgApp]];
  const currentUserHasPreferredApp = Boolean(
    currentUserProfile?.[MESSAGE_URL_FIELDS[preferredMsgApp]]
  );
  const messageOptions = Object.entries(MESSAGE_URL_FIELDS)
    .map(([app, urlField]) => ({ app, url: authorProfile?.[urlField] }))
    .filter(({ url }) => Boolean(url));
  const hasMessageOptions = messageOptions.length > 0;

  const [isMessageMenuVisible, setIsMessageMenuVisible] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(post.is_liked));
  const [likeCount, setLikeCount] = useState(Number(post.like_count) || 0);
  const [isFollowing, setIsFollowing] = useState(Boolean(post.is_following));
  const [followerCount, setFollowerCount] = useState(Number(post.followers_count) || 0);
  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIsLiked(Boolean(post.is_liked));
    setLikeCount(Number(post.like_count) || 0);
    setIsFollowing(Boolean(post.is_following));
    setFollowerCount(Number(post.followers_count) || 0);
  }, [post]);

  const openMessageUrl = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Unable to open app', 'This messaging profile could not be opened.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening preferred messaging app:', error);
      Alert.alert('Unable to open app', 'This messaging profile could not be opened.');
    }
  };

  const handleMessagePress = () => {
    if (!hasMessageOptions) return;
    void triggerPressHaptic();

    if (preferredMsgUrl && currentUserHasPreferredApp) {
      void openMessageUrl(preferredMsgUrl);
      return;
    }

    setIsMessageMenuVisible((visible) => !visible);
  };

  const handleMessageOptionPress = (url) => {
    setIsMessageMenuVisible(false);
    void openMessageUrl(url);
  };
  
  const handleLike = async () => {
    void triggerPressHaptic();

    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(likeScale, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      if (isLiked) {
        const response = await unlikePost(post.id);
        setIsLiked(false);
        setLikeCount(Number(response?.like_count ?? response?.data?.like_count ?? likeCount - 1) || 0);
      } else {
        const response = await likePost(post.id);
        setIsLiked(true);
        setLikeCount(Number(response?.like_count ?? response?.data?.like_count ?? likeCount + 1) || 0);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };
  
  const handleFollow = async () => {
    void triggerPressHaptic();

    try {
      if (isFollowing) {
        const response = await unfollowPost(post.id);
        setIsFollowing(false);
        setFollowerCount(Number(response?.followers_count ?? response?.data?.followers_count ?? followerCount - 1) || 0);
      } else {
        const response = await followPost(post.id);
        setIsFollowing(true);
        setFollowerCount(Number(response?.followers_count ?? response?.data?.followers_count ?? followerCount + 1) || 0);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };
  
  const handleShare = async () => {
    void triggerPressHaptic();

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
    router.push(`/post-detail/${post.id}`);
  };

  // Navigate to author's profile
  const handleAuthorPress = () => {
    if (post.author?.username) {
      router.push({
        pathname: '/users/[username]',
        params: { username: post.author.username },
      });
    }
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
            {post.author?.username ? (
              <TouchableOpacity
                onPress={handleAuthorPress}
                activeOpacity={0.7}
                style={styles.authorClickable}
              >
                {post?.author?.userprofile?.profile_picture ? (
                  <Image
                    source={{ uri: getFullImageUrl(post.author.userprofile.profile_picture) }}
                    style={styles.profilePic}
                  />
                ) : (
                  <View style={styles.profilePicPlaceholder} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.authorClickable}>
                {post?.author?.userprofile?.profile_picture ? (
                  <Image
                    source={{ uri: getFullImageUrl(post.author.userprofile.profile_picture) }}
                    style={styles.profilePic}
                  />
                ) : (
                  <View style={styles.profilePicPlaceholder} />
                )}
              </View>
            )}

            <View style={styles.authorDetails}>
              <View style={styles.authorNameRow}>
                {post.author?.username ? (
                  <TouchableOpacity onPress={handleAuthorPress} activeOpacity={0.7}>
                    <Text style={styles.authorName}>{post.author.full_name || 'Anonymous'}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.authorName}>{post.author.full_name || 'Anonymous'}</Text>
                )}
                <Text style={styles.timestamp}>{formatDateTime(post.created_at)}</Text>
              </View>
              <Text style={styles.title}>{post.title}</Text>
              {post.preview_text ? <TextWithLinks text={post.preview_text} style={styles.text} /> : null}

              {post.poll_data && (
                <PollCard postId={post.id} pollData={post.poll_data} />
              )}
            </View>
          </View>
        </View>
        
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
          <View style={styles.actionArea}>
            {isMessageMenuVisible && !post.is_anonymous && hasMessageOptions && (
              <GlassView
                style={styles.messageMenu}
                glassEffectStyle="regular"
                isInteractive
              >
                {messageOptions.map(({ app, url }) => (
                  <TouchableOpacity
                    key={app}
                    style={styles.messageOption}
                    onPress={() => handleMessageOptionPress(url)}
                    accessibilityRole="button"
                    accessibilityLabel={`Message on ${app}`}
                  >
                    <Text style={styles.messageOptionText}>{app}</Text>
                  </TouchableOpacity>
                ))}
              </GlassView>
            )}

            <View style={styles.interactions}>
              {!post.is_anonymous && (
                <TouchableOpacity
                  style={[
                    styles.interactionButton,
                    !hasMessageOptions && styles.disabledInteractionButton,
                  ]}
                  onPress={handleMessagePress}
                  disabled={!hasMessageOptions}
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${post.author.full_name || post.author.username}`}
                  accessibilityState={{ disabled: !hasMessageOptions }}
                >
                  <Feather
                    name="send"
                    size={20}
                    color={hasMessageOptions ? 'black' : '#C4C4C4'}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.interactionButton}
                onPress={handleLike}
                accessibilityRole="button"
                accessibilityLabel={isLiked ? 'Unlike post' : 'Like post'}
              >
                <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                  <MaterialIcons
                    name={isLiked ? 'favorite' : 'favorite-border'}
                    size={20}
                    color={isLiked ? '#E91E63' : 'black'}
                  />
                </Animated.View>
                <Text style={[styles.interactionText, isLiked && styles.activeText]}>
                  {likeCount}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.interactionButton}
                onPress={handleFollow}
                accessibilityRole="button"
                accessibilityLabel={isFollowing ? 'Unfollow post' : 'Follow post'}
              >
                <MaterialIcons
                  name={isFollowing ? 'notifications' : 'notifications-none'}
                  size={20}
                  color={isFollowing ? '#2196F3' : 'black'}
                />
                <Text style={[styles.interactionText, isFollowing && styles.activeText]}>
                  {followerCount}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.interactionButton}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share post"
              >
                <MaterialIcons name="share" size={20} color="black" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 10,
    paddingLeft: 10,
    marginBottom: 8,
    borderRadius: 12,
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
    alignItems: 'flex-start',
    flex: 1,
  },
  authorClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 2,
    paddingBottom: 2,
  },
  profilePic: {
    width: 35,
    height: 35,
    borderRadius: 99,
    marginRight: 4,
  },
  profilePicPlaceholder: {
    width: 35,
    height: 35,
    borderRadius: 99,
    marginRight: 4,
    backgroundColor: '#F3F4F6',
  },
  authorDetails: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  title: {
    fontWeight : '600',
    marginBottom: 8,
    fontSize: 15,
    color: '#1F2937',
    marginTop: 4,
  },
  text: {
    fontSize: 12,
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
    marginBottom: 2,
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
  actionArea: {
    position: 'relative',
    zIndex: 10,
  },
  interactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  messageMenu: {
    position: 'absolute',
    left: 4,
    bottom: 44,
    minWidth: 190,
    padding: 8,
    borderRadius: 16,
    zIndex: 20,
  },
  messageOption: {
    minHeight: 42,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 10,
  },
  messageOptionText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
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
  disabledInteractionButton: {
    opacity: 0.65,
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
