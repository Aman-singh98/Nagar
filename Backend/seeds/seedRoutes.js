/**
 * @file seedRoutes.js
 * @description Seeds 2 sample routes (4 centers each) and assigns them to
 * the test employees created by the main seed.js script.
 *
 * Prerequisites: run `npm run seed` first to create users.
 *
 * Add to package.json:
 *   "seed:routes": "node src/seeds/seedRoutes.js"
 *
 * Run:
 *   npm run seed        ← users first
 *   npm run seed:routes ← then this
 *
 * Seeded data:
 * ┌──────────────────────────────────────────────────────────┐
 * │ Route              │ Centers │ Manager         │ Assigned │
 * ├──────────────────────────────────────────────────────────┤
 * │ Delhi North AM     │    4    │ manager.one     │ alice    │
 * │ Delhi South PM     │    4    │ manager.two     │ carol    │
 * └──────────────────────────────────────────────────────────┘
 *
 * Each route gets one Assignment for today (date of seeding).
 *
 * NEVER run against production — aborts if NODE_ENV === 'production'.
 *
 * @module seeds/seedRoutes
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Route from '../models/route.model.js';
import Assignment, { ASSIGNMENT_STATUS, VISIT_STATUS } from '../models/assignment.model.js';
import User from '../models/user.model.js';

dotenv.config();

// ─── Guard ────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
   console.error('🚫  Seed script must NOT be run in production. Aborting.');
   process.exit(1);
}

// ─── Stable IDs (must match seed.js) ─────────────────────────────────────────

const IDS = {
   companyId: new mongoose.Types.ObjectId('000000000000000000000001'),
   admin: new mongoose.Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
   managerOne: new mongoose.Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
   managerTwo: new mongoose.Types.ObjectId('cccccccccccccccccccccccc'),
   alice: new mongoose.Types.ObjectId('dddddddddddddddddddddddd'),
   carol: new mongoose.Types.ObjectId('ffffffffffffffffffffffff'),

   // Route IDs — stable so repeated seeding produces the same documents
   routeNorth: new mongoose.Types.ObjectId('1111111111111111111111aa'),
   routeSouth: new mongoose.Types.ObjectId('2222222222222222222222aa'),
};

// ─── Route Definitions ────────────────────────────────────────────────────────

const ROUTES = [
   {
      _id: IDS.routeNorth,
      name: 'Delhi North AM',
      companyId: IDS.companyId,
      managerId: IDS.managerOne,
      isActive: true,
      centers: [
         { name: 'Connaught Place Pharmacy', lat: 28.6315, lng: 77.2167, radius: 100, order: 1, address: 'Block A, Connaught Place, New Delhi' },
         { name: 'Karol Bagh Medical Store', lat: 28.6514, lng: 77.1907, radius: 150, order: 2, address: 'Ajmal Khan Rd, Karol Bagh' },
         { name: 'Patel Nagar Clinic', lat: 28.6538, lng: 77.1708, radius: 100, order: 3, address: 'West Patel Nagar, New Delhi' },
         { name: 'Rajendra Place Hospital', lat: 28.6435, lng: 77.1867, radius: 200, order: 4, address: 'Rajendra Place, New Delhi' },
      ],
   },
   {
      _id: IDS.routeSouth,
      name: 'Delhi South PM',
      companyId: IDS.companyId,
      managerId: IDS.managerTwo,
      isActive: true,
      centers: [
         { name: 'Saket Apollo Pharmacy', lat: 28.5244, lng: 77.2066, radius: 100, order: 1, address: 'Saket, South Delhi' },
         { name: 'Malviya Nagar Clinic', lat: 28.5355, lng: 77.2089, radius: 100, order: 2, address: 'Malviya Nagar, New Delhi' },
         { name: 'Greater Kailash MedPlus', lat: 28.5494, lng: 77.2378, radius: 150, order: 3, address: 'GK-1 Market, New Delhi' },
         { name: 'Lajpat Nagar Dispensary', lat: 28.5677, lng: 77.2432, radius: 100, order: 4, address: 'Central Market, Lajpat Nagar' },
      ],
   },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function seed() {
   const uri = process.env.MONGO_URI;
   if (!uri) throw new Error('MONGO_URI is not defined in your .env file.');

   console.log('🔌  Connecting to MongoDB…');
   await mongoose.connect(uri);
   console.log('✅  Connected.\n');

   // ── Wipe existing route + assignment data ────────────────────────────────
   const delRoutes = await Route.deleteMany({ companyId: IDS.companyId });
   const delAssign = await Assignment.deleteMany({ companyId: IDS.companyId });
   console.log(`🗑️   Wiped ${delRoutes.deletedCount} route(s) and ${delAssign.deletedCount} assignment(s).`);

   // ── Insert routes ────────────────────────────────────────────────────────
   console.log('\n📍  Seeding routes…');
   for (const routeData of ROUTES) {
      const route = new Route(routeData);
      await route.save();
      console.log(`   ✓  ${route.name}  (${route.centers.length} centers)`);
   }

   // ── Create today's assignments ────────────────────────────────────────────
   console.log('\n📋  Seeding assignments for today…');

   const today = new Date();
   today.setUTCHours(0, 0, 0, 0);

   const assignmentsToSeed = [
      { employeeId: IDS.alice, routeId: IDS.routeNorth, routeRef: ROUTES[0] },
      { employeeId: IDS.carol, routeId: IDS.routeSouth, routeRef: ROUTES[1] },
   ];

   for (const { employeeId, routeId, routeRef } of assignmentsToSeed) {
      const visitStatuses = [...routeRef.centers]
         .sort((a, b) => a.order - b.order)
         .map((c) => ({ centerId: c._id ?? new mongoose.Types.ObjectId(), status: VISIT_STATUS.PENDING }));

      const assignment = await Assignment.create({
         employeeId,
         routeId,
         companyId: IDS.companyId,
         date: today,
         status: ASSIGNMENT_STATUS.PENDING,
         visitStatuses,
         assignedBy: IDS.admin,
      });

      console.log(`   ✓  Employee ${employeeId} → ${routeRef.name}  (${visitStatuses.length} centers)`);
   }

   // ── Summary ───────────────────────────────────────────────────────────────
   console.log('\n─'.repeat(55));
   console.log('  Routes & Assignments seeded successfully.');
   console.log('─'.repeat(55));
   console.log('  Test with Postman:');
   console.log('  1. Login  →  POST /api/v1/auth/login');
   console.log('  2. Routes →  GET  /api/v1/routes');
   console.log('  3. Assign →  GET  /api/v1/assignments?date=' + today.toISOString().split('T')[0]);
   console.log('─'.repeat(55));
}

seed()
   .then(() => mongoose.disconnect())
   .catch((err) => {
      console.error('❌  Seed failed:', err.message);
      mongoose.disconnect().finally(() => process.exit(1));
   });
