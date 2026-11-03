// Needs a separate test database: TEST_DB=mongodb://localhost:27017/handyman_test pnpm test:timeslots
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import '../models/company-model.js';
import '../models/timeslot-model.js';
import '../models/booking-model.js';
import '../models/review-model.js';
import timeslotController from '../controllers/timeslot-controller.js';
import bookingController from '../controllers/booking-controller.js';

const HOUR = 60 * 60 * 1000;
const companyId = new mongoose.Types.ObjectId();
const otherCompanyId = new mongoose.Types.ObjectId();

const business = { _id: String(new mongoose.Types.ObjectId()), role: 'business', companyId: String(companyId) };
const otherBusiness = { _id: String(new mongoose.Types.ObjectId()), role: 'business', companyId: String(otherCompanyId) };
const alice = { _id: String(new mongoose.Types.ObjectId()), role: 'customer' };
const bob = { _id: String(new mongoose.Types.ObjectId()), role: 'customer' };
const admin = { _id: String(new mongoose.Types.ObjectId()), role: 'admin' };

// calls a controller like Express would and returns the status code and body
async function call(handler, user, { body = {}, params = {} } = {}) {
  const res = {
    code: 200,
    status(code) { this.code = code; return this; },
    send(data) { this.body = data; return this; }
  };
  await handler({ session: { user }, body, params }, res);
  return res;
}

async function createSlot(hoursFromNow = 24, user = business) {
  const start = new Date(Date.now() + hoursFromNow * HOUR);
  const end = new Date(start.getTime() + HOUR);
  return call(timeslotController.createTimeslot, user, { body: { companyId: String(companyId), start, end } });
}

before(async () => {
  const uri = process.env.TEST_DB ?? '';
  const name = uri.split('/').pop().split('?')[0];
  if (!name.endsWith('_test')) {
    throw new Error('Set TEST_DB to a database whose name ends in _test');
  }
  await mongoose.connect(uri);
  await mongoose.model('Company').deleteMany({});
  await mongoose.model('Company').create([
    { _id: companyId, name: 'Test Repair' },
    { _id: otherCompanyId, name: 'Other Repair' }
  ]);
  for (const name of ['Timeslot', 'Booking', 'Review']) {
    await mongoose.model(name).createIndexes();
  }
});

beforeEach(async () => {
  for (const name of ['Timeslot', 'Booking', 'Review']) {
    await mongoose.model(name).deleteMany({});
  }
});

after(async () => {
  await mongoose.disconnect();
});

test('two customers book the same slot at once: only one gets it', async () => {
  const slot = (await createSlot()).body;
  const results = await Promise.all([
    call(bookingController.createBooking, alice, { body: { timeslotId: String(slot._id) } }),
    call(bookingController.createBooking, bob, { body: { timeslotId: String(slot._id) } })
  ]);
  assert.deepEqual(results.map((r) => r.code).sort(), [201, 409]);
  assert.equal(await mongoose.model('Booking').countDocuments(), 1);
});

test('a business cannot add a slot to another company', async () => {
  const res = await createSlot(24, otherBusiness);
  assert.equal(res.code, 403);
  assert.equal(await mongoose.model('Timeslot').countDocuments(), 0);
});

test('an overlapping slot is rejected but the next slot is accepted', async () => {
  assert.equal((await createSlot(24)).code, 201);
  assert.equal((await createSlot(24.5)).code, 409);
  assert.equal((await createSlot(25)).code, 201);
});

test('a booked slot cannot be edited or deleted', async () => {
  const slot = (await createSlot()).body;
  await call(bookingController.createBooking, alice, { body: { timeslotId: String(slot._id) } });
  const params = { timeslotId: String(slot._id) };
  const start = new Date(Date.now() + 48 * HOUR);
  const end = new Date(start.getTime() + HOUR);

  assert.equal((await call(timeslotController.updateTimeslot, business, { params, body: { start, end } })).code, 409);
  assert.equal((await call(timeslotController.deleteTimeslot, business, { params })).code, 409);
  assert.equal(await mongoose.model('Timeslot').countDocuments(), 1);
});

test('only the owner can cancel a future booking; an admin can cancel a past one', async () => {
  const slot = (await createSlot()).body;
  const booking = (await call(bookingController.createBooking, alice, { body: { timeslotId: String(slot._id) } })).body;
  await mongoose.model('Review').create({ userId: alice._id, companyId, bookingId: booking._id, rating: 5 });
  const params = { bookingId: String(booking._id) };

  assert.equal((await call(bookingController.cancelBooking, bob, { params })).code, 403);

  await mongoose.model('Timeslot').updateOne({ _id: slot._id }, { start: new Date(Date.now() - HOUR) });
  assert.equal((await call(bookingController.cancelBooking, alice, { params })).code, 409);

  assert.equal((await call(bookingController.cancelBooking, admin, { params })).code, 200);
  assert.equal(await mongoose.model('Booking').countDocuments(), 0);
  assert.equal(await mongoose.model('Review').countDocuments(), 0);
});
