import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Share,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import { GlassView } from 'expo-glass-effect';
import EditorJsRenderer from './EditorJsRenderer';
import { formatDateTime } from '../utils/timeUtils';
import { getFullImageUrl } from '../api/config';
import { followPost, likePost, unfollowPost, unlikePost } from '../api/postService';
import { useUser } from '../context/userContext';
import { triggerPressHaptic } from '../utils/haptics';
import PollCard from './PollCard';
import PetitionCard from './PetitionCard';

const VERIFIED_BADGE = require('../../assets/verified-badge-compact.png');

const MESSAGE_URL_FIELDS = {
  Snapchat: 'snapchat_url',
  Instagram: 'instagram_url',
  LinkedIn: 'linkedin_url',
};

const isValidPetitionData = (petitionData) => (
  petitionData && typeof petitionData === 'object' && !Array.isArray(petitionData)
);

const PostDetailCard = ({
  post,
  isReference,
  showPollWhenReference = false,
  pollIsVotable = true,
}) => {
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
  const detailPollData = post?.poll_data || {
    poll_options: post?.poll_options,
    poll_info: post?.poll_info,
    user_vote: post?.user_vote,
  };
  const hasPollData = Array.isArray(detailPollData?.poll_options) && detailPollData.poll_options.length > 0;
  const hasPetitionData = isValidPetitionData(post?.petition_data);

  useEffect(() => {
    setIsLiked(Boolean(post.is_liked));
    setLikeCount(Number(post.like_count) || 0);
    setIsFollowing(Boolean(post.is_following));
    setFollowerCount(Number(post.followers_count) || 0);
  }, [post]);

  // Navigate to author's profile
  const handleAuthorPress = () => {
    if (post.author?.username && !post.is_anonymous) {
      router.push({
        pathname: '/users/[username]',
        params: { username: post.author.username },
      });
    }
  };

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
        setFollowerCount(
          Number(response?.followers_count ?? response?.data?.followers_count ?? followerCount - 1) || 0
        );
      } else {
        const response = await followPost(post.id);
        setIsFollowing(true);
        setFollowerCount(
          Number(response?.followers_count ?? response?.data?.followers_count ?? followerCount + 1) || 0
        );
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleShare = async () => {
    void triggerPressHaptic();

    try {
      await Share.share({
        message: `Check out this post: https://wolfkey.net/post/${post.id}`,
        url: `https://wolfkey.net/post/${post.id}`,
      });
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post');
    }
  };

  return (
    <View style={[styles.postCard, isReference && styles.referenceCard]}>
      {!isReference && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={handleAuthorPress}
            activeOpacity={0.7}
            disabled={post.is_anonymous}
          >
            {post?.author?.userprofile?.profile_picture ? (
              <Image 
                source={{ uri: getFullImageUrl(post.author.userprofile.profile_picture) }}
                style={styles.profilePic}
              />
            ) : (
              <View style={styles.profilePicPlaceholder} />
            )}
            <Text style={styles.authorName}>{post.is_anonymous ? 'Anonymous' : post.author.full_name}</Text>
            {!post.is_anonymous && (post.author?.is_community_account || post.author?.is_paid_user) && (
              <Image source={VERIFIED_BADGE} style={styles.verifiedBadge} accessibilityLabel="Verified account" />
            )}
            <Text style={styles.timestamp}>
              {formatDateTime(post.created_at)}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={[styles.title, isReference && styles.referenceTitle]}>
        {post.title}
      </Text>
      <EditorJsRenderer blocks={post.content?.blocks} />
      {hasPollData && (!isReference || showPollWhenReference) && (
        <PollCard
          postId={post.id}
          pollData={detailPollData}
          isVotable={pollIsVotable}
        />
      )}
      {hasPetitionData && (!isReference || showPollWhenReference) && (
        <PetitionCard
          postId={post.id}
          petitionData={post.petition_data}
          isVotable={pollIsVotable}
        />
      )}
      {!isReference && user && (
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
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 0,
    lineHeight: 22,
    color: '#1a1a1b',
  },
  timestamp: {
    fontSize: 10,
    color: '#787c82',
    marginLeft: 8,
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
    alignItems: 'center',
    marginBottom: 4,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  actionArea: {
    position: 'relative',
    zIndex: 10,
  },
  interactions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 4,
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
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  disabledInteractionButton: {
    opacity: 0.65,
  },
  interactionText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeText: {
    color: '#374151',
    fontWeight: '600',
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
  verifiedBadge: {
    width: 17,
    height: 17,
    marginLeft: 4,
    resizeMode: 'contain',
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
