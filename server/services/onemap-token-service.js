import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

const TOKEN_ID = 'onemap';
const RENEW_EARLY_MS = 5 * 60 * 1000;

export class OneMapAuthenticationError extends Error {
  constructor() {
    super('OneMap authentication unavailable');
    this.name = 'OneMapAuthenticationError';
  }
}

// Resolve the collection after server.js establishes the database connection.
export function createMongoTokenStore(collection = () => mongoose.connection.db.collection('service_tokens')) {
  return {
    async initialize() {
      try {
        await collection().updateOne({ _id: TOKEN_ID }, {
          $setOnInsert: { token: null, expiryTimestamp: 0, lockOwner: null, lockExpiresAt: 0 },
        }, { upsert: true });
      } catch (error) {
        // Another instance can create the singleton at the same time.
        if (error.code !== 11000) throw error;
      }
    },
    read: () => collection().findOne({ _id: TOKEN_ID }),
    async acquire(owner, now) {
      const result = await collection().updateOne({
        _id: TOKEN_ID,
        expiryTimestamp: { $lte: (now + RENEW_EARLY_MS) / 1000 },
        lockExpiresAt: { $lte: now },
      }, { $set: { lockOwner: owner, lockExpiresAt: now + 15_000 } });
      return result.matchedCount === 1;
    },
    async save(owner, token, expiryTimestamp, now) {
      const result = await collection().updateOne({
        _id: TOKEN_ID, lockOwner: owner, lockExpiresAt: { $gt: now },
      }, { $set: { token, expiryTimestamp } });
      return result.matchedCount === 1;
    },
    release: (owner) => collection().updateOne({ _id: TOKEN_ID, lockOwner: owner }, {
      $set: { lockOwner: null, lockExpiresAt: 0 },
    }),
    invalidate: (token) => collection().updateOne({ _id: TOKEN_ID, token }, {
      $set: { expiryTimestamp: 0 },
    }),
  };
}

export function createTokenService({
  store = createMongoTokenStore(),
  fetchImpl = globalThis.fetch,
  credentials = () => ({ email: process.env.ONEMAP_API_EMAIL, password: process.env.ONEMAP_API_PASSWORD }),
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutSignal = () => AbortSignal.timeout(8_000),
} = {}) {
  return {
    async getToken() {
      try {
        const deadline = now() + 10_000;
        await store.initialize();
        while (now() < deadline) {
          const cached = await store.read();
          if (cached?.token && cached.expiryTimestamp * 1000 > now() + RENEW_EARLY_MS) {
            return cached.token;
          }
          const owner = randomUUID();
          if (await store.acquire(owner, now())) {
            try {
              const { email, password } = credentials();
              if (!email || !password) throw new OneMapAuthenticationError();
              const response = await fetchImpl('https://www.onemap.gov.sg/api/auth/post/getToken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                signal: timeoutSignal(),
              });
              if (!response.ok) throw new OneMapAuthenticationError();
              const data = await response.json();
              const expiry = Number(data.expiry_timestamp);
              if (typeof data.access_token !== 'string' || !data.access_token.trim()
                || !Number.isFinite(expiry) || expiry * 1000 <= now() + RENEW_EARLY_MS) {
                throw new OneMapAuthenticationError();
              }
              if (await store.save(owner, data.access_token, expiry, now())) return data.access_token;
            } finally {
              await store.release(owner);
            }
          }
          await sleep(Math.min(250, Math.max(0, deadline - now())));
        }
        throw new OneMapAuthenticationError();
      } catch {
        // Never expose credentials, tokens, or database error details.
        throw new OneMapAuthenticationError();
      }
    },
    async invalidate(token) {
      try {
        await store.invalidate(token);
      } catch {
        throw new OneMapAuthenticationError();
      }
    },
  };
}

export default createTokenService();
