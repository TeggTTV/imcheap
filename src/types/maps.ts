export interface Coordinate {
	lat: number;
	lng: number;
}

export interface RecordedTrip {
	id: string;
	from: string;
	to: string;
	miles: number;
	cost: number;
	timestamp: string;
	status: 'UNLOGGED' | 'LOGGED';
	coordinates: Coordinate[]; // Path points for drawing the polyline on map tap
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

export interface LiveTrackingStatus {
	state: 'AT_HOME' | 'STATIONARY' | 'TRACKING_TRIP';
	originName?: string;
	destinationName?: string;
	dwellMinutes?: number;
	currentMiles?: number;
	startTime?: number;
}

