import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Modal,
  AppState,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { scheduleService } from '../api/scheduleService';
import { useUser } from '../context/userContext';
import { useFocusEffect } from '@react-navigation/native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const Schedule = () => {
  const { user } = useUser();
  const scrollViewRef = useRef(null);
  const [currentDayOffset, setCurrentDayOffset] = useState(() => {
    // If today is Saturday (6) or Sunday (0), offset to next Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0) return 1; // Sunday -> Monday
    if (dayOfWeek === 6) return 2; // Saturday -> Monday
    return 0; // Weekday -> show today
  });
  const [scheduleCache, setScheduleCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const modalOpenRef = useRef(false);
  const initialScrollSet = useRef(false);
  const baseDate = useRef(new Date());
  const lastFetchDate = useRef(new Date().toDateString());
  const isFetching = useRef({});
  const initialLoadDone = useRef(false);

  const recenterScroll = useCallback(() => {
    scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
  }, []);

  const closeCalendar = useCallback((shouldRecenter = true) => {
    modalOpenRef.current = false;
    setShowCalendar(false);
    if (shouldRecenter) {
      setTimeout(recenterScroll, 50);
    }
  }, [recenterScroll]);

  const openCalendar = useCallback(() => {
    modalOpenRef.current = true;
    setShowCalendar(true);
  }, []);

  const getDateForOffset = (offset) => {
    const date = new Date(baseDate.current);
    date.setDate(date.getDate() + offset);
    return date;
  };

  const formatDate = (date) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const transformScheduleData = (scheduleArray) => {
    if (!scheduleArray || !Array.isArray(scheduleArray)) {
      return [{ block: 'No School Today', time: null }];
    }
    if (scheduleArray.length > 0 && typeof scheduleArray[0] === 'string') {
      return scheduleArray.map(item => ({ block: item, time: null }));
    }
    return scheduleArray;
  };

  const fetchScheduleForOffset = async (offset) => {
    // Prevent duplicate fetches
    if (isFetching.current[offset]) {
      return;
    }

    // Check if already cached
    if (scheduleCache[offset]) {
      return;
    }

    isFetching.current[offset] = true;

    try {
      if (!user?.id) {
        const schedule = {
          blocks: [{ block: 'Please log in to view schedule', time: null }],
          uniformRequired: false,
        };
        setScheduleCache(prev => ({ ...prev, [offset]: schedule }));
        isFetching.current[offset] = false;
        return;
      }

      const date = getDateForOffset(offset);
      const dateString = formatDate(date);
      // Create ISO date string in local timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;

      const [scheduleData, uniformData] = await Promise.all([
        scheduleService.getProcessedSchedule(user.id, isoDate),
        scheduleService.getCeremonialUniform(isoDate).catch(() => false),
      ]);

      const schedule = {
        blocks: transformScheduleData(scheduleData.schedule),
        uniformRequired: uniformData,
        earlyDismissal: scheduleData?.early_dismissal || false,
        lateStart: scheduleData?.late_start || false,
      };

      setScheduleCache(prev => ({ ...prev, [offset]: schedule }));
    } catch (error) {
      console.error('Schedule fetch failed:', error);
      const schedule = {
        blocks: [{ block: 'Error loading schedule', time: null }],
        uniformRequired: false,
      };
      setScheduleCache(prev => ({ ...prev, [offset]: schedule }));
    } finally {
      isFetching.current[offset] = false;
    }
  };

  useEffect(() => {
    const loadInitialSchedules = async () => {
      setLoading(true);
      await Promise.all([
        fetchScheduleForOffset(currentDayOffset - 1),
        fetchScheduleForOffset(currentDayOffset),
        fetchScheduleForOffset(currentDayOffset + 1),
      ]);
      setLoading(false);
      initialLoadDone.current = true;
    };

    loadInitialSchedules();
  }, []);

  useEffect(() => {
    if (!showCalendar) {
      return undefined;
    }
    const timeoutId = setTimeout(recenterScroll, 0);
    return () => clearTimeout(timeoutId);
  }, [showCalendar, recenterScroll]);

  // Reset scroll position when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (modalOpenRef.current) {
        return () => {};
      }
      const timeoutId = setTimeout(recenterScroll, 100);
      return () => clearTimeout(timeoutId);
    }, [recenterScroll])
  );

  useEffect(() => {
    // Only preload if initial load is done
    if (initialLoadDone.current) {
      fetchScheduleForOffset(currentDayOffset - 1);
      fetchScheduleForOffset(currentDayOffset);
      fetchScheduleForOffset(currentDayOffset + 1);
    }
  }, [currentDayOffset]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        const currentDate = new Date().toDateString();
        if (currentDate !== lastFetchDate.current) {
          console.log('Date changed, resetting to today...');
          baseDate.current = new Date();
          lastFetchDate.current = currentDate;
          setCurrentDayOffset(0);
          setScheduleCache({});
          isFetching.current = {};
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const handleScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const deltaFromCenter = offsetX - SCREEN_WIDTH;
    const threshold = SCREEN_WIDTH / 3;

    if (deltaFromCenter <= -threshold) {
      // Swiped left to previous day
      setCurrentDayOffset(prev => prev - 1);
      recenterScroll();
    } else if (deltaFromCenter >= threshold) {
      // Swiped right to next day
      setCurrentDayOffset(prev => prev + 1);
      recenterScroll();
    } else if (Math.abs(deltaFromCenter) > 1) {
      // Minor movement; snap back to center if user didn't cross the threshold
      recenterScroll();
    }
  };

  const handleDateSelect = (day) => {
    const selectedDate = new Date(day.year, day.month - 1, day.day, 0, 0, 0, 0);
    const today = new Date(baseDate.current);
    today.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.round((selectedDate - today) / (1000 * 60 * 60 * 24));
    closeCalendar(false);

    if (daysDiff !== currentDayOffset) {
      setCurrentDayOffset(daysDiff);
    }

    setTimeout(recenterScroll, 50);
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 32 }} />;
  }

  const renderSchedulePage = (offset) => {
    const schedule = scheduleCache[offset] || {
      blocks: [{ block: 'Loading...', time: null }],
      uniformRequired: false,
      earlyDismissal: false,
      lateStart: false,
    };

    const date = getDateForOffset(offset);
    const isToday = date.toDateString() === new Date().toDateString();
    const dateLabel = isToday ? 'Today' : formatDate(date);

    return (
      <View style={styles.schedulePage}>
        <View style={styles.headerContainer}>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          <TouchableOpacity onPress={openCalendar} style={styles.calendarButton}>
            <MaterialIcons name="calendar-today" size={18} color="#6366F1" />
          </TouchableOpacity>
        </View>
        {(schedule.uniformRequired || schedule.lateStart || schedule.earlyDismissal) && (
          <View style={styles.pillsContainer}>
            {schedule.uniformRequired && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>👔 Uniform</Text>
              </View>
            )}
            {schedule.lateStart && (
              <View style={[styles.pill, styles.pillBlue]}>
                <Text style={[styles.pillText, styles.pillTextBlue]}>☕ Late Start</Text>
              </View>
            )}
            {schedule.earlyDismissal && (
              <View style={[styles.pill, styles.pillGreen]}>
                <Text style={[styles.pillText, styles.pillTextGreen]}>⏰ Early Dismissal</Text>
              </View>
            )}
          </View>
        )}
        {schedule.blocks.map((block, index) => (
          <View key={index} style={styles.blockContainer}>
            <Text style={styles.blockName}>{block.block}</Text>
            <Text style={styles.blockTime}>{block.time}</Text>
          </View>
        ))}
      </View>
    );
  };

  const currentDate = getDateForOffset(currentDayOffset);

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <TouchableOpacity 
          style={styles.leftArrow} 
          onPress={() => {
            setCurrentDayOffset(prev => prev - 1);
            recenterScroll();
          }}
        >
          <MaterialIcons name="chevron-left" size={28} color="#6366F1" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.rightArrow} 
          onPress={() => {
            setCurrentDayOffset(prev => prev + 1);
            recenterScroll();
          }}
        >
          <MaterialIcons name="chevron-right" size={28} color="#6366F1" />
        </TouchableOpacity>
        
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          onLayout={() => {
            if (!initialScrollSet.current) {
              initialScrollSet.current = true;
              recenterScroll();
            }
          }}
        >
          <View style={[{ width: SCREEN_WIDTH - 40, marginLeft: 20 }]}>
            {renderSchedulePage(currentDayOffset - 1)}
          </View>
          
          <View style={[{ width: SCREEN_WIDTH - 40, marginLeft: 20 }]}>
            {renderSchedulePage(currentDayOffset)}
          </View>
          
          <View style={[{ width: SCREEN_WIDTH - 40, marginLeft: 20 }]}>
            {renderSchedulePage(currentDayOffset + 1)}
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={closeCalendar}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => closeCalendar()}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => closeCalendar()}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <Calendar
                current={currentDate.toISOString().split('T')[0]}
                onDayPress={handleDateSelect}
                markedDates={{
                  [currentDate.toISOString().split('T')[0]]: {
                    selected: true,
                    selectedColor: '#6366F1',
                  },
                }}
                theme={{
                  todayTextColor: '#6366F1',
                  selectedDayBackgroundColor: '#6366F1',
                  selectedDayTextColor: '#ffffff',
                  arrowColor: '#6366F1',
                  monthTextColor: '#111827',
                  textMonthFontWeight: '600',
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 12,
                }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardContainer: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 100,
    elevation: 5,
    backgroundColor: 'white',
    overflow: 'visible',
    marginVertical: 5,
    position: 'relative',
  },
  leftArrow: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.0)',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: 8,
    paddingRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rightArrow: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.0)',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    paddingVertical: 8,
    paddingLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    flexGrow: 1,
  },
  schedulePage: {
    width: SCREEN_WIDTH - 40,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  calendarButton: {
    padding: 2,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 0,
  },
  pill: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pillText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  pillBlue: {
    backgroundColor: '#17a2b8',
  },
  pillTextBlue: {
    color: 'white',
  },
  pillGreen: {
    backgroundColor: '#ffd807',
  },
  pillTextGreen: {
    color: 'black',
  },
  dateDisplayContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateDisplayText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  dateDisplayContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateDisplayText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  blockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  blockName: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  blockTime: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'right',
    minWidth: 110,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
});

export default Schedule;