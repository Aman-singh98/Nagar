/**
 * @file auth.routes.js
 * @description Express router for all authentication endpoints.
 *
 * Route map:
 *  POST /api/v1/auth/register  → public    → validateRegister → handleRegister
 *  POST /api/v1/auth/login     → public    → validateLogin    → handleLogin
 *  POST /api/v1/auth/refresh   → semi-auth → validateRefresh  → handleRefreshToken
 *  POST /api/v1/auth/logout    → protected → verifyToken      → handleLogout
 *
 * Each route follows the pipeline:
 *   [validation] → [auth middleware] → controller
 */

import { Router } from 'express';
import {
   handleRegister,
   handleLogin,
   handleRefreshToken,
   handleLogout
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { validateRegister, validateLogin, validateRefresh } from '../middleware/validate.middleware.js';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

/** Register a new user account */
router.post('/register', validateRegister, handleRegister);

/** Authenticate with email + password; sets refresh token HttpOnly cookie */
router.post('/login', validateLogin, handleLogin);

// ─── Token Rotation ───────────────────────────────────────────────────────────

/**
 * Exchange a valid refresh token (from cookie) for a new access token.
 * Client must also send userId in the body to enable DB hash comparison.
 */
router.post('/refresh', validateRefresh, handleRefreshToken);

// ─── Protected Routes ─────────────────────────────────────────────────────────

/** Invalidate session — requires a valid Bearer access token */
router.post('/logout', verifyToken, handleLogout);

export default router;
