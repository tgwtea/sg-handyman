// Seeds timeslots and bookings. Safe to re-run: it clears both collections first.
// Usage: pnpm seed
//        pnpm seed --with-test-users   (also adds the TEST_USERS below, for local testing only)
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

import Company from '../models/company-model.js';
import User from '../models/user-model.js';
import Timeslot from '../models/timeslot-model.js';
import Booking from '../models/booking-model.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const DAYS_AHEAD = 14;
const OPEN_HOUR = 9;       // 09:00 Singapore time
const CLOSE_HOUR = 18;     // last slot ends at 18:00
const SLOT_HOURS = 1;
const BOOKED_RATIO = 0.3;
const SGT_OFFSET_HOURS = 8;

const BUSINESS_OWNERS = {
  tanrepair: 'Tan Repair',
  lioncityplumbing: 'Lion City Plumbing Works',
  coolbreeze: 'CoolBreeze Aircon Services',
  brightspark: 'BrightSpark Electrical'
};

// local test accounts, created only with --with-test-users
const TEST_PASSWORD = 'test-password-123';
const TEST_USERS = [
  { username: 'test-customer-1', role: 'customer' },
  { username: 'test-customer-2', role: 'customer' },
  { username: 'test-business', role: 'business', companyName: 'Tan Repair' }
];

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

// weekday 1-hour slots for the next DAYS_AHEAD days, starting tomorrow (Singapore date)
function buildSlotTimes() {
  const nowInSgt = new Date(Date.now() + SGT_OFFSET_HOURS * 60 * 60 * 1000);
  const year = nowInSgt.getUTCFullYear();
  const month = nowInSgt.getUTCMonth();
  const day = nowInSgt.getUTCDate();

  const slots = [];
  for (let offset = 1; offset <= DAYS_AHEAD; offset++) {
    const weekday = new Date(Date.UTC(year, month, day + offset)).getUTCDay();
    if (weekday === 0 || weekday === 6) {
      continue;
    }
    for (let hour = OPEN_HOUR; hour + SLOT_HOURS <= CLOSE_HOUR; hour += SLOT_HOURS) {
      slots.push({
        start: new Date(Date.UTC(year, month, day + offset, hour - SGT_OFFSET_HOURS)),
        end: new Date(Date.UTC(year, month, day + offset, hour + SLOT_HOURS - SGT_OFFSET_HOURS))
      });
    }
  }
  return slots;
}

function serviceNames(company) {
  const names = company.services.flatMap((category) => category.details.map((detail) => detail.service));
  return names.length > 0 ? names : ['General service'];
}

async function seed() {
  await mongoose.connect(process.env.DB);
  console.log('MongoDB connected');

  await Booking.deleteAllBookings();
  await Timeslot.deleteAllTimeslots();
  await Booking.Booking.syncIndexes();
  await Timeslot.Timeslot.syncIndexes();

  const companies = await Company.findAllCompanies();
  const customers = await User.findUsersByRole('customer');
  if (customers.length === 0) {
    throw new Error('No customer users found');
  }

  const slotTimes = buildSlotTimes();
  const timeslots = await Timeslot.insertManyTimeslots(
    companies.flatMap((company) => slotTimes.map((time) => ({ companyId: company._id, ...time })))
  );

  const companiesById = new Map(companies.map((company) => [String(company._id), company]));
  const bookings = timeslots
    .filter(() => Math.random() < BOOKED_RATIO)
    .map((slot) => ({
      timeslotId: slot._id,
      companyId: slot.companyId,
      userId: pickRandom(customers)._id,
      service: pickRandom(serviceNames(companiesById.get(String(slot.companyId))))
    }));
  await Booking.insertManyBookings(bookings);

  for (const [username, companyName] of Object.entries(BUSINESS_OWNERS)) {
    const company = companies.find((item) => item.name === companyName);
    if (!company) {
      console.warn(`Company "${companyName}" not found, skipped ${username}`);
      continue;
    }
    await User.setCompanyId(username, company._id);
  }

  if (process.argv.includes('--with-test-users')) {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    for (const testUser of TEST_USERS) {
      const company = companies.find((item) => item.name === testUser.companyName);
      await User.upsertUser({
        username: testUser.username,
        password: passwordHash,
        role: testUser.role,
        companyId: company?._id
      });
    }
    console.log(`Test users: ${TEST_USERS.map((user) => user.username).join(', ')}`);
  }

  console.log(`Seeded ${timeslots.length} timeslots and ${bookings.length} bookings for ${companies.length} companies`);
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
