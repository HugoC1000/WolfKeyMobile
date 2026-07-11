import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  AppState,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { scheduleService } from '../api/scheduleService';
import { useUser } from '../context/userContext';
import { useFocusEffect } from '@react-navigation/native';
import { triggerPressHaptic, triggerSelectionHaptic } from '../utils/haptics';

const getScheduleCacheKey = (userId) => `scheduleCache_${userId || 'guest'}`;
const MAX_PERSISTED_DAY_OFFSET = 7;
const getPersistableSchedules = (cache) => Object.fromEntries(
  Object.entries(cache).filter(([offset]) => Math.abs(Number(offset)) <= MAX_PERSISTED_DAY_OFFSET)
);
const formatLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Schedule = () => {
  const { user } = useUser();
  const scrollViewRef = useRef(null);
  const [pageWidth, setPageWidth] = useState(0);
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
  const persistenceTimer = useRef(null);
  const pendingRecenter = useRef(false);
  const pageHeights = useRef({});
  const animatedPageHeight = useRef(new Animated.Value(0)).current;
  const targetPageHeight = useRef(0);
  const [hasMeasuredCurrentPage, setHasMeasuredCurrentPage] = useState(false);

  const animateToPageHeight = useCallback((height, animated = true) => {
    if (!height) return;
    if (Math.abs(targetPageHeight.current - height) < 1) return;
    targetPageHeight.current = height;

    if (!hasMeasuredCurrentPage || !animated) {
      animatedPageHeight.setValue(height);
      setHasMeasuredCurrentPage(true);
      return;
    }

    Animated.timing(animatedPageHeight, {
      toValue: height,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [animatedPageHeight, hasMeasuredCurrentPage]);

  const handlePageLayout = useCallback((offset, height) => {
    pageHeights.current[offset] = height;
    if (offset === currentDayOffset) {
      animateToPageHeight(height);
    }
  }, [animateToPageHeight, currentDayOffset]);

  const persistScheduleCache = useCallback((nextCache) => {
    // Serializing and writing three prefetched days during a gesture can block the JS
    // thread. Coalesce those writes and let the swipe finish first.
    clearTimeout(persistenceTimer.current);
    persistenceTimer.current = setTimeout(async () => {
      try {
        const persistableCache = getPersistableSchedules(nextCache);
        await AsyncStorage.setItem(
          getScheduleCacheKey(user?.id),
          JSON.stringify(persistableCache)
        );
      } catch (error) {
        console.error('Failed to persist schedule cache:', error);
      }
    }, 250);
  }, [user?.id]);

  useEffect(() => () => clearTimeout(persistenceTimer.current), []);

  const hydrateScheduleCache = useCallback(async () => {
    try {
      const savedCache = await AsyncStorage.getItem(getScheduleCacheKey(user?.id));
      if (!savedCache) return;

      const parsedCache = JSON.parse(savedCache);
      if (parsedCache && typeof parsedCache === 'object') {
        const persistableCache = getPersistableSchedules(parsedCache);
        setScheduleCache(persistableCache);

        // Clean up entries written by older versions of the app.
        if (Object.keys(persistableCache).length !== Object.keys(parsedCache).length) {
          await AsyncStorage.setItem(
            getScheduleCacheKey(user?.id),
            JSON.stringify(persistableCache)
          );
        }
      }
    } catch (error) {
      console.error('Failed to load schedule cache:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    hydrateScheduleCache();
  }, [hydrateScheduleCache]);

  const recenterScroll = useCallback(() => {
    if (pageWidth > 0) {
      scrollViewRef.current?.scrollTo({ x: pageWidth, animated: false });
    }
  }, [pageWidth]);

  useLayoutEffect(() => {
    if (pageWidth > 0) recenterScroll();
  }, [pageWidth, recenterScroll]);

  useLayoutEffect(() => {
    if (!pendingRecenter.current) return;
    pendingRecenter.current = false;
    recenterScroll();
  }, [currentDayOffset, recenterScroll]);

  useEffect(() => {
    const measuredHeight = pageHeights.current[currentDayOffset];
    if (measuredHeight) {
      // Allow a previously visited page to animate back to its recorded height.
      targetPageHeight.current = 0;
      animateToPageHeight(measuredHeight);
    }
  }, [animateToPageHeight, currentDayOffset]);

  const navigateToOffset = useCallback((nextOffset) => {
    pendingRecenter.current = true;
    setCurrentDayOffset(nextOffset);
  }, []);

  const navigateBy = useCallback((delta) => {
    pendingRecenter.current = true;
    setCurrentDayOffset(previous => previous + delta);
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

  const fetchScheduleForOffset = async (offset, force = false) => {
    // Prevent duplicate fetches
    if (isFetching.current[offset]) {
      return;
    }

    const cachedSchedule = scheduleCache[offset];
    if (cachedSchedule && !force) return;

    isFetching.current[offset] = true;

    try {
      if (!user?.id) {
        const schedule = {
          blocks: [{ block: 'Please log in to view schedule', time: null }],
          uniformRequired: false,
        };
        setScheduleCache(prev => {
          const nextCache = { ...prev, [offset]: schedule };
          persistScheduleCache(nextCache);
          return nextCache;
        });
        isFetching.current[offset] = false;
        return;
      }

      const date = getDateForOffset(offset);
      const dateString = formatDate(date);
      const isoDate = formatLocalISODate(date);

      // Use new combined endpoint (single call instead of two)
      const combinedData = await scheduleService.getCombinedSchedule(user.id, isoDate);

      const schedule = {
        blocks: transformScheduleData(combinedData.processed_schedule),
        uniformRequired: combinedData.ceremonial_uniform_required || false,
        earlyDismissal: combinedData.early_dismissal || false,
        lateStart: combinedData.late_start || false,
      };

      setScheduleCache(prev => {
        const nextCache = { ...prev, [offset]: schedule };
        persistScheduleCache(nextCache);
        return nextCache;
      });
    } catch (error) {
      console.error('Schedule fetch failed:', error);
      if (!cachedSchedule) {
        const schedule = {
          blocks: [{ block: 'Error loading schedule', time: null }],
          uniformRequired: false,
        };
        setScheduleCache(prev => {
          const nextCache = { ...prev, [offset]: schedule };
          persistScheduleCache(nextCache);
          return nextCache;
        });
      }
    } finally {
      isFetching.current[offset] = false;
    }
  };

  useEffect(() => {
    const loadInitialSchedules = async () => {
      setLoading(true);
      // Load current day first
      await fetchScheduleForOffset(currentDayOffset);
      setLoading(false);
      initialLoadDone.current = true;
      
      // Preload adjacent days in background (don't wait for them)
      fetchScheduleForOffset(currentDayOffset - 1);
      fetchScheduleForOffset(currentDayOffset + 1);
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
          void AsyncStorage.removeItem(getScheduleCacheKey(user?.id));
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const handleScrollEnd = (event) => {
    if (!pageWidth) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const deltaFromCenter = offsetX - pageWidth;
    const threshold = pageWidth / 3;

    if (deltaFromCenter <= -threshold) {
      void triggerSelectionHaptic();
      navigateBy(-1);
    } else if (deltaFromCenter >= threshold) {
      void triggerSelectionHaptic();
      navigateBy(1);
    } else if (Math.abs(deltaFromCenter) > 1) {
      // Minor movement; snap back to center if user didn't cross the threshold
      recenterScroll();
    }
  };

  const handleScroll = (event) => {
    if (!pageWidth || !hasMeasuredCurrentPage) return;

    const position = Math.max(0, Math.min(2, event.nativeEvent.contentOffset.x / pageWidth));
    const lowerPage = Math.floor(position);
    const upperPage = Math.ceil(position);
    const pageOffsets = [currentDayOffset - 1, currentDayOffset, currentDayOffset + 1];
    const lowerHeight = pageHeights.current[pageOffsets[lowerPage]];
    const upperHeight = pageHeights.current[pageOffsets[upperPage]];

    if (!lowerHeight && !upperHeight) return;

    const startHeight = lowerHeight || upperHeight;
    const endHeight = upperHeight || lowerHeight;
    const progress = position - lowerPage;
    const interpolatedHeight = startHeight + ((endHeight - startHeight) * progress);

    animatedPageHeight.stopAnimation();
    targetPageHeight.current = interpolatedHeight;
    animatedPageHeight.setValue(interpolatedHeight);
  };

  const handleDateSelect = (day) => {
    const selectedDate = new Date(day.year, day.month - 1, day.day, 0, 0, 0, 0);
    const today = new Date(baseDate.current);
    today.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.round((selectedDate - today) / (1000 * 60 * 60 * 24));
    closeCalendar(false);

    if (daysDiff !== currentDayOffset) {
      navigateToOffset(daysDiff);
    }

    setTimeout(recenterScroll, 50);
  };

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
      <View
        style={styles.schedulePage}
        onLayout={({ nativeEvent }) => handlePageLayout(offset, nativeEvent.layout.height)}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          <View style={styles.headerActions}>
            {offset !== 0 && (
              <TouchableOpacity
                onPress={() => navigateToOffset(0)}
                style={styles.todayButton}
                accessibilityRole="button"
                accessibilityLabel="Go to today's schedule"
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                void triggerPressHaptic();
                void fetchScheduleForOffset(offset, true);
              }}
              style={styles.calendarButton}
              accessibilityRole="button"
              accessibilityLabel="Refresh schedule"
            >
              <MaterialIcons name="refresh" size={18} color="#6366F1" />
            </TouchableOpacity>
            <TouchableOpacity onPress={openCalendar} style={styles.calendarButton} accessibilityRole="button" accessibilityLabel="Choose a date">
            <MaterialIcons name="calendar-today" size={18} color="#6366F1" />
            </TouchableOpacity>
          </View>
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
  const currentDateKey = formatLocalISODate(currentDate);

  return (
    <View style={styles.container}>
      <View
        style={styles.cardContainer}
        onLayout={({ nativeEvent }) => setPageWidth(nativeEvent.layout.width)}
      >
        <TouchableOpacity 
          style={styles.leftArrow} 
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          onPress={() => {
            navigateBy(-1);
          }}
        >
          <MaterialIcons name="chevron-left" size={28} color="#6366F1" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.rightArrow} 
          accessibilityRole="button"
          accessibilityLabel="Next day"
          onPress={() => {
            navigateBy(1);
          }}
        >
          <MaterialIcons name="chevron-right" size={28} color="#6366F1" />
        </TouchableOpacity>
        
        <Animated.ScrollView
          ref={scrollViewRef}
          style={hasMeasuredCurrentPage ? { height: animatedPageHeight } : undefined}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          directionalLockEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          contentOffset={{ x: pageWidth, y: 0 }}
          onLayout={() => {
            if (!initialScrollSet.current) {
              initialScrollSet.current = true;
              recenterScroll();
            }
          }}
        >
          <View style={{ width: pageWidth }}>
            {renderSchedulePage(currentDayOffset - 1)}
          </View>
          
          <View style={{ width: pageWidth }}>
            {renderSchedulePage(currentDayOffset)}
          </View>
          
          <View style={{ width: pageWidth }}>
            {renderSchedulePage(currentDayOffset + 1)}
          </View>
        </Animated.ScrollView>
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
                current={currentDateKey}
                onDayPress={handleDateSelect}
                markedDates={{
                  [currentDateKey]: {
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
    marginVertical: 0,
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
    width: '100%',
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
    padding: 5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  todayButton: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
  },
  todayButtonText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
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
