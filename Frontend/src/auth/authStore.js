/**
 * @file authStore.js
 * Zustand auth store — single source of truth for auth state.
 * Persisted to localStorage so page refreshes keep the session alive.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios.js';

const useAuthStore = create(
   persist(
      (set, get) => ({
         user: null,
         accessToken: null,
         isLoading: false,

         login: async (email, password) => {
            set({ isLoading: true });
            try {
               const { data } = await api.post('/auth/login', { email, password });
               const { user, accessToken } = data;
               localStorage.setItem('accessToken', accessToken);
               localStorage.setItem('user', JSON.stringify(user));
               set({ user, accessToken, isLoading: false });
               return { success: true };
            } catch (err) {
               set({ isLoading: false });
               return { success: false, message: err.response?.data?.message ?? 'Login failed' };
            }
         },

         logout: async () => {
            try { await api.post('/auth/logout'); } catch (_) { }
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            set({ user: null, accessToken: null });
         },

         isAuthenticated: () => !!get().user && !!get().accessToken,
         isSuperAdmin: () => get().user?.role === 'superadmin',
         isAdmin: () => ['admin', 'superadmin'].includes(get().user?.role),
         isManager: () => get().user?.role === 'manager',
      }),
      {
         name: 'nagar-auth',
         partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      },
   ),
);

export default useAuthStore;
