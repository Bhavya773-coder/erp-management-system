import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform, LogBox, AppState } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { useThemeStore } from '../store/themeStore';
import { useTheme } from '@/constants/appTheme';
import { authAPI } from '../lib/api';

// Lazy-load expo-notifications to prevent crashes in Expo Go
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('expo-notifications not available');
}

let Constants = null;
try {
  Constants = require('expo-constants');
} catch (e) {
  console.warn('expo-constants not available');
}

// Notification handler — controls foreground display
if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      // Respect the global notification toggle even for foreground notifications
      const { notificationsEnabled } = useThemeStore.getState();
      return {
        shouldShowAlert: notificationsEnabled,
        shouldPlaySound: notificationsEnabled,
        shouldSetBadge: notificationsEnabled,
      };
    },
  });
}

// Suppress Expo Go warnings
LogBox.ignoreLogs([
  'expo-notifications',
  'expo-notifications:',
]);

export default function RootLayout() {
  const { isAuthenticated, isLoading, token, checkAuth, user } = useAuthStore();
  const { mode } = useThemeStore();
  const Colors = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const appState = useRef(AppState.currentState);

  // Socket connection
  const { socket } = useSocket(token);

  // Auth check
  useEffect(() => {
    checkAuth();
  }, []);

  // Register push token when authenticated and enabled
  const { notificationsEnabled } = useThemeStore();
  
  useEffect(() => {
    if (isAuthenticated && token && notificationsEnabled) {
      registerForPushNotifications();
    }
  }, [isAuthenticated, token, notificationsEnabled]);

  // Notification listeners
  useEffect(() => {
    if (!Notifications) return;

    // Foreground notification received
    if (Notifications.addNotificationReceivedListener) {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        const data = notification?.request?.content?.data;
        console.log('🔔 Notification received:', data);
      });
    }

    // Notification tapped — deep link to chat
    if (Notifications.addNotificationResponseReceivedListener) {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response?.notification?.request?.content?.data;
        console.log('👆 Notification tapped:', data);
        if (data?.chatId) {
          setTimeout(() => router.push(`/chat/${data.chatId}`), 500);
        }
      });
    }

    // Cold start — app opened from killed state via notification
    if (Notifications.getLastNotificationResponseAsync) {
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (response?.notification?.request?.content?.data?.chatId) {
          setTimeout(() => router.push(`/chat/${response.notification.request.content.data.chatId}`), 1000);
        }
      });
    }

    // Reset badge when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        Notifications.setBadgeCountAsync?.(0);
      }
      appState.current = nextAppState;
    });

    return () => {
      // Safe cleanup — check if functions exist before calling
      if (notificationListener.current && Notifications.removeNotificationSubscription) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current && Notifications.removeNotificationSubscription) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      subscription?.remove();
    };
  }, []);

  // Navigation guard
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/chats');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: Colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bgPrimary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="new-chat" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-group" options={{ presentation: 'modal' }} />
        <Stack.Screen name="forward" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

// ─── Push Token Registration ─────────────────────────────────────────────
async function registerForPushNotifications() {
  const { notificationsEnabled } = useThemeStore.getState();
  if (!notificationsEnabled) return;
  
  if (!Notifications) {
    console.warn('🔕 Notifications module not available (Expo Go limitation)');
    return;
  }

  try {
    // 1. Check permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('🔕 Push notification permission denied');
      return;
    }

    // 2. Android notification channel
    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#25D366',
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    // 3. Get Expo push token
    let pushTokenData;
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
      pushTokenData = await Notifications.getExpoPushTokenAsync({
        ...(projectId ? { projectId } : {}),
      });
    } catch (tokenError) {
      console.warn('⚠️ Could not get push token:', tokenError.message);
      return;
    }

    const expoPushToken = pushTokenData.data;
    console.log('🚀 Expo Push Token:', expoPushToken);

    // 4. Register with server
    try {
      await authAPI.registerExpoPushToken(expoPushToken);
      console.log('✅ Push token registered with server');
    } catch (apiError) {
      console.warn('⚠️ Failed to register token:', apiError.message);
    }
  } catch (error) {
    console.error('❌ Notification setup error:', error);
  }
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
