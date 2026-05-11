import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, userAPI } from '../lib/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Start true for splash/auth check
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login({ email, password });
      const { user, token } = response.data.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      let message = error.response?.data?.message || error.message || 'Login failed';
      if (error.response?.data?.errors) {
        message = error.response.data.errors.map((err) => err.msg).join(', ');
      }
      set({ error: message, isLoading: false, isAuthenticated: false });
      return { success: false, error: message };
    }
  },

  signup: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.signup(userData);
      const { user, token } = response.data.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      let message = error.response?.data?.message || error.message || 'Signup failed';
      if (error.response?.data?.errors) {
        message = error.response.data.errors.map((err) => err.msg).join(', ');
      }
      set({ error: message, isLoading: false, isAuthenticated: false });
      return { success: false, error: message };
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }

    try {
      const response = await authAPI.getMe();
      const { user } = response.data.data;

      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      await AsyncStorage.multiRemove(['token', 'user']);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await userAPI.updateProfile(profileData);
      const { user } = response.data.data;
      set({ user, isLoading: false });
      await AsyncStorage.setItem('user', JSON.stringify(user));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  updateUser: (userData) => {
    set({ user: { ...get().user, ...userData } });
  },

  clearError: () => set({ error: null }),
}));
