import { Coordinate } from '../types/maps';

/**
 * Linear interpolation between two coordinates
 */
export function lerpCoordinate(
	start: Coordinate,
	end: Coordinate,
	t: number,
): Coordinate {
	const clampedT = Math.max(0, Math.min(1, t));
	return {
		lat: start.lat + (end.lat - start.lat) * clampedT,
		lng: start.lng + (end.lng - start.lng) * clampedT,
	};
}

/**
 * Chaikin smoothing algorithm for corner smoothing along GPS breadcrumbs
 * Generates an organic rounded line through discrete GPS points
 */
export function chaikinSmooth(
	points: Coordinate[],
	iterations: number = 2,
): Coordinate[] {
	if (!points || points.length < 3) return points ? [...points] : [];

	let current = points;

	for (let iter = 0; iter < iterations; iter++) {
		const smoothed: Coordinate[] = [current[0]];

		for (let i = 0; i < current.length - 1; i++) {
			const p0 = current[i];
			const p1 = current[i + 1];

			// Q = 0.75 * P0 + 0.25 * P1
			const q: Coordinate = {
				lat: 0.75 * p0.lat + 0.25 * p1.lat,
				lng: 0.75 * p0.lng + 0.25 * p1.lng,
			};

			// R = 0.25 * P0 + 0.75 * P1
			const r: Coordinate = {
				lat: 0.25 * p0.lat + 0.75 * p1.lat,
				lng: 0.25 * p0.lng + 0.75 * p1.lng,
			};

			smoothed.push(q);
			smoothed.push(r);
		}

		smoothed.push(current[current.length - 1]);
		current = smoothed;
	}

	return current;
}
