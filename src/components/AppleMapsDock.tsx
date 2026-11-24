import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
	motion,
	AnimatePresence,
	useMotionValue,
	useDragControls,
	animate,
	PanInfo,
} from 'motion/react';
import {
	Search,
	X,
	Navigation,
	ChevronDown,
	ChevronUp,
	CornerUpRight,
	CornerUpLeft,
	ArrowUp,
	Car,
	Tag,
	MapPin,
	Play,
	Plus,
} from 'lucide-react';
import { Coordinate, SavedLocation } from '../types/maps';
import {
	searchAddresses,
	haversineDistanceMiles,
	RouteDirections,
	SearchAddressResult,
} from '../utils/mapRouting';
import { LucideIcon } from './LucideIcon';

export interface NearbyDeal {
	id: string;
	title: string;
	brand: string;
	category: 'gas' | 'food' | 'grocery' | 'coffee';
	dealBadge: string;
	description: string;
	savingsAmount: number;
	coordOffset: { lat: number; lng: number };
	address: string;
}

const CURATED_DEALS: NearbyDeal[] = [
	{
		id: 'deal-costco-gas',
		title: 'Costco Wholesale Gas',
		brand: 'Costco',
		category: 'gas',
		dealBadge: 'Save $0.24/gal',
		description:
			'$3.09/gal vs $3.33/gal state avg. Save ~$3.60 per fill-up.',
		savingsAmount: 3.6,
		coordOffset: { lat: 0.016, lng: -0.014 },
		address: '385 N Delsea Dr',
	},
	{
		id: 'deal-wawa-fuel',
		title: 'Wawa Fuel & Fresh Coffee',
		brand: 'Wawa',
		category: 'gas',
		dealBadge: 'Free 16oz Coffee',
		description:
			'Complimentary hot or iced coffee with any $20+ fuel purchase.',
		savingsAmount: 2.35,
		coordOffset: { lat: -0.009, lng: 0.008 },
		address: '100 University Blvd',
	},
	{
		id: 'deal-aldi-market',
		title: 'ALDI Supermarket',
		brand: 'ALDI',
		category: 'grocery',
		dealBadge: '22% Cheaper Basket',
		description:
			'Weekly fresh produce & staple discounts saving ~$14 per basket.',
		savingsAmount: 14.0,
		coordOffset: { lat: -0.015, lng: -0.012 },
		address: '690 N Delsea Dr',
	},
	{
		id: 'deal-trader-joes',
		title: "Trader Joe's",
		brand: "Trader Joe's",
		category: 'grocery',
		dealBadge: '$1.99 Bakery & Produce',
		description:
			'Sourdough, bananas, and pantry essentials under supermarket retail.',
		savingsAmount: 5.5,
		coordOffset: { lat: 0.024, lng: 0.019 },
		address: '220 Hurffville Cross Keys Rd',
	},
	{
		id: 'deal-chipotle',
		title: 'Chipotle Mexican Grill',
		brand: 'Chipotle',
		category: 'food',
		dealBadge: 'Free Chips & Guac',
		description:
			'Free side of chips & fresh guac on orders over $15 with pickup.',
		savingsAmount: 4.85,
		coordOffset: { lat: 0.011, lng: 0.012 },
		address: '135 Rowan Blvd',
	},
	{
		id: 'deal-starbucks',
		title: 'Starbucks Coffee',
		brand: 'Starbucks',
		category: 'coffee',
		dealBadge: '50% Off Iced Drinks',
		description: 'After 1:00 PM half-price iced espresso and cold brews.',
		savingsAmount: 3.25,
		coordOffset: { lat: -0.006, lng: -0.005 },
		address: '254 High St W',
	},
];

export interface AppleMapsDockProps {
	isOpen: boolean;
	onClose: () => void;
	userLocation: Coordinate;
	savedLocations: SavedLocation[];
	hourlyWage: number;
	mileageRate: number;
	onSelectDestination: (dest: {
		name: string;
		address: string;
		coord: Coordinate;
		category?: string;
		dealBadge?: string;
	}) => void;
	activeRoute: RouteDirections | null;
	selectedDestination: {
		name: string;
		address: string;
		coord: Coordinate;
		category?: string;
		dealBadge?: string;
	} | null;
	onStartNavigation: () => void;
	onCancelRoute: () => void;
	isNavigating: boolean;
	onEndNavigation: () => void;
	onOpenLocationsPage?: () => void;
	onOpenCreateMarker?: () => void;
	onExpandChange?: (isExpanded: boolean) => void;
}

