import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/authContext'; 
import { useNavigation } from '@react-navigation/native'; 
import BackgroundSvg from '../components/BackgroundSVG';
import { useUser } from '../context/userContext';


const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth(); 
  const navigation = useNavigation();
  const { loadUser } = useUser();

  // Create a stable reference to loadUser
  const stableLoadUser = useCallback(async () => {
    console.log("Stable loadUser called");
    return await loadUser();
  }, [loadUser]);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    console.log('Attempting login with:', username); 
    console.log('LoadUser type before login:', typeof stableLoadUser);
    
    try {
      await login(username, password, stableLoadUser);
      console.log('Login successful'); 
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert(
        'Login Failed', 
        err.message || 'Please check your credentials and try again.'
      );
    }
  };

  return (
    <View style={styles.container} nativeID="login sc">
      <BackgroundSvg hue={240} style = {{zIndex: -1}} nativeID="unique-background-id" />

      <Text style={styles.title}>Welcome to WolfKey</Text>
      <TextInput
        style={styles.input}
        placeholder="School Email"
        value={username}
        onChangeText={text => {
          console.log('Username changed:', text); // Debug log
          setUsername(text);
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <TextInput
        style={[styles.input, loading && styles.inputDisabled]}
        placeholder="Password"
        value={password}
        onChangeText={text => {
          console.log('Password changed'); // Debug log
          setPassword(text);
        }}
        secureTextEntry
        editable={!loading}
      />
      <TouchableOpacity 
        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
        onPress={() => {
          console.log('Login button pressed'); // Debug log
          handleLogin();
        }}
        disabled={loading}
      >
        <Text style={styles.loginButtonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputDisabled: {
    opacity: 0.7,
    backgroundColor: '#F5F5F5',
  },
  loginButton: {
    backgroundColor: '#6366F1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#A5A6F6',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default LoginScreen;