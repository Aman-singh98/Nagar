/**
 * @file assignment.model.js
 * @description Mongoose schema and model for the Assignment entity.
 *
 * An Assignment links one Employee to one Route for a specific calendar date.
 * It also tracks per-center visit progress via an embedded `visitStatuses` array
 * so the mobile app can update individual stop completions without extra round-trips.
 *
 * Schema overview:
 * ┌───────────────────────────────────────────────────────────────┐
 * │ Assignment                                                    │
 * │  employeeId      ObjectId  The assigned employee              │
 * │  routeId         ObjectId  The route to cover                 │
 * │  companyId       ObjectId  Multi-tenancy scope (denormalised) │
 * │  date            Date      Calendar date (midnight UTC)       │
 * │  status          string    pending|in_progress|completed|skip │
 * │  visitStatuses[] Array     One entry per center on the route  │
 * │    centerId      ObjectId  Ref to centers[_id] inside Route   │
 * │    status        string    pending|visited|skipped            │
 * │    visitedAt     Date?     Timestamp when employee checked in │
 * │    note          string?   Optional field note                │
 * │  assignedBy      ObjectId  Admin/manager who created this     │
 * │  startedAt       Date?     When employee began the route      │
 * │  completedAt     Date?     When all centers were resolved     │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Key design decisions:
 *  - `date` is always normalised to midnight UTC before save (pre-save hook)
 *    so that date-equality queries work reliably regardless of the client timezone.
 *  - `companyId` is denormalised from the Route to avoid a lookup on every
 *    list query. This trades a small amount of write complexity for significant
 *    read performance.
 *  - One employee can only have one assignment per route per date (unique index).
 *    Multiple routes on the same date are allowed — use one Assignment per route.
 *
 * Indexes (performance-critical for field-app usage patterns):
 *  - { companyId, date }            → daily dashboard query (most common)
 *  - { employeeId, date }           → employee's own schedule
 *  - { routeId, date }              → route coverage report
 *  - { employeeId, routeId, date }  → unique constraint (no duplicates)
 *  - { status, date }               → pending/in-progress monitoring
 *
 * Future scope:
 *  - Add `geoCheckIn { lat, lng }` on visitStatus for GPS audit trail.
 *  - Add `syncedAt` for offline-first mobile sync conflict resolution.
 *  - Promote visitStatuses to a separate collection if write throughput
 *    exceeds MongoDB's 16 MB document limit (unlikely for ≤50 centers).
 *
 * @module models/assignment
 */

import mongoose from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ASSIGNMENT_STATUS = Object.freeze({
   PENDING: 'pending',
   IN_PROGRESS: 'in_progress',
   COMPLETED: 'completed',
   SKIPPED: 'skipped',
});

export const VISIT_STATUS = Object.freeze({
   PENDING: 'pending',
   VISITED: 'visited',
   SKIPPED: 'skipped',
});

// ─── Sub-schema: VisitStatus ──────────────────────────────────────────────────

/**
 * Tracks the completion status of one center within an assignment.
 * Updated by the mobile app as the employee progresses through the route.
 */
const visitStatusSchema = new mongoose.Schema(
   {
      /**
       * References the `_id` of a center embedded in the Route document.
       * Not a Mongoose ref (embedded sub-doc IDs don't support populate),
       * but stored as ObjectId for type safety and index efficiency.
       */
      centerId: {
         type: mongoose.Schema.Types.ObjectId,
         required: [true, 'Center ID is required'],
      },

      /** Current visit state for this center. */
      status: {
         type: String,
         enum: {
            values: Object.values(VISIT_STATUS),
            message: `Visit status must be one of: ${Object.values(VISIT_STATUS).join(', ')}`,
         },
         default: VISIT_STATUS.PENDING,
      },

      /**
       * Server-side timestamp of the check-in event.
       * Set by the API when status transitions to "visited" — NOT by the client —
       * to prevent timestamp manipulation from the mobile device.
       */
      visitedAt: {
         type: Date,
         default: null,
      },

      /** Optional field observation note left by the employee at check-in. */
      note: {
         type: String,
         trim: true,
         maxlength: [500, 'Note cannot exceed 500 characters'],
         default: null,
      },
   },
   { _id: false }, // no _id needed — centerId already uniquely identifies each entry
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const assignmentSchema = new mongoose.Schema(
   {
      /** The employee who will execute this route on the given date. */
      employeeId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: [true, 'Employee ID is required'],
      },

      /** The route the employee is assigned to cover. */
      routeId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Route',
         required: [true, 'Route ID is required'],
      },

      /**
       * Denormalised from Route.companyId at creation time.
       * Enables company-scoped list queries without a Route join.
       */
      companyId: {
         type: mongoose.Schema.Types.ObjectId,
         required: [true, 'Company ID is required'],
      },

      /**
       * The calendar date this assignment is for.
       * Always stored as midnight UTC regardless of client timezone.
       * Normalisation is applied in the pre-save hook below.
       */
      date: {
         type: Date,
         required: [true, 'Assignment date is required'],
      },

      /** Overall assignment lifecycle status. */
      status: {
         type: String,
         enum: {
            values: Object.values(ASSIGNMENT_STATUS),
            message: `Status must be one of: ${Object.values(ASSIGNMENT_STATUS).join(', ')}`,
         },
         default: ASSIGNMENT_STATUS.PENDING,
      },

      /**
       * Per-center visit progress.
       * Populated at creation time from Route.centers — one entry per center,
       * all starting at status "pending".
       * Updated by PATCH /assignments/:id/centers/:centerId.
       */
      visitStatuses: {
         type: [visitStatusSchema],
         default: [],
      },

      /** The admin or manager who created this assignment (audit trail). */
      assignedBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: [true, 'Assigned-by user ID is required'],
      },

      /** Timestamp when the employee first marked any center as visited. */
      startedAt: {
         type: Date,
         default: null,
      },

      /**
       * Timestamp when all centers reached a terminal state (visited or skipped).
       * Set automatically by the pre-save hook when all visitStatuses resolve.
       */
      completedAt: {
         type: Date,
         default: null,
      },
   },
   {
      timestamps: true,  // createdAt + updatedAt
      versionKey: false,
   },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * Daily dashboard: "show all assignments for company X on date Y".
 * This is the single most-executed query — front-office managers use it
 * every morning. Covering index for both fields.
 */
