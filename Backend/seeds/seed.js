/**
 * @file seed.js
 * @description Development seed script — wipes and re-populates the users
 * collection with a deterministic set of test accounts.
 *
 * Run at any time to reset the database to a known state:
 *   node seeds/seed.js
 *   # or add to package.json:  "seed": "node seeds/seed.js"
 *
 * Seeded accounts:
 * ┌──────────────────────────────┬───────────┬──────────────────────┐
 * │ Email                        │ Role      │ Password             │
 * ├──────────────────────────────┼───────────┼──────────────────────┤
 * │ admin@nagar.dev              │ admin     │ Admin@1234           │
 * │ manager.one@nagar.dev        │ manager   │ Manager@1234         │
 * │ manager.two@nagar.dev        │ manager   │ Manager@1234         │
 * │ alice@nagar.dev              │ employee  │ Employee@1234        │
 * │ bob@nagar.dev                │ employee  │ Employee@1234        │
 * │ carol@nagar.dev              │ employee  │ Employee@1234        │
 * └──────────────────────────────┴───────────┴──────────────────────┘
 *
 * Alice and Bob report to manager.one; Carol reports to manager.two.
 *
 * IMPORTANT: Never run this against a production database.
 * The script checks NODE_ENV and aborts if it detects 'production'.
 *
 * @module seeds/seed
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User, { USER_ROLES } from '../models/user.model.js';

dotenv.config();

// ─── Guard ────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
   console.error('🚫  Seed script must NOT be run in production. Aborting.');
   process.exit(1);
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

/**
 * A placeholder companyId used across all seeded users.
 * In a real multi-tenant setup this would come from an existing Company document.
 * Run seeds/seedCompany.js first if you've built the Company model.
 */
const SEED_COMPANY_ID = new mongoose.Types.ObjectId('000000000000000000000001');

/**
 * Pre-defined ObjectIds keep managerId references stable across re-seeds.
 */
const IDS = {
   admin: new mongoose.Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
   managerOne: new mongoose.Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
   managerTwo: new mongoose.Types.ObjectId('cccccccccccccccccccccccc'),
   alice: new mongoose.Types.ObjectId('dddddddddddddddddddddddd'),
   bob: new mongoose.Types.ObjectId('eeeeeeeeeeeeeeeeeeeeeeee'),
   carol: new mongoose.Types.ObjectId('ffffffffffffffffffffffff'),
};

/**
 * Seed user definitions.
 * Passwords are plain text here — they will be hashed by the pre-save hook.
 *
 * @type {Array<import('mongoose').Document>}
 */
const SEED_USERS = [
   // ── Admin ────────────────────────────────────────────────────────────────
   {
      _id: IDS.admin,
      name: 'Super Admin',
      email: 'admin@nagar.dev',
      password: 'Admin@1234',
      role: USER_ROLES.ADMIN,
      companyId: SEED_COMPANY_ID,
   },

   // ── Managers ─────────────────────────────────────────────────────────────
   {
      _id: IDS.managerOne,
      name: 'Manager One',
      email: 'manager.one@nagar.dev',
      password: 'Manager@1234',
      role: USER_ROLES.MANAGER,
      companyId: SEED_COMPANY_ID,
   },
   {
      _id: IDS.managerTwo,
      name: 'Manager Two',
      email: 'manager.two@nagar.dev',
      password: 'Manager@1234',
      role: USER_ROLES.MANAGER,
      companyId: SEED_COMPANY_ID,
   },

   // ── Employees ─────────────────────────────────────────────────────────────
   {
      _id: IDS.alice,
      name: 'Alice Johnson',
      email: 'alice@nagar.dev',
      password: 'Employee@1234',
      role: USER_ROLES.EMPLOYEE,
      companyId: SEED_COMPANY_ID,
      managerId: IDS.managerOne,
   },
   {
      _id: IDS.bob,
      name: 'Bob Smith',
      email: 'bob@nagar.dev',
      password: 'Employee@1234',
      role: USER_ROLES.EMPLOYEE,
      companyId: SEED_COMPANY_ID,
      managerId: IDS.managerOne,
   },
   {
      _id: IDS.carol,
      name: 'Carol Williams',
      email: 'carol@nagar.dev',
      password: 'Employee@1234',
      role: USER_ROLES.EMPLOYEE,
      companyId: SEED_COMPANY_ID,
      managerId: IDS.managerTwo,
   },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Connects to MongoDB, wipes the users collection, inserts seed users, and
 * disconnects. Safe to run repeatedly — each run produces the exact same state.
 *
 * @returns {Promise<void>}
 */
async function seed() {
   const uri = process.env.MONGO_URI;
   if (!uri) {
      throw new Error('MONGO_URI is not defined in your .env file.');
   }

   console.log('🔌  Connecting to MongoDB…');
   await mongoose.connect(uri);
   console.log('✅  Connected.\n');

   // ── Wipe existing users ──────────────────────────────────────────────────
   const deleted = await User.deleteMany({});
   console.log(`🗑️   Wiped ${deleted.deletedCount} existing user(s).`);

   // ── Insert seed users ────────────────────────────────────────────────────
   // Use individual save() calls (not insertMany) so the pre-save hook runs
   // and passwords are properly hashed.
   let created = 0;
   for (const userData of SEED_USERS) {
      const user = new User(userData);
      await user.save();
      console.log(`   ✓  ${user.role.padEnd(8)}  ${user.email}`);
      created++;
   }

   console.log(`\n🌱  Seeded ${created} user(s) successfully.\n`);

   // ── Print login credentials summary ─────────────────────────────────────
   console.log('─'.repeat(55));
   console.log('  Test credentials (all in development only)');
   console.log('─'.repeat(55));
   console.log('  admin@nagar.dev          →  Admin@1234');
   console.log('  manager.one@nagar.dev    →  Manager@1234');
   console.log('  manager.two@nagar.dev    →  Manager@1234');
   console.log('  alice@nagar.dev          →  Employee@1234');
   console.log('  bob@nagar.dev            →  Employee@1234');
   console.log('  carol@nagar.dev          →  Employee@1234');
   console.log('─'.repeat(55));
}

seed()
   .then(() => mongoose.disconnect())
   .catch((err) => {
      console.error('❌  Seed failed:', err.message);
      mongoose.disconnect().finally(() => process.exit(1));
   });
