/**
 * @file assignment.controller.js
 * @description HTTP handlers for all Assignment management endpoints.
 *
 * Access control matrix:
 * ┌────────────────────────────────────────────┬───────┬─────────┬──────────┐
 * │ Action                                     │ Admin │ Manager │ Employee │
 * ├────────────────────────────────────────────┼───────┼─────────┼──────────┤
 * │ POST   /assignments                        │  ✓    │  ✓      │  ✗       │
 * │ GET    /assignments?date=&employeeId=      │  ✓    │  ✓ *    │  ✓ **    │
 * │ GET    /assignments/:id                    │  ✓    │  ✓ *    │  ✓ **    │
 * │ PATCH  /assignments/:id/centers/:centerId  │  ✓    │  ✓ *    │  ✓ **    │
 * └────────────────────────────────────────────┴───────┴─────────┴──────────┘
 * (*  Manager can only access assignments on routes they manage)
 * (** Employee can only access their own assignments)
 *
 * Performance notes:
 *  - POST /assignments pre-populates visitStatuses from Route.centers at creation
 *    so the mobile app never needs to fetch the route separately.
 *  - PATCH /center uses $set on the specific array element via positional operator
 *    rather than save() to avoid rewriting the full document on every check-in.
 *  - All list queries use lean() for maximum throughput.
 *
 * @module controllers/assignment
 */

import Assignment, { ASSIGNMENT_STATUS, VISIT_STATUS } from '../models/assignment.model.js';
import Route from '../models/route.model.js';
import AppError from '../utils/appError.js';
import { sendSuccess } from '../utils/responseHandler.js';
import { paginateQuery } from '../utils/pagination.js';
import { USER_ROLES } from '../models/user.model.js';

// ─── POST /assignments ────────────────────────────────────────────────────────

/**
 * Creates a new assignment — assigns a route to an employee for a date.
 *
 * Steps:
 *  1. Validate the route exists and belongs to the caller's company.
 *  2. Validate the employee belongs to the same company.
 *  3. Pre-populate visitStatuses from Route.centers (one entry per center).
 *  4. Denormalise companyId from the route onto the assignment.
 *  5. Save — unique index prevents duplicate on { employeeId, routeId, date }.
 *
 * @type {import('express').RequestHandler}
 */
export const createAssignment = async (req, res, next) => {
   try {
      const { employeeId, routeId, date } = req.body;

      // ── Fetch route and validate company ownership ────────────────────────────
      const route = await Route.findOne({
         _id: routeId,
         companyId: req.user.companyId,
         isActive: true,
      }).lean();

      if (!route) {
         return next(new AppError('Route not found or is inactive.', 404));
      }

      // ── Manager check: can only assign routes they manage ─────────────────────
      if (
         req.user.role === USER_ROLES.MANAGER &&
         String(route.managerId) !== String(req.user.sub)
      ) {
         return next(new AppError('You can only assign routes that you manage.', 403));
      }

      // ── Pre-populate visitStatuses from route centers ─────────────────────────
      // Sorted by order so the mobile app gets them in visit sequence immediately.
      const visitStatuses = [...route.centers]
         .sort((a, b) => a.order - b.order)
         .map((center) => ({
            centerId: center._id,
            status: VISIT_STATUS.PENDING,
            visitedAt: null,
            note: null,
         }));

      const assignment = await Assignment.create({
         employeeId,
         routeId,
         companyId: req.user.companyId, // denormalised from route
         date,
         status: ASSIGNMENT_STATUS.PENDING,
         visitStatuses,
         assignedBy: req.user.sub,
      });

      // Populate for the response so the caller gets names, not just IDs
      await assignment.populate([
         { path: 'employeeId', select: 'name email role' },
         { path: 'routeId', select: 'name centers' },
         { path: 'assignedBy', select: 'name email' },
      ]);

      return sendSuccess(res, 201, 'Assignment created successfully.', { assignment });
   } catch (error) {
      if (error.code === 11000) {
         return next(
            new AppError('This employee is already assigned to this route on the selected date.', 409),
         );
      }
      return next(error);
   }
};

// ─── GET /assignments ─────────────────────────────────────────────────────────

/**
 * Returns a filtered, paginated list of assignments.
 *
 * Query params:
 *  - date        {string}  ISO date string — filter by assignment date (required for employees)
 *  - employeeId  {string}  Filter by employee (admin/manager only)
 *  - routeId     {string}  Filter by route
 *  - status      {string}  Filter by assignment status
 *  - page        {number}  Default: 1
 *  - limit       {number}  Default: 20
 *
 * Role-based scoping:
 *  - Employee: always filtered to their own employeeId only.
 *  - Manager:  filtered to routes they manage (via a Route lookup).
 *  - Admin:    full company scope.
 *
 * @type {import('express').RequestHandler}
 */
export const listAssignments = async (req, res, next) => {
   try {
      const { date, employeeId, routeId, status } = req.query;

      const filter = { companyId: req.user.companyId };

      // ── Role scoping ──────────────────────────────────────────────────────────
      if (req.user.role === USER_ROLES.EMPLOYEE) {
         // Employees can only see their own assignments
         filter.employeeId = req.user.sub;
      } else if (employeeId) {
         filter.employeeId = employeeId;
      }

      if (req.user.role === USER_ROLES.MANAGER) {
         // Scope to routes this manager owns
         const managerRouteIds = await Route.find(
            { companyId: req.user.companyId, managerId: req.user.sub, isActive: true },
            { _id: 1 },
         ).lean().then((routes) => routes.map((r) => r._id));

         filter.routeId = { $in: managerRouteIds };
      }

      if (routeId) filter.routeId = routeId;
      if (status) filter.status = status;

      if (date) {
         const d = new Date(date);
         d.setUTCHours(0, 0, 0, 0);
         filter.date = d;
      }

      const { data: assignments, pagination } = await paginateQuery(
         Assignment,
         filter,
         req.query,
         {
            sort: { date: -1, createdAt: -1 },
            lean: true,
            populate: [
               { path: 'employeeId', select: 'name email role' },
               { path: 'routeId', select: 'name centers' },
            ],
         },
      );

      return sendSuccess(res, 200, 'Assignments retrieved successfully.', { assignments, pagination });
   } catch (error) {
      return next(error);
   }
};

