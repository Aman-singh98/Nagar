// /**
//  * @file location.controller.js
//  * @description HTTP handlers for GPS location ingestion and retrieval.
//  *
//  * Endpoints:
//  * ┌────────────────────────────────────────┬───────────────────────────┐
//  * │ Route                                  │ Description               │
//  * ├────────────────────────────────────────┼───────────────────────────┤
//  * │ POST /locations                        │ Ingest one GPS point      │
//  * │ POST /locations/batch                  │ Ingest offline batch      │
//  * │ GET  /locations?assignmentId=          │ Replay breadcrumb trail   │
//  * │ POST /assignments/:id/end              │ End assignment, miss rest │
//  * └────────────────────────────────────────┴───────────────────────────┘
//  *
//  * POST /locations is the hot path — it runs on every GPS ping.
//  * Its pipeline is designed to complete in < 50ms p99:
//  *
//  *   1. Validate JWT + extract user  (auth middleware, ~2ms)
//  *   2. Validate body shape          (Joi, ~1ms)
//  *   3. Load assignment from cache   (Redis in v2 / DB with lean, ~5ms)
//  *   4. Validate GPS point quality   (pure function, ~0.01ms)
//  *   5. Store LocationLog            (fire-and-forget insert, ~3ms)
//  *   6. Run geofence check           (pure function, ~0.1ms for 50 centers)
//  *   7. Apply hits to Assignment     (conditional DB write, ~5ms if hit)
//  *   8. Send response                (~1ms)
//  *
//  *   Total: ~17ms on a hit, ~12ms on a miss.
//  *
//  * Access control:
//  *  - POST /locations        → employee (own assignment only)
//  *  - POST /locations/batch  → employee (own assignment only)
//  *  - GET  /locations        → admin, manager, employee (scoped)
//  *  - POST /assignments/:id/end → admin, manager
//  *
//  * @module controllers/location
//  */
// import mongoose from 'mongoose';
// import LocationLog, { MAX_TIMESTAMP_SKEW_MS } from '../models/locationLog.model.js';
// import Assignment, { ASSIGNMENT_STATUS, VISIT_STATUS } from '../models/assignment.model.js';
// import AppError from '../utils/appError.js';
// import { sendSuccess } from '../utils/responseHandler.js';
// import { paginateQuery } from '../utils/pagination.js';
// import { USER_ROLES } from '../models/user.model.js';
// import {
//    validateGpsPoint,
//    checkGeofences,
//    applyGeofenceHits,
// } from '../services/geofence.service.js';

// // ─── POST /locations ──────────────────────────────────────────────────────────

// /**
//  * Ingests a single GPS point from the mobile app.
//  *
//  * Pipeline (see file header for timing breakdown):
//  *  1. Load the assignment — verifies it exists, is active, belongs to the caller.
//  *  2. Validate GPS point quality.
//  *  3. Insert LocationLog (fire-and-forget — response does NOT wait for this).
//  *  4. Run geofence check against all centers on the route.
//  *  5. If hit(s) detected → apply to Assignment atomically.
//  *  6. Respond immediately with geofence hit summary.
//  *
//  * Fire-and-forget on LocationLog insert:
//  *  The raw GPS storage is separated from the response path. If the insert
//  *  fails (disk full, transient error), the geofence logic still completes
//  *  and the response is still sent. Storage errors are logged but not
//  *  surfaced to the mobile app to avoid blocking the field employee.
//  *  In production, add a dead-letter queue here.
//  *
//  * @type {import('express').RequestHandler}
//  */
// export const ingestLocation = async (req, res, next) => {
//    try {
//       const { assignmentId, lat, lng, accuracy, speed, altitude, heading, timestamp } = req.body;
//       const serverTime = new Date();

//       // ── Step 1: Load assignment with route centers ────────────────────────────
//       const assignment = await Assignment
//          .findOne({
//             _id: assignmentId,
//             employeeId: req.user.sub,           // employee can only post to own assignment
//             companyId: req.user.companyId,
//             status: { $in: [ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.IN_PROGRESS] },
//          })
//          .populate('routeId', 'centers')       // only fetch centers — minimal payload
//          .lean(false);                         // need Document for applyGeofenceHits

//       if (!assignment) {
//          return next(new AppError(
//             'Assignment not found, already completed, or does not belong to you.',
//             404,
//          ));
//       }

//       // ── Step 2: Validate GPS quality ──────────────────────────────────────────
//       const { valid, reason } = validateGpsPoint({ lat, lng, accuracy });

