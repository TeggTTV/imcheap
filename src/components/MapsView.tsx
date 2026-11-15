import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinate, RecordedTrip } from '../types/maps';

export interface MapsViewProps {
	trips: RecordedTrip[];
	onLogTrip: (trip: RecordedTrip) => void;
	onSimulateTrip: () => void;
	hourlyWage: number;
	mileageRate: number;
	autoTripDetection?: boolean;
}

const DEFAULT_CENTER: [number, number] = [39.7099, -75.1188]; // Rowan / Glassboro NJ area

export const MapsView: React.FC<MapsViewProps> = ({
	trips,
	onLogTrip,
	onSimulateTrip,
	hourlyWage,
	mileageRate,
	autoTripDetection = false,
}) => {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<L.Map | null>(null);
	const polylineLayerRef = useRef<L.Polyline | null>(null);
	const markersLayerRef = useRef<L.LayerGroup | null>(null);
	const userMarkerRef = useRef<L.Marker | null>(null);

	const [userLocation, setUserLocation] = useState<Coordinate>({
		lat: DEFAULT_CENTER[0],
		lng: DEFAULT_CENTER[1],
	});
	const [activeTripId, setActiveTripId] = useState<string | null>(() => {
		// Default to first unlogged trip or first trip
		return trips[0]?.id || null;
	});
	const [gpsStatus, setGpsStatus] = useState<'Ready' | 'Tracking' | 'Idle'>(
		autoTripDetection ? 'Tracking' : 'Ready',
	);

	// Get initial user GPS coordinates if permitted
	useEffect(() => {
		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const coords = {
						lat: pos.coords.latitude,
						lng: pos.coords.longitude,
					};
					setUserLocation(coords);
					if (!activeTripId && mapInstanceRef.current) {
						mapInstanceRef.current.setView([coords.lat, coords.lng], 14);
					}
				},
				() => {
					// Fallback to default center
				},
				{ timeout: 5000 },
			);
		}
	}, [activeTripId]);

	// Initialize Leaflet map
	useEffect(() => {
		if (!mapContainerRef.current) return;
		if (mapInstanceRef.current) return;

		const map = L.map(mapContainerRef.current, {
			center: [userLocation.lat, userLocation.lng],
			zoom: 14,
			zoomControl: false,
			attributionControl: false,
		});

		// Monochrome OpenStreetMap basemap
		L.tileLayer(
			'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
			{
				maxZoom: 19,
			},
		).addTo(map);

		const markersGroup = L.layerGroup().addTo(map);
		markersLayerRef.current = markersGroup;

		// Create live user pulsing marker
		const userIcon = L.divIcon({
			className: 'bg-transparent',
			html: `
				<div class="relative flex items-center justify-center w-7 h-7">
					<div class="absolute w-7 h-7 rounded-full bg-emerald-500/25 animate-ping"></div>
					<div class="relative w-4 h-4 rounded-full bg-[#111111] border-[2.5px] border-white shadow-md"></div>
				</div>
			`,
			iconSize: [28, 28],
			iconAnchor: [14, 14],
		});

		const userMarker = L.marker([userLocation.lat, userLocation.lng], {
			icon: userIcon,
			zIndexOffset: 1000,
		}).addTo(map);
		userMarkerRef.current = userMarker;

		mapInstanceRef.current = map;

		// Auto fit to initial active trip if any
		const initialTrip = trips.find((t) => t.id === activeTripId) || trips[0];
		if (initialTrip && initialTrip.coordinates.length > 0) {
			drawTripRoute(map, markersGroup, initialTrip);
		}

		return () => {
			map.remove();
			mapInstanceRef.current = null;
		};
	}, []);

	// Update user marker if coordinates change
	useEffect(() => {
		if (userMarkerRef.current) {
			userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
		}
	}, [userLocation]);

	const drawTripRoute = (
		map: L.Map,
		markersGroup: L.LayerGroup,
		trip: RecordedTrip,
	) => {
		if (!trip.coordinates || trip.coordinates.length === 0) return;

		// Clear previous route & markers
		if (polylineLayerRef.current) {
			map.removeLayer(polylineLayerRef.current);
			polylineLayerRef.current = null;
		}
		markersGroup.clearLayers();

		const latLngs: [number, number][] = trip.coordinates.map((c) => [
			c.lat,
			c.lng,
		]);

		// Polyline with bold high-contrast styling matching blueprint
		const polyline = L.polyline(latLngs, {
			color: '#111111',
			weight: 4,
			opacity: 0.9,
			lineCap: 'round',
			lineJoin: 'round',
		}).addTo(map);
		polylineLayerRef.current = polyline;

		// Start Marker "A"
		const startCoord = latLngs[0];
		const iconA = L.divIcon({
			className: 'bg-transparent',
			html: `
				<div class="w-7 h-7 rounded-full bg-white border-2 border-[#111111] text-[#111111] font-black text-[12px] flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2">
					A
				</div>
			`,
			iconSize: [28, 28],
		});
		L.marker(startCoord, { icon: iconA }).addTo(markersGroup);

		// End Marker "B"
		const endCoord = latLngs[latLngs.length - 1];
		const iconB = L.divIcon({
			className: 'bg-transparent',
			html: `
				<div class="w-7 h-7 rounded-full bg-[#111111] border-2 border-white text-white font-black text-[12px] flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2">
					B
				</div>
			`,
			iconSize: [28, 28],
		});
		L.marker(endCoord, { icon: iconB }).addTo(markersGroup);

		// Fit map bounds with padding
		const bounds = L.latLngBounds(latLngs);
		map.fitBounds(bounds, {
			padding: [44, 44],
			maxZoom: 16,
			animate: true,
		});
	};

	const handleSelectTrip = (trip: RecordedTrip) => {
		setActiveTripId(trip.id);
		if (mapInstanceRef.current && markersLayerRef.current) {
			drawTripRoute(mapInstanceRef.current, markersLayerRef.current, trip);
		}
	};

	const handleCenterOnMe = () => {
		if (!mapInstanceRef.current) return;
		setActiveTripId(null);
		if (polylineLayerRef.current) {
			mapInstanceRef.current.removeLayer(polylineLayerRef.current);
			polylineLayerRef.current = null;
		}
		if (markersLayerRef.current) {
			markersLayerRef.current.clearLayers();
		}
		mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 14, {
			animate: true,
		});
	};

	const activeTrip = trips.find((t) => t.id === activeTripId);
	const activeMiles = activeTrip ? activeTrip.miles : 12.8;
	const activeLaborMinutes =
		hourlyWage > 0
			? ((activeMiles * mileageRate) / hourlyWage) * 60
			: 6.3;

	// Total labor for bottom index
	const totalLaborMinutes = trips.reduce((acc, t) => {
		const cost = t.miles * mileageRate;
		return acc + (hourlyWage > 0 ? (cost / hourlyWage) * 60 : 0);
	}, 0);

	return (
		<div className="flex flex-col gap-5 pb-28 pt-2 px-margin-sm max-w-120 mx-auto w-full select-none">
			{/* Header Title Row */}
			<div className="flex items-center justify-between px-1">
				<div className="flex items-baseline gap-2">
					<h1 className="text-[26px] font-black tracking-tight text-[#111111]">
						Maps
					</h1>
					<span className="text-[11px] font-extrabold uppercase tracking-widest text-[#6B7280]">
						Tracker
					</span>
				</div>

				<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200/70 shadow-2xs">
					<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
					<span className="text-[11.5px] font-semibold text-[#111111]">
						GPS {gpsStatus}
					</span>
				</div>
			</div>

			{/* Custom Grayscale Map Card */}
			<div className="relative w-full h-[320px] rounded-3xl overflow-hidden border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] bg-white">
				{/* Map Container with strict desaturation filter */}
				<div
					ref={mapContainerRef}
					className="w-full h-full z-0"
					style={{
						filter: 'grayscale(100%) contrast(1.05) brightness(1.02)',
					}}
				/>

				{/* Floating Pill: Top-Left Active Commute Indicator */}
				<div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
					<div className="bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 shadow-md border border-neutral-200/60 flex items-center gap-1.5">
						<span className="material-symbols-outlined text-[16px] text-[#111111]">
							directions_car
						</span>
						<span className="text-[12px] font-bold text-[#111111]">
							{activeTrip ? `${activeTrip.from} → ${activeTrip.to}` : 'Active Commute'}
						</span>
					</div>
				</div>

				{/* Floating Pill: Bottom-Left Trip Stat */}
				<div className="absolute bottom-3.5 left-3.5 z-10 pointer-events-none">
					<div className="bg-white/95 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-md border border-neutral-200/60 flex items-center gap-2">
						<span className="text-[13px] font-black text-[#111111] tabular-nums">
							{activeMiles.toFixed(1)} mi
						</span>
						<span className="text-gray-300 font-bold">•</span>
						<span className="text-[12px] font-bold text-[#059669] flex items-center gap-1 tabular-nums">
							<span className="material-symbols-outlined text-[14px]">
								schedule
							</span>
							{activeLaborMinutes.toFixed(1)}m labor
						</span>
					</div>
				</div>

				{/* Floating Target Button: Bottom-Right Recenter */}
				<button
					type="button"
					onClick={handleCenterOnMe}
					aria-label="Center on live location"
					className="absolute bottom-3.5 right-3.5 z-10 w-10 h-10 rounded-full bg-white shadow-md border border-neutral-200/60 flex items-center justify-center text-[#111111] hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer"
				>
					<span className="material-symbols-outlined text-[20px]">
						my_location
					</span>
				</button>
			</div>

			{/* Recorded Trips Section */}
			<section className="flex flex-col gap-2.5">
				<div className="flex items-center justify-between px-1">
					<div className="flex items-center gap-2">
						<span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
							Recorded Trips
						</span>
						<span className="w-5 h-5 rounded-full bg-neutral-100 text-[#111111] flex items-center justify-center text-[11px] font-bold tabular-nums">
							{trips.length}
						</span>
					</div>

					<button
						type="button"
						onClick={onSimulateTrip}
						data-testid="simulate-trip-btn"
						className="text-[12.5px] font-bold text-[#111111] hover:text-[#059669] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
					>
						<span className="material-symbols-outlined text-[16px]">add</span>
						<span>Simulate Trip</span>
					</button>
				</div>

				{/* Grouped White Card: Trips List */}
				<div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden divide-y divide-gray-100">
					{trips.length === 0 ? (
						<div className="p-8 text-center text-[#6B7280] text-sm">
							No trips recorded yet. Tap "Simulate Trip" above to test.
						</div>
					) : (
						trips.map((trip) => {
							const isSelected = trip.id === activeTripId;
							const tripLaborMinutes =
								hourlyWage > 0
									? ((trip.cost || trip.miles * mileageRate) / hourlyWage) * 60
									: 0;

							return (
								<div
									key={trip.id}
									data-testid={`trip-row-${trip.id}`}
									onClick={() => handleSelectTrip(trip)}
									className={`relative p-4 flex items-center justify-between cursor-pointer transition-colors ${
										isSelected
											? 'bg-neutral-50/70'
											: 'hover:bg-neutral-50/40 bg-white'
									}`}
								>
									{/* Active left indicator bar */}
									{isSelected && (
										<div className="absolute left-0 top-3 bottom-3 w-1.5 bg-[#111111] rounded-r-full" />
									)}

									{/* Left Column: Route Title & Subtext */}
									<div className="flex flex-col min-w-0 pr-2 pl-1">
										<div className="flex items-center gap-1.5">
											<span className="text-[15px] font-bold text-[#111111] truncate">
												{trip.from} → {trip.to}
											</span>
											<span className="material-symbols-outlined text-[15px] text-gray-400">
												north_east
											</span>
										</div>
										<span className="text-[12px] text-[#6B7280] truncate mt-0.5 tabular-nums">
											{trip.miles.toFixed(1)} mi · {tripLaborMinutes.toFixed(1)}m labor · {trip.timestamp}
										</span>
									</div>

									{/* Right Column: Cost & Action Button */}
									<div className="flex flex-col items-end gap-1 shrink-0">
										<span className="text-[15px] font-bold text-[#111111] tabular-nums">
											${trip.cost.toFixed(2)}
										</span>

										{trip.status === 'UNLOGGED' ? (
											<button
												type="button"
												data-testid={`log-trip-${trip.id}`}
												onClick={(e) => {
													e.stopPropagation();
													onLogTrip(trip);
												}}
												className="bg-[#ECFDF5] hover:bg-[#D1FAE5] active:scale-95 text-[#059669] border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold transition-all cursor-pointer shadow-2xs"
											>
												Unlogged • Log
											</button>
										) : (
											<span className="bg-neutral-100 text-neutral-500 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium">
												Logged ✓
											</span>
										)}
									</div>
								</div>
							);
						})
					)}
				</div>
			</section>

			{/* Bottom Transit Mileage Index Card */}
			<div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] p-4 flex items-center justify-between gap-3">
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-10 h-10 rounded-2xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
						<span className="material-symbols-outlined text-[20px]">
							bolt
						</span>
					</div>
					<div className="flex flex-col min-w-0">
						<span className="text-[14px] font-bold text-[#111111] truncate">
							Transit Mileage Index
						</span>
						<span className="text-[11.5px] text-[#6B7280] truncate tabular-nums">
							Fuel burn converted into {totalLaborMinutes.toFixed(1)}m total labor this week
						</span>
					</div>
				</div>

				<div className="bg-[#ECFDF5] text-[#059669] px-2.5 py-1 rounded-xl text-[12px] font-bold shrink-0 tabular-nums">
					-12% cost
				</div>
			</div>
		</div>
	);
};
