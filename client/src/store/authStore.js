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
          console.error('Web auth check failed:', error.message);
          
          // Only logout if it's explicitly 401 Unauthorized or 403 Forbidden
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            set({ 
              user: null, 
              token: null, 
              isAuthenticated: false 
            });
            return false;
          }

          // Otherwise keep local session on network error / offline
          if (savedUser) {
            try {
              set({
                user: JSON.parse(savedUser),
                token,
                isAuthenticated: true
              });
              return true;
            } catch (e) {
              // fallback
            }
          }

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

      resetPassword: async (resetData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.resetPassword(resetData);
          set({ isLoading: false });
          return { success: true, message: response.data.message };
        } catch (error) {
          const message = error.response?.data?.message || 'Password reset failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
