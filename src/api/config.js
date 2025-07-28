import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isDevelopment = __DEV__;
console.log(isDevelopment);
// Get the local IP address from Expo constants
const localhost = Constants.manifest?.debuggerHost?.split(':').shift() || 'localhost';

const API_URL = isDevelopment 
  ? `http://${localhost}:8000/api/`  // Use dynamic localhost for Expo
  : 'https://wolfkey.net/api/';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// Enhanced error logging
api.interceptors.request.use(request => {
  console.log('API Request Started:', {
    method: request.method?.toUpperCase(),
    url: request.url,
    fullUrl: `${request.baseURL}${request.url}`,
    headers: request.headers,
    data: request.data,
    timestamp: new Date().toISOString()
  });
  return request;
}, error => {
  console.error('Request Error:', {
    message: error.message,
    config: error?.config,
    baseURL: error?.config?.baseURL
  });
  return Promise.reject(error);
});

// Add response logging
api.interceptors.response.use(response => {
  console.log('API Response Success:', {
    method: response.config?.method?.toUpperCase(),
    url: response.config?.url,
    fullUrl: `${response.config?.baseURL}${response.config?.url}`,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: response.data,
  });
  return response;
}, error => {
  console.error('API Response Error:', {
    method: error.config?.method?.toUpperCase(),
    url: error.config?.url,
    fullUrl: `${error.config?.baseURL}${error.config?.url}`,
    status: error.response?.status,
    statusText: error.response?.statusText,
    message: error.message,
    responseData: error.response?.data,
    requestData: error.config?.data
  });
  return Promise.reject(error);
});

// Add token authentication interceptor
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    } else {
      console.log('No token - request will be unauthenticated');
    }
  } catch (error) {
    console.error('Error retrieving auth token:', error);
  }
  return config;
});

// Token management functions
export const setAuthToken = async (token) => {
  try {
    await AsyncStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error storing auth token:', error);
    throw error;
  }
};

export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

export const removeAuthToken = async () => {
  try {
    await AsyncStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};

export const getFullImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // If it's already a full URL (starts with http/https), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a relative path, construct the full URL
  const baseUrl = isDevelopment 
    ? `http://${localhost}:8000`  // Local development
    : 'https://wolfkey.net';      // Production
  
  // Remove leading slash if present to avoid double slashes
  const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
  
  return `${baseUrl}/${cleanPath}`;
};

export default api;