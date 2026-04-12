/**
 * @file employee.controller.js
 * @description HTTP handlers for all employee management endpoints.
 *
 * Access control matrix:
 * ┌─────────────────────────────────┬───────┬─────────┬──────────┐
 * │ Action                          │ Admin │ Manager │ Employee │
 * ├─────────────────────────────────┼───────┼─────────┼──────────┤
 * │ GET  /employees (all)           │  ✓    │  ✓ *    │  ✗       │
 * │ POST /employees                 │  ✓    │  ✓      │  ✗       │
 * │ GET  /employees/:id             │  ✓    │  ✓ *    │  ✗       │
 * │ PUT  /employees/:id             │  ✓    │  ✓ *    │  ✗       │
 * │ PATCH /employees/:id/deactivate │  ✓    │  ✓ *    │  ✗       │
 * │ GET  /managers                  │  ✓    │  ✗       │  ✗       │
 * └─────────────────────────────────┴───────┴─────────┴──────────┘
 * (* Manager can only access employees they directly manage,
 *    i.e. employees whose managerId === req.user.sub)
 *
 * Design decisions:
 *  - Passwords are hashed by the User model's pre-save hook; controllers never
 *    touch raw bcrypt. This keeps hashing logic in exactly one place.
 *  - Pagination is handled by a shared `paginateQuery` utility so every list
 *    endpoint behaves consistently (same query params, same response shape).
 *  - All writes return the sanitised document (no password / refreshToken)
 *    via Mongoose's toJSON transform defined on the schema.
 *  - Managers cannot elevate a user's role to admin or manager — that privilege
 *    is reserved for admins only.
 *
 * Routes (defined in employee.routes.js):
 *  GET    /api/v1/employees                   → listEmployees
 *  POST   /api/v1/employees                   → createEmployee
 *  GET    /api/v1/employees/:id               → getEmployee
 *  PUT    /api/v1/employees/:id               → updateEmployee
 *  PATCH  /api/v1/employees/:id/deactivate    → deactivateEmployee
 *  GET    /api/v1/managers                    → listManagers
 *
 * @module employee.controller
 */

import User, { USER_ROLES } from '../models/user.model.js';
import AppError from '../utils/appError.js';
import { sendSuccess } from '../utils/responseHandler.js';
import { paginateQuery } from '../utils/pagination.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Roles that a manager is permitted to assign when creating / updating an
 * employee. Managers cannot promote anyone to admin or manager.
 */
const MANAGER_ASSIGNABLE_ROLES = [USER_ROLES.EMPLOYEE];

// ─── GET /employees ───────────────────────────────────────────────────────────

/**
 * Returns a paginated list of employees scoped to the caller's company.
 *
 * Admins see ALL employees in the company.
 * Managers see ONLY employees whose `managerId` equals their own user ID.
 *
 * Supported query parameters:
 *  - page      {number}  Page number, 1-indexed. Default: 1.
 *  - limit     {number}  Records per page. Default: 20. Max: 100.
 *  - role      {string}  Filter by role (admin | manager | employee).
 *  - isActive  {boolean} Filter by active status. Default: returns all.
 *  - search    {string}  Case-insensitive partial match on name or email.
 *  - sortBy    {string}  Field to sort by. Default: createdAt.
 *  - sortOrder {string}  asc | desc. Default: desc.
 *
 * @type {import('express').RequestHandler}
 */
