import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GlassView } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import BackgroundSvg from '../components/BackgroundSVG';
import SharedHeader from '../components/SharedHeader';
import { uploadLunchCard, getCurrentProfile } from '../api/profileService';
import { getFullImageUrl } from '../api/config';
import { useUser } from '../context/userContext';
import * as Device from 'expo-device';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' 
  ? (Device.modelName === 'iPhone SE' ? 0 : 44)
  : StatusBar.currentHeight || 0;
const HEADER_HEIGHT = 45;

const LunchCardScreen = () => {
  const navigation = useNavigation();
  const { user } = useUser();
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingLunchCard, setExistingLunchCard] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Gesture values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetGestures = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    rotation.value = withSpring(0);
    savedRotation.value = 0;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant gallery permissions to choose a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setImage(selectedImage);
        await uploadImage(selectedImage);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera permissions to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setImage(selectedImage);
        await uploadImage(selectedImage);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Lunch Card Photo',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Take Photo', onPress: takePhoto },
      ]
    );
  };

  const uploadImage = async (imageData) => {
    setUploading(true);
    try {
      const imageToUpload = {
        uri: Platform.OS === 'ios' ? imageData.uri.replace('file://', '') : imageData.uri,
        type: imageData.type || 'image/jpeg',
        fileName: imageData.fileName || `lunch_card_${Date.now()}.jpg`,
      };

      await uploadLunchCard(imageToUpload);
      Alert.alert('Success', 'Lunch card uploaded successfully!', [
        {
          text: 'OK',
        },
      ]);
    } catch (error) {
      console.error('Error uploading lunch card:', error);
      Alert.alert('Error', 'Failed to upload lunch card. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRetakePhoto = () => {
    showImagePickerOptions();
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Fetch existing lunch card on mount
  React.useEffect(() => {
    const fetchLunchCard = async () => {
      try {
        setLoading(true);
        const profile = await getCurrentProfile();
        if (profile?.userprofile?.lunch_card) {
          const lunchCardUrl = getFullImageUrl(profile.userprofile.lunch_card);
          console.log(lunchCardUrl);
          setExistingLunchCard(lunchCardUrl);
          console.log("Set lunch card");
          setImage({ uri: lunchCardUrl });
        }
      } catch (error) {
        console.error('Error fetching lunch card:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLunchCard();
  }, []);

  console.log(user.userprofile);

  return (
    <View style={styles.container}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="dark-content" 
      />
      <BackgroundSvg hue={user.userprofile.background_hue} />
      
      <SharedHeader title="Lunch Card" isHome={false} />

      {/* Image Display */}
      <View style={styles.imageContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#0A84FF" />
        ) : image ? (
          <TouchableOpacity 
            onPress={() => setIsExpanded(true)} 
            activeOpacity={0.9}
            style={styles.imageTouchable}
          >
            <Image source={image} style={styles.image} resizeMode="contain" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="images-outline" size={80} color="#999" />
            <Text style={styles.placeholderText}>Choose or take a photo of your lunch card</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {!loading && (
        <View style={styles.buttonContainer}>
          <GlassView glassEffectStyle="clear" style={styles.glassButton} isInteractive>
            <TouchableOpacity
              onPress={handleRetakePhoto}
              style={styles.button}
              disabled={uploading}
            >
              <Ionicons name="image-outline" size={24} color="#000" />
              <Text style={styles.buttonText}>Change Photo</Text>
            </TouchableOpacity>
          </GlassView>
        </View>
      )}

      {/* Loading Indicator */}
      {uploading && (
        <View style={styles.loadingOverlay}>
          <GlassView glassEffectStyle="regular" style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A84FF" />
            <Text style={styles.loadingText}>Uploading...</Text>
          </GlassView>
        </View>
      )}

      {/* Expanded Image Modal */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsExpanded(false);
          resetGestures();
        }}
      >
        <GestureHandlerRootView style={styles.expandedContainer}>
          <StatusBar barStyle="light-content" />
          <View style={styles.expandedBackdrop}>
            <ExpandedImageViewer 
              image={image}
              scale={scale}
              savedScale={savedScale}
              rotation={rotation}
              savedRotation={savedRotation}
              translateX={translateX}
              translateY={translateY}
              savedTranslateX={savedTranslateX}
              savedTranslateY={savedTranslateY}
              onClose={() => {
                setIsExpanded(false);
                resetGestures();
              }}
            />
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
};

const ExpandedImageViewer = ({ 
  image, 
  scale, 
  savedScale, 
  rotation, 
  savedRotation,
  translateX,
  translateY,
  savedTranslateX,
  savedTranslateY,
  onClose 
}) => {
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotationGesture = Gesture.Rotation()
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, rotationGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${rotation.value}rad` },
    ],
  }));

  return (
    <>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.imageWrapper, animatedStyle]}>
          <Image 
            source={image} 
            style={styles.expandedImage} 
            resizeMode="contain" 
          />
        </Animated.View>
      </GestureDetector>
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={onClose}
      >
        <Ionicons name="close-circle" size={40} color="#fff" />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_HEIGHT + HEADER_HEIGHT + 20,
    paddingBottom: 20,
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: 16,
  },
  glassButton: {
    borderRadius: 99,
    overflow: 'hidden',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  loadingContainer: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  expandedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  expandedBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 1,
  },
});

export default LunchCardScreen;
