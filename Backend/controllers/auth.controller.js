/**
 * @file auth.controller.js
 * @description HTTP handlers for all authentication endpoints.
 *
 * Each handler:
 *  1. Reads validated data from req.body / req.cookies / req.user.
 *  2. Runs business logic (DB queries, token operations).
 *  3. Sends a structured JSON response via responseHandler helpers.
 *  4. Passes unexpected errors to Express's global error handler via next(error).
 *
 * Refresh tokens are transported ONLY via HttpOnly cookies — never in the
 * response body — to protect against XSS-based token theft.
 *
 * Routes (defined in auth.routes.js):
 *  POST /api/v1/auth/register  → handleRegister
 *  POST /api/v1/auth/login     → handleLogin
 *  POST /api/v1/auth/refresh   → handleRefreshToken
 *  POST /api/v1/auth/logout    → handleLogout
 */

import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import { issueTokenPair } from '../utils/generateTokens.js';
import { sendSuccess } from '../utils/responseHandler.js';

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

/**
 * Standard HttpOnly cookie options for the refresh token.
 * Keeping this in one place ensures login and refresh are always consistent.
 *
 * @returns {import('express').CookieOptions}
 */
const getRefreshCookieOptions = () => ({
	httpOnly: true,                                    // JS cannot read this cookie
	secure: process.env.NODE_ENV === 'production',   // HTTPS only in production
	sameSite: 'strict',                                // CSRF mitigation
	maxAge: 30 * 24 * 60 * 60 * 1000,              // 30 days in ms
});

/**
 * Cookie options that immediately expire the refresh cookie (used on logout).
 *
 * @returns {import('express').CookieOptions}
 */
const getClearCookieOptions = () => ({
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'strict',
});

// ─── POST /auth/register ──────────────────────────────────────────────────────

/**
 * Registers a new user account.
 *
 * - Checks email uniqueness.
 * - Creates the user (password is hashed by the pre-save hook in user.model.js).
 * - Returns the sanitised user object (no password / refreshToken).
 *
 * @type {import('express').RequestHandler}
 */
export const handleRegister = async (req, res, next) => {
	try {
		const { name, email, password, role, companyId } = req.body;

		// Check for existing account — give a clear 409 rather than a cryptic duplicate-key error
		const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
		if (existingUser) {
			return next(new AppError('An account with this email already exists.', 409));
		}

		const newUser = await User.create({ name, email, password, role, companyId });

		return sendSuccess(res, 201, 'Account created successfully.', { user: newUser });
	} catch (error) {
		return next(error);
	}
};

// ─── POST /auth/login ─────────────────────────────────────────────────────────

/**
 * Authenticates a user with email + password.
 *
 * - Fetches user including the normally-hidden password field.
 * - Verifies the account is active.
 * - Compares the supplied password against the stored hash.
 * - Issues a JWT access token + opaque refresh token.
 * - Sets the refresh token as an HttpOnly cookie.
 * - Updates lastLoginAt in the background (fire-and-forget).
 *
 * @type {import('express').RequestHandler}
 */
export const handleLogin = async (req, res, next) => {
	try {
		const { email, password } = req.body;

		// Explicitly select password (excluded by `select: false` in schema)
		const user = await User.findByEmailWithPassword(email);

		// Generic message prevents user-enumeration attacks
		if (!user) {
			return next(new AppError('Invalid email or password.', 401));
		}

		if (!user.isActive) {
			return next(new AppError('Your account has been deactivated. Contact support.', 403));
		}

		const isPasswordMatch = await user.isPasswordCorrect(password);
		if (!isPasswordMatch) {
			return next(new AppError('Invalid email or password.', 401));
		}

		const { accessToken, refreshToken } = await issueTokenPair(user);

		// Update lastLoginAt without blocking the response
		User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).exec();

		// Refresh token lives only in the HttpOnly cookie
		res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

		return sendSuccess(res, 200, 'Login successful.', { user, accessToken });
	} catch (error) {
		return next(error);
	}
};

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

/**
 * Issues a new access token by validating the refresh token from the cookie.
 *
 * - Reads the refresh token from the HttpOnly cookie.
 * - Reads userId from req.body (sent by the client alongside the expired access token).
 * - Looks up the user and compares the token hash.
 * - Rotates both tokens (old refresh token is immediately invalidated).
 *
 * @type {import('express').RequestHandler}
 */
export const handleRefreshToken = async (req, res, next) => {
	try {
		const incomingRefreshToken = req.cookies?.refreshToken;
		const { userId } = req.body;

		if (!incomingRefreshToken || !userId) {
			return next(new AppError('Refresh token or user ID missing.', 401));
		}

		// Explicitly select refreshToken field (excluded by `select: false` in schema)
		const user = await User.findById(userId).select('+refreshToken');

		if (!user || !user.isActive) {
			return next(new AppError('Invalid or expired refresh token.', 401));
		}

		const isTokenValid = await user.isRefreshTokenValid(incomingRefreshToken);
		if (!isTokenValid) {
			// Token mismatch — may indicate token reuse after logout
			return next(new AppError('Invalid or expired refresh token.', 401));
		}

		// Rotate: issue fresh pair, overwrite stored hash
		const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(user);

		res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

		return sendSuccess(res, 200, 'Token refreshed successfully.', { accessToken });
	} catch (error) {
		return next(error);
	}
};

// ─── POST /auth/logout ────────────────────────────────────────────────────────

/**
 * Logs the user out by clearing the stored refresh token hash and the cookie.
 *
 * - Requires a valid access token (handled by verifyToken middleware).
 * - Clears the refreshToken field in the DB → old token immediately dead.
 * - Clears the HttpOnly cookie from the browser.
 *
 * @type {import('express').RequestHandler}
 */
export const handleLogout = async (req, res, next) => {
	try {
		// req.user is attached by verifyToken middleware
		const user = await User.findById(req.user.sub).select('+refreshToken');

		if (!user) {
			return next(new AppError('User not found.', 404));
		}

		await user.clearRefreshToken();

		res.clearCookie('refreshToken', getClearCookieOptions());

		return sendSuccess(res, 200, 'Logged out successfully.');
	} catch (error) {
		return next(error);
	}
};