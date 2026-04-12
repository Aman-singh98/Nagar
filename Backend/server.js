/**
 * @file server.js
 * @description Application entry point — DB connection and HTTP server startup.
 *
 * Responsibilities (intentionally minimal — business logic lives in app.js):
 *  1. Validate required environment variables before anything else runs.
 *  2. Connect to MongoDB.
 *  3. Start the HTTP server.
 *  4. Handle uncaught exceptions and unhandled rejections so the process
 *     never silently enters a broken state.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

// ─── Environment Validation ───────────────────────────────────────────────────

/**
 * Fail fast at startup if any required variable is missing.
 * Catches configuration mistakes before the app serves any traffic.
 */
const REQUIRED_ENV_VARS = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

REQUIRED_ENV_VARS.forEach((key) => {
   if (!process.env[key]) {
      console.error(`❌  Missing required environment variable: ${key}`);
      process.exit(1);
   }
});

// ─── Constants ────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

// ─── Process-level Error Guards ───────────────────────────────────────────────

/**
 * Catches synchronous errors that escape all try/catch blocks.
 * Logs the error and exits — the process manager (PM2 / Docker) restarts the app.
 */
process.on('uncaughtException', (error) => {
   console.error('❌  UNCAUGHT EXCEPTION — shutting down:', error);
   process.exit(1);
});

/**
 * Catches unhandled promise rejections (e.g., a missing .catch() on a Promise).
 * Exits so the process manager can restart with a clean state.
 */
process.on('unhandledRejection', (reason) => {
   console.error('❌  UNHANDLED REJECTION — shutting down:', reason);
   process.exit(1);
});

// ─── Startup ──────────────────────────────────────────────────────────────────

/**
 * Connects to MongoDB and then starts the HTTP server.
 * Keeping DB connection here (not in app.js) means app.js can be imported
 * in unit tests without establishing a real database connection.
 */
const startServer = async () => {
   try {
      await mongoose.connect(process.env.MONGO_URI, {
         serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB is unreachable
      });
      console.log('✅  MongoDB connected');

      app.listen(PORT, () => {
         console.log(`🚀  Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
         console.log(`📡  Health check → http://localhost:${PORT}/health`);
      });

   } catch (err) {
      console.error('❌  Startup error:', err.message);
      process.exit(1);
   }
};

startServer();
