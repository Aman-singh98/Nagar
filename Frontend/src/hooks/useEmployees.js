/**
 * @file useEmployees.js
 * React Query hooks for the Employees resource.
 *
 * Design notes:
 *  - All list queries use a stable params key for correct cache invalidation.
 *  - Mutations show toast feedback on success and error.
 *  - `useManagers` is a dedicated hook for the manager dropdown in CreateEmployeeModal.
 *
 * Future scope:
 *  - Add `useEmployeeDetail(id)` for a per-employee profile panel.
 *  - Add optimistic updates to deactivation for instant UI feedback.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import { errMsg } from '../utils/helpers.js';

// ── Query key factory ────────────────────────────────────────────────────────
export const employeeKeys = {
  all: () => ['employees'],
  lists: () => [...employeeKeys.all(), 'list'],
  list: (params) => [...employeeKeys.lists(), params],
  managers: () => ['managers'],
};

/** @deprecated Use employeeKeys.all() for new code */
export const EMPLOYEES_KEY = employeeKeys.all();

// ── List hook ────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filtered list of employees.
 *
 * @param {{ search?: string; role?: string; page?: number; limit?: number }} params
 */
export function useEmployees(params = {}) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get('/employees', { params });
      return data;
    },
    staleTime: 1000 * 60, // 1 min
    keepPreviousData: true,
  });
}

// ── Managers dropdown hook ───────────────────────────────────────────────────

/**
 * Fetch all active managers for use in dropdowns.
 * Long staleTime since the manager list changes infrequently.
 */
export function useManagers() {
  return useQuery({
    queryKey: employeeKeys.managers(),
    queryFn: async () => {
      const { data } = await api.get('/employees/managers');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

// ── Create mutation ──────────────────────────────────────────────────────────

/**
 * Create a new employee.
 * Invalidates both the employee list and managers list on success.
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/employees', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.managers() });
      toast.success('Employee created successfully');
    },
    onError: (err) => toast.error(errMsg(err) ?? 'Failed to create employee'),
  });
}

// ── Deactivate mutation ──────────────────────────────────────────────────────

/**
 * Deactivate (soft-delete) an employee by ID.
 *
 * @param {string} id
 */
export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/employees/${id}/deactivate`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success('Employee deactivated');
    },
    onError: (err) => toast.error(errMsg(err) ?? 'Failed to deactivate employee'),
  });
}
