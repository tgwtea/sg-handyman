import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoginLimiter } from '../utils/login-limiter.js';

test('login limiter locks after the maximum failures and unlocks after the window', () => {
  let time = 0;
  const limiter = createLoginLimiter({ max: 3, windowMs: 1000, now: () => time });
  for (let i = 0; i < 3; i++) {
    assert.equal(limiter.retryAfter('1.1.1.1', 'alice'), 0);
    limiter.fail('1.1.1.1', 'alice');
  }
  assert.equal(limiter.retryAfter('1.1.1.1', 'alice'), 1);
  assert.equal(limiter.retryAfter('1.1.1.1', 'ALICE'), 1, 'username case does not matter');
  assert.equal(limiter.retryAfter('2.2.2.2', 'alice'), 0, 'another IP address is not locked');
  time = 1000;
  assert.equal(limiter.retryAfter('1.1.1.1', 'alice'), 0);
});

test('a successful login clears the failures', () => {
  const limiter = createLoginLimiter({ max: 2, windowMs: 1000, now: () => 0 });
  limiter.fail('ip', 'bob');
  limiter.succeed('ip', 'bob');
  limiter.fail('ip', 'bob');
  assert.equal(limiter.retryAfter('ip', 'bob'), 0);
});
