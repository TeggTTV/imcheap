import { Coordinate } from '../types/maps';
import roadRoutes from './defaultRoadRoutes.json';

export const DEFAULT_ROAD_ROUTES: Record<string, Coordinate[]> = {
	'trip-1': roadRoutes.c1,
	'trip-2': roadRoutes.c2,
	'trip-3': roadRoutes.c3,
	'trip-rowan-home': (roadRoutes as Record<string, any>)['trip-rowan-home'] || [],
};

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
 * Searches for addresses in the US using OpenStreetMap Nominatim.
 */
export async function searchAddresses(
	query: string,
): Promise<Array<{ label: string; lat: number; lng: number }>> {
	if (!query || query.trim().length < 3) return [];
	try {
		const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
			query,
		)}&format=json&limit=5&countrycodes=us`;
		const res = await fetch(url, {
			headers: { 'User-Agent': 'ImCheap-ExpenseTracker/1.0' },
		});
		if (!res.ok) return [];
		const data = await res.json();
		if (Array.isArray(data)) {
			return data.map((item) => ({
				label: item.display_name.split(',').slice(0, 4).join(', '),
				lat: parseFloat(item.lat),
				lng: parseFloat(item.lon),
			}));
		}
	} catch (e) {
		console.warn('Address search failed', e);
	}
	return [];
}
