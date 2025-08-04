import React from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  Image,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const HEADER_HEIGHT = 45;
const STATUS_BAR_HEIGHT =
  Platform.OS === 'ios'
    ? Device.modelName === 'iPhone SE'
      ? 0
      : 44
    : StatusBar.currentHeight || 0;

const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + STATUS_BAR_HEIGHT;

const SharedHeader = ({ scrollY, isScrollingUp, title, isHome }) => {
  const navigation = useNavigation();

  const headerContentOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [1, isScrollingUp ? 1 : 0],
    extrapolate: 'clamp',
  });

  const unifiedBlurHeight = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [TOTAL_HEADER_HEIGHT, isScrollingUp ? TOTAL_HEADER_HEIGHT : STATUS_BAR_HEIGHT],
    extrapolate: 'clamp',
  });

  return (
    <>
      {/* Single Unified Blur */}
      <Animated.View style={[styles.unifiedBlur, { height: unifiedBlurHeight }]}>
        <BlurView
          intensity={35}
          tint="light"
          style={StyleSheet.absoluteFillObject}
          reducedTransparencyFallbackColor="white"
        />
      </Animated.View>

      {/* Header Content */}
      <Animated.View style={[styles.headerContent, { opacity: headerContentOpacity }]}>
        {isHome ? (
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 40, height: 40, borderRadius: 12 }}
          />
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={32} color="#000" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  unifiedBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerContent: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: HEADER_HEIGHT,
    zIndex: 1001,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default SharedHeader;
