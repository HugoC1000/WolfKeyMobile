import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import ScreenHeaderSpacer from '../components/ScreenHeaderSpacer';

const CommunityScreen = () => (
  <ScrollableScreenWrapper title="Community">
    <View style={styles.container}>
      <ScreenHeaderSpacer />
      <View style={styles.messageCard}>
        <Text style={styles.title}>Coming soon</Text>
      </View>
    </View>
  </ScrollableScreenWrapper>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#1F2937',
    fontSize: 24,
    fontWeight: '700',
  },
});

export default CommunityScreen;
