import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

const getProjectId = () => {
  return (
    Constants?.easConfig?.projectId ||
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.manifest2?.extra?.eas?.projectId ||
    undefined
  );
};

export async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) {
      console.log('Not a physical device, skipping push registration');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    const projectId = getProjectId();
  
    // Get Expo push token
    let tokenResponse;
    try {
      tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
    } catch (tokenError) {
      console.error('Failed to get push token:', tokenError);
      return null;
    }

    // Extract token from response
    const pushToken = tokenResponse?.data || tokenResponse || null;
    if (!pushToken) {
      console.log('No push token returned');
      return null;
    }

    return pushToken;
  } catch (e) {
    console.error('registerForPushNotificationsAsync error:', e);
    return null;
  }
}

export function attachBasicNotificationListeners({ onReceive, onRespond } = {}) {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    try { onReceive?.(notification); } catch {}
  });
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    try { onRespond?.(response); } catch {}
  });
  return () => {
    try { receivedSub.remove(); } catch {}
    try { responseSub.remove(); } catch {}
  };
}

/**
 * Set the app icon badge count
 * @param {number} count - The number to display on the badge (0 to clear)
 */
export async function setBadgeCount(count) {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}

export async function clearBadge() {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('Error clearing badge:', error);
  }
}

export async function getBadgeCount() {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
}
