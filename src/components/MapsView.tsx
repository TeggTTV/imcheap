import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinate, RecordedTrip } from '../types/maps';
import {
	fetchRoadRoute,
	DEFAULT_ROAD_ROUTES,
} from '../utils/mapRouting';
import { SwipeableTripItem } from './SwipeableTripItem';

export interface MapsViewProps {
	trips: RecordedTrip[];
	onLogTrip: (trip: RecordedTrip) => void;
	onDeleteTrip?: (id: string) => void;
	hourlyWage: number;
	mileageRate: number;
	autoTripDetection?: boolean;
}

const DEFAULT_CENTER: [number, number] = [39.7032, -75.122]; // Glassboro, NJ (Girard Rd area)

export const MapsView: React.FC<MapsViewProps> = ({
	trips,
	onLogTrip,
	onDeleteTrip,
	hourlyWage,
	mileageRate,
	autoTripDetection = false,
}) => {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<L.Map | null>(null);
	const polylineLayerRef = useRef<L.Polyline | null>(null);
	const markersLayerRef = useRef<L.LayerGroup | null>(null);
	const userMarkerRef = useRef<L.Marker | null>(null);

	// User location state, prioritizing calibrated address if saved in Settings
	const [userLocation, setUserLocation] = useState<Coordinate>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem(
					'imcheap_user_custom_location',
				);
				if (saved) {
					const parsed = JSON.parse(saved);
					if (parsed?.lat && parsed?.lng) return parsed;
				}
			} catch {}
		}
		return { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
	});

	const [activeTripId, setActiveTripId] = useState<string | null>(() => {
		return trips[0]?.id || null;
	});

	// High accuracy GPS detection
	useEffect(() => {
		if (!('geolocation' in navigator)) return;

		const hasCustomLocation = Boolean(
			localStorage.getItem('imcheap_user_custom_location'),
		);

		const watchId = navigator.geolocation.watchPosition(
			(pos) => {
				const coords = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				};
				if (!hasCustomLocation) {
					setUserLocation(coords);
					if (!activeTripId && mapInstanceRef.current) {
						mapInstanceRef.current.setView(
							[coords.lat, coords.lng],
							15,
						);
					}
				}
			},
			(err) => {
				console.warn('Geolocation error / high accuracy fallback', err);
			},
			{
				enableHighAccuracy: true,
				timeout: 15000,
				maximumAge: 0,
			},
		);

		return () => {
			navigator.geolocation.clearWatch(watchId);
		};
	}, [autoTripDetection, activeTripId]);

	// Initialize Leaflet map
	useEffect(() => {
		if (!mapContainerRef.current) return;
		if (mapInstanceRef.current) return;

		const map = L.map(mapContainerRef.current, {
			center: [userLocation.lat, userLocation.lng],
			zoom: 15,
			zoomControl: false,
			attributionControl: false,
		});

		// Clean OpenStreetMap tiles with high-contrast grayscale filter
		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
		}).addTo(map);

		const markersGroup = L.layerGroup().addTo(map);
		markersLayerRef.current = markersGroup;

		// Pulsing user location marker
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
		const initialTrip =
			trips.find((t) => t.id === activeTripId) || trips[0];
		if (initialTrip) {
			renderTripRoute(map, markersGroup, initialTrip);
		}

		return () => {
			map.remove();
			mapInstanceRef.current = null;
		};
	}, []);

	// Update user marker when userLocation changes
	useEffect(() => {
		if (userMarkerRef.current) {
			userMarkerRef.current.setLatLng([
				userLocation.lat,
				userLocation.lng,
			]);
		}
	}, [userLocation]);

	const renderTripRoute = async (
		map: L.Map,
		markersGroup: L.LayerGroup,
		trip: RecordedTrip,
	) => {
		if (polylineLayerRef.current) {
			map.removeLayer(polylineLayerRef.current);
			polylineLayerRef.current = null;
		}
		markersGroup.clearLayers();

		let coords = trip.coordinates;

		if (DEFAULT_ROAD_ROUTES[trip.id]) {
			coords = DEFAULT_ROAD_ROUTES[trip.id];
		} else if (!coords || coords.length < 20) {
			if (coords && coords.length >= 2) {
				const start = coords[0];
				const end = coords[coords.length - 1];
				const roadData = await fetchRoadRoute(start, end);
				if (roadData && roadData.coordinates.length > 0) {
					coords = roadData.coordinates;
				}
			}
		}

		if (!coords || coords.length === 0) return;

		const latLngs: [number, number][] = coords.map((c) => [c.lat, c.lng]);

		// Polyline snapped to real streets
		const polyline = L.polyline(latLngs, {
			color: '#111111',
			weight: 4.5,
			opacity: 0.95,
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

		const bounds = L.latLngBounds(latLngs);
		map.fitBounds(bounds, {
			padding: [48, 48],
			maxZoom: 16,
			animate: true,
		});
	};

	const handleSelectTrip = (trip: RecordedTrip) => {
		setActiveTripId(trip.id);
		if (mapInstanceRef.current && markersLayerRef.current) {
			renderTripRoute(
				mapInstanceRef.current,
				markersLayerRef.current,
				trip,
			);
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

		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const coords = {
						lat: pos.coords.latitude,
						lng: pos.coords.longitude,
					};
					setUserLocation(coords);
					mapInstanceRef.current?.setView(
						[coords.lat, coords.lng],
						16,
						{
							animate: true,
						},
					);
				},
				() => {
					mapInstanceRef.current?.setView(
						[userLocation.lat, userLocation.lng],
						16,
						{ animate: true },
					);
				},
				{ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
			);
		} else {
			mapInstanceRef.current.setView(
				[userLocation.lat, userLocation.lng],
				16,
				{ animate: true },
			);
		}
	};

	const activeTrip = trips.find((t) => t.id === activeTripId);
	const activeMiles = activeTrip ? activeTrip.miles : 12.8;
	const activeLaborMinutes =
		hourlyWage > 0 ? ((activeMiles * mileageRate) / hourlyWage) * 60 : 6.3;

	const totalLaborMinutes = trips.reduce((acc, t) => {
		const cost = t.miles * mileageRate;
		return acc + (hourlyWage > 0 ? (cost / hourlyWage) * 60 : 0);
	}, 0);

	return (
		<div className="flex flex-col gap-4 pb-28 pt-2 px-margin-sm max-w-120 mx-auto w-full select-none">
			{/* Custom Grayscale Map Card */}
			<div className="relative w-full h-[320px] rounded-3xl overflow-hidden border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] bg-white">
				<div
					ref={mapContainerRef}
					className="w-full h-full z-0"
					style={{
						filter: 'grayscale(100%) contrast(1.1) brightness(1.03)',
					}}
				/>

				{/* Floating Pill: Top-Left Active Commute Indicator */}
				<div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
					<div className="bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 shadow-md border border-neutral-200/60 flex items-center gap-1.5">
						<span className="material-symbols-outlined text-[16px] text-[#111111]">
							directions_car
						</span>
						<span className="text-[12px] font-bold text-[#111111]">
							{activeTrip
								? `${activeTrip.from} → ${activeTrip.to}`
								: 'Active Commute'}
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
							{activeLaborMinutes.toFixed(1)}m
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
				</div>

				{/* Grouped White Card: Swipeable Trips List (Delete Only) */}
				<div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden">
					{trips.length === 0 ? (
						<div className="p-8 text-center text-[#6B7280] text-sm">
							No trips recorded yet.
						</div>
					) : (
						trips.map((trip, idx) => {
							const isSelected = trip.id === activeTripId;
							return (
								<SwipeableTripItem
									key={trip.id}
									trip={trip}
									isSelected={isSelected}
									onSelect={handleSelectTrip}
									onLog={onLogTrip}
									onDelete={(id) => onDeleteTrip?.(id)}
									hourlyWage={hourlyWage}
									mileageRate={mileageRate}
									isLast={idx === trips.length - 1}
								/>
							);
						})
					)}
				</div>
			</section>

			{/* Bottom Transit Mileage Card */}
			<div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-10 h-10 rounded-2xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
						<span className="material-symbols-outlined text-[22px]">
							energy_savings_leaf
						</span>
					</div>
					<div className="flex flex-col min-w-0">
						<span className="text-[14px] font-bold text-[#111111] truncate">
							Transit Mileage Index
						</span>
						<span className="text-[11.5px] text-[#6B7280] truncate tabular-nums">
							Fuel burn converted into{' '}
							{totalLaborMinutes.toFixed(1)}m total labor this
							week
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
