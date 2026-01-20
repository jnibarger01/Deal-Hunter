const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export const geocodeLocation = async (query) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const err = new Error('Missing Google Maps API key');
    err.status = 500;
    err.details = 'Set GOOGLE_MAPS_API_KEY in your environment.';
    throw err;
  }

  const url = new URL(GOOGLE_GEOCODE_URL);
  url.searchParams.set('address', query);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    const err = new Error('Google Maps geocoding failed');
    err.status = response.status;
    err.details = text;
    throw err;
  }

  const payload = await response.json();
  if (payload.status !== 'OK' || !payload.results?.length) {
    const err = new Error('No geocoding results found');
    err.status = 400;
    err.details = payload.status || 'ZERO_RESULTS';
    throw err;
  }

  const result = payload.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formatted: result.formatted_address
  };
};
