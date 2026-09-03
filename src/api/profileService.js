import api from './config';
import Course from '../models/Course';
import { transformPostsArray } from './postService';

// Helper function to transform profile course data to Course instances
const transformProfileCourses = (profileData) => {
  if (!profileData) return profileData;
  
  // Transform schedule blocks
  if (profileData.userprofile?.schedule_blocks) {
    const transformedBlocks = {};
    Object.entries(profileData.userprofile.schedule_blocks).forEach(([key, courseData]) => {
      if (courseData) {
        transformedBlocks[key] = Course.fromAPI(courseData);
      } else {
        transformedBlocks[key] = null;
      }
    });
    profileData.userprofile.schedule_blocks = transformedBlocks;
  }
  
  // Transform experienced courses
  if (profileData.userprofile?.courses?.experienced_courses) {
    profileData.userprofile.courses.experienced_courses = 
      profileData.userprofile.courses.experienced_courses.map(exp => ({
        ...exp,
        course: exp.course ? Course.fromAPI(exp.course) : exp
      }));
  }
  
  // Transform help needed courses
  if (profileData.userprofile?.courses?.help_needed_courses) {
    profileData.userprofile.courses.help_needed_courses = 
      profileData.userprofile.courses.help_needed_courses.map(help => ({
        ...help,
        course: help.course ? Course.fromAPI(help.course) : help
      }));
  }
  
  return profileData;
};

// Get current user's profile
export const getCurrentProfile = async () => {
  try {
    const response = await api.get('profile/');
    return transformProfileCourses(response.data);
  } catch (error) {
    console.error('Error fetching current profile:', error?.message || error);
    throw error;
  }
};

// Get profile by username
export const getProfileByUsername = async (username) => {
  try {
    const response = await api.get(`profiles/${encodeURIComponent(username)}/`);
    return transformProfileCourses(response.data);
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

export const toggleCommunityFollow = async (communityId) => {
  const response = await api.post(`community/${communityId}/follow/`);
  return response.data;
};

export const getCommunityLunches = async () => {
  const response = await api.get('community/lunches/');
  return response.data.lunches || [];
};

export const createCommunityLunch = async ({ date, location }) => {
  const response = await api.post('community/lunches/', { date, location });
  return response.data.lunch;
};

export const updateCommunityLunch = async (lunchId, updates) => {
  const response = await api.patch(`community/lunches/${lunchId}/`, updates);
  return response.data.lunch;
};

export const deleteCommunityLunch = async (lunchId) => {
  await api.delete(`community/lunches/${lunchId}/`);
};

// Get a user's public posts
export const getProfilePosts = async (username, page = 1, limit = 3) => {
  try {
    const response = await api.get(`profiles/${encodeURIComponent(username)}/posts/`, {
      params: { page, limit, compact: true },
    });
    const data = response.data || {};

    return {
      ...data,
      posts: transformPostsArray(Array.isArray(data.posts) ? data.posts : []),
      has_next: Boolean(data.has_next),
      page: Number(data.page) || page,
      total_pages: Number(data.total_pages) || 1,
    };
  } catch (error) {
    console.error('Error fetching profile posts:', error);
    throw error;
  }
};

// Update profile
export const updateProfile = async (profileData) => {
  try {
    const response = await api.post('profile/update/', profileData);
    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

// Upload profile picture
export const uploadProfilePicture = async (imageData) => {
  try {
    const formData = new FormData();
    formData.append('profile_picture', {
      uri: imageData.uri,
      type: imageData.type,
      name: imageData.fileName || 'profile_picture.jpg',
    });

    const response = await api.post('profile/upload-picture/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

// Update courses
export const updateCourses = async (coursesData) => {
  try {
    const response = await api.put('profile/courses/update/', coursesData);
    return response.data;
  } catch (error) {
    console.error('Error updating courses:', error);
    throw error;
  }
};

// Preview a pasted or photographed schedule. The backend accepts exactly one
// multipart field per request: `text` or `image`.
export const previewScheduleImport = async ({ text, image }) => {
  const hasText = typeof text === 'string' && text.trim().length > 0;
  const hasImage = Boolean(image?.uri);

  if (hasText === hasImage) {
    throw new Error('Schedule import requires exactly one of text or image.');
  }

  const formData = new FormData();
  if (hasText) {
    formData.append('text', text.trim());
  } else {
    formData.append('image', {
      uri: image.uri,
      name: image.name || 'schedule.jpg',
      type: image.type || 'image/jpeg',
    });
  }

  const response = await api.post('schedule-import/preview/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000,
  });
  return response.data;
};

// Applying is intentionally all-or-nothing: callers must include every block,
// using a numeric course ID or null to clear it.
export const applyScheduleImport = async (assignments) => {
  const requiredBlocks = ['1A', '1B', '1D', '1E', '2A', '2B', '2C', '2D', '2E'];
  const completeAssignments = Object.fromEntries(requiredBlocks.map((block) => {
    const value = assignments?.[block];
    if (value !== null && !Number.isInteger(value)) {
      throw new Error(`Block ${block} must be a numeric course ID or null.`);
    }
    return [block, value];
  }));

  const response = await api.post('schedule-import/apply/', {
    assignments: completeAssignments,
  });
  return response.data;
};

// Add experience
export const addExperience = async (courseId) => {
  try {
    const response = await api.post('profile/experience/add/', { course: courseId });
    return response.data;
  } catch (error) {
    console.error('Error adding experience:', error);
    throw error;
  }
};

// Add help request
export const addHelpRequest = async (courseId) => {
  try {
    const response = await api.post('profile/help/add/', { course: courseId });
    return response.data;
  } catch (error) {
    console.error('Error adding help request:', error);
    throw error;
  }
};

// Remove experience
export const removeExperience = async (experienceId) => {
  try {
    const response = await api.delete(`profile/experience/${experienceId}/remove/`);
    return response.data;
  } catch (error) {
    console.error('Error removing experience:', error);
    throw error;
  }
};

// Remove help request
export const removeHelpRequest = async (helpId) => {
  try {
    const response = await api.delete(`profile/help/${helpId}/remove/`);
    return response.data;
  } catch (error) {
    console.error('Error removing help request:', error);
    throw error;
  }
};

// Update privacy preferences
export const updatePrivacyPreferences = async (preferences) => {
  try {
    const response = await api.post('profile/preferences/update/', preferences);
    return response.data;
  } catch (error) {
    console.error('Error updating privacy preferences:', error);
    throw error;
  }
};

// Upload lunch card
export const uploadLunchCard = async (imageData) => {
  try {
    const formData = new FormData();
    formData.append('lunch_card', {
      uri: imageData.uri,
      type: imageData.type,
      name: imageData.fileName || 'lunch_card.jpg',
    });

    const response = await api.post('profile/upload-lunch-card/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading lunch card:', error);
    throw error;
  }
};

// Search users by username or full name
export const searchUsers = async (query) => {
  try {
    const response = await api.get('search-users/', {
      params: { query }
    });
    return response.data.users || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};
