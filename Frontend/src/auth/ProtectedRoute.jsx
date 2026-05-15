import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from './authStore.js';

export default function ProtectedRoute() {
   const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
   return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
