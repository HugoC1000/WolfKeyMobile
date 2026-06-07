import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GlassView } from 'expo-glass-effect';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import { getNotifications, markAsRead, markAllAsRead, handleDeepLink } from '../api/notificationService';
import { COLORS } from '../utils/constants';
import { formatTime } from '../utils/timeUtils';
import badgeManager from '../utils/badgeManager';

const HEADER_HEIGHT = 45;
const PAGE_SIZE = 10;


const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const onEndReachedCalledDuringMomentum = useRef(false);
  const initialLoadComplete = useRef(false);
  const lastFetchTime = useRef(0);

  const fetchNotifications = async (pageNum = 1, shouldRefresh = false) => {
    if ((pageNum > 1 && !hasNext) || loadingMore) return;

    try {
      if (shouldRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      const data = await getNotifications(pageNum, PAGE_SIZE);
      const nextNotifications = Array.isArray(data?.notifications) ? data.notifications : [];

      setNotifications((prev) =>
        shouldRefresh || pageNum === 1 ? nextNotifications : [...prev, ...nextNotifications]
      );
      setHasNext(Boolean(data?.hasNext));
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
      if (pageNum === 1) {
        setNotifications([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      if (pageNum === 1) {
        initialLoadComplete.current = true;
      }
    }
  };

  const handleRefresh = async () => {
    await fetchNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!onEndReachedCalledDuringMomentum.current) {
      const now = Date.now();
      if (initialLoadComplete.current && now - lastFetchTime.current > 300) {
        lastFetchTime.current = now;
        fetchNotifications(page + 1);
      }
      onEndReachedCalledDuringMomentum.current = true;
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      badgeManager.updateBadge();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      // Update badge to 0 and notify listeners
      await badgeManager.clearBadge();
      await badgeManager.syncWithServer();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleNotificationPress = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    const deepLink = notification.deep_link;
    if (deepLink && deepLink.screen) {
      handleDeepLink(deepLink, router);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
        return 'comment';
      case 'solution':
        return 'lightbulb';
      case 'like':
        return 'favorite';
      case 'follow':
        return 'person-add';
      case 'grade_update':
        return 'school';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'comment':
        return '#3B82F6';
      case 'solution':
        return '#10B981';
      case 'like':
        return '#EF4444';
      case 'follow':
        return '#8B5CF6';
      case 'grade_update':
        return '#F59E0B';
      default:
        return COLORS.primary;
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.is_read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: getNotificationColor(item.notification_type) }
        ]}>
          <MaterialIcons
            name={getNotificationIcon(item.notification_type)}
            size={20}
            color="white"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[
            styles.notificationMessage,
            !item.is_read && styles.unreadText
          ]}>
            {item.message}
          </Text>
          
          <View style={styles.metaContainer}>
            {item.sender && (
              <Text style={styles.senderText}>
                {item.sender.full_name || item.sender.username}
              </Text>
            )}
            <Text style={styles.timeText}>
              {formatTime(item.created_at)}
            </Text>
          </View>
          
          {item.post && (
            <Text style={styles.postTitle} numberOfLines={1}>
              Re: {item.post.title}
            </Text>
          )}
        </View>
        
        {!item.is_read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications-none" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>
        You'll see notifications here when someone interacts with your posts
      </Text>
    </View>
  );

  const ListHeader = useCallback(() => (
    <>
      <View style={styles.headerSpacer} />
      {unreadCount > 0 && (
        <TouchableOpacity 
          style={styles.markAllReadButton} 
          onPress={handleMarkAllAsRead}
          activeOpacity={0.7}
        >
          <GlassView
            glassEffectStyle="regular"
            style={styles.markAllReadGlass}
            isInteractive
          >
            <MaterialIcons name="done-all" size={20} color="#2563EB" />
            <Text style={styles.markAllReadButtonText}>
              Mark all {unreadCount} as read
            </Text>
          </GlassView>
        </TouchableOpacity>
      )}
    </>
  ), [unreadCount]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(1);
      badgeManager.syncWithServer();
    }, [])
  );

  if (loading) {
    return (
      <ScrollableScreenWrapper title="Notifications">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </ScrollableScreenWrapper>
    );
  }

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n.is_read).length;

  return (
    <ScrollableScreenWrapper 
      title="Notifications"
    >
      <View style={styles.container}>
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchNotifications(1)}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={safeNotifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
                progressViewOffset={HEADER_HEIGHT + 70}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            onMomentumScrollBegin={() => {
              onEndReachedCalledDuringMomentum.current = false;
            }}
            ListFooterComponent={
              loadingMore && hasNext ? (
                <ActivityIndicator style={styles.loader} color={COLORS.primary} />
              ) : (
                <View style={{ height: 20 }} />
              )
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={safeNotifications.length === 0 ? styles.emptyList : styles.listContent}
          />
        )}
      </View>
    </ScrollableScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSpacer: {
    height: HEADER_HEIGHT + 5,
  },
  listContent: {
    paddingTop: HEADER_HEIGHT,
    paddingHorizontal: 0,
  },
  loader: {
    marginVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  markAllButton: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  markAllReadButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  markAllReadGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  markAllReadButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  notificationItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
  },
  unreadText: {
    fontWeight: '600',
    color: '#111827',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  senderText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  postTitle: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default NotificationsScreen;
