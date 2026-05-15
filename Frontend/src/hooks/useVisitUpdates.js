/**
 * @file socket/useVisitUpdates.js
 * @description Listens to 'visit:updated' socket events and updates
 * the assignment detail panel in real time. (F064)
 *
 * When the backend geofence engine detects an entry:
 *   1. Backend emits 'visit:updated' to the company room
 *   2. This hook receives the event
 *   3. React Query cache is updated — status badge turns green instantly
 *   4. No page refresh or REST poll needed
 *
 * Usage:
 *   useVisitUpdates(); // mount once in LiveMapPage
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../socket/socketClient';

/**
 * Subscribes to 'visit:updated' events and patches assignment cache.
 */
export const useVisitUpdates = () => {
   const queryClient = useQueryClient();

   useEffect(() => {
      const socket = getSocket();
      if (!socket) return;

      /**
       * @param {{
       *   assignmentId: string;
       *   centerId: string;
       *   status: string;
       *   visitedAt: string;
       * }} payload
       */
      const handleVisitUpdated = (payload) => {
         // Invalidate the assignment query so it re-fetches with updated status
         // This updates the detail panel badge instantly
         queryClient.invalidateQueries({
            queryKey: ['assignments', payload.assignmentId],
         });

         console.log('[Socket] visit:updated received:', payload);
      };

      socket.on('visit:updated', handleVisitUpdated);

      return () => {
         socket.off('visit:updated', handleVisitUpdated);
      };
   }, [queryClient]);
};