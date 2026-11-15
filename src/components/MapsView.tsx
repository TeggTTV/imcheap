import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinate, RecordedTrip } from '../types/maps';
import {
	fetchRoadRoute,
	reverseGeocode,
	searchAddresses,
	DEFAULT_ROAD_ROUTES,
} from '../utils/mapRouting';

export interface MapsViewProps {
	trips: RecordedTrip[];
	onLogTrip: (trip: RecordedTrip) => void;
	onSimulateTrip: () => void;
	hourlyWage: number;
	mileageRate: number;
	autoTripDetection?: boolean;
}

const DEFAULT_CENTER: [number, number] = [39.7032, -75.1220]; // Glassboro, NJ (Girard Rd area)

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

	// User location state, prioritizing calibrated address if saved
	const [userLocation, setUserLocation] = useState<Coordinate>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_user_custom_location');
				if (saved) {
					const parsed = JSON.parse(saved);
					if (parsed?.lat && parsed?.lng) return parsed;
				}
			} catch {}
		}
		return { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
	});

	const [currentAddress, setCurrentAddress] = useState<string>('');
	const [activeTripId, setActiveTripId] = useState<string | null>(() => {
		return trips[0]?.id || null;
	});
	const [gpsStatus, setGpsStatus] = useState<'Ready' | 'Tracking' | 'Idle'>(
		autoTripDetection ? 'Tracking' : 'Ready',
	);

	// Address search / calibration modal state
	const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<
		Array<{ label: string; lat: number; lng: number }>
	>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isPickOnMapActive, setIsPickOnMapActive] = useState(false);

	// Reverse geocode user location to show street address
	useEffect(() => {
		let isMounted = true;
		reverseGeocode(userLocation).then((addr) => {
			if (isMounted) {
				setCurrentAddress(addr);
			}
		});
		return () => {
			isMounted = false;
		};
	}, [userLocation]);

	// High accuracy GPS detection
	useEffect(() => {
		if (!('geolocation' in navigator)) return;

		// Only override saved custom location if user explicitly requests or none saved
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
						mapInstanceRef.current.setView([coords.lat, coords.lng], 15);
					}
				}
				setGpsStatus(autoTripDetection ? 'Tracking' : 'Ready');
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

		// Custom pulsing user location marker (draggable for manual fine-tuning)
		const userIcon = L.divIcon({
			className: 'bg-transparent',
			html: `
				<div class="relative flex items-center justify-center w-7 h-7 cursor-grab active:cursor-grabbing">
					<div class="absolute w-7 h-7 rounded-full bg-emerald-500/25 animate-ping"></div>
					<div class="relative w-4 h-4 rounded-full bg-[#111111] border-[2.5px] border-white shadow-md"></div>
				</div>
			`,
			iconSize: [28, 28],
			iconAnchor: [14, 14],
		});

		const userMarker = L.marker([userLocation.lat, userLocation.lng], {
			icon: userIcon,
			draggable: true,
			zIndexOffset: 1000,
		}).addTo(map);

		userMarker.on('dragend', async (e) => {
			const target = e.target as L.Marker;
			const pos = target.getLatLng();
			const newCoords = { lat: pos.lat, lng: pos.lng };
			setUserLocation(newCoords);
			try {
				localStorage.setItem(
					'imcheap_user_custom_location',
					JSON.stringify(newCoords),
				);
			} catch {}
		});

		userMarkerRef.current = userMarker;

		// Map click handler when "Pick on Map" mode is enabled
		map.on('click', (e: L.LeafletMouseEvent) => {
			if (isPickOnMapActive) {
				const newCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
				setUserLocation(newCoords);
				try {
					localStorage.setItem(
						'imcheap_user_custom_location',
						JSON.stringify(newCoords),
					);
				} catch {}
				setIsPickOnMapActive(false);
			}
		});

		mapInstanceRef.current = map;

		// Auto fit to initial active trip if any
		const initialTrip = trips.find((t) => t.id === activeTripId) || trips[0];
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
			userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
		}
	}, [userLocation]);

	const renderTripRoute = async (
		map: L.Map,
		markersGroup: L.LayerGroup,
		trip: RecordedTrip,
	) => {
		// Clear previous polyline & markers
		if (polylineLayerRef.current) {
			map.removeLayer(polylineLayerRef.current);
			polylineLayerRef.current = null;
		}
		markersGroup.clearLayers();

		let coords = trip.coordinates;

		// If trip has pre-baked road routes or fewer than 20 points, fetch real road geometry
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

		// Polyline snapped strictly to real streets and roads
		const polyline = L.polyline(latLngs, {
			color: '#111111',
			weight: 4.5,
			opacity: 0.95,
			lineCap: 'round',
			lineJoin: 'round',
		}).addTo(map);
		polylineLayerRef.current = polyline;

		// Start Marker "A" snapped to road start
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

		// End Marker "B" snapped to road end
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

		// Fit bounds comfortably to the road route
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
			renderTripRoute(mapInstanceRef.current, markersLayerRef.current, trip);
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

		// Re-query high-accuracy GPS if available
		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const coords = {
						lat: pos.coords.latitude,
						lng: pos.coords.longitude,
					};
					setUserLocation(coords);
					mapInstanceRef.current?.setView([coords.lat, coords.lng], 16, {
						animate: true,
					});
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

	// Debounced address search
	const handleSearchChange = async (val: string) => {
		setSearchQuery(val);
		if (val.trim().length >= 3) {
			setIsSearching(true);
			const results = await searchAddresses(val);
			setSearchResults(results);
			setIsSearching(false);
		} else {
			setSearchResults([]);
		}
	};

	const handleSelectAddress = (item: {
		label: string;
		lat: number;
		lng: number;
	}) => {
		const newCoords = { lat: item.lat, lng: item.lng };
		setUserLocation(newCoords);
		setCurrentAddress(item.label);
		try {
			localStorage.setItem(
				'imcheap_user_custom_location',
				JSON.stringify(newCoords),
			);
		} catch {}
		setIsAddressModalOpen(false);
		setSearchQuery('');
		setSearchResults([]);
		if (mapInstanceRef.current) {
			mapInstanceRef.current.setView([newCoords.lat, newCoords.lng], 16, {
				animate: true,
			});
		}
	};

	const activeTrip = trips.find((t) => t.id === activeTripId);
	const activeMiles = activeTrip ? activeTrip.miles : 12.8;
	const activeLaborMinutes =
		hourlyWage > 0
			? ((activeMiles * mileageRate) / hourlyWage) * 60
			: 6.3;

	const totalLaborMinutes = trips.reduce((acc, t) => {
		const cost = t.miles * mileageRate;
		return acc + (hourlyWage > 0 ? (cost / hourlyWage) * 60 : 0);
	}, 0);

	return (
		<div className="flex flex-col gap-4 pb-28 pt-2 px-margin-sm max-w-120 mx-auto w-full select-none">
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

			{/* Current Address & Location Calibration Bar */}
			<div className="flex items-center justify-between bg-white rounded-2xl px-3.5 py-2.5 border border-gray-200/80 shadow-2xs">
				<div className="flex items-center gap-2.5 min-w-0 flex-1">
					<div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
						<span className="material-symbols-outlined text-[18px]">
							near_me
						</span>
					</div>
					<div className="flex flex-col min-w-0 flex-1 pr-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
							Current Location
						</span>
						<span
							className="text-[13px] font-bold text-[#111111] truncate"
							title={currentAddress}
						>
							{currentAddress || 'Locating exact street address...'}
						</span>
					</div>
				</div>

				<button
					type="button"
					onClick={() => setIsAddressModalOpen(true)}
					data-testid="edit-location-btn"
					className="text-[12px] font-bold text-[#059669] hover:text-[#047857] hover:bg-emerald-50 active:scale-95 px-2.5 py-1.5 rounded-xl border border-emerald-200/60 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
				>
					<span>Fine-Tune</span>
					<span className="material-symbols-outlined text-[14px]">edit</span>
				</button>
			</div>

			{/* Custom Grayscale Map Card */}
			<div className="relative w-full h-[320px] rounded-3xl overflow-hidden border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] bg-white">
				{/* Map Container with clean high-contrast grayscale styling */}
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
									? ((trip.cost || trip.miles * mileageRate) /
											hourlyWage) *
									  60
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

			{/* Address Search / Exact Pinpoint Modal */}
			{isAddressModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
					<div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 border border-gray-100">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="material-symbols-outlined text-[22px] text-[#059669]">
									location_on
								</span>
								<h3 className="text-[16px] font-bold text-[#111111]">
									Set Exact Address
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsAddressModalOpen(false)}
								data-testid="close-address-modal-btn"
								className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer"
							>
								<span className="material-symbols-outlined text-[20px]">
									close
								</span>
							</button>
						</div>

						<p className="text-[12px] text-[#6B7280] leading-relaxed">
							Browser Wi-Fi and IP detection can place you a few blocks away. Enter your street address to lock in your exact coordinates.
						</p>

						<div className="relative w-full">
							<input
								type="text"
								data-testid="address-search-input"
								value={searchQuery}
								onChange={(e) => handleSearchChange(e.target.value)}
								placeholder="e.g. 123 Main St, Glassboro NJ"
								className="w-full bg-[#F4F7FB] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-[#111111] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#059669]"
							/>
							{isSearching && (
								<div className="absolute right-3 top-2.5">
									<span className="material-symbols-outlined text-[18px] text-gray-400 animate-spin">
										progress_activity
									</span>
								</div>
							)}
						</div>

						{/* Search Suggestions */}
						{searchResults.length > 0 && (
							<div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100 max-h-48 overflow-y-auto">
								{searchResults.map((item, idx) => (
									<button
										key={idx}
										type="button"
										data-testid={`address-result-${idx}`}
										onClick={() => handleSelectAddress(item)}
										className="w-full text-left p-2.5 hover:bg-neutral-50 transition-colors text-[13px] text-[#111111] font-medium flex items-start gap-2 cursor-pointer"
									>
										<span className="material-symbols-outlined text-[16px] text-gray-400 shrink-0 mt-0.5">
											place
										</span>
										<span className="truncate">{item.label}</span>
									</button>
								))}
							</div>
						)}

						<div className="flex items-center gap-2 pt-1">
							<button
								type="button"
								onClick={handleCenterOnMe}
								className="flex-1 py-2.5 px-3 rounded-xl border border-gray-200 text-[#111111] font-bold text-[13px] hover:bg-neutral-50 transition-all flex items-center justify-center gap-1.5"
							>
								<span className="material-symbols-outlined text-[18px]">
									gps_fixed
								</span>
								<span>Re-Detect GPS</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsPickOnMapActive(true);
									setIsAddressModalOpen(false);
								}}
								className="flex-1 py-2.5 px-3 rounded-xl bg-[#111111] text-white font-bold text-[13px] hover:bg-neutral-900 transition-all flex items-center justify-center gap-1.5 shadow-sm"
							>
								<span className="material-symbols-outlined text-[18px]">
									touch_app
								</span>
								<span>Tap on Map</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
