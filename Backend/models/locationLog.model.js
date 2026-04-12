/**
 * @file locationLog.model.js
 * @description Mongoose schema and model for GPS location points.
 *
 * Every GPS ping from the mobile app is stored as one LocationLog document.
 * These raw points serve three purposes:
 *  1. Input to the geofence engine (processed immediately on POST /locations).
 *  2. Audit trail — full breadcrumb replay of every employee's path.
 *  3. Analytics — speed, accuracy, and coverage reporting.
 *
 * Schema overview:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ LocationLog                                                      │
 * │  employeeId    ObjectId  Who sent this point                     │
 * │  assignmentId  ObjectId  Which assignment this point belongs to  │
 * │  companyId     ObjectId  Multi-tenancy scope (denormalised)      │
 * │  lat           number    WGS-84 latitude                         │
 * │  lng           number    WGS-84 longitude                        │
 * │  accuracy      number    GPS accuracy radius in metres           │
 * │  speed         number?   Speed in m/s from device (optional)     │
 * │  altitude      number?   Metres above sea level (optional)       │
 * │  heading       number?   Bearing in degrees 0-360 (optional)     │
 * │  timestamp     Date      Device-side capture time (client clock) │
 * │  serverTime    Date      Server-side receipt time (trusted)      │
 * │  geofenceHit   Object?   Populated when a center entry fires     │
 * │    centerId    ObjectId  The center that was entered             │
 * │    centerName  string    Denormalised for fast log display       │
 * │    distance    number    Exact metres from center at hit time    │
 * │  synced        boolean   Offline-sync flag (default true)        │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Write volume considerations:
 *  A typical field employee sends 1 GPS point every 5–10 seconds.
 *  For 8 hours/day × 50 employees = ~1.4 M documents/day.
 *  TTL index auto-expires logs after 90 days to bound storage growth.
 *  Indexes are carefully chosen to keep write amplification minimal
 *  (each document write updates at most 3 indexes).
 *
 * Indexes:
 *  - { assignmentId, timestamp }  → breadcrumb replay (primary read pattern)
 *  - { employeeId,  timestamp }  → employee track history
 *  - { companyId,   timestamp }  → company-wide monitoring
 *  - { serverTime }  TTL         → auto-expire after 90 days
 *
 * Future scope:
 *  - Add MongoDB 2dsphere index on { loc: { type:'Point', coordinates:[lng,lat] } }
 *    for native $geoNear queries once geofence complexity grows.
 *  - Add `batteryLevel` for field-device health monitoring.
 *  - Stream to a time-series DB (InfluxDB / TimescaleDB) for analytics
 *    once raw volume exceeds MongoDB's sweet spot (~100 M docs).
 *
 * @module models/locationLog
 */

import mongoose from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

/** TTL in seconds — location logs are auto-deleted after this period. */
export const LOCATION_LOG_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

/**
 * Maximum allowed gap between device timestamp and server receipt time.
 * Points arriving with a larger skew are flagged or rejected to prevent
 * replay attacks and offline-batch abuse.
 */
export const MAX_TIMESTAMP_SKEW_MS = 10 * 60 * 1000; // 10 minutes

// ─── Sub-schema: GeofenceHit ──────────────────────────────────────────────────

/**
 * Populated on a LocationLog when this GPS point triggered a geofence entry.
 * Storing hit metadata directly on the log avoids a separate lookup when
 * building breadcrumb visualisations that need to highlight check-in points.
 */