export const listEmployees = async (req, res, next) => {
   try {
      const { role, isActive, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // ── Build base filter ──────────────────────────────────────────────────
      const filter = { companyId: req.user.companyId };

      // Managers are scoped to only their direct reports
      if (req.user.role === USER_ROLES.MANAGER) {
         filter.managerId = req.user.sub;
      }

      // Optional filters
      if (role) {
         if (!Object.values(USER_ROLES).includes(role)) {
            return next(new AppError(`Invalid role filter. Must be one of: ${Object.values(USER_ROLES).join(', ')}.`, 400));
         }
         filter.role = role;
      }

      if (isActive !== undefined) {
         filter.isActive = isActive === 'true';
      }

      if (search) {
         // Partial, case-insensitive match across name and email
         const searchRegex = new RegExp(search.trim(), 'i');
         filter.$or = [{ name: searchRegex }, { email: searchRegex }];
      }

      // ── Sort ───────────────────────────────────────────────────────────────
      const allowedSortFields = ['name', 'email', 'role', 'createdAt', 'lastLoginAt'];
      const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const sort = { [resolvedSortBy]: sortOrder === 'asc' ? 1 : -1 };

      // ── Paginate ───────────────────────────────────────────────────────────
      const { data: employees, pagination } = await paginateQuery(
         User,
         filter,
         req.query,
         { sort, select: '-password -refreshToken' },
      );

      return sendSuccess(res, 200, 'Employees retrieved successfully.', { employees, pagination });
   } catch (error) {
      return next(error);
   }
};

// ─── POST /employees ──────────────────────────────────────────────────────────

/**
 * Creates a new employee account within the caller's company.
 *
 * Rules:
 *  - Email must be unique across the entire collection (not just per company).
 *  - Managers can only assign the `employee` role; admins can assign any role.
 *  - The new user is automatically assigned to the caller's companyId.
 *  - If the caller is a manager, managerId is auto-set to their own ID.
 *
 * @type {import('express').RequestHandler}
 */
export const createEmployee = async (req, res, next) => {
   try {
      const { name, email, password, role = USER_ROLES.EMPLOYEE, managerId } = req.body;

      // ── Role privilege check ───────────────────────────────────────────────
      if (req.user.role === USER_ROLES.MANAGER && !MANAGER_ASSIGNABLE_ROLES.includes(role)) {
         return next(new AppError('Managers can only create employees with the "employee" role.', 403));
      }

      // ── Email uniqueness ───────────────────────────────────────────────────
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
         return next(new AppError('An account with this email already exists.', 409));
      }

      // ── Resolve managerId ──────────────────────────────────────────────────
      // Managers always own their created employees; admins can specify any manager
      const resolvedManagerId = req.user.role === USER_ROLES.MANAGER
         ? req.user.sub
         : (managerId ?? null);

      // If admin specified a managerId, verify that manager exists in the same company
      if (resolvedManagerId && req.user.role === USER_ROLES.ADMIN) {
         const managerExists = await User.findOne({
            _id: resolvedManagerId,
            companyId: req.user.companyId,
            role: USER_ROLES.MANAGER,
            isActive: true,
         });
         if (!managerExists) {
            return next(new AppError('The specified manager does not exist or is not active.', 404));
         }
      }

      // ── Create ─────────────────────────────────────────────────────────────
      // Password hashing is handled automatically by the pre-save hook in user.model.js
      const employee = await User.create({
         name,
         email,
         password,
         role,
         companyId: req.user.companyId,
         managerId: resolvedManagerId,
      });

      return sendSuccess(res, 201, 'Employee created successfully.', { employee });
   } catch (error) {
      return next(error);
   }
};

// ─── GET /employees/:id ───────────────────────────────────────────────────────

/**
 * Returns a single employee by ID.
 *
 * Admins can fetch any employee in their company.
 * Managers can only fetch employees whose managerId equals their own ID.
 *
 * @type {import('express').RequestHandler}
 */
export const getEmployee = async (req, res, next) => {
   try {
      const employee = await resolveEmployeeWithAccess(req, next);
      if (!employee) return; // resolveEmployeeWithAccess already called next(error)

      return sendSuccess(res, 200, 'Employee retrieved successfully.', { employee });
   } catch (error) {
      return next(error);
   }
};

// ─── PUT /employees/:id ───────────────────────────────────────────────────────

/**
 * Performs a full update on an employee's profile fields.
 *
 * Updatable fields: name, email, role, managerId, department (future).
 * Password changes must go through a dedicated PATCH /employees/:id/password route.
 * Admins can change role; managers cannot elevate roles.
 *
 * @type {import('express').RequestHandler}
 */
