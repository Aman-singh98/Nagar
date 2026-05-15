/**
 * @file socket/useAlerts.js
 * @description Listens to 'alert:new' socket events and shows toast
 * notifications + updates alert badge count in the navbar. (F065)
 *
 * Wire-up only — full alert UI comes in Week 16.
 * This hook handles:
 *   - Toast notification on new alert
 *   - Badge count increment in navbar
 *
 * Usage:
 *   useAlerts(); // mount once in root layout or LiveMapPage
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '../socket/socketClient';

// Alert query key — used by navbar badge counter
export const alertKeys = {
   all: () => ['alerts'],
   unread: () => [...alertKeys.all(), 'unread'],
};

/**
 * Subscribes to 'alert:new' socket events.
 * Shows toast + invalidates alert badge query.
 */
export const useAlerts = () => {
   const queryClient = useQueryClient();

   useEffect(() => {
      const socket = getSocket();
      if (!socket) return;

      /**
       * @param {{
       *   alertId: string;
       *   type: string;
       *   message: string;
       *   employeeName?: string;
       *   timestamp: string;
       * }} payload
       */
      const handleAlertNew = (payload) => {
         // ── Toast notification ───────────────────────────────────────────────
         toast(
            `🔔 ${payload.employeeName ? `${payload.employeeName}: ` : ''}${payload.message}`,
            {
               duration: 5000,
               position: 'top-right',
               style: {
                  background: '#1e1b4b',
                  color: '#e0e7ff',
                  border: '1px solid #4f46e5',
                  borderRadius: '10px',
                  fontSize: '13px',
               },
            },
         );

         // ── Invalidate alert badge count ─────────────────────────────────────
         // Navbar will re-fetch unread count automatically
         queryClient.invalidateQueries({ queryKey: alertKeys.unread() });

         console.log('[Socket] alert:new received:', payload);
      };

      socket.on('alert:new', handleAlertNew);

      return () => {
         socket.off('alert:new', handleAlertNew);
      };
   }, [queryClient]);
};
