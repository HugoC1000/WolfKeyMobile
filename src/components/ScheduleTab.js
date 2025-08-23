import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BLOCKS = ['1A', '1B', '1D', '1E', '2A', '2B', '2C', '2D', '2E'];

const ScheduleTab = ({ 
  schedule, 
  isCurrentUser = false, 
  onCoursePress,
  onAddExperience,
  onAddHelp,
  experiencedCourses = [],
  helpNeededCourses = [],
  onAutoComplete,
  autoCompleteLoading = false
}) => {
  // Memoize the block schedule to prevent recreation on every render
  const blockSchedule = useMemo(() => {
    const scheduleMap = {};
    BLOCKS.forEach(block => {
      const blockKey = `block_${block}`;
      scheduleMap[block] = schedule[blockKey] || null;
    });
    console.log("Schedule map: ", scheduleMap);
    return scheduleMap;
  }, [schedule]);

  const renderCourseActions = useCallback((course, block) => {
    if (!isCurrentUser || !course) return null;

    const isExperienced = experiencedCourses.some(exp => {
      const courseId = exp.course_id || exp.course?.id;
      return courseId === course.id;
    });
    
    const needsHelp = helpNeededCourses.some(help => {
      const courseId = help.course_id || help.course?.id;
      return courseId === course.id;
    });

    if (isExperienced || needsHelp) return null;

    return (
      <View style={styles.courseActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.experienceButton]}
          onPress={() => onAddExperience(course.id)}
        >
          <Text style={styles.actionButtonText}>Proficient</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.helpButton]}
          onPress={() => onAddHelp(course.id)}
        >
          <Text style={styles.actionButtonText}>Need Help</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isCurrentUser, experiencedCourses, helpNeededCourses, onAddExperience, onAddHelp]);

  const renderCourseCard = useCallback((course, block) => {
    if (!course) {
      return (
        <View style={[styles.courseCard, styles.emptyCourseCard]}>
          <Text style={styles.emptyText}>No course selected</Text>
          {isCurrentUser && (
            <TouchableOpacity
              style={styles.addCourseButton}
              onPress={() => onCoursePress(block)}
            >
              <MaterialIcons name="add" size={20} color="#2563eb" />
              <Text style={styles.addCourseText}>Add Course</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.courseCard}>
        <View style={styles.courseHeader}>
          <Text style={styles.courseName}>{course.name || 'Unknown'}</Text>
          {isCurrentUser && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onCoursePress(course, block)}
            >
              <MaterialIcons name="edit" size={16} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        {renderCourseActions(course, block)}
      </View>
    );
  }, [renderCourseActions, isCurrentUser, onCoursePress]);

  const renderBlockRow = useCallback((period1Block, period2Block) => (
    <View key={`${period1Block}-${period2Block || 'empty'}`} style={styles.blockRow}>
      {/* Day 1*/}
      <View style={styles.blockColumn}>
        {period1Block ? (
          <View style={styles.courseContainer}>
            <Text style={styles.blockHeader}>Block {period1Block}</Text>
            {renderCourseCard(blockSchedule[period1Block], period1Block)}
          </View>
        ) : (
          <View style={styles.emptyBlock} />
        )}
      </View>
      
      {/* Day 2*/}
      <View style={styles.blockColumn}>
        {period2Block ? (
          <View style={styles.courseContainer}>
            <Text style={styles.blockHeader}>Block {period2Block}</Text>
            {renderCourseCard(blockSchedule[period2Block], period2Block)}
          </View>
        ) : (
          <View style={styles.emptyBlock} />
        )}
      </View>
    </View>
  ), [blockSchedule, renderCourseCard]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Auto Complete Button */}
        {isCurrentUser && (
          <View style={styles.autoCompleteContainer}>
            <TouchableOpacity
              style={[styles.autoCompleteButton, autoCompleteLoading && styles.autoCompleteButtonDisabled]}
              onPress={onAutoComplete}
              disabled={autoCompleteLoading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#294ff8ff", "#8230d5ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.autoCompleteGradient}
              />

              <View style={styles.autoCompleteButtonContent}>
                {autoCompleteLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialIcons name="auto-fix-high" size={20} color="white" />
                )}
                <Text style={styles.autoCompleteButtonText}>
                  Auto-Complete from WolfNet
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerColumn}>
            <Text style={styles.columnHeader}>Day 1</Text>
          </View>
          <View style={styles.headerColumn}>
            <Text style={styles.columnHeader}>Day 2</Text>
          </View>
        </View>
        
        {/* Block Rows */}
        {renderBlockRow('1A', '2A')}
        {renderBlockRow('1B', '2B')}
        {renderBlockRow('1D', '2C')}
        {renderBlockRow('1E', '2D')}
        {renderBlockRow(null, '2E')}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff00',
    borderRadius: 12,
    marginBottom: 70,
  },
  content: {
    padding: 16,
  },
  autoCompleteContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },

  autoCompleteButton: {
  position: 'relative',
  alignSelf: 'center',
  minWidth: 200,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 16,
  gap: 8,
  backgroundColor: 'transparent',
  overflow: 'hidden',
  },
  autoCompleteGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    zIndex: 1,
  },
  autoCompleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  autoCompleteIcon: {
    color: '#00c3ff',
    borderRadius: 50,
    padding: 2,
    fontSize: 22,
    marginRight: 8,
  },
  autoCompleteButtonDisabled: {
    backgroundColor: 'grey',
    opacity: 0.7,
  },
  autoCompleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  headerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  blockRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  blockColumn: {
    flex: 1,
  },
  emptyBlock: {
    height: 100,
  },
  courseContainer: {
    width: '100%',
    marginBottom: 4,
  },
  blockHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#393c43ff',
    marginBottom: 8,
    textAlign: 'center',
  },
  courseCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 40,
  },
  emptyCourseCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    backgroundColor: '#f9fafb',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    fontSize: 10,
  },
  blockLabel: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  courseName: {
    fontSize: 12,
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  courseCredits: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  courseActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flex: 0.48,
    justifyContent: 'center',
  },
  experienceButton: {
    backgroundColor: '#059669',
  },
  helpButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 8,
  },
  addCourseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCourseText: {
    color: '#2563eb',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '600',
  },
  editButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
});

export default ScheduleTab;
