/**
 * @file useMap.js
 * Custom hook that owns the Leaflet map instance lifecycle.
 *
 * Why a hook?
 *  - Keeps imperative Leaflet code out of the component render tree.
 *  - Makes it easy to lazy-import Leaflet so it's not in the initial bundle.
 *  - Provides a stable `mapRef` and helpers consumed by child hooks.
 *
 * Future scope:
 *  - Accept a `tileProvider` prop to swap OSM for Mapbox / Google Tiles
 *  - Expose `mapRef.current` for external imperative control (e.g., fly-to)
 */

import { useEffect, useRef, useCallback } from 'react';

// OSM tile layer — zero cost, no API key needed
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Default centre: New Delhi
const DEFAULT_CENTER = [28.6139, 77.2090];
const DEFAULT_ZOOM = 11;

/**
 * Initialise a Leaflet map inside the DOM element identified by `containerId`.
 *
 * @param {string} containerId - The `id` of the map container div
 * @param {{ center?: [number, number]; zoom?: number }} options
 * @returns {{ mapRef: React.MutableRefObject<L.Map | null>; flyTo: Function }}
 */
export function useMap(containerId, { center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM } = {}) {
   /** @type {React.MutableRefObject<import('leaflet').Map | null>} */
   const mapRef = useRef(null);

   useEffect(() => {
      // Lazy-import to keep Leaflet out of the main bundle until this hook mounts
      let map;

      import('leaflet').then((L) => {
         // Guard: if the container is already initialised (React StrictMode double-invoke)
         if (mapRef.current) return;

         // Fix the broken default icon path that Webpack/Vite mangles
         delete L.Icon.Default.prototype._getIconUrl;
         L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
         });

         map = L.map(containerId, {
            center,
            zoom,
            zoomControl: true,
            attributionControl: true,
         });

         L.tileLayer(OSM_TILE_URL, {
            attribution: OSM_ATTRIBUTION,
            maxZoom: 19,
         }).addTo(map);

         // Style the attribution widget to match the dark theme
         map.attributionControl.setPrefix('');

         mapRef.current = map;
      });

      return () => {
         // Cleanup on unmount — prevents "Map container is already initialized" on HMR
         if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
         }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [containerId]);

   /**
    * Smoothly pan + zoom the map to a given position.
    *
    * @param {[number, number]} latlng
    * @param {number} [targetZoom]
    */
   const flyTo = useCallback((latlng, targetZoom = 15) => {
      mapRef.current?.flyTo(latlng, targetZoom, { duration: 1.2 });
   }, []);

   /**
    * Fit the map viewport to a LatLngBounds object.
    *
    * @param {import('leaflet').LatLngBounds} bounds
    */
   const fitBounds = useCallback((bounds, options = {}) => {
      mapRef.current?.fitBounds(bounds, { padding: [48, 48], ...options });
   }, []);

   return { mapRef, flyTo, fitBounds };
}
