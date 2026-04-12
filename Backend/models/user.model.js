/**
 * @file user.model.js
 * @description Mongoose schema and model for the User entity.
 *
 * Fields:
 *  - name         : Full display name
 *  - email        : Unique login identifier (stored lowercase)
 *  - password     : bcrypt-hashed (select: false — never returned by default)
 *  - role         : admin | manager | employee
 *  - companyId    : Multi-tenancy reference to Company collection
 *  - isActive     : Soft-delete / account suspension flag
 *  - refreshToken : Hashed refresh token (select: false)
 *  - lastLoginAt  : Timestamp of last successful login
 *
 * Indexes:
 *  - email (unique)   — fast auth lookups
 *  - companyId + role — efficient multi-tenant role queries
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// ─── Constants ────────────────────────────────────────────────────────────────

export const USER_ROLES = Object.freeze({
   ADMIN: 'admin',
   MANAGER: 'manager',
   EMPLOYEE: 'employee',
});

const BCRYPT_SALT_ROUNDS = 12;

// ─── Schema ───────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
   {
      /** Full display name of the user */
      name: {
         type: String,
         required: [true, 'Name is required'],
         trim: true,
         minlength: [2, 'Name must be at least 2 characters'],
         maxlength: [100, 'Name cannot exceed 100 characters'],
      },

      /** Primary login identifier — always stored lowercase */
      email: {
         type: String,
         required: [true, 'Email is required'],
         unique: true,
         lowercase: true,
         trim: true,
         match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
      },

      /**
       * Bcrypt-hashed password.
       * select: false → never included in query results unless explicitly requested
       * via .select('+password')
       */
      password: {
         type: String,
         required: [true, 'Password is required'],
         minlength: [8, 'Password must be at least 8 characters'],
         select: false,
      },

      /** Access level controlling route and resource permissions */
      role: {
         type: String,
         enum: {
            values: Object.values(USER_ROLES),
            message: `Role must be one of: ${Object.values(USER_ROLES).join(', ')}`,
         },
         default: USER_ROLES.EMPLOYEE,
      },

      /**
       * Reference to the Company collection.
       * Every user belongs to exactly one company (multi-tenancy).
       */
      companyId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Company',
         required: [true, 'Company ID is required'],
         index: true,
      },

      /** When false, the user cannot authenticate (suspended / soft-deleted) */
      isActive: {
         type: Boolean,
         default: true,
      },

      /**
       * Bcrypt-hashed refresh token for the active session.
       * Stored hashed so a DB breach cannot be used to forge sessions.
       * null = no active session.
       * select: false → never exposed in API responses.
       */
      refreshToken: {
         type: String,
         default: null,
         select: false,
      },

      /** Timestamp of the most recent successful login (audit trail) */
      lastLoginAt: {
         type: Date,
         default: null,
      },
   },
   {
      timestamps: true,  // createdAt + updatedAt
      versionKey: false,

      /**
       * Strip sensitive fields from any JSON / object serialisation.
       * Even if somehow selected, password and refreshToken won't appear in responses.
       */
      toJSON: {
         transform(_doc, ret) {
            delete ret.password;
            delete ret.refreshToken;
            return ret;
         },
      },
   }
);

// ─── Compound Index ───────────────────────────────────────────────────────────

/** Efficiently fetch all users of a given role within a company */
userSchema.index({ companyId: 1, role: 1 });

// ─── Pre-save Hook ────────────────────────────────────────────────────────────

/**
 * Hashes the password before saving IF it has been modified.
 * Covers both new user creation and password-reset flows.
 * Skips hashing when other fields are updated to avoid double-hashing.
 *
 * NOTE: Mongoose 7+ async hooks do NOT receive a `next` parameter.
 * Simply return early or throw — Mongoose handles both automatically.
 */
userSchema.pre('save', async function () {
   if (!this.isModified('password')) return;

   const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
   this.password = await bcrypt.hash(this.password, salt);
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Compares a plain-text candidate password against the stored bcrypt hash.
 *
 * @param {string} candidatePassword - Plain-text password from the login request.
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordCorrect = async function isPasswordCorrect(candidatePassword) {
   return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Checks whether the provided plain-text refresh token matches the stored hash.
 *
 * @param {string} candidateToken - Plain-text refresh token from the client.
 * @returns {Promise<boolean>}
 */
userSchema.methods.isRefreshTokenValid = async function isRefreshTokenValid(candidateToken) {
   if (!this.refreshToken) return false;
   return bcrypt.compare(candidateToken, this.refreshToken);
};

/**
 * Hashes and saves a new refresh token to the database.
 * Called after generating a token on login or token rotation.
 *
 * Uses $set via updateOne instead of this.save() to avoid re-triggering
 * the pre-save hook unnecessarily.
 *
 * @param {string} plainToken - The raw refresh token to hash and persist.
 * @returns {Promise<void>}
 */
userSchema.methods.saveRefreshToken = async function saveRefreshToken(plainToken) {
   const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
   const hashed = await bcrypt.hash(plainToken, salt);
   await this.constructor.updateOne({ _id: this._id }, { $set: { refreshToken: hashed } });
   this.refreshToken = hashed; // keep in-memory doc in sync
};

/**
 * Sets refreshToken to null, invalidating the current session.
 * Used during logout.
 *
 * Uses updateOne instead of this.save() to avoid re-triggering the pre-save hook.
 *
 * @returns {Promise<void>}
 */
userSchema.methods.clearRefreshToken = async function clearRefreshToken() {
   await this.constructor.updateOne({ _id: this._id }, { $set: { refreshToken: null } });
   this.refreshToken = null; // keep in-memory doc in sync
};

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Finds a user by email and explicitly includes the password field.
 * Used ONLY in the login flow where we need to compare passwords.
 *
 * @param {string} email
 * @returns {Promise<mongoose.Document|null>}
 */
userSchema.statics.findByEmailWithPassword = function findByEmailWithPassword(email) {
   return this.findOne({ email: email.toLowerCase().trim() }).select('+password');
};

// ─── Export ───────────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema);

export default User;
