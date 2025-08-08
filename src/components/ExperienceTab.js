import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ExperienceTab = React.memo(({ 
  experiencedCourses = [], 
  helpNeededCourses = [],
  isCurrentUser = false,
  onRemoveExperience,
  onRemoveHelp,
  onCoursePress,
  onAddExperience,
  onAddHelp
}) => {

  const renderCourseItem = useCallback(({ item, type }) => {
    // Handle both flat and nested course data structures
    const course = item.course || item;
    const courseName = course.name || 'Unknown Course';
    
    return (
      <TouchableOpacity
        style={styles.courseItem}
        onPress={() => onCoursePress && onCoursePress(course)}
      >
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{courseName}</Text>
          {item.date_added && (
            <Text style={styles.dateAdded}>
              Added {new Date(item.date_added).toLocaleDateString()}
            </Text>
          )}
          {item.created_at && !item.date_added && (
            <Text style={styles.dateAdded}>
              Added {new Date(item.created_at).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        {isCurrentUser && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => 
              type === 'experience' 
                ? onRemoveExperience(item.id)
                : onRemoveHelp(item.id)
            }
          >
            <MaterialIcons name="close" size={20} color="#dc2626" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }, [isCurrentUser, onRemoveExperience, onRemoveHelp, onCoursePress]);

  const renderScrollableSection = useCallback((title, data, type, emptyMessage, iconName, iconColor, onAddPress) => (
    <View style={styles.scrollSection}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <MaterialIcons name={iconName} size={24} color={iconColor} />
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>({data.length})</Text>
        </View>
        {isCurrentUser && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: iconColor }]}
            onPress={onAddPress}
          >
            <MaterialIcons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.cardContainer}>
        {data.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name={iconName} size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.verticalScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {data.map((item, index) => (
              <View key={`${type}-${item.id}`} style={styles.courseCard}>
                {renderCourseItem({ item, type })}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  ), [renderCourseItem, isCurrentUser]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {renderScrollableSection(
          'Courses I Can Help With',
          experiencedCourses,
          'experience',
          isCurrentUser 
            ? 'No courses added yet. Add courses you have experience with to help other students!'
            : 'This user hasn\'t added any courses they can help with yet.',
          'check-circle',
          '#059669',
          () => onAddExperience && onAddExperience()
        )}
        
        {renderScrollableSection(
          'Courses I Need Help With',
          helpNeededCourses,
          'help',
          isCurrentUser
            ? 'No courses added yet. Add courses you need help with to find study partners!'
            : 'This user hasn\'t added any courses they need help with yet.',
          'help',
          '#dc2626',
          () => onAddHelp && onAddHelp()
        )}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff00',
    marginBottom: 70,
    borderRadius: 12,
  },
  content: {
    padding: 16,
  },
  scrollSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  sectionCount: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    marginRight: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    maxHeight: 250,
    minHeight: 200,
  },
  verticalScroll: {
    flex: 1,
  },
  courseCard: {
    marginBottom: 12,
  },
  courseItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  dateAdded: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 6,
    borderRadius: 15,
    backgroundColor: '#fef2f2',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});

export default ExperienceTab;
