import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { scheduleService } from '../api/scheduleService';
import { useUser } from '../context/userContext';

const BLOCK_MAPPING = {
  '1ca': 'Academics',
  '1cp': 'PEAKS',
  '1cap': 'Advisory',
  'assm': 'Assembly',
  'tfr': 'Terry Fox Run',
};

const SCREEN_WIDTH = Dimensions.get('window').width;

const Schedule = () => {
  const { user } = useUser();
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [schedules, setSchedules] = useState({ today: null, tomorrow: null });
  const [loading, setLoading] = useState(true);

  const getDateString = (offset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };
  
  const processSchedule = (rawSchedule) => {
    if (!rawSchedule?.blocks?.length || !rawSchedule.times) {
      return [{ block: 'No School Today', time: null }];
    }

    if (!rawSchedule.blocks.some(block => block)) {
      return [{ block: 'No School Today', time: null }];
    }

    return rawSchedule.blocks.map((block, index) => {
      if (!block) {
        return { block: 'No Block', time: rawSchedule.times[index] };
      }

      const normalized = block.toString().trim().toUpperCase();
      if (normalized.toLowerCase() in BLOCK_MAPPING) {
        return { block: BLOCK_MAPPING[normalized.toLowerCase()], time: rawSchedule.times[index] };
      }
      if (user?.courses?.[`block_${normalized}`]) {
        return { block: user.courses[`block_${normalized}`], time: rawSchedule.times[index] };
      }

      return { block: 'Add courses in profile', time: rawSchedule.times[index] };
    });
  };

  useEffect(() => {
    setSchedules({ today: null, tomorrow: null });
    const fetchBothSchedules = async () => {
      setLoading(true);
      try {
        const [todayData, tomorrowData] = await Promise.all([
          scheduleService.getDailySchedule(getDateString(0)),
          scheduleService.getDailySchedule(getDateString(1)),
        ]);

        setSchedules({
          today: {
            blocks: processSchedule(todayData),
            uniformRequired: todayData.ceremonial_uniform,
          },
          tomorrow: {
            blocks: processSchedule(tomorrowData),
            uniformRequired: tomorrowData.ceremonial_uniform,
          },
        });
      } catch (error) {
        console.error('Schedule fetch failed:', error);
        setSchedules({
          today: { blocks: [{ block: 'Error loading schedule', time: null }] },
          tomorrow: { blocks: [{ block: 'Error loading schedule', time: null }] },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBothSchedules();
  }, [user?.id]);

  // Handle scroll events and update pagination
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const page = Math.round(offsetX / SCREEN_WIDTH);
        if (page !== currentPage) {
          setCurrentPage(page);
        }
      }
    }
  );

  // Function to handle manual page changes
  const goToPage = (pageIndex) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: pageIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentPage(pageIndex);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 32 }} />;
  }

  const renderSchedulePane = (label, data) => {

  const dateToShow = label === 'Today' ? getDateString(0) : getDateString(1);
    return (
      <View style={styles.schedulePage}>
        <View style={styles.headerContainer}>
          <Text style={styles.dateLabel}>{label}</Text>
          <Text style={styles.dateText}>{dateToShow}</Text>
        </View>
        {data.uniformRequired && (
          <View style={styles.uniformAlert}>
            <Text style={styles.uniformText}>Ceremonial Uniform Required</Text>
          </View>
        )}
        {data.blocks.map((block, index) => (
          <View key={index} style={styles.blockContainer}>
            <Text style={styles.blockName}>{block.block}</Text>
            <Text style={styles.blockTime}>{block.time}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          contentContainerStyle={styles.scrollContent}
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="start"
          disableIntervalMomentum={true}
        >
          <View style={[styles.page, { width: SCREEN_WIDTH - 40 }]}>
            {renderSchedulePane('Today', schedules.today)}
          </View>
          <View style={[styles.page, { width: SCREEN_WIDTH - 40 }]}>
            {renderSchedulePane('Tomorrow', schedules.tomorrow)}
          </View>
        </Animated.ScrollView>
      </View>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {[0, 1].map((index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentPage === index ? styles.paginationDotActive : null
            ]}
            onTouchEnd={() => goToPage(index)}
          />
        ))}
      </View>
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
    overflow: 'hidden', // This ensures the child components respect the border radius
    marginVertical: 5,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
  },
  schedulePage: {
    width: SCREEN_WIDTH - 40,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    color: '#6B7280', // Muted text color
    fontWeight: '400',
  },
  uniformAlert: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  uniformText: {
    color: '#92400E',
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 5,
  },
  paginationDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 6,
  },
  paginationDotActive: {
    backgroundColor: '#6366F1',
    transform: [{ scale: 1.2 }],
  },
});

export default Schedule;