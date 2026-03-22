import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../utils/constants';
import volunteerService from '../api/volunteerService';
import BackgroundSvg from '../components/BackgroundSVG';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import { useUser } from '../context/userContext';


const HEADER_HEIGHT = 45;

const VolunteerScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [volunteerHours, setVolunteerHours] = useState(0);
  const [milestones, setMilestones] = useState([]);
  const [resources, setResources] = useState([]);
  const [currentPin, setCurrentPin] = useState(null);
  const [nextPin, setNextPin] = useState(null);
  const { user } = useUser();
  

  useEffect(() => {
    fetchVolunteerData();
  }, []);

  const fetchVolunteerData = async () => {
    try {
      const [hoursData, milestonesData, resourcesData] = await Promise.all([
        volunteerService.getVolunteerHours(),
        volunteerService.getVolunteerMilestones(),
        volunteerService.getVolunteerResources(),
      ]);

      console.log('Volunteer API responses:', { hoursData, milestonesData, resourcesData });

      const hours = hoursData.user_hours || 0;
      setVolunteerHours(hours);
      
      // Extract arrays from API responses
      const milestonesArray = Array.isArray(milestonesData?.milestones) 
        ? milestonesData.milestones 
        : [];
      const resourcesArray = Array.isArray(resourcesData?.resources) 
        ? resourcesData.resources 
        : [];
      
      setMilestones(milestonesArray);
      setResources(resourcesArray);

      // Use current and next pin from API response
      setCurrentPin(hoursData.current_pin || null);
      setNextPin(hoursData.next_pin || null);
    } catch (error) {
      console.error('Error fetching volunteer data:', error);
      Alert.alert('Error', 'Failed to load volunteer data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVolunteerData();
  };

  const handleResourcePress = async (url) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open resource');
    }
  };

  const quickActionsData = [
    {
      id: 'log-hours',
      title: 'Log Hours',
      icon: 'edit',
      url: 'https://docs.google.com/forms/d/e/1FAIpQLSf11H9-OXDOos2l5HM041oZO7mgHR4bo9ycJdFOfeRHMHCsHw/viewform',
    },
    {
      id: 'request-pin',
      title: 'Request a Pin',
      icon: 'card-giftcard',
      url: 'https://docs.google.com/forms/d/e/1FAIpQLSfdZwB-5wlC4_zwrGRRyBsUxx-Vw1XaOmJ9RfJ_UelwUDeDnQ/viewform?usp=sf_link',
    },
  ];

  const renderMilestone = (milestone, index) => {
    const isAchieved = milestone.achieved || false;
    const isInProgress = !isAchieved && nextPin?.id === milestone.id;
    const progress = Math.round(milestone.progress_percentage || 0);
    const isLocked = !isAchieved && !isInProgress;

    return (
      <View 
        key={milestone.id} 
        style={[
          styles.milestoneCard,
          isAchieved && styles.milestoneCardAchieved,
          isInProgress && styles.milestoneCardInProgress,
          isLocked && styles.milestoneCardLocked
        ]}
      >
        <Text style={[
          styles.milestoneLevelText,
          isAchieved && styles.milestoneLevelTextAchieved,
          isInProgress && styles.milestoneLevelTextInProgress,
          isLocked && styles.milestoneLevelTextLocked
        ]}>
          {milestone.name}
        </Text>
        {isInProgress && (
          <Text style={styles.milestoneProgressText}>{progress}%</Text>
        )}
        {isLocked && (
          <>
            <View style={styles.milestoneLockIcon}>
              <MaterialIcons name="lock" size={18} color="#9E9E9E" />
            </View>
            <Text style={styles.milestoneLockedProgressText}>{progress}%</Text>
          </>
        )}
        {isAchieved && (
          <View style={styles.milestoneCheckmark}>
            <MaterialIcons name="check" size={32} color="#FFFFFF" />
          </View>
        )}
      </View>
    );
  };

  const renderResource = (resource) => {
    return (
      <TouchableOpacity
        key={resource.id}
        style={styles.resourceCard}
        onPress={() => handleResourcePress(resource.url)}
      >
        <View style={styles.resourceIconContainer}>
          <MaterialIcons name="launch" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.resourceTextContainer}>
          <Text style={styles.resourceTitle}>{resource.title}</Text>
          {resource.description && (
            <Text style={styles.resourceDescription}>{resource.description}</Text>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={24} color={COLORS.text.light} />
      </TouchableOpacity>
    );
  };

  const renderQuickAction = (action) => {
    return (
      <TouchableOpacity
        key={action.id}
        style={styles.quickActionButton}
        onPress={() => handleResourcePress(action.url)}
      >
        <View style={styles.quickActionIconContainer}>
          <MaterialIcons name={action.icon} size={24} color={COLORS.white} />
        </View>
        <Text style={styles.quickActionText}>{action.title}</Text>
      </TouchableOpacity>
    );
  };

  // Calculate progress to next pin
  const getProgressToNextPin = () => {
    if (!currentPin || !nextPin) return null;
    
    const currentHours = currentPin.hours_required;
    const nextHours = nextPin.hours_required;
    const progress = nextPin.progress_percentage || 0;
    
    return {
      percentage: Math.min(100, Math.max(0, progress)),
      currentHours,
      nextHours,
      nextPinName: nextPin.name
    };
  };

  const progressData = getProgressToNextPin();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <BackgroundSvg />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading volunteer data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundSvg/>
      <ScrollableScreenWrapper title="Volunteer Hours">
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Top Cards Row */}
          <View style={styles.topCardsRow}>
            {/* Total Hours Card */}
            <View style={styles.topCard}>
              <Text style={styles.topCardLabel}>Total Hours</Text>
              <Text style={styles.topCardValue}>{volunteerHours}</Text>
              <Text style={styles.topCardSubtext}>All time</Text>
              <View style={styles.topCardIcon}>
                <MaterialIcons name="schedule" size={32} color="#E0E0E0" />
              </View>
            </View>

            {/* Current Pin Card */}
            <View style={styles.topCard}>
              <Text style={styles.topCardLabel}>Current Pin</Text>
              <Text style={styles.topCardValue}>{currentPin?.name || 'None'}</Text>
              <Text style={styles.topCardSubtext}>
                {currentPin ? `Earned at ${currentPin.hours_required} hrs` : 'Keep going!'}
              </Text>
              <View style={styles.topCardIcon}>
                <MaterialIcons name="emoji-events" size={32} color="#FFD700" />
              </View>
            </View>
          </View>

          {/* Quick Actions Section */}
          <View style={styles.quickActionsContainer}>
            {quickActionsData.map(renderQuickAction)}
          </View>

          
          {/* Pin Milestones Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="emoji-events" size={20} color={COLORS.text.primary} />
              <Text style={styles.sectionTitle}>Pin Milestones</Text>
            </View>
            <View style={styles.milestonesGrid}>
              {milestones.length > 0 ? (
                milestones.map(renderMilestone)
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="emoji-events" size={48} color={COLORS.text.light} />
                  <Text style={styles.emptyText}>No milestones available</Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress to Next Pin */}
          {progressData && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progress to {progressData.nextPinName}</Text>
                <Text style={styles.progressPercentage}>{Math.round(progressData.percentage)}%</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressData.percentage}%` }
                    ]}
                  />
                </View>
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>{progressData.currentHours} hrs</Text>
                <Text style={styles.progressLabel}>{progressData.nextHours} hrs</Text>
              </View>
            </View>
          )}

          {/* Resources Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="link" size={20} color={COLORS.text.primary} />
              <Text style={styles.sectionTitle}>Additional Resources</Text>
            </View>
            {resources.length > 0 ? (
              resources.map(renderResource)
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="library-books" size={48} color={COLORS.text.light} />
                <Text style={styles.emptyText}>No resources available</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollableScreenWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    marginTop: HEADER_HEIGHT,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: FONTS.sizes.regular,
    color: COLORS.text.secondary,
    fontFamily: FONTS.fontFamily,
  },
  topCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  topCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.small,
    position: 'relative',
    overflow: 'hidden',
  },
  topCardLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text.secondary,
    fontFamily: FONTS.fontFamily,
    marginBottom: 8,
  },
  topCardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    fontFamily: FONTS.fontFamily,
    marginBottom: 4,
  },
  topCardSubtext: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text.secondary,
    fontFamily: FONTS.fontFamily,
  },
  topCardIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    opacity: 0.4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  quickActionIconContainer: {
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: FONTS.sizes.small,
    fontWeight: '600',
    color: COLORS.white,
    fontFamily: FONTS.fontFamily,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    ...SHADOWS.small,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: FONTS.sizes.medium,
    fontWeight: '600',
    color: COLORS.text.primary,
    fontFamily: FONTS.fontFamily,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: FONTS.fontFamily,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text.secondary,
    fontFamily: FONTS.fontFamily,
  },
  section: {
    marginTop: 12,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    fontFamily: FONTS.fontFamily,
  },
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
  },
  milestoneCard: {
    width: '18%',
    minWidth: 70,
    aspectRatio: 1,
    backgroundColor: '#F5E6D3',
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#D4A574',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    ...SHADOWS.small,
  },
  milestoneCardAchieved: {
    backgroundColor: '#4CAF50',
    borderColor: '#388E3C',
  },
  milestoneCardInProgress: {
    backgroundColor: '#FFE082',
    borderColor: '#FFA726',
  },
  milestoneCardLocked: {
    backgroundColor: '#E0E0E0',
    borderColor: '#BDBDBD',
  },
  milestoneCheckmark: {
    marginBottom: 4,
  },
  milestoneProgressText: {
    fontSize: 20,
    marginTop: 5,
    fontWeight: 'bold',
    color: '#F57C00',
    fontFamily: FONTS.fontFamily,
    marginBottom: 5,
  },
  milestoneLockedProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    fontFamily: FONTS.fontFamily,
    marginTop: 2,
  },
  milestoneNextText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    fontFamily: FONTS.fontFamily,
    marginBottom: 4,
  },
  milestoneLockIcon: {
    marginBottom: 2,
  },
  milestoneLevelText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: FONTS.fontFamily,
  },
  milestoneLevelTextAchieved: {
    color: '#FFFFFF',
  },
  milestoneLevelTextInProgress: {
    color: '#8D6E63',
  },
  milestoneLevelTextLocked: {
    color: '#9E9E9E',
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  resourceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resourceTextContainer: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: FONTS.sizes.medium,
    fontWeight: '600',
    color: COLORS.text.primary,
    fontFamily: FONTS.fontFamily,
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text.secondary,
    fontFamily: FONTS.fontFamily,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: FONTS.sizes.regular,
    color: COLORS.text.light,
    marginTop: 12,
    fontFamily: FONTS.fontFamily,
  },
});

export default VolunteerScreen;
