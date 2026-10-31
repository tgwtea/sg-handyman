/**
 * OneMap Token Manager
 *
 * Caches the access token in memory and automatically refreshes it before it
 * expires.  All callers share the same cached token so we never hit the auth
 * endpoint more than once per 72-hour window.
 *
 * API reference: https://www.onemap.gov.sg/apidocs/docs/tokenmanagement
 *
 * Endpoint  : POST https://www.onemap.gov.sg/api/auth/post/getToken
 * Body      : { email, password }
 * Response  : { access_token: "<JWT>", expiry_timestamp: "<unix-seconds-string>" }
 * Validity  : 72 hours (3 days)
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const TOKEN_ENDPOINT = 'https://www.onemap.gov.sg/api/auth/post/getToken';

// Refresh the token this many milliseconds before it actually expires so we
// never accidentally use a token that is about to expire in the middle of a
// request.
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/** @type {{ token: string, expiresAt: number } | null} */
let cache = null;

/** @type {Promise<string> | null} */
let pendingRefresh = null;

/**
 * Fetch a fresh token from OneMap and update the in-memory cache.
 * @returns {Promise<string>} The new access token.
 */
async function fetchNewToken() {
  const email = process.env.ONEMAP_API_EMAIL;
  const password = process.env.ONEMAP_API_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'ONEMAP_API_EMAIL and ONEMAP_API_PASSWORD must be set in the environment.'
    );
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `OneMap token request failed – HTTP ${response.status}: ${body}`
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(`OneMap token response missing access_token: ${JSON.stringify(data)}`);
  }

  // expiry_timestamp is a UNIX timestamp (seconds) returned as a string or number
  const expiresAtMs = Number(data.expiry_timestamp) * 1000;

  cache = { token: data.access_token, expiresAt: expiresAtMs };

  const expiresIn = Math.round((expiresAtMs - Date.now()) / 1000 / 60);
  console.log(`[OneMap] Token refreshed – expires in ~${expiresIn} minutes.`);

  return data.access_token;
}

/**
 * Returns a valid OneMap access token, refreshing it automatically if it is
 * expired or about to expire.
 *
 * Concurrent callers share a single in-flight refresh promise so we only send
 * one POST to the auth endpoint even when multiple requests arrive at the
 * exact moment the old token has expired.
 *
 * @returns {Promise<string>} A valid access token.
 */
export async function getOneMapToken() {
  const now = Date.now();

  // Cache hit: token is still valid with enough time left
  if (cache && now < cache.expiresAt - REFRESH_BUFFER_MS) {
    return cache.token;
  }

  // Avoid parallel refresh calls: reuse the in-flight promise if one exists
  if (!pendingRefresh) {
    pendingRefresh = fetchNewToken().finally(() => {
      pendingRefresh = null;
    });
  }

  return pendingRefresh;
}

/**
 * Invalidate the cached token (e.g. after a 401 response) so the next call
 * to getOneMapToken() triggers a fresh fetch.
 */
export function invalidateOneMapToken() {
  cache = null;
  console.log('[OneMap] Token invalidated – will refresh on next request.');
}
