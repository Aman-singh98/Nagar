// /**
//  * @file validate.middleware.js
//  * @description Lightweight request body validation middleware.
//  *
//  * Validates req.body fields for each auth route and responds with
//  * a structured 422 error listing every failing field before the
//  * controller runs — keeping controllers clean of validation logic.
//  *
//  * NOTE: No extra dependency needed — built with plain JS so it works
//  * with your existing package.json out of the box.
//  *
//  * Usage (in routes):
//  *   router.post('/register', validateRegister, handleRegister);
//  *   router.post('/login',    validateLogin,    handleLogin);
//  */

// import mongoose from 'mongoose';
// import { sendError } from '../utils/responseHandler.js';

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// /** Tests a string against a basic email pattern */
// const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// /** Tests password strength: min 8 chars, 1 uppercase, 1 lowercase, 1 digit */
// const isStrongPassword = (value) =>
//    value.length >= 8 &&
//    /[A-Z]/.test(value) &&
//    /[a-z]/.test(value) &&
//    /\d/.test(value);

// /** Tests that a string is a valid MongoDB ObjectId */
// const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// /**
//  * Runs a list of validation rules against the request body.
//  * Returns an array of { field, message } error objects.
//  *
//  * @param {object} body   - req.body
//  * @param {Array}  rules  - Array of { field, test, message } objects
//  * @returns {{ field: string, message: string }[]}
//  */
// const runValidations = (body, rules) =>
//    rules.reduce((errors, { field, test, message }) => {
//       if (!test(body[field], body)) errors.push({ field, message });
//       return errors;
//    }, []);

// // ─── Validation Rule Sets ─────────────────────────────────────────────────────

// const ALLOWED_ROLES = ['admin', 'manager', 'employee'];

// /**
//  * Validates the request body for POST /auth/register.
//  *
//  * Required : name, email, password, companyId
//  * Optional : role (defaults to 'employee' in the model)
//  *
//  * @type {import('express').RequestHandler}
//  */
// export const validateRegister = (req, res, next) => {
//    const { name, email, password, role, companyId } = req.body;

//    const rules = [
//       {
//          field: 'name',
//          test: (v) => typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 100,
//          message: 'Name is required and must be 2–100 characters.',
//       },
//       {
//          field: 'email',
//          test: (v) => typeof v === 'string' && isValidEmail(v.trim()),
//          message: 'A valid email address is required.',
//       },
//       {
//          field: 'password',
//          test: (v) => typeof v === 'string' && isStrongPassword(v),
//          message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.',
//       },
//       {
//          field: 'companyId',
//          test: (v) => typeof v === 'string' && isValidObjectId(v),
//          message: 'A valid company ID (MongoDB ObjectId) is required.',
//       }
//    ];

//    // Role is optional — only validate if provided
//    if (role !== undefined) {
//       rules.push({
//          field: 'role',
//          test: (v) => ALLOWED_ROLES.includes(v),
//          message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}.`,
//       });
//    }

//    const errors = runValidations(req.body, rules);
//    if (errors.length > 0) {
//       return sendError(res, 422, 'Validation failed. Please check your input.', errors);
//    }

//    return next();
// };

// /**
//  * Validates the request body for POST /auth/login.
//  *
//  * Required : email, password
//  *
//  * @type {import('express').RequestHandler}
//  */
// export const validateLogin = (req, res, next) => {
//    const rules = [
//       {
//          field: 'email',
//          test: (v) => typeof v === 'string' && isValidEmail(v.trim()),
//          message: 'A valid email address is required.',
//       },
//       {
//          field: 'password',
//          test: (v) => typeof v === 'string' && v.length > 0,
//          message: 'Password is required.',
//       }
//    ];

//    const errors = runValidations(req.body, rules);
//    if (errors.length > 0) {
//       return sendError(res, 422, 'Validation failed. Please check your input.', errors);
//    }

//    return next();
// };

// /**
//  * Validates the request body for POST /auth/refresh.
//  *
//  * Required : userId (sent by client to look up the hashed refresh token)
//  *
//  * @type {import('express').RequestHandler}
//  */
// export const validateRefresh = (req, res, next) => {
//    const rules = [
//       {
//          field: 'userId',
//          test: (v) => typeof v === 'string' && isValidObjectId(v),
//          message: 'A valid user ID (MongoDB ObjectId) is required.',
//       },
//    ];

//    const errors = runValidations(req.body, rules);
//    if (errors.length > 0) {
//       return sendError(res, 422, 'Validation failed. Please check your input.', errors);
//    }

//    return next();
// };

/**
 * @file validate.middleware.js
 * @description Centralised request validation middleware for all routes.
 *
 * Two validation strategies live here side-by-side:
 *
 *  1. Named validators (auth routes)
 *     Hand-rolled plain-JS validators for auth endpoints. No extra dependency —
 *     works with your existing package.json out of the box.
 *
 *       validateRegister  →  POST /auth/register
 *       validateLogin     →  POST /auth/login
 *       validateRefresh   →  POST /auth/refresh
 *
 *  2. Generic Joi factory (employee + all future routes)
 *     `validateBody(schema)` accepts any Joi schema and returns a middleware.
 *     Reuses the same sendError helper so the error envelope is identical
 *     across both strategies.
 *
 *       validateBody(createEmployeeSchema)  →  POST /employees
 *       validateBody(updateEmployeeSchema)  →  PUT  /employees/:id
 *
 * Error response shape (always consistent — 422):
 * ```json
 * {
 *   "success": false,
 *   "statusCode": 422,
 *   "message": "Validation failed. Please check your input.",
 *   "errors": [
 *     { "field": "email", "message": "A valid email address is required." }
 *   ]
 * }
 * ```
 *
 * Future scope:
 *  - validateQuery(schema)  → validate req.query (pagination, filters)
 *  - validateParams(schema) → validate req.params (ObjectId format)
 *  - combine into validate({ body, query, params }) single factory
 *
 * @module middleware/validate
 */

