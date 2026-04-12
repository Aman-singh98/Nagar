/**
 * @file location.routes.js
 * @description Express routers for GPS location and assignment-end endpoints.
 *
 * Two routers — mounted separately in server.js:
 *  locationRouter    → /api/v1/locations
 *  assignmentEndRouter → /api/v1/assignments  (adds the /end endpoint)
 *
 * Route table:
 * ┌──────────────────────────────────────┬──────────────────────────────┐
 * │ Route                                │ Roles                        │
 * ├──────────────────────────────────────┼──────────────────────────────┤
 * │ POST /locations                      │ employee                     │
 * │ POST /locations/batch                │ employee                     │
 * │ GET  /locations?assignmentId=        │ admin, manager, employee     │
 * │ POST /assignments/:id/end            │ admin, manager               │
 * └──────────────────────────────────────┴──────────────────────────────┘
 *
 * @module routes/location
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { USER_ROLES } from '../models/user.model.js';

import {
   ingestLocation,
   ingestBatch,
   listLocations,
   endAssignment,
   listLatestLocations
} from '../controllers/location.controller.js';

import {
   ingestLocationSchema,
   ingestBatchSchema,
} from '../validators/location.validator.js';

// ─── Location Router ──────────────────────────────────────────────────────────

export const locationRouter = Router();

locationRouter.use(verifyToken);

locationRouter
   .route('/latest')
   .get(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE), listLatestLocations);

/**
 * All location routes are prefixed with /api/v1/locations:
 *  POST /api/v1/locations          → ingest single GPS point (employee only)
 *  POST /api/v1/locations/batch    → ingest offline GPS batch (employee only)
 *  GET  /api/v1/locations          → breadcrumb trail for an assignment
 */
locationRouter
   .route('/')
   .get(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE), listLocations)
   .post(requireRoles(USER_ROLES.EMPLOYEE), validateBody(ingestLocationSchema), ingestLocation);

locationRouter
   .route('/batch')
   .post(requireRoles(USER_ROLES.EMPLOYEE), validateBody(ingestBatchSchema), ingestBatch);

// ─── Assignment End Router ────────────────────────────────────────────────────

export const assignmentEndRouter = Router();

assignmentEndRouter.use(verifyToken);

/**
 * POST /api/v1/assignments/:id/end
 *   → mark assignment completed, set pending centers to skipped.
 */
assignmentEndRouter
   .route('/:id/end')
   .post(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), endAssignment);
