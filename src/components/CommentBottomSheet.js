import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import EditorComponent from './EditorComponent';
import { globalStyles } from '../utils/styles';
import { createComment, editComment } from '../api/commentService';

const CommentBottomSheet = ({ 
  isVisible, 
  onClose, 
  solutionId, 
  parentComment = null, 
  editingComment = null,
  onCommentSubmitted 
}) => {
  const [content, setContent] = useState(editingComment?.content || '');
  const [currentSnapIndex, setCurrentSnapIndex] = useState(1); // Track current snap point

  React.useEffect(() => {
    if (editingComment) {
      setContent(editingComment.content || '');
    } else {
      setContent('');
    }
  }, [editingComment]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomSheetRef = useRef(null);

  const snapPoints = useMemo(() => ['16%', '50%', '75%'], []);

  const handleSheetChanges = useCallback((index) => {
    setCurrentSnapIndex(index);
  }, []);

  const handleSubmit = async () => {
    if (!isContentValid()) {
      Alert.alert('Error', 'Please enter some content for your comment.');
      return;
    }

    setIsSubmitting(true);
    try {
      let result;
      
      const contentToSubmit = typeof content === 'string' 
        ? {
            time: new Date().getTime(),
            blocks: [{
              type: 'paragraph',
              data: { text: content.trim() }
            }],
            version: '2.27.2'
          }
        : content;
      
      if (editingComment) {
        result = await editComment(editingComment.id, contentToSubmit);
      } else {
        result = await createComment(solutionId, contentToSubmit, parentComment?.id);
      }
      
      onCommentSubmitted?.(result);
      setContent('');
      onClose();
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert(
        'Error', 
        `Failed to ${editingComment ? 'update' : 'create'} comment. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent(editingComment?.content || '');
    onClose();
  };

  const handleHeaderTap = () => {
    if (currentSnapIndex === 0) {
      bottomSheetRef.current?.snapToIndex(1);
    }
  };

  // Helper function to check if content is valid
  const isContentValid = () => {
    if (!content) return false;
    
    if (typeof content === 'string') {
      return content.trim().length > 0;
    }
    
    if (content.blocks && Array.isArray(content.blocks)) {
      return content.blocks.some(block => {
        if (block.type === 'paragraph' && block.data?.text) {
          return block.data.text.trim().length > 0;
        }
        if (block.type === 'image' && block.data?.file?.url) {
          return true;
        }
        return false;
      });
    }
    
    return false;
  };

  const getTitle = () => {
    if (editingComment) return 'Edit Comment';
    if (parentComment) return `Reply to ${parentComment.author.first_name || parentComment.author.username}`;
    return 'Add Comment';
  };

  const getParentCommentText = () => {
    if (!parentComment?.content?.blocks?.length) return 'Original comment';
    
    const firstBlock = parentComment.content.blocks[0];
    if (firstBlock.type === 'paragraph' && firstBlock.data?.text) {
      return firstBlock.data.text;
    }
    return 'Original comment';
  };

  React.useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={false}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <TouchableOpacity 
            style={styles.header} 
            onPress={handleHeaderTap}
            activeOpacity={currentSnapIndex === 0 ? 0.7 : 1}
            disabled={currentSnapIndex !== 0}
          >
            <View style={styles.headerLeft}>
              <Text style={styles.title}>{getTitle()}</Text>
              {parentComment && (
                <Text style={styles.replyTo} numberOfLines={2}>
                  "{getParentCommentText()}"
                </Text>
              )}
              {/* Show tap to expand hint when minimized */}
              {currentSnapIndex === 0 && (
                <Text style={styles.expandHint}>Tap to expand</Text>
              )}
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Content Editor - always mounted but conditionally visible */}
          <View style={[styles.editorContainer, currentSnapIndex === 0 && styles.hiddenEditor]}>
            <EditorComponent
              onSave={setContent}
              initialContent={editingComment?.content || ''}
              placeholder={parentComment ? 'Write your reply...' : 'Write your comment...'}
            />
          </View>

          {/* Footer Actions - only show when not minimized */}
          {currentSnapIndex > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.submitButton, 
                  (!isContentValid() || isSubmitting) && styles.submitButtonDisabled
                ]} 
                onPress={handleSubmit}
                disabled={!isContentValid() || isSubmitting}
              >
                <Text style={[
                  styles.submitButtonText,
                  (!isContentValid() || isSubmitting) && styles.submitButtonTextDisabled
                ]}>
                  {isSubmitting ? 'Submitting...' : editingComment ? 'Update' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handleIndicator: {
    backgroundColor: '#ddd',
    width: 40,
    height: 4,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 70,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 30,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1b',
    marginBottom: 4,
  },
  replyTo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  expandHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 4,
  },
  editorContainer: {
    flex: 1,
  },
  hiddenEditor: {
    position: 'absolute',
    left: -10000,
    opacity: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
    backgroundColor: 'white',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
});

export default CommentBottomSheet;
