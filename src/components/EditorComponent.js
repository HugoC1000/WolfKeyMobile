import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Image, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { globalStyles } from '../utils/styles';

const EditorComponent = ({ onSave, initialContent = '', placeholder = 'Write your content here...' }) => {
  const [content, setContent] = useState(initialContent);
  const [blocks, setBlocks] = useState([]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const newBlock = {
        type: 'image',
        data: {
          url: result.assets[0].uri,
          caption: ''
        }
      };
      setBlocks([...blocks, newBlock]);
      updateContent();
    }
  };

  const updateContent = () => {
    // Create EditorJS compatible format
    const editorData = {
      time: new Date().getTime(),
      blocks: [
        // Add text block
        {
          type: 'paragraph',
          data: {
            text: content
          }
        },
        // Add image blocks
        ...blocks.map(block => ({
          type: 'image',
          data: {
            url: block.data.url,
            caption: block.data.caption || '',
            withBorder: false,
            withBackground: false,
            stretched: false
          }
        }))
      ],
      version: '2.27.2'
    };

    // Create FormData object
    const formData = new FormData();
    formData.append('content', JSON.stringify(editorData));
    
    // Append actual image files
    blocks.forEach((block, index) => {
      if (block.type === 'image') {
        const fileName = block.data.url.split('/').pop();
        formData.append(`image_${index}`, {
          uri: block.data.url,
          type: 'image/jpeg',
          name: fileName || `image_${index}.jpg`
        });
      }
    });

    if (onSave) {
      onSave(formData);
    }
  };
  
  const handleContentChange = (text) => {
    setContent(text);
    updateContent();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.editor}
        multiline
        value={content}
        onChangeText={handleContentChange}
        placeholder={placeholder}
        textAlignVertical="top"
      />
      
      {blocks.map((block, index) => (
        block.type === 'image' && (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: block.data.url }} style={styles.image} />
          </View>
        )
      ))}

      <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
        <MaterialIcons name="add-photo-alternate" size={24} color="#2563EB" />
        <Text style={styles.addImageText}>Add Image</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
  },
  editor: {
    ...globalStyles.regularText,
    minHeight: 180,
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
  addImageText: {
    marginLeft: 8,
    color: '#2563EB',
    fontWeight: '500',
  }
});

export default EditorComponent;
