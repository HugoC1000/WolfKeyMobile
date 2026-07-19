import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

const KeyboardResizingScreen = ({ children, style }) => (
  <KeyboardAvoidingView
    style={[styles.container, style]}
    behavior={Platform.OS === 'ios' ? 'height' : undefined}
  >
    {children}
  </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default KeyboardResizingScreen;