assignmentSchema.index({ companyId: 1, date: 1 });

/**
 * Employee schedule view: "what is employee Y doing on date Z?".
 * Used by the mobile app on login to load today's assignment.
 */
assignmentSchema.index({ employeeId: 1, date: 1 });

/**
 * Route coverage report: "who covered route R on date D?".
 */
assignmentSchema.index({ routeId: 1, date: 1 });

/**
 * Unique constraint: one employee, one route, one date.
 * Prevents double-booking without a separate look-before-insert query.
 */
assignmentSchema.index(
   { employeeId: 1, routeId: 1, date: 1 },
   { unique: true },
);

/**
 * Operations monitoring: "how many assignments are still pending today?".
 */
assignmentSchema.index({ status: 1, date: 1 });

// ─── Pre-save Hook ────────────────────────────────────────────────────────────

/**
 * Normalises `date` to midnight UTC so that queries like:
 *   Assignment.find({ date: new Date('2024-01-15') })
 * work correctly regardless of what timezone the client submitted.
 *
 * Also auto-sets `completedAt` when all centers reach a terminal state.
 */
assignmentSchema.pre('save', function () {
   // ── Normalise date to midnight UTC ──────────────────────────────────────────
   if (this.isModified('date') && this.date) {
      const d = new Date(this.date);
      d.setUTCHours(0, 0, 0, 0);
      this.date = d;
   }

   // ── Auto-complete when all visit statuses are terminal ──────────────────────
   if (this.isModified('visitStatuses') && this.visitStatuses.length > 0) {
      const allResolved = this.visitStatuses.every(
         (vs) => vs.status === VISIT_STATUS.VISITED || vs.status === VISIT_STATUS.SKIPPED,
      );
      if (allResolved && !this.completedAt) {
         this.completedAt = new Date();
         this.status = ASSIGNMENT_STATUS.COMPLETED;
      }
   }
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Returns a summary of visit progress for this assignment.
 *
 * @returns {{ total: number, visited: number, skipped: number, pending: number, pct: number }}
 */
assignmentSchema.methods.getProgress = function () {
   const total = this.visitStatuses.length;
   const visited = this.visitStatuses.filter((v) => v.status === VISIT_STATUS.VISITED).length;
   const skipped = this.visitStatuses.filter((v) => v.status === VISIT_STATUS.SKIPPED).length;
   const pending = total - visited - skipped;
   const pct = total > 0 ? Math.round(((visited + skipped) / total) * 100) : 0;
   return { total, visited, skipped, pending, pct };
};

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Fetches all assignments for a company on a specific date.
 * Populates employee name/email and route name for the dashboard view.
 * Uses lean() + specific field projection for maximum read throughput.
 *
 * @param {string|ObjectId} companyId
 * @param {Date}            date        - Any Date on the target day (normalised internally).
 * @returns {Promise<Array>}
 */
assignmentSchema.statics.findByCompanyAndDate = function (companyId, date) {
   const d = new Date(date);
   d.setUTCHours(0, 0, 0, 0);
   return this.find({ companyId, date: d })
      .populate('employeeId', 'name email role')
      .populate('routeId', 'name centers')
      .sort({ createdAt: -1 })
      .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;