//       // ── Step 3: Fire-and-forget LocationLog insert ────────────────────────────
//       // We intentionally do NOT await this. The mobile app gets its response
//       // in ~12ms instead of ~20ms, and a storage failure does not block tracking.
//       LocationLog.create({
//          employeeId: req.user.sub,
//          assignmentId,
//          companyId: req.user.companyId,
//          lat, lng, accuracy, speed, altitude, heading,
//          timestamp: timestamp ? new Date(timestamp) : serverTime,
//          serverTime,
//          synced: true,
//       }).catch((err) => {
//          // Log storage failure but do not crash the request
//          console.error(`[LocationLog] Insert failed for assignment ${assignmentId}:`, err.message);
//       });

//       // ── Step 4: Geofence check ────────────────────────────────────────────────
//       if (!valid) {
//          // Point stored for audit but not processed for geofence
//          return sendSuccess(res, 200, 'Location received. Geofence skipped (low accuracy).', {
//             geofenceHits: [],
//             skippedReason: reason,
//          });
//       }

//       const centers = assignment.routeId?.centers ?? [];
//       const visitedIds = new Set(
//          assignment.visitStatuses
//             .filter((vs) => vs.status === VISIT_STATUS.VISITED)
//             .map((vs) => String(vs.centerId)),
//       );

//       const hits = checkGeofences({ lat, lng }, centers, visitedIds);

//       // ── Step 5: Apply hits if any ─────────────────────────────────────────────
//       let updatedAssignment = null;
//       if (hits.length > 0) {
//          updatedAssignment = await applyGeofenceHits(assignment, hits, serverTime);
//       }

//       // ── Step 6: Respond ───────────────────────────────────────────────────────
//       const progress = updatedAssignment
//          ? updatedAssignment.getProgress()
//          : null;

//       return sendSuccess(res, 200, 'Location received.', {
//          geofenceHits: hits.map((h) => ({
//             centerId: h.centerId,
//             centerName: h.centerName,
//             distance: h.distance,
//          })),
//          progress,
//       });
//    } catch (error) {
//       return next(error);
//    }
// };

// // ─── POST /locations/batch ────────────────────────────────────────────────────

// /**
//  * Ingests a batch of GPS points collected while the device was offline.
//  *
//  * Offline batches must be submitted in chronological order (sorted by timestamp
//  * ascending on the device before upload). The server processes them in order
//  * to ensure geofence hit timestamps are accurate.
//  *
//  * Performance: uses insertMany for bulk storage, then processes geofence
//  * checks sequentially (not in parallel) to preserve correct hit ordering.
//  *
//  * Batch size is capped at 500 points — ~40 minutes of 5-second pings.
//  * Larger batches should be split by the client.
//  *
//  * @type {import('express').RequestHandler}
//  */
// export const ingestBatch = async (req, res, next) => {
//    try {
//       const { assignmentId, points } = req.body;
//       const serverTime = new Date();

//       // ── Validate assignment ───────────────────────────────────────────────────
//       const assignment = await Assignment
//          .findOne({
//             _id: assignmentId,
//             employeeId: req.user.sub,
//             companyId: req.user.companyId,
//             // Allow completed assignments for late offline sync
//             status: { $in: [ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.IN_PROGRESS, ASSIGNMENT_STATUS.COMPLETED] },
//          })
//          .populate('routeId', 'centers')
//          .lean(false);

//       if (!assignment) {
//          return next(new AppError('Assignment not found or does not belong to you.', 404));
//       }

//       // ── Sort points chronologically ───────────────────────────────────────────
//       const sorted = [...points].sort(
//          (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
//       );

//       // ── Bulk insert all raw logs (offline = synced: false) ────────────────────
//       const logDocs = sorted.map((p) => ({
//          employeeId: req.user.sub,
//          assignmentId,
//          companyId: req.user.companyId,
//          lat: p.lat,
//          lng: p.lng,
//          accuracy: p.accuracy ?? null,
//          speed: p.speed ?? null,
//          altitude: p.altitude ?? null,
//          heading: p.heading ?? null,
//          timestamp: new Date(p.timestamp),
//          serverTime,
//          synced: false, // offline batch flag
//       }));

//       // Fire-and-forget bulk insert
//       LocationLog.insertMany(logDocs, { ordered: false }).catch((err) => {
//          console.error(`[LocationLog] Batch insert partial failure for assignment ${assignmentId}:`, err.message);
//       });

