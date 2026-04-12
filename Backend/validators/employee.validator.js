// /**
//  * @file employee.routes.js
//  * @description Express router for all employee management endpoints.
//  *
//  * Middleware stack per request (left → right):
//  *   verifyToken → requireRoles → controller handler
//  *
//  * All routes require a valid JWT (verifyToken populates req.user).
//  * Role requirements are enforced per-route by requireRoles.
//  *
//  * Route table:
//  * ┌───────────────────────────────────────┬───────────────────────────────┐
//  * │ Route                                 │ Allowed roles                 │
//  * ├───────────────────────────────────────┼───────────────────────────────┤
//  * │ GET    /employees                     │ admin, manager                │
//  * │ POST   /employees                     │ admin, manager                │
//  * │ GET    /employees/:id                 │ admin, manager                │
//  * │ PUT    /employees/:id                 │ admin, manager                │
//  * │ PATCH  /employees/:id/deactivate      │ admin, manager                │
//  * │ GET    /managers                      │ admin                         │
//  * └───────────────────────────────────────┴───────────────────────────────┘
//  *
//  * @module employee.routes
//  */

// import { Router } from 'express';
// import {
//    listEmployees,
//    createEmployee,
//    getEmployee,
//    updateEmployee,
//    deactivateEmployee,
//    listManagers
// } from '../controllers/employee.controller.js';
// import { verifyToken } from '../middleware/auth.middleware.js';
// import { requireRoles } from '../middleware/rbac.middleware.js';
// import { validateBody } from '../middleware/validate.middleware.js';
// // import { createEmployeeSchema, updateEmployeeSchema } from '../validators/employee.validator.js';
// import { USER_ROLES } from '../models/user.model.js';

// const router = Router();

// // ─── All routes below require a valid JWT ─────────────────────────────────────
// router.use(verifyToken);

// // ─── Manager List (admin only) ────────────────────────────────────────────────
// router.get(
//    '/managers',
//    requireRoles(USER_ROLES.ADMIN),
//    listManagers,
// );

// // ─── Employee CRUD ────────────────────────────────────────────────────────────
// router
//    .route('/employees')
//    .get(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), listEmployees)
//    .post(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), validateBody(createEmployeeSchema), createEmployee);

// router
//    .route('/employees/:id')
//    .get(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), getEmployee)
//    .put(requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER), validateBody(updateEmployeeSchema), updateEmployee);

// router.patch(
//    '/employees/:id/deactivate',
//    requireRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
//    deactivateEmployee,
// );

// export default router;


/**
 * @file employee.validator.js
 * @description Joi validation schemas for Employee endpoints.
 *
 * Schemas exported:
 *  - createEmployeeSchema  →  POST /employees
 *  - updateEmployeeSchema  →  PUT  /employees/:id
 *
 * @module validators/employee
 */

import Joi from 'joi';
import { USER_ROLES } from '../models/user.model.js';

// ─── Shared primitives ────────────────────────────────────────────────────────

const objectId = Joi.string()
   .pattern(/^[a-f\d]{24}$/i)
   .messages({ 'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId.' });

// ─── Employee schemas ─────────────────────────────────────────────────────────

/**
 * POST /employees
 * Requires name, email, password, role.
 * managerId is optional — only relevant when role === 'employee'.
 */
export const createEmployeeSchema = Joi.object({
   name: Joi.string().trim().min(2).max(100).required()
      .messages({
         'string.min': 'Name must be at least 2 characters.',
         'string.max': 'Name cannot exceed 100 characters.',
         'any.required': 'Name is required.',
      }),

   email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required()
      .messages({
         'string.email': 'Please provide a valid email address.',
         'any.required': 'Email is required.',
      }),

   password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/[A-Z]/, 'uppercase letter')
      .pattern(/[a-z]/, 'lowercase letter')
      .pattern(/[0-9]/, 'digit')
      .required()
      .messages({
         'string.min': 'Password must be at least 8 characters.',
         'string.pattern.name': 'Password must contain at least one {#name}.',
         'any.required': 'Password is required.',
      }),

   role: Joi.string()
      .valid(...Object.values(USER_ROLES))
      .default(USER_ROLES.EMPLOYEE)
      .messages({
         'any.only': `Role must be one of: ${Object.values(USER_ROLES).join(', ')}.`,
      }),

   managerId: objectId.allow(null, '').optional()
      .messages({ 'string.pattern.base': 'managerId must be a valid MongoDB ObjectId.' }),

}).options({ allowUnknown: false });

/**
 * PUT /employees/:id
 * All fields optional but at least one must be provided.
 * Password cannot be changed via this endpoint (use a dedicated change-password route).
 */
export const updateEmployeeSchema = Joi.object({
   name: Joi.string().trim().min(2).max(100).optional()
      .messages({
         'string.min': 'Name must be at least 2 characters.',
         'string.max': 'Name cannot exceed 100 characters.',
      }),

   email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).optional()
      .messages({
         'string.email': 'Please provide a valid email address.',
      }),

   role: Joi.string()
      .valid(...Object.values(USER_ROLES))
      .optional()
      .messages({
         'any.only': `Role must be one of: ${Object.values(USER_ROLES).join(', ')}.`,
      }),

   managerId: objectId.allow(null, '').optional()
      .messages({ 'string.pattern.base': 'managerId must be a valid MongoDB ObjectId.' }),

   isActive: Joi.boolean().optional(),

})
   .options({ allowUnknown: false })
   .min(1)
   .messages({ 'object.min': 'At least one field must be provided for update.' });
   