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