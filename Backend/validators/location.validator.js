/**
 * @file location.validator.js
 * @description Joi validation schemas for location ingestion endpoints.
 *
 * @module validators/location
 */

import Joi from 'joi';

const objectId = Joi.string()
   .pattern(/^[a-f\d]{24}$/i)
   .messages({ 'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId.' });

const latField = Joi.number().min(-90).max(90).required()
   .messages({ 'number.min': 'Latitude must be ≥ -90.', 'number.max': 'Latitude must be ≤ 90.' });

const lngField = Joi.number().min(-180).max(180).required()
   .messages({ 'number.min': 'Longitude must be ≥ -180.', 'number.max': 'Longitude must be ≤ 180.' });

// ─── Single point schema ──────────────────────────────────────────────────────

/**
 * POST /locations
 * Required: assignmentId, lat, lng, timestamp.
 * Optional: accuracy, speed, altitude, heading.
 */
export const ingestLocationSchema = Joi.object({
   assignmentId: objectId.required(),

   lat: latField,
   lng: lngField,

   /** GPS horizontal accuracy in metres. */
   accuracy: Joi.number().min(0).max(10000).allow(null).optional(),

   /** Speed in metres/second. */
   speed: Joi.number().min(0).max(200).allow(null).optional(),

   /** Altitude in metres. */
   altitude: Joi.number().allow(null).optional(),

   /** Compass heading 0–360. */
   heading: Joi.number().min(0).max(360).allow(null).optional(),

   /**
    * Device-side capture time as ISO string.
    * If omitted, server time is used.
    */
   timestamp: Joi.date().iso().optional(),
}).options({ allowUnknown: false });

// ─── Batch schema ─────────────────────────────────────────────────────────────

const batchPointSchema = Joi.object({
   lat: latField,
   lng: lngField,
   accuracy: Joi.number().min(0).max(10000).allow(null).optional(),
   speed: Joi.number().min(0).max(200).allow(null).optional(),
   altitude: Joi.number().allow(null).optional(),
   heading: Joi.number().min(0).max(360).allow(null).optional(),
   timestamp: Joi.date().iso().required()
      .messages({ 'date.base': 'Each point must have a valid ISO timestamp.' }),
});

/**
 * POST /locations/batch
 * Max 500 points per batch (~40 minutes of 5-second pings).
 */
export const ingestBatchSchema = Joi.object({
   assignmentId: objectId.required(),

   points: Joi.array()
      .items(batchPointSchema)
      .min(1)
      .max(500)
      .required()
      .messages({
         'array.min': 'Batch must contain at least 1 point.',
         'array.max': 'Batch cannot exceed 500 points. Split into smaller batches.',
      }),
}).options({ allowUnknown: false });
