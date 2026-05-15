/**
 * @file socket/useSocket.js
 * @description React hook that manages the Socket.IO connection lifecycle.
 *
 * - Connects on mount using the JWT from localStorage
 * - Tracks connection status for UI indicator (green/red dot)
 * - Handles reconnect events
 * - Disconnects on unmount
 *
 * Usage:
 *   const { status } = useSocket();
 *   status: 'connected' | 'disconnected' | 'reconnecting'
 *
 * NOTE: Use useRef for the socket instance — never useState.
 * Storing socket in state would trigger re-renders on every event,
 * potentially causing connection floods.
 */

import { useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../socket/socketClient';

/**
 * @typedef {'connected' | 'disconnected' | 'reconnecting'} SocketStatus
 */

/**
 * Initialises the Socket.IO connection and tracks its status.
 *
 * @returns {{ status: SocketStatus; socketRef: React.MutableRefObject<import('socket.io-client').Socket | null> }}
 */
export const useSocket = () => {
   /** @type {React.MutableRefObject<import('socket.io-client').Socket | null>} */
   const socketRef = useRef(null);

   /** @type {[SocketStatus, React.Dispatch<React.SetStateAction<SocketStatus>>]} */
   const [status, setStatus] = useState('disconnected');

   useEffect(() => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Connect singleton — safe to call multiple times
      const socket = connectSocket(token);
      socketRef.current = socket;

      // ── Status tracking ────────────────────────────────────────────────────
      const onConnect = () => setStatus('connected');
      const onDisconnect = () => setStatus('disconnected');
      const onReconnectAttempt = () => setStatus('reconnecting');
      const onReconnect = () => setStatus('connected');

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('reconnect_attempt', onReconnectAttempt);
      socket.on('reconnect', onReconnect);

      // Set initial status if already connected (hot reload scenario)
      if (socket.connected) setStatus('connected');

      return () => {
         socket.off('connect', onConnect);
         socket.off('disconnect', onDisconnect);
         socket.off('reconnect_attempt', onReconnectAttempt);
         socket.off('reconnect', onReconnect);
         // Do NOT disconnect here — socket lives for the session lifetime
         // disconnectSocket() is called on logout instead
      };
   }, []);

   return { status, socketRef };
};
