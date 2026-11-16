import {
	Coordinate,
	RecordedTrip,
	SavedHomeAddress,
	LiveTrackingStatus,
	TrackingEngineState,
	TripWaypoint,
	TripEngineConfig,
	DevTrackingTelemetry,
} from '../types/maps';
import {
	haversineDistanceMiles,
	fetchRoadRoute,
	reverseGeocode,
} from './mapRouting';

export type { SavedHomeAddress };

export const DEFAULT_HOME_ADDRESS: SavedHomeAddress = {
	address: '201 Girard Road, Glassboro, NJ',
	lat: 39.7032,
	lng: -75.122,
};

export const DEFAULT_TRIP_ENGINE_CONFIG: TripEngineConfig = {
	homeDepartureDwellMinutes: 15,
	standardOriginDwellMinutes: 5,
	destinationDwellMinutes: 5,
	microStopGraceSeconds: 60,
	geofenceExitRadiusMeters: 100,
	stationaryRadiusMeters: 75,
	drivingSpeedThresholdMph: 12,
	stationarySpeedThresholdMph: 3,
	maxHorizontalAccuracyMeters: 35,
	minValidTripMiles: 0.3,
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
	} catch (e) {
		console.warn('Failed to save home address', e);
	}
}

export function getTripEngineConfig(): TripEngineConfig {
	if (typeof window === 'undefined') return DEFAULT_TRIP_ENGINE_CONFIG;
	try {
		const saved = localStorage.getItem('imcheap_trip_engine_config');
		if (saved) {
			return { ...DEFAULT_TRIP_ENGINE_CONFIG, ...JSON.parse(saved) };
		}
	} catch (e) {
		console.warn('Failed to parse engine config', e);
	}
	return DEFAULT_TRIP_ENGINE_CONFIG;
}

export function saveTripEngineConfig(config: Partial<TripEngineConfig>): void {
	if (typeof window === 'undefined') return;
	try {
		const merged = { ...getTripEngineConfig(), ...config };
		localStorage.setItem(
			'imcheap_trip_engine_config',
			JSON.stringify(merged),
		);
	} catch (e) {
		console.warn('Failed to save engine config', e);
	}
}

interface ActiveTripInternal {
	originName: string;
	originCoord: Coordinate;
	startTime: number;
	path: Array<{ lat: number; lng: number; timestamp: number }>;
	waypoints: TripWaypoint[];
	accumulatedMiles: number;
	lastBreadcrumbTime: number;
	lastBreadcrumbCoord: Coordinate;
}

interface StopEvaluationInternal {
	stopStartTime: number;
	stopCentroid: Coordinate;
	lastCreepCoord: Coordinate;
	lowSpeedCounterSeconds: number;
}

export class AutomaticTripDetectionService {
	private homeAddress: SavedHomeAddress;
	private config: TripEngineConfig;
	private mileageRate: number;
	private hourlyWage: number;
	private onTripRecorded: (trip: RecordedTrip) => void;
	private onStatusChange: (status: LiveTrackingStatus) => void;
	private onTelemetryUpdate?: (telemetry: DevTrackingTelemetry) => void;

	private engineState: TrackingEngineState = 'IDLE_ANCHORED';
	private watchId: number | null = null;
	private tickerId: any = null;

	// Anchor state
	private anchorCoord: Coordinate;
	private anchorName: string = 'Home';
	private anchorStartTime: number = Date.now();
	private isHomeAnchor: boolean = true;
	private isAnchorQualified: boolean = false;

	// Driving state
	private activeTrip: ActiveTripInternal | null = null;

	// Stop state
	private currentStop: StopEvaluationInternal | null = null;

	// Last sensor readings
	private lastCoord: Coordinate;
	private lastSpeedMph: number = 0;
	private lastAccuracyMeters: number = 10;
	private consecutiveDrivingReadings: number = 0;
	private hasReceivedFirstGps: boolean = false;

