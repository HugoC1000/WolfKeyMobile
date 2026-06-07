import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { UserProvider } from '../src/context/userContext';
import { AuthProvider, useAuth } from '../src/context/authContext';
import badgeManager from '../src/utils/badgeManager';
import { attachBasicNotificationListeners } from '../src/utils/notifications';
import { handleDeepLink } from '../src/api/notificationService';
import { StyleSheet } from 'react-native';

function RootLayoutContent() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to tabs if authenticated
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  useEffect(() => {
    // Initialize badge manager when user is authenticated
    if (user && !loading) {
      badgeManager.initialize();
    }
  }, [user, loading]);

  // Handle notification responses (when user taps a notification)
  useEffect(() => {
    const handleNotificationResponse = (response) => {
      const data = response?.notification?.request?.content?.data;
      
      // Update badge count
      badgeManager.updateBadge();
      
      // Handle deep linking
      if (data && user) {
        setTimeout(() => {
          handleDeepLink(data, router);
        }, 500);
      }
    };

    const handleNotificationReceived = (notification) => {
      // Update badge when notification is received in foreground
      badgeManager.updateBadge();
    };

    // Attach notification listeners
    const detach = attachBasicNotificationListeners({
      onReceive: handleNotificationReceived,
      onRespond: handleNotificationResponse,
    });

    return () => detach?.();
  }, [user, router]);

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <UserProvider>
          <RootLayoutContent />
        </UserProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