//       // ── Process geofence hits in chronological order ──────────────────────────
//       // We re-fetch the assignment after each hit so visitedIds stays current.
//       let totalHits = 0;
//       let currentAssignment = assignment;

//       for (const point of sorted) {
//          const { valid } = validateGpsPoint(point);
//          if (!valid) continue;

//          const visitedIds = new Set(
//             currentAssignment.visitStatuses
//                .filter((vs) => vs.status === VISIT_STATUS.VISITED)
//                .map((vs) => String(vs.centerId)),
//          );

//          const centers = currentAssignment.routeId?.centers ?? [];
//          const hits = checkGeofences(point, centers, visitedIds);

//          if (hits.length > 0) {
//             const pointTime = new Date(point.timestamp);
//             const updated = await applyGeofenceHits(currentAssignment, hits, pointTime);
//             if (updated) {
//                currentAssignment = updated;
//                totalHits += hits.length;
//             }
//          }
//       }

//       return sendSuccess(res, 200, `Batch processed. ${totalHits} geofence hit(s) applied.`, {
//          pointsReceived: points.length,
//          geofenceHits: totalHits,
//          progress: currentAssignment.getProgress?.() ?? null,
//       });
//    } catch (error) {
//       return next(error);
//    }
// };

// // ─── GET /locations ───────────────────────────────────────────────────────────

// /**
//  * Returns the breadcrumb trail (all stored GPS points) for an assignment.
//  *
//  * Query params:
//  *  - assignmentId {string}  Required — which assignment to fetch points for.
//  *  - page         {number}  Default: 1
//  *  - limit        {number}  Default: 100, Max: 500 (points are small documents)
//  *  - hitsOnly     {boolean} If true, return only points that triggered a geofence hit.
//  *
//  * Access:
//  *  - Employee: can only fetch points for their own assignments.
//  *  - Admin/Manager: any assignment in their company.
//  *
//  * @type {import('express').RequestHandler}
//  */
// export const listLocations = async (req, res, next) => {
//    try {
//       const { assignmentId, hitsOnly } = req.query;

//       if (!assignmentId) {
//          return next(new AppError('assignmentId query parameter is required.', 400));
//       }

//       // ── RBAC: verify the caller can access this assignment ────────────────────
//       const assignmentFilter = { _id: assignmentId, companyId: req.user.companyId };
//       if (req.user.role === USER_ROLES.EMPLOYEE) {
//          assignmentFilter.employeeId = req.user.sub;
//       }

//       const assignmentExists = await Assignment.exists(assignmentFilter);
//       if (!assignmentExists) {
//          return next(new AppError('Assignment not found or you do not have access.', 404));
//       }

//       // ── Build location filter ─────────────────────────────────────────────────
//       const filter = { assignmentId };
//       if (hitsOnly === 'true') {
//          filter.geofenceHit = { $ne: null };
//       }

//       const { data: locations, pagination } = await paginateQuery(
//          LocationLog,
//          filter,
//          { ...req.query, limit: req.query.limit ?? 100 },
//          {
//             sort: { timestamp: 1 },  // chronological order for replay
//             lean: true,
//             // Project only what the map UI needs — omit raw metadata
//             select: 'lat lng accuracy speed timestamp serverTime geofenceHit synced',
//          },
//       );

//       return sendSuccess(res, 200, 'Locations retrieved successfully.', { locations, pagination });
//    } catch (error) {
//       return next(error);
//    }
// };

// // ─── POST /assignments/:id/end ────────────────────────────────────────────────

// /**
//  * Ends an assignment by marking all still-pending centers as "skipped"
//  * and setting the overall assignment status to "completed".
//  *
//  * Use cases:
//  *  - Manager ends a route early (employee finished early, ran out of time, etc.)
//  *  - End-of-day batch job (can call this endpoint for all in-progress assignments)
//  *
//  * Idempotent: calling this on an already-completed assignment is a no-op.
//  *
//  * Uses a single $set targeting the specific pending indexes to avoid
//  * rewriting the full visitStatuses array.
//  *
//  * @type {import('express').RequestHandler}
//  */
// export const endAssignment = async (req, res, next) => {
//    try {
//       const { id } = req.params;

//       const assignment = await Assignment.findOne({
//          _id: id,
//          companyId: req.user.companyId,
//       });

//       if (!assignment) {
//          return next(new AppError('Assignment not found.', 404));
//       }

