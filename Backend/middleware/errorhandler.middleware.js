/**
 * @file errorHandler.middleware.js
 * @description Centralised Express error handling middleware.
 *
 * This is the ONLY place where errors are converted to HTTP responses.
 * Every controller and middleware calls `next(error)` to reach here.
 *
 * Error classification:
 *
 *  Operational errors (AppError instances with isOperational: true)
 *  ─────────────────────────────────────────────────────────────────
 *  These are expected failures: invalid input, not found, unauthorized, etc.
 *  They are sent directly to the client with their statusCode and message.
 *
 *  Mongoose / MongoDB errors
 *  ─────────────────────────
 *  CastError          → 400 (invalid ObjectId in URL param)
 *  ValidationError    → 422 (schema validation failed on save)
 *  Duplicate key (11000) → 409 (unique index violation)
 *
 *  JWT errors
 *  ──────────
 *  JsonWebTokenError  → 401
 *  TokenExpiredError  → 401
 *
 *  Unknown / programmer errors
 *  ───────────────────────────
 *  Everything else is a 500. In development the full stack trace is returned
 *  so developers can debug. In production only a generic message is sent to
 *  avoid leaking implementation details.
 *
 * Response envelope (always consistent):
 * ```json
 * {
 *   "success": false,
 *   "statusCode": 422,
 *   "message": "Validation failed.",
 *   "errors": { "email": "Please provide a valid email address" },
 *   "stack": "..." // development only
 * }
 * ```
 *
 * Future scope:
 *  - Integrate with an error-tracking service (Sentry, Datadog) by calling
 *    their SDK inside `handleUnknownError` before sending the response.
 *  - Add `requestId` to all error responses once request-ID middleware is in place.
 *
 * @module middleware/errorHandler
 */

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Global error-handling middleware. Must be registered LAST in the Express
 * middleware stack (after all routes).
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
   // ── Step 1: Normalise to a known shape ──────────────────────────────────
   const appError = normaliseError(err);

   // ── Step 2: Log ─────────────────────────────────────────────────────────
   logError(appError, req);

   // ── Step 3: Respond ─────────────────────────────────────────────────────
   const isDev = process.env.NODE_ENV === 'development';

   const body = {
      success: false,
      statusCode: appError.statusCode,
      message: appError.message,
   };

   if (appError.errors) {
      body.errors = appError.errors; // field-level validation details
   }

   if (isDev) {
      body.stack = appError.stack; // full trace in development only
   }

   return res.status(appError.statusCode).json(body);
};

export default errorHandler;

// ─── Error Normalisation ──────────────────────────────────────────────────────

/**
 * Converts any thrown value into an AppError-like object with at minimum:
 *  { statusCode, message, isOperational, stack }
 *
 * @param {Error} err
 * @returns {{ statusCode: number, message: string, isOperational: boolean, errors?: object, stack: string }}
 */
function normaliseError(err) {
   // Already an AppError — pass through unchanged
   if (err.isOperational) return err;

   // ── Mongoose: invalid ObjectId in URL params ────────────────────────────
   if (err.name === 'CastError') {
      return toAppError(`Invalid value for field "${err.path}": ${err.value}.`, 400, err.stack);
   }

   // ── Mongoose: schema validation failed ─────────────────────────────────
   if (err.name === 'ValidationError') {
      const errors = extractMongooseValidationErrors(err);
      const base = toAppError('Validation failed. Please check the highlighted fields.', 422, err.stack);
      base.errors = errors;
      return base;
   }

   // ── MongoDB: unique index violation ─────────────────────────────────────
   if (err.code === 11000) {
      const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
      return toAppError(
         `A record with this ${field} already exists.`,
         409,
         err.stack,
      );
   }

   // ── JWT: malformed token ─────────────────────────────────────────────────
   if (err.name === 'JsonWebTokenError') {
      return toAppError('Invalid authentication token. Please log in again.', 401, err.stack);
   }

   // ── JWT: expired token ───────────────────────────────────────────────────
   if (err.name === 'TokenExpiredError') {
      return toAppError('Your session has expired. Please log in again.', 401, err.stack);
   }

   // ── Unknown / programmer error ───────────────────────────────────────────
   return toAppError(
      process.env.NODE_ENV === 'production'
         ? 'An unexpected error occurred. Please try again later.'
         : err.message,
      500,
      err.stack,
   );
}

// ─── Logging ──────────────────────────────────────────────────────────────────

/**
 * Logs the error with context. In production this should be replaced (or
 * augmented) with a structured logger (e.g. Winston, Pino) and an
 * error-tracking service (e.g. Sentry).
 *
 * @param {{ statusCode: number, message: string, stack: string }} err
 * @param {import('express').Request} req
 */
function logError(err, req) {
   const level = err.statusCode >= 500 ? '❌  ERROR' : '⚠️   WARN';
   console.error(
      `[${new Date().toISOString()}] ${level}  ${req.method} ${req.originalUrl}` +
      `  →  ${err.statusCode} ${err.message}`,
   );

   // Only print the stack for programmer errors (5xx)
   if (err.statusCode >= 500) {
      console.error(err.stack);
   }
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Creates a plain error-like object consistent with AppError's shape.
 *
 * @param {string} message
 * @param {number} statusCode
 * @param {string} [stack]
 * @returns {{ message: string, statusCode: number, isOperational: boolean, stack: string }}
 */
function toAppError(message, statusCode, stack = '') {
   return { message, statusCode, isOperational: true, stack };
}

/**
 * Extracts field-level validation messages from a Mongoose ValidationError.
 *
 * @param {import('mongoose').Error.ValidationError} err
 * @returns {Record<string, string>}
 */
function extractMongooseValidationErrors(err) {
   return Object.fromEntries(
      Object.entries(err.errors).map(([field, validatorError]) => [
         field,
         validatorError.message,
      ]),
   );
}
