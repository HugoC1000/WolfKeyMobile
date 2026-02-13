import api from './config';
import Course from '../models/Course';

/**
 * Transform post course data to Course instances.
 * 
 * This converts raw API course objects into Course class instances,
 * providing consistent structure and access to Course methods.
 * 
 * The Course class preserves all API fields (needs_help, is_experienced, etc.)
 * while ensuring type safety and providing utility methods.
 */
export const transformPostCourses = (postData) => {
  if (!postData) return postData;
  
  // Transform single post - convert to Course instances
  if (postData.courses && Array.isArray(postData.courses)) {
    postData.courses = postData.courses.map(courseData => 
      Course.fromAPI(courseData)
    );
  }
  
  return postData;
};

// Helper function to transform array of posts
export const transformPostsArray = (posts) => {
  if (!Array.isArray(posts)) return posts;
  return posts.map(post => transformPostCourses(post));
};

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
