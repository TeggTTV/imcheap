import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
	Search,
	X,
	Navigation,
	Fuel,
	Utensils,
	ShoppingBag,
	Coffee,
	MapPin,
	Clock,
	DollarSign,
	Sparkles,
	ChevronDown,
	ChevronUp,
	CornerUpRight,
	CornerUpLeft,
	ArrowUp,
	CheckCircle2,
	Car,
	ArrowRight,
	Tag,
} from 'lucide-react';
import { Coordinate, SavedLocation } from '../types/maps';
import {
	searchAddresses,
	haversineDistanceMiles,
	RouteDirections,
	DirectionStep,
} from '../utils/mapRouting';

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
		description: '$3.09/gal vs $3.33/gal state avg. Save ~$3.60 per fill-up.',
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
		description: 'Complimentary hot or iced coffee with any $20+ fuel purchase.',
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
		description: 'Weekly fresh produce & staple discounts saving ~$14 per basket.',
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
		description: 'Sourdough, bananas, and pantry essentials under supermarket retail.',
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
		description: 'Free side of chips & fresh guac on orders over $15 with pickup.',
		savingsAmount: 4.85,
		coordOffset: { lat: 0.011, lng: 0.012 },
		address: '135 Rowan Blvd',
	},
	{
		id: 'deal-panera',
		title: 'Panera Bread Cafe',
		brand: 'Panera',
		category: 'food',
		dealBadge: '$5 Off You Pick Two',
		description: 'App coupon for $5 discount on lunch sandwich & soup combo.',
		savingsAmount: 5.0,
		coordOffset: { lat: -0.018, lng: 0.014 },
		address: '500 Greentree Rd',
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
}

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
	onEndNavigation,
}) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<
		Array<{ label: string; lat: number; lng: number }>
	>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<
		'all' | 'gas' | 'food' | 'grocery' | 'coffee'
	>('all');
	const [dockSnap, setDockSnap] = useState<'mid' | 'full' | 'peek'>('mid');
	const [showSteps, setShowSteps] = useState(false);
	const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Debounced search for addresses
	useEffect(() => {
		const trimmed = searchQuery.trim();
		if (trimmed.length < 3) {
			setSearchResults([]);
			setIsSearching(false);
			return;
		}

		setIsSearching(true);
		if (searchTimerRef.current) {
			clearTimeout(searchTimerRef.current);
		}

		searchTimerRef.current = setTimeout(async () => {
			try {
				const results = await searchAddresses(trimmed);
				setSearchResults(results);
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
	}, [searchQuery]);

	// Format distance and time
	const computeMetrics = (destCoord: Coordinate) => {
		const dist = haversineDistanceMiles(userLocation, destCoord) * 1.25;
		const miles = Number(Math.max(0.2, dist).toFixed(1));
		const driveMinutes = Math.max(2, Math.round((miles / 28) * 60));
		const tripCost = Number((miles * mileageRate).toFixed(2));
		const laborMinutes = Math.max(1, Math.round((tripCost / Math.max(hourlyWage, 5)) * 60));
		return { miles, driveMinutes, tripCost, laborMinutes };
	};

	// Filtered nearby deals
	const filteredDeals = useMemo(() => {
		const list = selectedCategory === 'all'
			? CURATED_DEALS
			: CURATED_DEALS.filter((d) => d.category === selectedCategory);

		return list.map((deal) => {
			const coord: Coordinate = {
				lat: Number((userLocation.lat + deal.coordOffset.lat).toFixed(5)),
				lng: Number((userLocation.lng + deal.coordOffset.lng).toFixed(5)),
			};
			const metrics = computeMetrics(coord);
			const netSavings = Number(Math.max(0, deal.savingsAmount - metrics.tripCost).toFixed(2));
			return {
				...deal,
				coord,
				...metrics,
				netSavings,
			};
		});
	}, [selectedCategory, userLocation, mileageRate, hourlyWage]);

	// Saved locations with calculated metrics
	const enrichedLocations = useMemo(() => {
		const items = [...savedLocations];
		if (!items.some((l) => l.name.toLowerCase() === 'work')) {
			items.push({
				id: 'default-work',
				name: 'Work / Office',
				address: 'Business Park Boulevard',
				lat: userLocation.lat + 0.022,
				lng: userLocation.lng + 0.015,
				icon: 'briefcase',
				isVisibleOnMap: true,
			});
		}
		if (!items.some((l) => l.name.toLowerCase() === 'gym' || l.name.toLowerCase() === 'fitness')) {
			items.push({
				id: 'default-gym',
				name: 'Fitness Club',
				address: '42 Main St Sports Complex',
				lat: userLocation.lat - 0.012,
				lng: userLocation.lng - 0.016,
				icon: 'dumbbell',
				isVisibleOnMap: true,
			});
		}

		return items.map((loc) => {
			const metrics = computeMetrics({ lat: loc.lat, lng: loc.lng });
			return {
				...loc,
				...metrics,
			};
		});
	}, [savedLocations, userLocation, mileageRate, hourlyWage]);

	// Route summary metrics
	const routeMetrics = useMemo(() => {
		if (!activeRoute) return null;
		const miles = activeRoute.distanceMiles;
		const duration = activeRoute.durationMinutes;
		const tripCost = Number((miles * mileageRate).toFixed(2));
		const laborMinutes = Math.max(1, Math.round((tripCost / Math.max(hourlyWage, 5)) * 60));
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

	if (!isOpen) return null;

	// In active navigation driving HUD, dock is minimized or hidden in favor of driving banner
	if (isNavigating) {
		return null;
	}

	return (
		<motion.div
			initial={{ y: '100%' }}
			animate={{
				y: dockSnap === 'full' ? '6%' : dockSnap === 'mid' ? '46%' : '84%',
			}}
			exit={{ y: '100%' }}
			transition={{ type: 'spring', damping: 30, stiffness: 320 }}
			className="fixed inset-x-0 bottom-0 z-50 max-w-120 mx-auto bg-white/95 backdrop-blur-xl rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t border-neutral-200/70 flex flex-col h-[94vh] overflow-hidden select-none"
		>
			{/* Top Drag Handle & Snap Controls */}
			<div
				onClick={() => {
					if (dockSnap === 'mid') setDockSnap('full');
					else if (dockSnap === 'full') setDockSnap('mid');
					else setDockSnap('mid');
				}}
				className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer active:opacity-70 focus:outline-none shrink-0"
			>
				<div className="w-10 h-1.25 bg-neutral-300 rounded-full" />
			</div>

			{/* When a destination route is selected, show Route Overview */}
			{selectedDestination && activeRoute && routeMetrics ? (
				<div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-8 flex flex-col gap-4">
					{/* Header row with destination info & dismiss button */}
					<div className="flex items-start justify-between gap-3 pt-1">
						<div className="flex-1 min-w-0">
							<div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#007AFF] text-[11px] font-bold uppercase tracking-wider mb-1">
								<span>Apple Maps Directions</span>
							</div>
							<h2 className="text-[22px] font-extrabold text-[#111111] tracking-tight truncate">
								{selectedDestination.name}
							</h2>
							<p className="text-[13px] text-neutral-500 truncate font-medium">
								{selectedDestination.address}
							</p>
						</div>
						<button
							type="button"
							onClick={onCancelRoute}
							aria-label="Back to search and suggestions"
							className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition-colors cursor-pointer shrink-0"
						>
							<X size={18} />
						</button>
					</div>

					{/* Apple Maps Big ETA Hero Card */}
					<div className="bg-[#F8F9FA] rounded-2xl p-4 border border-neutral-200/60 flex items-center justify-between">
						<div>
							<div className="flex items-baseline gap-2">
								<span className="text-[34px] leading-none font-black text-[#111111] tracking-tight">
									{routeMetrics.duration}
								</span>
								<span className="text-[18px] font-bold text-neutral-600">
									min
								</span>
							</div>
							<div className="text-[13px] text-neutral-500 font-semibold mt-1">
								{routeMetrics.miles} mi · Arrive by {routeMetrics.arrivalTimeStr}
							</div>
							<div className="text-[11.5px] font-bold text-emerald-600 mt-0.5">
								Fastest route · Typical traffic
							</div>
						</div>

						{/* Big Green Apple Maps GO Button */}
						<button
							type="button"
							onClick={onStartNavigation}
							className="h-14 px-6 rounded-2xl bg-[#34C759] hover:bg-[#2DB84F] active:scale-95 text-white font-black text-[17px] flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
						>
							<Navigation size={22} className="fill-white" />
							<span>GO</span>
						</button>
					</div>

					{/* ImCheap Financial Insight Card */}
					<div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/60 flex flex-col gap-2.5">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
								Commute Expense & Work Hours
							</span>
							<span className="text-[12px] font-bold text-emerald-700">
								${mileageRate}/mi IRS rate
							</span>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<div className="text-[20px] font-extrabold text-[#111111]">
									${routeMetrics.tripCost.toFixed(2)}
								</div>
								<div className="text-[12px] text-neutral-600 font-medium">
									Est. driving cost (fuel & wear)
								</div>
							</div>
							<div className="text-right">
								<div className="text-[20px] font-extrabold text-emerald-700">
									{routeMetrics.laborMinutes} min
								</div>
								<div className="text-[12px] text-neutral-600 font-medium">
									Of your work time @ ${hourlyWage}/hr
								</div>
							</div>
						</div>
						{selectedDestination.dealBadge && (
							<div className="pt-2 border-t border-emerald-200/50 flex items-center gap-2 text-[12px] font-semibold text-emerald-800">
								<Tag size={14} />
								<span>Special: {selectedDestination.dealBadge}</span>
							</div>
						)}
					</div>

					{/* Turn-by-Turn Steps Accordion */}
					<div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
						<button
							type="button"
							onClick={() => setShowSteps(!showSteps)}
							className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<Car size={18} className="text-[#007AFF]" />
								<span className="text-[14px] font-bold text-[#111111]">
									Turn-by-turn directions ({activeRoute.steps.length} steps)
								</span>
							</div>
							{showSteps ? (
								<ChevronUp size={18} className="text-neutral-500" />
							) : (
								<ChevronDown size={18} className="text-neutral-500" />
							)}
						</button>

						<AnimatePresence>
							{showSteps && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									className="border-t border-neutral-100 divide-y divide-neutral-100 px-4 py-2"
								>
									{activeRoute.steps.map((step, idx) => (
										<div key={idx} className="py-2.5 flex items-start gap-3">
											<div className="w-7 h-7 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
												{step.maneuverModifier?.includes('left') ? (
													<CornerUpLeft size={15} />
												) : step.maneuverModifier?.includes('right') ? (
													<CornerUpRight size={15} />
												) : (
													<ArrowUp size={15} />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<div className="text-[13px] font-bold text-[#111111] leading-snug">
													{step.instruction}
												</div>
												<div className="text-[11.5px] text-neutral-500 font-medium mt-0.5">
													{step.distanceMiles} mi · {step.street}
												</div>
											</div>
										</div>
									))}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			) : (
				// Standard Apple Maps Action Dock Content
				<div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8 flex flex-col gap-4">
					{/* Search Bar & Close Button Header */}
					<div className="flex items-center gap-2.5 pt-0.5">
						<div className="flex-1 h-11 bg-neutral-100/90 rounded-2xl px-3 flex items-center gap-2.5 border border-transparent focus-within:border-[#007AFF]/40 focus-within:bg-white transition-all shadow-xs">
							<Search size={17} className="text-neutral-400 shrink-0" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search Maps, addresses, deals..."
								className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#111111] font-medium placeholder:text-neutral-400 focus:outline-none focus:ring-0"
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
						<button
							type="button"
							onClick={onClose}
							className="h-11 px-3.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-[#111111] font-bold text-[13px] transition-colors cursor-pointer shrink-0"
						>
							Done
						</button>
					</div>

					{/* Live Search Address Results */}
					{searchQuery.trim().length >= 3 && (
						<div className="bg-white rounded-2xl border border-neutral-200/80 shadow-md overflow-hidden">
							<div className="px-3.5 py-2 bg-neutral-50 border-b border-neutral-100 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
								Search Results {isSearching && '...'}
							</div>
							{searchResults.length === 0 && !isSearching ? (
								<div className="p-4 text-center text-[13px] text-neutral-500 font-medium">
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
													onSelectDestination({
														name: res.label.split(',')[0],
														address: res.label,
														coord: {
															lat: res.lat,
															lng: res.lng,
														},
													})
												}
												className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-blue-50/50 transition-colors cursor-pointer"
											>
												<div className="flex items-center gap-2.5 min-w-0 pr-2">
													<div className="w-8 h-8 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0">
														<MapPin size={16} />
													</div>
													<div className="min-w-0">
														<div className="text-[13.5px] font-bold text-[#111111] truncate">
															{res.label.split(',')[0]}
														</div>
														<div className="text-[11.5px] text-neutral-500 truncate">
															{res.label}
														</div>
													</div>
												</div>
												<div className="text-right shrink-0">
													<div className="text-[13px] font-black text-[#007AFF]">
														{metrics.miles} mi
													</div>
													<div className="text-[11px] text-neutral-500 font-medium">
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

					{/* Category Filter Pills */}
					<div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
						{[
							{ id: 'all', label: 'All', icon: Sparkles },
							{ id: 'gas', label: 'Gas Deals', icon: Fuel },
							{ id: 'grocery', label: 'Groceries', icon: ShoppingBag },
							{ id: 'food', label: 'Dining', icon: Utensils },
							{ id: 'coffee', label: 'Coffee', icon: Coffee },
						].map((cat) => {
							const IconComponent = cat.icon;
							const isSelected = selectedCategory === cat.id;
							return (
								<button
									key={cat.id}
									type="button"
									onClick={() =>
										setSelectedCategory(
											cat.id as
												| 'all'
												| 'gas'
												| 'food'
												| 'grocery'
												| 'coffee',
										)
									}
									className={`h-9 px-3.5 rounded-full text-[12.5px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
										isSelected
											? 'bg-[#111111] text-white shadow-xs'
											: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
									}`}
								>
									<IconComponent size={14} />
									<span>{cat.label}</span>
								</button>
							);
						})}
					</div>

					{/* Section 1: Locations to Navigate to */}
					<section className="flex flex-col gap-2">
						<div className="flex items-center justify-between px-1">
							<span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
								Locations to Navigate to
							</span>
							<span className="text-[11px] font-semibold text-neutral-400">
								{enrichedLocations.length} destinations
							</span>
						</div>

						<div className="bg-white rounded-2xl border border-neutral-200/70 shadow-xs divide-y divide-neutral-100 overflow-hidden">
							{enrichedLocations.map((loc) => (
								<div
									key={loc.id}
									className="px-3.5 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
								>
									<div className="flex items-center gap-3 min-w-0 pr-2">
										<div className="w-9 h-9 rounded-xl bg-neutral-100 text-[#111111] flex items-center justify-center shrink-0 shadow-xs font-bold">
											{loc.isHome ? (
												<MapPin size={18} className="text-emerald-600" />
											) : (
												<Navigation size={18} className="text-[#007AFF]" />
											)}
										</div>
										<div className="min-w-0">
											<div className="text-[14px] font-bold text-[#111111] truncate">
												{loc.name}
											</div>
											<div className="text-[11.5px] text-neutral-500 truncate">
												{loc.miles} mi · {loc.driveMinutes} min · ${loc.tripCost.toFixed(2)} cost
											</div>
										</div>
									</div>

									<button
										type="button"
										onClick={() =>
											onSelectDestination({
												name: loc.name,
												address: loc.address,
												coord: { lat: loc.lat, lng: loc.lng },
											})
										}
										className="h-8 px-3 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white font-bold text-[12px] flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer"
									>
										<span>Directions</span>
										<ArrowRight size={13} />
									</button>
								</div>
							))}
						</div>
					</section>

					{/* Section 2: Suggestions and Deals Nearby */}
					<section className="flex flex-col gap-2">
						<div className="flex items-center justify-between px-1">
							<div className="flex items-center gap-1.5">
								<Tag size={13} className="text-emerald-600" />
								<span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
									Suggestions & Deals Nearby
								</span>
							</div>
							<span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
								ImCheap Picks
							</span>
						</div>

						<div className="flex flex-col gap-2.5">
							{filteredDeals.map((deal) => (
								<div
									key={deal.id}
									className="bg-white rounded-2xl p-3.5 border border-neutral-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col gap-2"
								>
									<div className="flex items-start justify-between gap-2">
										<div>
											<div className="flex items-center gap-2">
												<h3 className="text-[14.5px] font-extrabold text-[#111111] leading-tight">
													{deal.title}
												</h3>
												<span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10.5px] border border-emerald-200/60">
													{deal.dealBadge}
												</span>
											</div>
											<p className="text-[12px] text-neutral-600 font-medium mt-1 leading-snug">
												{deal.description}
											</p>
										</div>

										<button
											type="button"
											onClick={() =>
												onSelectDestination({
													name: deal.title,
													address: deal.address,
													coord: deal.coord,
													category: deal.category,
													dealBadge: deal.dealBadge,
												})
											}
											className="h-9 px-3.5 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white font-bold text-[12.5px] flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer shadow-xs"
										>
											<Navigation size={14} />
											<span>Route</span>
										</button>
									</div>

									{/* Commute and Savings Comparison Bar */}
									<div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11.5px] text-neutral-500 font-medium">
										<div>
											{deal.miles} mi away · ~{deal.driveMinutes} min drive (${deal.tripCost.toFixed(2)} commute)
										</div>
										<div className="font-bold text-emerald-700">
											Net +${deal.netSavings.toFixed(2)} savings
										</div>
									</div>
								</div>
							))}
						</div>
					</section>
				</div>
			)}
		</motion.div>
	);
};
