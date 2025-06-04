import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../api/authService';

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
      console.log("Loading user from storage...");
      const savedUser = await AsyncStorage.getItem('user');
      console.log("Raw saved user data:", savedUser);
      
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        console.log("Parsed user data:", parsedUser);
        setUser(parsedUser);
      } else {
        console.log("No user found in storage");
        setUser(null);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const clearUser = async () => {
    try {
      console.log("Clearing user data...");
      await AsyncStorage.removeItem('user');
      setUser(null);
      setError(null);
      
      // Verify clear
      const remainingUser = await AsyncStorage.getItem('user');
      console.log("Remaining user data after clear:", remainingUser);
    } catch (err) {
      console.error('Error clearing user data:', err);
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      loading,
      error,
      clearUser,
      loadUser,
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