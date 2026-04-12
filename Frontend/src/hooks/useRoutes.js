/**
 * @file useRoutes.js
 * React Query hooks for the Routes resource.
 *
 * Design notes:
 *  - All list queries use a stable `routeKeys` factory for precise cache
 *    invalidation — same pattern as useAssignments / useEmployees.
 *  - Mutations show toast feedback on success and error automatically.
 *  - `useRoute(id)` is disabled when id is falsy, so it's safe to call
 *    unconditionally even before a selection is made.
 *
 * Future scope:
 *  - Add `useUpdateRoute(id)` for inline name/center edits.
 *  - Add optimistic removal in useDeleteRoute for instant UI feedback.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import { errMsg } from '../utils/helpers.js';

// ── Query key factory ────────────────────────────────────────────────────────
export const routeKeys = {
  all: () => ['routes'],
  lists: () => [...routeKeys.all(), 'list'],
  list: (params) => [...routeKeys.lists(), params],
  detail: (id) => [...routeKeys.all(), 'detail', id],
};

/** @deprecated Use routeKeys.all() for new code */
export const ROUTES_KEY = routeKeys.all();

// ── List hook ────────────────────────────────────────────────────────────────

/**
 * Fetch a filtered list of routes.
 *
 * @param {{ isActive?: string; search?: string; page?: number; limit?: number }} params
 */
export function useRoutes(params = {}) {
  return useQuery({
    queryKey: routeKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get('/routes', { params });
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 min — routes change infrequently
    keepPreviousData: true,
  });
}

// ── Detail hook ──────────────────────────────────────────────────────────────

/**
 * Fetch a single route with its full centers array.
 * Disabled when id is falsy.
 *
 * @param {string | null | undefined} id
 */
export function useRoute(id) {
  return useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/routes/${id}`);
      return data.data.route;
    },
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

// ── Create mutation ──────────────────────────────────────────────────────────

/**
 * Create a new route with centers.
 * Invalidates the full route list on success.
 */
export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/routes', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      toast.success('Route created successfully');
    },
    onError: (err) => toast.error(errMsg(err) ?? 'Failed to create route'),
  });
}

// ── Delete / deactivate mutation ─────────────────────────────────────────────

/**
 * Deactivate (soft-delete) a route by ID.
 * Also removes its detail cache entry to avoid stale data.
 *
 * @param {string} id
 */
export function useDeleteRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/routes/${id}`).then((r) => r.data),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      queryClient.removeQueries({ queryKey: routeKeys.detail(id) });
      toast.success('Route deactivated');
    },
    onError: (err) => toast.error(errMsg(err) ?? 'Failed to deactivate route'),
  });
}