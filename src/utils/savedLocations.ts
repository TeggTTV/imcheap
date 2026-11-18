import { SavedLocation } from '../types/maps';
import { getSavedHomeAddress, saveHomeAddress } from './tripTracker';

const STORAGE_KEY = 'imcheap_saved_locations';

export function getSavedLocations(): SavedLocation[] {
	if (typeof window === 'undefined') return [];

	const home = getSavedHomeAddress();
	let storedLocations: SavedLocation[] = [];

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			storedLocations = JSON.parse(raw);
		}
	} catch (e) {
		console.warn('Failed to parse saved locations from localStorage', e);
	}

	// Ensure Home is permanently present at index 0
	const homeIndex = storedLocations.findIndex((loc) => loc.isHome);
	const homeLocation: SavedLocation = {
		id: 'home_permanent',
		name: 'Home',
		address: home.address,
		lat: home.lat,
		lng: home.lng,
		icon: 'home',
		isHome: true,
		isVisibleOnMap: homeIndex >= 0 ? storedLocations[homeIndex].isVisibleOnMap : true,
	};

	const nonHomeLocations = storedLocations.filter((loc) => !loc.isHome);
	return [homeLocation, ...nonHomeLocations];
}

export function saveLocations(locations: SavedLocation[]): void {
	if (typeof window === 'undefined') return;
	try {
		// Sync home address if changed
		const home = locations.find((l) => l.isHome);
		if (home) {
			saveHomeAddress({
				address: home.address,
				lat: home.lat,
				lng: home.lng,
			});
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
	} catch (e) {
		console.warn('Failed to persist saved locations to localStorage', e);
	}
}

export function addOrUpdateLocation(location: SavedLocation): SavedLocation[] {
	const current = getSavedLocations();
	if (location.isHome) {
		const updatedHome = current.map((loc) =>
			loc.isHome ? { ...location, isHome: true } : loc,
		);
		saveLocations(updatedHome);
		return updatedHome;
	}

	const existingIndex = current.findIndex((loc) => loc.id === location.id);
	let next: SavedLocation[];
	if (existingIndex >= 0) {
		next = [...current];
		next[existingIndex] = location;
	} else {
		next = [...current, location];
	}
	saveLocations(next);
	return next;
}

export function deleteLocation(id: string): SavedLocation[] {
	const current = getSavedLocations();
	// Never delete home
	const filtered = current.filter((loc) => loc.id !== id || loc.isHome);
	saveLocations(filtered);
	return filtered;
}

export function toggleLocationVisibility(id: string): SavedLocation[] {
	const current = getSavedLocations();
	const next = current.map((loc) =>
		loc.id === id ? { ...loc, isVisibleOnMap: !loc.isVisibleOnMap } : loc,
	);
	saveLocations(next);
	return next;
}
