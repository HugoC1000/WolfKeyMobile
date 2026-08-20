import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label, Badge, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/constants';
import badgeManager from '../../src/utils/badgeManager';

export default function TabsLayout() {
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    const unsubscribe = badgeManager.subscribe((count) => {
      setUnreadCount(count);
    });

    return () => {
      unsubscribe();
    };
  }, []);
  return (
    <NativeTabs
      tintColor={COLORS.primary}
      iconColor="#000000"
      backgroundColor="#ffffff"
      blurEffect="light"
    >
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'house', selected: 'house.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="home" />} />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="community">
        <Label>Community</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'safari', selected: 'safari' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="compass" />} />,
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'person', selected: 'person.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="person" />} />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="notifications">
        <Label>Alerts</Label>
        <Badge hidden={unreadCount === 0}>{unreadCount > 0 ? String(unreadCount) : ''}</Badge>
        {Platform.select({
          ios: <Icon sf={{ default: 'bell', selected: 'bell.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="notifications" />} />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="volunteer">
        <Label>Volunteer</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'heart', selected: 'heart.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="heart" />} />,
        })}
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}
