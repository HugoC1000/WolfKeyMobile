import api from './config';

export async function registerPushToken(pushToken) {
  if (!pushToken) return { success: false, error: 'MISSING_TOKEN' };
  try {
    const res = await api.post('notifications/register-push-token/', { push_token: pushToken });
    return res.data || { success: true };
  } catch (e) {
    console.error('registerPushToken error:', {
      message: e.message,
      responseData: e?.response?.data,
      responseStatus: e?.response?.status
    });
    return { success: false, error: e?.response?.data || e.message };
  }
}

export async function unregisterPushToken(pushToken) {
  try {
    const res = await api.post('notifications/unregister-push-token/', pushToken ? { push_token: pushToken } : {});
    return res.data || { success: true };
  } catch (e) {
    console.error('unregisterPushToken error:', {
      message: e.message,
      responseData: e?.response?.data,
      responseStatus: e?.response?.status
    });
    return { success: false, error: e?.response?.data || e.message };
  }
}

export async function getNotifications() {
  try {
    const res = await api.get('notifications/');
    if (res.data.success) {
      return Array.isArray(res.data.data.notifications) ? res.data.data.notifications : [];
    } else {
      throw new Error(res.data.error || 'Failed to load notifications');
    }
  } catch (e) {
    console.error('getNotifications error:', e?.response?.data || e.message);
    throw e;
  }
}

export async function getUnreadCount() {
  try {
    const res = await api.get('notifications/unread-count/');
    return res.data?.data?.unread_count || 0;
  } catch (e) {
    console.error('getUnreadCount error:', e?.response?.data || e.message);
    return 0;
  }
}

export async function markAsRead(notificationId) {
  try {
    const res = await api.post(`notifications/${notificationId}/mark-read/`);
    return res.data;
  } catch (e) {
    console.error('markAsRead error:', e?.response?.data || e.message);
    throw e;
  }
}

export async function markAllAsRead() {
  try {
    const res = await api.post('notifications/mark-all-read/');
    return res.data;
  } catch (e) {
    console.error('markAllAsRead error:', e?.response?.data || e.message);
    throw e;
  }
}

export async function markNotificationsByPost(postId) {
  try {
    const res = await api.post(`notifications/mark-by-post/${postId}/`);
    return res.data;
  } catch (e) {
    console.error('markNotificationsByPost error:', e?.response?.data || e.message);
    // Don't throw - this is a background action that shouldn't interrupt user flow
    return { success: false };
  }
}

/**
 * Parse and handle deep link navigation from notification data
 * Supports both push notification format and in-app notification deep_link format
 * 
 * @param {Object} data - Notification data object or deep_link object
 * @param {Object} router - expo-router router instance
 * @returns {boolean} - Whether navigation was handled
 * 
 * TWO NOTIFICATION DATA FORMATS:
 * 
 * 1. Direct Data (Push Notifications) - when user taps push notification from outside app:
 *    { type: 'comment', post_id: '123', comment_id: '456', username: 'john' }
 * 
 * 2. Nested deep_link (In-App Notifications) - when user taps notification in NotificationsScreen:
 *    { deep_link: { type: 'comment', screen: 'PostDetail', params: { postId: '123', commentId: '456' } } }
 * 
 * This function handles both by checking data.params (nested) OR using data directly (push notifications)
 */
export function handleDeepLink(data, router) {
  if (!data || !router) {
    console.warn('handleDeepLink: Missing data or router');
    return false;
  }

  try {
    // Support both formats: direct data and nested deep_link
    const type = data.type;
    const params = data.params || data; // For deep_link.params or direct data
    
    switch (type) {
      case 'post_detail':
      case 'comment':
      case 'solution_detail':
        // Support both postId (deep_link format) and post_id (push notification format)
        const postId = params.postId || params.post_id;
        if (postId) {
          router.push({
            pathname: '/post-detail/[id]',
            params: {
              id: postId,
              commentId: params.commentId || params.comment_id || undefined,
              solutionId: params.solutionId || params.solution_id || undefined,
            }
          });
          return true;
        }
        break;
        
      case 'profile':
        if (params.username) {
          router.push({
            pathname: '/(tabs)/profile-screen',
            params: { username: params.username }
          });
          return true;
        }
        break;
        
      case 'notifications':
        router.push('/(tabs)/notifications');
        return true;
        
      default:
        console.log('Unhandled notification type:', type);
        return false;
    }
  } catch (error) {
    console.error('Error handling deep link:', error);
    return false;
  }
  
  return false;
}