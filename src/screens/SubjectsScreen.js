import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const SubjectsScreen = () => {
  const { course } = useLocalSearchParams();

  return (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Your Subjects</Text>
      {course ? <Text style={styles.subtitle}>Mentioned course: #{course}</Text> : null}
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
  },
});

export default SubjectsScreen;