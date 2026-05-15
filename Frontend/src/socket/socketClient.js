/**
 * @file socket/socketClient.js
 * @description Socket.IO client singleton.
 *
 * Single Responsibility: owns the Socket.IO client instance.
 * One connection per browser session — never recreated on re-render.
 *
 * Pattern: module-level singleton initialised lazily on first connect() call.
 * All consumers import { connectSocket, disconnectSocket, getSocket } from here.
 *
 * Usage:
 *   // On login:
 *   connectSocket(accessToken);
 *
 *   // In any hook:
 *   const socket = getSocket();
 *   socket.on('location:update', handler);
 *
 *   // On logout:
 *   disconnectSocket();
 */

import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:5000';

/** @type {import('socket.io-client').Socket | null} */
let _socket = null;

// ─── Connect ──────────────────────────────────────────────────────────────────

/**
 * Creates and connects the Socket.IO singleton.
 * Safe to call multiple times — reconnects only if currently disconnected.
 *
 * @param {string} accessToken - JWT access token from auth store
 * @returns {import('socket.io-client').Socket}
 */
export const connectSocket = (accessToken) => {
   if (_socket?.connected) return _socket;

   // Disconnect stale instance before creating a new one
   if (_socket) {
      _socket.disconnect();
      _socket = null;
   }

   _socket = io(SERVER_URL, {
      auth: { token: `Bearer ${accessToken}` },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,        // 1s initial delay
      reconnectionDelayMax: 30_000,   // cap at 30s
      timeout: 10_000,
   });

   // ── Lifecycle logging ──────────────────────────────────────────────────────
   _socket.on('connect', () => {
      console.log('[Socket] Connected:', _socket.id);
   });

   _socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
   });

   _socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
   });

   _socket.on('reconnect', (attempt) => {
      console.log('[Socket] Reconnected after', attempt, 'attempt(s)');
   });

   _socket.on('reconnect_attempt', (attempt) => {
      console.log('[Socket] Reconnecting... attempt', attempt);
   });

   return _socket;
};

// ─── Disconnect ───────────────────────────────────────────────────────────────

/**
 * Disconnects and destroys the singleton.
 * Call on logout to prevent stale event listeners.
 */
export const disconnectSocket = () => {
   if (_socket) {
      _socket.disconnect();
      _socket = null;
      console.log('[Socket] Disconnected and destroyed');
   }
};

// ─── Accessor ─────────────────────────────────────────────────────────────────

/**
 * Returns the current socket instance.
 * Returns null if not yet connected.
 *
 * @returns {import('socket.io-client').Socket | null}
 */
export const getSocket = () => _socket;

/**
 * Returns whether the socket is currently connected.
 *
 * @returns {boolean}
 */
export const isSocketConnected = () => _socket?.connected ?? false;
