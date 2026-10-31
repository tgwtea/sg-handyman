import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { createMapController } from '../controllers/map-controller.js';
import { OneMapAuthenticationError } from '../services/onemap-token-service.js';

const location = { results: [{ LATITUDE: '1.3521', LONGITUDE: '103.8198', ADDRESS: 'TEST ADDRESS', BUILDING: 'TEST' }], found: 1 };

async function invoke(overrides = {}, postalCode = '123456') {
  const invalidated = [];
  let tokenRequests = 0;
  const controller = createMapController({
    tokens: {
      getToken: async () => `token-${++tokenRequests}`,
      invalidate: async (token) => { invalidated.push(token); },
    },
    fetchImpl: async () => Response.json(location),
    ...overrides,
  });
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, send(body) { this.body = body; } };
  await controller.fetchPostalCodeCoordinates({ params: { postalCode } }, response);
  return { ...response, invalidated, tokenRequests };
}

test('search preserves marker coordinates and response metadata', async () => {
  const response = await invoke({ fetchImpl: async (url, options) => {
    assert.equal(new URL(url).searchParams.get('searchVal'), '123456');
    assert.equal(options.headers.Authorization, 'token-1');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(location);
  } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, location);
});

for (const firstResponse of [
  () => new Response('Unauthorized', { status: 401 }),
  () => Response.json({ error: 'Authentication token expired. Token is valid for 3 days.', ...location }),
  () => Response.json({ error: 'Invalid token' }, { status: 403 }),
]) {
  test('authentication failure renews and retries once', async () => {
    let requests = 0;
    const response = await invoke({ fetchImpl: async (_url, { headers }) => {
      requests += 1;
      assert.equal(headers.Authorization, `token-${requests}`);
      return requests === 1 ? firstResponse() : Response.json(location);
    } });
    assert.equal(requests, 2);
    assert.equal(response.tokenRequests, 2);
    assert.deepEqual(response.invalidated, ['token-1']);
    assert.deepEqual(response.body, location);
  });
}

test('second authentication failure returns 503 without a third request', async () => {
  let requests = 0;
  const response = await invoke({ fetchImpl: async () => {
    requests += 1;
    return new Response('', { status: 401 });
  } });
  assert.equal(requests, 2);
  assert.equal(response.tokenRequests, 2);
  assert.deepEqual(response.invalidated, ['token-1', 'token-2']);
  assert.equal(response.statusCode, 503);
});

test('renewal failure returns 503', async () => {
  let calls = 0;
  const response = await invoke({
    tokens: { getToken: async () => {
      if (++calls === 1) return 'old-token';
      throw new OneMapAuthenticationError();
    }, invalidate: async () => {} },
    fetchImpl: async () => new Response('', { status: 401 }),
  });
  assert.equal(calls, 2);
  assert.equal(response.statusCode, 503);
});

test('initial authentication failure returns 503 without search', async () => {
  const response = await invoke({ tokens: { getToken: async () => { throw new OneMapAuthenticationError(); } },
    fetchImpl: async () => assert.fail('Unexpected search request') });
  assert.equal(response.statusCode, 503);
});

for (const [name, fetchImpl] of [
  ['HTTP failure', async () => Response.json({ error: 'private upstream detail' }, { status: 500 })],
  ['invalid JSON', async () => new Response('private upstream detail')],
  ['invalid result', async () => Response.json({ unexpected: 'private upstream detail' })],
  ['network failure', async () => { throw new Error('private upstream detail'); }],
]) {
  test(`${name} returns 502 without retry or private details`, async () => {
    let requests = 0;
    const response = await invoke({ fetchImpl: async (...args) => { requests += 1; return fetchImpl(...args); } });
    assert.equal(response.statusCode, 502);
    assert.equal(requests, 1);
    assert.equal(response.body, 'Failed to geocode postal code via OneMap');
  });
}

test('search timeout returns 502', async () => {
  const response = await invoke({
    timeoutSignal: () => AbortSignal.abort(new DOMException('Timed out', 'TimeoutError')),
    fetchImpl: async (_url, { signal }) => { signal.throwIfAborted(); },
  });
  assert.equal(response.statusCode, 502);
});

test('empty results preserve the existing response', async () => {
  const response = await invoke({ fetchImpl: async () => Response.json({ results: [] }) });
  assert.equal(response.body, 'No matching location found for this postal code.');
});

test('invalid postal code does not request a token', async () => {
  const response = await invoke({}, '123');
  assert.equal(response.tokenRequests, 0);
  assert.equal(response.body, 'Invalid 6-digit postal code.');
});

test('HTTP route delivers the data used by the map marker', async () => {
  const app = express();
  const controller = createMapController({
    tokens: { getToken: async () => 'token' },
    fetchImpl: async () => Response.json(location),
  });
  app.get('/api/map/:postalCode', controller.fetchPostalCodeCoordinates);
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/map/123456`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), location);
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }
});
