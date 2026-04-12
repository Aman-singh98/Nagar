/**
 * @file auth.middleware.js
 * @description Express middleware for JWT verification and role-based access control.
 *
 * Exports:
 *  - verifyToken   : Validates the Bearer JWT from the Authorization header.
 *                    Attaches decoded payload to req.user on success.
 *  - requireRole   : Middleware factory — restricts routes to specified roles.
 *                    Must be used AFTER verifyToken.
 *
 * Usage:
 *  router.get('/admin', verifyToken, requireRole('admin'), handler);
 *  router.get('/reports', verifyToken, requireRole('admin', 'manager'), handler);
 */

import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { sendError } from '../utils/responseHandler.js';

// ─── verifyToken ──────────────────────────────────────────────────────────────

/**
 * Validates the JWT Bearer token sent in the Authorization header.
 *
 * On success : Decodes payload, confirms user still exists and is active,
 *              and attaches decoded payload to req.user.
 * On failure : Responds immediately with 401 — does NOT call next().
 *
 * req.user shape after success:
 *   { sub: string, email: string, role: string, companyId: string, iat, exp }
 *
 * @type {import('express').RequestHandler}
 */
export const verifyToken = async (req, res, next) => {
   try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return sendError(res, 401, 'Authentication token missing. Please log in.');
      }

      const token = authHeader.split(' ')[1];

      // Verify signature + expiry
      let decoded;
      try {
         decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
      } catch (jwtError) {
         const message =
            jwtError.name === 'TokenExpiredError'
               ? 'Session expired. Please log in again.'
               : 'Invalid authentication token.';
         return sendError(res, 401, message);
      }

      // Guard against deleted or suspended accounts even if the token is still valid
      const user = await User.findById(decoded.sub).select('isActive');
      if (!user || !user.isActive) {
         return sendError(res, 401, 'Account not found or has been deactivated.');
      }

      req.user = decoded; // { sub, email, role, companyId, iat, exp }
      return next();
   } catch (error) {
      console.error('verifyToken error:', error);
      return sendError(res, 500, 'Internal server error.');
   }
};

// ─── requireRole ─────────────────────────────────────────────────────────────

/**
 * Middleware factory that restricts route access to one or more specific roles.
 * MUST be placed after verifyToken in the middleware chain.
 *
 * @param {...string} allowedRoles - Roles permitted to access the route.
 * @returns {import('express').RequestHandler}
 *
 * @example
 * // Only admins
 * router.delete('/users/:id', verifyToken, requireRole('admin'), handler);
 *
 * // Admins and managers
 * router.get('/reports', verifyToken, requireRole('admin', 'manager'), handler);
 */
export const requireRole = (...allowedRoles) => (req, res, next) => {
   if (!req.user) {
      return sendError(res, 401, 'Authentication required.');
   }

   if (!allowedRoles.includes(req.user.role)) {
      return sendError(
         res,
         403,
         `Access denied. Required role(s): ${allowedRoles.join(', ')}.`
      );
   }

   return next();
};
