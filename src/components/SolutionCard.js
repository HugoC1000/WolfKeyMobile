import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import EditorJsRenderer from './EditorJsRenderer';
import { globalStyles } from '../utils/styles';
import CommentList from './CommentList';
import api from '../api/config';
import { useUser } from '../context/userContext';

const SolutionCard = ({ solution, isAccepted: initialIsAccepted, postAuthorId, onRefresh }) => {
  const { user } = useUser();
  const [votes, setVotes] = useState(solution.upvotes - solution.downvotes);
  const [userVote, setUserVote] = useState(solution.user_vote || 0);
  const [isAccepted, setIsAccepted] = useState(solution.is_accepted || initialIsAccepted || false);

  const handleVote = async (voteType) => {
    try {
      const endpoint = `solutions/${solution.id}/vote/`;
      const response = await api.post(endpoint, { vote_type: voteType });
      setVotes(response.data.upvotes - response.data.downvotes);
      setUserVote(response.data.user_vote);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleAcceptSolution = async () => {
    try {
      await api.post(`solutions/${solution.id}/accept/`);
      setIsAccepted(true);
      onRefresh();
    } catch (error) {
      console.error('Error accepting solution:', error);
    }
  };

  const renderVoteButtons = () => (
    <View style={styles.votingContainer}>
      <TouchableOpacity 
        style={[styles.voteButton, userVote === 1 && styles.votedUpButton]}
        onPress={() => handleVote(1)}
      >
        <MaterialIcons 
          name="keyboard-arrow-up" 
          size={20} 
          color={userVote === 1 ? '#FF4500' : '#878A8C'} 
        />
      </TouchableOpacity>
      
      <Text style={[styles.voteCount, userVote !== 0 && styles.votedCount]}>
        {votes}
      </Text>
      
      <TouchableOpacity 
        style={[styles.voteButton, userVote === -1 && styles.votedDownButton]}
        onPress={() => handleVote(-1)}
      >
        <MaterialIcons 
          name="keyboard-arrow-down" 
          size={20} 
          color={userVote === -1 ? '#7193FF' : '#878A8C'} 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[
      styles.container,
      isAccepted && styles.acceptedContainer
    ]}>
      {isAccepted && (
        <View style={styles.acceptedBadge}>
          <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
          <Text style={styles.acceptedText}>✓ Accepted</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          {solution.author.userprofile.profile_picture ? (
            <Image 
              source={{ uri: solution.author.userprofile.profile_picture }}
              style={styles.profilePic}
            />
          ) : (
            <View style={styles.profilePicPlaceholder} />
          )}
          <View>
            <Text style={styles.author}>{solution.author_name}</Text>
            <Text style={styles.date}>
              {new Date(solution.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <EditorJsRenderer blocks={solution.content?.blocks} />
      </View>

      <View style={styles.footer}>
        {renderVoteButtons()}
        
        <View style={styles.actionsContainer}>
          {user?.id === postAuthorId && !isAccepted && (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptSolution}
            >
              <MaterialIcons name="check" size={16} color="#4CAF50" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <CommentList comments={solution.comments} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  acceptedContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.1,
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 6,
    borderRadius: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  acceptedText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
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
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  profilePicPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
    backgroundColor: '#DDD6FE',
  },
  author: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1b',
  },
  date: {
    fontSize: 11,
    color: '#787c82',
    marginTop: 1,
  },
  content: {
    marginTop: 4,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  votingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteButton: {
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  votedUpButton: {
    backgroundColor: '#FFE8D6',
  },
  votedDownButton: {
    backgroundColor: '#E3ECFF',
  },
  voteCount: {
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 8,
    color: '#1a1a1b',
    minWidth: 20,
    textAlign: 'center',
  },
  votedCount: {
    color: '#FF4500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  acceptButtonText: {
    color: '#4CAF50',
    marginLeft: 2,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SolutionCard;