import test from 'node:test';
import assert from 'node:assert/strict';
import { createDistanceService, parseLocationBody } from '../services/distance-service.js';
import { haversineKm, isInSingapore } from '../utils/distance.js';

const user = { lat: 1.3694, lng: 103.8485 };          // Ang Mo Kio
const companies = [
  { _id: 'a', location: { lat: 1.2824, lng: 103.8584 } },  // Marina Bay
  { _id: 'b', location: { lat: 1.4360, lng: 103.7860 } },  // Woodlands
  { _id: 'c' },                                            // no stored location
];

function fakeOneMap(overrides = {}) {
  const calls = [];
  return {
    calls,
    drivingDistanceKm: async (from, to) => {
      calls.push(to);
      return to.lat === 1.2824 ? 11.8 : 9.4;
    },
    ...overrides,
  };
}

test('haversine gives the straight-line distance in km', () => {
  assert.equal(haversineKm(user, user), 0);
  const km = haversineKm(user, companies[0].location);
  assert.ok(km > 9.5 && km < 10, `expected about 9.7 km, got ${km}`);
});

test('Singapore bounds reject points outside and non-numbers', () => {
  assert.ok(isInSingapore(user));
  assert.ok(!isInSingapore({ lat: 3.139, lng: 101.687 }));  // Kuala Lumpur
  assert.ok(!isInSingapore({ lat: NaN, lng: 103.8 }));
  assert.ok(!isInSingapore({}));
});

test('body parser accepts a postal code or Singapore coordinates only', () => {
  assert.deepEqual(parseLocationBody({ postalCode: ' 569933 ' }), { postalCode: '569933' });
  assert.deepEqual(parseLocationBody({ lat: '1.3694', lng: 103.8485 }), { point: user });
  for (const body of [{ postalCode: '5699' }, { postalCode: 'abcdef' }, { lat: 3.1, lng: 101.6 },
    { lat: 1.36 }, {}, undefined, { lat: null, lng: null }]) {
    assert.ok(parseLocationBody(body).error, `expected an error for ${JSON.stringify(body)}`);
  }
});

test('driving distances for every company with a location', async () => {
  const onemap = fakeOneMap();
  const distances = await createDistanceService({ onemap }).distancesFrom(user, companies);
  assert.deepEqual(distances.get('a'), { distanceKm: 11.8, estimated: false });
  assert.deepEqual(distances.get('b'), { distanceKm: 9.4, estimated: false });
  assert.equal(distances.has('c'), false);
});

test('a failed route falls back to the straight-line distance', async () => {
  const onemap = fakeOneMap({
    drivingDistanceKm: async (from, to) => {
      if (to.lat === 1.2824) throw new Error('timeout');
      return 9.4;
    },
  });
  const distances = await createDistanceService({ onemap }).distancesFrom(user, companies);
  assert.equal(distances.get('a').estimated, true);
  assert.ok(Math.abs(distances.get('a').distanceKm - haversineKm({ lat: 1.369, lng: 103.849 }, companies[0].location)) < 1e-9);
  assert.deepEqual(distances.get('b'), { distanceKm: 9.4, estimated: false });
});

test('a nearby point reuses the cache; a failed route is retried', async () => {
  let fail = true;
  const onemap = fakeOneMap();
  const original = onemap.drivingDistanceKm;
  onemap.drivingDistanceKm = async (from, to) => {
    if (fail && to.lat === 1.2824) { onemap.calls.push(to); throw new Error('timeout'); }
    return original(from, to);
  };
  const service = createDistanceService({ onemap });

  await service.distancesFrom(user, companies);
  assert.equal(onemap.calls.length, 2);

  fail = false;
  // about 15 m away: same 3-decimal key, so only the failed route is called again
  const distances = await service.distancesFrom({ lat: 1.36942, lng: 103.84862 }, companies);
  assert.equal(onemap.calls.length, 3);
  assert.deepEqual(distances.get('a'), { distanceKm: 11.8, estimated: false });
});

test('the cache expires after 10 minutes', async () => {
  let time = 0;
  const onemap = fakeOneMap();
  const service = createDistanceService({ onemap, now: () => time });
  await service.distancesFrom(user, companies);
  time = 9 * 60 * 1000;
  await service.distancesFrom(user, companies);
  assert.equal(onemap.calls.length, 2);
  time = 11 * 60 * 1000;
  await service.distancesFrom(user, companies);
  assert.equal(onemap.calls.length, 4);
});

test('a postal code outside Singapore is treated as no match', async () => {
  const service = createDistanceService({ onemap: { geocodePostalCode: async () => ({ lat: 0, lng: 0 }) } });
  assert.equal(await service.locatePostalCode('000000'), null);
});
