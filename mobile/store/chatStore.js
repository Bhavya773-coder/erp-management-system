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

  // ─── Cache Management ───────────────────────────────────────────────────
  messagesByChat: {}, // Cache: { [chatId]: Message[] }
  chatPagination: {}, // Cache: { [chatId]: { page: number, hasMore: boolean } }

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
      // Clear unread count locally
      set((state) => ({
        chats: state.chats.map((c) =>
          c.id === chat.id ? { ...c, unreadCount: 0 } : c
        ),
      }));

      // Instant UI Update from Cache
      const cachedMessages = get().messagesByChat[chat.id] || [];
      const cachedPagination = get().chatPagination[chat.id] || { page: 1, hasMore: true };
      
      set({ 
        messages: cachedMessages,
        page: cachedPagination.page,
        hasMore: cachedPagination.hasMore
      });
    }
  },

  lastFetchId: null,

  fetchChat: async (chatId) => {
    const fetchId = Date.now().toString() + Math.random().toString();
    set({ lastFetchId: fetchId });

    // 1. Instant switch if in cache
    const cachedMessages = get().messagesByChat[chatId];
    if (cachedMessages) {
      const cachedPagination = get().chatPagination[chatId] || { page: 1, hasMore: true };
      set({ 
        messages: cachedMessages,
        page: cachedPagination.page,
        hasMore: cachedPagination.hasMore,
        isLoading: false // Don't show full-screen loader if we have data
      });
    } else {
      set({ isLoading: true, messages: [], error: null });
    }

    try {
      const [response, msgRes] = await Promise.all([
        chatAPI.getChat(chatId),
        messageAPI.getMessages(chatId, { page: 1, limit: 20 })
      ]);

      if (get().lastFetchId !== fetchId) return;

      const newMessages = msgRes.data.data.messages || [];
      const newChat = response.data.data.chat;
      const pagination = { page: 1, hasMore: newMessages.length >= 20 };

      // Update both global state and cache
      set((state) => ({
        currentChat: newChat,
        messages: newMessages,
        hasMore: pagination.hasMore,
        page: 1,
        isLoading: false,
        messagesByChat: { ...state.messagesByChat, [chatId]: newMessages },
        chatPagination: { ...state.chatPagination, [chatId]: pagination }
      }));
    } catch (error) {
      if (get().lastFetchId === fetchId) {
        set({
          error: error.response?.data?.message || 'Failed to fetch chat',
          isLoading: false,
        });
      }
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
    set((state) => {
      const { [chatId]: _, ...remainingMessages } = state.messagesByChat;
      const { [chatId]: __, ...remainingPagination } = state.chatPagination;
      return {
        chats: state.chats.filter((c) => c.id !== chatId),
        currentChat: state.currentChat?.id === chatId ? null : state.currentChat,
        messages: state.currentChat?.id === chatId ? [] : state.messages,
        messagesByChat: remainingMessages,
        chatPagination: remainingPagination
      };
    });
  },

  // ─── Message Actions ──────────────────────────────────────────────────
  setMessages: (messages) => {
    const chatId = get().currentChat?.id;
    if (chatId) {
      set((state) => ({
        messages,
        messagesByChat: { ...state.messagesByChat, [chatId]: messages }
      }));
    } else {
      set({ messages });
    }
  },

  fetchMessages: async (chatId, page = 1) => {
    try {
      const response = await messageAPI.getMessages(chatId, { page, limit: 20 });
      const newMessages = response.data.data.messages;
      const pagination = { page, hasMore: newMessages.length >= 20 };

      set((state) => {
        const updatedMessages = page === 1 ? newMessages : [...newMessages, ...(state.messagesByChat[chatId] || [])];
        return {
          messages: state.currentChat?.id === chatId ? updatedMessages : state.messages,
          hasMore: state.currentChat?.id === chatId ? pagination.hasMore : state.hasMore,
          page: state.currentChat?.id === chatId ? page : state.page,
          messagesByChat: { ...state.messagesByChat, [chatId]: updatedMessages },
          chatPagination: { ...state.chatPagination, [chatId]: pagination }
        };
      });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  },

  loadMoreMessages: async (chatId) => {
    const chatState = get().chatPagination[chatId] || { page: 1, hasMore: true };
    if (!chatState.hasMore || get().isLoading) return;
    
    set({ isLoading: true });
    try {
      const nextPage = chatState.page + 1;
      const response = await messageAPI.getMessages(chatId, { page: nextPage, limit: 20 });
      const newMessages = response.data.data.messages;
      const pagination = { page: nextPage, hasMore: newMessages.length >= 20 };
      
      set((state) => {
        const updatedMessages = [...newMessages, ...(state.messagesByChat[chatId] || [])];
        return {
          messages: state.currentChat?.id === chatId ? updatedMessages : state.messages,
          hasMore: state.currentChat?.id === chatId ? pagination.hasMore : state.hasMore,
          page: state.currentChat?.id === chatId ? nextPage : state.page,
          isLoading: false,
          messagesByChat: { ...state.messagesByChat, [chatId]: updatedMessages },
          chatPagination: { ...state.chatPagination, [chatId]: pagination }
        };
      });
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
    set((state) => {
      const chatId = message.chatId;
      const currentCache = state.messagesByChat[chatId] || [];
      
      // 1. Avoid duplicates
      if (currentCache.some((m) => m.id === message.id)) return state;

      // 2. Handle temp messages
      const tempId = message.tempId || message.id;
      const tempIndex = currentCache.findIndex(m => m.id === tempId || m.tempId === tempId);
      
      let updatedCache = [...currentCache];
      if (tempIndex !== -1) {
        updatedCache[tempIndex] = message;
      } else {
        updatedCache.push(message);
      }

      // 3. Update Chat List
      const myId = useAuthStore.getState().user?.id || useAuthStore.getState().user?._id;
      const chatIndex = state.chats.findIndex((c) => c.id === chatId);
      
      const updatedChats = [...state.chats];
      if (chatIndex !== -1) {
        const chat = updatedChats[chatIndex];
        const isCurrentChat = state.currentChat?.id === chatId;
        const isFromMe = (message.sender?.id || message.sender?._id || message.sender) === myId;

        updatedChats[chatIndex] = {
          ...chat,
          lastMessage: message,
          updatedAt: message.createdAt,
          unreadCount: (!isCurrentChat && !isFromMe) 
            ? (Number(chat.unreadCount) || 0) + 1 
            : (isCurrentChat ? 0 : chat.unreadCount)
        };

        updatedChats.sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.lastMessage?.createdAt || 0);
          const bTime = new Date(b.updatedAt || b.lastMessage?.createdAt || 0);
          return bTime - aTime;
        });
      } else {
        get().fetchChats();
      }

      return { 
        messages: state.currentChat?.id === chatId ? updatedCache : state.messages,
        messagesByChat: { ...state.messagesByChat, [chatId]: updatedCache },
        chats: updatedChats 
      };
    });
  },

  updateMessage: (chatId, messageId, updates) => {
    set((state) => {
      const updateMsg = (m) => {
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

      const updatedCache = (state.messagesByChat[chatId] || []).map(m => 
        (m.id === messageId || m._id === messageId) ? updateMsg(m) : m
      );

      return {
        messages: state.currentChat?.id === chatId ? updatedCache : state.messages,
        messagesByChat: { ...state.messagesByChat, [chatId]: updatedCache },
        chats: state.chats.map((chat) => {
          if (chat.id === chatId && (chat.lastMessage?.id === messageId || chat.lastMessage?._id === messageId)) {
            return { ...chat, lastMessage: updateMsg(chat.lastMessage) };
          }
          return chat;
        }),
      };
    });
  },

  deleteMessage: (chatId, messageId) => {
    set((state) => {
      const deleter = (m) => (m.id === messageId) ? {
        ...m,
        isDeleted: true,
        content: 'This message was deleted',
        fileUrl: null,
        fileName: null,
      } : m;

      const updatedCache = (state.messagesByChat[chatId] || []).map(deleter);

      return {
        messages: state.currentChat?.id === chatId ? updatedCache : state.messages,
        messagesByChat: { ...state.messagesByChat, [chatId]: updatedCache },
        chats: state.chats.map((chat) => {
          if (chat.id === chatId && chat.lastMessage?.id === messageId) {
            return { ...chat, lastMessage: deleter(chat.lastMessage) };
          }
          return chat;
        }),
      };
    });
  },

  updateMessageStatus: (chatId, status, messageId = null) => {
    set((state) => {
      const myId = useAuthStore.getState().user?.id || useAuthStore.getState().user?._id;
      const statusUpdater = (m) => {
        if (m.chatId === chatId) {
          if (messageId && (m.id === messageId || m._id === messageId)) return { ...m, status };
          if (!messageId && (m.senderId === myId || m.sender === myId || m.sender?.id === myId)) return { ...m, status };
        }
        return m;
      };

      const updatedCache = (state.messagesByChat[chatId] || []).map(statusUpdater);

      return {
        messages: state.currentChat?.id === chatId ? updatedCache : state.messages,
        messagesByChat: { ...state.messagesByChat, [chatId]: updatedCache },
        chats: state.chats.map((chat) => {
          if (chat.id === chatId && chat.lastMessage && (messageId === chat.lastMessage.id || !messageId)) {
            return {
              ...chat,
              lastMessage: statusUpdater(chat.lastMessage),
              unreadCount: status === 'SEEN' ? 0 : chat.unreadCount,
            };
          }
          return chat;
        }),
      };
    });
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
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const pushTokenData = await Notifications.getExpoPushTokenAsync();
      await authAPI.registerExpoPushToken(pushTokenData.data);
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentChat: () => set({ currentChat: null, messages: [] }),
}));
