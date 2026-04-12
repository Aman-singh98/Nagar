/**
 * @file app.js
 * @description Express application setup — middleware stack, routes, and error handlers.
 *
 * Intentionally kept separate from server.js so the app instance can be
 * imported in tests without starting a real HTTP server or DB connection.
 *
 * Load order (matters for Express):
 *  1. Security middleware  (helmet, cors, mongo-sanitize)
 *  2. Body / cookie parsing
 *  3. Request logger
 *  4. API routes
 *  5. 404 handler
 *  6. Global error handler  ← MUST be last
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { routeRouter, assignmentRouter } from './routes/assignment.routes.js';
import { locationRouter, assignmentEndRouter } from './routes/location.routes.js';
import employeeRouter from './routes/employee.routes.js';
import authRoutes from './routes/auth.routes.js';
import AppError from './utils/appError.js';

dotenv.config();

const app = express();

// ─── 1. Security Middleware ───────────────────────────────────────────────────

/**
 * Sets secure HTTP response headers:
 * Content-Security-Policy, HSTS, X-Frame-Options, etc.
 */
app.use(helmet());

/**
 * Cross-Origin Resource Sharing.
 * credentials: true is required so the browser sends the HttpOnly
 * refresh-token cookie on cross-origin requests.
 */
app.use(
   cors({
      origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
      credentials: true
   })
);

// ─── 2. Body & Cookie Parsing ─────────────────────────────────────────────────

/** Limit JSON body size to guard against payload-based DoS attacks */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/**
 * Parses cookies from the Cookie header into req.cookies.
 * Required so auth.controller.js can read the HttpOnly refresh token cookie.
 */
app.use(cookieParser());

// ─── 3. Request Logger ────────────────────────────────────────────────────────

/**
 * Logs every incoming request with timestamp, method, and URL.
 * Swap this out for Morgan or Winston in production.
 */
app.use((req, _res, next) => {
   console.log(`[${new Date().toISOString()}]  ${req.method}  ${req.originalUrl}`);
   next();
});

// ─── 4. Health Check ──────────────────────────────────────────────────────────

/**
 * Lightweight endpoint for load balancers and uptime monitors.
 * Does not require authentication.
 */
app.get('/health', (_req, res) => {
   res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── 5. API Routes ────────────────────────────────────────────────────────────

/**
 * All auth routes are prefixed with /api/v1/auth:
 *  POST /api/v1/auth/register
 *  POST /api/v1/auth/login
 *  POST /api/v1/auth/refresh
 *  POST /api/v1/auth/logout
 */
app.use('/api/v1/auth', authRoutes);

/**
 * All route routes are prefixed with /api/v1/routes:
 *  GET    /api/v1/routes
 *  POST   /api/v1/routes
 *  GET    /api/v1/routes/:id
 *  PUT    /api/v1/routes/:id
 *  DELETE /api/v1/routes/:id
 */
app.use('/api/v1/routes', routeRouter);

/**
 * All assignment routes are prefixed with /api/v1/assignments:
 *  POST   /api/v1/assignments
 *  GET    /api/v1/assignments
 *  GET    /api/v1/assignments/:id
 *  PATCH  /api/v1/assignments/:id/centers/:centerId
 */
app.use('/api/v1/assignments', assignmentRouter);

/**
 * All location routes are prefixed with /api/v1/locations:
 *  POST /api/v1/locations         → ingest single GPS point
 *  POST /api/v1/locations/batch   → ingest offline GPS batch
 *  GET  /api/v1/locations         → breadcrumb trail
 */
app.use('/api/v1/locations', locationRouter);

/**
 * POST /api/v1/assignments/:id/end → end assignment, skip remaining centers
 */
app.use('/api/v1/assignments', assignmentEndRouter);

app.use('/api/v1/employees', employeeRouter);

// ─── 6. 404 Handler ───────────────────────────────────────────────────────────

/**
 * Catches any request that did not match a registered route above.
 * Passes an AppError to the global error handler below.
 */
app.use((_req, _res, next) => {
   next(new AppError('Route not found.', 404));
});

// ─── 7. Global Error Handler (MUST be last) ───────────────────────────────────

/**
 * Centralised error handling middleware.
 * Express identifies this as an error handler because it has 4 parameters.
 *
 * Handles:
 *  - AppError (operational)       → uses the real message + statusCode.
 *  - Mongoose ValidationError     → maps field errors into a 422 response.
 *  - MongoDB duplicate key 11000  → readable 409 for unique constraint violations.
 *  - Everything else              → generic 500 (hides internals from the client).
 */
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
   // ── Mongoose field-level validation error ──
   if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(422).json({
         status: 'error',
         message: 'Validation failed.',
         errors: messages,
      });
   }

   // ── MongoDB unique index violation ──
   if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      return res.status(409).json({
         status: 'error',
         message: `A record with this ${field} already exists.`,
      });
   }

   // ── Operational errors (AppError) — safe to expose to the client ──
   if (error.isOperational) {
      return res.status(error.statusCode).json({
         status: error.status,
         message: error.message,
      });
   }

   // ── Unknown / programming errors — log details, hide from client ──
   console.error('❌  UNHANDLED ERROR:', error);
   return res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
   });
});

export default app;
