import { Coordinate } from '../types/maps';
import { haversineDistanceMiles } from './mapRouting';

export type SnappedCoordinates = Coordinate[] & { distanceMiles?: number };

/**
 * Snaps a gap between two coordinates along real roads using OSRM.
 * Only calls OSRM when distance >= 120m to avoid unnecessary API requests.
 * Times out after 4 seconds and falls back to straight line on failure.
 */
export async function snapGapToRoads(
	from: Coordinate,
	to: Coordinate,
): Promise<SnappedCoordinates> {
	const distMiles = haversineDistanceMiles(from, to);
	const distMeters = distMiles * 1609.344;

	// Only call OSRM when distance between points is >= 120m
	if (distMeters < 120) {
		const direct: SnappedCoordinates = [{ ...from }, { ...to }];
		direct.distanceMiles = distMiles;
		return direct;
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 4000);

	try {
		const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
		const response = await fetch(url, { signal: controller.signal });
		clearTimeout(timeoutId);

		if (!response.ok) {
			const fallback: SnappedCoordinates = [{ ...from }, { ...to }];
			fallback.distanceMiles = distMiles;
			return fallback;
		}

		const data = await response.json();
		if (data?.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
			const route = data.routes[0];
			const coords: SnappedCoordinates = route.geometry.coordinates.map(
				([lng, lat]: [number, number]) => ({
					lat: Number(lat.toFixed(5)),
					lng: Number(lng.toFixed(5)),
				}),
			);
			coords.distanceMiles = route.distance * 0.000621371;
			return coords;
		}
	} catch {
		clearTimeout(timeoutId);
	}

	const fallback: SnappedCoordinates = [{ ...from }, { ...to }];
	fallback.distanceMiles = distMiles;
	return fallback;
}
