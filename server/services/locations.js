import { geocodeLocation } from './maps.js';

const locations = [];
let nextId = 1;

const normalizeFilters = (filters) => {
  if (!filters || typeof filters !== 'object') return {};
  return {
    categories: Array.isArray(filters.categories) ? filters.categories : undefined,
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    condition: Array.isArray(filters.condition) ? filters.condition : undefined
  };
};

const ensureLatLng = async ({ label, city, zip, lat, lng }) => {
  if (lat != null && lng != null) {
    return { lat, lng, formatted: label || city || zip || 'Custom location' };
  }

  const query = zip || city;
  if (!query) {
    const err = new Error('Location requires lat/lng or city/zip');
    err.status = 400;
    throw err;
  }

  return geocodeLocation(query);
};

export const listLocations = () => locations;

export const getLocationById = (id) => locations.find((item) => item.id === id) || null;

export const createLocation = async (payload) => {
  const {
    label,
    city,
    zip,
    lat,
    lng,
    radiusMiles = 25,
    filters
  } = payload;

  const geocoded = await ensureLatLng({ label, city, zip, lat, lng });
  const item = {
    id: String(nextId++),
    label: label || geocoded.formatted,
    city: city || null,
    zip: zip || null,
    lat: geocoded.lat,
    lng: geocoded.lng,
    radiusMiles,
    filters: normalizeFilters(filters)
  };

  locations.push(item);
  return item;
};

export const updateLocation = async (id, payload) => {
  const index = locations.findIndex((item) => item.id === id);
  if (index === -1) {
    const err = new Error('Location not found');
    err.status = 404;
    throw err;
  }

  const current = locations[index];
  const merged = { ...current, ...payload };
  const geocoded = await ensureLatLng({
    label: merged.label,
    city: merged.city,
    zip: merged.zip,
    lat: merged.lat,
    lng: merged.lng
  });

  const updated = {
    ...current,
    ...merged,
    lat: geocoded.lat,
    lng: geocoded.lng,
    label: merged.label || geocoded.formatted,
    radiusMiles: merged.radiusMiles ?? current.radiusMiles,
    filters: normalizeFilters(merged.filters ?? current.filters)
  };

  locations[index] = updated;
  return updated;
};

export const deleteLocation = (id) => {
  const index = locations.findIndex((item) => item.id === id);
  if (index === -1) {
    const err = new Error('Location not found');
    err.status = 404;
    throw err;
  }
  locations.splice(index, 1);
};
