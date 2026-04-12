/**
 * @file mapUtils.js
 * Leaflet helper utilities for the Live Map feature.
 *
 * Centralising icon / layer creation here keeps the React components clean
 * and makes it easy to swap Leaflet for Google Maps in the future — only
 * this file needs to change.
 *
 * Future scope:
 *  - Add clustering support via leaflet.markercluster when employee count > 50
 *  - Add heatmap layer via leaflet-heat for density visualisation
 */

import L from 'leaflet';

// ── Visit-status colour tokens ───────────────────────────────────────────────
export const STATUS_COLORS = {
   visited: '#10b981', // green
   pending: '#6366f1', // accent / indigo
   missed: '#ef4444', // red
   in_progress: '#f59e0b', // amber
   skipped: '#ef4444', // red (alias)
};

export const STATUS_LABELS = {
   visited: 'Visited',
   pending: 'Pending',
   missed: 'Missed',
   in_progress: 'In Progress',
   skipped: 'Skipped',
};

// ── Employee pin SVG factory ─────────────────────────────────────────────────

/**
 * Create a custom DivIcon for an employee pin.
 * The icon is a coloured pulsing dot with the employee's initials.
 *
 * @param {string}  initials   - Up to 2 characters displayed inside the pin
 * @param {boolean} isSelected - Renders a larger ring when true
 * @param {boolean} isActive   - Gray tint when the employee is inactive
 * @returns {L.DivIcon}
 */
export function createEmployeeIcon(initials = '?', isSelected = false, isActive = true) {
   const color = isActive ? '#6366f1' : '#66667a';
   const size = isSelected ? 44 : 36;
   const pulse = isSelected && isActive;

   const html = `
    <div style="
      position: relative;
      width:  ${size}px;
      height: ${size}px;
    ">
      ${pulse ? `
        <div style="
          position: absolute; inset: -6px;
          border-radius: 50%;
          background: ${color}33;
          animation: pin-pulse 1.8s ease-out infinite;
        "></div>` : ''}
      <div style="
        width:  ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid ${isSelected ? '#fff' : color + '88'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? 14 : 12}px;
        font-weight: 700;
        color: #fff;
        font-family: 'DM Sans', sans-serif;
        box-shadow: 0 4px 16px ${color}66;
        cursor: pointer;
        transition: transform 0.2s;
      ">${initials}</div>
      <div style="
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 7px solid ${color};
      "></div>
    </div>
  `;

   return L.divIcon({
      html,
      className: '',        // suppress Leaflet default white box
      iconSize: [size + 12, size + 18],
      iconAnchor: [(size + 12) / 2, size + 18],
      popupAnchor: [0, -(size + 18)],
   });
}

// ── Center pin factory ───────────────────────────────────────────────────────

/**
 * Create a DivIcon for a route center, coloured by visit status.
 *
 * @param {number} order   - Center visit order displayed in the pin
 * @param {string} status  - One of the STATUS_COLORS keys
 * @returns {L.DivIcon}
 */
export function createCenterIcon(order, status = 'pending') {
   const color = STATUS_COLORS[status] ?? STATUS_COLORS.pending;

   const html = `
    <div style="
      width: 30px; height: 30px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid rgba(255,255,255,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800;
      color: #fff;
      font-family: 'DM Sans', sans-serif;
      box-shadow: 0 2px 8px ${color}88;
    ">${order}</div>
  `;

   return L.divIcon({
      html,
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -20],
   });
}

// ── Geofence circle factory ──────────────────────────────────────────────────

/**
 * Create a styled geofence circle for a route center.
 *
 * @param {{ lat: number; lng: number; radius: number }} center
 * @param {string} status
 * @returns {L.Circle}
 */
export function createGeofenceCircle({ lat, lng, radius }, status = 'pending') {
   const color = STATUS_COLORS[status] ?? STATUS_COLORS.pending;

   return L.circle([lat, lng], {
      radius,
      color,
      weight: 2,
      opacity: 0.8,
      fillColor: color,
      fillOpacity: 0.08,
      dashArray: status === 'pending' ? '6 4' : undefined,
   });
}

// ── Fit-bounds helper ────────────────────────────────────────────────────────

/**
 * Compute a LatLngBounds that contains all given lat/lng points.
 * Falls back to a default India-wide view when the array is empty.
 *
 * @param {Array<{ lat: number; lng: number }>} points
 * @returns {L.LatLngBounds}
 */
export function boundsFromPoints(points) {
   if (!points.length) {
      // Default: roughly India
      return L.latLngBounds([[6, 68], [36, 97]]);
   }
   const lats = points.map((p) => p.lat);
   const lngs = points.map((p) => p.lng);
   return L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
   );
}

// ── Inject pulse keyframe once ───────────────────────────────────────────────
// We inject it into the document head so the SVG animation works inside
// the DivIcon without a CSS file dependency.
if (typeof document !== 'undefined') {
   const styleId = '__map-pin-pulse';
   if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
      @keyframes pin-pulse {
        0%   { transform: scale(0.7); opacity: 0.6; }
        70%  { transform: scale(1.4); opacity: 0; }
        100% { transform: scale(1.4); opacity: 0; }
      }
    `;
      document.head.appendChild(style);
   }
}