export const updateEmployee = async (req, res, next) => {
   try {
      const employee = await resolveEmployeeWithAccess(req, next);
      if (!employee) return;

      const { name, email, role, managerId, department } = req.body;

      // ── Role change privilege check ────────────────────────────────────────
      if (role && req.user.role === USER_ROLES.MANAGER && !MANAGER_ASSIGNABLE_ROLES.includes(role)) {
         return next(new AppError('Managers cannot change an employee\'s role to admin or manager.', 403));
      }

      // ── Email uniqueness (if changing email) ───────────────────────────────
      if (email && email.toLowerCase().trim() !== employee.email) {
         const emailTaken = await User.findOne({ email: email.toLowerCase().trim() });
         if (emailTaken) {
            return next(new AppError('This email is already in use by another account.', 409));
         }
      }

      // ── Apply updates ──────────────────────────────────────────────────────
      // Only assign fields that were actually provided in the request body
      if (name !== undefined) employee.name = name;
      if (email !== undefined) employee.email = email;
      if (role !== undefined) employee.role = role;
      if (managerId !== undefined) employee.managerId = managerId;
      if (department !== undefined) employee.department = department; // future-proofing

      await employee.save();

      return sendSuccess(res, 200, 'Employee updated successfully.', { employee });
   } catch (error) {
      return next(error);
   }
};

// ─── PATCH /employees/:id/deactivate ─────────────────────────────────────────

/**
 * Soft-deactivates an employee account.
 *
 * Sets `isActive: false` — does NOT delete the document.
 * Also invalidates any active session by clearing the stored refresh token hash.
 * A deactivated user cannot log in (blocked in handleLogin).
 *
 * Idempotent: deactivating an already-inactive account is a no-op (returns 200).
 *
 * @type {import('express').RequestHandler}
 */
export const deactivateEmployee = async (req, res, next) => {
   try {
      const employee = await resolveEmployeeWithAccess(req, next);
      if (!employee) return;

      // Guard: prevent self-deactivation
      if (employee._id.toString() === req.user.sub) {
         return next(new AppError('You cannot deactivate your own account.', 403));
      }

      if (!employee.isActive) {
         // Already inactive — idempotent success
         return sendSuccess(res, 200, 'Employee is already deactivated.', { employee });
      }

      employee.isActive = false;
      employee.refreshToken = undefined; // kill the active session immediately

      // Use $set directly to avoid triggering the password pre-save hook for this update
      await User.updateOne(
         { _id: employee._id },
         { $set: { isActive: false }, $unset: { refreshToken: '' } },
      );

      return sendSuccess(res, 200, 'Employee deactivated successfully.', { employee });
   } catch (error) {
      return next(error);
   }
};

// ─── GET /managers ────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of all managers in the caller's company.
 *
 * Accessible by admins only. Typically used to populate "assign manager"
 * dropdowns in the frontend when creating or editing employees.
 *
 * @type {import('express').RequestHandler}
 */
export const listManagers = async (req, res, next) => {
   try {
      const filter = {
         companyId: req.user.companyId,
         role: USER_ROLES.MANAGER,
         isActive: true,
      };

      const { data: managers, pagination } = await paginateQuery(
         User,
         filter,
         req.query,
         { sort: { name: 1 }, select: 'name email role lastLoginAt createdAt' },
      );

      return sendSuccess(res, 200, 'Managers retrieved successfully.', { managers, pagination });
   } catch (error) {
      return next(error);
   }
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Resolves an employee document by `req.params.id` and enforces access control:
 *  - The employee must belong to the caller's company.
 *  - If the caller is a manager, the employee's managerId must match the caller.
 *
 * Calls `next(AppError)` and returns `null` on any access violation or not-found.
 * Returns the Mongoose document on success.
 *
 * Centralising this logic prevents each handler from duplicating the same
 * find-and-check pattern.
 *
 * @param {import('express').Request}  req
 * @param {import('express').NextFunction} next
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function resolveEmployeeWithAccess(req, next) {
   const { id } = req.params;

   const filter = { _id: id, companyId: req.user.companyId };

   // Managers can only see their direct reports
   if (req.user.role === USER_ROLES.MANAGER) {
      filter.managerId = req.user.sub;
   }

   const employee = await User.findOne(filter);

   if (!employee) {
      next(new AppError('Employee not found or you do not have access to this record.', 404));
      return null;
   }

   return employee;
}
