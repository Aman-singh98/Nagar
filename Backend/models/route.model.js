/**
 * @file route.model.js
 * @description Mongoose schema and model for the Route entity.
 *
 * A Route is a named sequence of Centers that an employee visits in a day.
 * Centers are embedded directly inside the Route document (per the MVP spec)
 * rather than stored in a separate collection. This makes reads O(1) — a single
 * document fetch returns the route and all its centers together with no joins.
 *
 * Schema overview:
 * ┌─────────────────────────────────────────────────────┐
 * │ Route                                               │
 * │  name        string   Human-readable route name     │
 * │  companyId   ObjectId Multi-tenancy scope           │
 * │  managerId   ObjectId Manager responsible for route │
 * │  isActive    boolean  Soft-delete flag              │
 * │  centers[]   Array    Ordered list of visit stops   │
 * │    name      string   Center display name           │
 * │    lat       number   Latitude  (-90  … +90)        │
 * │    lng       number   Longitude (-180 … +180)       │
 * │    radius    number   Geofence radius in metres      │
 * │    order     number   1-indexed visit sequence       │
 * │    address   string?  Human-readable address (opt)  │
 * └─────────────────────────────────────────────────────┘
 *
 * Indexes (performance-critical):
 *  - { companyId, isActive }      → list routes for a company (most common query)
 *  - { companyId, managerId }     → manager's own routes
 *  - { name, companyId } unique   → prevent duplicate route names per company
 *
 * Future scope:
 *  - Add `tags[]` for route categorisation (e.g. "North Zone", "Pharma").
 *  - Add `estimatedDuration` (minutes) once routing engine is integrated.
 *  - Migrate centers to a separate collection if they need independent CRUD
 *    or if a center can belong to multiple routes (many-to-many).
 *
 * @module models/route
 */

import mongoose from 'mongoose';

// ─── Sub-schema: Center ───────────────────────────────────────────────────────

/**
 * Embedded center sub-document.
 * Each center represents one physical stop on the route.
 * `_id: true` (default) gives every center its own stable ObjectId so that
 * Assignment visitStatuses can reference centers by ID without ambiguity.
 */
