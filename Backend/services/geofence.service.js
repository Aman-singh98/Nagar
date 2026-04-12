/**
 * @file geofence.service.js
 * @description Core geofence detection engine.
 *
 * This is the most performance-critical file in the entire project.
 * Every GPS point from every active employee flows through this module.
 * It must be fast, correct, and thoroughly testable in isolation.
 *
 * Architecture:
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │  POST /locations                                               │
 *  │       │                                                        │
 *  │       ▼                                                        │
 *  │  validateGpsPoint()   ← rejects noisy / low-accuracy points   │
 *  │       │                                                        │
 *  │       ▼                                                        │
 *  │  checkGeofences()     ← pure function, zero DB calls          │
 *  │       │                                                        │
 *  │       ▼                                                        │
 *  │  haversineDistance()  ← O(1) spherical geometry               │
 *  │       │                                                        │
 *  │       ▼                                                        │
 *  │  applyGeofenceHits()  ← DB write only if a hit was detected   │
 *  └────────────────────────────────────────────────────────────────┘
 *
 * Key design decisions:
 *
 *  1. Pure core — `haversineDistance` and `checkGeofences` are pure functions
 *     with zero side effects. They can be unit-tested without a DB connection.
 *
 *  2. Early exit — `checkGeofences` returns on the FIRST hit per center to
 *     avoid redundant distance calculations once a center is entered.
 *
 *  3. Already-visited guard — centers already marked "visited" are skipped
 *     entirely. This prevents duplicate DB writes on sustained presence inside
 *     a geofence (the employee standing still for 30 seconds would otherwise
 *     trigger 6 writes at 5-second intervals).
 *
 *  4. Accuracy filter — points with GPS accuracy > MAX_ACCURACY_METRES are
 *     rejected from geofence processing to avoid false positives when the
 *     device is indoors or the signal is degraded. The raw point is still
 *     stored for the audit trail.
 *
 *  5. Single atomic DB write — `applyGeofenceHits` uses a single
 *     `findByIdAndUpdate` with a `$set` on the specific array index rather
 *     than loading, mutating, and saving the full Assignment document.
 *     This is critical at scale: at 50 employees × 1 ping/5s = 600 writes/min.
 *
 *  6. No distributed lock — for the MVP, a per-assignment race condition is
 *     acceptable (two near-simultaneous pings could both pass the
 *     "already visited?" check and both attempt a write — the second write
 *     is idempotent and harmless). A Redis lock can be added in v2.
 *
 * @module services/geofence
 */

import Assignment, { ASSIGNMENT_STATUS, VISIT_STATUS } from '../models/assignment.model.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Earth's mean radius in metres (WGS-84). */
const EARTH_RADIUS_M = 6_371_000;

/**
 * GPS points with an accuracy reading above this threshold are excluded from
 * geofence processing. They are still stored as raw location logs.
 * 100 m is a safe ceiling — most modern phones achieve 3–15 m outdoors.
 */
export const MAX_ACCURACY_METRES = 100;

/** Degrees to radians conversion factor. Pre-computed to avoid per-call division. */
const DEG_TO_RAD = Math.PI / 180;

// ─── Pure Functions ───────────────────────────────────────────────────────────

/**
 * Calculates the great-circle distance between two WGS-84 coordinates
 * using the Haversine formula.
 *
 * This is a pure function — no side effects, no async, no dependencies.
 * It should be unit-tested independently with known coordinate pairs.
 *
 * Haversine formula:
 *   a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlng/2)
 *   c = 2 · atan2(√a, √(1−a))
 *   d = R · c
 *
 * Accuracy: sub-metre for distances < 1000 km. Sufficient for geofence use.
 * For distances > 1000 km, use Vincenty or PostGIS — but that won't happen
 * within a single field route.
 *
 * @param {number} lat1 - Origin latitude  in decimal degrees.
 * @param {number} lng1 - Origin longitude in decimal degrees.
 * @param {number} lat2 - Target latitude  in decimal degrees.
 * @param {number} lng2 - Target longitude in decimal degrees.
 * @returns {number} Distance in metres (always non-negative).
 *
 * @example
 * haversineDistance(28.6315, 77.2167, 28.6316, 77.2168); // → ~15 m
 * haversineDistance(0, 0, 0, 0);                          // → 0
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
   const φ1 = lat1 * DEG_TO_RAD;
   const φ2 = lat2 * DEG_TO_RAD;
   const Δφ = (lat2 - lat1) * DEG_TO_RAD;
   const Δλ = (lng2 - lng1) * DEG_TO_RAD;

   const sinΔφ = Math.sin(Δφ / 2);
   const sinΔλ = Math.sin(Δλ / 2);

   const a = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ;
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

   return EARTH_RADIUS_M * c;
}

/**
 * Checks a single GPS point against an array of centers and returns
 * every center whose geofence was entered by this point.
 *
 * Pure function — takes plain data, returns plain data. No DB access.
 * Designed to be called in a tight loop (one call per incoming GPS point).
 *
 * Algorithm:
 *  For each center in `centers`:
 *   - Skip if already marked visited in `visitedCenterIds`.
 *   - Compute Haversine distance from point to center.
 *   - If distance ≤ center.radius → record as a hit.
 *
 * Time complexity: O(n) where n = number of centers (max 50 per route).
 * Space complexity: O(k) where k = number of hits (typically 0 or 1).
 *
 * @param {{ lat: number, lng: number }}           point
 * @param {{ _id: ObjectId, name: string, lat: number, lng: number, radius: number }[]} centers
 * @param {Set<string>}                            visitedCenterIds  Already-visited center IDs (strings).
 * @returns {{ centerId: ObjectId, centerName: string, distance: number }[]}
 *
 * @example
 * const hits = checkGeofences(
 *   { lat: 28.6315, lng: 77.2167 },
 *   [{ _id: '...', name: 'CP Pharmacy', lat: 28.6315, lng: 77.2167, radius: 100 }],
 *   new Set(),
 * );
 * // hits → [{ centerId: '...', centerName: 'CP Pharmacy', distance: 0 }]
 */
