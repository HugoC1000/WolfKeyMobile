import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import SharedHeader from './SharedHeader';
import BackgroundSvg from '../components/BackgroundSVG';
import { useUser } from '../context/userContext';
const ScrollableScreenWrapper = ({
  children,
  title,
  isHome,
  backgroundHue,
  onSettingsPress,
  isSetting,
  showHeader = true,
  headerInFlow = false,
}) => {
  const { user } = useUser();

  return (
    <View style={styles.wrapper}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="dark-content" 
      />
      <BackgroundSvg hue={backgroundHue ?? user?.userprofile?.background_hue} />
      
      <View style={styles.container}>
        {showHeader && (
          <SharedHeader
            title={title}
            isHome={isHome}
            onSettingsPress={onSettingsPress}
            isSetting={isSetting}
            inFlow={headerInFlow}
          />
        )}
        <View style={styles.content}>
          {children}
        </View>
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
  },
  content: {
    flex: 1,
  }
});

export default ScrollableScreenWrapper;
