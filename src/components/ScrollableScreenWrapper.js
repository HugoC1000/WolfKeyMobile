import React, { useRef, useState } from 'react';
import { Animated, View, StyleSheet, Platform, StatusBar } from 'react-native';
import SharedHeader from './SharedHeader';
import * as Device from 'expo-device';
import BackgroundSvg from '../components/BackgroundSVG';
import { useUser } from '../context/userContext';
import { BlurView } from 'expo-blur';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' 
  ? (Device.modelName === 'iPhone SE' ? 0 : 44)
  : StatusBar.currentHeight || 0;

const ScrollableScreenWrapper = ({ children, title, isHome, backgroundHue }) => {
  const { user } = useUser();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: false,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        setIsScrollingUp(currentScrollY < lastScrollY.current);
        lastScrollY.current = currentScrollY;
      }
    }
  );

  const childScrollHandler = children?.props?.onScroll;

  const combinedScrollHandler = (event) => {
    handleScroll(event);
    if (childScrollHandler) {
      childScrollHandler(event);
    }
  };

  return (
    <View style={styles.wrapper}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="dark-content" 
      />
      <BackgroundSvg hue={backgroundHue || user?.userprofile?.background_hue} />
      
      <View style={styles.container}>
        <SharedHeader 
          scrollY={scrollY} 
          isScrollingUp={isScrollingUp} 
          title={title}
          isHome = {isHome}
        />
        {React.cloneElement(children, {
          onScroll: combinedScrollHandler,
          scrollEventThrottle: 16,
          contentContainerStyle: [
            children.props.contentContainerStyle,
            { paddingTop: STATUS_BAR_HEIGHT}
          ]
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  }
});

export default ScrollableScreenWrapper;