export function checkGeofences(point, centers, visitedCenterIds) {
   const hits = [];

   for (const center of centers) {
      const centerIdStr = String(center._id);

      // ── Skip already-visited centers ─────────────────────────────────────────
      // Critical optimisation: prevents duplicate write attempts when the employee
      // stands inside a geofence for multiple ping intervals.
      if (visitedCenterIds.has(centerIdStr)) continue;

      const distance = haversineDistance(point.lat, point.lng, center.lat, center.lng);

      if (distance <= center.radius) {
         hits.push({
            centerId: center._id,
            centerName: center.name,
            distance: Math.round(distance * 100) / 100, // round to 2dp for storage
         });
      }
   }

   return hits;
}

/**
 * Validates whether a GPS point should be processed by the geofence engine.
 *
 * Returns an object with `valid: true` on success, or `valid: false` with a
 * `reason` string explaining why the point was rejected.
 * The controller stores the point regardless — this only controls whether
 * geofence processing runs on it.
 *
 * Rules:
 *  1. Coordinates must be finite numbers (NaN / Infinity rejected).
 *  2. Accuracy must be ≤ MAX_ACCURACY_METRES if provided.
 *     Points with no accuracy reading are processed (benefit of the doubt).
 *
 * @param {{ lat: number, lng: number, accuracy?: number }} point
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateGpsPoint(point) {
   if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
      return { valid: false, reason: 'Non-finite coordinates.' };
   }

   if (
      point.accuracy !== null &&
      point.accuracy !== undefined &&
      point.accuracy > MAX_ACCURACY_METRES
   ) {
      return {
         valid: false,
         reason: `GPS accuracy too low: ${point.accuracy}m (max ${MAX_ACCURACY_METRES}m).`,
      };
   }

   return { valid: true };
}

// ─── DB-coupled Functions ─────────────────────────────────────────────────────

/**
 * Applies geofence hits to the Assignment document.
 *
 * For each hit:
 *  1. Finds the index of the center in assignment.visitStatuses.
 *  2. Builds a targeted $set update on that array element.
 *  3. Executes a single atomic findByIdAndUpdate — never save().
 *
 * Why a single update for all hits?
 *  Multiple hits in one ping are rare (would require two centers < 100m apart),
 *  but when they do occur, a single update is more efficient and avoids
 *  partial-write scenarios where the first hit succeeds but the second fails.
 *
 * @param {import('mongoose').Document} assignment  - Mongoose Assignment document.
 * @param {{ centerId: ObjectId, centerName: string, distance: number }[]} hits
 * @param {Date} serverTime - Authoritative timestamp for visitedAt.
 * @returns {Promise<import('mongoose').Document|null>} Updated assignment or null if no hits.
 */
export async function applyGeofenceHits(assignment, hits, serverTime) {
   if (hits.length === 0) return null;

   const updateFields = {};
   let anyHit = false;

   for (const hit of hits) {
      const idx = assignment.visitStatuses.findIndex(
         (vs) => String(vs.centerId) === String(hit.centerId),
      );

      // Guard: skip if not found or already visited (race-condition safety net)
      if (idx === -1) continue;
      if (assignment.visitStatuses[idx].status === VISIT_STATUS.VISITED) continue;

      updateFields[`visitStatuses.${idx}.status`] = VISIT_STATUS.VISITED;
      updateFields[`visitStatuses.${idx}.visitedAt`] = serverTime;
      anyHit = true;
   }

   if (!anyHit) return null;

   // ── Set startedAt on the very first check-in ──────────────────────────────
   if (!assignment.startedAt) {
      updateFields.startedAt = serverTime;
      updateFields.status = ASSIGNMENT_STATUS.IN_PROGRESS;
   }

   // ── Check if this batch of hits completes the entire assignment ───────────
   // We must simulate the post-update state to know if all are resolved.
   const simulatedStatuses = assignment.visitStatuses.map((vs, i) => {
      const key = `visitStatuses.${i}.status`;
      return updateFields[key] ? updateFields[key] : vs.status;
   });

   const allResolved = simulatedStatuses.every(
      (s) => s === VISIT_STATUS.VISITED || s === VISIT_STATUS.SKIPPED,
   );

   if (allResolved) {
      updateFields.status = ASSIGNMENT_STATUS.COMPLETED;
      updateFields.completedAt = serverTime;
   }

   // ── Single atomic DB write ────────────────────────────────────────────────
   return Assignment.findByIdAndUpdate(
      assignment._id,
      { $set: updateFields },
      { new: true, runValidators: false }, // runValidators: false — we only set known-valid fields
   );
}
