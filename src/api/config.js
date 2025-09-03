import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isDevelopment = __DEV__;

// Resolve the dev server host so a physical device doesn't call its own localhost
function resolveDevApiBaseUrl() {
  // 1) EXPO_PUBLIC_API_URL full override (recommended)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.endsWith('/') ? envUrl : envUrl + '/';

  // 2) Parse host from Expo runtime (SDK 49+)
  // hostUri looks like '192.168.1.10:19000'
  const hostFromExpo = Constants?.expoConfig?.hostUri?.split(':')?.[0];
  if (hostFromExpo) return `http://${hostFromExpo}:8000/api/`;

  // 3) Web fallback
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000/api/`;
  }

  // 4) Emulator/simulator heuristics
  if (Platform.OS === 'android') {
    // Android Emulator maps host loopback to 10.0.2.2
    return 'http://10.0.2.2:8000/api/';
  }
  if (Platform.OS === 'ios') {
    // iOS Simulator can use localhost; physical devices cannot
    return 'http://localhost:8000/api/';
  }

  // 5) Last resort
  return 'http://localhost:8000/api/';
}

const API_URL = isDevelopment
  ? resolveDevApiBaseUrl()
  : 'https://wolfkey.net/api/';

console.log('API Base URL:', API_URL);

console.log(API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 60000,
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
  
  // Prefer explicit EXPO_PUBLIC_IMAGE_BASE when provided (EAS env or runtime extra)
  const envImageBase = process.env.EXPO_PUBLIC_IMAGE_BASE || Constants?.expoConfig?.extra?.imageBase;
  const baseUrl = isDevelopment
    ? resolveDevApiBaseUrl().replace('/api/', '') // Remove /api/ suffix for images
    : (envImageBase || 'https://wolfkey.net'); // Production
  
    // Remove leading slash if present to avoid double slashes
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;

  return `${baseUrl}/${cleanPath}`;
};

export default api;