//       // ── Idempotency guard ─────────────────────────────────────────────────────
//       if (assignment.status === ASSIGNMENT_STATUS.COMPLETED) {
//          return sendSuccess(res, 200, 'Assignment was already completed.', {
//             assignment,
//             progress: assignment.getProgress(),
//          });
//       }

//       // ── Build targeted update for pending centers only ────────────────────────
//       const updateFields = {
//          status: ASSIGNMENT_STATUS.COMPLETED,
//          completedAt: new Date(),
//       };

//       assignment.visitStatuses.forEach((vs, idx) => {
//          if (vs.status === VISIT_STATUS.PENDING) {
//             updateFields[`visitStatuses.${idx}.status`] = VISIT_STATUS.SKIPPED;
//          }
//       });

//       const updated = await Assignment.findByIdAndUpdate(
//          id,
//          { $set: updateFields },
//          { new: true, runValidators: false },
//       );

//       return sendSuccess(res, 200, 'Assignment ended. Remaining centers marked as skipped.', {
//          assignment: updated,
//          progress: updated.getProgress(),
//       });
//    } catch (error) {
//       return next(error);
//    }
// };


// // ─── GET /locations/latest ────────────────────────────────────────────────────
// /**
//  * Returns the most recent GPS point per employee for all active assignments.
//  * Used by the Live Map page to show current positions.
//  * Access: admin, manager only.
//  */
// export const listLatestLocations = async (req, res, next) => {
//    try {
//       // ✅ Cast string from JWT to ObjectId before matching
//       const companyObjectId = new mongoose.Types.ObjectId(req.user.companyId);

//       const locations = await LocationLog.aggregate([
//          { $match: { companyId: companyObjectId } },
//          { $sort: { timestamp: -1 } },
//          {
//             $group: {
//                _id: '$employeeId',
//                lat: { $first: '$lat' },
//                lng: { $first: '$lng' },
//                accuracy: { $first: '$accuracy' },
//                speed: { $first: '$speed' },
//                timestamp: { $first: '$timestamp' },
//                assignmentId: { $first: '$assignmentId' },
//                employeeId: { $first: '$employeeId' },
//             },
//          },
//       ]);

//       return sendSuccess(res, 200, 'Latest locations retrieved.', { locations });
//    } catch (error) {
//       return next(error);
//    }
// };


/**
 * @file location.controller.js
 * @description HTTP handlers for GPS location ingestion and retrieval.
 *
 * @module controllers/location
 */
import mongoose from 'mongoose';
import LocationLog, { MAX_TIMESTAMP_SKEW_MS } from '../models/locationLog.model.js';
import Assignment, { ASSIGNMENT_STATUS, VISIT_STATUS } from '../models/assignment.model.js';
import AppError from '../utils/appError.js';
import { sendSuccess } from '../utils/responseHandler.js';
import { paginateQuery } from '../utils/pagination.js';
import { USER_ROLES } from '../models/user.model.js';
import {
   validateGpsPoint,
   checkGeofences,
   applyGeofenceHits,
} from '../services/geofence.service.js';

// ─── POST /locations ──────────────────────────────────────────────────────────

