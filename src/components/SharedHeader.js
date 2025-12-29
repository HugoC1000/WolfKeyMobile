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
import { GlassView, GlassContainer } from 'expo-glass-effect';

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

  return (
    <>
      {/* Header Content */}
      <Animated.View style={[styles.headerContent,  ]}>
        <GlassContainer style={styles.headerContentContainer}>
          <GlassView
            glassEffectStyle="regular"
            style={styles.leftContent}
            isInteractive
          >
            {isHome ? (
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: 40, height: 40, borderRadius: 12 }}
              />
            ) : (
              <TouchableOpacity  style = {{borderRadius: 999}} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={32} color="#000" style = {{borderRadius: 999}}/>
              </TouchableOpacity>
            )}
          </GlassView>
          <Animated.View style={styles.titleWrapper}>
            <GlassView
              glassEffectStyle="clear"
              style={styles.titleContent}
            >
              <Text style={styles.headerTitle}>{title}</Text>
            </GlassView>
          </Animated.View>
        </GlassContainer>
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
  glassBlur: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  headerContent: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 1001,
  },
  headerContentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: HEADER_HEIGHT,
  },
  leftContent: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
    padding: 6,
    overflow: 'hidden',
  },
  titleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  titleContent: {
    alignContent: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 99,
    paddingVertical:  5,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default SharedHeader;
