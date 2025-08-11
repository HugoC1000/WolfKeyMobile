import api, { setAuthToken, getAuthToken, removeAuthToken } from './config';
import { registerPushToken, unregisterPushToken } from './notificationService';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import badgeManager from '../utils/badgeManager';

// Get device information for backend logging
const getDeviceInfo = () => {
  return {
    device_id: Constants.sessionId || 'unknown',
    device_name: `${Platform.OS} ${Platform.Version}`,
    app_version: Constants.manifest?.version || '1.0.0',
    platform: Platform.OS,
    platform_version: Platform.Version.toString()
  };
};

export const authService = {
  _safeResetAuthStorage: async () => {
    try {
      await AsyncStorage.multiRemove([
        'authToken',
        'user',
        'posts',
        'schedule',
        'preferences',
      ]);
    } catch (e) {
      console.log('Storage reset warning:', e?.message || e);
    }
  },
  /**
   * Login user with school email and password
   */
  login: async (school_email, password, loadUser) => {
    try {
      const response = await api.post('auth/login/', {
        school_email: school_email.trim().toLowerCase(),
        password: password,
        device_info: getDeviceInfo()
      });

  if (response.data.token && response.data.user) {
        const { token } = response.data;
        const userData = response.data.user;
        
        // Reset relevant storage keys
        await authService._safeResetAuthStorage();
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        
        // Store auth token
        await setAuthToken(token);

        if (typeof loadUser === 'function') {
          await loadUser();
        }

        // Register push token in background
        try {
          const expoToken = await registerForPushNotificationsAsync();
          if (expoToken) {
            await registerPushToken(expoToken);
          }
        } catch (e) {
          console.log('Skipping push token registration:', e?.message || e);
        }

        return {
          success: true,
          user: userData,
          token: token
        };
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || 'Login failed');
      }
      
      throw error;
    }
  },

  /**
   * Register new user
   */
  register: async (userData, loadUser) => {
    try {
      const registrationData = {
        ...userData,
        school_email: userData.school_email.trim().toLowerCase(),
        device_info: getDeviceInfo()
      };

      const response = await api.post('auth/register/', registrationData);

  if (response.data.token && response.data.user) {
        const { token } = response.data;
        const user = response.data.user;
        
        // Reset relevant storage keys
        await authService._safeResetAuthStorage();
        // Store auth token
        await setAuthToken(token);
        
        // Store user data
        await AsyncStorage.setItem('user', JSON.stringify(user));
        
        if (typeof loadUser === 'function') {
          await loadUser();
        }

        // Register push tokens
        try {
          const expoToken = await registerForPushNotificationsAsync();
          if (expoToken) {
            await registerPushToken(expoToken);
          }
        } catch (e) {
          console.log('Skipping push token registration:', e?.message || e);
        }

        return {
          success: true,
          user: user,
          token: token
        };
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || 'Registration failed');
      }
      
      throw error;
    }
  },

  /**
   * Logout user and invalidate token
   */
  logout: async (clearUser) => {
    // Get current push token before clearing auth
    let currentPushToken = null;
    try {
      currentPushToken = await registerForPushNotificationsAsync();
    } catch (e) {
      console.log('Could not get push token for logout cleanup:', e?.message);
    }

    try {
      // Call logout endpoint to invalidate token on server
      await api.post('auth/logout/');
    } catch (error) {
      console.error('Logout error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      // Continue with local logout even if server call fails
    } finally {
      try {
        await unregisterPushToken(currentPushToken);
        
        await badgeManager.clearBadge();
      } catch (e) {
        console.log('Push token cleanup warning:', e?.message);
      }
      
      // Always clear local data
      if (clearUser && typeof clearUser === 'function') {
        await clearUser();
      }
      
      await removeAuthToken();
      await AsyncStorage.removeItem('user');
      await AsyncStorage.multiRemove([
        'posts',
        'schedule',
        'preferences',
      ]);
    }
  },

  /**
   * Verify if current token is valid
   */
  verifyToken: async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        return { success: false, error: 'No token found' };
      }

      const response = await api.post('auth/verify-token/');
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        // Token is invalid, remove it
        await removeAuthToken();
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error) {
      console.error('Token verification error:', error);
      
      // If token verification fails, remove the token
      if (error.response?.status === 401) {
        await removeAuthToken();
      }
      
      return {
        success: false,
        error: {
          code: 'TOKEN_VERIFICATION_FAILED',
          message: 'Session expired. Please login again.'
        }
      };
    }
  },

  /**
   * Refresh authentication token
   */
  refreshToken: async () => {
    try {
      const response = await api.post('auth/refresh-token/');
      
      if (response.data.success) {
        const { token } = response.data.data.auth;
        await setAuthToken(token);
        return {
          success: true,
          data: response.data.data
        };
      } else {
        await removeAuthToken();
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await removeAuthToken();
      
      return {
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Session expired. Please login again.'
        }
      };
    }
  },

  /**
   * Search for users
   */
  searchUsers: async (query, limit = 10) => {
    try {
      const response = await api.get('auth/search-users/', {
        params: { q: query, limit }
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error) {
      console.error('User search error:', error);
      
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search users. Please try again.'
        }
      };
    }
  },

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated: async () => {
    const token = await getAuthToken();
    return !!token;
  },

  /**
   * Get current auth token
   */
  getCurrentToken: async () => {
    return await getAuthToken();
  }
};