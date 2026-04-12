/**
 * @file rbac.middleware.js
 * @description Role-Based Access Control (RBAC) middleware factory.
 *
 * Provides two composable middleware factories:
 *
 *  1. `requireRoles(...roles)`
 *     Rejects requests from users whose role is not in the allowed list.
 *     Used to gate entire routes (e.g. admin-only endpoints).
 *
 *  2. `requireOwnershipOrAdmin(getResourceOwnerId)`
 *     For routes that admins can always access but other roles can only access
 *     if they "own" the resource (defined by a caller-supplied resolver function).
 *
 * Both factories assume `req.user` has already been populated by the
 * `verifyToken` middleware (JWT auth guard). Always compose auth → rbac.
 *
 * Usage examples:
 * ```js
 * // Admin and manager only:
 * router.get('/employees', verifyToken, requireRoles('admin', 'manager'), listEmployees);
 *
 * // Admin only:
 * router.get('/managers', verifyToken, requireRoles('admin'), listManagers);
 * ```
 *
 * Future scope:
 *  - Permission-based RBAC: replace string roles with a permission matrix
 *    (e.g. `requirePermission('employee:write')`) for finer-grained control
 *    without proliferating role checks throughout business logic.
 *  - Attribute-Based Access Control (ABAC): extend with resource-attribute
 *    policies (e.g. department-scoped access) when the org structure grows.
 *
 * @module middleware/rbac
 */

import AppError from '../utils/appError.js';
import { USER_ROLES } from '../models/user.model.js';

// ─── requireRoles ─────────────────────────────────────────────────────────────

/**
 * Middleware factory that restricts a route to users with one of the specified
 * roles. Returns 403 for authenticated users with insufficient privileges.
 *
 * @param  {...string} allowedRoles - One or more roles from USER_ROLES.
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.post('/employees', verifyToken, requireRoles('admin', 'manager'), createEmployee);
 */
export const requireRoles = (...allowedRoles) => {
	// Validate at startup that only known roles are passed — catches typos early
	for (const role of allowedRoles) {
		if (!Object.values(USER_ROLES).includes(role)) {
			throw new Error(`[requireRoles] Unknown role: "${role}". Check USER_ROLES in user.model.js.`);
		}
	}

	return (req, _res, next) => {
		if (!req.user) {
			return next(new AppError('Authentication required.', 401));
		}

		if (!allowedRoles.includes(req.user.role)) {
			return next(
				new AppError(
					`Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}.`,
					403,
				),
			);
		}

		return next();
	};
};

// ─── requireSameCompany ───────────────────────────────────────────────────────

/**
 * Ensures the authenticated user belongs to the same company as the resource
 * being accessed. This middleware reads `companyId` from the resource document
 * resolved by the caller-supplied async function.
 *
 * Useful for any endpoint where you want to prevent cross-tenant data access
 * without repeating `companyId` checks in every controller.
 *
 * @param {(req: import('express').Request) => Promise<{companyId: string}|null>} getResource
 *   Async function that resolves to a resource document (must have `companyId`).
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.get(
 *   '/projects/:id',
 *   verifyToken,
 *   requireSameCompany(req => Project.findById(req.params.id)),
 *   getProject,
 * );
 */
export const requireSameCompany = (getResource) => async (req, _res, next) => {
	try {
		const resource = await getResource(req);

		if (!resource) {
			return next(new AppError('Resource not found.', 404));
		}

		if (resource.companyId.toString() !== req.user.companyId.toString()) {
			// Return 404 rather than 403 to avoid leaking resource existence
			return next(new AppError('Resource not found.', 404));
		}

		return next();
	} catch (error) {
		return next(error);
	}
};
