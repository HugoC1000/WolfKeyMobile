import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../api/config';
import { debounce } from 'lodash';
import Course from '../models/Course';

const CourseSelector = React.memo(({ 
  isVisible, 
  onClose, 
  onCourseSelect, 
  selectedCourses = [] 
}) => {
  const [courseQuery, setCourseQuery] = useState('');
  const [courses, setCourses] = useState([]);
  const [internalSelectedCourses, setInternalSelectedCourses] = useState(selectedCourses);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(2);
  const bottomSheetRef = useRef(null);

  // Memoize selectedCourses to prevent unnecessary updates
  const memoizedSelectedCourses = useMemo(() => selectedCourses, [
    selectedCourses.length,
    selectedCourses.map(course => course.id).join(',')
  ]);

  // Update internal selected courses when prop changes
  useEffect(() => {
    setInternalSelectedCourses(memoizedSelectedCourses);
  }, [memoizedSelectedCourses]);

  const snapPoints = useMemo(() => ['30%', '50%', '75%'], []);

  const handleSheetChanges = useCallback((index) => {
    setCurrentSnapIndex(index);
  }, []);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      try {
        const response = await api.get(`courses/?q=${query}`);
        // Convert API response to Course instances
        const courseInstances = Course.fromAPIArray(response.data);
        setCourses(courseInstances);
      } catch (error) {
        console.error('Error searching courses:', error);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (courseQuery) {
      debouncedSearch(courseQuery);
    } else {
      setCourses([]);
    }
    return () => debouncedSearch.cancel();
  }, [courseQuery]);

  useEffect(() => {
    if (isVisible) {
      // Force sync internal state with current prop when opening
      setInternalSelectedCourses(selectedCourses);
      setCurrentSnapIndex(1);
      const frameId = requestAnimationFrame(() => {
        bottomSheetRef.current?.snapToIndex(1);
      });
      return () => cancelAnimationFrame(frameId);
    }

    bottomSheetRef.current?.close();
    return undefined;
  }, [isVisible, selectedCourses]);

  const handleSelectCourse = useCallback((course) => {
    const isAlreadySelected = internalSelectedCourses.find(c => 
      course instanceof Course ? course.equals(c) : c.id === course.id
    );
    
    let updatedCourses;
    if (isAlreadySelected) {
      // Remove if already selected
      updatedCourses = internalSelectedCourses.filter(c => 
        course instanceof Course ? !course.equals(c) : c.id !== course.id
      );
    } else {
      // Add if not selected
      updatedCourses = [...internalSelectedCourses, course];
    }
    
    setInternalSelectedCourses(updatedCourses);
    setCourseQuery('');
    onCourseSelect(updatedCourses);
  }, [internalSelectedCourses, onCourseSelect]);

  const removeCourse = useCallback((courseToRemove) => {
    const updatedCourses = internalSelectedCourses.filter(c => !courseToRemove.equals(c));   
    setInternalSelectedCourses(updatedCourses);
    onCourseSelect(updatedCourses);
  }, [internalSelectedCourses, onCourseSelect]);

  const handleDone = () => {
    onCourseSelect(internalSelectedCourses);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={currentSnapIndex}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={false}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Select Courses</Text>
            {internalSelectedCourses.length > 0 && (
              <Text style={styles.selectedCount}>
                {internalSelectedCourses.length} selected
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Content - hide when minimized */}
        {currentSnapIndex > 0 && (
          <>
            {/* Search Bar */}
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

            {/* Selected Courses Chips */}
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

            {/* Results List - Independently Scrollable */}
            <BottomSheetFlatList
              data={courseQuery.length > 0 ? courses : []}
              keyExtractor={(item) => item.id.toString()}
              style={styles.results}
              contentContainerStyle={styles.resultsContent}
              renderItem={({ item: course }) => {
                const isSelected = internalSelectedCourses.find(c => c.id === course.id);
                return (
                  <TouchableOpacity
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
              }}
              ListEmptyComponent={() => (
                <View style={styles.noCourses}>
                  <Text style={styles.noCoursesText}>
                    {courseQuery.length > 0 ? 'No courses found' : 'Start typing to search courses'}
                  </Text>
                </View>
              )}
            />

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.doneButton}
                onPress={handleDone}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handleIndicator: {
    backgroundColor: '#ddd',
    width: 40,
    height: 4,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 30,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1b',
    marginBottom: 2,
  },
  selectedCount: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  expandHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    paddingRight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 8,
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
  results: {
    flex: 1,
    minHeight: 100,
    maxHeight: 300,
  },
  resultsContent: {
    paddingBottom: 10, // Space for the footer
  },
  courseItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    color: '#666',
    fontSize: 12,
  },
  noCourses: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCoursesText: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 4,
    borderColor: '#bbbbbb',
    borderWidth: 1,
  },
  chipText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  chipRemove: {
    marginLeft: 8,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  doneButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CourseSelector;
