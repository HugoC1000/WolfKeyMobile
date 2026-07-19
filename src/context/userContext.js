import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthToken } from '../api/config';
import { getCurrentProfile } from '../api/profileService';

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
      const [savedUser, authToken] = await Promise.all([
        AsyncStorage.getItem('user'),
        getAuthToken(),
      ]);

      if (savedUser && authToken) {
        const parsedUser = JSON.parse(savedUser);
        // Render from the local cache immediately. A profile refresh should not
        // hold the app on a loading screen when usable data is already stored.
        setUser(parsedUser);
        setLoading(false);

        // Revalidate in the background and quietly keep the cache current.
        getCurrentProfile()
          .then(async (currentProfile) => {
            const mergedUser = {
              ...parsedUser,
              ...currentProfile,
              userprofile: currentProfile?.userprofile ?? parsedUser?.userprofile,
            };

            setUser(mergedUser);
            await AsyncStorage.setItem('user', JSON.stringify(mergedUser));
          })
          .catch((profileErr) => {
            console.log('Could not refresh cached user profile:', profileErr?.message || profileErr);
          });
      } else if (savedUser && !authToken) {
        await AsyncStorage.removeItem('user');
        setUser(null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('userContext.loadUser error:', err);
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
        // Fields that belong in userprofile
        const userprofileFields = [
          'background_hue', 'bio', 'allow_schedule_comparison', 
          'allow_grade_updates', 'profile_picture', 'lunch_card',
          'grade_level', 'has_wolfnet_password', 'is_moderator', 'points',
          'schedule_blocks'
        ];
        
        // Separate updates into top-level and userprofile updates
        const topLevelUpdates = {};
        const userprofileUpdates = {};
        let replaceEntireUserprofile = false;
        
        Object.keys(updates).forEach(key => {
          if (userprofileFields.includes(key)) {
            userprofileUpdates[key] = updates[key];
          } else if (key === 'userprofile') {
            // If full userprofile is provided, replace it entirely
            replaceEntireUserprofile = true;
            Object.assign(userprofileUpdates, updates[key] || {});
          } else {
            topLevelUpdates[key] = updates[key];
          }
        });
        
        const updatedUser = {
          ...user,
          ...topLevelUpdates,
          userprofile: replaceEntireUserprofile
            ? userprofileUpdates
            : {
                ...user.userprofile,
                ...userprofileUpdates,
              },
        };

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
