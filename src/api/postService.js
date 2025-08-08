import api from './config';

// Like a post
export const likePost = async (postId) => {
  try {
    const response = await api.post(`posts/${postId}/like/`);
    return response.data;
  } catch (error) {
    console.error('Error liking post:', error);
    throw error;
  }
};

// Unlike a post
export const unlikePost = async (postId) => {
  try {
    const response = await api.post(`posts/${postId}/unlike/`);
    return response.data;
  } catch (error) {
    console.error('Error unliking post:', error);
    throw error;
  }
};

// Follow a post
export const followPost = async (postId) => {
  try {
    const response = await api.post(`posts/${postId}/follow/`);
    return response.data;
  } catch (error) {
    console.error('Error following post:', error);
    throw error;
  }
};

// Unfollow a post
export const unfollowPost = async (postId) => {
  try {
    const response = await api.post(`posts/${postId}/unfollow/`);
    return response.data;
  } catch (error) {
    console.error('Error unfollowing post:', error);
    throw error;
  }
};

// Get post share information
export const getPostShareInfo = async (postId) => {
  try {
    const response = await api.get(`posts/${postId}/share/`);
    return response.data;
  } catch (error) {
    console.error('Error getting post share info:', error);
    throw error;
  }
};
