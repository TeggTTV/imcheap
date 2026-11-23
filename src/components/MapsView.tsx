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
	fetchRouteDirections,
	RouteDirections,
	resolveOriginLocationName,
} from '../utils/mapRouting';
import { chaikinSmooth, lerpCoordinate } from '../utils/geoSmoothing';
import { getSavedHomeAddress } from '../utils/tripTracker';
import { SwipeableTripItem } from './SwipeableTripItem';
import { LocationActionDock } from './LocationActionDock';
import { ArrivalEndTripModal } from './ArrivalEndTripModal';
import { MapsOnboardingModal } from './MapsOnboardingModal';
import { AppleMapsDock } from './AppleMapsDock';
import { getLucideIconSvgString } from './LucideIcon';
import {
	List,
	MapPinPlus,
	Car,
	MapPin,
	X,
	LocateFixed,
	MapPinOff,
	Navigation,
	Plus,
	Minus,
	Search,
	CornerUpRight,
	CornerUpLeft,
	ArrowUp,
	Compass,
	Pause,
	Play,
	Square,
	RefreshCw,
} from 'lucide-react';

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
	enableRouteSimulation?: boolean;
	devTelemetry?: DevTrackingTelemetry | null;
	locations: SavedLocation[];
	onUpdateLocations: (locations: SavedLocation[]) => void;
	onOpenLocationsPage: () => void;
	onOpenVehicleSettings: () => void;
	onEndTripDirect?: (destName?: string, coord?: Coordinate) => void;
	onUpdateHomeLocation?: (homeLocation: SavedLocation) => void;
	onDockStateChange?: (isOpen: boolean) => void;
	initialEditLocation?: SavedLocation | null;
	onCloseEditLocation?: () => void;
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
	enableRouteSimulation = true,
	devTelemetry,
	locations: savedLocations,
	onUpdateLocations,
	onOpenLocationsPage,
	onOpenVehicleSettings,
	onEndTripDirect,
	onUpdateHomeLocation,
	onDockStateChange,
	initialEditLocation,
	onCloseEditLocation,
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
	const [activeEditingLocation, setActiveEditingLocation] = useState<SavedLocation | null>(null);

	// Sync initialEditLocation passed from parent (e.g. from Locations page)
	useEffect(() => {
		if (initialEditLocation) {
			setActiveEditingLocation(initialEditLocation);
			wasCardModeBeforeMarkerRef.current = !isAppleMapsMode;
			setIsAppleMapsMode(true);
			setIsCreateMarkerOpen(true);
		}
	}, [initialEditLocation]);

	// Arrival prompt state
	const [arrivalPromptLocation, setArrivalPromptLocation] =
		useState<SavedLocation | null>(null);

	// Apple Maps Mode & Routing State
	const [isAppleMapsMode, setIsAppleMapsMode] = useState(false);
	const [selectedNavDestination, setSelectedNavDestination] = useState<{
		name: string;
		address: string;
		coord: Coordinate;
		category?: string;
		dealBadge?: string;
	} | null>(null);
	const [activeNavRoute, setActiveNavRoute] = useState<RouteDirections | null>(null);
	const [isNavigating, setIsNavigating] = useState(false);
	const [navStepIndex, setNavStepIndex] = useState(0);
	const [isSimulating, setIsSimulating] = useState(false);
	const [simProgressIndex, setSimProgressIndex] = useState(0);
	const [isRerouting, setIsRerouting] = useState(false);
	const [isCameraFollowLocked, setIsCameraFollowLocked] = useState(true);
	const isAppleMapsModeRef = useRef(isAppleMapsMode);
	useEffect(() => {
		isAppleMapsModeRef.current = isAppleMapsMode;
	}, [isAppleMapsMode]);
	const wasCardModeBeforeMarkerRef = useRef(false);
	const offRouteCountRef = useRef(0);
	const arrivalStopStartTimeRef = useRef<number | null>(null);

	const navRouteLayerRef = useRef<L.Polyline | null>(null);
	const navDestMarkerRef = useRef<L.Marker | null>(null);

	// Notify parent to slide bottom navigation bar down when any modal dock is active
	useEffect(() => {
		const isAnyDockOpen =
			isAppleMapsMode ||
			isCreateMarkerOpen ||
			Boolean(arrivalPromptLocation) ||
			isMapsOnboardingOpen;
		onDockStateChange?.(isAnyDockOpen);
	}, [
		isAppleMapsMode,
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
	const previewCircleRef = useRef<L.Circle | null>(null);
	const [previewRadiusData, setPreviewRadiusData] = useState<{
		lat: number;
		lng: number;
		radius: number;
	} | null>(null);
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

	// Helper to calculate latLng bounds for a geofence radius without requiring an attached map layer
	const getGeofenceBounds = (coord: Coordinate, radiusMeters: number): L.LatLngBounds => {
		const latOffset = radiusMeters / 111320;
		const lngOffset =
			radiusMeters /
			(111320 * Math.max(0.1, Math.cos((coord.lat * Math.PI) / 180)));
		return L.latLngBounds(
			[coord.lat - latOffset, coord.lng - lngOffset],
			[coord.lat + latOffset, coord.lng + lngOffset],
		);
	};

	// Helper to center coordinate in the visible map canvas above the dock
	const setViewVisibleCenter = (
		map: L.Map,
		coord: Coordinate,
		zoom: number,
		bottomCoveredPx: number = 0,
	) => {
		map.invalidateSize();
		if (bottomCoveredPx <= 0) {
			map.setView([coord.lat, coord.lng], zoom, { animate: true });
			return;
		}
		const targetPx = map.project([coord.lat, coord.lng], zoom);
		targetPx.y += bottomCoveredPx / 2;
		const centerLatLng = map.unproject(targetPx, zoom);
		map.setView(centerLatLng, zoom, { animate: true });
	};

	// Invalidate Leaflet map size and recenter user location when toggling between card and Apple Maps full-screen
	useEffect(() => {
		if (!mapInstanceRef.current) return;
		if (
			activeNavRoute ||
			selectedNavDestination ||
			activeTripId ||
			isCreateMarkerOpen ||
			activeEditingLocation
		) {
			return;
		}

		const bottomCovered = isAppleMapsMode ? 250 : 0;
		const targetZoom = isAppleMapsMode ? 16 : 15;

		// Initial resize
		const timer1 = setTimeout(() => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.invalidateSize({ animate: false });
			}
		}, 120);

		// Synchronized centering strictly after CSS transition (duration-300) finishes
		const timer2 = setTimeout(() => {
			if (
				mapInstanceRef.current &&
				!activeNavRoute &&
				!selectedNavDestination &&
				!activeTripId &&
				!isCreateMarkerOpen &&
				!activeEditingLocation
			) {
				mapInstanceRef.current.invalidateSize({ animate: false });
				setViewVisibleCenter(
					mapInstanceRef.current,
					displayedUserLocation,
					targetZoom,
					bottomCovered,
				);
			}
		}, 340);

		// Second frame check for full layout stability
		const timer3 = setTimeout(() => {
			if (
				mapInstanceRef.current &&
				!activeNavRoute &&
				!selectedNavDestination &&
				!activeTripId &&
				!isCreateMarkerOpen &&
				!activeEditingLocation
			) {
				mapInstanceRef.current.invalidateSize({ animate: false });
				setViewVisibleCenter(
					mapInstanceRef.current,
					displayedUserLocation,
					targetZoom,
					bottomCovered,
				);
			}
		}, 480);

		return () => {
			clearTimeout(timer1);
			clearTimeout(timer2);
			clearTimeout(timer3);
		};
	}, [isAppleMapsMode]);

	// Fetch fresh GPS only when creating a net-new marker (not editing existing)
	useEffect(() => {
		if (!isCreateMarkerOpen || activeEditingLocation) return;
		if (typeof window !== 'undefined' && 'geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const coords = {
						lat: pos.coords.latitude,
						lng: pos.coords.longitude,
					};
					setUserLocation(coords);
					onUserLocationChange?.(coords);
				},
				() => {},
				{ enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 },
			);
		}
	}, [isCreateMarkerOpen, activeEditingLocation, onUserLocationChange]);

	// Center user or active location with radius framing when Create/Edit Marker dock opens
	useEffect(() => {
		if (!isCreateMarkerOpen || !mapInstanceRef.current) return;

		const timer = setTimeout(() => {
			if (!mapInstanceRef.current) return;
			mapInstanceRef.current.invalidateSize({ animate: false });

			const targetCoord = activeEditingLocation
				? { lat: activeEditingLocation.lat, lng: activeEditingLocation.lng }
				: userLocation;
			const targetRadius = activeEditingLocation?.radius || 150;

			const circleBounds = getGeofenceBounds(targetCoord, targetRadius);

			mapInstanceRef.current.fitBounds(circleBounds, {
				paddingTopLeft: [40, 40],
				paddingBottomRight: [40, 380],
				maxZoom: 17,
				animate: true,
			});
		}, 300);

		return () => clearTimeout(timer);
	}, [isCreateMarkerOpen, activeEditingLocation]);

	// Keep focus and dynamic radius framing on the target coordinates while creating or editing marker
	useEffect(() => {
		if (
			!isCreateMarkerOpen ||
			!previewRadiusData ||
			!mapInstanceRef.current
		) {
			return;
		}

		mapInstanceRef.current.invalidateSize({ animate: false });
		const circleBounds = getGeofenceBounds(
			{ lat: previewRadiusData.lat, lng: previewRadiusData.lng },
			previewRadiusData.radius,
		);

		mapInstanceRef.current.fitBounds(circleBounds, {
			paddingTopLeft: [40, 40],
			paddingBottomRight: [40, 380],
			maxZoom: 17,
			animate: true,
		});
	}, [
		isCreateMarkerOpen,
		previewRadiusData?.lat,
		previewRadiusData?.lng,
		previewRadiusData?.radius,
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
		// Pause active GPS watch while viewing a recorded trip or creating/editing a marker
		if (activeTripId || isCreateMarkerOpen) return;

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

		const targetCenter: [number, number] = initialEditLocation
			? [initialEditLocation.lat, initialEditLocation.lng]
			: [displayedUserLocation.lat, displayedUserLocation.lng];
		const targetZoom = initialEditLocation ? 17 : 15;

		const map = L.map(mapContainerRef.current, {
			center: targetCenter,
			zoom: targetZoom,
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

	// Render / Update Saved Location Markers & Radius Circles on map
	useEffect(() => {
		if (!mapInstanceRef.current || !savedLocationsMarkersRef.current)
			return;
		const group = savedLocationsMarkersRef.current;
		group.clearLayers();

		savedLocations.forEach((loc) => {
			if (loc.isVisibleOnMap === false) return;

			const isHome = loc.isHome;
			const radius = loc.radius || 150;

			// Always display the radius of markers on the map: faint background color, no border
			L.circle([loc.lat, loc.lng], {
				radius,
				color: isHome ? '#059669' : '#111111',
				weight: 0,
				fillColor: isHome ? '#059669' : '#111111',
				fillOpacity: 0.08,
				interactive: false,
			}).addTo(group);

			const svgContent = isHome
				? getLucideIconSvgString('home', '#059669', 18)
				: getLucideIconSvgString(loc.icon || 'pin_drop', '#111111', 17);

			const iconHtml = `
				<div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-neutral-200">
					${svgContent}
				</div>
			`;

			const pinIcon = L.divIcon({
				className: 'bg-transparent',
				html: iconHtml,
				iconSize: [32, 32],
				iconAnchor: [16, 16],
			});

			const marker = L.marker([loc.lat, loc.lng], {
				icon: pinIcon,
				zIndexOffset: isHome ? 900 : 850,
			})
				.addTo(group)
				.bindTooltip(loc.name, { direction: 'top', offset: [0, -12] });

			// Tap marker on map: only open edit dock if currently in fullscreen Apple Maps mode
			marker.on('click', () => {
				if (!isAppleMapsModeRef.current) return;
				setActiveEditingLocation(loc);
				setIsCreateMarkerOpen(true);
			});
		});
	}, [savedLocations]);

	// Render dynamic preview radius circle when creating or editing a marker in the dock
	useEffect(() => {
		if (!mapInstanceRef.current) return;
		const map = mapInstanceRef.current;

		if (!previewRadiusData) {
			if (previewCircleRef.current) {
				map.removeLayer(previewCircleRef.current);
				previewCircleRef.current = null;
			}
			return;
		}

		if (previewCircleRef.current) {
			previewCircleRef.current.setLatLng([
				previewRadiusData.lat,
				previewRadiusData.lng,
			]);
			previewCircleRef.current.setRadius(previewRadiusData.radius);
		} else {
			const circle = L.circle(
				[previewRadiusData.lat, previewRadiusData.lng],
				{
					radius: previewRadiusData.radius,
					color: '#059669',
					weight: 1.5,
					dashArray: '4, 4',
					fillColor: '#059669',
					fillOpacity: 0.15,
					interactive: false,
				},
			).addTo(map);
			previewCircleRef.current = circle;
		}
	}, [previewRadiusData]);

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

	// Draw live driving trail (hidden if viewing a selected historical trip to avoid 2 lines showing)
	useEffect(() => {
		if (!mapInstanceRef.current) return;
		const map = mapInstanceRef.current;

		const liveBreadcrumbs = trackingStatus?.liveBreadcrumbs || [];
		const isDriving =
			trackingStatus?.isDriving ||
			trackingStatus?.state === 'TRACKING_TRIP';

		// If user selected a past trip, or is not actively tracking, remove the live polyline
		if (activeTripId !== null || !isDriving || liveBreadcrumbs.length < 2) {
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
		activeTripId,
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

		// Check distance to all saved locations against each marker's configured radius
		let arrivedLoc: SavedLocation | null = null;
		for (const loc of savedLocations) {
			const markerRadiusMeters = loc.radius || 150;
			const distMeters =
				haversineDistanceMiles(userLocation, {
					lat: loc.lat,
					lng: loc.lng,
				}) * 1609.344;
			if (distMeters <= markerRadiusMeters) {
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
			// Auto dismiss once user drives away (> radius + 50m)
			const dismissThreshold = (arrivalPromptLocation.radius || 150) + 50;
			const distAwayMeters =
				haversineDistanceMiles(userLocation, {
					lat: arrivalPromptLocation.lat,
					lng: arrivalPromptLocation.lng,
				}) * 1609.344;
			if (distAwayMeters > dismissThreshold) {
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

		if (isNavigating) {
			setIsCameraFollowLocked(true);
			setViewVisibleCenter(
				mapInstanceRef.current,
				displayedUserLocation,
				17,
				140,
			);
			return;
		}

		const bottomCovered = isAppleMapsMode ? 250 : 0;
		setViewVisibleCenter(
			mapInstanceRef.current,
			displayedUserLocation,
			isAppleMapsMode ? 16 : 15,
			bottomCovered,
		);
	};

	const handleSaveLocation = (savedLoc: SavedLocation) => {
		const existingIndex = savedLocations.findIndex((l) => l.id === savedLoc.id);
		let updated: SavedLocation[];
		if (existingIndex >= 0) {
			updated = [...savedLocations];
			updated[existingIndex] = savedLoc;
		} else {
			updated = [...savedLocations, savedLoc];
		}
		onUpdateLocations(updated);
		setIsCreateMarkerOpen(false);
		setActiveEditingLocation(null);
		setPreviewRadiusData(null);

		if (wasCardModeBeforeMarkerRef.current) {
			setIsAppleMapsMode(false);
			wasCardModeBeforeMarkerRef.current = false;
		}

		// Re-center on user position with standard zoom when closed/saved
		if (mapInstanceRef.current && userLocation) {
			mapInstanceRef.current.setView(
				[userLocation.lat, userLocation.lng],
				16,
				{ animate: true },
			);
		}

		if (initialEditLocation && onCloseEditLocation) {
			onCloseEditLocation();
		}
	};

	const handleCloseMarkerDock = () => {
		setIsCreateMarkerOpen(false);
		setActiveEditingLocation(null);
		setPreviewRadiusData(null);

		if (wasCardModeBeforeMarkerRef.current) {
			setIsAppleMapsMode(false);
			wasCardModeBeforeMarkerRef.current = false;
		}

		// Re-center on user position with standard zoom when closed
		if (mapInstanceRef.current && userLocation) {
			mapInstanceRef.current.setView(
				[userLocation.lat, userLocation.lng],
				16,
				{ animate: true },
			);
		}

		if (initialEditLocation && onCloseEditLocation) {
			onCloseEditLocation();
		}
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

	const handleSelectNavDestination = async (dest: {
		name: string;
		address: string;
		coord: Coordinate;
		category?: string;
		dealBadge?: string;
	}) => {
		setSelectedNavDestination(dest);
		const route = await fetchRouteDirections(
			displayedUserLocation,
			dest.coord,
			dest.name,
		);
		setActiveNavRoute(route);
		setNavStepIndex(0);
		setSimProgressIndex(0);

		if (!mapInstanceRef.current) return;
		const map = mapInstanceRef.current;

		if (navRouteLayerRef.current) {
			map.removeLayer(navRouteLayerRef.current);
			navRouteLayerRef.current = null;
		}
		if (navDestMarkerRef.current) {
			map.removeLayer(navDestMarkerRef.current);
			navDestMarkerRef.current = null;
		}

		// Draw vibrant Apple Maps route polyline
		const latLngs: [number, number][] = route.coordinates.map((c) => [
			c.lat,
			c.lng,
		]);
		const polyline = L.polyline(latLngs, {
			color: '#007AFF',
			weight: 6,
			opacity: 0.95,
			lineCap: 'round',
			lineJoin: 'round',
		}).addTo(map);
		navRouteLayerRef.current = polyline;

		// Apple Maps Destination Marker
		const destIcon = L.divIcon({
			className: 'bg-transparent',
			html: `
				<div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#FF3B30] text-white shadow-xl border-2 border-white font-bold">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
				</div>
			`,
			iconSize: [32, 32],
			iconAnchor: [16, 28],
		});

		const marker = L.marker([dest.coord.lat, dest.coord.lng], {
			icon: destIcon,
			zIndexOffset: 1200,
		}).addTo(map);
		navDestMarkerRef.current = marker;

		const bounds = L.latLngBounds(latLngs);
		map.fitBounds(bounds, {
			paddingTopLeft: [30, 90],
			paddingBottomRight: [30, isAppleMapsMode ? 260 : 30],
			maxZoom: 16,
			animate: true,
		});
	};

	const handleCancelNavRoute = () => {
		setSelectedNavDestination(null);
		setActiveNavRoute(null);
		setIsNavigating(false);
		setIsSimulating(false);
		setSimProgressIndex(0);
		setNavStepIndex(0);

		if (mapInstanceRef.current) {
			if (navRouteLayerRef.current) {
				mapInstanceRef.current.removeLayer(navRouteLayerRef.current);
				navRouteLayerRef.current = null;
			}
			if (navDestMarkerRef.current) {
				mapInstanceRef.current.removeLayer(navDestMarkerRef.current);
				navDestMarkerRef.current = null;
			}
			const bottomCovered = isAppleMapsMode ? 250 : 0;
			setViewVisibleCenter(
				mapInstanceRef.current,
				displayedUserLocation,
				isAppleMapsMode ? 16 : 15,
				bottomCovered,
			);
		}
	};

	const handleExitAppleMaps = () => {
		handleCancelNavRoute();
		setIsAppleMapsMode(false);
		if (mapInstanceRef.current) {
			setTimeout(() => {
				if (mapInstanceRef.current) {
					mapInstanceRef.current.invalidateSize();
					mapInstanceRef.current.setView(
						[userLocation.lat, userLocation.lng],
						15,
						{ animate: true },
					);
				}
			}, 100);
		}
	};

	const isNearDestination = useMemo(() => {
		if (!isNavigating || !activeNavRoute || !selectedNavDestination) return false;
		const currentPos = isSimulating
			? activeNavRoute.coordinates[simProgressIndex] || displayedUserLocation
			: displayedUserLocation;
		const destCoord = selectedNavDestination.coord;
		const distMeters = haversineDistanceMiles(currentPos, destCoord) * 1609.344;
		const reachedEnd =
			isSimulating &&
			simProgressIndex >= Math.max(0, activeNavRoute.coordinates.length - 1);
		return distMeters <= 80 || reachedEnd;
	}, [
		isNavigating,
		activeNavRoute,
		selectedNavDestination,
		isSimulating,
		simProgressIndex,
		displayedUserLocation,
	]);

	const handleStartNavigation = () => {
		setIsNavigating(true);
		setIsSimulating(enableRouteSimulation);
		setSimProgressIndex(0);
		setNavStepIndex(0);
		setIsCameraFollowLocked(true);
		if (mapInstanceRef.current && displayedUserLocation) {
			setViewVisibleCenter(
				mapInstanceRef.current,
				displayedUserLocation,
				17,
				140,
			);
		}
	};

	// Un-lock driving camera auto-follow when user manually drags map during navigation
	useEffect(() => {
		if (!mapInstanceRef.current) return;
		const map = mapInstanceRef.current;
		const onDragStart = () => {
			if (isNavigating) {
				setIsCameraFollowLocked(false);
			}
		};
		map.on('dragstart', onDragStart);
		return () => {
			map.off('dragstart', onDragStart);
		};
	}, [isNavigating]);

	// Continuous camera auto-follow while live driving navigation is active
	useEffect(() => {
		if (
			!isNavigating ||
			isSimulating ||
			!isCameraFollowLocked ||
			!mapInstanceRef.current
		) {
			return;
		}
		setViewVisibleCenter(
			mapInstanceRef.current,
			displayedUserLocation,
			17,
			140,
		);
	}, [isNavigating, isSimulating, isCameraFollowLocked, displayedUserLocation]);

	const handleEndNavigation = async () => {
		if (selectedNavDestination && activeNavRoute) {
			const simRatio = Math.min(
				1,
				Math.max(
					0,
					simProgressIndex /
						Math.max(1, activeNavRoute.coordinates.length - 1),
				),
			);
			const miles = isSimulating
				? Number((activeNavRoute.distanceMiles * simRatio).toFixed(2))
				: activeNavRoute.distanceMiles;
			const cost = Number((miles * mileageRate).toFixed(2));
			const fromLocation = await resolveOriginLocationName(
				displayedUserLocation,
				savedLocations,
			);
			onLogTrip({
				id: `trip-nav-${Date.now()}`,
				from: fromLocation,
				to: selectedNavDestination.name,
				miles,
				cost,
				timestamp: new Date().toISOString(),
				status: 'LOGGED',
				coordinates: activeNavRoute.coordinates,
			});
		}
		handleCancelNavRoute();
	};

	// 30-second dwell auto-close when stopped at destination
	useEffect(() => {
		if (!isNavigating || !isNearDestination) {
			arrivalStopStartTimeRef.current = null;
			return;
		}

		const isUserStopped = isSimulating
			? simProgressIndex >=
				Math.max(0, (activeNavRoute?.coordinates.length || 1) - 1)
			: !trackingStatus?.isDriving;

		if (!isUserStopped) {
			arrivalStopStartTimeRef.current = null;
			return;
		}

		if (!arrivalStopStartTimeRef.current) {
			arrivalStopStartTimeRef.current = Date.now();
		}

		const interval = setInterval(() => {
			if (
				arrivalStopStartTimeRef.current &&
				Date.now() - arrivalStopStartTimeRef.current >= 30000
			) {
				handleEndNavigation();
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [
		isNavigating,
		isNearDestination,
		isSimulating,
		simProgressIndex,
		activeNavRoute,
		trackingStatus?.isDriving,
	]);

	// Automatic rerouting if off route by >60 meters
	useEffect(() => {
		if (
			!isNavigating ||
			isSimulating ||
			!activeNavRoute ||
			!selectedNavDestination ||
			activeNavRoute.coordinates.length < 2 ||
			isRerouting
		) {
			return;
		}

		let minDistanceMeters = Infinity;
		for (const pt of activeNavRoute.coordinates) {
			const dist =
				haversineDistanceMiles(displayedUserLocation, pt) * 1609.344;
			if (dist < minDistanceMeters) {
				minDistanceMeters = dist;
			}
		}

		if (minDistanceMeters > 60) {
			offRouteCountRef.current += 1;
			if (offRouteCountRef.current >= 2) {
				offRouteCountRef.current = 0;
				setIsRerouting(true);
				fetchRouteDirections(
					displayedUserLocation,
					selectedNavDestination.coord,
					selectedNavDestination.address,
				)
					.then((newRoute) => {
						setActiveNavRoute(newRoute);
						setNavStepIndex(0);
						setSimProgressIndex(0);
						const latLngs: [number, number][] =
							newRoute.coordinates.map((c) => [c.lat, c.lng]);
						if (navRouteLayerRef.current) {
							navRouteLayerRef.current.setLatLngs(latLngs);
						}
					})
					.catch((err) => {
						console.warn('Rerouting error:', err);
					})
					.finally(() => {
						setIsRerouting(false);
					});
			}
		} else {
			offRouteCountRef.current = 0;
		}
	}, [
		isNavigating,
		isSimulating,
		displayedUserLocation,
		activeNavRoute,
		selectedNavDestination,
		isRerouting,
	]);

	// Simulation timer along road coordinates
	useEffect(() => {
		if (
			!isNavigating ||
			!isSimulating ||
			!activeNavRoute ||
			activeNavRoute.coordinates.length < 2
		) {
			return;
		}

		const interval = setInterval(() => {
			setSimProgressIndex((prev) => {
				const next = prev + 1;
				if (next >= activeNavRoute.coordinates.length) {
					setIsSimulating(false);
					return prev;
				}

				const pt = activeNavRoute.coordinates[next];
				if (userMarkerRef.current) {
					userMarkerRef.current.setLatLng([pt.lat, pt.lng]);
				}
				mapInstanceRef.current?.panTo([pt.lat, pt.lng], { animate: true });

				// Step progression
				const totalPts = activeNavRoute.coordinates.length;
				const totalSteps = activeNavRoute.steps.length;
				if (totalSteps > 1) {
					const stepIdx = Math.min(
						totalSteps - 1,
						Math.floor((next / totalPts) * totalSteps),
					);
					setNavStepIndex(stepIdx);
				}

				return next;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [isNavigating, isSimulating, activeNavRoute]);

	return (
		<div className="w-full flex flex-col gap-4">
			{/* Leaflet Map Card or Full-Screen Apple Maps Container */}
			<div
				className={`transition-all duration-300 ${
					isAppleMapsMode
						? 'fixed inset-0 z-40 w-screen h-dvh rounded-none border-none shadow-none bg-[#E5E7EB]'
						: 'relative w-full h-80 rounded-3xl overflow-hidden border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] bg-white'
				}`}
			>
				<div
					ref={mapContainerRef}
					className="w-full h-full z-0 bg-[#E5E7EB]"
					style={{
						filter: 'grayscale(100%) contrast(1.1) brightness(1.03)',
					}}
				/>

				{/* Full-Screen Apple Maps Header */}
				{isAppleMapsMode && !isNavigating && (
					<div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between pointer-events-auto">
						<button
							type="button"
							onClick={handleExitAppleMaps}
							className="h-10 px-3.5 rounded-full bg-white shadow-md border border-neutral-200/70 text-[#111111] font-bold text-[13px] flex items-center gap-1.5 hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer"
						>
							<X size={16} />
							<span>Exit Maps</span>
						</button>

						<div className="h-9 px-3 rounded-full bg-white shadow-sm border border-neutral-200/60 text-neutral-700 font-bold text-[12px] flex items-center gap-1.5">
							<span>72° ☀️</span>
						</div>
					</div>
				)}

				{/* Floating Map Controls: [ + ], [ — ], and circular target/crosshair [ 🧭 ] icons stacked vertically, right-aligned */}
				<div
					className={`absolute z-30 flex flex-col items-center gap-2 transition-all ${
						isAppleMapsMode
							? isNavigating
								? 'top-28 right-4'
								: 'top-20 right-4'
							: 'bottom-3.5 right-3.5'
					}`}
				>
					{/* Zoom In & Out Pill */}
					<div className="flex flex-col bg-white rounded-2xl shadow-md border border-neutral-200/70 overflow-hidden divide-y divide-neutral-100">
						<button
							type="button"
							onClick={() => mapInstanceRef.current?.zoomIn()}
							aria-label="Zoom in"
							className="w-10 h-10 flex items-center justify-center text-[#111111] hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer"
						>
							<Plus size={18} />
						</button>
						<button
							type="button"
							onClick={() => mapInstanceRef.current?.zoomOut()}
							aria-label="Zoom out"
							className="w-10 h-10 flex items-center justify-center text-[#111111] hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer"
						>
							<Minus size={18} />
						</button>
					</div>

					{/* Circular Target / Crosshair Button */}
					<button
						type="button"
						onClick={handleCenterOnMe}
						aria-label="Center on live location"
						className="w-10 h-10 rounded-full bg-white shadow-md border border-neutral-200/70 flex items-center justify-center text-[#111111] hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer"
					>
						<Compass size={18} className="text-[#111111]" />
					</button>
				</div>

				{/* Location Access Disabled Dimmed Overlay */}
				{!isLocationEnabled && (
					<div className="absolute inset-0 z-30 backdrop-blur-xs bg-[#F5F6F8]/85 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
						<div className="w-12 h-12 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-center text-[#111111] mb-3">
							<MapPinOff size={24} />
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
							<Navigation size={18} />
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

			{/* Active Turn-by-Turn Driving HUD: Top Maneuver Banner */}
			{isAppleMapsMode && isNavigating && activeNavRoute && (
				<div className="fixed top-4 inset-x-4 max-w-120 mx-auto z-50 pointer-events-auto">
					<div className="bg-white text-[#111111] rounded-2xl p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-neutral-200/80 flex items-center justify-between">
						<div className="flex items-center gap-3.5 min-w-0 pr-2">
							<div
								className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
									isNearDestination
										? 'bg-red-50 text-[#FF3B30]'
										: isRerouting
										? 'bg-amber-50 text-amber-600'
										: 'bg-blue-50 text-[#007AFF]'
								}`}
							>
								{isRerouting ? (
									<RefreshCw
										size={24}
										className="animate-spin text-amber-600"
									/>
								) : isNearDestination ? (
									<MapPin
										size={26}
										strokeWidth={2.5}
										className="text-[#FF3B30]"
									/>
								) : activeNavRoute.steps[navStepIndex]?.maneuverModifier?.includes('left') ? (
									<CornerUpLeft size={26} strokeWidth={2.5} />
								) : activeNavRoute.steps[navStepIndex]?.maneuverModifier?.includes('right') ? (
									<CornerUpRight size={26} strokeWidth={2.5} />
								) : (
									<ArrowUp size={26} strokeWidth={2.5} />
								)}
							</div>
							<div className="min-w-0">
								<div
									className={`text-[11.5px] font-bold uppercase tracking-wide ${
										isNearDestination
											? 'text-[#FF3B30]'
											: isRerouting
											? 'text-amber-600'
											: 'text-[#007AFF]'
									}`}
								>
									{isRerouting
										? 'Recalculating...'
										: isNearDestination
										? 'Destination'
										: `In ${activeNavRoute.steps[navStepIndex]?.distanceMiles || 0.4} mi`}
								</div>
								<div className="text-[17px] font-black leading-tight text-[#111111] truncate">
									{isRerouting
										? 'Finding new route...'
										: isNearDestination
										? `Arrived at ${selectedNavDestination?.name || 'Destination'}`
										: activeNavRoute.steps[navStepIndex]?.instruction || 'Continue on route'}
								</div>
								{!isNearDestination && !isRerouting && activeNavRoute.steps[navStepIndex + 1] && (
									<div className="text-[11.5px] text-neutral-500 font-medium truncate mt-0.5">
										Then {activeNavRoute.steps[navStepIndex + 1].instruction}
									</div>
								)}
							</div>
						</div>

						<div className="px-2.5 py-1 rounded-xl bg-neutral-100 text-neutral-800 font-extrabold text-[12px] shrink-0 text-center border border-neutral-200/60">
							35 <span className="text-[10px] block font-medium text-neutral-500">MPH</span>
						</div>
					</div>
				</div>
			)}

			{/* Active Turn-by-Turn Driving Bottom Bar with ImCheap Live Cost Counter */}
			{isAppleMapsMode && isNavigating && activeNavRoute && (() => {
				const simRatio = Math.min(
					1,
					Math.max(
						0,
						simProgressIndex /
							Math.max(1, activeNavRoute.coordinates.length - 1),
					),
				);
				const drivenMiles = Number(
					(activeNavRoute.distanceMiles * simRatio).toFixed(2),
				);
				const drivenCost = Number(
					(drivenMiles * mileageRate).toFixed(2),
				);
				const laborMins = Math.max(
					1,
					Math.round(
						(drivenCost / Math.max(hourlyWage, 5)) * 60,
					),
				);
				const remainingRatio = Math.max(0, 1 - simRatio);
				const remainingMins = Math.max(
					1,
					Math.round(
						activeNavRoute.durationMinutes * remainingRatio,
					),
				);
				const remainingMiles = Math.max(
					0,
					Number(
						(
							activeNavRoute.distanceMiles * remainingRatio
						).toFixed(1),
					),
				);

				return (
					<div className="fixed bottom-6 inset-x-4 max-w-120 mx-auto z-50 pointer-events-auto">
						<div className="bg-white rounded-3xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.22)] border border-neutral-200/80 flex items-center justify-between">
							<div>
								<div className="flex items-baseline gap-1.5">
									<span className="text-[26px] leading-none font-black text-[#111111] tracking-tight">
										{remainingMins}
									</span>
									<span className="text-[14px] font-bold text-neutral-600">min</span>
								</div>
								<div className="text-[12px] text-neutral-500 font-semibold mt-0.5">
									{remainingMiles} mi · ETA{' '}
									{new Date(
										Date.now() +
											remainingMins * 60000,
									).toLocaleTimeString([], {
										hour: 'numeric',
										minute: '2-digit',
									})}
								</div>
								<div className="text-[11.5px] font-bold text-emerald-600 mt-1">
									ImCheap: ${drivenCost.toFixed(2)} cost ({laborMins}m work)
								</div>
							</div>

							{isNearDestination ? (
								<button
									type="button"
									onClick={handleEndNavigation}
									aria-label="End Route"
									className="h-12 px-5 rounded-2xl bg-[#FF3B30] hover:bg-red-600 text-white font-extrabold text-[15px] flex items-center gap-2 shadow-lg shadow-red-500/30 active:scale-95 transition-all cursor-pointer animate-pulse"
								>
									<Square size={16} className="fill-white text-white" />
									<span>End Route</span>
								</button>
							) : (
								<div className="flex items-center gap-2.5">
									{enableRouteSimulation && (
										<button
											type="button"
											onClick={() => setIsSimulating(!isSimulating)}
											aria-label={
												isSimulating
													? 'Pause route simulation'
													: 'Play route simulation'
											}
											className="w-12 h-12 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-[#111111] flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
										>
											{isSimulating ? (
												<Pause
													size={20}
													className="fill-current text-[#111111]"
												/>
											) : (
												<Play
													size={20}
													className="fill-current text-[#111111] translate-x-0.5"
												/>
											)}
										</button>
									)}
									<button
										type="button"
										onClick={handleEndNavigation}
										aria-label="End Navigation"
										className="w-12 h-12 rounded-2xl bg-[#FF3B30] hover:bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/25 active:scale-95 transition-all cursor-pointer"
									>
										<Square
											size={18}
											className="fill-white text-white"
										/>
									</button>
								</div>
							)}
						</div>
					</div>
				);
			})()}

			{/* Apple Maps Action Dock */}
			<AppleMapsDock
				isOpen={isAppleMapsMode}
				onClose={handleExitAppleMaps}
				userLocation={displayedUserLocation}
				savedLocations={savedLocations}
				hourlyWage={hourlyWage}
				mileageRate={mileageRate}
				onSelectDestination={handleSelectNavDestination}
				activeRoute={activeNavRoute}
				selectedDestination={selectedNavDestination}
				onStartNavigation={handleStartNavigation}
				onCancelRoute={handleCancelNavRoute}
				isNavigating={isNavigating}
				onEndNavigation={handleEndNavigation}
				onOpenLocationsPage={onOpenLocationsPage}
				onOpenCreateMarker={() => {
					handleExitAppleMaps();
					setActiveEditingLocation(null);
					setTimeout(() => {
						setIsCreateMarkerOpen(true);
					}, 250);
				}}
			/>

			{/* Recorded Trips Section (in default card state) */}
			{!isAppleMapsMode && (
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
									<Car size={20} />
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
			)}

			{/* Create / Edit Marker Action Dock */}
			<LocationActionDock
				isOpen={isCreateMarkerOpen}
				onClose={handleCloseMarkerDock}
				onSave={handleSaveLocation}
				initialLocation={activeEditingLocation}
				currentGps={userLocation}
				onPreviewRadiusChange={setPreviewRadiusData}
			/>

			{/* Floating Bottom Row on Screen (Search Bar + 3-Option Select Menu) */}
			{!isAppleMapsMode && (
				<div className="fixed bottom-20 inset-x-4 max-w-120 mx-auto z-40 flex items-end gap-2.5 pointer-events-auto">
					{/* Search Bar filling the horizontal space between left edge and menu button */}
					<div
						onClick={() => setIsAppleMapsMode(true)}
						role="button"
						tabIndex={0}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								setIsAppleMapsMode(true);
							}
						}}
						aria-label="Search Maps, directions, and nearby deals"
						className="flex-1 h-12 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-neutral-200/70 px-3.5 flex items-center gap-2.5 cursor-pointer hover:bg-neutral-50/90 active:scale-[0.99] transition-all group"
					>
						<div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:text-neutral-700 transition-colors">
							<Search size={15} />
						</div>
						<span className="text-[13.5px] font-medium text-neutral-500 group-hover:text-neutral-700 transition-colors select-none truncate">
							Search Maps, directions, deals...
						</span>
					</div>

					{/* Menu Opening Button & Dropup Menu */}
					<div className="relative flex flex-col items-end">
						<AnimatePresence>
							{isMenuOpen && (
								<motion.div
									initial={{ opacity: 0, scale: 0.9, y: 10 }}
									animate={{ opacity: 1, scale: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.9, y: 10 }}
									transition={{ duration: 0.16, ease: 'easeOut' }}
									className="absolute bottom-14 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1.5 flex flex-col gap-1 w-48 mb-1"
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
										<List size={18} className="text-[#059669]" />
										<span>Locations</span>
									</button>

									{/* Option 2: Create Marker */}
									<button
										type="button"
										onClick={() => {
											setIsMenuOpen(false);
											setActiveEditingLocation(null);
											wasCardModeBeforeMarkerRef.current = !isAppleMapsMode;
											setIsAppleMapsMode(true);
											setIsCreateMarkerOpen(true);
										}}
										className="w-full px-3 py-2.5 rounded-xl hover:bg-neutral-50 flex items-center gap-2.5 text-left text-[13px] font-bold text-[#111111] transition-colors cursor-pointer"
									>
										<MapPinPlus
											size={18}
											className="text-[#111111]"
										/>
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
										<Car
											size={18}
											className="text-neutral-600"
										/>
										<span>Vehicle Settings</span>
									</button>
								</motion.div>
							)}
						</AnimatePresence>

						{/* Floating Trigger Button */}
						<button
							type="button"
							onClick={() => setIsMenuOpen(!isMenuOpen)}
							aria-label="Locations and Vehicle Menu"
							className={`w-12 h-12 rounded-full shadow-lg border border-neutral-200/60 flex items-center justify-center transition-all cursor-pointer ${
								isMenuOpen
									? 'bg-neutral-900 text-white'
									: 'bg-white text-[#111111] hover:bg-neutral-50'
							}`}
						>
							{isMenuOpen ? <X size={20} /> : <MapPin size={20} />}
						</button>
					</div>
				</div>
			)}

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
