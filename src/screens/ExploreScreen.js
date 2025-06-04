// screens/ExploreScreen.js
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ExploreScreen = () => {
  return (
    <View style={styles.centerContainer}>
      <Text>Explore Content</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

export default ExploreScreen;