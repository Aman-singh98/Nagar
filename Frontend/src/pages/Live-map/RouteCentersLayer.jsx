/**
 * @file RouteCentersLayer.jsx
 * Headless Leaflet layer that draws route center markers and geofence circles
 * for the selected assignment's detail view.
 *
 * Lifecycle:
 *  - Mounts when an assignment is selected (assignmentDetail becomes non-null)
 *  - Fully removes all circles + markers when unmounted or detail is cleared
 *  - Fits map viewport to show all centers with padding
 *
 * Future scope:
 *  - Animate geofence circles (pulse on "visited" status change)
 *  - Show employee path polyline connecting visited centers in order
 */

import { useEffect, useRef } from 'react';
import { createCenterIcon, createGeofenceCircle, boundsFromPoints } from './mapUtils.js';

/**
 * @param {{
 *   mapRef:           React.MutableRefObject<import('leaflet').Map | null>;
 *   assignmentDetail: import('./types').AssignmentDetail | null;
 *   fitOnMount?:      boolean;
 * }} props
 */
export default function RouteCentersLayer({ mapRef, assignmentDetail, fitOnMount = true }) {
   /** @type {React.MutableRefObject<Array<import('leaflet').Layer>>} */
   const layersRef = useRef([]);

   useEffect(() => {
      const lMap = mapRef.current;
      if (!lMap || !assignmentDetail) return;

      import('leaflet').then((L) => {
         // Remove any previously drawn layers first
         layersRef.current.forEach((l) => lMap.removeLayer(l));
         layersRef.current = [];

         const visitStatuses = assignmentDetail.visitStatuses ?? [];
         const centers = assignmentDetail.routeId?.centers ?? [];

         /** Build a status lookup keyed by centerId */
         const statusMap = new Map(
            visitStatuses.map((vs) => [String(vs.centerId), vs.status]),
         );

         const points = [];

         for (const center of centers) {
            const status = statusMap.get(String(center._id)) ?? 'pending';
            const latlng = [center.lat, center.lng];

            // Geofence circle
            const circle = createGeofenceCircle(
               { lat: center.lat, lng: center.lng, radius: center.radius ?? 100 },
               status,
            ).addTo(lMap);

            // Center marker
            const marker = L.marker(latlng, { icon: createCenterIcon(center.order, status) })
               .addTo(lMap)
               .bindTooltip(
                  `<strong>${center.name}</strong><br/>${status.replace('_', ' ')}`,
                  { direction: 'top', className: 'map-tooltip' },
               );

            layersRef.current.push(circle, marker);
            points.push({ lat: center.lat, lng: center.lng });
         }

         // FIX 1: Removed the dead `require('./mapUtils.js')` block that was
         // here. `require()` does not exist in ESM and was causing the Promise
         // chain to hang / throw silently. `boundsFromPoints` is already
         // imported at the top of the file and used correctly below.

         if (fitOnMount && points.length) {
            const bounds = boundsFromPoints(points);
            lMap.fitBounds(bounds.pad(0.25));
         }
      });
   }, [assignmentDetail, mapRef, fitOnMount]);

   // ── Cleanup when component unmounts ─────────────────────────────────────
   // FIX 2: Removed `assignmentDetail` from this effect's dependency array.
   // Having it here caused the cleanup to fire on every new selection —
   // wiping layers that the draw effect had just added (flicker / blank map).
   // Cleanup only needs to run once on unmount; the draw effect already
   // handles clearing stale layers at the top of its own body.
   useEffect(() => {
      return () => {
         const lMap = mapRef.current;
         if (!lMap) return;
         layersRef.current.forEach((l) => lMap.removeLayer(l));
         layersRef.current = [];
      };
   }, [mapRef]); // ← assignmentDetail intentionally removed

   return null; // headless
}
