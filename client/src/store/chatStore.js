import { create } from 'zustand';
import { chatAPI, messageAPI, userAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export const useChatStore = create((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  users: [],
  isLoading: false,
  error: null,
  typingUsers: {},

  // ─── Cache Management ───────────────────────────────────────────────────
  messagesByChat: {}, // Cache: { [chatId]: Message[] }

  // Chat actions
  setChats: (chats) => set({ chats }),
  
  fetchChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await chatAPI.getChats();
      set({ 
        chats: response.data.data.chats, 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch chats', 
        isLoading: false 
      });
    }
  },

  setCurrentChat: (chat) => {
    set({ currentChat: chat });
    if (chat) {
      // Clear unread count for the selected chat
      set((state) => ({
        chats: state.chats.map(c => 
          c.id === chat.id ? { ...c, unreadCount: 0 } : c
        ),
        // Instant UI Update from Cache
        messages: state.messagesByChat[chat.id] || []
      }));
    }
  },

  lastFetchId: null,

  fetchChat: async (chatId) => {
    const fetchId = Date.now().toString() + Math.random().toString();
    set({ lastFetchId: fetchId });
    
    // Instant switch if in cache
    const cachedMessages = get().messagesByChat[chatId];
    if (cachedMessages) {
      set({ messages: cachedMessages, isLoading: false });
    } else {
      set({ isLoading: true, messages: [], error: null });
    }
    
    try {
      const response = await chatAPI.getChat(chatId);
      
      if (get().lastFetchId !== fetchId) return;

      const newMessages = response.data.data.messages || [];
      const newChat = response.data.data.chat;

      set((state) => ({ 
        currentChat: newChat, 
        messages: newMessages,
        isLoading: false,
        messagesByChat: { ...state.messagesByChat, [chatId]: newMessages }
      }));
    } catch (error) {
      if (get().lastFetchId === fetchId) {
        set({ 
          error: error.response?.data?.message || 'Failed to fetch chat', 
          isLoading: false 
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
        chats: [newChat, ...state.chats.filter(c => c.id !== newChat.id)],
        currentChat: newChat,
        isLoading: false
      }));
      
      return { success: true, chat: newChat };
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to create chat', 
        isLoading: false 
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
        isLoading: false
      }));
      
      return { success: true, chat: newGroup };
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to create group', 
        isLoading: false 
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
      return {
        chats: state.chats.filter(c => c.id !== chatId),
        currentChat: state.currentChat?.id === chatId ? null : state.currentChat,
        messages: state.currentChat?.id === chatId ? [] : state.messages,
        messagesByChat: remainingMessages
      };
    });
  },

  // Message actions
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
  
  fetchMessages: async (chatId) => {
    const fetchId = Date.now().toString() + Math.random().toString();
    set({ lastFetchId: fetchId });

    // Instant switch if in cache
    const cachedMessages = get().messagesByChat[chatId];
    if (cachedMessages) {
      set({ messages: cachedMessages });
    }

    try {
      const response = await messageAPI.getMessages(chatId);
      
      if (get().lastFetchId !== fetchId) return;

      const newMessages = response.data.data.messages || [];
      set((state) => ({ 
        messages: state.currentChat?.id === chatId ? newMessages : state.messages,
        messagesByChat: { ...state.messagesByChat, [chatId]: newMessages }
      }));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  },

  upsertChat: (newChat) => {
    set((state) => {
      const chatIndex = state.chats.findIndex(c => c.id === newChat.id);
      const isCurrentChat = state.currentChat?.id === newChat.id;
      
      if (chatIndex !== -1) {
        const newChats = [...state.chats];
        newChats[chatIndex] = { ...newChats[chatIndex], ...newChat };
        return { 
          chats: newChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
          currentChat: isCurrentChat ? { ...state.currentChat, ...newChat } : state.currentChat
        };
      } else {
        return { 
          chats: [newChat, ...state.chats].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) 
        };
      }
    });
  },

  addMessage: (message) => {
    set((state) => {
      const chatId = message.chatId;
      const currentCache = state.messagesByChat[chatId] || [];

      if (currentCache.find(m => m.id === message.id)) return state;
      
      const tempId = message.tempId || message.id;
      const tempIndex = currentCache.findIndex(m => m.id === tempId || m.tempId === tempId);
      
      let updatedCache = [...currentCache];
      if (tempIndex !== -1) {
        updatedCache[tempIndex] = message;
      } else {
        updatedCache.push(message);
      }
      
      const updatedChats = state.chats.map(chat => {
        if (chat.id === chatId) {
          const isCurrentChat = state.currentChat?.id === chatId;
          const isFromMe = (message.senderId || message.sender?.id || message.sender?._id) === (useAuthStore.getState().user?.id || useAuthStore.getState().user?._id);
          
          return {
            ...chat,
            lastMessage: message,
            unreadCount: (!isCurrentChat && !isFromMe) ? (chat.unreadCount || 0) + 1 : 0
          };
        }
        return chat;
      });
      
      updatedChats.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });
      
      return { 
        messages: state.currentChat?.id === chatId ? updatedCache : state.messages,
        messagesByChat: { ...state.messagesByChat, [chatId]: updatedCache },
        chats: updatedChats
      };
    });
  },

  updateMessage: (chatId, messageId, updates) => {
    set((state) => {
      const updatedCache = (state.messagesByChat[chatId] || []).map(m => 
        m.id === messageId ? { ...m, ...updates } : m
      );

      return {
        messages: state.currentChat?.id === chatId ? updatedCache : state.messages,
        messagesByChat: { ...state.messagesByChat, [chatId]: updatedCache },
        chats: state.chats.map(chat => {
          if (chat.id === chatId && chat.lastMessage?.id === messageId) {
            return { ...chat, lastMessage: { ...chat.lastMessage, ...updates } };
          }
          return chat;
        })
      };
    });
  },

  deleteMessage: (chatId, messageId) => {
    set((state) => {
      const deleter = (m) => m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted', fileUrl: null, fileName: null } : m;
      const updatedCache = (state.messagesByChat[chatId] || []).map(deleter);

      return {
        messages: state.currentChat?.id === chatId ? updatedCache : state.messages,
        messagesByChat: { ...state.messagesByChat, [chatId]: updatedCache },
        chats: state.chats.map(chat => {
          if (chat.id === chatId && chat.lastMessage?.id === messageId) {
            return { ...chat, lastMessage: deleter(chat.lastMessage) };
          }
          return chat;
        })
      };
    });
  },

  updateMessageStatus: (chatId, status, messageId = null) => {
    set((state) => {
      const myId = useAuthStore.getState().user?.id || useAuthStore.getState().user?._id;
      const statusUpdater = (m) => {
        if (m.chatId === chatId) {
          if (messageId && m.id === messageId) return { ...m, status };
          if (!messageId && m.senderId === myId) return { ...m, status };
        }
        return m;
      };

      const updatedCache = (state.messagesByChat[chatId] || []).map(statusUpdater);

      return {
        messages: state.currentChat?.id === chatId ? updatedCache : state.messages,
        messagesByChat: { ...state.messagesByChat, [chatId]: updatedCache },
        chats: state.chats.map(chat => {
          if (chat.id === chatId && chat.lastMessage && (messageId === chat.lastMessage.id || !messageId)) {
            return {
              ...chat,
              lastMessage: statusUpdater(chat.lastMessage),
              unreadCount: status === 'SEEN' ? 0 : chat.unreadCount
            };
          }
          return chat;
        })
      };
    });
  },

  // Typing indicator
  setTypingUser: (chatId, userId, isTyping) => {
    set((state) => {
      const currentTyping = state.typingUsers[chatId] || [];
      const newTyping = isTyping 
        ? (currentTyping.includes(userId) ? currentTyping : [...currentTyping, userId])
        : currentTyping.filter(id => id !== userId);
        
      return {
        typingUsers: { ...state.typingUsers, [chatId]: newTyping }
      };
    });
  },

  // Users
  setUsers: (users) => set({ users }),
  
  updateUserStatus: (userId, isOnline, lastSeen = null) => {
    set((state) => ({
      users: state.users.map(u => 
        u.id === userId ? { ...u, isOnline, lastSeen } : u
      ),
      chats: state.chats.map(chat => ({
        ...chat,
        members: chat.members.map(m => {
          const mUserId = (m.user.id || m.user._id)?.toString();
          if (mUserId === userId.toString()) {
            return { ...m, user: { ...m.user, isOnline, lastSeen } };
          }
          return m;
        })
      }))
    }));
  },

  updateUser: (userId, updates) => {
    set((state) => ({
      users: state.users.map(u => 
        u.id === userId ? { ...u, ...updates } : u
      ),
      chats: state.chats.map(chat => ({
        ...chat,
        members: chat.members.map(m => {
          const mUserId = (m.user.id || m.user._id)?.toString();
          if (mUserId === userId.toString()) {
            return { ...m, user: { ...m.user, ...updates } };
          }
          return m;
        })
      }))
    }));
  },

  removeUser: (userId) => {
    set((state) => ({
      users: state.users.filter(u => u.id !== userId),
      chats: state.chats.map(chat => ({
        ...chat,
        members: chat.members.filter(m => {
          const mUserId = (m.user.id || m.user._id)?.toString();
          return mUserId !== userId.toString();
        })
      }))
    }));
  },

  addUser: (user) => {
    set((state) => {
      if (state.users.find(u => u.id === user.id)) return state;
      return {
        users: [...state.users, user].sort((a, b) => a.name.localeCompare(b.name))
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

  clearError: () => set({ error: null }),
  clearCurrentChat: () => set({ currentChat: null, messages: [] }),
}));
