const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// straight-line ("as the crow flies") distance in km between two { lat, lng } points
export function haversineKm(from, to) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// Singapore's bounding box; a point outside it is not a Singapore location
export function isInSingapore({ lat, lng }) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 1.15 && lat <= 1.48 && lng >= 103.6 && lng <= 104.1;
}
