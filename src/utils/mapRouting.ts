import { Coordinate } from '../types/maps';
import roadRoutes from './defaultRoadRoutes.json';

export const DEFAULT_ROAD_ROUTES: Record<string, Coordinate[]> = {
	'trip-1': roadRoutes.c1,
	'trip-2': roadRoutes.c2,
	'trip-3': roadRoutes.c3,
	'trip-rowan-home': (roadRoutes as Record<string, any>)['trip-rowan-home'] || [],
};

export interface DirectionStep {
	instruction: string;
	street: string;
	distanceMiles: number;
	durationMinutes: number;
	maneuverType: string;
	maneuverModifier?: string;
}

export interface RouteDirections {
	coordinates: Coordinate[];
	distanceMiles: number;
	durationMinutes: number;
	steps: DirectionStep[];
}

/**
 * Calculates straight-line distance in miles between two coordinates using Haversine formula.
 */
export function haversineDistanceMiles(coord1: Coordinate, coord2: Coordinate): number {
	const R = 3958.8; // Earth radius in miles
	const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
	const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((coord1.lat * Math.PI) / 180) *
			Math.cos((coord2.lat * Math.PI) / 180) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Fetches real road-following geometry between two coordinates using OSRM.
 * Returns turn-by-turn road coordinates that snap to streets, roads and highways.
 */
export async function fetchRoadRoute(
	start: Coordinate,
	end: Coordinate,
): Promise<{ coordinates: Coordinate[]; distanceMiles: number } | null> {
	try {
		const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
		const res = await fetch(url);
		if (!res.ok) return null;
		const data = await res.json();
		if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
			const route = data.routes[0];
			const coordinates: Coordinate[] = route.geometry.coordinates.map(
				([lng, lat]: [number, number]) => ({
					lat: Number(lat.toFixed(5)),
					lng: Number(lng.toFixed(5)),
				}),
			);
			const distanceMiles = Number((route.distance / 1609.344).toFixed(1));
			return { coordinates, distanceMiles };
		}
	} catch (e) {
		console.warn('Failed to fetch road route from OSRM', e);
	}
	return null;
}

function formatManeuverInstruction(
	maneuver: { type?: string; modifier?: string },
	streetName: string,
): string {
	const name = streetName && streetName.trim().length > 0 ? streetName : 'the road';
	const mod = maneuver.modifier ? maneuver.modifier.replace(/_/g, ' ') : '';

	switch (maneuver.type) {
		case 'depart':
			return mod ? `Head ${mod} on ${name}` : `Head onto ${name}`;
		case 'arrive':
			return `Arrive at destination`;
		case 'turn':
			return `Turn ${mod || 'right'} onto ${name}`;
		case 'continue':
		case 'new name':
			return `Continue onto ${name}`;
		case 'roundabout':
		case 'rotary':
			return `Enter roundabout and take exit onto ${name}`;
		case 'merge':
			return `Merge onto ${name}`;
		case 'on ramp':
			return `Take ramp onto ${name}`;
		case 'off ramp':
			return `Take exit onto ${name}`;
		case 'fork':
			return `Take the ${mod || 'right'} fork onto ${name}`;
		case 'end of road':
			return `Turn ${mod || 'right'} at end of road onto ${name}`;
		default:
			return mod ? `Turn ${mod} onto ${name}` : `Continue onto ${name}`;
	}
}

/**
 * Fetches turn-by-turn routing with geometry, steps, distance, and duration.
 * Falls back to synthesized road route if offline or rate-limited.
 */
