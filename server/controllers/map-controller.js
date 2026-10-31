import tokenService, { OneMapAuthenticationError } from '../services/onemap-token-service.js';

function hasAuthenticationError(response, data) {
  const message = typeof data?.error === 'string' ? data.error : '';
  return response.status === 401
    || /token.*(?:expir|invalid|missing)|(?:expir|invalid|missing).*token|authentication.*(?:fail|requir)/i.test(message);
}

export function createMapController({
  tokens = tokenService,
  fetchImpl = globalThis.fetch,
  timeoutSignal = () => AbortSignal.timeout(8_000),
} = {}) {
  return {
    async fetchPostalCodeCoordinates(req, res) {
      const postalCode = req.params.postalCode;
      if (!postalCode || postalCode.length !== 6) {
        res.send('Invalid 6-digit postal code.');
        return;
      }
      try {
        let token = await tokens.getToken();
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const query = new URLSearchParams({ searchVal: postalCode, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: '1' });
          const response = await fetchImpl(`https://www.onemap.gov.sg/api/common/elastic/search?${query}`, {
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
          if (!response.ok || !data || data.error || !Array.isArray(data.results)) {
            throw new Error('OneMap search unavailable');
          }
          res.send(data.results.length ? data : 'No matching location found for this postal code.');
          return;
        }
      } catch (error) {
        const authenticationFailed = error instanceof OneMapAuthenticationError;
        res.status(authenticationFailed ? 503 : 502).send(authenticationFailed
          ? 'OneMap authentication unavailable.'
          : 'Failed to geocode postal code via OneMap');
      }
    },
  };
}

export default createMapController();
