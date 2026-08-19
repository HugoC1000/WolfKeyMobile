import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { removePetitionStance, setPetitionStance } from '../api/postService';
import { getFullImageUrl } from '../api/config';
import { triggerPressHaptic } from '../utils/haptics';

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatPercentage = (value) => {
  const percentage = Math.max(0, Math.min(100, toNumber(value)));
  return Number.isInteger(percentage) ? `${percentage}` : percentage.toFixed(1);
};

const getPayload = (raw) => raw?.petition_data || raw || null;

const PetitionCard = ({ postId, petitionData, style, isVotable = true }) => {
  const router = useRouter();
  const [payload, setPayload] = useState(() => getPayload(petitionData));
  const [draftStance, setDraftStance] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [visibleVoters, setVisibleVoters] = useState(null);
  const shouldAnimateNextResults = useRef(false);
  const supportWidth = useRef(new Animated.Value(0)).current;
  const opposeWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => setPayload(getPayload(petitionData)), [petitionData]);

  const viewerStance = payload?.viewer_stance || null;
  const hasStance = viewerStance === 'support' || viewerStance === 'oppose';
  const shouldShowResults = !isVotable || hasStance;
  const supportPercentage = toNumber(payload?.support_vote_percentage);
  const opposePercentage = toNumber(payload?.oppose_vote_percentage);

  useEffect(() => {
    const updateWidth = (value, target) => {
      if (shouldAnimateNextResults.current) {
        value.setValue(0);
        Animated.timing(value, { toValue: target, duration: 1000, useNativeDriver: false }).start();
      } else {
        value.setValue(target);
      }
    };

    updateWidth(supportWidth, supportPercentage);
    updateWidth(opposeWidth, opposePercentage);
    shouldAnimateNextResults.current = false;
  }, [opposePercentage, supportPercentage, opposeWidth, supportWidth]);

  const applyResponse = (response, animateBars) => {
    const nextPayload = getPayload(response);
    if (nextPayload) {
      shouldAnimateNextResults.current = animateBars;
      setPayload(nextPayload);
    }
  };

  const submitStance = async () => {
    if (!postId || !draftStance || submitting || hasStance || !isVotable) return;
    setSubmitting(true);
    try {
      applyResponse(await setPetitionStance(postId, draftStance), true);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit your vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeStance = async () => {
    if (!postId || submitting || !hasStance || !isVotable) return;
    setSubmitting(true);
    try {
      applyResponse(await removePetitionStance(postId), false);
      setDraftStance(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove your vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const options = [
    { stance: 'support', label: 'Support', count: toNumber(payload?.support_count), percentage: supportPercentage, voters: payload?.support_voters || [], width: supportWidth },
    { stance: 'oppose', label: 'Oppose', count: toNumber(payload?.oppose_count), percentage: opposePercentage, voters: payload?.oppose_voters || [], width: opposeWidth },
  ];
  const selectedStance = hasStance ? viewerStance : draftStance;
  const canSubmit = Boolean(draftStance) && !submitting && isVotable && !hasStance;
  const goal = toNumber(payload?.support_goal);
  const supportGoalPercentage = Math.max(0, Math.min(100, toNumber(payload?.support_percentage)));

  const openProfile = (voter) => {
    const username = voter?.username || voter?.user?.username;
    if (!username) return;
    setVisibleVoters(null);
    router.push({ pathname: '/users/[username]', params: { username } });
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.topRow}>
        <Text style={styles.heading}>Petition</Text>
      </View>

      {goal > 0 && (
        <View style={styles.goalSection}>
          <Text style={styles.goalText}>{toNumber(payload?.support_count)} of {goal} Support goal</Text>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${supportGoalPercentage}%` }]} />
          </View>
        </View>
      )}

      {options.map((option) => {
        const selected = selectedStance === option.stance;
        const animatedWidth = option.width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
        const voters = Array.isArray(option.voters) ? option.voters : [];
        return (
          <TouchableOpacity
            key={option.stance}
            style={[styles.option, shouldShowResults && selected && styles.selectedResult]}
            onPress={(event) => {
              event?.stopPropagation?.();
              if (!isVotable || hasStance || submitting) return;
              void triggerPressHaptic();
              setDraftStance(option.stance);
            }}
            disabled={!isVotable || hasStance || submitting}
            activeOpacity={0.85}
          >
            {shouldShowResults && <Animated.View style={[styles.optionFill, { width: animatedWidth }]} />}
            <View style={styles.optionContent}>
              <View style={styles.optionMain}>
                <Text style={styles.optionText}>{option.label}</Text>
                {shouldShowResults && (
                  <View style={styles.optionMetaRow}>
                    {voters.slice(0, 3).map((voter, index) => (
                      <TouchableOpacity
                        key={`${option.stance}-${voter?.id || index}`}
                        style={[styles.avatarWrap, index > 0 && styles.avatarOverlap]}
                        onPress={(event) => { event?.stopPropagation?.(); openProfile(voter); }}
                      >
                        {voter?.profile_picture_url ? <Image source={{ uri: getFullImageUrl(voter.profile_picture_url) }} style={styles.avatar} /> : <View style={styles.avatarFallback} />}
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={(event) => { event?.stopPropagation?.(); setVisibleVoters(option); }} disabled={!voters.length}>
                      <Text style={styles.optionMeta}>{option.count} {option.count === 1 ? 'vote' : 'votes'} {formatPercentage(option.percentage)}%</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {shouldShowResults ? (
                selected ? <View style={styles.selectedBadge}><MaterialIcons name="check" size={18} color="#FFFFFF" /></View> : null
              ) : (
                <MaterialIcons name={selected ? 'radio-button-checked' : 'radio-button-unchecked'} size={30} color={selected ? '#7A4A21' : '#9CA3AF'} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {isVotable && !hasStance && <TouchableOpacity style={[styles.voteButton, !canSubmit && styles.disabled]} onPress={submitStance} disabled={!canSubmit}><Text style={styles.voteButtonText}>{submitting ? 'Voting...' : 'Vote'}</Text></TouchableOpacity>}
      {!hasStance && <Text style={styles.footerText}>{toNumber(payload?.total_participants)} {toNumber(payload?.total_participants) === 1 ? 'participant' : 'participants'}</Text>}
      {isVotable && hasStance && <TouchableOpacity style={[styles.removeButton, submitting && styles.disabled]} onPress={removeStance} disabled={submitting}><Text style={styles.removeText}>{submitting ? 'Updating...' : 'Remove Vote'}</Text></TouchableOpacity>}

      <Modal visible={Boolean(visibleVoters)} transparent animationType="slide" onRequestClose={() => setVisibleVoters(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{visibleVoters?.label} voters</Text><TouchableOpacity onPress={() => setVisibleVoters(null)}><MaterialIcons name="close" size={22} color="#374151" /></TouchableOpacity></View>
          <ScrollView>{(visibleVoters?.voters || []).map((voter, index) => <TouchableOpacity key={`${voter?.id || 'voter'}-${index}`} style={styles.voterRow} onPress={() => openProfile(voter)}><View style={styles.voterAvatar}>{voter?.profile_picture_url ? <Image source={{ uri: getFullImageUrl(voter.profile_picture_url) }} style={styles.avatar} /> : null}</View><Text style={styles.voterName}>{voter?.full_name || voter?.username || 'Unknown User'}</Text></TouchableOpacity>)}</ScrollView>
        </View></View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginHorizontal: 8 },
  topRow: { marginBottom: 5 }, heading: { color: '#1F2937', fontSize: 13, fontWeight: '700' },
  goalSection: { marginBottom: 6 }, goalText: { color: '#6B7280', fontSize: 11, fontWeight: '500', marginBottom: 3 }, goalTrack: { height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', overflow: 'hidden' }, goalFill: { height: '100%', backgroundColor: '#7A4A21' },
  option: { backgroundColor: '#ECECEC', borderRadius: 14, marginBottom: 4, overflow: 'hidden' }, selectedResult: { backgroundColor: '#D4B08A' }, optionFill: { ...StyleSheet.absoluteFillObject, backgroundColor: '#B77A45', borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  optionContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 6 }, optionMain: { flex: 1 }, optionText: { color: '#1F2937', fontSize: 12, fontWeight: '600', marginBottom: 2 }, optionMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 }, optionMeta: { color: '#000000', fontSize: 11, fontWeight: '500' },
  avatarWrap: { width: 20, height: 20, borderRadius: 10, overflow: 'hidden', backgroundColor: '#CBD5E1' }, avatarOverlap: { marginLeft: -6 }, avatar: { width: '100%', height: '100%' }, avatarFallback: { flex: 1, backgroundColor: '#CBD5E1' }, selectedBadge: { width: 25, height: 25, borderRadius: 17, backgroundColor: '#7A4A21', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  voteButton: { marginTop: 4, borderRadius: 999, backgroundColor: '#E5E7EB', paddingVertical: 11, alignItems: 'center' }, voteButtonText: { color: '#111827', fontSize: 15, fontWeight: '600' }, footerText: { marginTop: 8, color: '#6B7280', fontSize: 12, fontWeight: '500' }, removeButton: { borderRadius: 999, backgroundColor: '#F3F4F6', paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' }, removeText: { color: '#374151', fontSize: 13, fontWeight: '600' }, disabled: { opacity: 0.7 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', justifyContent: 'flex-end' }, modalCard: { maxHeight: '75%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 18 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' }, voterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }, voterAvatar: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden', backgroundColor: '#D1D5DB', marginRight: 8 }, voterName: { color: '#374151', fontSize: 13, fontWeight: '500' },
});

export default PetitionCard;
