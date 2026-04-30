import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

// Pages
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Chat from '@/pages/Chat';
import AdminDashboard from '@/pages/AdminDashboard';

// Protected Route component (logged in users)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token && !isAuthenticated) {
      checkAuth();
    }
  }, [token, isAuthenticated, checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-whatsapp-dark">
        <Loader2 className="w-12 h-12 text-whatsapp-primary animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const token = localStorage.getItem('token');
  
  if (token && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Admin Route component (restrict to admins only)
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token && !isAuthenticated) {
      checkAuth();
    }
  }, [token, isAuthenticated, checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-whatsapp-dark">
        <Loader2 className="w-12 h-12 text-whatsapp-primary animate-spin" />
      </div>
    );
  }

  if (!token || !isAuthenticated || user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token && !isAuthenticated) {
      checkAuth();
    }
  }, []);

  return (
    <>
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
