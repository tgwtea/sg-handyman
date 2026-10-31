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
const OPEN_HOURS = [8, 9, 10];       // Singapore time
const CLOSE_HOURS = [17, 18, 19];    // before 20:00, where E2E tests make their own slots
const LUNCH_HOURS = [12, 13];
const LUNCH_MINUTES = [30, 60];
const SATURDAY_RATIO = 0.5;
const DAY_OFF_RATIO = 0.5;           // chance that a company closes on one more weekday
const BOOKED_RATIO = 0.3;
const SGT_OFFSET_HOURS = 8;
const BCRYPT_ROUNDS = 10;

// slot lengths in hours for each service category; FULL_DAY is opening to closing
const FULL_DAY = 'full';
const DEFAULT_SLOT_HOURS = [1, 2];
const SLOT_HOURS_BY_CATEGORY = {
  'Aircon Servicing': [1],
  'Aircon Repair': [1, 2],
  'Aircon Installation': [3, 4],
  'Basins & Taps': [1, 2],
  'Toilets': [1, 2],
  'Floor Traps & Drains': [1, 2],
  'Water Heaters': [1, 2],
  'Piping': [2, 3],
  'Bathroom Works': [4, FULL_DAY],
  'Floor Tiles': [4, FULL_DAY],
  'Floors & Floor Traps': [2, 4],
  'Cabinets': [2, 4],
  'Cabinets & Wardrobes': [4, FULL_DAY],
  'Furniture': [2, 3],
  'Doors & Locksets': [1, 2],
  'Windows & Glass': [2],
  'Emergency Lockout': [1],
  'Locks & Digital Locks': [1, 2],
  'Safes': [1, 2],
  'Lighting': [1, 2],
  'Power & Sockets': [1, 2],
  'Distribution Board': [2, 3],
  'Smart Home': [2, 3],
  'Mounting & Installation': [1, 2],
  'Curtains & Blinds': [1, 2],
  'Mosquito Nets': [1],
  'General Handyman': [1, 2],
  'Interior Painting': [4, FULL_DAY],
  'Exterior Painting': [FULL_DAY],
  'Wallpaper': [4, FULL_DAY],
  'Touch-Ups & Patching': [2],
  'Pest Control': [1]
};

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

// fixed per company: working hours and open weekdays (0 = Sunday)
function buildSchedule() {
  const weekdays = [1, 2, 3, 4, 5];
  if (Math.random() < DAY_OFF_RATIO) {
    weekdays.splice(Math.floor(Math.random() * weekdays.length), 1);
  }
  if (Math.random() < SATURDAY_RATIO) {
    weekdays.push(6);
  }
  return { openHour: pickRandom(OPEN_HOURS), closeHour: pickRandom(CLOSE_HOURS), weekdays };
}

// a random category of the company, then a random length for that category
function pickSlotHours(company) {
  const category = pickRandom(company.services)?.category;
  return pickRandom(SLOT_HOURS_BY_CATEGORY[category] ?? DEFAULT_SLOT_HOURS);
}

// back-to-back slots in minutes after midnight; no slot crosses the lunch gap or closing time
function buildDaySlots(company, schedule) {
  const open = schedule.openHour * 60;
  const close = schedule.closeHour * 60;
  const lunchStart = pickRandom(LUNCH_HOURS) * 60;
  const lunchEnd = lunchStart + pickRandom(LUNCH_MINUTES);

  const slots = [];
  let cursor = open;
  while (cursor < close) {
    const hours = pickSlotHours(company);
    if (hours === FULL_DAY) {
      // a full-day job takes the whole day, so the crew skips the lunch gap
      if (cursor === open) {
        slots.push({ start: open, end: close });
      }
      break;
    }
    const end = cursor + hours * 60;
    if (cursor < lunchEnd && end > lunchStart) {
      cursor = lunchEnd;
      continue;
    }
    if (end > close) {
      break;
    }
    slots.push({ start: cursor, end });
    cursor = end;
  }
  return slots;
}

// slots of one company for today and the next DAYS_AHEAD days (Singapore date)
// today's slots let an urgent repair find a same-day slot
function buildSlotTimes(company) {
  const schedule = buildSchedule();
  const now = new Date();
  const nowInSgt = new Date(now.getTime() + SGT_OFFSET_HOURS * 60 * 60 * 1000);
  const year = nowInSgt.getUTCFullYear();
  const month = nowInSgt.getUTCMonth();
  const day = nowInSgt.getUTCDate();
  const toDate = (offset, minutes) =>
    new Date(Date.UTC(year, month, day + offset, 0, minutes - SGT_OFFSET_HOURS * 60));

  const slots = [];
  for (let offset = 0; offset <= DAYS_AHEAD; offset++) {
    const weekday = new Date(Date.UTC(year, month, day + offset)).getUTCDay();
    if (!schedule.weekdays.includes(weekday)) {
      continue;
    }
    for (const slot of buildDaySlots(company, schedule)) {
      const start = toDate(offset, slot.start);
      // skip today's slots that already started
      if (start <= now) {
        continue;
      }
      slots.push({ start, end: toDate(offset, slot.end) });
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
  await ForumPost.deleteAllForumPosts();
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

  const timeslots = await Timeslot.insertManyTimeslots(
    companies.flatMap((company) => buildSlotTimes(company).map((time) => ({ companyId: company._id, ...time })))
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
