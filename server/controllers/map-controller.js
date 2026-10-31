import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import { getOneMapToken, invalidateOneMapToken } from '../services/onemap-token.js';

const mapController = {};

// Programmatically fetch coordinates from OneMap API and update the map marker
mapController.fetchPostalCodeCoordinates = async (req, res) => {
  let postalCode = req.params.postalCode;
  console.log(postalCode);

  if (!postalCode || postalCode.length !== 6) {
    res.send('Invalid 6-digit postal code.');
    return;
  }

  const targetUrl = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  try {
    // 1. Query the OneMap Elastic Search API using the postal code string.
    //    getOneMapToken() returns a cached token and auto-refreshes it when
    //    it is expired or about to expire.
    const data = await queryOneMap(targetUrl);

    if (data.results && data.results.length > 0) {
      res.send(data);
      // console.log('server map data:', data)
    } else {
      res.send('No matching location found for this postal code.');
      console.log('No matching location found for this postal code.');
    }
  } catch (error) {
    res.send('Failed to geocode postal code via OneMap');
    console.error('Failed to geocode postal code via OneMap:', error);
  }
}

/**
 * Call a OneMap API endpoint with automatic token refresh on 401 responses.
 *
 * Strategy (per https://www.onemap.gov.sg/apidocs/docs/tokenmanagement):
 *  1. Get a valid token from the in-memory cache (refreshing proactively when
 *     the token is close to expiry).
 *  2. If the API returns 401 (token unexpectedly expired/revoked), invalidate
 *     the cache, fetch a fresh token, and retry the request once.
 *
 * @param {string} url  The OneMap API URL to call.
 * @returns {Promise<object>} Parsed JSON response body.
 */
async function queryOneMap(url) {
  let token = await getOneMapToken();

  let response = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': token },
  });

  // If the token was rejected, invalidate the cache, get a fresh one, and
  // retry exactly once to avoid infinite loops.
  if (response.status === 401) {
    console.warn('[OneMap] Received 401 – refreshing token and retrying.');
    invalidateOneMapToken();
    token = await getOneMapToken();

    response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': token },
    });
  }

  if (!response.ok) {
    throw new Error(`OneMap API responded with HTTP ${response.status}`);
  }

  return response.json();
}


export default mapController;
