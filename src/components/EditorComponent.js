import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Image, Text, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { globalStyles } from '../utils/styles';
import api from '../api/config';
import { getFullImageUrl } from '../api/config';


const EditorComponent = ({ onSave, initialContent = '', placeholder = 'Write your content here...', onClearRef }) => {
  const [content, setContent] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const clearContent = useCallback(() => {
    setContent('');
    setBlocks([]);
    if (typeof onSave === 'function') {
      onSave({
        time: new Date().getTime(),
        blocks: [],
        version: '2.27.2'
      });
    }
  }, [onSave]);

  useEffect(() => {
    if (onClearRef && typeof onClearRef === 'function') {
      onClearRef(clearContent);
    }
  }, [onClearRef, clearContent]);

  // Parse initialContent when component mounts or initialContent changes
  useEffect(() => {
    if (initialContent) {
      if (typeof initialContent === 'string') {
        // If it's a string, use it directly
        setContent(initialContent);
      } else if (initialContent.blocks && Array.isArray(initialContent.blocks)) {
        // If it's EditorJS format, parse it
        const textBlocks = [];
        const imageBlocks = [];
        
        initialContent.blocks.forEach(block => {
          if (block.type === 'paragraph' && block.data?.text) {
            textBlocks.push(block.data.text);
          } else if (block.type === 'image' && block.data?.file?.url) {
            imageBlocks.push(block);
          }
        });
        
        setContent(textBlocks.join('\n'));
        setBlocks(imageBlocks);
      }
    }
  }, [initialContent]);

  // Real-time content updates
  useEffect(() => {
    updateContent(blocks, false);
  }, [content, blocks]);

  const uploadImage = async (imageUri) => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      });

      const response = await api.post('/upload-image/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success === 1) {
        return response.data.file.url;
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  };

  const pickImage = async () => {
    try {
      Alert.alert(
        'Add Image',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Choose from Gallery', onPress: selectFromGallery },
          { text: 'Take Photo', onPress: takePhoto },
        ]
      );
    } catch (error) {
      console.error('Error showing image options:', error);
      Alert.alert('Error', 'Failed to show image options');
    }
  };

  const selectFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission required', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleImageUpload = async (imageAsset) => {
    setIsUploading(true);
    
    try {
      const uploadedUrl = await uploadImage(imageAsset.uri);

      console.log("Uploaded url: ", uploadedUrl);
      
      const newBlock = {
        type: 'image',
        data: {
          file: {
            url: uploadedUrl,
          },
          caption: '',
          withBorder: false,
          withBackground: false,
          stretched: false
        }
      };
      
      const updatedBlocks = [...blocks, newBlock];
      setBlocks(updatedBlocks);
      
      await updateContent(updatedBlocks);
    } catch (uploadError) {
      console.error('Failed to upload image:', uploadError);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const updateContent = async (currentBlocks = blocks, shouldValidate = false) => {
    try {
      const textContent = content || '';
      
      const paragraphBlocks = textContent
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => ({
          type: 'paragraph',
          data: {
            text: line.trim()
          }
        }));

      const editorData = {
        time: new Date().getTime(),
        blocks: [
          ...paragraphBlocks,
          ...currentBlocks.map(block => ({
            type: 'image',
            data: {
              file: {
                url: block.data.file?.url || block.data.url
              },
              caption: block.data.caption || '',
              withBorder: false,
              withBackground: false,
              stretched: false
            }
          }))
        ],
        version: '2.27.2'
      };

      if (shouldValidate && !(textContent.trim()) && currentBlocks.length === 0) {
        throw new Error('Content cannot be empty');
      }
      
      if (typeof onSave === 'function') {
        await onSave(editorData);
      }
    } catch (error) {
      console.error('Error updating content:', error);
      if (shouldValidate) {
        Alert.alert('Error', error.message || 'Failed to update content');
      }
    }
  };
  
  const handleContentChange = (text) => {
    setContent(text);
  };

  const handleSubmit = () => {
    updateContent(blocks, true);
  };

  const getMimeType = (uri) => {
    const ext = uri.split('.').pop().toLowerCase();
    const types = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    };
    return types[ext] || 'image/jpeg';
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.editor}
        multiline
        value={content}
        onChangeText={handleContentChange}
        onBlur={handleSubmit} 
        placeholder={placeholder}
        textAlignVertical="top"
      />
      
      {blocks.map((block, index) => (
        block.type === 'image' && (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: getFullImageUrl(block.data.file?.url) || getFullImageUrl(block.data.url) }} style={styles.image} />
          </View>
        )
      ))}

      <TouchableOpacity 
        style={[styles.addImageButton, isUploading && styles.addImageButtonDisabled]} 
        onPress={pickImage}
        disabled={isUploading}
      >
        <MaterialIcons name="add-photo-alternate" size={24} color={isUploading ? "#9CA3AF" : "#2563EB"} />
        <Text style={[styles.addImageText, isUploading && styles.addImageTextDisabled]}>
          {isUploading ? 'Uploading...' : 'Add Image'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  editor: {
    ...globalStyles.regularText,
    minHeight: 50,
  },
  imageContainer: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addImageButtonDisabled: {
    borderColor: '#9CA3AF',
    opacity: 0.6,
  },
  addImageText: {
    marginLeft: 8,
    color: '#2563EB',
    fontWeight: '500',
  },
  addImageTextDisabled: {
    color: '#9CA3AF',
  }
});

export default EditorComponent;