export async function fetchRouteDirections(
	start: Coordinate,
	end: Coordinate,
	destStreetHint?: string,
): Promise<RouteDirections> {
	try {
		const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
		const res = await fetch(url);
		if (res.ok) {
			const data = await res.json();
			if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
				const route = data.routes[0];
				const coordinates: Coordinate[] = route.geometry.coordinates.map(
					([lng, lat]: [number, number]) => ({
						lat: Number(lat.toFixed(5)),
						lng: Number(lng.toFixed(5)),
					}),
				);
				const distanceMiles = Number((route.distance / 1609.344).toFixed(1));
				const durationMinutes = Math.max(1, Math.round(route.duration / 60));

				const steps: DirectionStep[] = [];
				if (route.legs && route.legs[0] && Array.isArray(route.legs[0].steps)) {
					for (const s of route.legs[0].steps) {
						const stepDistMiles = Number((s.distance / 1609.344).toFixed(1));
						const stepDurationMin = Math.max(0.5, Math.round((s.duration / 60) * 10) / 10);
						const instruction = formatManeuverInstruction(s.maneuver || {}, s.name || '');
						steps.push({
							instruction,
							street: s.name || destStreetHint || 'Local Road',
							distanceMiles: stepDistMiles,
							durationMinutes: stepDurationMin,
							maneuverType: s.maneuver?.type || 'turn',
							maneuverModifier: s.maneuver?.modifier || 'straight',
						});
					}
				}

				if (steps.length === 0) {
					steps.push(
						{
							instruction: `Head toward ${destStreetHint || 'destination'}`,
							street: 'Main Road',
							distanceMiles: Number((distanceMiles * 0.4).toFixed(1)),
							durationMinutes: Math.round(durationMinutes * 0.4),
							maneuverType: 'depart',
						},
						{
							instruction: `Continue toward ${destStreetHint || 'destination'}`,
							street: destStreetHint || 'Local Route',
							distanceMiles: Number((distanceMiles * 0.6).toFixed(1)),
							durationMinutes: Math.round(durationMinutes * 0.6),
							maneuverType: 'turn',
						},
						{
							instruction: 'Arrive at destination',
							street: destStreetHint || 'Destination',
							distanceMiles: 0.1,
							durationMinutes: 1,
							maneuverType: 'arrive',
						},
					);
				}

				return {
					coordinates,
					distanceMiles,
					durationMinutes,
					steps,
				};
			}
		}
	} catch (e) {
		console.warn('OSRM routing request failed, generating fallback directions', e);
	}

	// Fallback road route geometry & directions
	const straightMiles = haversineDistanceMiles(start, end);
	const estMiles = Number(Math.max(0.3, straightMiles * 1.25).toFixed(1));
	const estMinutes = Math.max(2, Math.round((estMiles / 28) * 60));

	// Generate intermediate waypoints with slight bend
	const midLat = (start.lat + end.lat) / 2 + (end.lng - start.lng) * 0.15;
	const midLng = (start.lng + end.lng) / 2 - (end.lat - start.lat) * 0.15;
	const coordinates: Coordinate[] = [
		start,
		{ lat: Number(midLat.toFixed(5)), lng: Number(midLng.toFixed(5)) },
		end,
	];

	const steps: DirectionStep[] = [
		{
			instruction: `Head toward ${destStreetHint || 'main avenue'}`,
			street: 'Starting Road',
			distanceMiles: Number((estMiles * 0.35).toFixed(1)),
			durationMinutes: Math.max(1, Math.round(estMinutes * 0.35)),
			maneuverType: 'depart',
			maneuverModifier: 'straight',
		},
		{
			instruction: `Turn toward ${destStreetHint || 'destination'}`,
			street: destStreetHint || 'Connecting Road',
			distanceMiles: Number((estMiles * 0.6).toFixed(1)),
			durationMinutes: Math.max(1, Math.round(estMinutes * 0.6)),
			maneuverType: 'turn',
			maneuverModifier: 'right',
		},
		{
			instruction: `Arrive at ${destStreetHint || 'destination'}`,
			street: destStreetHint || 'Destination',
			distanceMiles: 0.1,
			durationMinutes: 1,
			maneuverType: 'arrive',
		},
	];

	return {
		coordinates,
		distanceMiles: estMiles,
		durationMinutes: estMinutes,
		steps,
	};
}

/**
 * Reverse geocodes a coordinate to a human-readable street address using Nominatim.
 */