const DOCK_PEEK_HEIGHT = 250;

export const AppleMapsDock: React.FC<AppleMapsDockProps> = ({
	isOpen,
	onClose,
	userLocation,
	savedLocations,
	hourlyWage,
	mileageRate,
	onSelectDestination,
	activeRoute,
	selectedDestination,
	onStartNavigation,
	onCancelRoute,
	isNavigating,
	onOpenLocationsPage,
	onOpenCreateMarker,
	onExpandChange,
}) => {
	const [sheetHeight, setSheetHeight] = useState<number>(() => {
		if (typeof window !== 'undefined') {
			return Math.round(window.innerHeight * 0.88);
		}
		return 650;
	});

	useEffect(() => {
		const updateHeight = () => {
			setSheetHeight(Math.round(window.innerHeight * 0.88));
		};
		window.addEventListener('resize', updateHeight);
		return () => window.removeEventListener('resize', updateHeight);
	}, []);

	const collapsedY = useMemo(() => {
		return Math.max(120, sheetHeight - DOCK_PEEK_HEIGHT);
	}, [sheetHeight]);

	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<SearchAddressResult[]>(
		[],
	);
	const [isSearching, setIsSearching] = useState(false);
	const [showSteps, setShowSteps] = useState(false);
	const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Draggable action dock state behaving like App.tsx dock
	const [isDockExpanded, setIsDockExpanded] = useState(false);
	const dockY = useMotionValue(sheetHeight || 600);
	const dragControls = useDragControls();

	useEffect(() => {
		onExpandChange?.(isDockExpanded);
	}, [isDockExpanded, onExpandChange]);

	// Smooth slide-up transition when opened, expanding/collapsing on state changes
	useEffect(() => {
		if (isOpen) {
			animate(dockY, isDockExpanded ? 0 : collapsedY, {
				type: 'spring',
				damping: 28,
				stiffness: 300,
			});
		} else {
			dockY.set(sheetHeight || 600);
		}
	}, [isOpen, isDockExpanded, collapsedY, sheetHeight]);

	// Debounced search for addresses and saved locations with proximity bias
	useEffect(() => {
		const trimmed = searchQuery.trim();
		if (trimmed.length < 2) {
			setSearchResults([]);
			setIsSearching(false);
			return;
		}

		setIsSearching(true);
		setIsDockExpanded(true);
		if (searchTimerRef.current) {
			clearTimeout(searchTimerRef.current);
		}

		searchTimerRef.current = setTimeout(async () => {
			try {
				const lower = trimmed.toLowerCase();
				// 1. Search matching saved locations
				const matchedSaved: Array<SearchAddressResult> = savedLocations
					.filter(
						(loc) =>
							loc.name.toLowerCase().includes(lower) ||
							loc.address?.toLowerCase().includes(lower),
					)
					.map((loc) => ({
						name: loc.name,
						address: loc.address || 'Saved Location',
						label: `${loc.name}, ${loc.address || 'Saved Location'}`,
						lat: loc.lat,
						lng: loc.lng,
					}));

				// 2. Fetch proximity-biased geocoded locations
				const geoResults = await searchAddresses(
					trimmed,
					userLocation,
					15,
				);

				// 3. Deduplicate (if geo matches saved coordinate closely)
				const filteredGeo = geoResults.filter(
					(g) =>
						!matchedSaved.some(
							(s) =>
								haversineDistanceMiles(
									{ lat: s.lat, lng: s.lng },
									{ lat: g.lat, lng: g.lng },
								) < 0.05,
						),
				);

				const combined = [...matchedSaved, ...filteredGeo];
				combined.sort((a, b) => {
					const distA = haversineDistanceMiles(userLocation, {
						lat: a.lat,
						lng: a.lng,
					});
					const distB = haversineDistanceMiles(userLocation, {
						lat: b.lat,
						lng: b.lng,
					});
					return distA - distB;
				});

				setSearchResults(combined);
			} catch {
				setSearchResults([]);
			} finally {
				setIsSearching(false);
			}
		}, 350);

		return () => {
			if (searchTimerRef.current) {
				clearTimeout(searchTimerRef.current);
			}
		};
	}, [searchQuery, savedLocations, userLocation]);

	// Format distance and time
	const computeMetrics = (destCoord: Coordinate) => {
		const dist = haversineDistanceMiles(userLocation, destCoord) * 1.25;
		const miles = Number(Math.max(0.2, dist).toFixed(1));
		const driveMinutes = Math.max(2, Math.round((miles / 28) * 60));
		const tripCost = Number((miles * mileageRate).toFixed(2));
		const laborMinutes = Math.max(
			1,
			Math.round((tripCost / Math.max(hourlyWage, 5)) * 60),
		);
		return { miles, driveMinutes, tripCost, laborMinutes };
	};

	// Quick-Tap Saved Locations formatted with actual user selected icons and locations
	const renderedSavedLocations = useMemo(() => {
		return savedLocations.map((loc) => {
			const metrics = computeMetrics({ lat: loc.lat, lng: loc.lng });
			return {
				id: loc.id,
				name: loc.name,
				address: loc.address,
				coord: { lat: loc.lat, lng: loc.lng },
				icon: loc.icon || (loc.isHome ? 'home' : 'map-pin'),
				isHome: loc.isHome,
				subtitle: `${metrics.miles} mi · ${metrics.driveMinutes}m`,
			};
		});
	}, [savedLocations, userLocation, mileageRate, hourlyWage]);

	const handleSelectDestinationAndCollapse = (dest: {
		name: string;
		address: string;
		coord: Coordinate;
		category?: string;
		dealBadge?: string;
	}) => {
		setIsDockExpanded(false);
		animate(dockY, collapsedY, {
			type: 'spring',
			damping: 28,
			stiffness: 320,
		});
		onSelectDestination(dest);
	};

	// Nearby deals
	const enrichedDeals = useMemo(() => {
		return CURATED_DEALS.map((deal) => {
			const coord: Coordinate = {
				lat: Number(
					(userLocation.lat + deal.coordOffset.lat).toFixed(5),
				),
				lng: Number(
					(userLocation.lng + deal.coordOffset.lng).toFixed(5),
				),
			};
			const metrics = computeMetrics(coord);
			const netSavings = Number(
				Math.max(0, deal.savingsAmount - metrics.tripCost).toFixed(2),
			);
			return {
				...deal,
				coord,
				...metrics,
				netSavings,
			};
		});
	}, [userLocation, mileageRate, hourlyWage]);

	// Route summary metrics
	const routeMetrics = useMemo(() => {
		if (!activeRoute) return null;
		const miles = activeRoute.distanceMiles;
		const duration = activeRoute.durationMinutes;
		const tripCost = Number((miles * mileageRate).toFixed(2));
		const laborMinutes = Math.max(
			1,
			Math.round((tripCost / Math.max(hourlyWage, 5)) * 60),
		);
		const arrivalDate = new Date(Date.now() + duration * 60000);
		const arrivalTimeStr = arrivalDate.toLocaleTimeString([], {
			hour: 'numeric',
			minute: '2-digit',
		});
		return {
			miles,
			duration,
			tripCost,
			laborMinutes,
			arrivalTimeStr,
		};
	}, [activeRoute, mileageRate, hourlyWage]);

	if (!isOpen || isNavigating) return null;

	return (
		<motion.div
			drag={isDockExpanded ? false : 'y'}
			dragControls={dragControls}
			dragListener={false}
			dragConstraints={{
				top: 0,
				bottom: collapsedY + 120,
			}}
			dragElastic={0.08}
			onDragEnd={(_, info: PanInfo) => {
				const currentY = dockY.get();
				if (isDockExpanded) {
					if (
						info.offset.y > 60 ||
						info.velocity.y > 150 ||
						currentY > collapsedY * 0.4
					) {
						setIsDockExpanded(false);
					} else {
						animate(dockY, 0, {
							type: 'spring',
							damping: 28,
							stiffness: 320,
						});
					}
				} else {
					if (
						info.offset.y > 80 ||
						info.velocity.y > 200 ||
						currentY > collapsedY + 60
					) {
						onClose();
					} else if (
						info.offset.y < -40 ||
						info.velocity.y < -150 ||
						currentY < collapsedY - 60
					) {
						setIsDockExpanded(true);
					} else {
						animate(dockY, collapsedY, {
							type: 'spring',
							damping: 28,
							stiffness: 320,
						});
					}
				}
			}}
			style={{ y: dockY, touchAction: 'pan-y' }}
			className="fixed bottom-0 inset-x-0 z-40 max-w-120 mx-auto bg-[#FFFFFF] rounded-t-[24px] shadow-[0px_-4px_16px_rgba(0,0,0,0.06)] flex flex-col h-[88vh] max-h-[92vh] overflow-hidden pb-2"
		>
			{/* Top Pull Bar / Grab Handle - ONLY place from which the dock can be dragged */}
			<div
				onPointerDown={(e) => dragControls.start(e)}
				onClick={() => {
					const next = !isDockExpanded;
					setIsDockExpanded(next);
					animate(dockY, next ? 0 : collapsedY, {
						type: 'spring',
						damping: 28,
						stiffness: 320,
					});
				}}
				className="w-full pt-3 pb-2.5 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
				role="button"
				tabIndex={0}
				aria-label={
					isDockExpanded
						? 'Drag down to collapse'
						: 'Drag up to expand'
				}
			>
				<div className="w-10 h-1 bg-[#D1D5DB] rounded-full" />
			</div>

			{/* When a destination is selected, show Route Overview */}
			{selectedDestination && activeRoute && routeMetrics ? (
				<div
					style={{
						touchAction: 'pan-y',
						WebkitOverflowScrolling: 'touch',
					}}
					className="flex-1 overflow-y-auto px-5 pb-28 flex flex-col gap-3.5 min-h-0 touch-pan-y"
				>
					<div
						onPointerDown={(e) => {
							dragControls.start(e);
						}}
						className="flex items-start justify-between gap-3 pt-0.5 cursor-grab active:cursor-grabbing select-none"
					>
						<div className="flex-1 min-w-0">
							<h2 className="text-[20px] font-extrabold text-[#111111] tracking-tight truncate">
								{selectedDestination.name}
							</h2>
							<p className="text-[12px] text-neutral-500 truncate font-medium">
								{selectedDestination.address}
							</p>
						</div>
						<button
							type="button"
							onClick={onCancelRoute}
							onPointerDown={(e) => e.stopPropagation()}
							aria-label="Back to saved locations and search"
							className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition-colors cursor-pointer shrink-0"
						>
							<X size={17} />
						</button>
					</div>

					{/* Apple Maps Big ETA Hero Card with Icon-Only Play Button */}
					<div className="bg-[#F9FAFB] rounded-2xl p-3.5 border border-neutral-200/60 flex items-center justify-between">
						<div>
							<div className="flex items-baseline gap-1.5">
								<span className="text-[32px] leading-none font-black text-[#111111] tracking-tight">
									{routeMetrics.duration}
								</span>
								<span className="text-[16px] font-bold text-neutral-600">
									min
								</span>
							</div>
							<div className="text-[12.5px] text-neutral-500 font-semibold mt-1">
								{routeMetrics.miles} mi · Arrive by{' '}
								{routeMetrics.arrivalTimeStr}
							</div>
							<div className="text-[11px] font-bold text-emerald-600 mt-0.5">
								Fastest route · Typical traffic
							</div>
						</div>

						{/* Icon-Only Play Button */}
						<button
							type="button"
							onClick={onStartNavigation}
							aria-label="Start Navigation"
							className="w-13 h-13 rounded-2xl bg-[#34C759] hover:bg-[#2DB84F] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all cursor-pointer shrink-0"
						>
							<Play
								size={22}
								className="fill-white text-white translate-x-0.5"
							/>
						</button>
					</div>

					{/* ImCheap Financial Insight Card */}
					<div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-200/60 flex items-center justify-between">
						<div>
							<div className="text-[17px] font-extrabold text-[#111111]">
								${routeMetrics.tripCost.toFixed(2)}
							</div>
							<div className="text-[11px] text-neutral-600 font-medium">
								Est. driving cost
							</div>
						</div>
						<div className="text-right">
							<div className="text-[17px] font-extrabold text-emerald-700">
								{routeMetrics.laborMinutes} min
							</div>
							<div className="text-[11px] text-neutral-600 font-medium">
								Of work time @ ${hourlyWage}/hr
							</div>
						</div>
					</div>

					{/* Turn-by-Turn Steps Accordion - Fully scrollable */}
					<div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
						<button
							type="button"
							onClick={() => {
								const next = !showSteps;
								setShowSteps(next);
								if (next) {
									setIsDockExpanded(true);
									animate(dockY, 0, {
										type: 'spring',
										damping: 28,
										stiffness: 320,
									});
								}
							}}
							className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<Car size={16} className="text-[#007AFF]" />
								<span className="text-[13px] font-bold text-[#111111]">
									Directions ({activeRoute.steps.length}{' '}
									steps)
								</span>
							</div>
							{showSteps ? (
								<ChevronUp
									size={16}
									className="text-neutral-500"
								/>
							) : (
								<ChevronDown
									size={16}
									className="text-neutral-500"
								/>
							)}
						</button>

						{showSteps && (
							<div className="border-t border-neutral-100 divide-y divide-neutral-100 px-4 py-2">
								{activeRoute.steps.map((step, idx) => (
									<div
										key={idx}
										className="py-2.5 flex items-start gap-2.5"
									>
										<div className="w-6 h-6 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
											{step.maneuverModifier?.includes(
												'left',
											) ? (
												<CornerUpLeft size={13} />
											) : step.maneuverModifier?.includes(
													'right',
											  ) ? (
												<CornerUpRight size={13} />
											) : (
												<ArrowUp size={13} />
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-[12.5px] font-bold text-[#111111] leading-snug">
												{step.instruction}
											</div>
											<div className="text-[11px] text-neutral-500 font-medium mt-0.5">
												{step.distanceMiles} mi ·{' '}
												{step.street}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			) : (
				// Standard iOS Foreground Bottom Sheet Content - Relative flow and scrollable
				<div
					onScroll={() => {
						if (!isDockExpanded) {
							setIsDockExpanded(true);
						}
					}}
					onPointerDownCapture={(e) => {
						e.stopPropagation();
					}}
					style={{ touchAction: 'pan-y' }}
					className="flex-1 overflow-y-auto px-4 pb-16 flex flex-col gap-3.5 min-h-0 touch-pan-y"
				>
					{/* Row 1: Full-width search bar without Done button */}
					<div className="relative flex items-center pt-0.5 shrink-0">
						<div className="flex-1 h-11 bg-[#F3F4F6] rounded-2xl px-3.5 flex items-center gap-2.5 transition-all">
							<Search
								size={18}
								className="text-[#9CA3AF] shrink-0"
							/>
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search Maps, addresses, deals..."
								className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#111111] font-medium placeholder:text-[#9CA3AF] focus:outline-none focus:ring-0"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery('')}
									className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
								>
									<X size={16} />
								</button>
							)}
						</div>
					</div>

					{/* Live Search Address Results dropdown */}
					{searchQuery.trim().length >= 2 && (
						<div className="relative bg-white rounded-2xl border border-neutral-200/80 shadow-md overflow-hidden mb-1 shrink-0">
							<div className="px-3.5 py-1.5 bg-neutral-50 border-b border-neutral-100 text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">
								Search Results {isSearching && '...'}
							</div>
							{searchResults.length === 0 && !isSearching ? (
								<div className="p-3.5 text-center text-[12.5px] text-neutral-500 font-medium">
									No matching locations found.
								</div>
							) : (
								<div className="divide-y divide-neutral-100">
									{searchResults.map((res, i) => {
										const metrics = computeMetrics({
											lat: res.lat,
											lng: res.lng,
										});
										return (
											<button
												key={i}
												type="button"
												onClick={() =>
													handleSelectDestinationAndCollapse(
														{
															name:
																res.name ||
																res.label.split(
																	',',
																)[0],
															address:
																res.address ||
																res.label,
															coord: {
																lat: res.lat,
																lng: res.lng,
															},
														},
													)
												}
												className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-blue-50/50 transition-colors cursor-pointer"
											>
												<div className="flex items-center gap-2.5 min-w-0 pr-2">
													<div className="w-7 h-7 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0">
														<MapPin size={15} />
													</div>
													<div className="min-w-0">
														<div className="text-[13.5px] font-bold text-[#111111] truncate">
															{res.name ||
																res.label.split(
																	',',
																)[0]}
														</div>
														<div className="text-[11.5px] text-neutral-500 truncate font-medium mt-0.5">
															{res.address ||
																res.label}
														</div>
													</div>
												</div>
												<div className="text-right shrink-0">
													<div className="text-[12.5px] font-black text-[#007AFF]">
														{metrics.miles} mi
													</div>
													<div className="text-[10.5px] text-neutral-500 font-medium">
														~{metrics.driveMinutes}m
													</div>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</div>
					)}

					{/* Row 2: Section Title inline (SAVED LOCATIONS and Edit) */}
					<div className="relative flex items-center justify-between px-0.5 pt-0.5 shrink-0">
						<span className="text-[12px] font-bold uppercase tracking-wider text-[#9CA3AF]">
							SAVED LOCATIONS
						</span>
						<button
							type="button"
							onClick={onOpenLocationsPage}
							className="text-[13.5px] font-medium text-[#6B7280] hover:text-[#111111] cursor-pointer"
						>
							Edit
						</button>
					</div>

					{/* Row 3: HORIZONTAL ROW OF QUICK-TAP SAVED LOCATION PRESET CARDS */}
					<div className="relative flex items-center gap-2.5 overflow-x-auto no-scrollbar px-0.5 pb-2 pt-0.5 shrink-0 min-h-[114px]">
						{renderedSavedLocations.map((loc) => (
							<button
								key={loc.id}
								type="button"
								onClick={() =>
									handleSelectDestinationAndCollapse({
										name: loc.name,
										address: loc.address,
										coord: loc.coord,
									})
								}
								className="flex flex-col items-center bg-white justify-between active:scale-95 transition-all rounded-2xl p-2.5 w-21 min-h-[102px] shrink-0 cursor-pointer shadow-xs border border-gray-100"
							>
								{/* Icon Container matching dashboard preset container */}
								<div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
									<LucideIcon
										name={loc.icon}
										size={18}
										style={{
											color: loc.isHome
												? '#059669'
												: '#111111',
										}}
									/>
								</div>

								{/* Location Name & Distance Underneath */}
								<div className="flex flex-col items-center w-full min-w-0 mt-1 gap-0.5">
									<span className="text-[12px] font-bold text-[#111111] leading-tight truncate w-full text-center">
										{loc.name}
									</span>
									<span className="text-[10px] text-[#6B7280] font-medium leading-normal tabular-nums whitespace-nowrap text-center">
										{loc.subtitle}
									</span>
								</div>
							</button>
						))}

						{/* Quick Add Place Card */}
						<button
							type="button"
							onClick={() => {
								if (onOpenCreateMarker) {
									onOpenCreateMarker();
								} else {
									onOpenLocationsPage?.();
								}
							}}
							className="flex flex-col items-center bg-neutral-50/80 hover:bg-neutral-100 justify-between active:scale-95 transition-all rounded-2xl p-2.5 w-21 min-h-[102px] shrink-0 cursor-pointer border border-dashed border-neutral-300"
						>
							<div className="w-9 h-9 rounded-full bg-white shadow-2xs flex items-center justify-center shrink-0 text-neutral-600">
								<Plus size={18} />
							</div>
							<div className="flex flex-col items-center w-full min-w-0 mt-1 gap-0.5">
								<span className="text-[12px] font-bold text-neutral-700 leading-tight truncate w-full text-center">
									Add Place
								</span>
								<span className="text-[10px] text-neutral-400 font-medium leading-normal whitespace-nowrap text-center">
									New marker
								</span>
							</div>
						</button>

						{/* Overflow visual cue */}
						<div className="w-2 shrink-0" />
					</div>

					{/* Suggestions and Deals Nearby - Relative flow below the saved locations */}
					<section className="relative flex flex-col gap-2 pt-2 border-t border-neutral-100 shrink-0">
						<div className="flex items-center justify-between px-0.5">
							<div className="flex items-center gap-1.5">
								<Tag size={13} className="text-emerald-600" />
								<span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
									Nearby Deals & Suggestions
								</span>
							</div>
							<span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
								ImCheap Picks
							</span>
						</div>

						<div className="flex flex-col gap-2">
							{enrichedDeals.map((deal) => (
								<div
									key={deal.id}
									className="bg-neutral-50/80 rounded-2xl p-3 border border-neutral-200/60 flex items-center justify-between gap-2"
								>
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<h4 className="text-[13.5px] font-bold text-[#111111] truncate">
												{deal.title}
											</h4>
											<span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
												{deal.dealBadge}
											</span>
										</div>
										<p className="text-[11.5px] text-neutral-500 font-medium truncate mt-0.5">
											{deal.miles} mi · {deal.address}
										</p>
									</div>

									<button
										type="button"
										onClick={() =>
											handleSelectDestinationAndCollapse({
												name: deal.title,
												address: deal.address,
												coord: deal.coord,
												category: deal.category,
												dealBadge: deal.dealBadge,
											})
										}
										className="h-8 px-3 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white font-bold text-[12px] flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer shadow-xs"
									>
										<Navigation size={12} />
										<span>Route</span>
									</button>
								</div>
							))}
						</div>
					</section>
				</div>
			)}
		</motion.div>
	);
};
