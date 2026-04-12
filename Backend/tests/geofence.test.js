/**
 * @file geofence.test.js
 * @description Unit tests for the geofence engine.
 *
 * Tests cover:
 *  1. haversineDistance — known coordinate pairs with verified expected values.
 *  2. checkGeofences    — hit / miss / already-visited / multiple centers.
 *  3. validateGpsPoint  — accuracy filtering, non-finite rejection.
 *
 * These tests are pure — no DB connection, no mocking required.
 * Run with: npm test
 *
 * Install: npm install --save-dev vitest
 * Add to package.json: "test": "vitest run"
 *
 * @module tests/geofence
 */

import { describe, it, expect } from 'vitest';
import {
   haversineDistance,
   checkGeofences,
   validateGpsPoint,
   MAX_ACCURACY_METRES,
} from '../services/geofence.service.js';

// ─── haversineDistance ────────────────────────────────────────────────────────

describe('haversineDistance', () => {

   it('returns 0 for identical coordinates', () => {
      expect(haversineDistance(28.6315, 77.2167, 28.6315, 77.2167)).toBe(0);
   });

   it('returns 0 for the origin point (0,0) compared to itself', () => {
      expect(haversineDistance(0, 0, 0, 0)).toBe(0);
   });

   /**
    * Known distance: Connaught Place → India Gate, New Delhi.
    * Actual Haversine result for these coordinates: ~2416m.
    * The original estimate of 3.2km was wrong — the coordinates are only
    * ~2.4km apart. Fixed to match the mathematically correct output.
    * We allow ±150m tolerance for floating-point variance.
    */
   it('calculates ~2.4km between Connaught Place and India Gate', () => {
      const dist = haversineDistance(28.6315, 77.2167, 28.6129, 77.2295);
      expect(dist).toBeGreaterThan(2300);
      expect(dist).toBeLessThan(2550);
   });

   /**
    * Known distance: two points exactly 1 degree of latitude apart at the equator.
    * 1° latitude = 111,195 m (Earth's mean radius formula).
    * Tolerance ±500m for spheroid vs sphere model difference.
    */
   it('calculates ~111km for 1 degree of latitude at the equator', () => {
      const dist = haversineDistance(0, 0, 1, 0);
      expect(dist).toBeGreaterThan(110_000);
      expect(dist).toBeLessThan(112_000);
   });

   /**
    * Antipodal points — maximum possible distance ≈ half Earth circumference.
    * ~20,015 km = 20,015,000 m.
    */
   it('calculates ~20,015km for antipodal points', () => {
      const dist = haversineDistance(0, 0, 0, 180);
      expect(dist).toBeGreaterThan(20_000_000);
      expect(dist).toBeLessThan(20_100_000);
   });

   it('is symmetric — distance(A→B) === distance(B→A)', () => {
      const d1 = haversineDistance(28.6315, 77.2167, 28.6514, 77.1907);
      const d2 = haversineDistance(28.6514, 77.1907, 28.6315, 77.2167);
      expect(Math.abs(d1 - d2)).toBeLessThan(0.001); // floating-point tolerance
   });

   it('returns a positive number for non-identical coordinates', () => {
      const dist = haversineDistance(28.6315, 77.2167, 28.6316, 77.2168);
      expect(dist).toBeGreaterThan(0);
   });

   it('works for negative (southern hemisphere) coordinates', () => {
      // Sydney Opera House to Melbourne CBD — verified ~714 km
      const dist = haversineDistance(-33.8568, 151.2153, -37.8136, 144.9631);
      expect(dist).toBeGreaterThan(710_000);
      expect(dist).toBeLessThan(720_000);
   });

   it('handles the international date line (crossing lng ±180)', () => {
      // Two points just either side of the date line
      const dist = haversineDistance(0, 179.9, 0, -179.9);
      expect(dist).toBeLessThan(30_000); // should be ~22 km, NOT ~40,000 km
   });

});

// ─── checkGeofences ───────────────────────────────────────────────────────────

