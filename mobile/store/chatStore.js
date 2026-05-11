import { create } from 'zustand';
import { chatAPI, messageAPI, userAPI } from '../lib/api';
import { useAuthStore } from './authStore';

export const useChatStore = create((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  hasMore: true,
  page: 1,
  users: [],
  isLoading: false,
  error: null,
  typingUsers: {},

  // ─── Chat Actions ───────────────────────────────────────────────────────
  setChats: (chats) => set({ chats }),

  fetchChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await chatAPI.getChats();
      set({ chats: response.data.data.chats, isLoading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch chats',
        isLoading: false,
      });
    }
  },

  setCurrentChat: (chat) => {
    set({ currentChat: chat });
    if (chat) {
      set((state) => ({
        chats: state.chats.map((c) =>
          c.id === chat.id ? { ...c, unreadCount: 0 } : c
        ),
      }));
    }
  },

  fetchChat: async (chatId) => {
    try {
      const isSameChat = get().currentChat?.id === chatId;
      if (!isSameChat) {
        set({ isLoading: true, messages: [], error: null });
      }
      
      const response = await chatAPI.getChat(chatId);
      const msgRes = await messageAPI.getMessages(chatId, { page: 1, limit: 20 });
      set({
        currentChat: response.data.data.chat,
        messages: msgRes.data.data.messages || [],
        hasMore: msgRes.data.data.messages.length >= 20,
        page: 1,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch chat',
        isLoading: false,
      });
    }
  },

  createIndividualChat: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await chatAPI.createIndividualChat(userId);
      const newChat = response.data.data.chat;
      set((state) => ({
        chats: [newChat, ...state.chats.filter((c) => c.id !== newChat.id)],
        currentChat: newChat,
        isLoading: false,
      }));
      return { success: true, chat: newChat };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to create chat',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  createGroup: async (name, memberIds) => {
    set({ isLoading: true, error: null });
    try {
      const response = await chatAPI.createGroup({ name, memberIds });
      const newGroup = response.data.data.chat;
      set((state) => ({
        chats: [newGroup, ...state.chats],
        currentChat: newGroup,
        isLoading: false,
      }));
      return { success: true, chat: newGroup };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to create group',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  deleteChat: async (chatId) => {
    try {
      await chatAPI.deleteChat(chatId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  deleteChatLocal: (chatId) => {
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== chatId),
      currentChat: state.currentChat?.id === chatId ? null : state.currentChat,
      messages: state.currentChat?.id === chatId ? [] : state.messages,
    }));
  },

  // ─── Message Actions ──────────────────────────────────────────────────
  setMessages: (messages) => set({ messages }),

  fetchMessages: async (chatId, page = 1) => {
    try {
      const response = await messageAPI.getMessages(chatId, { page, limit: 20 });
      const newMessages = response.data.data.messages;
      set((state) => ({
        messages: page === 1 ? newMessages : [...newMessages, ...state.messages],
        hasMore: newMessages.length >= 20,
        page,
      }));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  },

  loadMoreMessages: async (chatId) => {
    const { page, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;
    
    set({ isLoading: true });
    try {
      const nextPage = page + 1;
      const response = await messageAPI.getMessages(chatId, { page: nextPage, limit: 20 });
      const newMessages = response.data.data.messages;
      
      set((state) => ({
        messages: [...newMessages, ...state.messages],
        hasMore: newMessages.length >= 20,
        page: nextPage,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Load more messages error:', error);
      set({ isLoading: false });
    }
  },

  searchMessages: async (chatId, query) => {
    try {
      const response = await messageAPI.getMessages(chatId, { search: query });
      return response.data.data.messages;
    } catch (error) {
      console.error('Search messages error:', error);
      return [];
    }
  },

  getChatMedia: async (chatId) => {
    try {
      const response = await messageAPI.getMessages(chatId, { messageType: 'IMAGE,FILE' });
      const msgs = response.data.data.messages;
      return {
        media: msgs.filter(m => m.messageType === 'IMAGE'),
        docs: msgs.filter(m => m.messageType === 'FILE'),
      };
    } catch (error) {
      console.error('Get media error:', error);
      return { media: [], docs: [] };
    }
  },

  upsertChat: (newChat) => {
    set((state) => {
      const chatIndex = state.chats.findIndex((c) => c.id === newChat.id);
      const isCurrentChat = state.currentChat?.id === newChat.id;

      if (chatIndex !== -1) {
        const newChats = [...state.chats];
        newChats[chatIndex] = { ...newChats[chatIndex], ...newChat };
        return {
          chats: newChats.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          ),
          currentChat: isCurrentChat
            ? { ...state.currentChat, ...newChat }
            : state.currentChat,
        };
      } else {
        return {
          chats: [newChat, ...state.chats].sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          ),
        };
      }
    });
  },

  addMessage: (message) => {
    console.log('📩 addMessage called for chatId:', message.chatId);
    set((state) => {
      // 1. Avoid duplicates
      if (state.messages.some((m) => m.id === message.id)) return state;

      // 2. Handle temp messages (sent from this device)
      const tempId = message.tempId || message.id;
      const tempIndex = state.messages.findIndex(m => m.id === tempId || m.tempId === tempId);
      
      let newMessages = [...state.messages];
      if (tempIndex !== -1) {
        newMessages[tempIndex] = message;
      } else {
        newMessages.push(message);
      }

      // 3. Update Chat List
      const myId = useAuthStore.getState().user?.id || useAuthStore.getState().user?._id;
      const chatIndex = state.chats.findIndex((c) => c.id === message.chatId);
      
      if (chatIndex === -1) {
        console.log('🆕 New chat detected, fetching chats...');
        get().fetchChats();
        return { messages: newMessages };
      }

      const updatedChats = [...state.chats];
      const chat = updatedChats[chatIndex];
      const isCurrentChat = state.currentChat?.id === message.chatId;
      const isFromMe = (message.sender?.id || message.sender?._id || message.sender) === myId;

      updatedChats[chatIndex] = {
        ...chat,
        lastMessage: message,
        updatedAt: message.createdAt,
        unreadCount: (!isCurrentChat && !isFromMe) 
          ? (Number(chat.unreadCount) || 0) + 1 
          : (isCurrentChat ? 0 : chat.unreadCount)
      };

      // 4. Sort chats by activity
      updatedChats.sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.lastMessage?.createdAt || 0);
        const bTime = new Date(b.updatedAt || b.lastMessage?.createdAt || 0);
        return bTime - aTime;
      });

      console.log(`✅ Updated counter for chat ${message.chatId}. New unread: ${updatedChats[chatIndex].unreadCount}`);
      return { 
        messages: newMessages, 
        chats: updatedChats 
      };
    });
  },

  updateMessage: (chatId, messageId, updates) => {
    set((state) => {
      const updateObj = (m) => {
        const newM = { ...m };
        Object.keys(updates).forEach(key => {
          if (key.includes('.')) {
            const [parent, child] = key.split('.');
            newM[parent] = { ...newM[parent], [child]: updates[key] };
          } else if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
            newM[key] = { ...newM[key], ...updates[key] };
          } else {
            newM[key] = updates[key];
          }
        });
        return newM;
      };

      return {
        messages: state.messages.map((m) => (m.id === messageId || m._id === messageId) ? updateObj(m) : m),
        chats: state.chats.map((chat) => {
          if (chat.id === chatId && (chat.lastMessage?.id === messageId || chat.lastMessage?._id === messageId)) {
            return { ...chat, lastMessage: updateObj(chat.lastMessage) };
          }
          return chat;
        }),
      };
    });
  },

  deleteMessage: (chatId, messageId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              isDeleted: true,
              content: 'This message was deleted',
              fileUrl: null,
              fileName: null,
            }
          : m
      ),
      chats: state.chats.map((chat) => {
        if (chat.id === chatId && chat.lastMessage?.id === messageId) {
          return {
            ...chat,
            lastMessage: {
              ...chat.lastMessage,
              isDeleted: true,
              content: 'This message was deleted',
            },
          };
        }
        return chat;
      }),
    }));
  },

  updateMessageStatus: (chatId, status, messageId = null) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.chatId === chatId) {
          if (messageId && m.id === messageId) {
            return { ...m, status };
          } else if (
            !messageId &&
            m.senderId ===
              (useAuthStore.getState().user?.id ||
                useAuthStore.getState().user?._id)
          ) {
            return { ...m, status };
          }
        }
        return m;
      }),
      chats: state.chats.map((chat) => {
        if (
          chat.id === chatId &&
          chat.lastMessage &&
          (messageId === chat.lastMessage.id || !messageId)
        ) {
          return {
            ...chat,
            lastMessage: { ...chat.lastMessage, status },
            unreadCount: status === 'SEEN' ? 0 : chat.unreadCount,
          };
        }
        return chat;
      }),
    }));
  },

  // ─── Typing Indicator ─────────────────────────────────────────────────
  setTypingUser: (chatId, userId, isTyping) => {
    set((state) => {
      const currentTyping = state.typingUsers[chatId] || [];
      const newTyping = isTyping
        ? currentTyping.includes(userId)
          ? currentTyping
          : [...currentTyping, userId]
        : currentTyping.filter((id) => id !== userId);

      return {
        typingUsers: { ...state.typingUsers, [chatId]: newTyping },
      };
    });
  },

  // ─── User Management ─────────────────────────────────────────────────
  setUsers: (users) => set({ users }),

  updateUserStatus: (userId, isOnline, lastSeen = null) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, isOnline, lastSeen } : u
      ),
      chats: state.chats.map((chat) => ({
        ...chat,
        members: chat.members.map((m) => {
          const mUserId = (m.user.id || m.user._id)?.toString();
          if (mUserId === userId.toString()) {
            return { ...m, user: { ...m.user, isOnline, lastSeen } };
          }
          return m;
        }),
      })),
    }));
  },

  updateUser: (userId, updates) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, ...updates } : u
      ),
      chats: state.chats.map((chat) => ({
        ...chat,
        members: chat.members.map((m) => {
          const mUserId = (m.user.id || m.user._id)?.toString();
          if (mUserId === userId.toString()) {
            return { ...m, user: { ...m.user, ...updates } };
          }
          return m;
        }),
      })),
    }));
  },

  removeUser: (userId) => {
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
      chats: state.chats.map((chat) => ({
        ...chat,
        members: chat.members.filter((m) => {
          const mUserId = (m.user.id || m.user._id)?.toString();
          return mUserId !== userId.toString();
        }),
      })),
    }));
  },

  addUser: (user) => {
    set((state) => {
      if (state.users.find((u) => u.id === user.id)) return state;
      return {
        users: [...state.users, user].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      };
    });
  },

  fetchUsers: async (params) => {
    try {
      const response = await userAPI.getUsers(params);
      set({ users: response.data.data.users });
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  },

  registerPushNotifications: async () => {
    try {
      console.log('🔔 Registering for push notifications...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('❌ Failed to get push token for push notification!');
        return;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
      console.log('Project ID for notifications:', projectId);

      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        ...(projectId ? { projectId } : {}),
      });
      const expoPushToken = pushTokenData.data;
      console.log('✅ Registered Expo Push Token:', expoPushToken);
      
      await authAPI.registerExpoPushToken(expoPushToken);
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentChat: () => set({ currentChat: null, messages: [] }),
}));
