/**
 * @file hooks/useLocations.js
 * @description React Query hooks for the Locations resource.
 *
 * Polling strategy:
 *   - When socket is connected: polling is DISABLED (refetchInterval: false)
 *     Real-time updates come via useLocationUpdates() socket hook instead.
 *   - When socket is disconnected: polling falls back to 30s REST polling
 *     as a safety net — no data loss if WebSocket is unavailable.
 *
 * This gives us the best of both worlds:
 *   ✅ <1s latency when socket is live
 *   ✅ Graceful fallback to polling when socket is down
 */

import { useQuery } from '@tanstack/react-query';
import api from '../api/axios.js';
import { isSocketConnected } from '../socket/socketClient.js';

export const POLL_INTERVAL_MS = 30_000;

export const locationKeys = {
	all: () => ['locations'],
	latest: () => [...locationKeys.all(), 'latest'],
};

/**
 * Fetch the latest location snapshot for all employees.
 *
 * When socket is connected — polling is paused (socket provides live updates).
 * When socket is disconnected — polls every 30s as fallback.
 *
 * @param {{ enabled?: boolean }} options
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useLatestLocations({ enabled = true } = {}) {
	return useQuery({
		queryKey: locationKeys.latest(),
		queryFn: () =>
			api.get('/locations/latest').then((r) => r.data.locations ?? []),

		// Disable polling when socket is live — real-time updates handle it
		refetchInterval: isSocketConnected() ? false : POLL_INTERVAL_MS,
		refetchIntervalInBackground: false,
		staleTime: POLL_INTERVAL_MS - 5000,
		enabled,
	});
}
