/**
 * @file axios.js
 * Configured Axios instance with:
 *  - Base URL from env
 *  - Authorization header injected from auth store on every request
 *  - Auto-refresh interceptor: on 401, attempts token refresh then retries
 *  - Request deduplication: only one refresh call fires even if N requests fail simultaneously
 */

import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const api = axios.create({
   baseURL: BASE_URL,
   withCredentials: true,   // send HttpOnly refresh token cookie
   headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach access token ─────────────────────────────────
api.interceptors.request.use((config) => {
   const token = localStorage.getItem('accessToken');
   if (token) config.headers.Authorization = `Bearer ${token}`;
   return config;
});

// ── Response interceptor — handle 401 + refresh ───────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
   failedQueue.forEach((p) => error ? p.reject(error) : p.resolve(token));
   failedQueue = [];
};

api.interceptors.response.use(
   (response) => response,
   async (error) => {
      const original = error.config;

      // Only attempt refresh on 401, and not for the refresh endpoint itself
      if (
         error.response?.status === 401 &&
         !original._retry &&
         !original.url?.includes('/auth/refresh')
      ) {
         if (isRefreshing) {
            // Queue subsequent requests while refresh is in flight
            return new Promise((resolve, reject) => {
               failedQueue.push({ resolve, reject });
            }).then((token) => {
               original.headers.Authorization = `Bearer ${token}`;
               return api(original);
            });
         }

         original._retry = true;
         isRefreshing = true;

         try {
            const userId = JSON.parse(localStorage.getItem('user') ?? '{}')._id;
            const { data } = await api.post('/auth/refresh', { userId });
            const newToken = data.data.accessToken;

            localStorage.setItem('accessToken', newToken);
            api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);

            original.headers.Authorization = `Bearer ${newToken}`;
            return api(original);
         } catch (refreshError) {
            processQueue(refreshError, null);
            // Refresh failed — clear session and redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            toast.error('Session expired. Please log in again.');
            window.location.href = '/login';
            return Promise.reject(refreshError);
         } finally {
            isRefreshing = false;
         }
      }

      return Promise.reject(error);
   },
);

export default api;