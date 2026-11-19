import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import {
	Coordinate,
	RecordedTrip,
	LiveTrackingStatus,
	DevTrackingTelemetry,
	SavedLocation,
} from '../types/maps';
import {
	DEFAULT_ROAD_ROUTES,
	haversineDistanceMiles,
} from '../utils/mapRouting';
import { chaikinSmooth, lerpCoordinate } from '../utils/geoSmoothing';
import { getSavedHomeAddress } from '../utils/tripTracker';
import { SwipeableTripItem } from './SwipeableTripItem';
import { LocationActionDock } from './LocationActionDock';
import { ArrivalEndTripModal } from './ArrivalEndTripModal';
import { MapsOnboardingModal } from './MapsOnboardingModal';

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
	devTrackingOverlay?: boolean;
	devTelemetry?: DevTrackingTelemetry | null;
	locations: SavedLocation[];
	onUpdateLocations: (locations: SavedLocation[]) => void;
	onOpenLocationsPage: () => void;
	onOpenVehicleSettings: () => void;
	onEndTripDirect?: (destName?: string, coord?: Coordinate) => void;
	onUpdateHomeLocation?: (homeLocation: SavedLocation) => void;
	onDockStateChange?: (isOpen: boolean) => void;
}

const DEFAULT_CENTER: [number, number] = [39.7032, -75.122]; // Glassboro, NJ

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
	isLocationEnabled = false,
	onEnableLocation,
	devTrackingOverlay = false,
	devTelemetry,
	locations: savedLocations,
	onUpdateLocations,
	onOpenLocationsPage,
	onOpenVehicleSettings,
	onEndTripDirect,
	onUpdateHomeLocation,
	onDockStateChange,
}) => {
	// Check if Maps Onboarding is required
	const [isMapsOnboardingOpen, setIsMapsOnboardingOpen] = useState<boolean>(
		() => {
			if (typeof window === 'undefined') return false;
			try {
				const completed = localStorage.getItem(
					'imcheap_maps_onboarding_completed',
				);
				if (completed === 'true') return false;
				// If not completed or home is still default Glassboro NJ, trigger onboarding
				const home = getSavedHomeAddress();
				if (home.lat === 39.7032 && home.lng === -75.122) {
					return true;
				}
				return !completed;
			} catch {
				return true;
			}
		},
	);

	// Floating 3-option menu state
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isCreateMarkerOpen, setIsCreateMarkerOpen] = useState(false);

	// Arrival prompt state
	const [arrivalPromptLocation, setArrivalPromptLocation] =
		useState<SavedLocation | null>(null);

	// Notify parent to slide bottom navigation bar down when any modal dock is active
	useEffect(() => {
		const isAnyDockOpen =
			isCreateMarkerOpen ||
			Boolean(arrivalPromptLocation) ||
			isMapsOnboardingOpen;
		onDockStateChange?.(isAnyDockOpen);
	}, [
		isCreateMarkerOpen,
		arrivalPromptLocation,
		isMapsOnboardingOpen,
		onDockStateChange,
	]);

	// User location state, prioritizing external live location, then last known GPS or home
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
				const savedCustom = localStorage.getItem(
					'imcheap_user_custom_location',
				);
				if (savedCustom) {
					const parsed = JSON.parse(savedCustom);
					if (parsed?.lat && parsed?.lng) return parsed;
				}
			} catch {}
		}
		const home = getSavedHomeAddress();
		return {
			lat: home.lat || DEFAULT_CENTER[0],
			lng: home.lng || DEFAULT_CENTER[1],
		};
	});

	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<L.Map | null>(null);
	const polylineLayerRef = useRef<L.Polyline | null>(null);
	const livePolylineLayerRef = useRef<L.Polyline | null>(null);
	const devRadiusCircleRef = useRef<L.Circle | null>(null);
	const markersLayerRef = useRef<L.LayerGroup | null>(null);
	const savedLocationsMarkersRef = useRef<L.LayerGroup | null>(null);
	const userMarkerRef = useRef<L.Marker | null>(null);
	const animFrameRef = useRef<number | null>(null);
	const currentAnimPosRef = useRef<Coordinate>(userLocation);
	const targetAnimPosRef = useRef<Coordinate>(userLocation);
	const animStartTimeRef = useRef<number>(0);
	const animDurationRef = useRef<number>(1000);
	const [isRequestingPermission, setIsRequestingPermission] =
		useState<boolean>(false);
	const [permissionError, setPermissionError] = useState<string | null>(null);

	// Firm snapping when stationary / idle: if within 120m of ANY saved location or home, lock to it
	const displayedUserLocation = useMemo<Coordinate>(() => {
		const isDriving =
			trackingStatus?.isDriving ||
			trackingStatus?.state === 'TRACKING_TRIP';
		if (isDriving) {
			return userLocation;
		}

		// When idle or stationary, find closest saved location within 120 meters
		for (const loc of savedLocations) {
			const distMeters =
				haversineDistanceMiles(userLocation, {
					lat: loc.lat,
					lng: loc.lng,
				}) * 1609.344;
			if (distMeters <= 120) {
				return { lat: loc.lat, lng: loc.lng };
			}
		}

		return userLocation;
	}, [
		userLocation,
		savedLocations,
		trackingStatus?.isDriving,
		trackingStatus?.state,
	]);

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

	// High accuracy GPS detection with smooth fallback
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
					localStorage.setItem(
						'imcheap_last_known_gps',
						JSON.stringify(coords),
					);
				} catch {}
			}
		};

		let fallbackWatchId: number | null = null;
		const watchId = navigator.geolocation.watchPosition(
			handleSuccess,
			(err) => {
				if (
					err.code === 3 &&
					typeof window !== 'undefined' &&
					'geolocation' in navigator
				) {
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
	}, [
		isLocationEnabled,
		autoTripDetection,
		activeTripId,
		onUserLocationChange,
	]);

	// Initialize Leaflet map
	useEffect(() => {
		if (!mapContainerRef.current) return;
		if (mapInstanceRef.current) return;

		const map = L.map(mapContainerRef.current, {
			center: [displayedUserLocation.lat, displayedUserLocation.lng],
			zoom: 15,
			zoomControl: false,
			attributionControl: false,
		});

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
		}).addTo(map);

		const markersGroup = L.layerGroup().addTo(map);
		markersLayerRef.current = markersGroup;

		const savedLocGroup = L.layerGroup().addTo(map);
		savedLocationsMarkersRef.current = savedLocGroup;

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

		const userMarker = L.marker(
			[displayedUserLocation.lat, displayedUserLocation.lng],
			{
				icon: userIcon,
				zIndexOffset: 1000,
			},
		).addTo(map);

		userMarkerRef.current = userMarker;
		mapInstanceRef.current = map;

		return () => {
			map.remove();
			mapInstanceRef.current = null;
		};
	}, []);

	// Render / Update Saved Location Markers on map
	useEffect(() => {
		if (!mapInstanceRef.current || !savedLocationsMarkersRef.current)
			return;
		const group = savedLocationsMarkersRef.current;
		group.clearLayers();

		savedLocations.forEach((loc) => {
			if (loc.isVisibleOnMap === false) return;

			const isHome = loc.isHome;
			const iconHtml = isHome
				? `
				<div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-neutral-200">
					<span class="material-symbols-outlined text-[18px] text-[#059669]">
						home
					</span>
				</div>
			`
				: `
				<div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-neutral-200">
					<span class="material-symbols-outlined text-[17px] text-[#111111]">
						${loc.icon || 'pin_drop'}
					</span>
				</div>
			`;

			const pinIcon = L.divIcon({
				className: 'bg-transparent',
				html: iconHtml,
				iconSize: [32, 32],
				iconAnchor: [16, 16],
			});

			L.marker([loc.lat, loc.lng], {
				icon: pinIcon,
				zIndexOffset: isHome ? 900 : 850,
			})
				.addTo(group)
				.bindTooltip(loc.name, { direction: 'top', offset: [0, -12] });
		});
	}, [savedLocations]);

	// Animate user marker position smoothly
	useEffect(() => {
		const startPos = currentAnimPosRef.current;
		const endPos = displayedUserLocation;
		targetAnimPosRef.current = endPos;
		animStartTimeRef.current = performance.now();
		animDurationRef.current = 1000;

		if (animFrameRef.current) {
			cancelAnimationFrame(animFrameRef.current);
		}

		const step = (time: number) => {
			const elapsed = time - animStartTimeRef.current;
			const progress = Math.min(1, elapsed / animDurationRef.current);
			const interpolated = lerpCoordinate(startPos, endPos, progress);
			currentAnimPosRef.current = interpolated;

			if (userMarkerRef.current) {
				userMarkerRef.current.setLatLng([
					interpolated.lat,
					interpolated.lng,
				]);
			}

			if (progress < 1) {
				animFrameRef.current = requestAnimationFrame(step);
			}
		};

		animFrameRef.current = requestAnimationFrame(step);

		return () => {
			if (animFrameRef.current) {
				cancelAnimationFrame(animFrameRef.current);
			}
		};
	}, [displayedUserLocation]);

	// Draw live driving trail
	useEffect(() => {
		if (!mapInstanceRef.current) return;
		const map = mapInstanceRef.current;

		const liveBreadcrumbs = trackingStatus?.liveBreadcrumbs || [];
		const isDriving =
			trackingStatus?.isDriving ||
			trackingStatus?.state === 'TRACKING_TRIP';

		if (!isDriving || liveBreadcrumbs.length < 2) {
			if (livePolylineLayerRef.current) {
				map.removeLayer(livePolylineLayerRef.current);
				livePolylineLayerRef.current = null;
			}
			return;
		}

		const smoothedCoords =
			liveBreadcrumbs.length >= 3
				? chaikinSmooth(liveBreadcrumbs, 2)
				: liveBreadcrumbs;

		const latLngs: [number, number][] = smoothedCoords.map((c) => [
			c.lat,
			c.lng,
		]);

		if (livePolylineLayerRef.current) {
			livePolylineLayerRef.current.setLatLngs(latLngs);
		} else {
			const livePolyline = L.polyline(latLngs, {
				color: '#059669',
				weight: 5,
				opacity: 0.9,
				lineCap: 'round',
				lineJoin: 'round',
			}).addTo(map);
			livePolylineLayerRef.current = livePolyline;
		}
	}, [
		trackingStatus?.liveBreadcrumbs,
		trackingStatus?.isDriving,
		trackingStatus?.state,
	]);

	// Draw static 100m departure geofence circle around Home when dev indicator is active
	useEffect(() => {
		if (!mapInstanceRef.current) return;
		const map = mapInstanceRef.current;

		if (!devTrackingOverlay) {
			if (devRadiusCircleRef.current) {
				map.removeLayer(devRadiusCircleRef.current);
				devRadiusCircleRef.current = null;
			}
			return;
		}

		const homeCoords = getSavedHomeAddress();
		const anchorLat = homeCoords.lat;
		const anchorLng = homeCoords.lng;

		if (devRadiusCircleRef.current) {
			devRadiusCircleRef.current.setLatLng([anchorLat, anchorLng]);
		} else {
			const circle = L.circle([anchorLat, anchorLng], {
				radius: 100,
				color: '#059669',
				weight: 2,
				dashArray: '6, 6',
				fillColor: '#059669',
				fillOpacity: 0.12,
			}).addTo(map);
			devRadiusCircleRef.current = circle;
		}
	}, [devTrackingOverlay]);

	// Proximity arrival trigger for "End Trip" action dock
	useEffect(() => {
		const isDriving =
			trackingStatus?.isDriving ||
			trackingStatus?.state === 'TRACKING_TRIP';
		const miles = trackingStatus?.currentMiles || 0;

		if (!isDriving || miles < 0.25) {
			if (arrivalPromptLocation) {
				setArrivalPromptLocation(null);
			}
			return;
		}

		// Check distance to all saved locations
		let arrivedLoc: SavedLocation | null = null;
		for (const loc of savedLocations) {
			const distMeters =
				haversineDistanceMiles(userLocation, {
					lat: loc.lat,
					lng: loc.lng,
				}) * 1609.344;
			if (distMeters <= 85) {
				arrivedLoc = loc;
				break;
			}
		}

		if (arrivedLoc) {
			if (
				!arrivalPromptLocation ||
				arrivalPromptLocation.id !== arrivedLoc.id
			) {
				setArrivalPromptLocation(arrivedLoc);
			}
		} else if (arrivalPromptLocation) {
			// Auto dismiss once user drives away (> 150m)
			const distAwayMeters =
				haversineDistanceMiles(userLocation, {
					lat: arrivalPromptLocation.lat,
					lng: arrivalPromptLocation.lng,
				}) * 1609.344;
			if (distAwayMeters > 150) {
				setArrivalPromptLocation(null);
			}
		}
	}, [
		userLocation,
		trackingStatus?.isDriving,
		trackingStatus?.state,
		trackingStatus?.currentMiles,
		savedLocations,
		arrivalPromptLocation,
	]);

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
		} else if (coords && coords.length >= 3) {
			coords = chaikinSmooth(coords, 2);
		}

		if (!coords || coords.length === 0) return;

		const latLngs: [number, number][] = coords.map((c) => [c.lat, c.lng]);

		const polyline = L.polyline(latLngs, {
			color: '#111111',
			weight: 5,
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
				<div class="w-7 h-7 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white">
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
				<div class="w-7 h-7 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white">
					B
				</div>
			`,
			iconSize: [28, 28],
		});
		L.marker(endCoord, { icon: iconB }).addTo(markersGroup);

		const bounds = L.latLngBounds(latLngs);
		map.fitBounds(bounds, {
			padding: [50, 50],
			maxZoom: 16,
			animate: true,
		});
	};

	const handleSelectTrip = (trip: RecordedTrip) => {
		if (activeTripId === trip.id) {
			setActiveTripId(null);
			if (polylineLayerRef.current) {
				mapInstanceRef.current?.removeLayer(polylineLayerRef.current);
				polylineLayerRef.current = null;
			}
			if (markersLayerRef.current) {
				markersLayerRef.current.clearLayers();
			}
			if (mapInstanceRef.current && displayedUserLocation) {
				mapInstanceRef.current.setView(
					[displayedUserLocation.lat, displayedUserLocation.lng],
					15,
					{ animate: true },
				);
			}
			return;
		}

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

		mapInstanceRef.current.setView(
			[displayedUserLocation.lat, displayedUserLocation.lng],
			16,
			{ animate: true },
		);
	};

	const handleSaveNewLocation = (newLoc: SavedLocation) => {
		const next = [...savedLocations, newLoc];
		onUpdateLocations(next);
		setIsCreateMarkerOpen(false);
	};

	const handleEndTripConfirmed = () => {
		if (onEndTripDirect && arrivalPromptLocation) {
			onEndTripDirect(arrivalPromptLocation.name, userLocation);
		}
		setArrivalPromptLocation(null);
	};

	const handleFinishMapsOnboarding = (
		homeLocation: SavedLocation,
		additionalLocations: SavedLocation[],
	) => {
		const next = [homeLocation, ...additionalLocations];
		onUpdateLocations(next);
		setIsMapsOnboardingOpen(false);

		// Re-center map to the new home location
		const newCenter: Coordinate = {
			lat: homeLocation.lat,
			lng: homeLocation.lng,
		};
		setUserLocation(newCenter);
		if (onUserLocationChange) {
			onUserLocationChange(newCenter);
		}
		if (userMarkerRef.current) {
			userMarkerRef.current.setLatLng([newCenter.lat, newCenter.lng]);
		}
		mapInstanceRef.current?.setView([newCenter.lat, newCenter.lng], 16, {
			animate: true,
		});

		if (onUpdateHomeLocation) {
			onUpdateHomeLocation(homeLocation);
		}
	};

	return (
		<div className="w-full flex flex-col gap-4">
			{/* Leaflet Map Card */}
			<div className="relative w-full h-80 rounded-3xl overflow-hidden border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] bg-white">
				<div
					ref={mapContainerRef}
					className="w-full h-full z-0"
					style={{
						filter: 'grayscale(100%) contrast(1.1) brightness(1.03)',
					}}
				/>

				{/* Floating Bottom-Right Buttons Stack */}
				<div className="absolute bottom-3.5 right-3.5 z-20 flex flex-col items-end gap-2.5">
					{/* Pop-up 3-Option Select Menu */}
					<AnimatePresence>
						{isMenuOpen && (
							<motion.div
								initial={{ opacity: 0, scale: 0.9, y: 10 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.9, y: 10 }}
								transition={{ duration: 0.16, ease: 'easeOut' }}
								className="bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-1 w-48 mb-1"
							>
								{/* Option 1: Locations */}
								<button
									type="button"
									onClick={() => {
										setIsMenuOpen(false);
										onOpenLocationsPage();
									}}
									className="w-full px-3 py-2.5 rounded-xl hover:bg-neutral-50 flex items-center gap-2.5 text-left text-[13px] font-bold text-[#111111] transition-colors cursor-pointer"
								>
									<span className="material-symbols-outlined text-[18px] text-[#059669]">
										format_list_bulleted
									</span>
									<span>Locations</span>
								</button>

								{/* Option 2: Create Marker */}
								<button
									type="button"
									onClick={() => {
										setIsMenuOpen(false);
										setIsCreateMarkerOpen(true);
									}}
									className="w-full px-3 py-2.5 rounded-xl hover:bg-neutral-50 flex items-center gap-2.5 text-left text-[13px] font-bold text-[#111111] transition-colors cursor-pointer"
								>
									<span className="material-symbols-outlined text-[18px] text-[#111111]">
										add_location_alt
									</span>
									<span>Create Marker</span>
								</button>

								{/* Option 3: Vehicle Settings */}
								<button
									type="button"
									onClick={() => {
										setIsMenuOpen(false);
										onOpenVehicleSettings();
									}}
									className="w-full px-3 py-2.5 rounded-xl hover:bg-neutral-50 flex items-center gap-2.5 text-left text-[13px] font-bold text-[#111111] transition-colors cursor-pointer"
								>
									<span className="material-symbols-outlined text-[18px] text-neutral-600">
										directions_car
									</span>
									<span>Vehicle Settings</span>
								</button>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Marker Options Floating Trigger Button */}
					<button
						type="button"
						onClick={() => setIsMenuOpen(!isMenuOpen)}
						aria-label="Locations and Vehicle Menu"
						className={`w-10 h-10 rounded-full bg-white shadow-md border border-neutral-200/60 flex items-center justify-center transition-all cursor-pointer ${
							isMenuOpen
								? 'bg-neutral-900'
								: 'text-[#111111] hover:bg-neutral-50'
						}`}
					>
						<span className="material-symbols-outlined text-[20px]">
							{isMenuOpen ? 'close' : 'pin_drop'}
						</span>
					</button>

					{/* Recenter Target Button */}
					<button
						type="button"
						onClick={handleCenterOnMe}
						aria-label="Center on live location"
						className="w-10 h-10 rounded-full bg-white shadow-md border border-neutral-200/60 flex items-center justify-center text-[#111111] hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer"
					>
						<span className="material-symbols-outlined text-[20px]">
							my_location
						</span>
					</button>
				</div>

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
							Maps and automatic commute tracking require location
							permissions to record your trips and live position.
						</p>
						<button
							type="button"
							onClick={() =>
								onEnableLocation && onEnableLocation()
							}
							disabled={isRequestingPermission}
							className="h-11 px-5 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white font-bold text-[14px] flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
						>
							<span className="material-symbols-outlined text-[18px]">
								near_me
							</span>
							<span>
								{isRequestingPermission
									? 'Requesting...'
									: 'Enable Location'}
							</span>
						</button>
						{permissionError && (
							<p className="text-[12px] text-red-500 font-medium mt-2">
								{permissionError}
							</p>
						)}
					</div>
				)}
			</div>

			{/* Recorded Trips Section */}
			<section className="w-full flex flex-col gap-2.5">
				<div className="flex items-center justify-between px-1">
					<div className="flex items-center gap-2">
						<span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
							Recorded Trips
						</span>
						<span className="text-[11px] font-bold bg-[#E5E7EB] text-[#4B5563] px-1.5 py-0.5 rounded-full">
							{trips.length}
						</span>
					</div>
					<span className="text-[11px] font-semibold text-neutral-400">
						Tap a trip to view path
					</span>
				</div>

				<div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden">
					{trips.length === 0 ? (
						<div className="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
							<div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
								<span className="material-symbols-outlined text-[20px]">
									directions_car
								</span>
							</div>
							<p className="text-body-sm font-medium text-neutral-600">
								No recorded trips yet.
							</p>
							<p className="text-label-sm text-outline max-w-[240px]">
								Drive or simulate a commute to track mileage
								against your working hours.
							</p>
						</div>
					) : (
						<div className="divide-y divide-gray-100">
							{trips.map((trip) => (
								<SwipeableTripItem
									key={trip.id}
									trip={trip}
									hourlyWage={hourlyWage}
									mileageRate={mileageRate}
									isSelected={activeTripId === trip.id}
									onSelect={() => handleSelectTrip(trip)}
									onLog={onLogTrip}
									onDelete={(id) =>
										onDeleteTrip && onDeleteTrip(id)
									}
								/>
							))}
						</div>
					)}
				</div>
			</section>

			{/* Create Marker Action Dock */}
			<LocationActionDock
				isOpen={isCreateMarkerOpen}
				onClose={() => setIsCreateMarkerOpen(false)}
				onSave={handleSaveNewLocation}
				currentGps={userLocation}
			/>

			{/* Arrival End Trip Action Dock */}
			<ArrivalEndTripModal
				isOpen={Boolean(arrivalPromptLocation)}
				locationName={arrivalPromptLocation?.name || 'Destination'}
				currentMiles={trackingStatus?.currentMiles}
				onEndTrip={handleEndTripConfirmed}
				onKeepDriving={() => setArrivalPromptLocation(null)}
			/>

			{/* Maps Onboarding Modal for Setting Home Base & Initial Places */}
			<MapsOnboardingModal
				isOpen={isMapsOnboardingOpen}
				onClose={() => setIsMapsOnboardingOpen(false)}
				onComplete={handleFinishMapsOnboarding}
				initialCoords={userLocation}
			/>
		</div>
	);
};
