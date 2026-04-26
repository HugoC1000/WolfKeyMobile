import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/userContext';

const CourseComparisonCard = ({ viewedProfile, currentProfile, isCurrentUser }) => {
  const { user } = useUser();
  const [selectedDay, setSelectedDay] = useState('day1');

  if (isCurrentUser || !viewedProfile) {
    return null;
  }

  const getCourseNameFromBlock = (courseData) => {
    if (!courseData) return null;
    if (typeof courseData === 'string') return courseData;
    return courseData.name || courseData.course_name || null;
  };

  const getCurrentUserBlocks = (day) => {
    const localProfile = currentProfile || user;
    const blocks = localProfile?.userprofile?.schedule_blocks || {};
    const dayPrefix = day === 'day1' ? '_1' : '_2'; // Look for "_1A", "_1B" or "_2A", "_2B"
    
    return Object.entries(blocks)
      .filter(([blockKey]) => blockKey.toString().includes(dayPrefix))
      .map(([blockKey, courseData], idx) => {
        const blockLabel = blockKey.toString().toUpperCase().split('_')[1] || blockKey; // Extract "A" from "block_1A"
        return {
          id: `current-${blockKey}-${idx}`,
          blockKey: blockLabel,
          blockLabel,
          course: getCourseNameFromBlock(courseData),
        };
      });
  };

  const getViewedUserBlocks = (day) => {
    const blocks = viewedProfile?.userprofile?.schedule_blocks || {};
    const dayPrefix = day === 'day1' ? '_1' : '_2'; // Look for "_1A", "_1B" or "_2A", "_2B"
    
    return Object.entries(blocks)
      .filter(([blockKey]) => blockKey.toString().includes(dayPrefix))
      .map(([blockKey, courseData], idx) => {
        const blockLabel = blockKey.toString().toUpperCase().split('_')[1] || blockKey; // Extract "A" from "block_1A"
        return {
          id: `viewed-${blockKey}-${idx}`,
          blockKey: blockLabel,
          blockLabel,
          course: getCourseNameFromBlock(courseData),
        };
      });
  };

  const currentUserBlocks = getCurrentUserBlocks(selectedDay);
  const viewedUserBlocks = getViewedUserBlocks(selectedDay);
  
  // Get max blocks for alignment
  const maxBlocks = Math.max(
    currentUserBlocks.length,
    viewedUserBlocks.length
  );

  if (maxBlocks === 0) {
    return null;
  }

  const hue = Number.isFinite(viewedProfile?.userprofile?.background_hue)
    ? viewedProfile.userprofile.background_hue
    : 220;
  const normalizedHue = ((hue % 360) + 360) % 360;
  const secondHue = (normalizedHue + 10) % 360;
  const thirdHue = (normalizedHue + 18) % 360;
  const fourthHue = (normalizedHue + 42) % 360;

  const lightGradientColors = [
    `hsla(${normalizedHue}, 100%, 65%, 0.5)`,
    `hsla(${secondHue}, 80%, 60%, 0.45)`,
    `hsla(${thirdHue}, 100%, 60%, 0.4)`,
    `hsla(${fourthHue}, 70%, 50%, 0.35)`,
  ];

  const containerContent = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Compare Schedule</Text>
        <View style={styles.dayToggle}>
          <TouchableOpacity
            style={[
              styles.dayButton,
              selectedDay === 'day1' && styles.dayButtonActive,
            ]}
            onPress={() => setSelectedDay('day1')}
          >
            <Text
              style={[
                styles.dayButtonText,
                selectedDay === 'day1' && styles.dayButtonTextActive,
              ]}
            >
              Day 1
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dayButton,
              selectedDay === 'day2' && styles.dayButtonActive,
            ]}
            onPress={() => setSelectedDay('day2')}
          >
            <Text
              style={[
                styles.dayButtonText,
                selectedDay === 'day2' && styles.dayButtonTextActive,
              ]}
            >
              Day 2
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.comparisonContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.comparisonHeaderLeft}>You</Text>
          <Text style={styles.comparisonHeaderRight}>Them</Text>
        </View>

        <View style={styles.coursesColumn}>
          {Array.from({ length: maxBlocks }).map((_, idx) => {
            const currentUserBlock = currentUserBlocks[idx];
            const viewedUserBlock = viewedUserBlocks[idx];
            const blockLabel =
              currentUserBlock?.blockLabel || viewedUserBlock?.blockLabel || '-';
            const isMatch =
              currentUserBlock &&
              viewedUserBlock &&
              viewedUserBlock.course &&
              currentUserBlock.course &&
              currentUserBlock.course.toLowerCase().trim() ===
                viewedUserBlock.course.toLowerCase().trim();

            return (
              <View
                key={`row-${selectedDay}-${currentUserBlock?.id || viewedUserBlock?.id || idx}`}
                style={styles.blockComparisonRow}
              >
                <View
                  style={[
                    styles.courseCard,
                    isMatch && styles.courseCardMatched,
                  ]}
                >
                  <Text style={styles.courseText} numberOfLines={2}>
                    {currentUserBlock?.course || 'Free'}
                  </Text>
                </View>

                <View style={styles.blockLabelContainer}>
                  <Text style={styles.blockLabel}>{blockLabel}</Text>
                </View>

                <View
                  style={[
                    styles.courseCard,
                    isMatch && styles.courseCardMatched,
                  ]}
                >
                  <Text style={styles.courseText} numberOfLines={2}>
                    {viewedUserBlock?.course || 'Free'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </>
  );

  return (
    <LinearGradient
      colors={lightGradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {containerContent}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 38,
    marginTop: -65,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 5,
    backgroundColor: 'rgba(3, 12, 29, 0.6)',
  },
  content: {
    paddingTop: 74,
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
  },
  dayToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.4)',
    borderColor: 'rgba(37, 99, 235, 0.7)',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(226, 232, 240, 0.7)',
  },
  dayButtonTextActive: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  comparisonContainer: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  comparisonHeaderLeft: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(226, 232, 240, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonHeaderBlock: {
    width: 32,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(226, 232, 240, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonHeaderRight: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(226, 232, 240, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coursesColumn: {
    gap: 6,
  },
  blockComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockLabelContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
  },
  courseCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: 8,
    minHeight: 35,
    justifyContent: 'center',
  },
  courseCardMatched: {
    backgroundColor: 'rgba(56, 177, 100, 0.79)',
  },
  courseText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 14,
  },
  matchIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#86efac',
  },
});

export default CourseComparisonCard;
