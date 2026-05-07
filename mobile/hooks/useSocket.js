import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { SOCKET_URL } from '../constants/config';

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
    upsertChat,
  } = useChatStore();

  const { user: authUser } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      // Refresh data on reconnect
      useChatStore.getState().fetchChats();
      const currentChat = useChatStore.getState().currentChat;
      if (currentChat) {
        useChatStore.getState().fetchMessages(currentChat.id);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // ─── Message Events ──────────────────────────────────────────────────
    socket.on('message:received', ({ message }) => {
      addMessage(message);

      const myUserId = authUser?.id || authUser?._id;
      if (message.senderId !== myUserId) {
        socket.emit('message:delivered', {
          messageId: message.id,
          chatId: message.chatId,
        });
      }
    });

    socket.on('message:sent', ({ message }) => {
      addMessage(message);
    });

    socket.on('message:update', ({ messageId, chatId, voucherData }) => {
      useChatStore.getState().updateMessage(chatId, messageId, { voucherData });
    });

    socket.on('message:status_update', ({ chatId, status, messageId }) => {
      updateMessageStatus(chatId, status, messageId);
    });

    socket.on('message:deleted', ({ chatId, messageId }) => {
      deleteMessage(chatId, messageId);
    });

    socket.on('message:updated', ({ chatId, messageId, updates }) => {
      useChatStore.getState().updateMessage(chatId, messageId, updates);
    });

    // ─── Chat Events ─────────────────────────────────────────────────────
    socket.on('chat:updated', ({ chat }) => {
      upsertChat(chat);
    });

    socket.on('chat:deleted', ({ chatId }) => {
      useChatStore.getState().deleteChatLocal(chatId);
    });

    socket.on('message:error', ({ error, tempId }) => {
      console.error('Message error:', error, 'Temp ID:', tempId);
    });

    // ─── Typing Events ──────────────────────────────────────────────────
    socket.on('typing:update', ({ chatId, userId, isTyping }) => {
      setTypingUser(chatId, userId, isTyping);
    });

    // ─── User Events ─────────────────────────────────────────────────────
    socket.on('user:status_update', ({ userId, isOnline, lastSeen }) => {
      updateUserStatus(userId, isOnline, lastSeen);
    });

    socket.on('user:created', ({ user }) => {
      addUser(user);
    });

    socket.on('user:updated', ({ userId, updates }) => {
      updateUser(userId, updates);
      if (userId === (authUser?.id || authUser?._id)) {
        useAuthStore.getState().updateUser(updates);
      }
    });

    socket.on('user:role_updated', ({ role }) => {
      useAuthStore.getState().updateUser({ role });
    });

    socket.on('user:deleted_self', () => {
      useAuthStore.getState().logout();
    });

    socket.on('user:deleted', ({ userId }) => {
      removeUser(userId);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // ─── Socket Actions ─────────────────────────────────────────────────────
  const joinChat = useCallback((chatId) => {
    if (socketRef.current) socketRef.current.emit('chat:join', { chatId });
  }, []);

  const leaveChat = useCallback((chatId) => {
    if (socketRef.current) socketRef.current.emit('chat:leave', { chatId });
  }, []);

  const sendMessage = useCallback((data) => {
    if (socketRef.current) socketRef.current.emit('message:send', data);
  }, []);

  const deleteMessageSocket = useCallback((chatId, messageId) => {
    if (socketRef.current)
      socketRef.current.emit('message:delete', { chatId, messageId });
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

  const completeSchedule = useCallback(async (chatId, messageId) => {
    try {
      const { messageAPI } = require('../lib/api');
      await messageAPI.completeSchedule(messageId);
      if (socketRef.current)
        socketRef.current.emit('message:complete_schedule', {
          chatId,
          messageId,
        });
      useChatStore.getState().updateMessage(chatId, messageId, {
        isCompleted: true,
      });
    } catch (error) {
      console.error('Failed to complete schedule:', error);
    }
  }, []);

  const sendVoucherAction = useCallback((messageId, action) => {
    if (socketRef.current) socketRef.current.emit('voucher:action', { messageId, action });
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
    completeSchedule,
    sendVoucherAction,
  };
};
