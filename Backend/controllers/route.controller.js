/**
 * @file route.controller.js
 * @description HTTP handlers for all Route management endpoints.
 *
 * Access control matrix:
 * ┌──────────────────────────┬───────┬─────────┬──────────┐
 * │ Action                   │ Admin │ Manager │ Employee │
 * ├──────────────────────────┼───────┼─────────┼──────────┤
 * │ GET    /routes           │  ✓    │  ✓ *    │  ✗       │
 * │ POST   /routes           │  ✓    │  ✓      │  ✗       │
 * │ GET    /routes/:id       │  ✓    │  ✓ *    │  ✗       │
 * │ PUT    /routes/:id       │  ✓    │  ✓ *    │  ✗       │
 * │ DELETE /routes/:id       │  ✓    │  ✗      │  ✗       │
 * └──────────────────────────┴───────┴─────────┴──────────┘
 * (* Manager can only access routes where managerId === req.user.sub)
 *
 * Performance notes:
 *  - List queries use lean() — plain JS objects, ~3× faster than full Documents.
 *  - paginateQuery runs countDocuments + find in parallel (Promise.all).
 *  - Center order uniqueness is validated in-process before any DB write.
 *  - The unique index on { name, companyId } catches race conditions at the DB layer.
 *
 * @module controllers/route
 */

import Route from '../models/route.model.js';
import AppError from '../utils/appError.js';
import { sendSuccess } from '../utils/responseHandler.js';
import { paginateQuery } from '../utils/pagination.js';
import { USER_ROLES } from '../models/user.model.js';

// ─── GET /routes ──────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of routes scoped to the caller's company.
 *
 * Admins   → all routes in the company.
 * Managers → only routes where managerId === their own ID.
 *
 * Query params:
 *  - page     {number}  Default: 1
 *  - limit    {number}  Default: 20, Max: 100
 *  - isActive {boolean} Filter by active state. Default: true
 *  - search   {string}  Partial match on route name (case-insensitive)
 *
 * @type {import('express').RequestHandler}
 */
export const listRoutes = async (req, res, next) => {
   try {
      const { isActive = 'true', search } = req.query;

      const filter = { companyId: req.user.companyId };

      // Managers are silently scoped to their own routes
      if (req.user.role === USER_ROLES.MANAGER) {
         filter.managerId = req.user.sub;
      }

      filter.isActive = isActive === 'true';

      if (search) {
         filter.name = { $regex: search.trim(), $options: 'i' };
      }

      const { data: routes, pagination } = await paginateQuery(
         Route,
         filter,
         req.query,
         {
            sort: { createdAt: -1 },
            lean: true,
            populate: { path: 'managerId', select: 'name email' },
         },
      );

      return sendSuccess(res, 200, 'Routes retrieved successfully.', { routes, pagination });
   } catch (error) {
      return next(error);
   }
};

// ─── POST /routes ─────────────────────────────────────────────────────────────

/**
 * Creates a new route with an embedded centers array.
 *
 * Validates:
 *  - Center `order` values must be unique within the array.
 *  - Route name must be unique within the company (DB-level unique index).
 *  - If caller is a manager, managerId is auto-set to their own ID.
 *
 * @type {import('express').RequestHandler}
 */
export const createRoute = async (req, res, next) => {
   try {
      const { name, centers, managerId } = req.body;

      // Managers always own their created routes
      const resolvedManagerId = req.user.role === USER_ROLES.MANAGER
         ? req.user.sub
         : (managerId ?? req.user.sub);

      // Build the document first so we can call instance methods for validation
      const route = new Route({
         name,
         companyId: req.user.companyId,
         managerId: resolvedManagerId,
         centers,
      });

      // Validate center order uniqueness in-process before hitting the DB
      const { valid, duplicates } = route.validateCenterOrders();
      if (!valid) {
         return next(
            new AppError(`Duplicate center order values found: ${duplicates.join(', ')}. Each center must have a unique order.`, 422),
         );
      }

      await route.save();

      return sendSuccess(res, 201, 'Route created successfully.', { route });
   } catch (error) {
      // Surface duplicate-name errors cleanly
      if (error.code === 11000) {
         return next(new AppError('A route with this name already exists in your company.', 409));
      }
      return next(error);
   }
};

