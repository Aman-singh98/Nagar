/**
 * @file useAssignments.js
 * React Query hooks for the Assignments resource.
 *
 * Design notes:
 *  - All list queries are keyed by a stable params object so the cache
 *    invalidates correctly when filters change.
 *  - Mutations toast on success/error automatically.
 *  - `useAssignmentDetail` is a fine-grained hook so the Assignment Detail
 *    panel can be self-contained.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios.js';

// ── Query key factory ────────────────────────────────────────────────────────

export const assignmentKeys = {
   all: () => ['assignments'],
   lists: () => [...assignmentKeys.all(), 'list'],
   list: (params) => [...assignmentKeys.lists(), params],
   detail: (id) => [...assignmentKeys.all(), 'detail', id],
};

// ── List hook ────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filtered list of assignments.
 * @param {{ date?: string; employeeId?: string; status?: string; limit?: number; page?: number }} params
 */
export function useAssignments(params = {}) {
   return useQuery({
      queryKey: assignmentKeys.list(params),
      queryFn: () => api.get('/assignments', { params }).then((r) => r.data),
      staleTime: 1000 * 60,
      keepPreviousData: true,
   });
}

// ── Detail hook ──────────────────────────────────────────────────────────────

/**
 * Fetch a single assignment with full visitStatuses and center details.
 * @param {string | null} id
 */
export function useAssignmentDetail(id) {
   return useQuery({
      queryKey: assignmentKeys.detail(id),
      queryFn: () => api.get(`/assignments/${id}`).then((r) => r.data.data),
      enabled: !!id,
      staleTime: 1000 * 30,
   });
}

// ── Create mutation ──────────────────────────────────────────────────────────

export function useCreateAssignment() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: (payload) => api.post('/assignments', payload).then((r) => r.data.data),
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: assignmentKeys.lists() });
         toast.success('Assignment created');
      },
      onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to create assignment'),
   });
}

// ── Cancel mutation ──────────────────────────────────────────────────────────

export function useCancelAssignment() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: (id) => api.delete(`/assignments/${id}`).then((r) => r.data),
      onSuccess: (_, id) => {
         qc.invalidateQueries({ queryKey: assignmentKeys.lists() });
         qc.removeQueries({ queryKey: assignmentKeys.detail(id) });
         toast.success('Assignment cancelled');
      },
      onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to cancel'),
   });
}
