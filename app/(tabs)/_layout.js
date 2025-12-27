import React from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/constants';

export default function TabsLayout() {
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