	constructor(options: {
		mileageRate: number;
		hourlyWage?: number;
		onTripRecorded: (trip: RecordedTrip) => void;
		onStatusChange: (status: LiveTrackingStatus) => void;
		onTelemetryUpdate?: (telemetry: DevTrackingTelemetry) => void;
	}) {
		this.mileageRate = options.mileageRate;
		this.hourlyWage = options.hourlyWage || 17.0;
		this.onTripRecorded = options.onTripRecorded;
		this.onStatusChange = options.onStatusChange;
		this.onTelemetryUpdate = options.onTelemetryUpdate;

		this.homeAddress = getSavedHomeAddress();
		this.config = getTripEngineConfig();

		this.anchorCoord = {
			lat: this.homeAddress.lat,
			lng: this.homeAddress.lng,
		};
		this.lastCoord = { ...this.anchorCoord };
		// Try restoring last known good coordinates from localStorage if available
		if (typeof window !== 'undefined') {
			try {
				const savedLoc = localStorage.getItem('imcheap_last_known_gps');
				if (savedLoc) {
					const parsed = JSON.parse(savedLoc);
					if (parsed?.lat && parsed?.lng) {
						this.lastCoord = { lat: parsed.lat, lng: parsed.lng };
						this.anchorCoord = { ...this.lastCoord };
					}
				}
			} catch {}
		}

		this.restorePersistedState();
		this.onStatusChange({ state: 'LOCATING' });
		this.startTicker();
	}

	public updateHomeAddress(home: SavedHomeAddress) {
		this.homeAddress = home;
		if (this.engineState === 'IDLE_ANCHORED') {
			const checkCoord = this.lastCoord || this.anchorCoord;
			const distToHomeMeters =
				haversineDistanceMiles(checkCoord, {
					lat: home.lat,
					lng: home.lng,
				}) * 1609.344;

			if (distToHomeMeters <= 100) {
				this.isHomeAnchor = true;
				this.anchorName = 'Home';
				this.onStatusChange({
					state: 'AT_HOME',
					originName: 'Home',
					dwellMinutes: Math.floor(
						(Date.now() - this.anchorStartTime) / 60000,
					),
					liveLocation: checkCoord,
				});
			} else {
				this.isHomeAnchor = false;
				this.resolveLocationName(checkCoord).then((name) => {
					this.anchorName = name;
					this.onStatusChange({
						state: 'STATIONARY',
						originName: name,
						dwellMinutes: Math.floor(
							(Date.now() - this.anchorStartTime) / 60000,
						),
						liveLocation: checkCoord,
					});
					this.emitTelemetry();
				});
			}
		}
		this.emitTelemetry();
	}

	public updateSettings(
		mileageRate: number,
		hourlyWage?: number,
		home?: SavedHomeAddress,
		config?: Partial<TripEngineConfig>,
	) {
		this.mileageRate = mileageRate;
		if (hourlyWage) this.hourlyWage = hourlyWage;
		if (home) {
			this.updateHomeAddress(home);
		}
		if (config) {
			this.config = { ...this.config, ...config };
			saveTripEngineConfig(this.config);
		}
		this.emitTelemetry();
	}

	public start() {
		if (this.watchId !== null) return;
		if (typeof window === 'undefined' || !('geolocation' in navigator))
			return;

		const handlePositionSuccess = (pos: GeolocationPosition) => {
			const coord: Coordinate = {
				lat: pos.coords.latitude,
				lng: pos.coords.longitude,
			};
			const accuracy = pos.coords.accuracy || 10;
			let speedMph = 0;
			if (pos.coords.speed !== null && pos.coords.speed >= 0) {
				speedMph = pos.coords.speed * 2.23694;
			} else {
				// Fallback: estimate from last displacement
				const dtHours =
					(Date.now() -
						(this.lastCoord
							? this.lastCoordTime
							: Date.now())) /
					3600000;
				if (dtHours > 0.0001 && dtHours < 0.05) {
					const dist = haversineDistanceMiles(
						this.lastCoord,
						coord,
					);
					speedMph = dist / dtHours;
				}
			}
			this.processPosition(coord, speedMph, accuracy);
		};

		// Start with high accuracy watch
		this.watchId = navigator.geolocation.watchPosition(
			handlePositionSuccess,
			(err) => {
				// If high accuracy times out, fall back seamlessly to standard accuracy watch
				if (err.code === 3 && typeof window !== 'undefined' && 'geolocation' in navigator) {
					if (this.watchId !== null) {
						navigator.geolocation.clearWatch(this.watchId);
					}
					this.watchId = navigator.geolocation.watchPosition(
						handlePositionSuccess,
						(fallbackErr) => {
							console.warn('Geolocation standard accuracy fallback warning', fallbackErr);
						},
						{
							enableHighAccuracy: false,
							timeout: 30000,
							maximumAge: 30000,
						},
					);
				} else {
					console.warn('Trip detection GPS warning', err);
				}
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 10000,
			},
		);

		// Visibility change listener for signal loss recovery (Rule E)
		if (typeof document !== 'undefined') {
			document.addEventListener(
				'visibilitychange',
				this.handleVisibilityChange,
			);
		}
	}

