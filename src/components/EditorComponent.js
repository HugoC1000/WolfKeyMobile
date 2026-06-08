import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Image, Text, Alert, FlatList, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { globalStyles } from '../utils/styles';
import api from '../api/config';
import { getFullImageUrl } from '../api/config';
import { flattenMentionSuggestions, searchMentionSuggestions } from '../api/mentionService';


const EditorComponent = ({ onSave, initialContent = '', placeholder = 'Write your content here...' }) => {
  const [content, setContent] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [activeMention, setActiveMention] = useState(null);
  const [mentionResults, setMentionResults] = useState([]);
  const [isSearchingMentions, setIsSearchingMentions] = useState(false);
  const mentionRequestId = useRef(0);

  // Parse initialContent when component mounts or initialContent changes
  useEffect(() => {
    if (initialContent) {
      if (typeof initialContent === 'string') {
        // If it's a string, use it directly
        setContent(initialContent);
        setSelection({ start: initialContent.length, end: initialContent.length });
      } else if (initialContent.blocks && Array.isArray(initialContent.blocks)) {
        // If it's EditorJS format, parse it
        const textBlocks = [];
        const imageBlocks = [];
        
        initialContent.blocks.forEach(block => {
          if (block.type === 'paragraph' && block.data?.text) {
            textBlocks.push(block.data.text);
          } else if (block.type === 'image' && block.data?.file?.url) {
            // Add ID if it doesn't exist for existing images
            const imageBlock = {
              ...block,
              id: block.id || Date.now() + Math.random()
            };
            imageBlocks.push(imageBlock);
          }
        });
        
        setContent(textBlocks.join('\n'));
        setBlocks(imageBlocks);
                const initialText = textBlocks.join('\n');
                setSelection({ start: initialText.length, end: initialText.length });
      }
    }
  }, [initialContent]);

  // Real-time content updates
  useEffect(() => {
    updateContent(blocks, false);
  }, [content, blocks]);

  const mentionLabel = useCallback((item) => {
    if (!item) return '';

    if (item.type === 'everyone') {
      return '@everyone';
    }

    if (item.type === 'course') {
      return `#${item.name || ''}`.trim();
    }

    return `@${item.username || ''}`.trim();
  }, []);

  const mentionSubtitle = useCallback((item) => {
    if (!item) return '';

    if (item.type === 'everyone') {
      return 'Notify everyone';
    }

    if (item.type === 'course') {
      return item.category || 'Course';
    }

    return item.full_name || item.username || 'User';
  }, []);

  const resolveMentionContext = useCallback((text, cursorPosition) => {
    if (typeof text !== 'string' || !text.length) {
      return null;
    }

    const cursor = Math.max(0, Math.min(cursorPosition ?? text.length, text.length));
    const textBeforeCursor = text.slice(0, cursor);
    const match = textBeforeCursor.match(/(^|\s)([@#])([^\s@#]*)$/);

    if (!match) {
      return null;
    }

    const fullMatch = match[0] || '';
    const trigger = match[2] || '@';
    const query = match[3] || '';
    const triggerStart = cursor - fullMatch.length + (match[1] ? match[1].length : 0);

    return {
      trigger,
      query,
      start: Math.max(0, triggerStart),
      end: cursor,
    };
  }, []);

  useEffect(() => {
    const context = resolveMentionContext(content, selection.end);
    setActiveMention(context);
  }, [content, selection, resolveMentionContext]);

  useEffect(() => {
    if (!activeMention || !activeMention.query.trim()) {
      setMentionResults([]);
      setIsSearchingMentions(false);
      return undefined;
    }

    let isActive = true;
    const query = activeMention.query.trim();

    const timeoutId = setTimeout(async () => {
      const requestId = mentionRequestId.current + 1;
      mentionRequestId.current = requestId;
      setIsSearchingMentions(true);

      try {
        const response = await searchMentionSuggestions(query, 5);
        if (isActive && requestId === mentionRequestId.current) {
          const flattenedResults = flattenMentionSuggestions(response);
          const filteredResults = activeMention?.trigger === '#'
            ? flattenedResults.filter((item) => item.type === 'course')
            : flattenedResults.filter((item) => item.type !== 'course');

          setMentionResults(filteredResults);
        }
      } catch (error) {
        if (isActive && requestId === mentionRequestId.current) {
          setMentionResults([]);
        }
        console.error('Mention autocomplete error:', error);
      } finally {
        if (isActive && requestId === mentionRequestId.current) {
          setIsSearchingMentions(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [activeMention]);

  const handleSelectMention = useCallback((item) => {
    if (!activeMention) return;

    const replacementText = mentionLabel(item);

    if (!replacementText) return;

    const nextText = `${content.slice(0, activeMention.start)}${replacementText} ${content.slice(activeMention.end)}`;
    const nextCursor = activeMention.start + replacementText.length + 1;

    setContent(nextText);
    setSelection({ start: nextCursor, end: nextCursor });
    setMentionResults([]);
    setIsSearchingMentions(false);
  }, [activeMention, content, mentionLabel]);

  const renderMentionItem = useCallback(({ item }) => {
    const iconName = item.type === 'course' ? 'school' : item.type === 'everyone' ? 'campaign' : 'person';
    const displayName = (() => {
      if (item.type === 'course') return item.name || item.full_name || item.username || '';
      if (item.type === 'everyone') return '@everyone';
      const first = item.first_name || '';
      const last = item.last_name || '';
      const combined = `${first} ${last}`.trim();
      if (combined) return combined;
      return item.full_name || item.username || '';
    })();

    return (
      <Pressable
        style={({ pressed }) => [
          styles.mentionItem,
          pressed && styles.mentionItemPressed,
        ]}
        onPress={() => handleSelectMention(item)}
      >
        <View style={styles.mentionIconWrap}>
          <MaterialIcons name={iconName} size={18} color="#2563EB" />
        </View>
        <View style={styles.mentionTextWrap}>
          <Text style={styles.mentionLabel}>{displayName}</Text>
        </View>
        <Text style={styles.mentionType}>{item.group}</Text>
      </Pressable>
    );
  }, [handleSelectMention, mentionLabel, mentionSubtitle]);

  const mentionResultsEmptyLabel = useMemo(() => {
    if (!activeMention?.query?.trim()) {
      return 'Start typing to search mentions';
    }

    return `No matches for "${activeMention.query.trim()}"`;
  }, [activeMention]);

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
        id: Date.now(), // Add unique ID for easy removal
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

  const removeImage = (blockId) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedBlocks = blocks.filter(block => block.id !== blockId);
            setBlocks(updatedBlocks);
            updateContent(updatedBlocks);
          }
        },
      ]
    );
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
    const nextSelection = selection.end > text.length
      ? { start: text.length, end: text.length }
      : selection;
    const context = resolveMentionContext(text, nextSelection.end);
    setActiveMention(context);
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
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        selection={selection}
        onBlur={handleSubmit} 
        placeholder={placeholder}
        textAlignVertical="top"
      />

      {activeMention && (mentionResults.length > 0 || isSearchingMentions) && (
        <View style={styles.mentionSuggestionsContainer}>
            {isSearchingMentions ? (
              <Text style={styles.mentionLoadingText}>Searching suggestions...</Text>
            ) : (
              <View>
                {mentionResults.length > 0 ? (
                  mentionResults.map((item) => (
                    <React.Fragment key={`${item.type}-${item.id ?? item.username ?? item.name ?? item.full_name}`}>
                      {renderMentionItem({ item })}
                    </React.Fragment>
                  ))
                ) : (
                  <Text style={styles.mentionEmptyText}>{mentionResultsEmptyLabel}</Text>
                )}
              </View>
            )}
          </View>
      )}
      
      {blocks.map((block, index) => (
        block.type === 'image' && (
          <View key={block.id || index} style={styles.imageContainer}>
            <Image source={{ uri: getFullImageUrl(block.data.file?.url) || getFullImageUrl(block.data.url) }} style={styles.image} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => removeImage(block.id || index)}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )
      ))}

      <TouchableOpacity 
        style={[styles.addImageButton, isUploading && styles.addImageButtonDisabled]} 
        onPress={pickImage}
        disabled={isUploading}
      >
        <MaterialIcons name="add-photo-alternate" size={20} color={isUploading ? "#9CA3AF" : "#2563EB"} />
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
    padding: 6,
    position: 'relative',
  },
  editor: {
    ...globalStyles.regularText,
    minHeight: 40,
  },
  mentionSuggestionsContainer: {
    position: 'absolute',
    top: 44,
    left: 12,
    width: 320,
    maxHeight: 200,
    zIndex: 999,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  mentionSuggestionsHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mentionSuggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  mentionSuggestionsHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  mentionLoadingText: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: '#6B7280',
    fontSize: 13,
  },
  mentionEmptyText: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: '#6B7280',
    fontSize: 13,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    backgroundColor: '#FFFFFF',
  },
  mentionItemPressed: {
    backgroundColor: '#F3F4F6',
  },
  mentionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  mentionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  mentionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  mentionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  mentionType: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginLeft: 8,
  },
  imageContainer: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    backgroundColor: '#f5f5f5',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    marginTop: 0,
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
