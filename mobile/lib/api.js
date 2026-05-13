import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_BASE_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute =
        error.config.url.includes('/auth/login') ||
        error.config.url.includes('/auth/signup');
      if (!isAuthRoute) {
        await AsyncStorage.multiRemove(['token', 'user']);
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth APIs ──────────────────────────────────────────────────────────
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  registerExpoPushToken: (expoPushToken) => api.post('/auth/expo-push-token', { expoPushToken }),
  unregisterExpoPushToken: (expoPushToken) => api.delete('/auth/expo-push-token', { data: { expoPushToken } }),
  registerFCMToken: (fcmToken) => api.post('/auth/fcm-token', { fcmToken }),
  unregisterFCMToken: (fcmToken) => api.delete('/auth/fcm-token', { data: { fcmToken } }),
};

// ─── User APIs ──────────────────────────────────────────────────────────
export const userAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  getProfile: () => api.get('/users/profile/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  updateUserRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// ─── Chat APIs ──────────────────────────────────────────────────────────
export const chatAPI = {
  getChats: () => api.get('/chats'),
  getChat: (id) => api.get(`/chats/${id}`),
  createIndividualChat: (userId) => api.post('/chats/individual', { userId }),
  createGroup: (data) => api.post('/chats/group', data),
  deleteChat: (id) => api.delete(`/chats/${id}`),
};

// ─── Message APIs ───────────────────────────────────────────────────────
export const messageAPI = {
  getMessages: (chatId, params) => api.get(`/messages/${chatId}`, { params }),
  sendMessage: (data) => api.post('/messages', data),
  getAllSchedules: () => api.get('/messages/schedules/all'),
  completeSchedule: (id) => api.put(`/messages/${id}/complete`),
  forwardMessage: (messageId, targetChatId) =>
    api.post('/messages/forward', { messageId, targetChatId }),
  forwardBulk: (messageIds, targetChatIds) =>
    api.post('/messages/forward/bulk', { messageIds, targetChatIds }),
  getMessageForForward: (id) => api.get(`/messages/forward/${id}`),
  getSharedDocuments: () => api.get('/messages/shared/documents'),
};

// ─── File APIs ──────────────────────────────────────────────────────────
export const fileAPI = {
  uploadFile: async (uri, name, type) => {
    const formData = new FormData();
    formData.append('file', { uri, name, type });
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getFullUrl: (path) => `${API_BASE_URL}${path}`,
};

// ─── Fleet APIs ─────────────────────────────────────────────────────────
export const fleetAPI = {
  getFiles: () => api.get('/fleet'),
  getAssets: () => api.get('/fleet/assets'),
  uploadFileMetadata: (data) => api.post('/fleet', data),
  processFile: (id) => api.post(`/fleet/process/${id}`),
};

export default api;
