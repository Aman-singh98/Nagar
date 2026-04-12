/**
 * @file appError.js
 * @description Custom operational error class.
 *
 * Distinguishes between:
 *  - Operational errors  (AppError): expected, user-facing, safe to expose in responses.
 *  - Programming errors  (any other Error): unexpected bugs — details must NOT leak to clients.
 *
 * The global error handler in server.js uses `isOperational` to decide
 * whether to send the real message or a generic 500 fallback.
 *
 * @example
 *   throw new AppError('Email already in use.', 409);
 */

class AppError extends Error {
   /**
    * @param {string} message    - Human-readable message (sent directly to the client).
    * @param {number} statusCode - HTTP status code (4xx client error / 5xx server error).
    */
   constructor(message, statusCode) {
      super(message);

      this.statusCode = statusCode;
      this.status = statusCode >= 400 && statusCode < 500 ? 'error' : 'fail';
      this.isOperational = true;

      Error.captureStackTrace(this, this.constructor);
   }
}

export default AppError;
