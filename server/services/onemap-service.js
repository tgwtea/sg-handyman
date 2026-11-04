import tokenService, { OneMapAuthenticationError } from './onemap-token-service.js';

const BASE_URL = 'https://www.onemap.gov.sg';

function hasAuthenticationError(response, data) {
  const message = typeof data?.error === 'string' ? data.error : '';
  return response.status === 401
    || /token.*(?:expir|invalid|missing)|(?:expir|invalid|missing).*token|authentication.*(?:fail|requir)/i.test(message);
}

export function createOneMapService({
  tokens = tokenService,
  fetchImpl = globalThis.fetch,
  timeoutSignal = () => AbortSignal.timeout(8_000),
} = {}) {
  // GET a OneMap API path with the token; renews the token and retries once on an authentication error
  async function authorizedGet(path, params) {
    let token = await tokens.getToken();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetchImpl(`${BASE_URL}${path}?${new URLSearchParams(params)}`, {
        headers: { Authorization: token },
        signal: timeoutSignal(),
      });
      // HTTP 401 does not require a JSON body.
      const data = response.status === 401 ? null : await response.json();
      if (hasAuthenticationError(response, data)) {
        await tokens.invalidate(token);
        if (attempt === 1) throw new OneMapAuthenticationError();
        token = await tokens.getToken();
        continue;
      }
      if (!response.ok || !data || data.error) {
        throw new Error('OneMap request failed');
      }
      return data;
    }
  }

  return {
    // raw search results, as the map marker expects them
    async search(searchVal) {
      const data = await authorizedGet('/api/common/elastic/search', {
        searchVal, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: '1',
      });
      if (!Array.isArray(data.results)) throw new Error('OneMap search unavailable');
      return data;
    },

    // { lat, lng } of a 6-digit postal code, or null when OneMap has no match
    async geocodePostalCode(postalCode) {
      const { results } = await this.search(postalCode);
      const match = results.find((result) => result.POSTAL === postalCode) ?? results[0];
      if (!match) return null;
      return { lat: Number(match.LATITUDE), lng: Number(match.LONGITUDE) };
    },

    // driving distance in km between two { lat, lng } points
    async drivingDistanceKm(from, to) {
      const data = await authorizedGet('/api/public/routingsvc/route', {
        start: `${from.lat},${from.lng}`,
        end: `${to.lat},${to.lng}`,
        routeType: 'drive',
      });
      const metres = Number(data.route_summary?.total_distance);
      if (!Number.isFinite(metres)) throw new Error('OneMap route unavailable');
      return metres / 1000;
    },
  };
}

export default createOneMapService();
