import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { messageAPI } from '@/lib/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (token) => {
  const socketRef = useRef(null);
  const { addMessage, updateMessageStatus, setTypingUser, updateUserStatus, updateUser, removeUser, addUser, deleteMessage, upsertChat } = useChatStore();
  const { user: currentUser } = useAuthStore();
  const activeAlarms = useRef({});

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
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Message events
    socket.on('message:received', ({ message }) => {
      console.log('📨 Message received:', message);
      addMessage(message);

      // Handle Notifications
      const { currentChat } = useChatStore.getState();
      const isWindowHidden = document.visibilityState === 'hidden';
      const isDifferentChat = currentChat?.id !== message.chatId;

      if ((isWindowHidden || isDifferentChat) && message.senderId !== (currentUser?.id || currentUser?._id)) {
        if (Notification.permission === 'granted') {
          const notification = new Notification(`New message from ${message.sender?.name || 'Someone'}`, {
            body: message.messageType === 'TEXT' ? message.content : `Sent a ${message.messageType.toLowerCase()}`,
            icon: '/logo.png' // Updated to the official transparent logo
          });

          notification.onclick = () => {
            window.focus();
            // Optional: navigate to chat
          };
        }
      }

      // Acknowledge delivery if we are the recipient
      if (message.senderId !== (currentUser?.id || currentUser?._id)) {
        socket.emit('message:delivered', { 
          messageId: message.id, 
          chatId: message.chatId 
        });
      }
    });

    socket.on('message:sent', ({ message }) => {
      console.log('✉️ Message sent confirmation:', message);
      addMessage(message);
    });

    socket.on('message:status_update', ({ chatId, status, messageId }) => {
      updateMessageStatus(chatId, status, messageId);
    });

    socket.on('message:deleted', ({ chatId, messageId }) => {
      deleteMessage(chatId, messageId);
    });

    socket.on('message:updated', ({ chatId, messageId, updates }) => {
      useChatStore.getState().updateMessage(chatId, messageId, updates);
      
      // If marked as completed, stop the alarm for this message
      if (updates.isCompleted && activeAlarms.current[messageId]) {
        activeAlarms.current[messageId].pause();
        activeAlarms.current[messageId].currentTime = 0;
        delete activeAlarms.current[messageId];
      }
    });

    socket.on('chat:updated', ({ chat }) => {
      console.log('🔄 Chat updated:', chat.id);
      upsertChat(chat);
    });

    socket.on('chat:deleted', ({ chatId }) => {
      console.log('🗑️ Chat deleted for everyone:', chatId);
      // We'll add this method to the store to handle local removal
      useChatStore.getState().deleteChatLocal(chatId);
    });

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

    socket.on('user:created', ({ user }) => {
      console.log('🆕 User created:', user.name);
      addUser(user);
    });

    socket.on('user:updated', ({ userId, updates }) => {
      console.log('👤 User updated:', userId, updates);
      updateUser(userId, updates);
      
      // If it's the current user, update auth store too
      if (userId === (currentUser?.id || currentUser?._id)) {
        useAuthStore.getState().updateUser(updates);
      }
    });

    socket.on('user:role_updated', ({ role }) => {
      console.log('🎖️ Role updated to:', role);
      useAuthStore.getState().updateUser({ role });
      // Optional: Show a toast or notification
    });

    socket.on('user:deleted_self', () => {
      console.log('🚫 Account deleted, logging out...');
      useAuthStore.getState().logout();
      window.location.href = '/login';
    });

    socket.on('user:deleted', ({ userId }) => {
      console.log('🗑️ User deleted:', userId);
      removeUser(userId);
    });

    socket.on('notification:schedule_due', (data) => {
      console.log('⏰ Schedule due notification:', data);
      
      // If already completed, don't ring
      if (data.isCompleted) return;

      // Play notification sound in a loop
      try {
        const audio = new Audio('/alarm.wav');
        audio.loop = true;
        audio.play().catch(e => console.log('Audio play failed:', e));
        
        // Track this alarm
        activeAlarms.current[data.messageId] = audio;

        // Stop the "alarm" when any key is pressed or clicked
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
          icon: '/logo.png',
          tag: data.messageId // Prevent duplicate notifications
        });
      } else {
        alert(`⏰ REMINDER: ${data.title}\nBy: ${data.senderName}`);
      }
    });

    // Cleanup
    return () => {
      // Stop all active alarms on unmount
      Object.values(activeAlarms.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      activeAlarms.current = {};
      socket.disconnect();
    };
  }, [token, addMessage, updateMessageStatus, setTypingUser, updateUserStatus, updateUser, removeUser, addUser, deleteMessage, upsertChat, currentUser]);

  // Socket actions
  const joinChat = useCallback((chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:join', { chatId });
    }
  }, []);

  const leaveChat = useCallback((chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:leave', { chatId });
    }
  }, []);

  const sendMessage = useCallback((data) => {
    if (socketRef.current) {
      socketRef.current.emit('message:send', data);
    }
  }, []);

  const completeSchedule = useCallback(async (chatId, messageId) => {
    try {
      // 1. Call API for absolute persistence (fallback for socket)
      await messageAPI.completeSchedule(messageId);
      
      // 2. Also emit via socket for real-time sync
      if (socketRef.current) {
        socketRef.current.emit('message:complete_schedule', { chatId, messageId });
      }
      
      // 3. Update local store immediately
      useChatStore.getState().updateMessage(chatId, messageId, { isCompleted: true });
    } catch (error) {
      console.error('Failed to complete schedule:', error);
    }
  }, []);

  const deleteMessageSocket = useCallback((chatId, messageId) => {
    if (socketRef.current) {
      socketRef.current.emit('message:delete', { chatId, messageId });
    }
  }, []);

  const startTyping = useCallback((chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing:start', { chatId });
    }
  }, []);

  const stopTyping = useCallback((chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing:stop', { chatId });
    }
  }, []);

  const markMessagesSeen = useCallback((chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('message:seen', { chatId });
    }
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
  };
};
