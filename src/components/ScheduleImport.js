import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import { applyScheduleImport, previewScheduleImport } from '../api/profileService';

const BLOCKS = ['1A', '1B', '1D', '1E', '2A', '2B', '2C', '2D', '2E'];
const MAX_IMAGE_EDGE = 2400;
const IMAGE_COMPRESSION = 0.7;

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.detail
  || error?.response?.data?.error
  || error?.message
  || fallback
);

const compressScheduleImage = async (asset) => {
  const width = Number(asset?.width) || 0;
  const height = Number(asset?.height) || 0;
  const largestEdge = Math.max(width, height);
  const actions = [];

  if (largestEdge > MAX_IMAGE_EDGE) {
    actions.push({
      resize: width >= height
        ? { width: MAX_IMAGE_EDGE }
        : { height: MAX_IMAGE_EDGE },
    });
  }

  const compressed = await manipulateAsync(asset.uri, actions, {
    compress: IMAGE_COMPRESSION,
    format: SaveFormat.JPEG,
  });

  return {
    uri: compressed.uri,
    name: 'schedule.jpg',
    type: 'image/jpeg',
  };
};

const ScheduleImport = ({ onApplied }) => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState('options');
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);

  const resetAndClose = () => {
    setVisible(false);
    setStep('options');
    setPastedText('');
  };

  const close = () => {
    if (!loading) resetAndClose();
  };

  const importSchedule = async (source) => {
    setVisible(true);
    setStep('loading');
    setLoading(true);

    try {
      const preview = await previewScheduleImport(source);
      const assignments = Object.fromEntries(BLOCKS.map((block) => [block, null]));

      (preview?.blocks || []).forEach((item) => {
        if (!BLOCKS.includes(item.block)) return;
        const courseId = Number(item.course?.id ?? item.course?.course_id);
        assignments[item.block] = Number.isInteger(courseId) ? courseId : null;
      });

      await applyScheduleImport(assignments);
      await onApplied?.();
      setLoading(false);
      resetAndClose();
    } catch (error) {
      setLoading(false);
      resetAndClose();
      Alert.alert('Import failed', getErrorMessage(error, 'Could not import this schedule.'));
    }
  };

  const choosePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo library access to import a schedule image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets?.[0]) {
        const image = await compressScheduleImage(result.assets[0]);
        await importSchedule({ image });
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open the photo library.');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Allow camera access to photograph a schedule.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets?.[0]) {
        const image = await compressScheduleImage(result.assets[0]);
        await importSchedule({ image });
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open the camera.');
    }
  };

  const openImportOptions = () => {
    setStep('options');
    setVisible(true);
  };

  return (
    <>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={openImportOptions}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Import schedule"
        >
          <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.importButton}>
            <MaterialIcons name="auto-awesome" size={17} color="#fff" />
            <Text style={styles.importButtonText}>Import schedule</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View style={styles.modalCard}>
            {step === 'loading' ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#6D28D9" />
                <Text style={styles.loadingText}>Reading and saving schedule…</Text>
              </View>
            ) : step === 'text' ? (
              <>
                <Text style={styles.modalTitle}>Paste schedule text</Text>
                <TextInput
                  style={styles.textArea}
                  value={pastedText}
                  onChangeText={setPastedText}
                  multiline
                  autoFocus
                  placeholder="Paste your schedule here"
                  textAlignVertical="top"
                />
                <View style={styles.footerRow}>
                  <TouchableOpacity style={styles.cancelButton} onPress={close}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.readButton, !pastedText.trim() && styles.disabledButton]}
                    onPress={() => importSchedule({ text: pastedText })}
                    disabled={!pastedText.trim()}
                  >
                    <Text style={styles.readButtonText}>Read schedule</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Import schedule</Text>
                <Text style={styles.modalDescription}>Choose how to add your schedule.</Text>
                <View style={styles.optionList}>
                  <TouchableOpacity style={styles.optionButton} onPress={() => setStep('text')}>
                    <MaterialIcons name="content-paste" size={22} color="#6D28D9" />
                    <Text style={styles.optionButtonText}>Paste text</Text>
                    <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optionButton} onPress={choosePhoto}>
                    <MaterialIcons name="photo-library" size={22} color="#6D28D9" />
                    <Text style={styles.optionButtonText}>Choose photo</Text>
                    <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optionButton} onPress={takePhoto}>
                    <MaterialIcons name="photo-camera" size={22} color="#6D28D9" />
                    <Text style={styles.optionButtonText}>Take photo</Text>
                    <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.optionsCancelButton} onPress={close}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  buttonRow: {
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  importButton: {
    minHeight: 42,
    paddingHorizontal: 15,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    justifyContent: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'center',
  },
  modalCard: {
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalDescription: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 13,
  },
  optionList: {
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionButton: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  optionButtonText: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  optionsCancelButton: {
    minHeight: 44,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#F3F4F6',
  },
  textArea: {
    minHeight: 180,
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    fontSize: 15,
    color: '#111827',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '700',
  },
  readButton: {
    flex: 1.5,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#6D28D9',
  },
  readButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  loadingContent: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
});

export default ScheduleImport;
