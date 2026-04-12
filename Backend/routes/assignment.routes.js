/**
 * @file route.routes.js
 * @description Express routers for Route and Assignment endpoints.
 *
 * Two routers are exported:
 *  - routeRouter      → mounted at /api/v1/routes
 *  - assignmentRouter → mounted at /api/v1/assignments
 *
 * Middleware stack per request:
 *   verifyToken → requireRoles → [validateBody] → controller
 *
 * Route table:
 * ┌────────────────────────────────────────────┬───────────────────┐
 * │ Route                                      │ Roles             │
 * ├────────────────────────────────────────────┼───────────────────┤
 * │ GET    /routes                             │ admin, manager    │
 * │ POST   /routes                             │ admin, manager    │
 * │ GET    /routes/:id                         │ admin, manager    │
 * │ PUT    /routes/:id                         │ admin, manager    │
 * │ DELETE /routes/:id                         │ admin             │
 * │ POST   /assignments                        │ admin, manager    │
 * │ GET    /assignments                        │ admin, manager,   │
 * │                                            │ employee          │
 * │ GET    /assignments/:id                    │ admin, manager,   │
 * │                                            │ employee          │
 * │ PATCH  /assignments/:id/centers/:centerId  │ admin, manager,   │
 * │                                            │ employee          │
 * └────────────────────────────────────────────┴───────────────────┘
 *
 * @module routes/route-assignment
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { USER_ROLES } from '../models/user.model.js';
import {
   listRoutes,
   createRoute,
   getRoute,
   updateRoute,
   deleteRoute
} from '../controllers/route.controller.js';
import {
   createAssignment,
   listAssignments,
   getAssignment,
   updateCenterVisit
} from '../controllers/assignment.controller.js';
import {
   createRouteSchema,
   updateRouteSchema,
   createAssignmentSchema,
   updateCenterVisitSchema
} from '../validators/assignment.validator.js'

// ─── Route Router ─────────────────────────────────────────────────────────────

export const routeRouter = Router();

routeRouter.use(verifyToken);

routeRouter
   .route('/')
   .get(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), listRoutes)
   .post(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), validateBody(createRouteSchema), createRoute);

routeRouter
   .route('/:id')
   .get(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), getRoute)
   .put(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), validateBody(updateRouteSchema), updateRoute)
   .delete(requireRoles(USER_ROLES.ADMIN), deleteRoute);

// ─── Assignment Router ────────────────────────────────────────────────────────

export const assignmentRouter = Router();

assignmentRouter.use(verifyToken);

assignmentRouter
   .route('/')
   .get(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE), listAssignments)
   .post(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), validateBody(createAssignmentSchema), createAssignment);

assignmentRouter
   .route('/:id')
   .get(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE), getAssignment);

assignmentRouter
   .route('/:id/centers/:centerId')
   .patch(
      requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE),
      validateBody(updateCenterVisitSchema),
      updateCenterVisit,
   );
