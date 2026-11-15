import { Coordinate, RecordedTrip, SavedHomeAddress, LiveTrackingStatus } from '../types/maps';
import { haversineDistanceMiles, fetchRoadRoute, reverseGeocode } from './mapRouting';

export type { SavedHomeAddress };

export const DEFAULT_HOME_ADDRESS: SavedHomeAddress = {
	address: '201 Girard Road, Glassboro, NJ',
	lat: 39.7032,
	lng: -75.122,
};

export function getSavedHomeAddress(): SavedHomeAddress {
	if (typeof window === 'undefined') return DEFAULT_HOME_ADDRESS;
	try {
		const saved = localStorage.getItem('imcheap_home_address');
		if (saved) {
			const parsed = JSON.parse(saved);
			if (parsed?.lat && parsed?.lng && parsed?.address) {
				return parsed;
			}
		}
	} catch (e) {
		console.warn('Failed to parse saved home address', e);
	}
	return DEFAULT_HOME_ADDRESS;
}

export function saveHomeAddress(home: SavedHomeAddress): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem('imcheap_home_address', JSON.stringify(home));
		// Also update calibrated location for map centering
		localStorage.setItem(
			'imcheap_user_custom_location',
			JSON.stringify({ lat: home.lat, lng: home.lng }),
		);
	} catch (e) {
		console.warn('Failed to save home address', e);
	}
}

interface DwellState {
	anchorCoord: Coordinate;
	anchorName: string;
	dwellStartTime: number;
	isConfirmed: boolean;
}

interface ActiveTripState {
	originName: string;
	originCoord: Coordinate;
	startTime: number;
	coordinates: Coordinate[];
	accumulatedMiles: number;
}

export class AutomaticTripDetectionService {
	private homeAddress: SavedHomeAddress;
	private dwell: DwellState | null = null;
	private activeTrip: ActiveTripState | null = null;
	private mileageRate: number;
	private onTripRecorded: (trip: RecordedTrip) => void;
	private onStatusChange: (status: LiveTrackingStatus) => void;
	private watchId: number | null = null;
	private lastProcessedCoord: Coordinate | null = null;

	// Configurable thresholds
	private readonly DWELL_RADIUS_MILES = 0.05; // ~80 meters
	private readonly DEPARTURE_DISTANCE_MILES = 0.07; // ~110 meters
	private readonly DWELL_REQUIRED_MS = 5 * 60 * 1000; // 5 minutes
	private readonly ARRIVAL_HOME_RADIUS_MILES = 0.08; // ~130 meters
	private readonly MIN_TRIP_MILES = 0.25; // minimum to record as a real drive

	constructor(options: {
		mileageRate: number;
		onTripRecorded: (trip: RecordedTrip) => void;
		onStatusChange: (status: LiveTrackingStatus) => void;
	}) {
		this.mileageRate = options.mileageRate;
		this.onTripRecorded = options.onTripRecorded;
		this.onStatusChange = options.onStatusChange;
		this.homeAddress = getSavedHomeAddress();
		this.restorePersistedState();
	}

	public updateSettings(mileageRate: number, home?: SavedHomeAddress) {
		this.mileageRate = mileageRate;
		if (home) {
			this.homeAddress = home;
		} else {
			this.homeAddress = getSavedHomeAddress();
		}
	}

