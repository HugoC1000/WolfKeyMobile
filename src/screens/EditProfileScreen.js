import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useUser } from '../context/userContext';
import BackgroundSvg from '../components/BackgroundSVG';
import ScrollableScreenWrapper from '../components/ScrollableScreenWrapper';
import ScreenHeaderSpacer from '../components/ScreenHeaderSpacer';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { updateProfile, getCurrentProfile } from '../api/profileService';

const PREFERRED_CONTACT_APPS = [
  'Instagram',
  'LinkedIn',
  'Snapchat',
  'Email',
  'Discord',
];

const EditProfileScreen = () => {
  const params = useLocalSearchParams();
  const rawSection = params?.section;
  const section = Array.isArray(rawSection) ? rawSection[0] : rawSection;
  const showPersonalSection = !section || section === 'personal';
  const showSocialSection = !section || section === 'social';
  const screenTitle = section === 'social' ? 'Social Media' : 'Personal Information';
  const { height: windowHeight } = useWindowDimensions();
  const { user, updateUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isReadyToSave, setIsReadyToSave] = useState(false);
  const [isContactAppMenuOpen, setIsContactAppMenuOpen] = useState(false);
  const lastSavedFormRef = useRef('');
  const savingFormRef = useRef('');
  const contactAppTriggerRef = useRef(null);
  const [contactAppMenuAnchor, setContactAppMenuAnchor] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    background_hue: 220,
    snapchat_handle: '',
    linkedin_url: '',
    instagram_handle: '',
    preferred_msg_app: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const profileData = await getCurrentProfile();
      setProfile(profileData);

      const profileDataObj = profileData.userprofile || profileData;
      const nextFormData = {
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        bio: profileDataObj?.bio || '',
        background_hue: profileDataObj?.background_hue ?? 220,
        snapchat_handle: extractHandle(profileDataObj?.snapchat_url, 'snapchat') || '',
        linkedin_url: profileDataObj?.linkedin_url || '',
        instagram_handle: extractHandle(profileDataObj?.instagram_url, 'instagram') || '',
        preferred_msg_app: profileDataObj?.preferred_msg_app || '',
      };
      setFormData(nextFormData);
      lastSavedFormRef.current = JSON.stringify(nextFormData);
      setIsReadyToSave(true);
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

  const buildUpdateData = (nextFormData) => {
    const snapchatHandle = nextFormData.snapchat_handle.replace(/^@/, '');
    const instagramHandle = nextFormData.instagram_handle.replace(/^@/, '');

    return {
      first_name: nextFormData.first_name,
      last_name: nextFormData.last_name,
      bio: nextFormData.bio,
      background_hue: nextFormData.background_hue,
      snapchat_handle: snapchatHandle,
      linkedin_url: nextFormData.linkedin_url,
      instagram_handle: instagramHandle,
      ...(nextFormData.preferred_msg_app && {
        preferred_msg_app: nextFormData.preferred_msg_app,
      }),
    };
  };

  const persistFormData = async (nextFormData) => {
    const serializedForm = JSON.stringify(nextFormData);
    if (
      serializedForm === lastSavedFormRef.current ||
      serializedForm === savingFormRef.current
    ) {
      return;
    }

    if (
      nextFormData.linkedin_url &&
      !validateLinkedInUrl(nextFormData.linkedin_url)
    ) {
      return;
    }

    savingFormRef.current = serializedForm;

    try {
      await updateProfile(buildUpdateData(nextFormData));
      const snapchatHandle = nextFormData.snapchat_handle.replace(/^@/, '');
      const instagramHandle = nextFormData.instagram_handle.replace(/^@/, '');

      await updateUser({
        first_name: nextFormData.first_name,
        last_name: nextFormData.last_name,
        userprofile: {
          ...(user?.userprofile || {}),
          bio: nextFormData.bio,
          background_hue: nextFormData.background_hue,
          snapchat_url: snapchatHandle
            ? `https://www.snapchat.com/add/${snapchatHandle}`
            : '',
          linkedin_url: nextFormData.linkedin_url,
          instagram_url: instagramHandle
            ? `https://www.instagram.com/${instagramHandle}`
            : '',
          preferred_msg_app: nextFormData.preferred_msg_app,
        },
      });

      lastSavedFormRef.current = serializedForm;
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      if (savingFormRef.current === serializedForm) {
        savingFormRef.current = '';
      }
    }
  };

  const handlePreferredAppChange = (app) => {
    const nextFormData = {
      ...formData,
      preferred_msg_app: app,
    };
    setFormData(nextFormData);
    void persistFormData(nextFormData);
  };

  const handleContactAppMenuPress = () => {
    if (isContactAppMenuOpen) {
      setIsContactAppMenuOpen(false);
      return;
    }

    contactAppTriggerRef.current?.measureInWindow((x, y, width, height) => {
      setContactAppMenuAnchor({ x, y, width, height });
      setIsContactAppMenuOpen(true);
    });
  };

  useEffect(() => {
    if (!isReadyToSave) return undefined;

    const serializedForm = JSON.stringify(formData);
    if (serializedForm === lastSavedFormRef.current) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      void persistFormData(formData);
    }, 900);

    return () => clearTimeout(timeoutId);
  }, [formData, isReadyToSave]);

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
        onBlur={() => {
          void persistFormData(formData);
        }}
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
      {options.error && (
        <Text style={styles.inputErrorText}>{options.error}</Text>
      )}
    </View>
  );

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <ScrollableScreenWrapper title={screenTitle}>
          <View style={styles.loadingScreen}>
            <ScreenHeaderSpacer />
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          </View>
        </ScrollableScreenWrapper>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundSvg hue={formData.background_hue} />
      <ScrollableScreenWrapper 
        title={screenTitle}
        backgroundHue={formData.background_hue}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeaderSpacer />
          {showPersonalSection && renderSection('Personal Information', (
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

          {showSocialSection && renderSection('Social Media Links', (
            <>
              {renderInput('Snapchat', 'snapchat_handle', {
                placeholder: '@username or username',
                helper: 'Enter your Snapchat handle (@ optional)',
              })}
              {renderInput('LinkedIn', 'linkedin_url', {
                placeholder: 'www.linkedin.com/in/yourname',
                helper: 'Must start with www.linkedin.com/in/ or https://www.linkedin.com/in/',
                error:
                  formData.linkedin_url && !validateLinkedInUrl(formData.linkedin_url)
                    ? 'Enter a valid LinkedIn URL to save.'
                    : '',
              })}
              {renderInput('Instagram', 'instagram_handle', {
                placeholder: '@username or username',
                helper: 'Enter your Instagram handle (@ optional)',
              })}
            </>
          ))}

          {showSocialSection && renderSection('Preferred Contact App', (
            <View style={[styles.inputContainer, styles.contactAppDropdownContainer]}>
              <Text style={styles.helperText}>
                Choose the app people should use to contact you.
              </Text>
              <TouchableOpacity
                ref={contactAppTriggerRef}
                style={styles.contactAppDropdownTrigger}
                onPress={handleContactAppMenuPress}
                accessibilityRole="button"
                accessibilityLabel="Preferred contact app"
                accessibilityState={{ expanded: isContactAppMenuOpen }}
              >
                <Text
                  style={[
                    styles.contactAppDropdownValue,
                    !formData.preferred_msg_app && styles.contactAppDropdownPlaceholder,
                  ]}
                >
                  {formData.preferred_msg_app || 'Select an app'}
                </Text>
                <MaterialIcons
                  name={isContactAppMenuOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>

            </View>
          ))}

          <View style={styles.formFooter} />
        </ScrollView>
      </ScrollableScreenWrapper>

      <Modal
        visible={isContactAppMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsContactAppMenuOpen(false)}
      >
        <Pressable
          style={styles.contactAppModalOverlay}
          onPress={() => setIsContactAppMenuOpen(false)}
        >
          {contactAppMenuAnchor && (
            <GlassView
              style={[
                styles.contactAppDropdownMenu,
                {
                  left: contactAppMenuAnchor.x,
                  top:
                    contactAppMenuAnchor.y +
                      contactAppMenuAnchor.height +
                      8 +
                      PREFERRED_CONTACT_APPS.length * 42 +
                      12 >
                    windowHeight
                      ? Math.max(
                          12,
                          contactAppMenuAnchor.y -
                            PREFERRED_CONTACT_APPS.length * 42 -
                            20
                        )
                      : contactAppMenuAnchor.y + contactAppMenuAnchor.height + 8,
                  width: contactAppMenuAnchor.width,
                },
              ]}
              glassEffectStyle="regular"
              isInteractive
            >
              {PREFERRED_CONTACT_APPS.map((app) => {
                const isSelected = formData.preferred_msg_app === app;

                return (
                  <TouchableOpacity
                    key={app}
                    style={[
                      styles.contactAppDropdownOption,
                      isSelected && styles.contactAppDropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setIsContactAppMenuOpen(false);
                      handlePreferredAppChange(app);
                    }}
                    accessibilityRole="menuitem"
                  >
                    <Text
                      style={[
                        styles.contactAppDropdownOptionText,
                        isSelected && styles.contactAppDropdownOptionTextSelected,
                      ]}
                    >
                      {app}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check" size={19} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </GlassView>
          )}
        </Pressable>
      </Modal>
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
  },
  loadingScreen: {
    flex: 1,
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
  inputErrorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#DC2626',
  },
  contactAppDropdownTrigger: {
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactAppDropdownContainer: {
    position: 'relative',
  },
  contactAppDropdownValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  contactAppDropdownPlaceholder: {
    color: '#6B7280',
    fontWeight: '500',
  },
  contactAppDropdownMenu: {
    position: 'absolute',
    padding: 6,
    borderRadius: 14,
    overflow: 'hidden',
    zIndex: 30,
    elevation: 12,
  },
  contactAppModalOverlay: {
    flex: 1,
  },
  contactAppDropdownOption: {
    minHeight: 42,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 9,
  },
  contactAppDropdownOptionSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  contactAppDropdownOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  contactAppDropdownOptionTextSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
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
  formFooter: {
    height: 32,
  },
});

export default EditProfileScreen;
