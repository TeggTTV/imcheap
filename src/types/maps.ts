export interface Coordinate {
	lat: number;
	lng: number;
}

export type TrackingEngineState =
	| 'IDLE_ANCHORED'
	| 'DRIVING'
	| 'STOPPED_EVALUATING'
	| 'DESTINATION_REACHED';

export interface TripWaypoint {
	coordinate: Coordinate;
	label?: string;
	dwellSeconds: number;
	arrivedAt: string;
}

export interface RecordedTrip {
	id: string;
	from: string;
	to: string;
	miles: number;
	cost: number;
	timestamp: string;
	status: 'UNLOGGED' | 'LOGGED' | 'IGNORED';
	coordinates: Coordinate[]; // Path points for drawing the polyline on map tap
	// Extended 4-state engine fields
	originName?: string;
	destinationName?: string;
	originCoord?: Coordinate;
	destinationCoord?: Coordinate;
	path?: Array<{ lat: number; lng: number; timestamp: number }>;
	waypoints?: TripWaypoint[];
	distanceMiles?: number;
	costDollars?: number;
	laborMinutes?: number;
	startedAt?: string;
	endedAt?: string;
	destinationCategory?:
		| 'RETAIL'
		| 'GROCERY'
		| 'FOOD'
		| 'FITNESS'
		| 'SAVED_PLACE'
		| 'OTHER';
}

export interface SmartPrompt {
	id: string;
	type: 'FREQUENT_ROUTE' | 'MERCHANT_STOP';
	title: string;
	subtitle: string;
	ctaLabel: string;
	payload: {
		name: string;
		miles?: number;
		category?: string;
	};
}

export interface SavedHomeAddress {
	address: string;
	lat: number;
	lng: number;
}

export interface SavedLocation {
	id: string;
	name: string;
	address: string;
	lat: number;
	lng: number;
	icon: string;
	radius?: number; // Geofence radius in meters (50m - 1000m, default 150m)
	isHome?: boolean;
	isVisibleOnMap: boolean;
	createdAt?: string;
}

export interface LiveTrackingStatus {
	state: 'LOCATING' | 'AT_HOME' | 'STATIONARY' | 'TRACKING_TRIP';
	originName?: string;
	destinationName?: string;
	dwellMinutes?: number;
	currentMiles?: number;
	startTime?: number;
	liveLocation?: Coordinate;
	liveBreadcrumbs?: Coordinate[];
	isDriving?: boolean;
}

export interface TripEngineConfig {
	homeDepartureDwellMinutes: number; // Default: 15 min
	standardOriginDwellMinutes: number; // Default: 5 min
	destinationDwellMinutes: number; // Default: 5 min (adjustable 3-15)
	microStopGraceSeconds: number; // Default: 60 sec
	geofenceExitRadiusMeters: number; // Default: 100 m
	stationaryRadiusMeters: number; // Default: 75 m
	drivingSpeedThresholdMph: number; // Default: 12 mph
	stationarySpeedThresholdMph: number; // Default: 3 mph
	maxHorizontalAccuracyMeters: number; // Default: 35 m
	minValidTripMiles: number; // Default: 0.3 mi
}

export interface DevTrackingTelemetry {
	state: TrackingEngineState;
	speedMph: number;
	accuracyMeters: number;
	dwellSeconds: number;
	targetDwellSeconds: number;
	stopSeconds: number;
	distanceToAnchorMeters: number;
	accumulatedMiles?: number;
	originName?: string;
	destinationName?: string;
	breadcrumbsCount?: number;
	lastUpdated?: number;
}