	public start() {
		if (this.watchId !== null) return;
		if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

		this.watchId = navigator.geolocation.watchPosition(
			(pos) => {
				const coord: Coordinate = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				};
				this.processNewLocation(coord);
			},
			(err) => {
				console.warn('Trip detection GPS error', err);
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 1000,
			},
		);
	}

	public stop() {
		if (this.watchId !== null && typeof window !== 'undefined') {
			navigator.geolocation.clearWatch(this.watchId);
			this.watchId = null;
		}
	}

	public async processNewLocation(coord: Coordinate) {
		const now = Date.now();
		this.lastProcessedCoord = coord;

		const distToHome = haversineDistanceMiles(coord, {
			lat: this.homeAddress.lat,
			lng: this.homeAddress.lng,
		});

		// 1. IF ACTIVE TRIP IS RUNNING
		if (this.activeTrip) {
			const lastTripCoord =
				this.activeTrip.coordinates[this.activeTrip.coordinates.length - 1] ||
				this.activeTrip.originCoord;
			const stepDist = haversineDistanceMiles(lastTripCoord, coord);

			// Append coordinate if moved more than 20 feet (filter GPS noise)
			if (stepDist >= 0.004) {
				this.activeTrip.accumulatedMiles += stepDist;
				this.activeTrip.coordinates.push(coord);
				this.persistState();

				this.onStatusChange({
					state: 'TRACKING_TRIP',
					originName: this.activeTrip.originName,
					destinationName: distToHome < 0.5 ? 'Home' : 'Moving...',
					currentMiles: Number(this.activeTrip.accumulatedMiles.toFixed(1)),
					startTime: this.activeTrip.startTime,
				});
			}

			// Check condition A: Arrived back Home
			if (distToHome <= this.ARRIVAL_HOME_RADIUS_MILES) {
				if (this.activeTrip.accumulatedMiles >= this.MIN_TRIP_MILES) {
					await this.completeActiveTrip('Home', coord);
					return;
				}
			}

			// Check condition B: Dwell at a new destination
			if (!this.dwell) {
				this.dwell = {
					anchorCoord: coord,
					anchorName: 'New Destination',
					dwellStartTime: now,
					isConfirmed: false,
				};
			} else {
				const dwellDist = haversineDistanceMiles(this.dwell.anchorCoord, coord);
				if (dwellDist <= this.DWELL_RADIUS_MILES) {
					// Stationary at destination for 3 minutes
					if (now - this.dwell.dwellStartTime >= 3 * 60 * 1000) {
						if (this.activeTrip.accumulatedMiles >= this.MIN_TRIP_MILES) {
							const destName = await this.resolveLocationName(coord);
							await this.completeActiveTrip(destName, coord);
							return;
						}
					}
				} else {
					// Reset dwell anchor to current position
					this.dwell = {
						anchorCoord: coord,
						anchorName: 'New Destination',
						dwellStartTime: now,
						isConfirmed: false,
					};
				}
			}
			return;
		}

		// 2. NO ACTIVE TRIP: DWELL & DEPARTURE TRACKING
		if (!this.dwell) {
			const isAtHome = distToHome <= this.ARRIVAL_HOME_RADIUS_MILES;
			const initialName = isAtHome ? 'Home' : await this.resolveLocationName(coord);
			this.dwell = {
				anchorCoord: coord,
				anchorName: initialName,
				dwellStartTime: now,
				isConfirmed: false,
			};
			this.persistState();

			this.onStatusChange({
				state: isAtHome ? 'AT_HOME' : 'STATIONARY',
				originName: initialName,
				dwellMinutes: 0,
			});
			return;
		}

		// Compare to existing dwell anchor
		const distFromAnchor = haversineDistanceMiles(this.dwell.anchorCoord, coord);

		if (distFromAnchor <= this.DWELL_RADIUS_MILES) {
			const dwellMs = now - this.dwell.dwellStartTime;
			const dwellMins = Math.floor(dwellMs / 60000);

			if (dwellMs >= this.DWELL_REQUIRED_MS) {
				this.dwell.isConfirmed = true;
			}

			const isAtHome = distToHome <= this.ARRIVAL_HOME_RADIUS_MILES;
			this.onStatusChange({
				state: isAtHome ? 'AT_HOME' : 'STATIONARY',
				originName: this.dwell.anchorName,
				dwellMinutes: dwellMins,
			});
			this.persistState();
		} else {
			// User moved outside the dwell radius!
			// Check if they were at a confirmed dwell location (longer than 5 minutes)
			const wasConfirmedDwell =
				this.dwell.isConfirmed ||
				now - this.dwell.dwellStartTime >= this.DWELL_REQUIRED_MS;

			if (wasConfirmedDwell && distFromAnchor >= this.DEPARTURE_DISTANCE_MILES) {
				// START RECORDING TRIP!
				this.activeTrip = {
					originName: this.dwell.anchorName,
					originCoord: this.dwell.anchorCoord,
					startTime: now,
					coordinates: [this.dwell.anchorCoord, coord],
					accumulatedMiles: distFromAnchor,
				};
				this.dwell = null;
				this.persistState();

				this.onStatusChange({
					state: 'TRACKING_TRIP',
					originName: this.activeTrip.originName,
					destinationName: 'Moving...',
					currentMiles: Number(this.activeTrip.accumulatedMiles.toFixed(1)),
					startTime: this.activeTrip.startTime,
				});
			} else if (distFromAnchor > this.DWELL_RADIUS_MILES) {
				// Reset dwell anchor to new coordinate if not confirmed
				const isAtHome = distToHome <= this.ARRIVAL_HOME_RADIUS_MILES;
				const newName = isAtHome ? 'Home' : await this.resolveLocationName(coord);
				this.dwell = {
					anchorCoord: coord,
					anchorName: newName,
					dwellStartTime: now,
					isConfirmed: false,
				};
				this.persistState();

				this.onStatusChange({
					state: isAtHome ? 'AT_HOME' : 'STATIONARY',
					originName: newName,
					dwellMinutes: 0,
				});
			}
		}
	}

	private async completeActiveTrip(destinationName: string, endCoord: Coordinate) {
		if (!this.activeTrip) return;

		const startCoord = this.activeTrip.originCoord;
		const fromName = this.activeTrip.originName;
		const toName = destinationName;

		// Fetch snapped road route if possible
		let finalCoords = this.activeTrip.coordinates;
		let finalMiles = Math.round(this.activeTrip.accumulatedMiles * 10) / 10;

		try {
			const roadResult = await fetchRoadRoute(startCoord, endCoord);
			if (roadResult && roadResult.coordinates.length > 0) {
				finalCoords = roadResult.coordinates;
				if (roadResult.distanceMiles > 0) {
					finalMiles = roadResult.distanceMiles;
				}
			}
		} catch (e) {
			console.warn('Failed to snap trip to road route', e);
		}

		if (finalMiles < 0.2) {
			finalMiles = 0.2;
		}

		const cost = Number((finalMiles * this.mileageRate).toFixed(2));
		const recordedTrip: RecordedTrip = {
			id: `trip-auto-${Date.now()}`,
			from: fromName,
			to: toName,
			miles: finalMiles,
			cost,
			timestamp: 'Just now',
			status: 'UNLOGGED',
			coordinates: finalCoords,
		};

		// Reset active trip
		this.activeTrip = null;
		this.dwell = {
			anchorCoord: endCoord,
			anchorName: toName,
			dwellStartTime: Date.now(),
			isConfirmed: true,
		};
		this.persistState();

		this.onTripRecorded(recordedTrip);
		this.onStatusChange({
			state: toName === 'Home' ? 'AT_HOME' : 'STATIONARY',
			originName: toName,
			dwellMinutes: 0,
		});
	}

	private async resolveLocationName(coord: Coordinate): Promise<string> {
		// 1. Check if near Home
		const distToHome = haversineDistanceMiles(coord, {
			lat: this.homeAddress.lat,
			lng: this.homeAddress.lng,
		});
		if (distToHome <= 0.08) {
			return 'Home';
		}

		// 2. Check if near Rowan University / Rowan's House area
		const distToRowan = haversineDistanceMiles(coord, {
			lat: 39.7144,
			lng: -75.1185,
		});
		if (distToRowan <= 0.25) {
			return "Rowan's House";
		}

		// 3. Fallback to reverse geocoding
		try {
			const addr = await reverseGeocode(coord);
			if (addr) {
				const shortPart = addr.split(',')[0].trim();
				return shortPart || 'Waypoint';
			}
		} catch (e) {
			console.warn('Failed to resolve location name', e);
		}

		return 'Stationary Stop';
	}

	private persistState() {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(
				'imcheap_trip_tracker_state',
				JSON.stringify({
					dwell: this.dwell,
					activeTrip: this.activeTrip,
				}),
			);
		} catch (e) {
			console.warn('Failed to persist trip tracker state', e);
		}
	}

	private restorePersistedState() {
		if (typeof window === 'undefined') return;
		try {
			const saved = localStorage.getItem('imcheap_trip_tracker_state');
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed?.dwell) this.dwell = parsed.dwell;
				if (parsed?.activeTrip) this.activeTrip = parsed.activeTrip;
			}
		} catch (e) {
			console.warn('Failed to restore trip tracker state', e);
		}
	}
}
