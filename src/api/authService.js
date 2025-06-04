import api from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  login: async (school_email, password, loadUser) => {
    try {
      const data = JSON.stringify({
        school_email,
        password,
      });
      
      const response = await api.post('login/', data);

      console.log("Login response user data:", JSON.stringify(response.data.user, null, 2));
      console.log("User load 1", loadUser);
      
      if (response.data.user) {
        const loadUserFn = loadUser;
        
        await AsyncStorage.clear();
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        
        if (typeof loadUserFn === 'function') {
          console.log("Calling loadUser function");
          await loadUserFn();
        } else {
          console.error("loadUser is no longer a function after storage operations");
        }
      }

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async (clearUser) => {
    try {
      const response = await api.post('logout/');

      if (clearUser) {
        await clearUser();
      }
      
      console.log('Logout response:', response.data); 
      await AsyncStorage.removeItem('user');
      await AsyncStorage.multiRemove([
        'posts',
        'schedule',
        'preferences',
      ]);
      return true;
    } catch (error) {
      console.error('Logout error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      await AsyncStorage.removeItem('user');
      await AsyncStorage.multiRemove([
        'posts',
        'schedule',
        'preferences',
      ]);
      throw error;
    }
  }
};