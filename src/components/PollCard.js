import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Alert, Animated, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { removePollVote, voteOnPoll } from '../api/postService';
import { getFullImageUrl } from '../api/config';


const getPollPayload = (raw) => {
  if (!raw) return null;

  if (raw.poll_data) {
    return raw.poll_data;
  }

  if (raw.poll_options || raw.poll_info || raw.user_vote) {
    return {
      poll_options: raw.poll_options || [],
      poll_info: raw.poll_info || {},
      user_vote: raw.user_vote || null,
    };
  }

  return null;
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const deriveSelectedIds = (payload) => {
  const explicit = payload?.user_vote?.selected_option_ids;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit.map((id) => toNumber(id)).filter((id) => id > 0);
  }

  const options = Array.isArray(payload?.poll_options) ? payload.poll_options : [];
  return options
    .filter((option) => option?.user_voted)
    .map((option) => toNumber(option.id))
    .filter((id) => id > 0);
};

const formatPercentage = (value) => {
  const safeValue = Math.max(0, Math.min(100, toNumber(value, 0)));
  if (Number.isInteger(safeValue)) return `${safeValue}`;
  return safeValue.toFixed(1);
};

const PollCard = ({ postId, pollData, style, isVotable = true }) => {
  const router = useRouter();
  const [payload, setPayload] = useState(() => getPollPayload(pollData));
  const [draftSelectedIds, setDraftSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isResultsModalVisible, setIsResultsModalVisible] = useState(false);
  const animatedValues = useRef({});
  const shouldAnimateNextResults = useRef(false);

  useEffect(() => {
    const nextPayload = getPollPayload(pollData);
    setPayload(nextPayload);
  }, [pollData]);

  // Keep animated values in sync with payload; animate only when a new vote is submitted.
  useEffect(() => {
    const nextOptions = Array.isArray(payload?.poll_options) ? payload.poll_options : [];

    nextOptions.forEach((option) => {
      const optionId = toNumber(option.id);
      if (optionId) {
        const percentage = toNumber(option.percentage, 0);

        if (!animatedValues.current[optionId]) {
          animatedValues.current[optionId] = new Animated.Value(0);
        }

        if (shouldAnimateNextResults.current) {
          animatedValues.current[optionId].setValue(0);
          Animated.timing(animatedValues.current[optionId], {
            toValue: percentage,
            duration: 650,
            useNativeDriver: false,
          }).start();
        } else {
          animatedValues.current[optionId].setValue(percentage);
        }
      }
    });

    shouldAnimateNextResults.current = false;
  }, [payload]);

  const options = useMemo(
    () => (Array.isArray(payload?.poll_options) ? payload.poll_options : []),
    [payload]
  );

  const pollInfo = payload?.poll_info || {};
  const isMultiSelect = !!pollInfo.allow_multiple_choice;
  const isPublicVoting = !!pollInfo.is_public_voting;
  const votedOptionIds = useMemo(() => deriveSelectedIds(payload), [payload]);
  const hasUserVote = votedOptionIds.length > 0;
  const activeSelectedIds = hasUserVote ? votedOptionIds : draftSelectedIds;
  const shouldShowResults = !isVotable || hasUserVote;
  const canSubmitVote = isVotable && !hasUserVote && draftSelectedIds.length > 0 && !submitting;

  useEffect(() => {
    if (hasUserVote) {
      setDraftSelectedIds(votedOptionIds);
    } else {
      setDraftSelectedIds([]);
    }
  }, [hasUserVote, votedOptionIds]);

  const totalVotes = toNumber(pollInfo.total_votes, 0);

  const applyResponsePayload = (responseData, fallbackSelection, config = {}) => {
    const normalized = getPollPayload(responseData);
    const { animateBars = false } = config;

    if (!normalized) {
      setDraftSelectedIds(fallbackSelection || []);
      return;
    }

    shouldAnimateNextResults.current = animateBars;
    setPayload(normalized);
  };

  const submitVote = async (nextSelection) => {
    if (!postId || submitting) return;

    setSubmitting(true);
    try {
      const data = await voteOnPoll(postId, nextSelection);
      applyResponsePayload(data, nextSelection, { animateBars: true });
    } catch (error) {
      console.error('Error submitting poll vote:', error);
      Alert.alert('Error', 'Failed to submit your vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectOption = (optionId) => {
    const normalizedId = toNumber(optionId);
    if (!normalizedId) return;

    if (!isVotable) {
      return;
    }

    // Once a vote exists, force users to remove it before changing options.
    if (hasUserVote) {
      return;
    }

    const allowMultiple = !!pollInfo.allow_multiple_choice;
    const currentlySelected = activeSelectedIds.includes(normalizedId);

    if (allowMultiple) {
      const nextSelection = currentlySelected
        ? activeSelectedIds.filter((id) => id !== normalizedId)
        : [...activeSelectedIds, normalizedId];

      setDraftSelectedIds(nextSelection);
      return;
    }

    setDraftSelectedIds([normalizedId]);
  };

  const handleVotePress = async () => {
    if (!canSubmitVote) return;
    await submitVote(draftSelectedIds);
  };

  const handleRemoveVote = async () => {
    if (!postId || submitting) return;

    setSubmitting(true);
    try {
      const data = await removePollVote(postId);
      applyResponsePayload(data, [], { animateBars: false });
    } catch (error) {
      console.error('Error removing poll vote:', error);
      Alert.alert('Error', 'Failed to remove your vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!options.length) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.topRow}>
        <Text style={styles.subtitle}>
          {isPublicVoting ? 'Public voting' : 'Private voting'}
        </Text>
      </View>
      {(() => {
        const maxVotes = Math.max(...options.map(opt => toNumber(opt.vote_count, 0)), 0);
        return options.map((option) => {
          const optionId = toNumber(option.id);
          const selected = activeSelectedIds.includes(optionId);
          const percentage = Math.max(0, Math.min(100, toNumber(option.percentage, 0)));
          const voteCount = toNumber(option.vote_count, 0);
          const isHighestVote = maxVotes > 0 && voteCount === maxVotes;
          const recentVoters = Array.isArray(option?.recent_voters)
            ? option.recent_voters.slice(0, 3)
            : [];

          if (!animatedValues.current[optionId]) {
            animatedValues.current[optionId] = new Animated.Value(0);
          }

          const animatedWidth = animatedValues.current[optionId].interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          });

          return (
            <TouchableOpacity
              key={optionId || `${option.text}`}
              style={[
                styles.option,
                shouldShowResults && isHighestVote && styles.highestVoteOption,
              ]}
            activeOpacity={0.85}
            onPress={(event) => {
              event?.stopPropagation?.();
              handleSelectOption(optionId);
            }}
            disabled={submitting || !isVotable || hasUserVote}
          >
            {shouldShowResults && (
              <View style={styles.optionFillWrap}>
                <Animated.View
                  style={[
                    isHighestVote ? styles.optionFillHighest : styles.optionFill,
                    {
                      width: animatedWidth,
                    },
                  ]}
                />
              </View>
            )}

            <View style={styles.optionContent}>
              <View style={styles.optionMain}>
                <Text style={[styles.optionText, shouldShowResults && styles.optionTextPostVote]}>
                  {option.text}
                </Text>
                {shouldShowResults && (
                  <View style={styles.optionMetaRow}>
                    {recentVoters.length > 0 && (
                      <View style={styles.recentVotersStack}>
                        {recentVoters.map((voter, index) => {
                          const voterName = (voter?.full_name || '').trim();
                          const initial = voterName ? voterName[0].toUpperCase() : '?';
                          const handlePress = (event) => {
                            event?.stopPropagation?.();
                            const username = voter?.username || voter?.user?.username;
                            if (username) {
                              router.push({ pathname: '/profile-screen', params: { username } });
                            }
                          };

                          return (
                            <TouchableOpacity
                              key={`${optionId}-recent-${voter?.id || index}`}
                              style={[
                                styles.recentVoterAvatarWrap,
                                index > 0 && styles.recentVoterAvatarOverlap,
                              ]}
                              onPress={handlePress}
                              activeOpacity={0.8}
                            >
                              {voter?.profile_picture_url ? (
                                <Image
                                  source={{ uri: getFullImageUrl(voter.profile_picture_url) }}
                                  style={styles.recentVoterAvatar}
                                />
                              ) : (
                                <View style={styles.recentVoterFallback}>
                                  <Text style={styles.recentVoterInitial}>{initial}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    <Text style={[styles.optionMeta, shouldShowResults && styles.optionMetaPostVote]}>
                      {voteCount} {voteCount === 1 ? 'vote' : 'votes'} {formatPercentage(option.percentage)}%
                    </Text>
                  </View>
                )}
              </View>

              {shouldShowResults ? (
                isMultiSelect ? (
                  <MaterialIcons
                    name={selected ? 'check-box' : 'check-box-outline-blank'}
                    size={28}
                    color={selected ? '#06266b' : '#9CA3AF'}
                  />
                ) : (
                  selected && (
                    <View style={styles.selectedBadge}>
                      <MaterialIcons name="check" size={18} color="#FFFFFF" />
                    </View>
                  )
                )
              ) : (
                <MaterialIcons
                  name={
                    isMultiSelect
                      ? (selected ? 'check-box' : 'check-box-outline-blank')
                      : (selected ? 'radio-button-checked' : 'radio-button-unchecked')
                  }
                  size={30}
                  color={selected ? '#06266b' : '#9CA3AF'}
                />
              )}
            </View>
          </TouchableOpacity>
        );
        });
      })()}

      {isPublicVoting && hasUserVote && (
        <TouchableOpacity
          onPress={(event) => {
            event?.stopPropagation?.();
            setIsResultsModalVisible(true);
          }}
          style={styles.showResultsButton}
        >
          <Text style={styles.showResultsText}>Show results ({totalVotes})</Text>
        </TouchableOpacity>
      )}

      

      {isVotable && !hasUserVote && (
        <TouchableOpacity
          onPress={(event) => {
            event?.stopPropagation?.();
            handleVotePress();
          }}
          style={[styles.voteButton, !canSubmitVote && styles.disabledButton]}
          disabled={!canSubmitVote}
        >
          <Text style={styles.voteButtonText}>{submitting ? 'Voting...' : 'Vote'}</Text>
        </TouchableOpacity>
      )}

      {!hasUserVote && (
        <View style={styles.footerRow}>
          <Text style={styles.footerMetaText}>
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </Text>
        </View>
      )}

      {isVotable && hasUserVote && (
        <TouchableOpacity
          onPress={(event) => {
            event?.stopPropagation?.();
            handleRemoveVote();
          }}
          style={[styles.removeVoteButton, submitting && styles.disabledButton]}
          disabled={submitting}
        >
          <Text style={styles.removeVoteText}>{submitting ? 'Updating...' : 'Remove Vote'}</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={isResultsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsResultsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Poll Results</Text>
              <TouchableOpacity onPress={() => setIsResultsModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {options.map((option) => {
                const voters = Array.isArray(option?.voters) ? option.voters : [];
                return (
                  <View key={`result-${option.id}`} style={styles.optionSection}>
                    <Text style={styles.optionSectionTitle}>
                      {option.text} ({voters.length})
                    </Text>

                    {voters.length === 0 ? (
                      <Text style={styles.emptyVotersText}>No votes yet.</Text>
                    ) : (
                      voters.map((voter, idx) => {
                        const handlePress = (event) => {
                          event?.stopPropagation?.();
                          const username = voter?.username || voter?.user?.username;
                          console.log(voter);
                          if (username) {
                            router.push({ pathname: '/profile-screen', params: { username } });
                            setIsResultsModalVisible(false);
                          }
                        };

                        return (
                          <TouchableOpacity
                            key={`${voter?.id || 'voter'}-${idx}`}
                            style={styles.voterRow}
                            onPress={handlePress}
                            activeOpacity={0.8}
                          >
                            {voter?.profile_picture_url ? (
                              <Image source={{ uri: getFullImageUrl(voter.profile_picture_url) }} style={styles.voterAvatar} />
                            ) : (
                              <View style={styles.voterAvatarFallback} />
                            )}
                            <Text style={styles.voterName}>{voter?.full_name || 'Unknown User'}</Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '500',
  },
  topRow: {
    marginBottom: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  option: {
    backgroundColor: '#ececec',
    borderRadius: 14,
    marginBottom: 4,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: '#E5E7EB',
  },
  highestVoteOption: {
    backgroundColor: '#22863A',
    borderWidth: 0,
  },
  optionFillWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  optionFill: {
    height: '100%',
    backgroundColor: '#999999',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  optionFillHighest: {
    height: '100%',
    backgroundColor: '#45d266',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  optionMain: {
    flex: 1,
  },
  optionText: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionTextPostVote: {
    color: '#000000',
  },
  optionMeta: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
  },
  optionMetaPostVote: {
    color: '#000000',
  },
  optionMetaRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentVotersStack: {
    flexDirection: 'row',
    marginRight: 8,
  },
  recentVoterAvatarWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 0,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  recentVoterAvatarOverlap: {
    marginLeft: -6,
  },
  recentVoterAvatar: {
    width: '100%',
    height: '100%',
  },
  recentVoterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CBD5E1',
  },
  recentVoterInitial: {
    fontSize: 9,
    fontWeight: '700',
    color: '#374151',
  },
  selectedBadge: {
    width: 25,
    height: 25,
    borderRadius: 17,
    backgroundColor: '#06266b',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  removeVoteButton: {
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  removeVoteText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  voteButton: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  footerRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerMetaText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  showResultsText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
  showResultsButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    paddingBottom: 8,
  },
  optionSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionSectionTitle: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyVotersText: {
    color: '#6B7280',
    fontSize: 12,
  },
  voterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  voterAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  voterAvatarFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    backgroundColor: '#D1D5DB',
  },
  voterName: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default PollCard;
