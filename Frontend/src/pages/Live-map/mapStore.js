/**
 * @file mapStore.js
 * Zustand store for the Live Map feature.
 *
 * Responsibilities:
 *  - Hold the latest employee location snapshots
 *  - Track the selected employee / assignment for the detail panel
 *  - Manage the polling lifecycle (start / stop / interval ref)
 *  - Cache fetched assignment details to avoid redundant API calls
 *
 * Future scope:
 *  - Replace polling with WebSocket subscription (emit 'location:update')
 *  - Add geofence breach alerts as a separate slice
 *  - Support multi-tenant filtering (by managerId)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import api from '../../api/axios.js';

/** How often (ms) to re-fetch employee locations in polling mode */
export const POLL_INTERVAL_MS = 30_000;

const useMapStore = create(
   subscribeWithSelector((set, get) => ({
      // ── State ────────────────────────────────────────────────────────────────
      /** @type {Array<import('./types').EmployeeLocation>} */
      locations: [],

      /** @type {import('./types').AssignmentDetail | null} */
      selectedAssignment: null,

      /** @type {string | null} employeeId currently highlighted on map */
      selectedEmployeeId: null,

      /** @type {'idle' | 'loading' | 'polling' | 'error'} */
      status: 'idle',

      /** @type {string | null} */
      error: null,

      /** @type {number | null} setInterval handle */
      _pollHandle: null,

      /** @type {Record<string, import('./types').AssignmentDetail>} keyed by assignmentId */
      _assignmentCache: {},

      // ── Actions ──────────────────────────────────────────────────────────────

      /**
       * Fetch the latest location snapshot for all employees.
       * Called once on mount and then on each polling tick.
       */
      fetchLocations: async () => {
         try {
            const { data } = await api.get('/locations', { params: { latest: true } });
            set({ locations: data.data ?? [], error: null });
         } catch (err) {
            set({ error: err?.response?.data?.message ?? 'Failed to fetch locations' });
         }
      },

      /**
       * Start polling — kicks off fetchLocations immediately, then every
       * POLL_INTERVAL_MS milliseconds. Safe to call multiple times (no-op if
       * already polling).
       */
      startPolling: () => {
         if (get()._pollHandle) return; // already running

         set({ status: 'polling' });
         get().fetchLocations(); // immediate first fetch

         const handle = setInterval(() => {
            get().fetchLocations();
         }, POLL_INTERVAL_MS);

         set({ _pollHandle: handle });
      },

      /**
       * Stop polling and clear the interval.
       * Should be called in the component's cleanup / unmount effect.
       */
      stopPolling: () => {
         const handle = get()._pollHandle;
         if (handle) clearInterval(handle);
         set({ _pollHandle: null, status: 'idle' });
      },

      /**
       * Select an employee pin on the map.
       * If the employee has an active assignment for today, fetch its detail.
       *
       * @param {string} employeeId
       * @param {string} [assignmentId] - pass if known from the locations payload
       */
      selectEmployee: async (employeeId, assignmentId) => {
         set({ selectedEmployeeId: employeeId, selectedAssignment: null });

         if (!assignmentId) return;

         // Serve from cache when available
         const cached = get()._assignmentCache[assignmentId];
         if (cached) {
            set({ selectedAssignment: cached });
            return;
         }

         try {
            const { data } = await api.get(`/assignments/${assignmentId}`);
            const detail = data.data;
            set((s) => ({
               selectedAssignment: detail,
               _assignmentCache: { ...s._assignmentCache, [assignmentId]: detail },
            }));
         } catch (err) {
            console.error('[mapStore] selectEmployee fetch error', err);
         }
      },

      /** Deselect / close the detail panel */
      clearSelection: () =>
         set({ selectedEmployeeId: null, selectedAssignment: null }),

      /**
       * Invalidate a specific assignment in the cache (e.g., after a status
       * update from the server). The next selectEmployee call will re-fetch.
       *
       * @param {string} assignmentId
       */
      invalidateAssignment: (assignmentId) =>
         set((s) => {
            const next = { ...s._assignmentCache };
            delete next[assignmentId];
            return { _assignmentCache: next };
         }),
   })),
);

export default useMapStore;