const geofenceHitSchema = new mongoose.Schema(
   {
      /** The center whose geofence was entered. */
      centerId: {
         type: mongoose.Schema.Types.ObjectId,
         required: true,
      },

      /** Denormalised center name — readable logs without a Route join. */
      centerName: {
         type: String,
         required: true,
         trim: true,
      },

      /**
       * Haversine distance (metres) between this GPS point and the center
       * at the exact moment of the geofence entry. Useful for accuracy audits.
       */
      distance: {
         type: Number,
         required: true,
         min: 0,
      },
   },
   { _id: false },
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const locationLogSchema = new mongoose.Schema(
   {
      /** Employee who generated this GPS point. */
      employeeId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: [true, 'Employee ID is required'],
      },

      /**
       * Assignment this point belongs to.
       * Required — GPS points are only accepted while an assignment is active.
       * This enforces that employees cannot generate orphan location data.
       */
      assignmentId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Assignment',
         required: [true, 'Assignment ID is required'],
      },

      /**
       * Denormalised from Assignment at write time.
       * Enables company-scoped monitoring queries without an Assignment join.
       */
      companyId: {
         type: mongoose.Schema.Types.ObjectId,
         required: [true, 'Company ID is required'],
      },

      /** WGS-84 latitude — validated to [-90, +90]. */
      lat: {
         type: Number,
         required: [true, 'Latitude is required'],
         min: [-90, 'Latitude must be ≥ -90'],
         max: [90, 'Latitude must be ≤ +90'],
      },

      /** WGS-84 longitude — validated to [-180, +180]. */
      lng: {
         type: Number,
         required: [true, 'Longitude is required'],
         min: [-180, 'Longitude must be ≥ -180'],
         max: [180, 'Longitude must be ≤ +180'],
      },

      /**
       * Horizontal accuracy radius reported by the device GPS chip (metres).
       * Points with accuracy > 100m are stored but flagged — the geofence
       * engine uses this to avoid false positives on noisy signals.
       */
      accuracy: {
         type: Number,
         default: null,
         min: [0, 'Accuracy must be non-negative'],
      },

      /** Instantaneous speed in metres/second from the device. Null if unavailable. */
      speed: {
         type: Number,
         default: null,
         min: [0, 'Speed must be non-negative'],
      },

      /** Altitude in metres above WGS-84 ellipsoid. Null if unavailable. */
      altitude: {
         type: Number,
         default: null,
      },

      /** Compass bearing in degrees (0–360). Null if unavailable. */
      heading: {
         type: Number,
         default: null,
         min: [0, 'Heading must be ≥ 0'],
         max: [360, 'Heading must be ≤ 360'],
      },

      /**
       * Device-side capture timestamp.
       * Stored for audit purposes but NOT trusted for geofence timing —
       * `serverTime` is used instead to prevent clock manipulation.
       */
      timestamp: {
         type: Date,
         required: [true, 'Timestamp is required'],
      },

      /**
       * Server-side receipt timestamp. Set automatically — never from the client.
       * This is the authoritative time used for visitedAt on geofence hits.
       */
      serverTime: {
         type: Date,
         default: () => new Date(),
      },

      /**
       * Populated when this GPS point triggered a geofence entry.
       * Null for the vast majority of points (those not near any center).
       */
      geofenceHit: {
         type: geofenceHitSchema,
         default: null,
      },

      /**
       * Offline-sync flag.
       * true  = received in real-time (normal case).
       * false = received as part of an offline batch upload from the mobile app.
       * Offline points are processed for geofence hits but NOT used to update
       * visitedAt timestamps (server already marked the center by then).
       */
      synced: {
         type: Boolean,
         default: true,
      },
   },
   {
      timestamps: false, // we manage serverTime manually for precision
      versionKey: false,
   },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * Primary read pattern: "show me the breadcrumb trail for assignment X".
 * Timestamp ascending gives chronological order for replay.
 */
locationLogSchema.index({ assignmentId: 1, timestamp: 1 });

/**
 * Employee history: "where was employee Y today?".
 */
locationLogSchema.index({ employeeId: 1, timestamp: -1 });

/**
 * Company monitoring dashboard: "all live pings for company Z".
 */
locationLogSchema.index({ companyId: 1, serverTime: -1 });

/**
 * TTL index — MongoDB automatically deletes documents where
 * `serverTime` is older than LOCATION_LOG_TTL_SECONDS.
 * This keeps the collection bounded without manual cleanup jobs.
 */
locationLogSchema.index(
   { serverTime: 1 },
   { expireAfterSeconds: LOCATION_LOG_TTL_SECONDS },
);

// ─── Export ───────────────────────────────────────────────────────────────────

const LocationLog = mongoose.model('LocationLog', locationLogSchema);

export default LocationLog;
