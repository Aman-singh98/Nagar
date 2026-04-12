/**
 * @file employee.routes.js
 * @description Express router for all employee management endpoints.
 *
 * Middleware stack per request (left → right):
 *   verifyToken → requireRoles → controller handler
 *
 * All routes require a valid JWT (verifyToken populates req.user).
 * Role requirements are enforced per-route by requireRoles.
 *
 * Route table:
 * ┌───────────────────────────────────────┬───────────────────────────────┐
 * │ Route                                 │ Allowed roles                 │
 * ├───────────────────────────────────────┼───────────────────────────────┤
 * │ GET    /employees                     │ admin, manager                │
 * │ POST   /employees                     │ admin, manager                │
 * │ GET    /employees/:id                 │ admin, manager                │
 * │ PUT    /employees/:id                 │ admin, manager                │
 * │ PATCH  /employees/:id/deactivate      │ admin, manager                │
 * │ GET    /managers                      │ admin                         │
 * └───────────────────────────────────────┴───────────────────────────────┘
 *
 * @module employee.routes
 */

import { Router } from 'express';
import {
   listEmployees,
   createEmployee,
   getEmployee,
   updateEmployee,
   deactivateEmployee,
   listManagers
} from '../controllers/employee.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../validators/employee.validator.js';
import { USER_ROLES } from '../models/user.model.js';

const router = Router();

// ─── All routes below require a valid JWT ─────────────────────────────────────
router.use(verifyToken);

// ─── Manager List (admin only) ────────────────────────────────────────────────
router.get('/managers', requireRoles(USER_ROLES.ADMIN), listManagers);

// ─── Employee CRUD ────────────────────────────────────────────────────────────
router
   // .route('/employees')
   .route('/')
   .get(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), listEmployees)
   .post(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), validateBody(createEmployeeSchema), createEmployee);

router
   // .route('/employees/:id')
   .route('/:id')
   .get(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), getEmployee)
   .put(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), validateBody(updateEmployeeSchema), updateEmployee);

router.patch(
   // '/employees/:id/deactivate',
   '/:id/deactivate',
   requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
   deactivateEmployee,
);

export default router;
