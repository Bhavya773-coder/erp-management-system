import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform, LogBox, AppState } from 'react-native';

// Suppress known SDK and environment-specific warnings for a clean experience
// Called at the absolute top to catch early init warnings
LogBox.ignoreLogs([
  'expo-notifications',
  'expo-notifications:',
  'expo-av',
  'setBehaviorAsync',
  'edge-to-edge',
  'Deprecated',
  'We recommend you instead use a development build',
  'NavigationBar',
]);

import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { useThemeStore } from '../store/themeStore';
import { useTheme } from '@/constants/appTheme';
import { authAPI } from '../lib/api';
import * as NavigationBar from 'expo-navigation-bar';

if (Platform.OS === 'android') {
  NavigationBar.setVisibilityAsync('hidden').catch(() => {});
}

// Lazy-load expo-notifications to prevent crashes in Expo Go
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Silent fail for clean dev console
}

let Constants = null;
try {
  Constants = require('expo-constants');
} catch (e) {
  // Silent fail for clean dev console
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

export default function RootLayout() {
  const { isAuthenticated, isLoading, token, checkAuth, user } = useAuthStore();
  const { mode } = useThemeStore();
  const Colors = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const appState = useRef(AppState.currentState);
  const hasNavigatedFromNotification = useRef(false);

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

  // Helper to navigate to chat only once per notification interaction
  const lastNavigatedChatId = useRef(null);
  const lastNavigatedTime = useRef(0);

  const navigateToChat = (chatId) => {
    const now = Date.now();
    // Debounce: same chatId within 2 seconds
    if (lastNavigatedChatId.current === chatId && (now - lastNavigatedTime.current) < 2000) {
      console.log('⏳ Navigation already in progress or recently completed for:', chatId);
      return;
    }
    
    // Check if we're already in that specific chat to avoid redundant pushes
    const isAlreadyInTargetChat = segments[0] === 'chat' && segments[1] === chatId;
    if (isAlreadyInTargetChat) {
      console.log('✅ Already in target chat, skipping navigation');
      return;
    }

    lastNavigatedChatId.current = chatId;
    lastNavigatedTime.current = now;
    console.log('🚀 Navigating to chat from notification:', chatId);
    
    // Use replace if we're already in a chat to keep stack clean, otherwise push
    const isInAnyChat = segments[0] === 'chat';
    
    setTimeout(() => {
      if (isInAnyChat) {
        router.replace(`/chat/${chatId}`);
      } else {
        router.push(`/chat/${chatId}`);
      }
    }, 100);
  };

  // Notification listeners
  useEffect(() => {
    if (!Notifications) return;

    // Notification tapped — deep link to chat (handles both warm and cold start)
    if (Notifications.addNotificationResponseReceivedListener) {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response?.notification?.request?.content?.data;
        console.log('👆 Notification tapped listener:', data);
        if (data?.chatId) {
          navigateToChat(data.chatId);
        }
      });
    }

    // On some platforms/versions, the listener above handles cold starts.
    // If it doesn't, getLastNotificationResponseAsync acts as a fallback.
    const checkInitialNotification = async () => {
      if (Notifications.getLastNotificationResponseAsync) {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response?.notification?.request?.content?.data?.chatId) {
          const data = response.notification.request.content.data;
          console.log('❄️ Cold start notification fallback check:', data.chatId);
          // Only navigate if the listener hasn't already handled it
          navigateToChat(data.chatId);
        }
      }
    };
    
    // Slight delay for cold start to let the listener fire first if it's going to
    const coldStartTimer = setTimeout(checkInitialNotification, 500);

    // Reset badge when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        Notifications.setBadgeCountAsync?.(0);
      }
      appState.current = nextAppState;
    });

    return () => {
      clearTimeout(coldStartTimer);
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
        <Stack.Screen name="my-vouchers" />
      </Stack>
    </>
  );
}

// ─── Push Token Registration ─────────────────────────────────────────────
async function registerForPushNotifications() {
  if (!Notifications) {
    console.warn('⚠️ Notifications module not loaded');
    return;
  }
  
  try {
    console.log('🔄 Starting notification registration...');
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

    // Android notification channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#25D366',
        showBadge: true,
      });
    }

    // 1. Get Expo Push Token
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        ...(projectId ? { projectId } : {}),
      });
      const expoToken = tokenData.data;
      console.log('🚀 Expo Token:', expoToken);
      await authAPI.registerExpoPushToken(expoToken);
    } catch (expoError) {
      console.warn('⚠️ Expo token failed:', expoError.message);
    }

    // 2. Get Native Device Token (FCM for Android)
    try {
      const deviceTokenData = await Notifications.getDevicePushTokenAsync();
      const deviceToken = deviceTokenData.data;
      console.log('🔥 Native Device Token:', deviceToken);
      
      // Send to server
      await authAPI.registerFCMToken(deviceToken);
      console.log('✅ FCM token registered with server');
    } catch (fcmError) {
      console.warn('⚠️ Native token registration failed:', fcmError.message);
    }

    console.log('✨ Notification setup completed');
  } catch (error) {
    console.error('❌ Notification registration failed:', error);
  }
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
