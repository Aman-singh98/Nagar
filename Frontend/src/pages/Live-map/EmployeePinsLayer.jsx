/**
 * @file EmployeePinsLayer.jsx
 * Imperative Leaflet layer that renders and updates employee location pins.
 *
 * This is a "headless" React component — it renders nothing to the DOM.
 * Instead it talks directly to the Leaflet map instance via refs.
 *
 * Design:
 *  - Diffs the previous locations array against the new one (by employeeId)
 *    so we only ADD/MOVE/REMOVE markers that actually changed.
 *  - Selected marker gets a larger pulsing icon immediately on prop change.
 *
 * Future scope:
 *  - Animate marker movement (interpolate old → new position with requestAnimationFrame)
 *  - Add clustering via leaflet.markercluster when locations.length > 50
 */

import { useEffect, useRef } from 'react';
import { createEmployeeIcon } from './mapUtils.js';

/**
 * @param {{
 *   mapRef:             React.MutableRefObject<import('leaflet').Map | null>;
 *   locations:          Array<import('./types').EmployeeLocation>;
 *   selectedEmployeeId: string | null;
 *   onSelectEmployee:   (id: string, assignmentId?: string) => void;
 * }} props
 */
export default function EmployeePinsLayer({
   mapRef,
   locations,
   selectedEmployeeId,
   onSelectEmployee,
}) {
   /**
    * Map from employeeId → { marker: L.Marker, data: EmployeeLocation }
    * Persists across renders so we can diff efficiently.
    *
    * @type {React.MutableRefObject<Map<string, { marker: import('leaflet').Marker, data: any }>>}
    */
   const markersRef = useRef(new Map());

   // ── Sync markers whenever locations or selection changes ─────────────────
   useEffect(() => {
      const lMap = mapRef.current;
      if (!lMap) return;

      // Dynamically import Leaflet so this module stays SSR-safe
      import('leaflet').then((L) => {
         const existing = markersRef.current;
         const incoming = new Map(locations.map((loc) => [loc.employeeId, loc]));

         // 1. Remove markers for employees who left the result set
         for (const [id, { marker }] of existing) {
            if (!incoming.has(id)) {
               lMap.removeLayer(marker);
               existing.delete(id);
            }
         }

         // 2. Add or update markers
         for (const [id, loc] of incoming) {
            const isSelected = id === selectedEmployeeId;
            const initials = (loc.employeeName ?? '?')
               .split(' ')
               .map((w) => w[0])
               .slice(0, 2)
               .join('')
               .toUpperCase();

            const icon = createEmployeeIcon(initials, isSelected, loc.isActive !== false);

            if (existing.has(id)) {
               // Move + update icon if already on map
               const { marker } = existing.get(id);
               marker.setLatLng([loc.lat, loc.lng]);
               marker.setIcon(icon);
            } else {
               // Create new marker
               const marker = L.marker([loc.lat, loc.lng], { icon })
                  .addTo(lMap)
                  .bindTooltip(loc.employeeName ?? 'Unknown', {
                     permanent: false,
                     direction: 'top',
                     offset: [0, -12],
                     className: 'map-tooltip',
                  })
                  .on('click', () => onSelectEmployee(id, loc.assignmentId));

               existing.set(id, { marker, data: loc });
            }
         }
      });
   }, [locations, selectedEmployeeId, mapRef, onSelectEmployee]);

   // ── Cleanup on unmount ────────────────────────────────────────────────────
   useEffect(() => {
      return () => {
         const lMap = mapRef.current;
         if (!lMap) return;
         for (const { marker } of markersRef.current.values()) {
            lMap.removeLayer(marker);
         }
         markersRef.current.clear();
      };
   }, [mapRef]);

   return null; // headless
}
