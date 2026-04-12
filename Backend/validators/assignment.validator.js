/**
 * @file route-assignment.validator.js
 * @description Joi validation schemas for Route and Assignment endpoints.
 *
 * Schemas exported:
 *  - createRouteSchema       →  POST /routes
 *  - updateRouteSchema       →  PUT  /routes/:id
 *  - createAssignmentSchema  →  POST /assignments
 *  - updateCenterVisitSchema →  PATCH /assignments/:id/centers/:centerId
 *
 * @module validators/route-assignment
 */

import Joi from 'joi';
import { ASSIGNMENT_STATUS, VISIT_STATUS } from '../models/assignment.model.js';

// ─── Shared primitives ────────────────────────────────────────────────────────

const objectId = Joi.string()
   .pattern(/^[a-f\d]{24}$/i)
   .messages({ 'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId.' });

// ─── Center sub-schema ────────────────────────────────────────────────────────

const centerSchema = Joi.object({
   name: Joi.string().trim().min(2).max(150).required(),

   lat: Joi.number().min(-90).max(90).required()
      .messages({ 'number.min': 'Latitude must be ≥ -90.', 'number.max': 'Latitude must be ≤ 90.' }),

   lng: Joi.number().min(-180).max(180).required()
      .messages({ 'number.min': 'Longitude must be ≥ -180.', 'number.max': 'Longitude must be ≤ 180.' }),

   radius: Joi.number().min(50).max(5000).default(100),

   order: Joi.number().integer().min(1).required()
      .messages({ 'number.min': 'Center order must be at least 1.' }),

   address: Joi.string().trim().max(300).allow(null, '').default(null),
});

// ─── Route schemas ────────────────────────────────────────────────────────────

/**
 * POST /routes
 * Requires name + at least one center.
 */
export const createRouteSchema = Joi.object({
   name: Joi.string().trim().min(2).max(200).required(),

   managerId: objectId.optional(),

   centers: Joi.array()
      .items(centerSchema)
      .min(1).max(50)
      .required()
      .messages({
         'array.min': 'A route must have at least 1 center.',
         'array.max': 'A route cannot have more than 50 centers.',
      }),
}).options({ allowUnknown: false });

/**
 * PUT /routes/:id
 * All fields optional but at least one required.
 */
export const updateRouteSchema = Joi.object({
   name: Joi.string().trim().min(2).max(200).optional(),

   managerId: objectId.allow(null).optional(),

   isActive: Joi.boolean().optional(),

   centers: Joi.array()
      .items(centerSchema)
      .min(1).max(50)
      .optional()
      .messages({
         'array.min': 'A route must have at least 1 center.',
      }),
})
   .options({ allowUnknown: false })
   .min(1)
   .messages({ 'object.min': 'At least one field must be provided for update.' });

// ─── Assignment schemas ───────────────────────────────────────────────────────

/**
 * POST /assignments
 */
export const createAssignmentSchema = Joi.object({
   employeeId: objectId.required(),
   routeId: objectId.required(),

   date: Joi.date().iso().required()
      .messages({ 'date.base': 'Date must be a valid ISO date string (e.g. 2024-01-15).' }),
}).options({ allowUnknown: false });

/**
 * PATCH /assignments/:id/centers/:centerId
 */
export const updateCenterVisitSchema = Joi.object({
   status: Joi.string()
      .valid(...Object.values(VISIT_STATUS))
      .required()
      .messages({
         'any.only': `Visit status must be one of: ${Object.values(VISIT_STATUS).join(', ')}.`,
      }),

   note: Joi.string().trim().max(500).allow(null, '').optional(),
}).options({ allowUnknown: false });
