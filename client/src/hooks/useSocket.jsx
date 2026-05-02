import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { messageAPI, authAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Singleton push subscription handler at module level
let pushSynced = false;
let pushSyncInProgress = false;

async function subscribeToPushSingleton() {
  if (pushSyncInProgress) return;
  if (pushSynced) return;

  pushSyncInProgress = true;
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return;
    }

    console.log('🔄 Syncing push subscription...');
    const registration = await navigator.serviceWorker.ready;

    // Force fresh subscription to avoid VAPID key mismatch issues
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
      console.log('🗑️ Unsubscribed old push token');
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
    });

    // Send to backend using authAPI
    await authAPI.subscribeToPush(subscription);
    console.log('✅ Push subscription synced with server');
    pushSynced = true;
  } catch (error) {
    console.error('❌ Push subscription failed:', error);
  } finally {
    pushSyncInProgress = false;
  }
}

export const useSocket = (token) => {
  const socketRef = useRef(null);
  const {
    addMessage,
    updateMessageStatus,
    setTypingUser,
    updateUserStatus,
    updateUser,
    removeUser,
    addUser,
    deleteMessage,
    upsertChat
  } = useChatStore();

  // Get current user from localStorage (per-tab isolation)
  const getUserFromStorage = useCallback(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return {
          id: user.id,
          _id: user._id,
          name: user.name
        };
      }
    } catch (e) {
      console.error('Failed to parse stored user:', e);
    }
    return null;
  }, []);

  const currentUser = getUserFromStorage();

  const { toast } = useToast();
  const activeAlarms = useRef({});

  // BUG 1 FIX: Changed dependency array to only [token].
  // Store actions are destructured at module level for stable references.
  useEffect(() => {
    if (!token) return;

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);

      // Fetch latest data to catch up on missed messages during disconnect
      useChatStore.getState().fetchChats();
      const currentChat = useChatStore.getState().currentChat;
      if (currentChat) {
        useChatStore.getState().fetchMessages(currentChat.id);
      }

      // Request/Verify Push Notification permission
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') subscribeToPushSingleton();
        });
      } else if (Notification.permission === 'granted') {
        subscribeToPushSingleton();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Message events - Main received handler
    socket.on('message:received', ({ message }) => {
      console.log('📨 Message received:', message);
      addMessage(message);

      // Handle Notifications
      const { currentChat } = useChatStore.getState();
      const isWindowHidden = document.visibilityState === 'hidden';
      const isDifferentChat = currentChat?.id !== message.chatId;

      // WhatsApp-style: Only notify if hidden, different chat, or not from me
      if ((isWindowHidden || isDifferentChat) && message.senderId !== (currentUser?.id || currentUser?._id)) {
        // Play notification sound
        const audio = new Audio('/alarm.wav');
        audio.volume = 0.5;
        audio.play().catch(() => {});

        if (Notification.permission === 'granted') {
          // Foreground notification
          const notification = new Notification(`New message from ${message.sender?.name || 'Someone'}`, {
            body: message.messageType === 'TEXT' ? message.content : `Sent a ${message.messageType.toLowerCase()}`,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: message.id, // Unique tag for every message
            renotify: true,
            vibrate: [200, 100, 200],
            data: { url: '/' }
          });

          notification.onclick = () => {
            window.focus();
          };
        }

        // Always show toast notification in-app
        toast({
          title: `New message from ${message.sender?.name || 'Someone'}`,
          description: message.messageType === 'TEXT' ? message.content : `Sent a ${message.messageType.toLowerCase()}`,
          duration: 4000,
        });
      }

      // Acknowledge delivery if we are the recipient
      if (message.senderId !== (currentUser?.id || currentUser?._id)) {
        socket.emit('message:delivered', {
          messageId: message.id,
          chatId: message.chatId
        });
      }
    });

    // Message sent event - for optimistic update
    socket.on('message:sent', ({ message }) => {
      addMessage(message);
    });

    // Status update event - handles delivery/read ticks
    socket.on('message:status_update', ({ chatId, status, messageId }) => {
      updateMessageStatus(chatId, status, messageId);
    });

    // Message deleted event
    socket.on('message:deleted', ({ chatId, messageId }) => {
      deleteMessage(chatId, messageId);
    });

    // Message updated event (schedules, etc)
    socket.on('message:updated', ({ chatId, messageId, updates }) => {
      useChatStore.getState().updateMessage(chatId, messageId, updates);

      if (updates.isCompleted && activeAlarms.current[messageId]) {
        activeAlarms.current[messageId].pause();
        activeAlarms.current[messageId].currentTime = 0;
        delete activeAlarms.current[messageId];
      }
    });

    // Chat updated event
    socket.on('chat:updated', ({ chat }) => {
      upsertChat(chat);
    });

    // Chat deleted event
    socket.on('chat:deleted', ({ chatId }) => {
      useChatStore.getState().deleteChatLocal(chatId);
    });

    // Message error event
    socket.on('message:error', ({ error, tempId }) => {
      console.error('Message error:', error, 'Temp ID:', tempId);
    });

    // Typing events
    socket.on('typing:update', ({ chatId, userId, isTyping }) => {
      setTypingUser(chatId, userId, isTyping);
    });

    // User status events
    socket.on('user:status_update', ({ userId, isOnline, lastSeen }) => {
      updateUserStatus(userId, isOnline, lastSeen);
    });

    // User created event
    socket.on('user:created', ({ user }) => {
      addUser(user);
    });

    // User updated event
    socket.on('user:updated', ({ userId, updates }) => {
      updateUser(userId, updates);
      if (userId === (currentUser?.id || currentUser?._id)) {
        useAuthStore.getState().updateUser(updates);
      }
    });

    // User role updated event
    socket.on('user:role_updated', ({ role }) => {
      useAuthStore.getState().updateUser({ role });
    });

    // User deleted self event
    socket.on('user:deleted_self', () => {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    });

    // User deleted event
    socket.on('user:deleted', ({ userId }) => {
      removeUser(userId);
    });

    // Schedule reminder event
    socket.on('notification:schedule_due', (data) => {
      if (data.isCompleted) return;

      try {
        const audio = new Audio('/alarm.wav');
        audio.loop = true;
        audio.play().catch(() => {});
        activeAlarms.current[data.messageId] = audio;

        const stopAlarm = () => {
          if (activeAlarms.current[data.messageId]) {
            audio.pause();
            audio.currentTime = 0;
            delete activeAlarms.current[data.messageId];
          }
          document.removeEventListener('click', stopAlarm);
          document.removeEventListener('keydown', stopAlarm);
        };
        document.addEventListener('click', stopAlarm);
        document.addEventListener('keydown', stopAlarm);
      } catch (err) {
        console.error('Failed to play notification sound:', err);
      }

      if (Notification.permission === 'granted') {
        new Notification(`Reminder: ${data.title}`, {
          body: `Created by ${data.senderName}`,
          icon: '/pwa-192x192.png',
          tag: data.messageId
        });
      }
    });

    return () => {
      Object.values(activeAlarms.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      activeAlarms.current = {};
      socket.disconnect();
    };
  }, [token, currentUser, addMessage, updateMessageStatus, setTypingUser, updateUserStatus, updateUser, removeUser, addUser, deleteMessage, upsertChat, subscribeToPushSingleton]);

  // Socket actions
  const joinChat = useCallback((chatId) => {
    if (socketRef.current) socketRef.current.emit('chat:join', { chatId });
  }, []);

  const leaveChat = useCallback((chatId) => {
    if (socketRef.current) socketRef.current.emit('chat:leave', { chatId });
  }, []);

  const sendMessage = useCallback((data) => {
    if (socketRef.current) socketRef.current.emit('message:send', data);
  }, []);

  const completeSchedule = useCallback(async (chatId, messageId) => {
    try {
      await messageAPI.completeSchedule(messageId);
      if (socketRef.current) socketRef.current.emit('message:complete_schedule', { chatId, messageId });
      useChatStore.getState().updateMessage(chatId, messageId, { isCompleted: true });
    } catch (error) {
      console.error('Failed to complete schedule:', error);
    }
  }, []);

  const deleteMessageSocket = useCallback((chatId, messageId) => {
    if (socketRef.current) socketRef.current.emit('message:delete', { chatId, messageId });
  }, []);

  const startTyping = useCallback((chatId) => {
    if (socketRef.current) socketRef.current.emit('typing:start', { chatId });
  }, []);

  const stopTyping = useCallback((chatId) => {
    if (socketRef.current) socketRef.current.emit('typing:stop', { chatId });
  }, []);

  const markMessagesSeen = useCallback((chatId) => {
    if (socketRef.current) socketRef.current.emit('message:seen', { chatId });
  }, []);

  const stopLocalAlarm = useCallback((messageId) => {
    if (activeAlarms.current[messageId]) {
      activeAlarms.current[messageId].pause();
      activeAlarms.current[messageId].currentTime = 0;
      delete activeAlarms.current[messageId];
    }
  }, []);

  return {
    socket: socketRef.current,
    joinChat,
    leaveChat,
    sendMessage,
    completeSchedule,
    stopLocalAlarm,
    deleteMessageSocket,
    startTyping,
    stopTyping,
    markMessagesSeen,
    subscribeToPush: subscribeToPushSingleton
  };
};
