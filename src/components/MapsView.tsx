import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinate, RecordedTrip, LiveTrackingStatus } from '../types/maps';
import { fetchRoadRoute, DEFAULT_ROAD_ROUTES } from '../utils/mapRouting';
import { SwipeableTripItem } from './SwipeableTripItem';

export interface MapsViewProps {
	trips: RecordedTrip[];
	onLogTrip: (trip: RecordedTrip) => void;
	onDeleteTrip?: (id: string) => void;
	hourlyWage: number;
	mileageRate: number;
	autoTripDetection?: boolean;
	trackingStatus?: LiveTrackingStatus;
	userLocation?: Coordinate;
	onUserLocationChange?: (coords: Coordinate) => void;
	isLocationEnabled?: boolean;
	onEnableLocation?: (coords?: Coordinate) => void;
}

const DEFAULT_CENTER: [number, number] = [39.7032, -75.122]; // Glassboro, NJ (Girard Rd area)

export const MapsView: React.FC<MapsViewProps> = ({
	trips,
	onLogTrip,
	onDeleteTrip,
	hourlyWage,
	mileageRate,
	autoTripDetection = false,
	trackingStatus,
	userLocation: externalUserLocation,
	onUserLocationChange,
	isLocationEnabled = true,
	onEnableLocation,
}) => {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<L.Map | null>(null);
	const polylineLayerRef = useRef<L.Polyline | null>(null);
	const markersLayerRef = useRef<L.LayerGroup | null>(null);
	const userMarkerRef = useRef<L.Marker | null>(null);
	const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);
	const [permissionError, setPermissionError] = useState<string | null>(null);

	// User location state, prioritizing external live location, then last known GPS
	const [userLocation, setUserLocation] = useState<Coordinate>(() => {
		if (externalUserLocation?.lat && externalUserLocation?.lng) {
			return externalUserLocation;
		}
		if (typeof window !== 'undefined') {
			try {
				const savedGps = localStorage.getItem('imcheap_last_known_gps');
				if (savedGps) {
					const parsed = JSON.parse(savedGps);
					if (parsed?.lat && parsed?.lng) return parsed;
				}
				const savedCustom = localStorage.getItem('imcheap_user_custom_location');
				if (savedCustom) {
					const parsed = JSON.parse(savedCustom);
					if (parsed?.lat && parsed?.lng) return parsed;
				}
			} catch {}
		}
		return { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
	});

	// Synchronize when external user location changes from tracker
	useEffect(() => {
		if (
			externalUserLocation?.lat &&
			externalUserLocation?.lng &&
			(externalUserLocation.lat !== userLocation.lat ||
				externalUserLocation.lng !== userLocation.lng)
		) {
			setUserLocation(externalUserLocation);
		}
	}, [externalUserLocation]);

	const [activeTripId, setActiveTripId] = useState<string | null>(null);

	// High accuracy GPS detection with smooth fallback (only runs if location is enabled)
	useEffect(() => {
		if (!isLocationEnabled || !('geolocation' in navigator)) return;

		const handleSuccess = (pos: GeolocationPosition) => {
			const coords = {
				lat: pos.coords.latitude,
				lng: pos.coords.longitude,
			};
			setUserLocation(coords);
			if (onUserLocationChange) {
				onUserLocationChange(coords);
			}
			if (typeof window !== 'undefined') {
				try {
					localStorage.setItem('imcheap_last_known_gps', JSON.stringify(coords));
				} catch {}
			}
			if (!activeTripId && mapInstanceRef.current) {
				mapInstanceRef.current.setView(
					[coords.lat, coords.lng],
					mapInstanceRef.current.getZoom() || 15,
				);
			}
		};

		let fallbackWatchId: number | null = null;
		const watchId = navigator.geolocation.watchPosition(
			handleSuccess,
			(err) => {
				if (err.code === 3 && typeof window !== 'undefined' && 'geolocation' in navigator) {
					fallbackWatchId = navigator.geolocation.watchPosition(
						handleSuccess,
						() => {},
						{
							enableHighAccuracy: false,
							timeout: 30000,
							maximumAge: 30000,
						},
					);
				}
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 10000,
			},
		);

		return () => {
			navigator.geolocation.clearWatch(watchId);
			if (fallbackWatchId !== null) {
				navigator.geolocation.clearWatch(fallbackWatchId);
			}
		};
	}, [isLocationEnabled, autoTripDetection, activeTripId, onUserLocationChange]);

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

		// Auto fit to initial active trip only if one is explicitly selected
		if (activeTripId) {
			const initialTrip = trips.find((t) => t.id === activeTripId);
			if (initialTrip) {
				renderTripRoute(map, markersGroup, initialTrip);
			}
		}

		return () => {
			map.remove();
			mapInstanceRef.current = null;
		};
	}, []);

	const handleRequestLocationAccess = () => {
		if (typeof window === 'undefined' || !('geolocation' in navigator)) {
			setPermissionError('Geolocation is not supported by your browser.');
			return;
		}

		setIsRequestingPermission(true);
		setPermissionError(null);

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const coords = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				};
				setIsRequestingPermission(false);
				setUserLocation(coords);
				try {
					localStorage.setItem('imcheap_location_enabled', 'true');
					localStorage.setItem('imcheap_last_known_gps', JSON.stringify(coords));
				} catch {}
				if (userMarkerRef.current) {
					userMarkerRef.current.setLatLng([coords.lat, coords.lng]);
				}
				mapInstanceRef.current?.setView([coords.lat, coords.lng], 16, { animate: true });
				if (onEnableLocation) {
					onEnableLocation(coords);
				}
				if (onUserLocationChange) {
					onUserLocationChange(coords);
				}
			},
			(err) => {
				setIsRequestingPermission(false);
				if (err.code === 1) {
					setPermissionError('Location permission denied. Please enable it in browser settings.');
				} else {
					setPermissionError('Could not retrieve location. Please try again.');
				}
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 10000,
			},
		);
	};

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
		if (activeTripId === trip.id) {
			// Deselect and focus back on user position
			setActiveTripId(null);
			if (polylineLayerRef.current) {
				mapInstanceRef.current?.removeLayer(polylineLayerRef.current);
				polylineLayerRef.current = null;
			}
			if (markersLayerRef.current) {
				markersLayerRef.current.clearLayers();
			}
			if (mapInstanceRef.current && userLocation) {
				mapInstanceRef.current.setView(
					[userLocation.lat, userLocation.lng],
					15,
					{ animate: true },
				);
			}
			return;
		}

		// Select route
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
			const applyCenteredCoords = (coords: Coordinate) => {
				setUserLocation(coords);
				if (onUserLocationChange) {
					onUserLocationChange(coords);
				}
				if (typeof window !== 'undefined') {
					try {
						localStorage.setItem('imcheap_last_known_gps', JSON.stringify(coords));
					} catch {}
				}
				if (userMarkerRef.current) {
					userMarkerRef.current.setLatLng([
						coords.lat,
						coords.lng,
					]);
				}
				mapInstanceRef.current?.setView(
					[coords.lat, coords.lng],
					16,
					{
						animate: true,
					},
				);
			};

			navigator.geolocation.getCurrentPosition(
				(pos) => {
					applyCenteredCoords({
						lat: pos.coords.latitude,
						lng: pos.coords.longitude,
					});
				},
				(err) => {
					// Fallback to low-power / cached position on timeout
					if (err.code === 3 && 'geolocation' in navigator) {
						navigator.geolocation.getCurrentPosition(
							(fallbackPos) => {
								applyCenteredCoords({
									lat: fallbackPos.coords.latitude,
									lng: fallbackPos.coords.longitude,
								});
							},
							() => {
								applyCenteredCoords(userLocation);
							},
							{ enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 },
						);
					} else {
						applyCenteredCoords(userLocation);
					}
				},
				{ enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 },
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
			<div className="relative w-full h-80 rounded-3xl overflow-hidden border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] bg-white">
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
							{activeTrip
								? 'directions_car'
								: trackingStatus?.state === 'TRACKING_TRIP'
									? 'navigation'
									: 'near_me'}
						</span>
						<span className="text-[12px] font-bold text-[#111111]">
							{activeTrip
								? `${activeTrip.from} → ${activeTrip.to}`
								: trackingStatus?.state === 'TRACKING_TRIP'
									? `Tracking: ${trackingStatus.originName} → ${trackingStatus.currentMiles || 0} mi`
									: trackingStatus?.state === 'AT_HOME'
										? 'At Home'
										: trackingStatus?.state === 'STATIONARY'
											? `At ${trackingStatus.originName} (${trackingStatus.dwellMinutes || 0}m)`
											: trackingStatus?.state === 'LOCATING'
												? 'Locating GPS...'
												: 'Active Commute'}
						</span>
					</div>
				</div>

				{/* Floating Pill: Bottom-Left Trip Stat */}
				<div className="absolute bottom-3.5 left-3.5 z-10 pointer-events-none">
					<div className="bg-white/95 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-md border border-neutral-200/60 flex items-center gap-2">
						<span className="text-[13px] font-black text-[#111111] tabular-nums">
							{activeTrip
								? `${activeMiles.toFixed(1)} mi`
								: trackingStatus?.state === 'TRACKING_TRIP'
									? `${(trackingStatus.currentMiles || 0).toFixed(1)} mi`
									: `${totalLaborMinutes.toFixed(1)}m burn`}
						</span>
						<span className="text-gray-300 font-bold">•</span>
						<span className="text-[12px] font-bold text-secondary flex items-center gap-1 tabular-nums">
							<span className="material-symbols-outlined text-[14px]">
								schedule
							</span>
							{activeTrip
								? `${activeLaborMinutes.toFixed(1)}m`
								: 'Auto-Trip Ready'}
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

				{/* Location Access Disabled Dimmed Overlay */}
				{!isLocationEnabled && (
					<div className="absolute inset-0 z-30 backdrop-blur-xs bg-[#F5F6F8]/85 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
						<div className="w-12 h-12 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-center text-[#111111] mb-3">
							<span className="material-symbols-outlined text-[24px]">
								location_off
							</span>
						</div>
						<h3 className="text-[17px] font-black text-[#111111] tracking-tight mb-1">
							Location Access Required
						</h3>
						<p className="text-[13px] text-[#6B7280] font-medium leading-relaxed max-w-[280px] mb-4">
							Maps and automatic commute tracking require location permissions to record your trips and live position.
						</p>
						<button
							type="button"
							onClick={handleRequestLocationAccess}
							disabled={isRequestingPermission}
							className="h-11 px-6 rounded-xl bg-[#111111] hover:bg-neutral-800 active:scale-[0.98] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
						>
							{isRequestingPermission ? (
								<>
									<span className="material-symbols-outlined animate-spin text-[16px]">
										progress_activity
									</span>
									<span>Requesting...</span>
								</>
							) : (
								<>
									<span className="material-symbols-outlined text-[16px]">
										near_me
									</span>
									<span>Enable Location</span>
								</>
							)}
						</button>
						{permissionError && (
							<p className="text-[11px] text-amber-700 font-semibold mt-2.5 max-w-[280px]">
								{permissionError}
							</p>
						)}
					</div>
				)}
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
		</div>
	);
};
