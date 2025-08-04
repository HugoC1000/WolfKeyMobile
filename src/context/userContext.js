import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../api/authService';
import { getAuthToken } from '../api/config';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load saved user data on startup
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      const authToken = await getAuthToken();

      if (savedUser && authToken) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } else if (savedUser && !authToken) {
        await AsyncStorage.removeItem('user');
        setUser(null);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const clearUser = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Error clearing user data:', err);
    }
  };

  const updateUser = async (updates) => {
    try {
      if (user) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Error updating user data:', err);
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      loading,
      error,
      clearUser,
      loadUser,
      updateUser,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};