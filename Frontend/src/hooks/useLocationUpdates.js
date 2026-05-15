/**
 * @file socket/useLocationUpdates.js
 * @description Listens to 'location:update' socket events and merges them
 * into the React Query cache — replacing REST polling entirely. (F063)
 *
 * Strategy:
 *   On each 'location:update' event, call queryClient.setQueryData() to
 *   update the cached employee location in-place. No re-fetch needed.
 *   This gives <1 second latency vs the previous 30-second polling.
 *
 * Usage:
 *   // Mount once at the top of LiveMapPage — runs silently in background
 *   useLocationUpdates();
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../socket/socketClient';
import { locationKeys } from '../hooks/useLocations.js';

/**
 * Subscribes to real-time location updates and patches React Query cache.
 * Replaces setInterval polling — no REST calls needed while socket is live.
 */
export const useLocationUpdates = () => {
   const queryClient = useQueryClient();

   useEffect(() => {
      const socket = getSocket();
      if (!socket) return;

      /**
       * Handler for 'location:update' events from the backend.
       *
       * @param {{
       *   employeeId: string;
       *   lat: number;
       *   lng: number;
       *   accuracy: number | null;
       *   speed: number | null;
       *   timestamp: string;
       *   emittedAt: string;
       * }} payload
       */
      const handleLocationUpdate = (payload) => {
         queryClient.setQueryData(locationKeys.latest(), (prev) => {
            if (!prev) return prev;

            const exists = prev.some((loc) => loc.employeeId === payload.employeeId);

            if (exists) {
               // Update existing employee location in-place
               return prev.map((loc) =>
                  loc.employeeId === payload.employeeId
                     ? {
                        ...loc,
                        lat: payload.lat,
                        lng: payload.lng,
                        accuracy: payload.accuracy,
                        speed: payload.speed,
                        updatedAt: payload.timestamp,
                     }
                     : loc,
               );
            }

            // New employee appeared — append to list
            return [
               ...prev,
               {
                  employeeId: payload.employeeId,
                  lat: payload.lat,
                  lng: payload.lng,
                  accuracy: payload.accuracy,
                  speed: payload.speed,
                  updatedAt: payload.timestamp,
               },
            ];
         });
      };

      socket.on('location:update', handleLocationUpdate);

      return () => {
         socket.off('location:update', handleLocationUpdate);
      };
   }, [queryClient]);
};
