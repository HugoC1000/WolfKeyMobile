import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated } from 'react-native';
import api from '../api/config';
import { debounce } from 'lodash';

const CourseSelector = React.memo(({ onCourseSelect, selectedCourses = [] }) => {
  const [courseQuery, setCourseQuery] = useState('');
  const [courses, setCourses] = useState([]);
  const [internalSelectedCourses, setInternalSelectedCourses] = useState(selectedCourses);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Memoize selectedCourses to prevent unnecessary updates
  const memoizedSelectedCourses = useMemo(() => selectedCourses, [
    selectedCourses.length,
    selectedCourses.map(course => course.id).join(',')
  ]);

  // Update internal selected courses when prop changes
  useEffect(() => {
    setInternalSelectedCourses(memoizedSelectedCourses);
  }, [memoizedSelectedCourses]);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      try {
        const response = await api.get(`courses/?q=${query}`);
        setCourses(response.data);
      } catch (error) {
        console.error('Error searching courses:', error);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (courseQuery) {
      debouncedSearch(courseQuery);
      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      setCourses([]);
      // Animate out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
    return () => debouncedSearch.cancel();
  }, [courseQuery]);

  const handleSelectCourse = useCallback((course) => {
    const isAlreadySelected = internalSelectedCourses.find(c => c.id === course.id);
    
    let updatedCourses;
    if (isAlreadySelected) {
      // Remove if already selected
      updatedCourses = internalSelectedCourses.filter(c => c.id !== course.id);
    } else {
      // Add if not selected
      updatedCourses = [...internalSelectedCourses, course];
    }
    
    setInternalSelectedCourses(updatedCourses);
    setCourseQuery('');
    onCourseSelect(updatedCourses);
  }, [internalSelectedCourses, onCourseSelect]);

  const removeCourse = useCallback((courseToRemove) => {
    const updatedCourses = internalSelectedCourses.filter(c => c.id !== courseToRemove.id);
    setInternalSelectedCourses(updatedCourses);
    onCourseSelect(updatedCourses);
  }, [internalSelectedCourses, onCourseSelect]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search courses..."
          value={courseQuery}
          onChangeText={setCourseQuery}
        />
        {courseQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setCourseQuery('')}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      

      
      {courseQuery && (
        <Animated.View style={[styles.resultsWrapper, { opacity: fadeAnim }]}>
          <ScrollView 
            style={styles.results}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{borderRadius: 999}}
          >
            {courses.length > 0 ? (
              courses.map(course => {
                const isSelected = internalSelectedCourses.find(c => c.id === course.id);
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={[styles.courseItem, isSelected && styles.courseItemSelected]}
                    onPress={() => handleSelectCourse(course)}
                  >
                    <Text style={[styles.courseName, isSelected && styles.courseNameSelected]}>
                      {course.name} {isSelected ? '✓' : ''}
                    </Text>
                    <Text style={styles.experienceCount}>
                      {course.experienced_count} students experienced
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noCourses}>
                <Text style={styles.noCoursesText}>No courses found</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}

      {internalSelectedCourses.length > 0 && (
        <View style={styles.chipsContainer}>
          {internalSelectedCourses.map(course => (
            <View key={course.id} style={styles.chip}>
              <Text style={styles.chipText}>{course.name}</Text>
              <TouchableOpacity onPress={() => removeCourse(course)} style={styles.chipRemove}>
                <Text style={styles.chipRemoveText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    paddingRight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -10 }],
    backgroundColor: '#E5E7EB',
    borderRadius: 15,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultsWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 50,
    zIndex: 1000,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  results: {
    flex: 1,
  },
  courseItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 8,
  },
  courseItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  courseNameSelected: {
    color: '#4CAF50',
  },
  experienceCount: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 4,
  },
  noCourses: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCoursesText: {
    color: '#6B7280',
    fontSize: 16,
    fontStyle: 'italic',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 4,
    borderColor: '#383838',
    borderWidth: 2,
  },
  chipText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  chipRemove: {
    marginLeft: 6,
    backgroundColor: '#ff0000ff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CourseSelector;