const centerSchema = new mongoose.Schema(
   {
      /** Display name shown to the field employee (e.g. "Apollo Pharmacy – MG Road") */
      name: {
         type: String,
         required: [true, 'Center name is required'],
         trim: true,
         minlength: [2, 'Center name must be at least 2 characters'],
         maxlength: [150, 'Center name cannot exceed 150 characters'],
      },

      /** WGS-84 latitude. Validated to [-90, +90]. */
      lat: {
         type: Number,
         required: [true, 'Latitude is required'],
         min: [-90, 'Latitude must be ≥ -90'],
         max: [90, 'Latitude must be ≤ 90'],
      },

      /** WGS-84 longitude. Validated to [-180, +180]. */
      lng: {
         type: Number,
         required: [true, 'Longitude is required'],
         min: [-180, 'Longitude must be ≥ -180'],
         max: [180, 'Longitude must be ≤ 180'],
      },

      /**
       * Geofence check-in radius in metres.
       * The mobile app uses this to determine whether the employee is
       * physically close enough to mark a visit as "Visited".
       * Default: 100 m. Min: 50 m to prevent trivially large fences.
       */
      radius: {
         type: Number,
         default: 100,
         min: [50, 'Radius must be at least 50 metres'],
         max: [5000, 'Radius cannot exceed 5000 metres'],
      },

      /**
       * 1-indexed visit order within the route.
       * The mobile app sorts centers by this field to present the
       * optimal visit sequence to the employee.
       * Must be unique within a route — enforced at the controller level
       * since Mongoose does not support unique constraints on array sub-docs.
       */
      order: {
         type: Number,
         required: [true, 'Visit order is required'],
         min: [1, 'Order must be at least 1'],
      },

      /** Optional human-readable street address for display purposes. */
      address: {
         type: String,
         trim: true,
         default: null,
      },
   },
   { _id: true }, // explicit — centres need stable IDs for Assignment references
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const routeSchema = new mongoose.Schema(
   {
      /** Human-readable route identifier (e.g. "Delhi North – AM Shift") */
      name: {
         type: String,
         required: [true, 'Route name is required'],
         trim: true,
         minlength: [2, 'Route name must be at least 2 characters'],
         maxlength: [200, 'Route name cannot exceed 200 characters'],
      },

      /**
       * Company this route belongs to.
       * All employees assigned to this route must belong to the same company.
       * Indexed for fast company-scoped list queries.
       */
      companyId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User', // references the companyId stored on users
         required: [true, 'Company ID is required'],
      },

      /**
       * Manager responsible for this route.
       * Used for manager-scoped RBAC: managers can only see/edit their own routes.
       */
      managerId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         default: null,
      },

      /**
       * Ordered list of centers (stops) on this route.
       * Min 1 center — a route with no stops has no practical meaning.
       * Max 50 centers — prevents accidental document bloat (a single
       * MongoDB document is capped at 16 MB; 50 centers ≈ ~15 KB).
       */
      centers: {
         type: [centerSchema],
         validate: [
            {
               validator: (arr) => arr.length >= 1,
               message: 'A route must have at least 1 center.',
            },
            {
               validator: (arr) => arr.length <= 50,
               message: 'A route cannot have more than 50 centers.',
            },
         ],
      },

      /**
       * Soft-delete flag. Inactive routes are excluded from list queries
       * and cannot be assigned to employees, but historical Assignment
       * records that reference them remain intact.
       */
      isActive: {
         type: Boolean,
         default: true,
      },
   },
   {
      timestamps: true,  // createdAt + updatedAt
      versionKey: false,
   },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * Primary list query: "give me all active routes for company X".
 * Covers: GET /routes (admin view)
 */
routeSchema.index({ companyId: 1, isActive: 1 });

/**
 * Manager-scoped list query: "give me routes managed by manager Y in company X".
 * Covers: GET /routes (manager view, scoped by managerId)
 */
routeSchema.index({ companyId: 1, managerId: 1 });

/**
 * Uniqueness: no two routes in the same company can share a name.
 * Partial index on isActive:true so that soft-deleted routes don't
 * block the name from being reused.
 */
routeSchema.index(
   { name: 1, companyId: 1 },
   {
      unique: true,
      partialFilterExpression: { isActive: true },
      collation: { locale: 'en', strength: 2 }, // case-insensitive uniqueness
   },
);

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Returns centers sorted by their `order` field ascending.
 * Always use this instead of accessing `this.centers` directly so that
 * display order is guaranteed regardless of insertion order.
 *
 * @returns {Array}
 */
routeSchema.methods.getSortedCenters = function () {
   return [...this.centers].sort((a, b) => a.order - b.order);
};

/**
 * Validates that all `order` values within the centers array are unique.
 * Called in the controller before save to give a clean error message.
 *
 * @returns {{ valid: boolean, duplicates: number[] }}
 */
routeSchema.methods.validateCenterOrders = function () {
   const orders = this.centers.map((c) => c.order);
   const seen = new Set();
   const duplicates = [];
   for (const o of orders) {
      if (seen.has(o)) duplicates.push(o);
      seen.add(o);
   }
   return { valid: duplicates.length === 0, duplicates };
};

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Finds all active routes for a company, optionally scoped to a manager.
 * Lean query — returns plain objects for maximum read performance.
 *
 * @param {string|ObjectId} companyId
 * @param {string|ObjectId|null} [managerId]
 * @returns {Promise<Array>}
 */
routeSchema.statics.findActiveByCompany = function (companyId, managerId = null) {
   const filter = { companyId, isActive: true };
   if (managerId) filter.managerId = managerId;
   return this.find(filter)
      .sort({ createdAt: -1 })
      .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const Route = mongoose.model('Route', routeSchema);

export default Route;
