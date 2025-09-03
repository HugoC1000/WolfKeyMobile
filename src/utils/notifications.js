import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { sendClientLog } from '../api/debugService';

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
    if (Platform.OS === 'web') {
      return null;
    }

    if (!Device.isDevice) {
      const msg = 'registerForPushNotificationsAsync: not a physical device, skipping push registration';
      console.log(msg);
      try { await sendClientLog('warn', msg, { device: 'not-a-physical-device' }); } catch {}
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('registerForPushNotificationsAsync: existingStatus=', existingStatus);
  try { await sendClientLog('debug', 'existingStatus', { existingStatus }); } catch {}
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
  console.log('registerForPushNotificationsAsync: requested permission status=', status);
  try { await sendClientLog('debug', 'requestedPermissionStatus', { status }); } catch {}
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
  const msg = 'registerForPushNotificationsAsync: permission not granted, skipping push registration';
  console.log(msg);
  try { await sendClientLog('warn', msg, { finalStatus }); } catch {}
  return null;
    }

    const projectId = getProjectId();
  console.log('registerForPushNotificationsAsync: resolved projectId=', projectId);
  try { await sendClientLog('debug', 'resolvedProjectId', { projectId }); } catch {}
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
  console.log('registerForPushNotificationsAsync: raw tokenResponse=', tokenResponse);
  try { await sendClientLog('debug', 'rawTokenResponse', { tokenResponse }); } catch {}
    // tokenResponse may be an object { data: 'ExponentPushToken[...]' } or a string in older SDKs
    const pushToken = tokenResponse?.data || tokenResponse || null;
    if (!pushToken) {
      const msg = 'registerForPushNotificationsAsync: no push token returned';
      console.log(msg);
      try { await sendClientLog('warn', msg, { tokenResponse }); } catch {}
      return null;
    }

    console.log('registerForPushNotificationsAsync: returning pushToken=', pushToken);
    try { await sendClientLog('info', 'returningPushToken', { pushToken }); } catch {}
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
