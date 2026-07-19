import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import BottomSheet, { BottomSheetView, INITIAL_CONTAINER_LAYOUT } from '@gorhom/bottom-sheet';
import { useSharedValue } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import ReplyEditor from './ReplyEditor';
import { globalStyles } from '../utils/styles';
import { createComment, editComment } from '../api/commentService';
import api from '../api/config';
import { triggerPressHaptic, triggerSuccessHaptic } from '../utils/haptics';

const CommentBottomSheet = ({ 
  isVisible, 
  mode = 'solution',
  postId,
  canSubmitSolution = true,
  onClose, 
  solutionId, 
  parentComment = null, 
  editingComment = null,
  onSubmitted,
}) => {
  const [content, setContent] = useState(editingComment?.content || '');
  const [currentSnapIndex, setCurrentSnapIndex] = useState(0);
  const [editorKey, setEditorKey] = useState(0);
  const containerLayoutState = useSharedValue(INITIAL_CONTAINER_LAYOUT);

  React.useEffect(() => {
    if (editingComment) {
      setContent(editingComment.content || '');
    } else {
      setContent('');
    }
  }, [editingComment, mode]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomSheetRef = useRef(null);

  const snapPoints = useMemo(() => ['20%', '50%', '75%', '85%'], []);

  const handleSheetChanges = useCallback((index) => {
    if (index >= -1 && index < snapPoints.length) {
      setCurrentSnapIndex(index);
    }
  }, [snapPoints.length]);

  const handleSubmit = async () => {
    await triggerPressHaptic();

    if (!isContentValid()) {
      Alert.alert('Error', `Please enter some content for your ${mode === 'solution' ? 'solution' : 'comment'}.`);
      return;
    }

    if (mode === 'solution' && !canSubmitSolution) {
      Alert.alert('Solution already submitted', 'You can only submit one solution per post.');
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
      
      if (mode === 'solution') {
        const response = await api.post(`/posts/${postId}/solutions/create/`, {
          content: contentToSubmit,
        });
        result = response.data;
      } else if (editingComment) {
        result = await editComment(editingComment.id, contentToSubmit);
      } else {
        result = await createComment(solutionId, contentToSubmit, parentComment?.id);
      }
      
      await triggerSuccessHaptic();
      onSubmitted?.(result, mode);
      setContent('');
      setEditorKey((key) => key + 1);
      if (mode === 'solution') {
        setCurrentSnapIndex(0);
        bottomSheetRef.current?.snapToIndex(0);
      }
      onClose();
    } catch (error) {
      console.error(`Error submitting ${mode}:`, error);
      Alert.alert(
        'Error', 
        `Failed to ${mode === 'solution' ? 'create solution' : editingComment ? 'update comment' : 'create comment'}. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    void triggerPressHaptic();
    setContent(editingComment?.content || '');
    setEditorKey((key) => key + 1);
    if (mode === 'solution') {
      setCurrentSnapIndex(0);
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      onClose();
    }
  };

  const handleHeaderTap = () => {
    if (currentSnapIndex === 0) {
      bottomSheetRef.current?.snapToIndex(2);
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
    if (mode === 'solution') return canSubmitSolution ? 'Add Solution' : 'Solution submitted';
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
      const nextIndex = mode === 'solution' ? 0 : 1;
      setCurrentSnapIndex(nextIndex);
      const frameId = requestAnimationFrame(() => {
        bottomSheetRef.current?.snapToIndex(nextIndex);
      });
      return () => cancelAnimationFrame(frameId);
    }

    bottomSheetRef.current?.close();
    return undefined;
  }, [isVisible, mode]);

  if (!isVisible) return null;

  return (
    <View style={styles.sheetHost} pointerEvents="box-none">
      <BottomSheet
        ref={bottomSheetRef}
        index={currentSnapIndex}
        snapPoints={snapPoints}
        containerLayoutState={containerLayoutState}
        enableDynamicSizing={false}
        onChange={handleSheetChanges}
        enablePanDownToClose={false}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.container}>
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
                <Text style={styles.replyTo} numberOfLines={2} selectable={true}>
                  "{getParentCommentText()}"
                </Text>
              )}
              {/* Show tap to expand hint when minimized */}
              {currentSnapIndex === 0 && (
                <Text style={styles.expandHint} selectable={true}>Tap to expand</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={(event) => {
                event.stopPropagation?.();
                handleCancel();
              }}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Content Editor - always mounted but conditionally visible */}
          <View style={[styles.editorContainer, currentSnapIndex === 0 && styles.hiddenEditor]}>
            <ReplyEditor
              key={`${mode}-${editingComment?.id || parentComment?.id || 'new'}-${editorKey}`}
              onSave={setContent}
              initialContent={editingComment?.content || ''}
              placeholder={mode === 'solution' ? 'Write your solution...' : parentComment ? 'Write your reply...' : 'Write your comment...'}
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
                  (!isContentValid() || isSubmitting || (mode === 'solution' && !canSubmitSolution)) && styles.submitButtonDisabled
                ]} 
                onPress={handleSubmit}
                disabled={!isContentValid() || isSubmitting || (mode === 'solution' && !canSubmitSolution)}
              >
                <Text style={[
                  styles.submitButtonText,
                  (!isContentValid() || isSubmitting || (mode === 'solution' && !canSubmitSolution)) && styles.submitButtonTextDisabled
                ]}>
                  {isSubmitting ? 'Submitting...' : mode === 'solution' ? 'Submit Solution' : editingComment ? 'Update' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetHost: {
    ...StyleSheet.absoluteFillObject,
  },
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
