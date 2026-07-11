import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 45;

export default function ScreenHeaderSpacer({ includeSafeArea = true }) {
  const insets = useSafeAreaInsets();
  return <View style={{ height: HEADER_HEIGHT + (includeSafeArea ? insets.top : 0) }} />;
}
