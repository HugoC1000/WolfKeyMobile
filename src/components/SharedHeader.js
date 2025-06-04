import React from 'react';
import { Animated, StyleSheet, Text, Image, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const HEADER_HEIGHT = 45;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' 
  ? (Device.modelName === 'iPhone SE' ? 0 : 44)
  : StatusBar.currentHeight || 0;

const SharedHeader = ({ scrollY, isScrollingUp, title, isHome }) => {
  const navigation = useNavigation();

  const translateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, isScrollingUp ? 0 : -HEADER_HEIGHT - (Platform.OS === 'ios' ? 45 : 0)],
    extrapolate: 'clamp',
  });

  const opacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [1, isScrollingUp ? 1 : 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.headerWrapper, { opacity }]}>
      <BlurView
        intensity={50}
        tint="light"
        style={[styles.header, { position: 'absolute', top: Platform.OS === 'ios' ? 44 : 0, left: 0, right: 0 }]}
      >
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, transform: [{ translateY }] }}>
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
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    height: HEADER_HEIGHT,
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    backgroundColor: "transparent"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default SharedHeader;