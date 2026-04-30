import { useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';

export default function SyncUser() {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const { setSyncing } = useAuthStore();

  useEffect(() => {
    const sync = async () => {
      if (isUserLoaded && clerkUser && isAuthLoaded) {
        try {
          const token = await getToken();
          localStorage.setItem('token', token); // Set token for axios interceptor

          const response = await authAPI.sync({
            name: clerkUser.fullName,
            email: clerkUser.primaryEmailAddress?.emailAddress,
          });

          if (response.data.success) {
            useAuthStore.setState({ 
              user: response.data.data.user,
              token,
              isAuthenticated: true 
            });
          }
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      }
    };

    sync();
  }, [clerkUser, isUserLoaded, isAuthLoaded, getToken]);

  return null;
}