export async function reverseGeocode(coord: Coordinate): Promise<string> {
	try {
		const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coord.lat}&lon=${coord.lng}`;
		const res = await fetch(url, {
			headers: { 'User-Agent': 'ImCheap-ExpenseTracker/1.0' },
		});
		if (!res.ok) return `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`;
		const data = await res.json();
		if (data?.address) {
			const road =
				data.address.road ||
				data.address.pedestrian ||
				data.address.suburb ||
				'';
			const houseNumber = data.address.house_number
				? `${data.address.house_number} `
				: '';
			const city =
				data.address.city ||
				data.address.town ||
				data.address.village ||
				data.address.county ||
				'';
			const state = data.address.state || '';
			const streetPart = `${houseNumber}${road}`.trim();
			if (streetPart && city) {
				return `${streetPart}, ${city}${state ? `, ${state}` : ''}`;
			}
			return data.display_name.split(',').slice(0, 3).join(', ');
		}
	} catch (e) {
		console.warn('Reverse geocode failed', e);
	}
	return `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`;
}

/**
 * Resolves a friendly origin location name for trip and commute logs:
 * 1. Checks if within 120m of a saved location (returns location.name)
 * 2. Parses reverse-geocoded address down to number and street (e.g. "201 Mullica Hill Rd")
 * 3. Falls back to "Near [Closest Location]" if geocoding fails or offline
 */
export async function resolveOriginLocationName(
	coord: Coordinate,
	savedLocations: { name: string; lat: number; lng: number }[],
): Promise<string> {
	// 1. Check if within 120m of any saved location
	for (const loc of savedLocations) {
		const distMeters =
			haversineDistanceMiles(coord, { lat: loc.lat, lng: loc.lng }) * 1609.344;
		if (distMeters <= 120) {
			return loc.name;
		}
	}

	// 2. Try reverse geocoding to number and street
	try {
		const fullAddress = await reverseGeocode(coord);
		if (fullAddress && !fullAddress.includes(coord.lat.toFixed(4))) {
			// Extract number and street name: e.g. "201 Mullica Hill Rd" from "201 Mullica Hill Rd, Glassboro, NJ"
			const match = fullAddress.match(/^\s*(\d+[-\w]*\s+[^,]+)/);
			if (match && match[1]) {
				return match[1].trim();
			}
			const firstSegment = fullAddress.split(',')[0]?.trim();
			if (firstSegment && !firstSegment.match(/^\d+\.\d+$/)) {
				return firstSegment;
			}
		}
	} catch {
		// Ignore and proceed to fallback
	}

	// 3. Fallback to "Near [Closest Location]"
	if (savedLocations.length > 0) {
		let closestLoc = savedLocations[0];
		let minDist = haversineDistanceMiles(coord, {
			lat: closestLoc.lat,
			lng: closestLoc.lng,
		});
		for (let i = 1; i < savedLocations.length; i++) {
			const dist = haversineDistanceMiles(coord, {
				lat: savedLocations[i].lat,
				lng: savedLocations[i].lng,
			});
			if (dist < minDist) {
				minDist = dist;
				closestLoc = savedLocations[i];
			}
		}
		return `Near ${closestLoc.name}`;
	}

	return 'Current Location';
}

export interface SearchAddressResult {
	name: string;
	address: string;
	label: string;
	lat: number;
	lng: number;
}

const addressCache = new Map<string, Array<SearchAddressResult>>();

/**
 * Searches for addresses in the US with proximity biasing (Nominatim + Photon fallback) and in-memory caching.
 * Results are sorted strictly by ascending distance when proximity is provided.
 */
export async function searchAddresses(
	query: string,
	proximity?: Coordinate,
	limit: number = 15,
): Promise<Array<SearchAddressResult>> {
	const trimmed = query ? query.trim() : '';
	if (trimmed.length < 2) return [];

	const cacheKey = proximity
		? `${trimmed.toLowerCase()}_${proximity.lat.toFixed(2)}_${proximity.lng.toFixed(2)}_${limit}`
		: `${trimmed.toLowerCase()}_${limit}`;
	if (addressCache.has(cacheKey)) {
		return addressCache.get(cacheKey)!;
	}

	let viewboxParam = '';
	if (proximity) {
		const latOffset = 0.75;
		const rad = (proximity.lat * Math.PI) / 180;
		const lngOffset = 0.75 / Math.max(0.1, Math.cos(rad));
		const minLon = (proximity.lng - lngOffset).toFixed(4);
		const maxLat = (proximity.lat + latOffset).toFixed(4);
		const maxLon = (proximity.lng + lngOffset).toFixed(4);
		const minLat = (proximity.lat - latOffset).toFixed(4);
		viewboxParam = `&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=0`;
	}

	// Helper to extract clean business name and address lines from Photon properties
	const parsePhotonFeature = (f: any): SearchAddressResult => {
		const p = f.properties || {};
		const streetLine = [p.housenumber ? `${p.housenumber} ${p.street || ''}` : p.street]
			.filter(Boolean)
			.join(' ')
			.trim();
		const cityState = [p.city || p.locality || p.district, p.state]
			.filter(Boolean)
			.join(', ')
			.trim();
		const fullAddress = [streetLine, cityState].filter(Boolean).join(', ').trim();

		let name = '';
		let address = '';

		if (p.name && p.name.trim().length > 0) {
			name = p.name.trim();
			address = fullAddress || cityState || (p.county ? `${p.county}, ${p.state || ''}` : '');
		} else {
			name = streetLine || cityState || 'Location';
			address = cityState && streetLine ? cityState : (p.county ? `${p.county}, ${p.state || ''}` : '');
		}

		const label = address ? `${name}, ${address}` : name;
		const [lng, lat] = f.geometry.coordinates;
		return { name, address, label, lat, lng };
	};

	// 1. When proximity is provided, use Photon first for hyper-local radial scoring
	if (proximity) {
		try {
			const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
				trimmed,
			)}&limit=${limit}&lat=${proximity.lat}&lon=${proximity.lng}`;
			const res = await fetch(photonUrl);
			if (res.ok) {
				const data = await res.json();
				if (data && Array.isArray(data.features) && data.features.length > 0) {
					const results: Array<SearchAddressResult> = data.features.map(parsePhotonFeature);
					results.sort((a, b) => {
						const distA = haversineDistanceMiles(proximity, { lat: a.lat, lng: a.lng });
						const distB = haversineDistanceMiles(proximity, { lat: b.lat, lng: b.lng });
						return distA - distB;
					});
					addressCache.set(cacheKey, results);
					return results;
				}
			}
		} catch (e) {
			console.warn('Photon proximity search failed, falling back to Nominatim', e);
		}
	}

	// 2. OpenStreetMap Nominatim (primary when no proximity, fallback otherwise)
	try {
		const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
			trimmed,
		)}&format=json&limit=${limit}&countrycodes=us${viewboxParam}`;
		const res = await fetch(url, {
			headers: { 'User-Agent': 'ImCheap-ExpenseTracker/1.0' },
		});
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data) && data.length > 0) {
				const results: Array<SearchAddressResult> = data.map((item) => {
					const rawLabel = item.display_name || '';
					const parts = rawLabel.split(',').map((s: string) => s.trim());
					const name = parts[0] || 'Location';
					const address = parts.slice(1, 4).join(', ');
					const label = parts.slice(0, 4).join(', ');
					return {
						name,
						address,
						label,
						lat: parseFloat(item.lat),
						lng: parseFloat(item.lon),
					};
				});
				if (proximity) {
					results.sort((a, b) => {
						const distA = haversineDistanceMiles(proximity, { lat: a.lat, lng: a.lng });
						const distB = haversineDistanceMiles(proximity, { lat: b.lat, lng: b.lng });
						return distA - distB;
					});
				}
				addressCache.set(cacheKey, results);
				return results;
			}
		}
	} catch (e) {
		console.warn('Nominatim search failed', e);
	}

	// 3. Photon non-proximity fallback if proximity was not provided
	if (!proximity) {
		try {
			const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
				trimmed,
			)}&limit=${limit}`;
			const res = await fetch(photonUrl);
			if (res.ok) {
				const data = await res.json();
				if (data && Array.isArray(data.features)) {
					const results: Array<SearchAddressResult> = data.features.map(parsePhotonFeature);
					addressCache.set(cacheKey, results);
					return results;
				}
			}
		} catch (fallbackErr) {
			console.warn('Photon fallback address search failed', fallbackErr);
		}
	}

	return [];
}
