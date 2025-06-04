import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const SubjectsScreen = () => {
  return (
    <View style={styles.centerContainer}>
      <Text>Your Subjects</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FF',
  },
});

export default SubjectsScreen;