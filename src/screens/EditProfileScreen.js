import React, { useState, useEffect } from 'react';
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
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useUser } from '../context/userContext';
import BackgroundSvg from '../components/BackgroundSVG';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import { MaterialIcons } from '@expo/vector-icons';
import { updateProfile, getCurrentProfile } from '../api/profileService';
import { triggerSuccessHaptic } from '../utils/haptics';

const HEADER_HEIGHT = 80;

const EditProfileScreen = () => {
  const { user, updateUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    background_hue: 220,
    snapchat_handle: '',
    linkedin_url: '',
    instagram_handle: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const profileData = await getCurrentProfile();
      setProfile(profileData);

      const profileDataObj = profileData.userprofile || profileData;
      setFormData({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        bio: profileDataObj?.bio || '',
        background_hue: profileDataObj?.background_hue ?? 220,
        snapchat_handle: extractHandle(profileDataObj?.snapchat_url, 'snapchat') || '',
        linkedin_url: profileDataObj?.linkedin_url || '',
        instagram_handle: extractHandle(profileDataObj?.instagram_url, 'instagram') || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const extractHandle = (url, platform) => {
    if (!url) return '';
    if (platform === 'snapchat') {
      const match = url.match(/snapchat\.com\/add\/([^\/?#]+)/);
      return match ? match[1] : '';
    } else if (platform === 'instagram') {
      const match = url.match(/instagram\.com\/([^\/?#]+)/);
      return match ? match[1] : '';
    }
    return '';
  };

  const validateLinkedInUrl = (url) => {
    if (!url) return true; // Optional field
    return url.startsWith('www.linkedin.com/in/') || url.startsWith('https://www.linkedin.com/in/');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate LinkedIn URL
      if (formData.linkedin_url && !validateLinkedInUrl(formData.linkedin_url)) {
        Alert.alert('Invalid LinkedIn URL', 'LinkedIn URL must start with www.linkedin.com/in/ or https://www.linkedin.com/in/');
        setLoading(false);
        return;
      }

      // Strip leading @ from handles
      const snapchat_handle = formData.snapchat_handle.replace(/^@/, '');
      const instagram_handle = formData.instagram_handle.replace(/^@/, '');

      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        bio: formData.bio,
        background_hue: formData.background_hue,
        snapchat_handle,
        linkedin_url: formData.linkedin_url,
        instagram_handle,
      };

      await updateProfile(updateData);
      const refreshedProfile = await getCurrentProfile();
      await updateUser({
        first_name: refreshedProfile?.first_name,
        last_name: refreshedProfile?.last_name,
        username: refreshedProfile?.username,
        email: refreshedProfile?.email,
        userprofile: refreshedProfile?.userprofile || {},
      });
      
      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
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
    <View style={[styles.inputContainer, options.flex && { flex: options.flex }]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, options.multiline && styles.textArea, options.flex && { flex: 1 }]}
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

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <ScrollableScreenWrapper title="Edit Profile" contentPaddingTop={0}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </ScrollableScreenWrapper>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundSvg hue={formData.background_hue} />
      <ScrollableScreenWrapper 
        title="Edit Profile" 
        backgroundHue={formData.background_hue}
        contentPaddingTop={0}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderSection('Personal Information', (
            <>
              <View style={styles.nameRow}>
                {renderInput('First Name', 'first_name', { flex: 1 })}
                {renderInput('Last Name', 'last_name', { flex: 1 })}
              </View>
              {renderInput('Bio', 'bio', {
                multiline: true,
                placeholder: 'Tell us about yourself...',
                maxLength: 500,
              })}
            </>
          ))}

          {renderSection('Appearance', (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Background Color</Text>
              <View style={styles.hueDisplay}>
                <Text style={styles.hueValue}>{formData.background_hue}°</Text>
              </View>
              <View style={styles.sliderContainer}>
                <LinearGradient
                  colors={[
                    `hsl(0, 100%, 50%)`,
                    `hsl(60, 100%, 50%)`,
                    `hsl(120, 100%, 50%)`,
                    `hsl(180, 100%, 50%)`,
                    `hsl(240, 100%, 50%)`,
                    `hsl(300, 100%, 50%)`,
                    `hsl(360, 100%, 50%)`,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.spectrumGradient}
                />
                <Slider
                  style={styles.slider}
                  value={formData.background_hue}
                  onValueChange={(value) => handleInputChange('background_hue', Math.round(value))}
                  minimumValue={0}
                  maximumValue={360}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                  tapToSeek={true}
                  thumbSize={24}
                />
              </View>
            </View>
          ))}

          {renderSection('Social Media Links', (
            <>
              {renderInput('Snapchat', 'snapchat_handle', {
                placeholder: '@username or username',
                helper: 'Enter your Snapchat handle (@ optional)',
              })}
              {renderInput('LinkedIn', 'linkedin_url', {
                placeholder: 'www.linkedin.com/in/yourname',
                helper: 'Must start with www.linkedin.com/in/ or https://www.linkedin.com/in/',
              })}
              {renderInput('Instagram', 'instagram_handle', {
                placeholder: '@username or username',
                helper: 'Enter your Instagram handle (@ optional)',
              })}
            </>
          ))}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                void triggerSuccessHaptic();
                handleSave();
              }}
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
    marginTop: HEADER_HEIGHT,
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
    padding: 10,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#282f3bff',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f2f2f2',
    borderWidth: 0,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  hueDisplay: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  hueValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  slider: {
    width: '100%',
    height: 10,
    position: 'absolute',
    zIndex: 10,
  },
  sliderContainer: {
    position: 'relative',
    width: '100%',
    height: 10,
  },
  spectrumGradient: {
    width: '100%',
    height: 10,
    borderRadius: 8,
    position: 'absolute',
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
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
    color: '#374151',
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
