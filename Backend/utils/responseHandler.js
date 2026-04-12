/**
 * @file responseHandler.js
 * @description Standardised JSON response helpers.
 *
 * Every API response follows the same shape so the frontend
 * has a predictable contract:
 *
 *   { status: 'success' | 'error', message: string, ...data }
 */

/**
 * Sends a standardised success JSON response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode  - HTTP status code (200, 201, etc.)
 * @param {string} message     - Human-readable success message.
 * @param {object} [data={}]   - Optional payload to merge into the response body.
 */
export const sendSuccess = (res, statusCode, message, data = {}) => {
   res.status(statusCode).json({
      status: 'success',
      message,
      ...data,
   });
};

/**
 * Sends a standardised error JSON response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode  - HTTP status code.
 * @param {string} message     - Error description.
 * @param {Array}  [errors=[]] - Optional field-level validation errors.
 */
export const sendError = (res, statusCode, message, errors = []) => {
   const body = { status: 'error', message };
   if (errors.length > 0) body.errors = errors;
   res.status(statusCode).json(body);
};
