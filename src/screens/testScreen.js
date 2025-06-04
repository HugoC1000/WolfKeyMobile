import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { useUser } from '../context/userContext';

const TestLoginScreen = ({ navigation }) => {
  const { user, login, logout } = useUser();

  const handleTestLogin = async () => {
    try {
      await login('test@example.com', 'password123');
      console.log('Login successful');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>
        Status: {user ? 'Logged In' : 'Logged Out'}
      </Text>
      {user && (
        <Text style={styles.emailText}>
          Current user: {user.school_email}
        </Text>
      )}
      <View style={styles.buttonContainer}>
        <Button 
          title="Test Login" 
          onPress={handleTestLogin}
          disabled={!!user}
        />
        <Button 
          title="Logout" 
          onPress={handleLogout}
          disabled={!user}
        />
      </View>
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
  statusText: {
    fontSize: 18,
    marginBottom: 20,
  },
  emailText: {
    fontSize: 16,
    marginBottom: 20,
    color: 'gray',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
});

export default TestLoginScreen;