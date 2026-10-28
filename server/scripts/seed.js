// Rebuilds the whole database from seed-data.js: users, companies, reviews,
// timeslots and bookings. It deletes all existing data first, including forum
// posts and shop orders, because they point to user ids that change on every run.
// Usage: pnpm seed
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

import Company from '../models/company-model.js';
import User from '../models/user-model.js';
import Review from '../models/review-model.js';
import Timeslot from '../models/timeslot-model.js';
import Booking from '../models/booking-model.js';
import ForumPost from '../models/forum-model.js';
import Shop from '../models/shop-model.js';
import {
  TEST_PASSWORD,
  ADMIN_USERNAME,
  CUSTOMER_USERNAMES,
  TEST_USERS,
  COMPANIES,
  REVIEWS
} from './seed-data.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

const DAYS_AHEAD = 14;
const OPEN_HOUR = 9;       // 09:00 Singapore time
const CLOSE_HOUR = 18;     // last slot ends at 18:00
const SLOT_HOURS = 1;
const BOOKED_RATIO = 0.3;
const SGT_OFFSET_HOURS = 8;
const BCRYPT_ROUNDS = 10;

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

// weekday 1-hour slots for today and the next DAYS_AHEAD days (Singapore date)
// today's slots let an urgent repair find a same-day slot
function buildSlotTimes() {
  const now = new Date();
  const nowInSgt = new Date(now.getTime() + SGT_OFFSET_HOURS * 60 * 60 * 1000);
  const year = nowInSgt.getUTCFullYear();
  const month = nowInSgt.getUTCMonth();
  const day = nowInSgt.getUTCDate();

  const slots = [];
  for (let offset = 0; offset <= DAYS_AHEAD; offset++) {
    const weekday = new Date(Date.UTC(year, month, day + offset)).getUTCDay();
    if (weekday === 0 || weekday === 6) {
      continue;
    }
    for (let hour = OPEN_HOUR; hour + SLOT_HOURS <= CLOSE_HOUR; hour += SLOT_HOURS) {
      const start = new Date(Date.UTC(year, month, day + offset, hour - SGT_OFFSET_HOURS));
      // skip today's slots that already started
      if (start <= now) {
        continue;
      }
      slots.push({
        start,
        end: new Date(Date.UTC(year, month, day + offset, hour + SLOT_HOURS - SGT_OFFSET_HOURS))
      });
    }
  }
  return slots;
}

function serviceNames(company) {
  return company.services.flatMap((category) => category.details.map((detail) => detail.service));
}

// every seeded password is the username followed by "123"
async function buildUser(username, role, companyId, password = `${username}123`) {
  return {
    username,
    password: await bcrypt.hash(password, BCRYPT_ROUNDS),
    role,
    companyId
  };
}

async function deleteEverything() {
  await Booking.deleteAllBookings();
  await Timeslot.deleteAllTimeslots();
  await Review.deleteAllReviews();
  await ForumPost.deleteMany({});
  await Shop.deleteAllOrders();
  await User.deleteAllUsers();
  await Company.deleteAllCompanies();
}

async function seed() {
  await mongoose.connect(process.env.DB);
  console.log('MongoDB connected');

  await deleteEverything();
  await Booking.Booking.syncIndexes();
  await Timeslot.Timeslot.syncIndexes();

  const companies = await Company.insertManyCompanies(
    COMPANIES.map(({ owner, ...company }) => company)
  );
  const companyIdByName = new Map(companies.map((company) => [company.name, company._id]));

  const users = await User.insertManyUsers(await Promise.all([
    buildUser(ADMIN_USERNAME, 'admin'),
    ...COMPANIES.map((company) => buildUser(company.owner, 'business', companyIdByName.get(company.name))),
    ...CUSTOMER_USERNAMES.map((username) => buildUser(username, 'customer')),
    ...TEST_USERS.map((user) => buildUser(user.username, user.role, companyIdByName.get(user.companyName), TEST_PASSWORD))
  ]));
  const userIdByName = new Map(users.map((user) => [user.username, user._id]));
  const customers = users.filter((user) => CUSTOMER_USERNAMES.includes(user.username));

  const reviews = await Review.insertManyReviews(
    REVIEWS.map(([companyName, username, rating, comment, date]) => ({
      companyId: companyIdByName.get(companyName),
      userId: userIdByName.get(username),
      rating,
      comment,
      createdAt: new Date(date)
    }))
  );

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

  console.log(`Seeded ${users.length} users, ${companies.length} companies, ${reviews.length} reviews, `
    + `${timeslots.length} timeslots and ${bookings.length} bookings`);
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
