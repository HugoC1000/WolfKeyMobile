import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  const [isAccepted, setIsAccepted] = useState(initialIsAccepted);

  const handleVote = async (voteType) => {
    try {
      // If clicking same button as current vote, remove the vote
      if (userVote === voteType) {
        const endpoint = `solution/${solution.id}/${voteType === 1 ? 'upvote' : 'downvote'}/`;
        const response = await api.post(endpoint);
        setVotes(response.data.upvotes - response.data.downvotes);
        setUserVote(0);
        return;
      }

      // If changing from one vote to another or adding new vote
      const endpoint = `solution/${solution.id}/${voteType === 1 ? 'upvote' : 'downvote'}/`;
      const response = await api.post(endpoint);
      setVotes(response.data.upvotes - response.data.downvotes);
      setUserVote(voteType);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleAcceptSolution = async () => {
    try {
      await api.post(`solution/${solution.id}/accept/`);
      setIsAccepted(true);
      onRefresh();
    } catch (error) {
      console.error('Error accepting solution:', error);
    }
  };

  const renderVoteButtons = () => (
    <View style={styles.votingContainer}>
      <TouchableOpacity 
        style={[styles.voteButton, userVote === 1 && styles.votedButton]}
        onPress={() => handleVote(1)}
      >
        <MaterialIcons 
          name="arrow-upward" 
          size={16} 
          color={userVote === 1 ? '#2563EB' : '#666'} 
        />
      </TouchableOpacity>
      
      <Text style={styles.voteCount}>{votes}</Text>
      
      <TouchableOpacity 
        style={[styles.voteButton, userVote === -1 && styles.votedButton]}
        onPress={() => handleVote(-1)}
      >
        <MaterialIcons 
          name="arrow-downward" 
          size={16} 
          color={userVote === -1 ? '#2563EB' : '#666'} 
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
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.acceptedText}>Accepted Solution</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <Text style={styles.author}>{solution.author}</Text>
        <Text style={styles.date}>
          {new Date(solution.created_at).toLocaleDateString()}
        </Text>
      </View>

      <EditorJsRenderer blocks={solution.content?.blocks} />

      <View style={styles.footer}>
        {renderVoteButtons()}
        
        <View style={styles.actionsContainer}>
          {user?.id === postAuthorId && !isAccepted && (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptSolution}
            >
              <MaterialIcons name="check" size={20} color="#4CAF50" />
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
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  acceptedContainer: {
    shadowColor: '#4CAF50',
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  acceptedText: {
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  author: {
    ...globalStyles.regularText,
    fontWeight: '600',
  },
  date: {
    ...globalStyles.smallText,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  votingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteButton: {
    padding: 8,
    borderRadius: 4,
  },
  votedButton: {
    backgroundColor: '#EBF5FF',
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 12,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 4,
  },
  acceptButtonText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
  },
});

export default SolutionCard;