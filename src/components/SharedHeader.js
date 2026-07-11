import React from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GlassView, GlassContainer } from 'expo-glass-effect';
import { triggerPressHaptic } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 45;
const SharedHeader = ({ title, isHome, onSettingsPress, isSetting }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* Header Content */}
      <Animated.View style={[styles.headerContent, { top: insets.top }]}>
        <GlassContainer style={styles.headerContentContainer}>
          <GlassView
            glassEffectStyle="regular"
            style={styles.leftContent}
            isInteractive
              tintColor='FFFFFF10'

          >
            {isHome ? (
                <Image
                  source={require('../../assets/light-icon.png')}
                  style={{ width: 40, height: 40, borderRadius: 12 }}
                />
            ) : (
              <TouchableOpacity  style = {{borderRadius: 999}} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={32} color="#000"/>
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
          {isHome && (
            <GlassView
              glassEffectStyle="regular"
              style={styles.rightContent}
              isInteractive
            >
              <TouchableOpacity 
                onPress = {() => {
                  void triggerPressHaptic();
                  router.push('/lunch-card')
                }}
              >
                <MaterialIcons name="credit-card" size={28} color="#000" />
              </TouchableOpacity>
            </GlassView>
          )}
          {isSetting && (
            <GlassView
              glassEffectStyle="regular"
              style={styles.rightContent}
              tintColor='FFFFFF15'
              isInteractive
            >
              <TouchableOpacity 
                onPress={onSettingsPress}
              >
                <MaterialIcons name="settings" size={28} color="#000" />
              </TouchableOpacity>
            </GlassView>
          )}
        </GlassContainer>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  headerContent: {
    position: 'absolute',
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
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  rightContent: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    marginLeft: 'auto',
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
    borderRadius: 20,
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
