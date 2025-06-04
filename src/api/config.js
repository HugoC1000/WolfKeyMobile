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
  withCredentials: true,
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// Enhanced error logging
api.interceptors.request.use(request => {
  console.log('Starting Request:', {
    url: request.url,
    method: request.method,
    data: request.data,
    headers: request.headers,
    baseURL: request.baseURL // Log the full URL
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
  console.log('Response:', {
    status: response.status,
    data: response.data
  });
  return response;
}, error => {
  console.error('Response Error:', {
    message: error.message,
    response: error.response?.data
  });
  return Promise.reject(error);
});

export const getCSRFToken = async () => {
  try {
    const response = await api.get('csrf/', {
      withCredentials: true
    });
    return response.data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
};

// Add an interceptor to automatically add CSRF token to requests that need it
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    try {
      const token = await getCSRFToken();
      config.headers['X-CSRFToken'] = token;
    } catch (error) {
      console.error('Error setting CSRF token:', error);
    }
  }
  return config;
});

export default api;