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
        )
      }));
    }
  },

  fetchChat: async (chatId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await chatAPI.getChat(chatId);
      set({ 
        currentChat: response.data.data.chat, 
        messages: response.data.data.messages || [],
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch chat', 
        isLoading: false 
      });
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
      // No need to call deleteChatLocal here because the server 
      // will emit 'chat:deleted' which we handle in useSocket
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  deleteChatLocal: (chatId) => {
    set((state) => ({
      chats: state.chats.filter(c => c.id !== chatId),
      currentChat: state.currentChat?.id === chatId ? null : state.currentChat,
      messages: state.currentChat?.id === chatId ? [] : state.messages
    }));
  },

  // Message actions
  setMessages: (messages) => set({ messages }),
  
  fetchMessages: async (chatId) => {
    try {
      const response = await messageAPI.getMessages(chatId);
      set({ messages: response.data.data.messages });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  },

  upsertChat: (newChat) => {
    set((state) => {
      const chatIndex = state.chats.findIndex(c => c.id === newChat.id);
      
      // Update current chat if it's the same one
      const isCurrentChat = state.currentChat?.id === newChat.id;
      
      if (chatIndex !== -1) {
        // Update existing
        const newChats = [...state.chats];
        newChats[chatIndex] = { ...newChats[chatIndex], ...newChat };
        return { 
          chats: newChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
          currentChat: isCurrentChat ? { ...state.currentChat, ...newChat } : state.currentChat
        };
      } else {
        // Add new
        return { 
          chats: [newChat, ...state.chats].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) 
        };
      }
    });
  },

  addMessage: (message) => {
    set((state) => {
      // Check if message already exists by real ID
      if (state.messages.find(m => m.id === message.id)) {
        return state;
      }
      
      // Check if this is a confirmation of an optimistic message
      const tempMessageIndex = state.messages.findIndex(m => m.id === message.tempId || (m.tempId && m.tempId === message.tempId));
      
      let newMessages;
      if (tempMessageIndex !== -1) {
        // Replace temp message with real one
        newMessages = [...state.messages];
        newMessages[tempMessageIndex] = message;
      } else {
        newMessages = [...state.messages, message];
      }
      
      // Update last message and unread count in chat list
      const updatedChats = state.chats.map(chat => {
        if (chat.id === message.chatId) {
          const isCurrentChat = state.currentChat?.id === message.chatId;
          const isFromMe = (message.senderId || message.sender?.id || message.sender?._id) === useAuthStore.getState().user?.id || useAuthStore.getState().user?._id;
          
          return {
            ...chat,
            lastMessage: {
              id: message.id,
              content: message.content,
              messageType: message.messageType,
              createdAt: message.createdAt,
              sender: message.sender,
              status: message.status
            },
            unreadCount: (!isCurrentChat && !isFromMe) 
              ? (chat.unreadCount || 0) + 1 
              : 0
          };
        }
        return chat;
      });
      
      // Sort chats by last message time
      updatedChats.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });
      
      return { 
        messages: newMessages,
        chats: updatedChats
      };
    });
  },

  updateMessage: (chatId, messageId, updates) => {
    set((state) => ({
      messages: state.messages.map(m => 
        m.id === messageId ? { ...m, ...updates } : m
      ),
      chats: state.chats.map(chat => {
        if (chat.id === chatId && chat.lastMessage?.id === messageId) {
          return {
            ...chat,
            lastMessage: { ...chat.lastMessage, ...updates }
          };
        }
        return chat;
      })
    }));
  },

  deleteMessage: (chatId, messageId) => {
    set((state) => ({
      messages: state.messages.map(m => 
        m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted', fileUrl: null, fileName: null } : m
      ),
      chats: state.chats.map(chat => {
        if (chat.id === chatId && chat.lastMessage?.id === messageId) {
          return {
            ...chat,
            lastMessage: { ...chat.lastMessage, isDeleted: true, content: 'This message was deleted' }
          };
        }
        return chat;
      })
    }));
  },

  updateMessageStatus: (chatId, status, messageId = null) => {
    set((state) => ({
      messages: state.messages.map(m => {
        if (m.chatId === chatId) {
          if (messageId && m.id === messageId) {
            return { ...m, status };
          } else if (!messageId && (m.senderId === (useAuthStore.getState().user?.id || useAuthStore.getState().user?._id))) {
            // For 'SEEN', usually all my messages are marked as seen by the other person
            return { ...m, status };
          }
        }
        return m;
      }),
      // Also update last message in chat list
      chats: state.chats.map(chat => {
        if (chat.id === chatId && chat.lastMessage && (messageId === chat.lastMessage.id || !messageId)) {
          return {
            ...chat,
            lastMessage: { ...chat.lastMessage, status },
            unreadCount: status === 'SEEN' ? 0 : chat.unreadCount
          };
        }
        return chat;
      })
    }));
  },

  // Typing indicator
  setTypingUser: (chatId, userId, isTyping) => {
    set((state) => {
      const currentTyping = state.typingUsers[chatId] || [];
      const newTyping = isTyping 
        ? (currentTyping.includes(userId) ? currentTyping : [...currentTyping, userId])
        : currentTyping.filter(id => id !== userId);
        
      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: newTyping
        }
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
      // Also update users inside chats
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
      // Also update users inside chats
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
      // Also remove or mark as deleted in chats if needed
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
