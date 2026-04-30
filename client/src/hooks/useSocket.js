import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (token) => {
  const socketRef = useRef(null);
  const { addMessage, updateMessageStatus, setTypingUser, updateUserStatus, updateUser, removeUser, addUser, deleteMessage, upsertChat } = useChatStore();
  const { user: currentUser } = useAuthStore();

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

    socket.on('chat:updated', ({ chat }) => {
      console.log('🔄 Chat updated:', chat.id);
      upsertChat(chat);
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

    // Cleanup
    return () => {
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

  return {
    socket: socketRef.current,
    joinChat,
    leaveChat,
    sendMessage,
    deleteMessageSocket,
    startTyping,
    stopTyping,
    markMessagesSeen,
  };
};
