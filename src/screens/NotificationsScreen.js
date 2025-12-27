import React, { useState, useEffect, useCallback } from 'react';
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
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notificationService';
import { COLORS } from '../utils/constants';
import { formatTime } from '../utils/timeUtils';
import badgeManager from '../utils/badgeManager';

const HEADER_HEIGHT = 45;


const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      const notifications = await getNotifications();
      setNotifications(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
      setNotifications([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications(false);
    setRefreshing(false);
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
      
      badgeManager.clearBadge();
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
      try {
        switch (deepLink.type) {
          case 'post_detail':
          case 'comment':
          case 'solution_detail':
            if (deepLink.params?.postId) {
              router.push({
                pathname: '/post-detail/[id]',
                params: {
                  id: deepLink.params.postId,
                  commentId: deepLink.params.commentId || undefined,
                  solutionId: deepLink.params.solutionId || undefined,
                }
              });
            }
            break;
            
          case 'profile':
            if (deepLink.params?.username) {
              router.push({
                pathname: '/(tabs)/profile-screen',
                params: { username: deepLink.params.username }
              });
            }
            break;
            
          default:
            console.log('Unhandled notification deep link:', deepLink);
        }
      } catch (error) {
        console.error('Error navigating from notification:', error);
      }
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
    <View style={styles.headerSpacer} />
  ), []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
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
      rightAction={
        unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllButton}>Mark all read</Text>
          </TouchableOpacity>
        ) : null
      }
    >
      <View style={styles.container}>
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
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
