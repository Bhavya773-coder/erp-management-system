import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      language: localStorage.getItem('language') || 'en',

      setLanguage: (lang) => {
        localStorage.setItem('language', lang);
        set({ language: lang });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login({ email, password });
          const { user, token } = response.data.data;
          
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          return { success: true };
        } catch (error) {
          let message = error.response?.data?.message || 'Login failed';
          if (error.response?.data?.errors) {
            message = error.response.data.errors.map(err => err.msg).join(', ');
          }
          set({ 
            error: message, 
            isLoading: false,
            isAuthenticated: false 
          });
          return { success: false, error: message };
        }
      },

      signup: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.signup(userData);
          const { user, token } = response.data.data;
          
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          return { success: true };
        } catch (error) {
          let message = error.response?.data?.message || 'Signup failed';
          if (error.response?.data?.errors) {
            message = error.response.data.errors.map(err => err.msg).join(', ');
          }
          set({ 
            error: message, 
            isLoading: false,
            isAuthenticated: false 
          });
          return { success: false, error: message };
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          error: null 
        });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (!token) {
          set({ isAuthenticated: false });
          return false;
        }

        try {
          const response = await authAPI.getMe();
          const { user } = response.data.data;
          
          set({ 
            user, 
            token,
            isAuthenticated: true 
          });
          
          localStorage.setItem('user', JSON.stringify(user));
          return true;
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false 
          });
          return false;
        }
      },

      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });
        try {
          const { userAPI } = await import('@/lib/api');
          const response = await userAPI.updateProfile(profileData);
          const { user } = response.data.data;
          
          set({ user, isLoading: false });
          localStorage.setItem('user', JSON.stringify(user));
          
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
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
