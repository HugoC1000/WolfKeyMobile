import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import EditorJsRenderer from './EditorJsRenderer';
import { globalStyles } from '../utils/styles';
import BackgroundSvg from '../components/BackgroundSVG';
import { formatDateTime } from '../utils/timeUtils';
import { getFullImageUrl } from '../api/config';
import PollCard from './PollCard';



const PostDetailCard = ({
  post,
  isReference,
  showPollWhenReference = false,
  pollIsVotable = true,
}) => {
  const router = useRouter();
  const detailPollData = post?.poll_data || {
    poll_options: post?.poll_options,
    poll_info: post?.poll_info,
    user_vote: post?.user_vote,
  };
  const hasPollData = Array.isArray(detailPollData?.poll_options) && detailPollData.poll_options.length > 0;

  // Navigate to author's profile
  const handleAuthorPress = () => {
    if (post.author?.username && !post.is_anonymous) {
      router.push({
        pathname: '/profile-screen',
        params: { username: post.author.username },
      });
    }
  };

  return (
    <View style={[styles.postCard, isReference && styles.referenceCard]}>
      {!isReference && (
        <TouchableOpacity 
          style={styles.header}
          onPress={handleAuthorPress}
          activeOpacity={0.7}
          disabled={post.is_anonymous}
        >
          <View style={styles.authorInfo}>
            {post?.author?.userprofile?.profile_picture ? (
              <Image 
                source={{ uri: getFullImageUrl(post.author.userprofile.profile_picture) }}
                style={styles.profilePic}
              />
            ) : (
              <View style={styles.profilePicPlaceholder} />
            )}
            <Text style={styles.authorName}>{post.is_anonymous ? 'Anonymous' : post.author.full_name}</Text>
            <Text style={styles.timestamp}>
              {formatDateTime(post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      <Text style={[styles.title, isReference && styles.referenceTitle]}>
        {post.title}
      </Text>
      {hasPollData && (!isReference || showPollWhenReference) && (
        <PollCard
          postId={post.id}
          pollData={detailPollData}
          isVotable={pollIsVotable}
        />
      )}
      <EditorJsRenderer blocks={post.content?.blocks} />
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 50,
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