// ─── GET /routes/:id ──────────────────────────────────────────────────────────

/**
 * Returns a single route by ID with centers sorted by order.
 *
 * @type {import('express').RequestHandler}
 */
export const getRoute = async (req, res, next) => {
   try {
      const route = await resolveRouteWithAccess(req, next);
      if (!route) return;

      // Return centers in visit-order regardless of insertion order
      const payload = route.toObject();
      payload.centers = route.getSortedCenters();

      return sendSuccess(res, 200, 'Route retrieved successfully.', { route: payload });
   } catch (error) {
      return next(error);
   }
};

// ─── PUT /routes/:id ──────────────────────────────────────────────────────────

/**
 * Full update of a route's metadata and/or centers array.
 *
 * If `centers` is provided in the body, the ENTIRE centers array is replaced.
 * Partial center updates (add/remove one center) are not supported by this
 * endpoint — send the complete new array. This keeps the operation atomic
 * and avoids partial-update race conditions.
 *
 * @type {import('express').RequestHandler}
 */
export const updateRoute = async (req, res, next) => {
   try {
      const route = await resolveRouteWithAccess(req, next);
      if (!route) return;

      const { name, centers, managerId, isActive } = req.body;

      if (name !== undefined) route.name = name;
      if (isActive !== undefined) route.isActive = isActive;
      if (managerId !== undefined && req.user.role === USER_ROLES.ADMIN) {
         route.managerId = managerId;
      }

      if (centers !== undefined) {
         route.centers = centers;

         // Re-validate center orders after replacement
         const { valid, duplicates } = route.validateCenterOrders();
         if (!valid) {
            return next(
               new AppError(`Duplicate center order values: ${duplicates.join(', ')}.`, 422),
            );
         }
      }

      await route.save();

      const payload = route.toObject();
      payload.centers = route.getSortedCenters();

      return sendSuccess(res, 200, 'Route updated successfully.', { route: payload });
   } catch (error) {
      if (error.code === 11000) {
         return next(new AppError('A route with this name already exists in your company.', 409));
      }
      return next(error);
   }
};

// ─── DELETE /routes/:id ───────────────────────────────────────────────────────

/**
 * Soft-deletes a route by setting isActive: false.
 *
 * Hard delete is intentionally NOT supported — active Assignments that
 * reference this route must remain queryable for historical reporting.
 * Admin only.
 *
 * Uses updateOne (skips the pre-save hook) since we're only flipping a flag.
 *
 * @type {import('express').RequestHandler}
 */
export const deleteRoute = async (req, res, next) => {
   try {
      const { id } = req.params;

      const result = await Route.updateOne(
         { _id: id, companyId: req.user.companyId },
         { $set: { isActive: false } },
      );

      if (result.matchedCount === 0) {
         return next(new AppError('Route not found.', 404));
      }

      return sendSuccess(res, 200, 'Route deactivated successfully.');
   } catch (error) {
      return next(error);
   }
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Resolves a Route by req.params.id with RBAC enforcement:
 *  - Must belong to caller's company.
 *  - Managers can only access routes where managerId equals their own ID.
 *
 * @param {import('express').Request}       req
 * @param {import('express').NextFunction}  next
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function resolveRouteWithAccess(req, next) {
   const { id } = req.params;

   const filter = { _id: id, companyId: req.user.companyId };

   if (req.user.role === USER_ROLES.MANAGER) {
      filter.managerId = req.user.sub;
   }

   const route = await Route.findOne(filter);

   if (!route) {
      next(new AppError('Route not found or you do not have access to this route.', 404));
      return null;
   }

   return route;
}
