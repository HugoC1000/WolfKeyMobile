// App.js
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, ActivityIndicator, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import HomeStackNavigator from './src/navigation/HomeStackNavigator'; 
import ExploreScreen from './src/screens/ExploreScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import CreateSolutionScreen from './src/screens/CreateSolutionScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

import { COLORS } from './src/utils/constants';
import { UserProvider } from './src/context/userContext';
import { attachBasicNotificationListeners } from './src/utils/notifications';
import { AuthProvider, useAuth } from './src/context/authContext';
import badgeManager from './src/utils/badgeManager';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ExploreStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ExploreScreen" component={ExploreScreen} />
    <Stack.Screen name="PostDetail" component={PostDetailScreen} />
    <Stack.Screen name="CreateSolution" component={CreateSolutionScreen} />
  </Stack.Navigator>
);

const NotificationsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
    <Stack.Screen name="PostDetail" component={PostDetailScreen} />
    <Stack.Screen name="CreateSolution" component={CreateSolutionScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="PostDetail" component={PostDetailScreen} />
    <Stack.Screen name="CreateSolution" component={CreateSolutionScreen} />
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
      headerTransparent: true,
      headerShown: false,
    }}
  >
    <Tab.Screen
      name="MainStack"
      component={HomeStackNavigator}
      options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home-outline" size={size} color={color} />
        ),
        headerLeft: () => (
          <View style={styles.fallbackCard}>
            <Image
              source={require('./assets/light-icon.png')}
              style={{ width: 42, height: 42, borderRadius: 16, marginLeft: 10, marginBottom: 10 }}
            />
          </View>
        ),
      }}
    />
    <Tab.Screen
      name="Explore"
      component={ExploreStack}
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
      name="Notifications"
      component={NotificationsStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="notifications-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileStack}
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

  useEffect(() => {
    // Initialize badge manager when user is authenticated
    if (user && !loading) {
      badgeManager.initialize();
    }
  }, [user, loading]);

  useEffect(() => {
    // Handle app state changes for badge sync
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && user) {
        badgeManager.onAppForeground();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user]);

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <Stack.Screen name="Main" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
};

const App = () => {
  const navigationRef = useRef();

  const handleNotificationResponse = (response) => {
    const data = response?.notification?.request?.content?.data;
    
    badgeManager.updateBadge();
    
    if (!data || !navigationRef.current) return;

    try {
      switch (data.type) {
        case 'post_detail':
        case 'comment':
          if (data.post_id) {
            navigationRef.current.navigate('Main', {
              screen: 'MainStack',
              params: {
                screen: 'PostDetail',
                params: { 
                  postId: parseInt(data.post_id),
                  commentId: data.comment_id ? parseInt(data.comment_id) : undefined
                }
              }
            });
          }
          break;
          
        case 'solution_detail':
          if (data.post_id) {
            navigationRef.current.navigate('Main', {
              screen: 'MainStack',
              params: {
                screen: 'PostDetail',
                params: { 
                  postId: parseInt(data.post_id),
                  solutionId: data.solution_id ? parseInt(data.solution_id) : undefined
                }
              }
            });
          }
          break;
          
        case 'profile':
          if (data.username) {
            navigationRef.current.navigate('Main', {
              screen: 'Profile',
              params: { username: data.username }
            });
          }
          break;
  
          
        case 'notifications':
          navigationRef.current.navigate('Main', {
            screen: 'Notifications'
          });
          break;
          
        default:
          break;
      }
    } catch (error) {
      console.error('Error handling notification navigation:', error);
    }
  };

  const handleNotificationReceived = (notification) => {
    badgeManager.updateBadge();
  };

  useEffect(() => {
    const detach = attachBasicNotificationListeners({
      onReceive: handleNotificationReceived,
      onRespond: handleNotificationResponse,
    });
    return () => detach?.();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <AuthProvider>
          <UserProvider>
            <View style={styles.container}>
              <View style={[styles.content, { backgroundColor: 'transparent' }]}>
                <AppContent />
              </View>
            </View>
          </UserProvider>
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
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
