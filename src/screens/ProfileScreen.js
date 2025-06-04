import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { useAuth } from '../context/authContext';
import { useUser } from '../context/userContext';
import BackgroundSvg from '../components/BackgroundSVG';

const ProfileScreen = () => {
  const { logout } = useAuth();
    const { user } = useUser();
    const { clearUser } = useUser();
  

  const handleLogout = async () => {
    try {
      await logout(clearUser);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <BackgroundSvg hue={user.background_hue} />
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default ProfileScreen;