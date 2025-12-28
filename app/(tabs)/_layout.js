import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label, Badge, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/constants';
import { getUnreadCount } from '../../src/api/notificationService';
import badgeManager from '../../src/utils/badgeManager';

export default function TabsLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to badge manager updates
    const unsubscribe = badgeManager.subscribe((count) => {
      setUnreadCount(count);
    });

    // Initial fetch
    fetchUnreadCount();

    // Poll for updates every 30 seconds (backup)
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };
  return (
    <NativeTabs
      tintColor={COLORS.primary}
      backgroundColor="rgba(255, 255, 255, 0.9)"
      blurEffect="light"
    >
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'house', selected: 'house.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="home" />} />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore-screen">
        <Label>Explore</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'safari', selected: 'safari' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="compass" />} />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="create-post">
        <Label>Ask</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="add-circle" />} />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="notifications-screen">
        <Label>Notifications</Label>
        <Badge hidden={unreadCount === 0}>{unreadCount > 0 ? String(unreadCount) : ''}</Badge>
        {Platform.select({
          ios: <Icon sf={{ default: 'bell', selected: 'bell.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="notifications" />} />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile-screen">
        <Label>Profile</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'person', selected: 'person.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="person" />} />,
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