	private lastCoordTime: number = Date.now();

	public stop() {
		if (this.watchId !== null && typeof window !== 'undefined') {
			navigator.geolocation.clearWatch(this.watchId);
			this.watchId = null;
		}
		if (this.tickerId) {
			clearInterval(this.tickerId);
			this.tickerId = null;
		}
		if (typeof document !== 'undefined') {
			document.removeEventListener(
				'visibilitychange',
				this.handleVisibilityChange,
			);
		}
	}

	private handleVisibilityChange = () => {
		if (document.visibilityState === 'visible' && this.activeTrip) {
			const gapMs = Date.now() - this.activeTrip.lastBreadcrumbTime;
			if (gapMs > 30 * 60 * 1000) {
				// Close stale trip if app was suspended over 30 minutes
				this.completeTrip(
					'Last Known Location',
					this.activeTrip.lastBreadcrumbCoord,
				);
			}
		}
	};

	private startTicker() {
		if (this.tickerId) clearInterval(this.tickerId);
		this.tickerId = setInterval(() => {
			this.evaluateTimeTransitions();
			this.emitTelemetry();
		}, 1000);
	}

	/**
	 * Main pipeline for processing a new GPS reading
	 */
	public async processPosition(
		coord: Coordinate,
		speedMph: number,
		accuracyMeters: number,
	) {
		const now = Date.now();
		this.lastCoord = coord;
		this.lastCoordTime = now;
		this.lastSpeedMph = Math.max(0, Math.round(speedMph * 10) / 10);
		this.lastAccuracyMeters = Math.round(accuracyMeters);

		// Cache valid GPS coordinates for instant remount restoration
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('imcheap_last_known_gps', JSON.stringify(coord));
			} catch {}
		}

		// Rule D: Accuracy gate. Drop noisy indoor cell tower readings
		if (accuracyMeters > this.config.maxHorizontalAccuracyMeters) {
			this.emitTelemetry();
			return;
		}

		const distToHomeMeters =
			haversineDistanceMiles(coord, {
				lat: this.homeAddress.lat,
				lng: this.homeAddress.lng,
			}) * 1609.344;

		if (!this.hasReceivedFirstGps) {
			this.hasReceivedFirstGps = true;
			if (this.engineState === 'IDLE_ANCHORED') {
				this.anchorCoord = coord;
				this.anchorStartTime = now;
				if (distToHomeMeters <= 100) {
					this.isHomeAnchor = true;
					this.anchorName = 'Home';
					this.onStatusChange({
						state: 'AT_HOME',
						originName: 'Home',
						dwellMinutes: 0,
						liveLocation: coord,
					});
				} else {
					this.isHomeAnchor = false;
					this.anchorName = 'Current Location';
					this.onStatusChange({
						state: 'STATIONARY',
						originName: 'Current Location',
						dwellMinutes: 0,
						liveLocation: coord,
					});
					this.resolveLocationName(coord).then((name) => {
						this.anchorName = name;
						this.onStatusChange({
							state: 'STATIONARY',
							originName: name,
							dwellMinutes: 0,
							liveLocation: coord,
						});
						this.emitTelemetry();
					});
				}
			}
		}

		const distFromAnchorMeters =
			haversineDistanceMiles(this.anchorCoord, coord) * 1609.344;

		switch (this.engineState) {
			case 'IDLE_ANCHORED': {
				// Check anchor qualification
				const dwellMinutes = (now - this.anchorStartTime) / 60000;
				const requiredMinutes = this.isHomeAnchor
					? this.config.homeDepartureDwellMinutes
					: this.config.standardOriginDwellMinutes;

				if (dwellMinutes >= requiredMinutes) {
					this.isAnchorQualified = true;
				}

				// Check departure condition: distance displacement > 100m AND speed > 12 mph
				const isExitingGeofence =
					distFromAnchorMeters > this.config.geofenceExitRadiusMeters;
				const isDrivingSpeed =
					this.lastSpeedMph >= this.config.drivingSpeedThresholdMph;

				if (isDrivingSpeed) {
					this.consecutiveDrivingReadings += 1;
				} else {
					this.consecutiveDrivingReadings = 0;
				}

				if (
					isExitingGeofence &&
					(isDrivingSpeed || this.consecutiveDrivingReadings >= 2)
				) {
					// TRANSITION: IDLE_ANCHORED -> DRIVING
					this.transitionToDriving(coord, now);
				}
				break;
			}

			case 'DRIVING': {
				if (!this.activeTrip) return;

				const stepDistMiles = haversineDistanceMiles(
					this.activeTrip.lastBreadcrumbCoord,
					coord,
				);
				const stepDistMeters = stepDistMiles * 1609.344;
				const timeSinceLastBreadcrumb =
					now - this.activeTrip.lastBreadcrumbTime;

				// Record breadcrumb every 5 seconds or 25 meters (filter jitter)
				if (stepDistMeters >= 25 || timeSinceLastBreadcrumb >= 5000) {
					if (stepDistMiles > 0.003) {
						this.activeTrip.accumulatedMiles += stepDistMiles;
					}
					this.activeTrip.path.push({
						lat: coord.lat,
						lng: coord.lng,
						timestamp: now,
					});
					this.activeTrip.lastBreadcrumbCoord = coord;
					this.activeTrip.lastBreadcrumbTime = now;
					this.persistState();

					this.onStatusChange({
						state: 'TRACKING_TRIP',
						originName: this.activeTrip.originName,
						destinationName: 'Moving...',
						currentMiles: Number(
							this.activeTrip.accumulatedMiles.toFixed(1),
						),
						startTime: this.activeTrip.startTime,
						liveLocation: coord,
					});
				}

				// Check micro-stop entry (Speed < 3 mph for 60s)
				if (
					this.lastSpeedMph < this.config.stationarySpeedThresholdMph
				) {
					if (!this.currentStop) {
						this.currentStop = {
							stopStartTime: now,
							stopCentroid: coord,
							lastCreepCoord: coord,
							lowSpeedCounterSeconds: 1,
						};
					} else {
						this.currentStop.lowSpeedCounterSeconds += 1;
						if (
							this.currentStop.lowSpeedCounterSeconds >=
							this.config.microStopGraceSeconds
						) {
							// TRANSITION: DRIVING -> STOPPED_EVALUATING
							this.engineState = 'STOPPED_EVALUATING';
						}
					}
				} else {
					// Moving normally
					this.currentStop = null;
				}
				break;
			}

			case 'STOPPED_EVALUATING': {
				if (!this.activeTrip || !this.currentStop) return;

				// Rule C: Creep reset in traffic jam (moves > 35m resets stop timer)
				const creepDistMeters =
					haversineDistanceMiles(
						this.currentStop.lastCreepCoord,
						coord,
					) * 1609.344;
				if (creepDistMeters > 35) {
					this.currentStop.lastCreepCoord = coord;
					this.currentStop.stopStartTime = now;
				}

				// Check if vehicle resumed driving
				if (this.lastSpeedMph >= this.config.drivingSpeedThresholdMph) {
					const stopDurationSeconds =
						(now - this.currentStop.stopStartTime) / 1000;

					// If stopped between 60s and destination threshold, log waypoint
					if (
						stopDurationSeconds >=
							this.config.microStopGraceSeconds &&
						stopDurationSeconds <
							this.config.destinationDwellMinutes * 60
					) {
						const waypointLabel =
							await this.resolveLocationName(coord);
						this.activeTrip.waypoints.push({
							coordinate: coord,
							label: waypointLabel,
							dwellSeconds: Math.round(stopDurationSeconds),
							arrivedAt: new Date(
								this.currentStop.stopStartTime,
							).toLocaleTimeString([], {
								hour: 'numeric',
								minute: '2-digit',
							}),
						});
					}

					// Resume DRIVING
					this.currentStop = null;
					this.engineState = 'DRIVING';
					break;
				}

				// Check if stationary >= destinationDwellMinutes
				const stopSeconds =
					(now - this.currentStop.stopStartTime) / 1000;
				if (stopSeconds >= this.config.destinationDwellMinutes * 60) {
					// TRANSITION: STOPPED_EVALUATING -> DESTINATION_REACHED
					await this.triggerDestinationReached(coord);
				}
				break;
			}

			case 'DESTINATION_REACHED': {
				// Transient state
				break;
			}
		}

		this.emitTelemetry();
	}

	/**
	 * Periodic timer evaluation for dwell counting and state transitions
	 */
	private evaluateTimeTransitions() {
		const now = Date.now();

		if (this.engineState === 'IDLE_ANCHORED') {
			const dwellMins = (now - this.anchorStartTime) / 60000;
			const targetMins = this.isHomeAnchor
				? this.config.homeDepartureDwellMinutes
				: this.config.standardOriginDwellMinutes;
			if (dwellMins >= targetMins) {
				this.isAnchorQualified = true;
			}
		} else if (
			this.engineState === 'STOPPED_EVALUATING' &&
			this.currentStop
		) {
			const stopSecs = (now - this.currentStop.stopStartTime) / 1000;
			if (stopSecs >= this.config.destinationDwellMinutes * 60) {
				this.triggerDestinationReached(this.lastCoord);
			}
		}
	}

	private transitionToDriving(coord: Coordinate, now: number) {
		this.engineState = 'DRIVING';
		this.activeTrip = {
			originName: this.anchorName,
			originCoord: this.anchorCoord,
			startTime: now,
			path: [
				{
					lat: this.anchorCoord.lat,
					lng: this.anchorCoord.lng,
					timestamp: this.anchorStartTime,
				},
				{ lat: coord.lat, lng: coord.lng, timestamp: now },
			],
			waypoints: [],
			accumulatedMiles: haversineDistanceMiles(this.anchorCoord, coord),
			lastBreadcrumbTime: now,
			lastBreadcrumbCoord: coord,
		};
		this.currentStop = null;
		this.persistState();

		this.onStatusChange({
			state: 'TRACKING_TRIP',
			originName: this.activeTrip.originName,
			destinationName: 'Moving...',
			currentMiles: Number(this.activeTrip.accumulatedMiles.toFixed(1)),
			startTime: this.activeTrip.startTime,
		});
	}

	private async triggerDestinationReached(endCoord: Coordinate) {
		this.engineState = 'DESTINATION_REACHED';
		const destName = await this.resolveLocationName(endCoord);
		await this.completeTrip(destName, endCoord);
	}

	private async completeTrip(destName: string, endCoord: Coordinate) {
		if (!this.activeTrip) {
			this.resetToIdleState(destName, endCoord);
			return;
		}

		// Rule D: Discard trip if accumulated miles < 0.3 miles or moving duration < 90 seconds
		const movingDurationSeconds =
			(Date.now() - this.activeTrip.startTime) / 1000;
		if (
			this.activeTrip.accumulatedMiles < this.config.minValidTripMiles ||
			movingDurationSeconds < 90
		) {
			this.resetToIdleState(destName, endCoord);
			return;
		}

		const startCoord = this.activeTrip.originCoord;
		const fromName = this.activeTrip.originName;
		const toName = destName;

		let finalCoords: Coordinate[] = (this.activeTrip.path || []).map(
			(p) => ({
				lat: p.lat,
				lng: p.lng,
			}),
		);
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
			console.warn('Road snap fallback', e);
		}

		if (finalMiles < 0.3) {
			finalMiles = 0.3;
		}

		const costDollars = Number((finalMiles * this.mileageRate).toFixed(2));
		const laborMinutes =
			this.hourlyWage > 0
				? Number(((costDollars / this.hourlyWage) * 60).toFixed(1))
				: 0;

		const category = this.categorizeDestination(toName);

		const recordedTrip: RecordedTrip = {
			id: `trip-auto-${Date.now()}`,
			from: fromName,
			to: toName,
			miles: finalMiles,
			cost: costDollars,
			timestamp: 'Just now',
			status: 'UNLOGGED',
			coordinates: finalCoords,
			// Extended 4-state engine fields
			originName: fromName,
			destinationName: toName,
			originCoord: startCoord,
			destinationCoord: endCoord,
			path: this.activeTrip.path,
			waypoints: this.activeTrip.waypoints,
			distanceMiles: finalMiles,
			costDollars,
			laborMinutes,
			startedAt: new Date(this.activeTrip.startTime).toLocaleTimeString(
				[],
				{
					hour: 'numeric',
					minute: '2-digit',
				},
			),
			endedAt: new Date().toLocaleTimeString([], {
				hour: 'numeric',
				minute: '2-digit',
			}),
			destinationCategory: category,
		};

		this.onTripRecorded(recordedTrip);
		this.resetToIdleState(toName, endCoord);
	}

	private resetToIdleState(anchorName: string, anchorCoord: Coordinate) {
		const isHome =
			haversineDistanceMiles(anchorCoord, {
				lat: this.homeAddress.lat,
				lng: this.homeAddress.lng,
			}) <= 0.08;

		this.engineState = 'IDLE_ANCHORED';
		this.anchorName = isHome ? 'Home' : anchorName;
		this.anchorCoord = anchorCoord;
		this.anchorStartTime = Date.now();
		this.isHomeAnchor = isHome;
		this.isAnchorQualified = !isHome; // Non-home settled place qualifies standard dwell
		this.activeTrip = null;
		this.currentStop = null;
		this.persistState();

		this.onStatusChange({
			state: isHome ? 'AT_HOME' : 'STATIONARY',
			originName: this.anchorName,
			dwellMinutes: 0,
			liveLocation: anchorCoord,
		});

		this.emitTelemetry();
	}

	private categorizeDestination(
		name: string,
	): 'RETAIL' | 'GROCERY' | 'FOOD' | 'FITNESS' | 'SAVED_PLACE' | 'OTHER' {
		const lower = name.toLowerCase();
		if (
			lower.includes('shoprite') ||
			lower.includes('market') ||
			lower.includes('target') ||
			lower.includes('walmart') ||
			lower.includes('grocery')
		) {
			return 'GROCERY';
		}
		if (
			lower.includes('starbucks') ||
			lower.includes('dunkin') ||
			lower.includes('wawa') ||
			lower.includes('restaurant') ||
			lower.includes('deli')
		) {
			return 'FOOD';
		}
		if (
			lower.includes('sportime') ||
			lower.includes('gym') ||
			lower.includes('fitness')
		) {
			return 'FITNESS';
		}
		if (
			lower.includes('home') ||
			lower.includes('school') ||
			lower.includes('rowan')
		) {
			return 'SAVED_PLACE';
		}
		return 'OTHER';
	}

	public async resolveLocationName(coord: Coordinate): Promise<string> {
		const distToHome = haversineDistanceMiles(coord, {
			lat: this.homeAddress.lat,
			lng: this.homeAddress.lng,
		});
		if (distToHome <= 0.08) return 'Home';

		const distToRowan = haversineDistanceMiles(coord, {
			lat: 39.7144,
			lng: -75.1185,
		});
		if (distToRowan <= 0.25) return "Rowan's House";

		try {
			const addr = await reverseGeocode(coord);
			if (addr) {
				const shortPart = addr.split(',')[0].trim();
				return shortPart || 'Waypoint';
			}
		} catch (e) {
			console.warn('Location name fallback', e);
		}
		return 'Stationary Stop';
	}

	private emitTelemetry() {
		if (!this.onTelemetryUpdate) return;

		const now = Date.now();
		const dwellSec = Math.floor((now - this.anchorStartTime) / 1000);
		const targetDwellSec =
			(this.isHomeAnchor
				? this.config.homeDepartureDwellMinutes
				: this.config.standardOriginDwellMinutes) * 60;
		const stopSec = this.currentStop
			? Math.floor((now - this.currentStop.stopStartTime) / 1000)
			: 0;
		const distToAnchorMeters = Math.round(
			haversineDistanceMiles(this.anchorCoord, this.lastCoord) * 1609.344,
		);

		this.onTelemetryUpdate({
			state: this.engineState,
			speedMph: this.lastSpeedMph,
			accuracyMeters: this.lastAccuracyMeters,
			dwellSeconds: dwellSec,
			targetDwellSeconds: targetDwellSec,
			stopSeconds: stopSec,
			distanceToAnchorMeters: distToAnchorMeters,
			accumulatedMiles: this.activeTrip
				? Number((this.activeTrip.accumulatedMiles || 0).toFixed(1))
				: 0,
			breadcrumbsCount: this.activeTrip?.path?.length || 0,
			originName: this.activeTrip
				? this.activeTrip.originName
				: this.anchorName,
			destinationName: this.activeTrip ? 'Moving...' : undefined,
			lastUpdated: now,
		});
	}

	// ─── DEV SIMULATION METHODS FOR DESK TESTING ─────────────────────────

	public simulateDeparture(speedMph: number = 26) {
		const simulatedCoord: Coordinate = {
			lat: this.anchorCoord.lat + 0.005,
			lng: this.anchorCoord.lng + 0.005,
		};
		this.isAnchorQualified = true;
		this.processPosition(simulatedCoord, speedMph, 10);
	}

	public simulateMicroStop() {
		if (this.engineState !== 'DRIVING') {
			this.simulateDeparture(25);
		}
		this.processPosition(this.lastCoord, 1.5, 8);
		// Force transition to STOPPED_EVALUATING for instant desk check
		this.engineState = 'STOPPED_EVALUATING';
		if (!this.currentStop) {
			this.currentStop = {
				stopStartTime: Date.now(),
				stopCentroid: this.lastCoord,
				lastCreepCoord: this.lastCoord,
				lowSpeedCounterSeconds: 65,
			};
		}
		this.emitTelemetry();
	}

	public simulateResumeDriving(speedMph: number = 32) {
		const nextCoord: Coordinate = {
			lat: this.lastCoord.lat + 0.004,
			lng: this.lastCoord.lng + 0.004,
		};
		this.processPosition(nextCoord, speedMph, 12);
	}

	public async simulateDestinationReached(
		destName: string = "Rowan's House",
	) {
		const endCoord: Coordinate = {
			lat: 39.7144,
			lng: -75.1185,
		};
		if (!this.activeTrip) {
			this.simulateDeparture(28);
		}
		if (this.activeTrip) {
			this.activeTrip.accumulatedMiles = Math.max(
				1.8,
				this.activeTrip.accumulatedMiles,
			);
		}
		await this.triggerDestinationReached(endCoord);
	}

	public resetToIdle() {
		this.resetToIdleState('Home', {
			lat: this.homeAddress.lat,
			lng: this.homeAddress.lng,
		});
	}

	private persistState() {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(
				'imcheap_trip_tracker_state',
				JSON.stringify({
					engineState: this.engineState,
					anchorName: this.anchorName,
					anchorCoord: this.anchorCoord,
					anchorStartTime: this.anchorStartTime,
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
				if (parsed?.anchorName) this.anchorName = parsed.anchorName;
				if (parsed?.anchorCoord) this.anchorCoord = parsed.anchorCoord;
				if (parsed?.anchorStartTime)
					this.anchorStartTime = parsed.anchorStartTime;
				if (parsed?.engineState) this.engineState = parsed.engineState;
				if (parsed?.activeTrip) {
					const at = parsed.activeTrip;
					let path = Array.isArray(at.path) ? at.path : [];
					if (path.length === 0 && Array.isArray(at.coordinates)) {
						path = at.coordinates.map((c: Coordinate) => ({
							lat: c.lat,
							lng: c.lng,
							timestamp: at.startTime || Date.now(),
						}));
					}
					const originCoord = at.originCoord || this.anchorCoord;
					this.activeTrip = {
						originName: at.originName || 'Trip Origin',
						originCoord,
						startTime: at.startTime || Date.now(),
						path,
						waypoints: Array.isArray(at.waypoints)
							? at.waypoints
							: [],
						accumulatedMiles:
							typeof at.accumulatedMiles === 'number'
								? at.accumulatedMiles
								: 0,
						lastBreadcrumbTime: at.lastBreadcrumbTime || Date.now(),
						lastBreadcrumbCoord:
							at.lastBreadcrumbCoord ||
							(path.length > 0
								? {
										lat: path[path.length - 1].lat,
										lng: path[path.length - 1].lng,
									}
								: originCoord),
					};
				}
			}
		} catch (e) {
			console.warn('Failed to restore trip tracker state', e);
		}
	}
}
