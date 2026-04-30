import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/signup');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// User APIs
const userAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  getProfile: () => api.get('/users/profile/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  subscribeToPush: (subscription) => api.post('/users/subscribe', subscription),
  updateUserRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Chat APIs
const chatAPI = {
  getChats: () => api.get('/chats'),
  getChat: (id) => api.get(`/chats/${id}`),
  createIndividualChat: (userId) => api.post('/chats/individual', { userId }),
  createGroup: (data) => api.post('/chats/group', data),
  addMember: (chatId, userId) => api.put(`/chats/${chatId}/members`, { userId }),
  removeMember: (chatId, userId) => api.delete(`/chats/${chatId}/members/${userId}`),
  deleteChat: (id) => api.delete(`/chats/${id}`),
};

// Message APIs
const messageAPI = {
  getMessages: (chatId, params) => api.get(`/messages/${chatId}`, { params }),
  sendMessage: (data) => api.post('/messages', data),
  getAllSchedules: () => api.get('/messages/schedules/all'),
  completeSchedule: (id) => api.put(`/messages/${id}/complete`),
  updateStatus: (messageId, status) => api.put(`/messages/${messageId}/status`, { status }),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
};

export const fleetAPI = {
  getFiles: () => api.get('/fleet'),
  uploadFile: (data) => api.post('/fleet', data),
  deleteFile: (id) => api.delete(`/fleet/${id}`),
};

// File APIs
const fileAPI = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getFileBlob: (url) => api.get(url, { responseType: 'blob' }),
  uploadAadhaar: (frontImage, backImage) => {
    const formData = new FormData();
    if (frontImage) formData.append('aadhaarFront', frontImage);
    if (backImage) formData.append('aadhaarBack', backImage);
    return api.post('/files/upload-aadhaar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  downloadFile: (path) => `${API_URL.replace('/api', '')}${path}`,
};

const aiAPI = {
  generateResponse: (prompt) => axios.post('http://3.111.42.25:11434/api/generate', {
    model: 'llama3:latest',
    prompt: prompt,
    stream: false
  }),
  chat: (messages) => axios.post('http://3.111.42.25:11434/api/chat', {
    model: 'llama3:latest',
    messages: messages,
    stream: false
  })
};

// Auth APIs
const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export {
  authAPI,
  userAPI,
  chatAPI,
  messageAPI,
  fileAPI,
  aiAPI
};

export default api;
