// App.js
import React from 'react';
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import HomeStackNavigator from './src/navigation/HomeStackNavigator'; // <- New import for nested stack
import ExploreScreen from './src/screens/ExploreScreen';
import BookmarksScreen from './src/screens/BookmarksScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';

import { COLORS } from './src/utils/constants';
import { UserProvider } from './src/context/userContext';
import { AuthProvider, useAuth } from './src/context/authContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeStackNavigator} />
  </Stack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.text.secondary,
      tabBarStyle: {
        position: 'absolute',
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        elevation: 0,
        paddingBottom: 5,
        paddingTop: 5,
      },
      tabBarBackground: () => (
        <BlurView
          intensity={40}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ),
      headerStyle: {
        backgroundColor: 'transparent',
      },
      headerBackground: () => (
        <BlurView
          intensity={40}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ),
      headerTransparent: true,
      headerShown: false,
    }}
  >
    <Tab.Screen
      name="MainStack"
      component={MainStack}
      options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home-outline" size={size} color={color} />
        ),
        headerLeft: () => (
          <Image
            source={require('./assets/icon.png')}
            style={{ width: 42, height: 42, borderRadius: 16, marginLeft: 10, marginBottom: 10 }}
          />
        ),
      }}
    />
    <Tab.Screen
      name="Explore"
      component={ExploreScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="compass-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Ask"
      component={CreatePostScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="add-circle" size={32} color={COLORS.primary} />
        ),
        tabBarLabel: 'Ask',
        tabBarLabelStyle: {
          color: COLORS.primary,
        }
      }}
    />
    <Tab.Screen
      name="Bookmarks"
      component={BookmarksScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="bookmark-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person-outline" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Main" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
};

const ForceBackgroundDebug = () => (
  <View
    style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
      opacity: 0,
      zIndex: 9999,
      pointerEvents: 'none',
    }}
  />
);

const App = () => {
  return (
    <NavigationContainer>
      <AuthProvider>
        <UserProvider>
          <View style={styles.container}>
            <ForceBackgroundDebug />
            <View style={[styles.content, { backgroundColor: 'transparent' }]}>
              <AppContent />
            </View>
          </View>
        </UserProvider>
      </AuthProvider>
    </NavigationContainer>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
});