import mongoose from 'mongoose';
import { sendError } from '../utils/responseHandler.js';

// ─── Shared Plain-JS Helpers ──────────────────────────────────────────────────

/** Tests a string against a basic email pattern. */
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Tests password strength:
 * min 8 chars, 1 uppercase, 1 lowercase, 1 digit.
 */
const isStrongPassword = (value) =>
   value.length >= 8 &&
   /[A-Z]/.test(value) &&
   /[a-z]/.test(value) &&
   /\d/.test(value);

/** Tests that a string is a valid MongoDB ObjectId. */
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * Runs a list of validation rules against the request body.
 * Returns an array of { field, message } error objects for every failing rule.
 *
 * @param {object} body  - req.body
 * @param {Array}  rules - Array of { field, test, message } descriptors
 * @returns {{ field: string, message: string }[]}
 */
const runValidations = (body, rules) =>
   rules.reduce((errors, { field, test, message }) => {
      if (!test(body[field], body)) errors.push({ field, message });
      return errors;
   }, []);

// ─── Allowed Values ───────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['admin', 'manager', 'employee'];

// ─── Auth Validators ──────────────────────────────────────────────────────────

/**
 * Validates the request body for POST /auth/register.
 *
 * Required : name, email, password, companyId
 * Optional : role (defaults to 'employee' in the model)
 *
 * @type {import('express').RequestHandler}
 */
export const validateRegister = (req, res, next) => {
   const { role } = req.body;

   const rules = [
      {
         field: 'name',
         test: (v) => typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 100,
         message: 'Name is required and must be 2–100 characters.',
      },
      {
         field: 'email',
         test: (v) => typeof v === 'string' && isValidEmail(v.trim()),
         message: 'A valid email address is required.',
      },
      {
         field: 'password',
         test: (v) => typeof v === 'string' && isStrongPassword(v),
         message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.',
      },
      {
         field: 'companyId',
         test: (v) => typeof v === 'string' && isValidObjectId(v),
         message: 'A valid company ID (MongoDB ObjectId) is required.',
      },
   ];

   // Role is optional — only validate if explicitly provided
   if (role !== undefined) {
      rules.push({
         field: 'role',
         test: (v) => ALLOWED_ROLES.includes(v),
         message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}.`,
      });
   }

   const errors = runValidations(req.body, rules);
   if (errors.length > 0) {
      return sendError(res, 422, 'Validation failed. Please check your input.', errors);
   }

   return next();
};

/**
 * Validates the request body for POST /auth/login.
 *
 * Required : email, password
 *
 * @type {import('express').RequestHandler}
 */
export const validateLogin = (req, res, next) => {
   const rules = [
      {
         field: 'email',
         test: (v) => typeof v === 'string' && isValidEmail(v.trim()),
         message: 'A valid email address is required.',
      },
      {
         field: 'password',
         test: (v) => typeof v === 'string' && v.length > 0,
         message: 'Password is required.',
      },
   ];

   const errors = runValidations(req.body, rules);
   if (errors.length > 0) {
      return sendError(res, 422, 'Validation failed. Please check your input.', errors);
   }

   return next();
};

/**
 * Validates the request body for POST /auth/refresh.
 *
 * Required : userId (sent by the client to look up the hashed refresh token)
 *
 * @type {import('express').RequestHandler}
 */
export const validateRefresh = (req, res, next) => {
   const rules = [
      {
         field: 'userId',
         test: (v) => typeof v === 'string' && isValidObjectId(v),
         message: 'A valid user ID (MongoDB ObjectId) is required.',
      },
   ];

   const errors = runValidations(req.body, rules);
   if (errors.length > 0) {
      return sendError(res, 422, 'Validation failed. Please check your input.', errors);
   }

   return next();
};

// ─── Generic Joi Factory ──────────────────────────────────────────────────────

/**
 * Middleware factory that validates req.body against any Joi schema.
 *
 * On success  : replaces req.body with the Joi-coerced + stripped value
 *               so controllers always receive clean, typed data.
 * On failure  : responds 422 with the same { field, message }[] error shape
 *               as the named auth validators above — consistent across the API.
 *
 * Used by employee routes (and any future routes that use Joi schemas):
 *   router.post('/employees', validateBody(createEmployeeSchema), createEmployee);
 *   router.put('/employees/:id', validateBody(updateEmployeeSchema), updateEmployee);
 *
 * @param  {import('joi').Schema} schema - Joi schema to validate against.
 * @returns {import('express').RequestHandler}
 */
export const validateBody = (schema) => (req, res, next) => {
   const { error, value } = schema.validate(req.body, {
      abortEarly: false, // collect ALL errors, not just the first
      stripUnknown: true,  // silently drop fields not in the schema
   });

   if (error) {
      const errors = error.details.map((detail) => ({
         field: detail.path.join('.'), // supports nested paths e.g. "address.city"
         message: detail.message.replace(/['"]/g, ''), // strip Joi's decorative quotes
      }));
      return sendError(res, 422, 'Validation failed. Please check your input.', errors);
   }

   // Replace req.body with validated + coerced value (defaults applied, types cast)
   req.body = value;
   return next();
};
