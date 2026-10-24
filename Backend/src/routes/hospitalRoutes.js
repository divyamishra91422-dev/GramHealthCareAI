import { Router } from 'express';

const router = Router();
const geocoderUrl = process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search';
const overpassUrl = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const cache = new Map();
let lastGeocoderRequest = 0;

function cacheGet(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    if (item.staleUntil < Date.now()) cache.delete(key);
    return null;
  }
  return item.value;
}

function cacheGetStale(key) {
  const item = cache.get(key);
  if (!item || item.staleUntil < Date.now()) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function cacheSet(key, value, ttlMs, staleTtlMs = 0) {
  if (cache.size >= 100) cache.delete(cache.keys().next().value);
  const expiresAt = Date.now() + ttlMs;
  cache.set(key, { value, expiresAt, staleUntil: expiresAt + staleTtlMs });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 25000, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort(signal.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

async function fetchOverpass(query) {
  const endpoints = [...new Set([
    overpassUrl,
    'https://overpass.private.coffee/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ])];
  const controllers = [];
  const attempts = endpoints.map(async (endpoint) => {
    const controller = new AbortController();
    controllers.push(controller);
    let receivedResponse = false;

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'GramHealthCareAI/1.0 (student health resources app)',
        },
        body: new URLSearchParams({ data: query }),
      }, 12000, controller.signal);
      receivedResponse = true;
      if (response.ok) return response;
      throw new Error(`Overpass returned HTTP ${response.status} from ${new URL(endpoint).host}.`);
    } catch (error) {
      if (!controller.signal.aborted) {
        if (receivedResponse) console.warn('Hospital locator upstream error:', error.message);
        else console.warn(`Hospital locator upstream request failed (${new URL(endpoint).host}):`, error.message);
      }
      throw error;
    }
  });

  try {
    return await Promise.any(attempts);
  } catch (error) {
    const errors = error.errors || [];
    throw errors[errors.length - 1] || new Error('All OpenStreetMap search services are unavailable.');
  } finally {
    controllers.forEach((controller) => controller.abort());
  }
}

async function geocode(location) {
  const key = `geo:${location.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  // Public Nominatim asks clients to stay at or below one request per second.
  const delay = Math.max(0, 1100 - (Date.now() - lastGeocoderRequest));
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  lastGeocoderRequest = Date.now();

  const url = new URL(geocoderUrl);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', location);
  const response = await fetchWithTimeout(url, {
    headers: { 'User-Agent': 'GramHealthCareAI/1.0 (student health resources app)' },
  });
  if (!response.ok) throw new Error('Location search service is temporarily unavailable.');
  const results = await response.json();
  const result = results[0];
  if (!result) return null;

  const point = { lat: Number(result.lat), lon: Number(result.lon), label: result.display_name };
  cacheSet(key, point, 15 * 60 * 1000);
  return point;
}

function distanceKm(fromLat, fromLon, toLat, toLon) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latDelta = radians(toLat - fromLat);
  const lonDelta = radians(toLon - fromLon);
  const a = Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function addressFrom(tags) {
  if (tags['addr:full']) return tags['addr:full'];
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return [street, tags['addr:suburb'], tags['addr:city'] || tags['addr:town'], tags['addr:postcode']]
    .filter(Boolean)
    .join(', ') || 'Address not listed in OpenStreetMap';
}

router.get('/', async (req, res) => {
  const location = typeof req.query.location === 'string' ? req.query.location.trim() : '';
  const hasLatitude = req.query.lat !== undefined;
  const hasLongitude = req.query.lon !== undefined;
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lon);
  const hasCoordinates = hasLatitude && hasLongitude;

  if ((!location && !hasCoordinates) || location.length > 120 ||
      (hasLatitude !== hasLongitude) ||
      (hasCoordinates && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180))) {
    return res.status(400).json({ message: 'Enter a location up to 120 characters.' });
  }

  let staleListing = null;
  let searchedLocation = location;
  try {
    const point = hasCoordinates
      ? { lat: latitude, lon: longitude, label: 'Your current location' }
      : await geocode(location);
    if (!point) return res.json({ searchedLocation: location, results: [] });
    searchedLocation = point.label;

    const cacheKey = `places:${point.lat.toFixed(4)}:${point.lon.toFixed(4)}`;
    let listing = cacheGet(cacheKey);
    staleListing = cacheGetStale(cacheKey);
    if (!listing) {
      const lat = point.lat;
      const lon = point.lon;
      const query = `[out:json][timeout:10];(nwr["amenity"~"^(hospital|clinic)$"](around:7000,${lat},${lon});nwr["healthcare"~"^(hospital|clinic|centre|primary_care)$"](around:7000,${lat},${lon}););out center tags 30;`;
      const response = await fetchOverpass(query);
      const data = await response.json();
      const places = (data.elements || []).map((element) => {
        const tags = element.tags || {};
        const coordinates = element.type === 'node' ? element : element.center;
        if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lon)) return null;
        const type = tags.amenity || tags.healthcare || 'healthcare facility';
        const facilityText = `${tags.name || ''} ${tags['name:en'] || ''} ${tags.healthcare || ''}`;
        const facilityLevel = /\b(chc|community health cent(?:re|er))\b/i.test(facilityText)
          ? 'Community Health Centre (CHC)'
          : /\b(phc|primary health cent(?:re|er)|primary care cent(?:re|er))\b/i.test(facilityText) || tags.healthcare === 'primary_care'
            ? 'Primary Health Centre (PHC)'
            : type === 'hospital' ? 'Hospital' : 'Clinic or health centre';
        const publicText = `${tags.operator || ''} ${tags.ownership || ''} ${tags['operator:type'] || ''} ${facilityText}`;
        const publicFacility = /\b(government|govt\.?|public|municipal|state|district)\b/i.test(publicText);
        const mapUrl = `https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lon}#map=16/${coordinates.lat}/${coordinates.lon}`;
        return {
          id: `${element.type}-${element.id}`,
          name: tags.name || tags['name:en'] || 'Unnamed healthcare facility',
          type: facilityLevel,
          publicFacility,
          address: addressFrom(tags),
          phone: tags.phone || tags['contact:phone'] || 'Phone number not listed',
          distanceKm: Number(distanceKm(lat, lon, coordinates.lat, coordinates.lon).toFixed(1)),
          mapUrl,
          directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lon}`,
        };
      }).filter(Boolean).sort((a, b) => {
        const priority = (facility) => facility.publicFacility || /\b(PHC|CHC)\b/.test(facility.type) ? 0 : 1;
        return priority(a) - priority(b) || a.distanceKm - b.distanceKm;
      }).slice(0, 30);
      listing = { results: places, lastUpdatedAt: data.osm3s?.timestamp_osm_base || new Date().toISOString() };
      cacheSet(cacheKey, listing, 5 * 60 * 1000, 24 * 60 * 60 * 1000);
    }

    return res.json({ searchedLocation: point.label, source: 'OpenStreetMap', ...listing });
  } catch (error) {
    if (staleListing) {
      console.warn('Hospital search using cached results after upstream failure:', error.message);
      return res.json({
        searchedLocation,
        source: 'OpenStreetMap',
        ...staleListing,
        stale: true,
      });
    }
    console.error('Hospital search error:', error.message);
    return res.status(503).json({
      message: 'The live facility search is temporarily unavailable. Please try again in a few minutes.',
    });
  }
});

export default router;
