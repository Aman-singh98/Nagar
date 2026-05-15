/**
 * @file types.js
 * Shared JSDoc type definitions for the Live Map / Assignment feature.
 *
 * These are not enforced at runtime but serve as documentation and enable
 * IDE autocomplete / VS Code type-checking when @ts-check is used.
 *
 * Future scope: migrate to TypeScript and replace these with .d.ts interfaces.
 */

/**
 * @typedef {Object} EmployeeLocation
 * @property {string}  employeeId    - MongoDB ObjectId
 * @property {string}  employeeName  - Display name
 * @property {number}  lat           - WGS-84 latitude
 * @property {number}  lng           - WGS-84 longitude
 * @property {string}  [assignmentId] - Today's assignment, if any
 * @property {boolean} [isActive]    - Whether the employee account is active
 * @property {string}  [updatedAt]   - ISO-8601 timestamp of last location update
 */

/**
 * @typedef {Object} VisitStatus
 * @property {string}  centerId    - Route center ObjectId
 * @property {'pending'|'visited'|'missed'|'in_progress'|'skipped'} status
 * @property {string}  [arrivedAt] - ISO-8601
 * @property {string}  [leftAt]    - ISO-8601
 */

/**
 * @typedef {Object} RouteCenter
 * @property {string}  _id
 * @property {string}  name
 * @property {number}  lat
 * @property {number}  lng
 * @property {number}  radius    - Geofence radius in metres
 * @property {number}  order     - Visit order index (1-based)
 * @property {string}  [address]
 */

/**
 * @typedef {Object} AssignmentDetail
 * @property {string}          _id
 * @property {{ _id: string; name: string; email: string }} employeeId
 * @property {{ _id: string; name: string; centers: RouteCenter[] }}  routeId
 * @property {string}          date          - yyyy-MM-dd
 * @property {'pending'|'in_progress'|'completed'|'skipped'} status
 * @property {VisitStatus[]}   visitStatuses
 * @property {string}          [updatedAt]
 */

export { }; // keep module syntax valid