export const ingestLocation = async (req, res, next) => {
   try {
      const { assignmentId, lat, lng, accuracy, speed, altitude, heading, timestamp } = req.body;
      const serverTime = new Date();

      // ── Step 1: Load assignment with route centers ────────────────────────────
      const assignment = await Assignment
         .findOne({
            _id: assignmentId,
            employeeId: req.user.sub,
            companyId: req.user.companyId,
            status: { $in: [ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.IN_PROGRESS] },
         })
         .populate('routeId', 'centers')
         .lean(false);

      if (!assignment) {
         return next(new AppError(
            'Assignment not found, already completed, or does not belong to you.',
            404,
         ));
      }

      // ── Step 2: Validate GPS quality ──────────────────────────────────────────
      const { valid, reason } = validateGpsPoint({ lat, lng, accuracy });

      // ── Step 3: Fire-and-forget LocationLog insert ────────────────────────────
      // ✅ FIX: Cast all IDs to ObjectId so $match in aggregate works correctly
      LocationLog.create({
         employeeId: new mongoose.Types.ObjectId(req.user.sub),
         assignmentId: new mongoose.Types.ObjectId(assignmentId),
         companyId: new mongoose.Types.ObjectId(req.user.companyId),
         lat, lng, accuracy, speed, altitude, heading,
         timestamp: timestamp ? new Date(timestamp) : serverTime,
         serverTime,
         synced: true,
      }).catch((err) => {
         console.error(`[LocationLog] Insert failed for assignment ${assignmentId}:`, err.message);
      });

      // ── Step 4: Geofence check ────────────────────────────────────────────────
      if (!valid) {
         return sendSuccess(res, 200, 'Location received. Geofence skipped (low accuracy).', {
            geofenceHits: [],
            skippedReason: reason,
         });
      }

      const centers = assignment.routeId?.centers ?? [];
      const visitedIds = new Set(
         assignment.visitStatuses
            .filter((vs) => vs.status === VISIT_STATUS.VISITED)
            .map((vs) => String(vs.centerId)),
      );

      const hits = checkGeofences({ lat, lng }, centers, visitedIds);

      // ── Step 5: Apply hits if any ─────────────────────────────────────────────
      let updatedAssignment = null;
      if (hits.length > 0) {
         updatedAssignment = await applyGeofenceHits(assignment, hits, serverTime);
      }

      // ── Step 6: Respond ───────────────────────────────────────────────────────
      const progress = updatedAssignment
         ? updatedAssignment.getProgress()
         : null;

      return sendSuccess(res, 200, 'Location received.', {
         geofenceHits: hits.map((h) => ({
            centerId: h.centerId,
            centerName: h.centerName,
            distance: h.distance,
         })),
         progress,
      });
   } catch (error) {
      return next(error);
   }
};

// ─── POST /locations/batch ────────────────────────────────────────────────────

