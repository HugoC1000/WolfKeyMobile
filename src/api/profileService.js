import api from './config';

// Get current user's profile
export const getCurrentProfile = async () => {
  try {
    const response = await api.get('profile/');
    return response.data;
  } catch (error) {
    console.error('Error fetching current profile:', error);
    throw error;
  }
};

// Get profile by username
export const getProfileByUsername = async (username) => {
  try {
    const response = await api.get(`profile/${username}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
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

// Auto-complete courses from WolfNet
export const autoCompleteCourses = async () => {
  try {
    const response = await api.post('auto-complete-courses/');
    return response.data;
  } catch (error) {
    console.error('Error auto-completing courses:', error);
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
