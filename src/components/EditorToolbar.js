import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const EditorToolbar = ({ onAddImage, disabled = false }) => (
  <View style={styles.container}>
    <TouchableOpacity
      style={[styles.action, disabled && styles.actionDisabled]}
      onPress={onAddImage}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Add image"
    >
      <MaterialIcons name="add-photo-alternate" size={21} color={disabled ? '#DBEAFE' : '#FFFFFF'} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
  },
  action: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  actionDisabled: {
    opacity: 0.6,
  },
});

export default EditorToolbar;
