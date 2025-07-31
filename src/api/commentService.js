import api from './config';

// Create a new comment
export const createComment = async (solutionId, content, parentId = null) => {
  try {
    const response = await api.post(`solutions/${solutionId}/comments/create/`, {
      content,
      parent_id: parentId
    });
    return response.data;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
};

// Edit an existing comment
export const editComment = async (commentId, content) => {
  try {
    const response = await api.put(`comments/${commentId}/edit/`, {
      content
    });
    return response.data;
  } catch (error) {
    console.error('Error editing comment:', error);
    throw error;
  }
};

// Delete a comment
export const deleteComment = async (commentId) => {
  try {
    const response = await api.delete(`comments/${commentId}/delete/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};


// Refresh comments after an operation
export const refreshSolutionComments = async (solutionId) => {
  try {
    const response = await api.get(`solutions/${solutionId}/comments/`);
    return response.data;
  } catch (error) {
    console.error('Error refreshing comments:', error);
    throw error;
  }
};
