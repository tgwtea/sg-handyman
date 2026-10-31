import test from 'node:test';
import assert from 'node:assert/strict';
import { createMongoTokenStore, createTokenService, OneMapAuthenticationError } from '../services/onemap-token-service.js';

// Exercise the production MongoDB filters against one shared document.
function memoryCollection(initial = null) {
  let document = initial && structuredClone(initial);
  const matches = (filter) => Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === 'object') {
      if ('$lte' in value) return document[key] <= value.$lte;
      if ('$gt' in value) return document[key] > value.$gt;
    }
    return document[key] === value;
  });
  return {
    async findOne() { return document && structuredClone(document); },
    async updateOne(filter, update, options = {}) {
      if (!document && options.upsert) {
        document = { _id: filter._id, ...update.$setOnInsert };
        return { matchedCount: 0, upsertedCount: 1 };
      }
      if (!document || !matches(filter)) return { matchedCount: 0 };
      Object.assign(document, update.$set);
      return { matchedCount: 1 };
    },
  };
}

function fixture(initial = null) {
  let time = 1_000_000;
  const collection = memoryCollection(initial);
  const store = createMongoTokenStore(() => collection);
  let calls = 0;
  const options = {
    store,
    now: () => time,
    sleep: async (ms) => { time += ms; },
    credentials: () => ({ email: 'test@example.com', password: 'secret' }),
    fetchImpl: async (url, request) => {
      calls += 1;
      assert.equal(url, 'https://www.onemap.gov.sg/api/auth/post/getToken');
      assert.equal(request.method, 'POST');
      assert.deepEqual(JSON.parse(request.body), { email: 'test@example.com', password: 'secret' });
      assert.ok(request.signal instanceof AbortSignal);
      return Response.json({ access_token: 'new-token', expiry_timestamp: String((time + 72 * 3600_000) / 1000) });
    },
  };
  return { collection, store, options, calls: () => calls, now: () => time, advance: (ms) => { time += ms; } };
}

const cached = (expiryTimestamp, extra = {}) => ({
  _id: 'onemap', token: 'old-token', expiryTimestamp, lockOwner: null, lockExpiresAt: 0, ...extra,
});

test('first request authenticates and stores a reusable token', async () => {
  const f = fixture();
  const service = createTokenService(f.options);
  assert.equal(await service.getToken(), 'new-token');
  assert.equal(await service.getToken(), 'new-token');
  assert.equal(f.calls(), 1);
  const document = await f.store.read();
  assert.equal(document.lockOwner, null);
  assert.equal(document.lockExpiresAt, 0);
});

test('valid shared token needs no credentials or authentication request', async () => {
  const f = fixture(cached(2000));
  const service = createTokenService({ ...f.options, credentials: () => ({}) });
  assert.equal(await service.getToken(), 'old-token');
  assert.equal(f.calls(), 0);
});

for (const expiry of [999, 1299, 1300]) {
  test(`renews expired or near-expiry token at ${expiry}`, async () => {
    const f = fixture(cached(expiry));
    assert.equal(await createTokenService(f.options).getToken(), 'new-token');
    assert.equal(f.calls(), 1);
  });
}

test('separate service instances share one renewal', async () => {
  const f = fixture();
  const a = createTokenService(f.options);
  const b = createTokenService(f.options);
  assert.deepEqual(await Promise.all([a.getToken(), b.getToken(), b.getToken()]), ['new-token', 'new-token', 'new-token']);
  assert.equal(f.calls(), 1);
});

test('an expired lock permits renewal', async () => {
  const f = fixture(cached(0, { lockOwner: 'dead-instance', lockExpiresAt: 999_999 }));
  assert.equal(await createTokenService(f.options).getToken(), 'new-token');
});

test('an active lock limits wait to ten seconds', async () => {
  const f = fixture(cached(0, { lockOwner: 'other-instance', lockExpiresAt: 1_015_000 }));
  await assert.rejects(createTokenService(f.options).getToken(), OneMapAuthenticationError);
  assert.equal(f.now(), 1_010_000);
  assert.equal(f.calls(), 0);
  assert.equal((await f.store.read()).lockOwner, 'other-instance');
});

test('conditional invalidation preserves a newer token', async () => {
  const f = fixture(cached(2000));
  const service = createTokenService(f.options);
  await service.invalidate('stale-token');
  assert.equal((await f.store.read()).expiryTimestamp, 2000);
  await service.invalidate('old-token');
  assert.equal((await f.store.read()).expiryTimestamp, 0);
  assert.equal(await service.getToken(), 'new-token');
});

test('lock owner and lease expiry protect token updates and release', async () => {
  const f = fixture();
  await f.store.initialize();
  assert.equal(await f.store.acquire('first', f.now()), true);
  assert.equal(await f.store.save('other', 'wrong', 2000, f.now()), false);
  await f.store.release('other');
  assert.equal((await f.store.read()).lockOwner, 'first');
  f.advance(15_000);
  assert.equal(await f.store.save('first', 'expired', 2000, f.now()), false);
  assert.equal(await f.store.acquire('second', f.now()), true);
  await f.store.release('first');
  assert.equal((await f.store.read()).lockOwner, 'second');
  assert.equal(await f.store.save('second', 'right', 2000, f.now()), true);
});

test('a stale reader cannot acquire a lock after another instance saves a valid token', async () => {
  const f = fixture(cached(2000));
  assert.equal(await f.store.acquire('stale-reader', f.now()), false);
});

for (const [name, overrides] of [
  ['missing credentials', { credentials: () => ({}) }],
  ['rejected credentials', { fetchImpl: async () => Response.json({ secret: 'hidden' }, { status: 401 }) }],
  ['invalid JSON', { fetchImpl: async () => new Response('not JSON') }],
  ['null response', { fetchImpl: async () => Response.json(null) }],
  ['missing token', { fetchImpl: async () => Response.json({ expiry_timestamp: 2000 }) }],
  ['blank token', { fetchImpl: async () => Response.json({ access_token: ' ', expiry_timestamp: 2000 }) }],
  ['invalid expiry', { fetchImpl: async () => Response.json({ access_token: 'secret', expiry_timestamp: 'bad' }) }],
  ['near expiry', { fetchImpl: async () => Response.json({ access_token: 'secret', expiry_timestamp: 1300 }) }],
  ['network failure', { fetchImpl: async () => { throw new Error('private upstream detail'); } }],
]) {
  test(`${name} returns a safe error and releases the lock`, async () => {
    const f = fixture();
    await assert.rejects(createTokenService({ ...f.options, ...overrides }).getToken(), {
      name: 'OneMapAuthenticationError', message: 'OneMap authentication unavailable',
    });
    assert.equal((await f.store.read()).lockOwner, null);
    assert.equal((await f.store.read()).token, null);
  });
}

test('authentication timeout aborts the request and releases the lock', async () => {
  const f = fixture();
  const service = createTokenService({
    ...f.options,
    timeoutSignal: () => AbortSignal.abort(new DOMException('Timed out', 'TimeoutError')),
    fetchImpl: async (_url, { signal }) => { signal.throwIfAborted(); },
  });
  await assert.rejects(service.getToken(), OneMapAuthenticationError);
  assert.equal((await f.store.read()).lockOwner, null);
});

test('database failures return safe authentication errors', async () => {
  const service = createTokenService({ store: {
    initialize: async () => { throw new Error('private database details'); },
    invalidate: async () => { throw new Error('private database details'); },
  } });
  await assert.rejects(service.getToken(), OneMapAuthenticationError);
  await assert.rejects(service.invalidate('secret'), OneMapAuthenticationError);
});
