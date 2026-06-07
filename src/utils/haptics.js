import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const supportsHaptics = Platform.OS === 'ios' || Platform.OS === 'android';

export const triggerPressHaptic = async () => {
  if (!supportsHaptics) return;

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // Ignore haptics errors so button actions are never blocked.
  }
};

export const triggerSuccessHaptic = async () => {
  if (!supportsHaptics) return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    // Ignore haptics errors so button actions are never blocked.
  }
};
