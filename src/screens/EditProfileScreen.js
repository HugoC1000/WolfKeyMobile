import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useUser } from '../context/userContext';
import BackgroundSvg from '../components/BackgroundSVG';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import { MaterialIcons } from '@expo/vector-icons';
import { updateProfile } from '../api/profileService';


const EditProfileScreen = ({ route, navigation }) => {
  const { profile } = route.params;
  console.log(profile);
  const { user, updateUser } = useUser();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    bio: profile.bio || '',
    background_hue: profile.background_hue || 200,
    wolfnet_password: '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const updateData = {
        ...formData,
      };

      if (!updateData.wolfnet_password.trim()) {
        delete updateData.wolfnet_password;
      }

      await updateProfile(updateData);
      
      if (updateData.background_hue !== undefined) {
        await updateUser({ background_hue: updateData.background_hue });
      }
      
      navigation.goBack();
      
      Alert.alert('Success', 'Profile updated successfully!');
      
      if (route.params?.onRefresh) {
        route.params.onRefresh();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderInput = (label, field, options = {}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, options.multiline && styles.textArea]}
        value={formData[field]}
        onChangeText={(value) => handleInputChange(field, value)}
        placeholder={options.placeholder || `Enter ${label.toLowerCase()}`}
        keyboardType={options.keyboardType || 'default'}
        multiline={options.multiline || false}
        numberOfLines={options.multiline ? 4 : 1}
        secureTextEntry={options.secure || false}
        maxLength={options.maxLength}
      />
      {options.helper && (
        <Text style={styles.helperText}>{options.helper}</Text>
      )}
    </View>
  );

  const renderColorPicker = () => {
    const colors = [
      { hue: 0, name: 'Red' },
      { hue: 30, name: 'Orange' },
      { hue: 60, name: 'Yellow' },
      { hue: 120, name: 'Green' },
      { hue: 180, name: 'Cyan' },
      { hue: 200, name: 'Blue' },
      { hue: 240, name: 'Indigo' },
      { hue: 280, name: 'Purple' },
      { hue: 320, name: 'Pink' },
    ];

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Background Color</Text>
        <View style={styles.colorPicker}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color.hue}
              style={[
                styles.colorOption,
                { backgroundColor: `hsl(${color.hue}, 70%, 60%)` },
                formData.background_hue === color.hue && styles.selectedColor
              ]}
              onPress={() => handleInputChange('background_hue', color.hue)}
            >
              {formData.background_hue === color.hue && (
                <MaterialIcons name="check" size={20} color="white" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollableScreenWrapper title="Edit Profile" backgroundHue={formData.background_hue}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderSection('Personal Information', (
            <>
              {renderInput('First Name', 'first_name')}
              {renderInput('Last Name', 'last_name')}
              {renderInput('Bio', 'bio', {
                multiline: true,
                placeholder: 'Tell us about yourself...',
                maxLength: 500,
                helper: 'A brief description about yourself (max 500 characters)'
              })}
            </>
          ))}

          {renderSection('WolfNet Integration', (
            <>
              {renderInput('WolfNet Password', 'wolfnet_password', {
                secure: true,
                placeholder: profile.has_wolfnet_password ? 'Wolfnet password entered. Edit here ' : 'Enter WolfNet password (optional)',
                helper: 'Used for grade notifications and schedule auto-completion'
              })}
            </>
          ))}

          {renderSection('Appearance', renderColorPicker())}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScrollableScreenWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    marginTop: 45,
    marginBottom: 70,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionContent: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#1f2937',
    borderWidth: 3,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#42464fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default EditProfileScreen;
