/**
 * @file useLocations.js
 * React Query hooks for the Locations resource.
 *
 * Notes:
 *  - `useLatestLocations` is used by the Live Map page.
 *  - `refetchInterval` is set to POLL_INTERVAL_MS so React Query owns the
 *    polling lifecycle — simpler than a manual setInterval.
 *  - When the tab loses focus, polling is paused automatically via
 *    `refetchIntervalInBackground: false`.
 *
 * Future scope:
 *  - Replace polling with a useWebSocket hook that calls
 *    `queryClient.setQueryData` directly on each 'location:update' event.
 */

import { useQuery } from '@tanstack/react-query';
import api from '../api/axios.js';

export const POLL_INTERVAL_MS = 30_000;

export const locationKeys = {
   all: () => ['locations'],
   latest: () => [...locationKeys.all(), 'latest'],
};

/**
 * Fetch the latest location snapshot for all employees.
 * Automatically re-fetches every 30 s while the tab is visible.
 *
 * @param {{ enabled?: boolean }} options
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
// export function useLatestLocations({ enabled = true } = {}) {
//    return useQuery({
//       queryKey: locationKeys.latest(),
//       queryFn: () =>
//          api.get('/locations', { params: { latest: true } }).then((r) => r.data.data ?? []),
//       refetchInterval: POLL_INTERVAL_MS,
//       refetchIntervalInBackground: false, // pause when tab is hidden
//       staleTime: POLL_INTERVAL_MS - 5000, // avoid redundant renders
//       enabled,
//    });
// }
export function useLatestLocations({ enabled = true } = {}) {
  return useQuery({
    queryKey: locationKeys.latest(),
    queryFn: () =>
      api.get('/locations/latest').then((r) => r.data.locations ?? []),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: POLL_INTERVAL_MS - 5000,
    enabled,
  });
}
