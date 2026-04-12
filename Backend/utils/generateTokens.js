/**
 * @file generateTokens.js
 * @description JWT and refresh token generation utilities.
 *
 * Access token  : Signed JWT (1 hour) — stateless, verified by middleware.
 * Refresh token : Cryptographically random opaque string (30 days) — stateful,
 *                 stored as a bcrypt hash in the DB so the server controls invalidation.
 *
 * Using an opaque refresh token (rather than a JWT) means:
 *  1. Its payload cannot be inspected or forged.
 *  2. Invalidation is instant — clear the DB hash and the token is dead.
 *  3. A compromised DB does not yield usable refresh tokens.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ─── Access Token ─────────────────────────────────────────────────────────────

/**
 * Generates a signed JWT access token for the given user.
 * Payload is intentionally minimal — include only what middleware needs.
 *
 * @param {object} user             - Mongoose user document.
 * @param {string} user._id         - User's MongoDB ObjectId.
 * @param {string} user.email       - User's email address.
 * @param {string} user.role        - User's role (admin | manager | employee).
 * @param {string} user.companyId   - User's company ObjectId.
 * @returns {string} Signed JWT string.
 */
export const generateAccessToken = (user) => {
   const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId.toString(),
   };

   return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: '1h',
      algorithm: 'HS256',
   });
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random opaque refresh token.
 * This is NOT a JWT — it has no embedded payload and cannot be decoded.
 * The server validates it by comparing its hash against the stored DB value.
 *
 * @returns {string} 128-character hex string (64 bytes of entropy).
 */
export const generateRefreshToken = () =>
   crypto.randomBytes(64).toString('hex');

// ─── Convenience: Issue Both ──────────────────────────────────────────────────

/**
 * Generates both tokens, persists the hashed refresh token to the DB,
 * and returns both plain-text tokens for the response / cookie.
 *
 * @param {mongoose.Document} user - The authenticated user document.
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
export const issueTokenPair = async (user) => {
   const accessToken = generateAccessToken(user);
   const refreshToken = generateRefreshToken();

   // saveRefreshToken hashes before writing — defined in user.model.js
   await user.saveRefreshToken(refreshToken);

   return { accessToken, refreshToken };
};