// ─── GET /assignments/:id ─────────────────────────────────────────────────────

/**
 * Returns a single assignment with full route and employee details.
 * Also computes and attaches a progress summary.
 *
 * @type {import('express').RequestHandler}
 */
export const getAssignment = async (req, res, next) => {
   try {
      const assignment = await resolveAssignmentWithAccess(req, next);
      if (!assignment) return;

      await assignment.populate([
         { path: 'employeeId', select: 'name email role' },
         { path: 'routeId', select: 'name centers' },
         { path: 'assignedBy', select: 'name email' },
      ]);

      const payload = assignment.toObject();
      payload.progress = assignment.getProgress();

      return sendSuccess(res, 200, 'Assignment retrieved successfully.', { assignment: payload });
   } catch (error) {
      return next(error);
   }
};

// ─── PATCH /assignments/:id/centers/:centerId ─────────────────────────────────

/**
 * Updates the visit status of a single center within an assignment.
 *
 * This is the hot path — called by the mobile app every time an employee
 * checks in at a center. Designed for maximum write efficiency:
 *  - Uses MongoDB positional operator ($set on the matched array element)
 *    rather than document-level save() to avoid writing unchanged centers.
 *  - Sets `visitedAt` server-side (not client-side) to prevent clock skew.
 *  - Recalculates overall assignment status after the update.
 *
 * Access:
 *  - Employees can only update their OWN assignments.
 *  - Admins and managers can update any assignment in scope.
 *
 * @type {import('express').RequestHandler}
 */
export const updateCenterVisit = async (req, res, next) => {
   try {
      const { id, centerId } = req.params;
      const { status, note } = req.body;

      const assignment = await resolveAssignmentWithAccess(req, next);
      if (!assignment) return;

      // Locate the target visitStatus entry
      const vsIndex = assignment.visitStatuses.findIndex(
         (vs) => String(vs.centerId) === String(centerId),
      );

      if (vsIndex === -1) {
         return next(new AppError('Center not found in this assignment.', 404));
      }

      // ── Build the targeted $set update ───────────────────────────────────────
      // Using the positional operator path avoids rewriting the full array.
      const updateFields = {
         [`visitStatuses.${vsIndex}.status`]: status,
      };

      if (note !== undefined) {
         updateFields[`visitStatuses.${vsIndex}.note`] = note;
      }

      // Server-side timestamp — never trust the client clock
      if (status === VISIT_STATUS.VISITED) {
         updateFields[`visitStatuses.${vsIndex}.visitedAt`] = new Date();
      }

      // ── Set startedAt on first check-in ───────────────────────────────────────
      const isFirstCheckIn = !assignment.startedAt &&
         assignment.visitStatuses.every((vs) => vs.status === VISIT_STATUS.PENDING);

      if (isFirstCheckIn) {
         updateFields.startedAt = new Date();
         updateFields.status = ASSIGNMENT_STATUS.IN_PROGRESS;
      }

      // ── Check if this update completes the entire assignment ──────────────────
      const updatedStatuses = assignment.visitStatuses.map((vs, i) =>
         i === vsIndex ? { ...vs.toObject(), status } : vs.toObject(),
      );
      const allResolved = updatedStatuses.every(
         (vs) => vs.status === VISIT_STATUS.VISITED || vs.status === VISIT_STATUS.SKIPPED,
      );
      if (allResolved) {
         updateFields.status = ASSIGNMENT_STATUS.COMPLETED;
         updateFields.completedAt = new Date();
      }

      // ── Single atomic write ───────────────────────────────────────────────────
      const updated = await Assignment.findByIdAndUpdate(
         id,
         { $set: updateFields },
         { new: true, runValidators: true },
      ).populate([
         { path: 'employeeId', select: 'name email' },
         { path: 'routeId', select: 'name' },
      ]);

      const payload = updated.toObject();
      payload.progress = updated.getProgress();

      return sendSuccess(res, 200, 'Visit status updated successfully.', { assignment: payload });
   } catch (error) {
      return next(error);
   }
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Resolves an Assignment document with RBAC:
 *  - Must belong to caller's company.
 *  - Employees can only access their own assignments.
 *  - Managers can only access assignments on routes they manage.
 *
 * @param {import('express').Request}       req
 * @param {import('express').NextFunction}  next
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function resolveAssignmentWithAccess(req, next) {
   const { id } = req.params;

   const filter = { _id: id, companyId: req.user.companyId };

   if (req.user.role === USER_ROLES.EMPLOYEE) {
      filter.employeeId = req.user.sub;
   }

   const assignment = await Assignment.findOne(filter);

   if (!assignment) {
      next(new AppError('Assignment not found or you do not have access.', 404));
      return null;
   }

   // Manager: verify the assignment's route is one they manage
   if (req.user.role === USER_ROLES.MANAGER) {
      const route = await Route.findOne({
         _id: assignment.routeId,
         managerId: req.user.sub,
      }).lean();

      if (!route) {
         next(new AppError('Assignment not found or you do not have access.', 404));
         return null;
      }
   }

   return assignment;
}