export const ingestBatch = async (req, res, next) => {
   try {
      const { assignmentId, points } = req.body;
      const serverTime = new Date();

      const assignment = await Assignment
         .findOne({
            _id: assignmentId,
            employeeId: req.user.sub,
            companyId: req.user.companyId,
            status: { $in: [ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.IN_PROGRESS, ASSIGNMENT_STATUS.COMPLETED] },
         })
         .populate('routeId', 'centers')
         .lean(false);

      if (!assignment) {
         return next(new AppError('Assignment not found or does not belong to you.', 404));
      }

      const sorted = [...points].sort(
         (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );

      // ✅ FIX: Cast IDs to ObjectId in batch insert too
      const logDocs = sorted.map((p) => ({
         employeeId: new mongoose.Types.ObjectId(req.user.sub),
         assignmentId: new mongoose.Types.ObjectId(assignmentId),
         companyId: new mongoose.Types.ObjectId(req.user.companyId),
         lat: p.lat,
         lng: p.lng,
         accuracy: p.accuracy ?? null,
         speed: p.speed ?? null,
         altitude: p.altitude ?? null,
         heading: p.heading ?? null,
         timestamp: new Date(p.timestamp),
         serverTime,
         synced: false,
      }));

      LocationLog.insertMany(logDocs, { ordered: false }).catch((err) => {
         console.error(`[LocationLog] Batch insert partial failure for assignment ${assignmentId}:`, err.message);
      });

      let totalHits = 0;
      let currentAssignment = assignment;

      for (const point of sorted) {
         const { valid } = validateGpsPoint(point);
         if (!valid) continue;

         const visitedIds = new Set(
            currentAssignment.visitStatuses
               .filter((vs) => vs.status === VISIT_STATUS.VISITED)
               .map((vs) => String(vs.centerId)),
         );

         const centers = currentAssignment.routeId?.centers ?? [];
         const hits = checkGeofences(point, centers, visitedIds);

         if (hits.length > 0) {
            const pointTime = new Date(point.timestamp);
            const updated = await applyGeofenceHits(currentAssignment, hits, pointTime);
            if (updated) {
               currentAssignment = updated;
               totalHits += hits.length;
            }
         }
      }

      return sendSuccess(res, 200, `Batch processed. ${totalHits} geofence hit(s) applied.`, {
         pointsReceived: points.length,
         geofenceHits: totalHits,
         progress: currentAssignment.getProgress?.() ?? null,
      });
   } catch (error) {
      return next(error);
   }
};

// ─── GET /locations ───────────────────────────────────────────────────────────

export const listLocations = async (req, res, next) => {
   try {
      const { assignmentId, hitsOnly } = req.query;

      if (!assignmentId) {
         return next(new AppError('assignmentId query parameter is required.', 400));
      }

      const assignmentFilter = { _id: assignmentId, companyId: req.user.companyId };
      if (req.user.role === USER_ROLES.EMPLOYEE) {
         assignmentFilter.employeeId = req.user.sub;
      }

      const assignmentExists = await Assignment.exists(assignmentFilter);
      if (!assignmentExists) {
         return next(new AppError('Assignment not found or you do not have access.', 404));
      }

      const filter = { assignmentId };
      if (hitsOnly === 'true') {
         filter.geofenceHit = { $ne: null };
      }

      const { data: locations, pagination } = await paginateQuery(
         LocationLog,
         filter,
         { ...req.query, limit: req.query.limit ?? 100 },
         {
            sort: { timestamp: 1 },
            lean: true,
            select: 'lat lng accuracy speed timestamp serverTime geofenceHit synced',
         },
      );

      return sendSuccess(res, 200, 'Locations retrieved successfully.', { locations, pagination });
   } catch (error) {
      return next(error);
   }
};

// ─── POST /assignments/:id/end ────────────────────────────────────────────────

export const endAssignment = async (req, res, next) => {
   try {
      const { id } = req.params;

      const assignment = await Assignment.findOne({
         _id: id,
         companyId: req.user.companyId,
      });

      if (!assignment) {
         return next(new AppError('Assignment not found.', 404));
      }

      if (assignment.status === ASSIGNMENT_STATUS.COMPLETED) {
         return sendSuccess(res, 200, 'Assignment was already completed.', {
            assignment,
            progress: assignment.getProgress(),
         });
      }

      const updateFields = {
         status: ASSIGNMENT_STATUS.COMPLETED,
         completedAt: new Date(),
      };

      assignment.visitStatuses.forEach((vs, idx) => {
         if (vs.status === VISIT_STATUS.PENDING) {
            updateFields[`visitStatuses.${idx}.status`] = VISIT_STATUS.SKIPPED;
         }
      });

      const updated = await Assignment.findByIdAndUpdate(
         id,
         { $set: updateFields },
         { new: true, runValidators: false },
      );

      return sendSuccess(res, 200, 'Assignment ended. Remaining centers marked as skipped.', {
         assignment: updated,
         progress: updated.getProgress(),
      });
   } catch (error) {
      return next(error);
   }
};

// ─── GET /locations/latest ────────────────────────────────────────────────────

/**
 * Returns the most recent GPS point per employee.
 * Joins User for employeeName and Assignment for status.
 * Used by the Live Map page to show current employee positions.
 */
export const listLatestLocations = async (req, res, next) => {
   try {
      const companyObjectId = new mongoose.Types.ObjectId(req.user.companyId);

      const locations = await LocationLog.aggregate([
         // 1. Match only this company's logs
         { $match: { companyId: companyObjectId } },

         // 2. Sort newest first (serverTime is trusted, not device timestamp)
         { $sort: { serverTime: -1 } },

         // 3. Keep only the latest point per employee
         {
            $group: {
               _id: '$employeeId',
               lat: { $first: '$lat' },
               lng: { $first: '$lng' },
               accuracy: { $first: '$accuracy' },
               speed: { $first: '$speed' },
               timestamp: { $first: '$timestamp' },
               serverTime: { $first: '$serverTime' },
               assignmentId: { $first: '$assignmentId' },
               employeeId: { $first: '$employeeId' },
            },
         },

         // 4. Join User collection → get employeeName + isActive
         {
            $lookup: {
               from: 'users',
               localField: 'employeeId',
               foreignField: '_id',
               as: 'user',
            },
         },

         // 5. Join Assignment collection → get assignment status
         {
            $lookup: {
               from: 'assignments',
               localField: 'assignmentId',
               foreignField: '_id',
               as: 'assignment',
            },
         },

         // 6. Shape final output — only what the frontend needs
         {
            $project: {
               _id: 0,
               employeeId: { $toString: '$employeeId' },
               assignmentId: { $toString: '$assignmentId' },
               lat: 1,
               lng: 1,
               accuracy: 1,
               speed: 1,
               timestamp: 1,
               serverTime: 1,
               // ✅ employeeName from joined user
               employeeName: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown'] },
               // ✅ isActive from joined user — drives online dot in sidebar
               isActive: { $ifNull: [{ $arrayElemAt: ['$user.isActive', 0] }, false] },
               // ✅ assignment status — optional, useful for future filtering
               assignmentStatus: { $ifNull: [{ $arrayElemAt: ['$assignment.status', 0] }, null] },
            },
         },
      ]);

      return sendSuccess(res, 200, 'Latest locations retrieved.', { locations });
   } catch (error) {
      return next(error);
   }
};
