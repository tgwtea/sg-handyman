import { OneMapAuthenticationError } from '../services/onemap-token-service.js';
import { createOneMapService } from '../services/onemap-service.js';

export function createMapController(options = {}) {
  const onemap = createOneMapService(options);
  return {
    async fetchPostalCodeCoordinates(req, res) {
      const postalCode = req.params.postalCode;
      if (!postalCode || postalCode.length !== 6) {
        res.send('Invalid 6-digit postal code.');
        return;
      }
      try {
        const data = await onemap.search(postalCode);
        res.send(data.results.length ? data : 'No matching location found for this postal code.');
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