describe('checkGeofences', () => {

   /**
    * Test fixtures — these centers match the seeded Delhi North AM route.
    * Using consistent IDs makes the "already visited" tests deterministic.
    */
   const centers = [
      { _id: 'center001', name: 'Connaught Place Pharmacy', lat: 28.6315, lng: 77.2167, radius: 100 },
      { _id: 'center002', name: 'Karol Bagh Medical Store', lat: 28.6514, lng: 77.1907, radius: 150 },
      { _id: 'center003', name: 'Patel Nagar Clinic', lat: 28.6538, lng: 77.1708, radius: 100 },
   ];

   it('returns an empty array when the point is far from all centers', () => {
      // India Gate — ~3km from Connaught Place
      const hits = checkGeofences(
         { lat: 28.6129, lng: 77.2295 },
         centers,
         new Set(),
      );
      expect(hits).toHaveLength(0);
   });

   it('returns a hit when the point is exactly at a center', () => {
      const hits = checkGeofences(
         { lat: 28.6315, lng: 77.2167 }, // Exactly at center001
         centers,
         new Set(),
      );
      expect(hits).toHaveLength(1);
      expect(String(hits[0].centerId)).toBe('center001');
      expect(hits[0].centerName).toBe('Connaught Place Pharmacy');
      expect(hits[0].distance).toBe(0);
   });

   it('returns a hit when the point is within the radius', () => {
      // ~50m north of center001 (radius=100m) → should still be a hit
      const hits = checkGeofences(
         { lat: 28.6320, lng: 77.2167 }, // ~55m north
         centers,
         new Set(),
      );
      expect(hits).toHaveLength(1);
      expect(hits[0].distance).toBeLessThan(100);
   });

   it('returns no hit when the point is just outside the radius', () => {
      // ~120m north of center001 (radius=100m) → should miss
      const hits = checkGeofences(
         { lat: 28.6326, lng: 77.2167 }, // ~122m north
         centers,
         new Set(),
      );
      expect(hits).toHaveLength(0);
   });

   it('skips centers that are already in visitedCenterIds', () => {
      const visitedIds = new Set(['center001']);
      const hits = checkGeofences(
         { lat: 28.6315, lng: 77.2167 }, // Exactly at center001
         centers,
         visitedIds,
      );
      // center001 is visited — should be skipped
      expect(hits).toHaveLength(0);
   });

   it('returns multiple hits when two centers are very close together', () => {
      const closeCenters = [
         { _id: 'closeA', name: 'Center A', lat: 28.6315, lng: 77.2167, radius: 200 },
         { _id: 'closeB', name: 'Center B', lat: 28.6316, lng: 77.2168, radius: 200 },
      ];
      const hits = checkGeofences(
         { lat: 28.6315, lng: 77.2167 },
         closeCenters,
         new Set(),
      );
      expect(hits).toHaveLength(2);
   });

   it('returns hits with distance rounded to 2 decimal places', () => {
      const hits = checkGeofences(
         { lat: 28.6318, lng: 77.2167 }, // ~33m north of center001
         centers,
         new Set(),
      );
      expect(hits).toHaveLength(1);
      // Distance should be a number with at most 2 decimal places
      const decimalPart = String(hits[0].distance).split('.')[1] ?? '';
      expect(decimalPart.length).toBeLessThanOrEqual(2);
   });

   it('returns an empty array for an empty centers list', () => {
      const hits = checkGeofences({ lat: 28.6315, lng: 77.2167 }, [], new Set());
      expect(hits).toHaveLength(0);
   });

   it('handles all centers already visited', () => {
      const visitedIds = new Set(centers.map((c) => c._id));
      const hits = checkGeofences(
         { lat: 28.6315, lng: 77.2167 },
         centers,
         visitedIds,
      );
      expect(hits).toHaveLength(0);
   });

});

// ─── validateGpsPoint ─────────────────────────────────────────────────────────

describe('validateGpsPoint', () => {

   it('returns valid for a clean GPS point', () => {
      const result = validateGpsPoint({ lat: 28.6315, lng: 77.2167, accuracy: 10 });
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
   });

   it('returns valid when accuracy is null (not provided)', () => {
      const result = validateGpsPoint({ lat: 28.6315, lng: 77.2167, accuracy: null });
      expect(result.valid).toBe(true);
   });

   it('returns valid when accuracy is undefined', () => {
      const result = validateGpsPoint({ lat: 28.6315, lng: 77.2167 });
      expect(result.valid).toBe(true);
   });

   it('returns valid when accuracy equals MAX_ACCURACY_METRES exactly', () => {
      const result = validateGpsPoint({ lat: 28.6315, lng: 77.2167, accuracy: MAX_ACCURACY_METRES });
      expect(result.valid).toBe(true);
   });

   it('returns invalid when accuracy exceeds MAX_ACCURACY_METRES', () => {
      const result = validateGpsPoint({ lat: 28.6315, lng: 77.2167, accuracy: MAX_ACCURACY_METRES + 1 });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('accuracy too low');
   });

   it('returns invalid for NaN latitude', () => {
      const result = validateGpsPoint({ lat: NaN, lng: 77.2167 });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Non-finite');
   });

   it('returns invalid for Infinity longitude', () => {
      const result = validateGpsPoint({ lat: 28.6315, lng: Infinity });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Non-finite');
   });

   it('returns invalid for -Infinity latitude', () => {
      const result = validateGpsPoint({ lat: -Infinity, lng: 77.2167 });
      expect(result.valid).toBe(false);
   });

});
