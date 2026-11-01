import onemapService from './onemap-service.js';
import { haversineKm, isInSingapore } from '../utils/distance.js';

const CACHE_MS = 10 * 60 * 1000;
const POSTAL_CODE = /^\d{6}$/;

// 3 decimals is about 100 m, so visitors on the same street share one cache entry
function roundPoint({ lat, lng }) {
  return { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 };
}

// checks the request body: { postalCode } or { lat, lng } inside Singapore.
// Returns { postalCode } or { point }, or { error } with a message for a 400 reply.
export function parseLocationBody(body) {
  if (body?.postalCode !== undefined) {
    const postalCode = String(body.postalCode).trim();
    return POSTAL_CODE.test(postalCode) ? { postalCode } : { error: 'Postal code must be 6 digits' };
  }
  const point = { lat: Number(body?.lat), lng: Number(body?.lng) };
  if (body?.lat === undefined || body?.lng === undefined || !isInSingapore(point)) {
    return { error: 'Send a postal code, or a lat and lng inside Singapore' };
  }
  return { point };
}

export function createDistanceService({ onemap = onemapService, now = Date.now } = {}) {
  // key "lat,lng" -> { expiresAt, km: Map(companyId -> driving km) }
  const cache = new Map();

  function cachedRoutes(key) {
    const time = now();
    for (const [entryKey, entry] of cache) {
      if (entry.expiresAt <= time) cache.delete(entryKey);
    }
    if (!cache.has(key)) cache.set(key, { expiresAt: time + CACHE_MS, km: new Map() });
    return cache.get(key).km;
  }

  return {
    // { lat, lng } of a postal code, or null when OneMap has no match inside Singapore
    async locatePostalCode(postalCode) {
      const point = await onemap.geocodePostalCode(postalCode);
      return point && isInSingapore(point) ? point : null;
    },

    // Map(companyId -> { distanceKm, estimated }) for every company with a location.
    // A company whose driving route fails gets the straight-line distance, marked estimated.
    // Only driving distances go in the cache, so a failed route is tried again next time.
    async distancesFrom(userPoint, companies) {
      const from = roundPoint(userPoint);
      const routes = cachedRoutes(`${from.lat},${from.lng}`);
      const located = companies.filter((company) => isInSingapore(company.location ?? {}));

      const results = await Promise.allSettled(located.map(async (company) => {
        const id = String(company._id);
        if (!routes.has(id)) routes.set(id, await onemap.drivingDistanceKm(from, company.location));
        return routes.get(id);
      }));

      const distances = new Map();
      located.forEach((company, index) => {
        const result = results[index];
        distances.set(String(company._id), result.status === 'fulfilled'
          ? { distanceKm: result.value, estimated: false }
          : { distanceKm: haversineKm(from, company.location), estimated: true });
      });
      return distances;
    },
  };
}

export default createDistanceService();
