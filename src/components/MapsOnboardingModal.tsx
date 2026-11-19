import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedLocation, Coordinate } from '../types/maps';
import { reverseGeocode, searchAddresses } from '../utils/mapRouting';
import { IconPickerDrawer } from './IconPickerDrawer';
import { LucideIcon } from './LucideIcon';
import {
	LocateFixed,
	RotateCw,
	Search,
	MapPin,
	Home,
	ArrowRight,
	ArrowLeft,
	Check,
	Plus,
	X,
} from 'lucide-react';

interface MapsOnboardingModalProps {
	isOpen: boolean;
	onClose: () => void;
	onComplete: (homeLocation: SavedLocation, additionalLocations: SavedLocation[]) => void;
	initialCoords?: Coordinate;
}

const COMMON_PRESET_TEMPLATES = [
	{ name: 'Work', icon: 'work' },
	{ name: 'Gym', icon: 'fitness_center' },
	{ name: 'Grocery Store', icon: 'local_grocery_store' },
	{ name: 'School', icon: 'school' },
];

export const MapsOnboardingModal: React.FC<MapsOnboardingModalProps> = ({
	isOpen,
	onClose,
	onComplete,
	initialCoords,
}) => {
	const [step, setStep] = useState<1 | 2>(1);

	// Step 1: Home Address State
	const [homeAddressText, setHomeAddressText] = useState('');
	const [homeCoords, setHomeCoords] = useState<Coordinate | null>(() => {
		if (initialCoords?.lat && initialCoords?.lng) {
			return initialCoords;
		}
		return null;
	});
	const [isLocatingHome, setIsLocatingHome] = useState(false);
	const [isSearchingAddress, setIsSearchingAddress] = useState(false);
	const [addressResults, setAddressResults] = useState<
		Array<{ label: string; lat: number; lng: number }>
	>([]);
	const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Step 2: Additional Destinations State
	const [addedPlaces, setAddedPlaces] = useState<SavedLocation[]>([]);
	const [activeAddingPreset, setActiveAddingPreset] = useState<{
		name: string;
		icon: string;
	} | null>(null);
	const [placeAddressText, setPlaceAddressText] = useState('');
	const [placeCoords, setPlaceCoords] = useState<Coordinate | null>(null);
	const [isLocatingPlace, setIsLocatingPlace] = useState(false);
	const [placeAddressResults, setPlaceAddressResults] = useState<
		Array<{ label: string; lat: number; lng: number }>
	>([]);
	const placeSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Custom Icon Picker for extra places
	const [isCustomIconPickerOpen, setIsCustomIconPickerOpen] = useState(false);
	const [customPlaceName, setCustomPlaceName] = useState('');
	const [customPlaceIcon, setCustomPlaceIcon] = useState('pin_drop');

	// Step 1: Handle typing address
	const handleHomeAddressChange = (val: string) => {
		setHomeAddressText(val);
		if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
		if (val.trim().length >= 3) {
			setIsSearchingAddress(true);
			searchTimeoutRef.current = setTimeout(async () => {
				const res = await searchAddresses(val);
				setAddressResults(res);
				setIsSearchingAddress(false);
			}, 380);
		} else {
			setAddressResults([]);
			setIsSearchingAddress(false);
		}
	};

	// Step 1: Select search result
	const handleSelectHomeResult = (item: { label: string; lat: number; lng: number }) => {
		setHomeAddressText(item.label);
		setHomeCoords({ lat: item.lat, lng: item.lng });
		setAddressResults([]);
	};

	// Step 1: Use Current GPS
	const handleUseCurrentGpsForHome = () => {
		if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
		setIsLocatingHome(true);
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				const coords = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				};
				setHomeCoords(coords);
				try {
					const addr = await reverseGeocode(coords);
					setHomeAddressText(addr);
				} catch {
					setHomeAddressText(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
				}
				setIsLocatingHome(false);
			},
			() => {
				setIsLocatingHome(false);
			},
			{ enableHighAccuracy: true, timeout: 8000 },
		);
	};

	// Step 2: Handle place address typing
	const handlePlaceAddressChange = (val: string) => {
		setPlaceAddressText(val);
		if (placeSearchTimeoutRef.current) clearTimeout(placeSearchTimeoutRef.current);
		if (val.trim().length >= 3) {
			placeSearchTimeoutRef.current = setTimeout(async () => {
				const res = await searchAddresses(val);
				setPlaceAddressResults(res);
			}, 380);
		} else {
			setPlaceAddressResults([]);
		}
	};

	const handleSelectPlaceResult = (item: { label: string; lat: number; lng: number }) => {
		setPlaceAddressText(item.label);
		setPlaceCoords({ lat: item.lat, lng: item.lng });
		setPlaceAddressResults([]);
	};

	const handleUseCurrentGpsForPlace = () => {
		if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
		setIsLocatingPlace(true);
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				const coords = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				};
				setPlaceCoords(coords);
				try {
					const addr = await reverseGeocode(coords);
					setPlaceAddressText(addr);
				} catch {
					setPlaceAddressText(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
				}
				setIsLocatingPlace(false);
			},
			() => {
				setIsLocatingPlace(false);
			},
			{ enableHighAccuracy: true, timeout: 8000 },
		);
	};

	const handleConfirmPlace = () => {
		if (!activeAddingPreset) return;
		const name = activeAddingPreset.name;
		const icon = activeAddingPreset.icon;
		const finalCoord = placeCoords || homeCoords || { lat: 39.7032, lng: -75.122 };
		const finalAddr = placeAddressText.trim() || `${finalCoord.lat.toFixed(4)}, ${finalCoord.lng.toFixed(4)}`;

		const newLoc: SavedLocation = {
			id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
			name,
			address: finalAddr,
			lat: finalCoord.lat,
			lng: finalCoord.lng,
			icon,
			isHome: false,
			isVisibleOnMap: true,
		};

		setAddedPlaces((prev) => [...prev, newLoc]);
		setActiveAddingPreset(null);
		setPlaceAddressText('');
		setPlaceCoords(null);
		setPlaceAddressResults([]);
	};

	const handleRemovePlace = (id: string) => {
		setAddedPlaces((prev) => prev.filter((p) => p.id !== id));
	};

	// Complete Onboarding Flow
	const handleFinishOnboarding = () => {
		const finalHomeCoord = homeCoords || initialCoords || { lat: 39.7032, lng: -75.122 };
		const finalHomeAddr = homeAddressText.trim() || 'Home';

		const homeLocation: SavedLocation = {
			id: 'home_permanent',
			name: 'Home',
			address: finalHomeAddr,
			lat: finalHomeCoord.lat,
			lng: finalHomeCoord.lng,
			icon: 'home',
			isHome: true,
			isVisibleOnMap: true,
		};

		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('imcheap_maps_onboarding_completed', 'true');
			} catch {}
		}

		onComplete(homeLocation, addedPlaces);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
				{/* Dark Backdrop */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				/>

				{/* Modal Container */}
				<motion.div
					initial={{ y: '100%', opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: '100%', opacity: 0 }}
					transition={{ type: 'spring', damping: 28, stiffness: 300 }}
					className="relative w-full max-w-120 bg-white rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col"
				>
					{/* Top Header & Step Indicator */}
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<span className="w-6 h-6 rounded-full bg-[#111111] text-white text-[12px] font-bold flex items-center justify-center">
								{step}
							</span>
							<span className="text-[12px] font-bold uppercase tracking-wider text-neutral-400">
								{step === 1 ? 'Step 1 of 2: Home Base' : 'Step 2 of 2: Destinations'}
							</span>
						</div>

						{step === 2 && (
							<button
								type="button"
								onClick={handleFinishOnboarding}
								className="text-[13px] font-bold text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
							>
								Skip
							</button>
						)}
					</div>

					{step === 1 ? (
						/* STEP 1: SET HOME BASE */
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-1">
								<h2 className="text-[24px] font-black text-[#111111] tracking-tight">
									Where is your Home?
								</h2>
								<p className="text-[13px] text-neutral-500 font-medium leading-relaxed">
									ImCheap anchors your drives at home so your commute miles, fuel costs, and working hours are tracked automatically.
								</p>
							</div>

							{/* GPS Button */}
							<button
								type="button"
								onClick={handleUseCurrentGpsForHome}
								disabled={isLocatingHome}
								className="w-full h-13 rounded-2xl bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] font-bold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer border border-[#A7F3D0]/60 active:scale-[0.99]"
							>
								{isLocatingHome ? (
									<RotateCw size={20} className="animate-spin" />
								) : (
									<LocateFixed size={20} />
								)}
								<span>
									{isLocatingHome
										? 'Detecting your GPS position...'
										: 'Use My Current Location'}
								</span>
							</button>

							{/* Divider */}
							<div className="flex items-center gap-3">
								<div className="flex-1 h-px bg-gray-200" />
								<span className="text-[11px] font-bold uppercase text-neutral-400">
									or enter address
								</span>
								<div className="flex-1 h-px bg-gray-200" />
							</div>

							{/* Address Search Input */}
							<div className="relative flex flex-col gap-1">
								<div className="relative flex items-center">
									<input
										type="text"
										value={homeAddressText}
										onChange={(e) => handleHomeAddressChange(e.target.value)}
										placeholder="e.g. 123 Main St, Philadelphia, PA"
										className="w-full h-12 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200 text-[14px] font-medium text-[#111111] focus:outline-none focus:border-black"
									/>
									<Search size={18} className="absolute left-3 text-neutral-400" />
									{isSearchingAddress && (
										<RotateCw size={18} className="absolute right-3 text-neutral-400 animate-spin" />
									)}
								</div>

								{/* Autocomplete Results Dropdown */}
								{addressResults.length > 0 && (
									<div className="absolute top-13 inset-x-0 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-30 max-h-48 overflow-y-auto divide-y divide-neutral-100">
										{addressResults.map((item, idx) => (
											<button
												key={idx}
												type="button"
												onClick={() => handleSelectHomeResult(item)}
												className="w-full text-left p-3 hover:bg-neutral-50 transition-colors text-[13px] text-[#111111] font-medium flex items-start gap-2 cursor-pointer"
											>
												<MapPin size={16} className="text-neutral-400 shrink-0 mt-0.5" />
												<span className="truncate">{item.label}</span>
											</button>
										))}
									</div>
								)}
							</div>

							{/* Selected Home Coordinate Preview */}
							{homeCoords && (
								<div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-3">
									<div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#059669] shrink-0 border border-neutral-200/50">
										<Home size={20} />
									</div>
									<div className="flex flex-col min-w-0 flex-1">
										<span className="text-[13px] font-bold text-[#111111] truncate">
											{homeAddressText || 'Home Coordinate Selected'}
										</span>
										<span className="text-[11px] font-mono text-neutral-400">
											{homeCoords.lat.toFixed(4)}, {homeCoords.lng.toFixed(4)}
										</span>
									</div>
								</div>
							)}

							{/* Step 1 Next Button */}
							<button
								type="button"
								onClick={() => setStep(2)}
								disabled={!homeCoords && !homeAddressText.trim()}
								className="w-full h-13 mt-2 rounded-2xl bg-[#111111] hover:bg-neutral-900 active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-40"
							>
								<span>Set Home &amp; Continue</span>
								<ArrowRight size={18} />
							</button>
						</div>
					) : (
						/* STEP 2: ADD COMMON DESTINATIONS */
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-1">
								<h2 className="text-[24px] font-black text-[#111111] tracking-tight">
									Add Frequent Places
								</h2>
								<p className="text-[13px] text-neutral-500 font-medium leading-relaxed">
									Optionally add your work, gym, or grocery store. You can always manage these later from the Locations button on the map.
								</p>
							</div>

							{/* Template Preset Chips */}
							<div className="flex flex-wrap gap-2">
								{COMMON_PRESET_TEMPLATES.map((tmpl) => {
									const isAlreadyAdded = addedPlaces.some((p) => p.name === tmpl.name);
									const isCurrentlyActive = activeAddingPreset?.name === tmpl.name;
									return (
										<button
											key={tmpl.name}
											type="button"
											onClick={() => {
												if (isCurrentlyActive) {
													setActiveAddingPreset(null);
												} else {
													setActiveAddingPreset(tmpl);
													setPlaceAddressText('');
													setPlaceCoords(null);
												}
											}}
											className={`px-3 py-2 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
												isCurrentlyActive
													? 'bg-[#111111] text-white shadow-xs'
													: isAlreadyAdded
														? 'bg-neutral-100 text-neutral-400 opacity-60'
														: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
											}`}
										>
											<LucideIcon name={tmpl.icon} size={16} />
											<span>{tmpl.name}</span>
											{isAlreadyAdded && (
												<Check size={14} className="text-emerald-600" />
											)}
										</button>
									);
								})}

								{/* Custom Place Chip */}
								<button
									type="button"
									onClick={() => {
										setActiveAddingPreset({ name: 'Custom Place', icon: 'pin_drop' });
										setPlaceAddressText('');
										setPlaceCoords(null);
									}}
									className="px-3 py-2 rounded-xl text-[13px] font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 flex items-center gap-1.5 transition-all cursor-pointer"
								>
									<Plus size={16} />
									<span>Custom Place</span>
								</button>
							</div>

							{/* Active Adding Card Form */}
							{activeAddingPreset && (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/90 flex flex-col gap-3"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<LucideIcon name={activeAddingPreset.icon} size={20} className="text-[#111111]" />
											<span className="text-[14px] font-bold text-[#111111]">
												Add {activeAddingPreset.name}
											</span>
										</div>
										<button
											type="button"
											onClick={() => setActiveAddingPreset(null)}
											className="text-neutral-400 hover:text-neutral-700 text-[12px] font-bold"
										>
											Cancel
										</button>
									</div>

									{/* Address Search */}
									<div className="relative">
										<input
											type="text"
											value={placeAddressText}
											onChange={(e) => handlePlaceAddressChange(e.target.value)}
											placeholder={`Address or city for ${activeAddingPreset.name}`}
											className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200 text-[13px] text-[#111111] focus:outline-none focus:border-black"
										/>
										{placeAddressResults.length > 0 && (
											<div className="absolute top-12 inset-x-0 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden z-30 max-h-40 overflow-y-auto divide-y divide-neutral-100">
												{placeAddressResults.map((item, idx) => (
													<button
														key={idx}
														type="button"
														onClick={() => handleSelectPlaceResult(item)}
														className="w-full text-left p-2.5 hover:bg-neutral-50 text-[12px] text-[#111111] font-medium flex items-center gap-2"
													>
														<MapPin size={15} className="text-neutral-400" />
														<span className="truncate">{item.label}</span>
													</button>
												))}
											</div>
										)}
									</div>

									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={handleUseCurrentGpsForPlace}
											disabled={isLocatingPlace}
											className="flex-1 h-9 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-bold text-[12px] flex items-center justify-center gap-1 cursor-pointer"
										>
											<LocateFixed size={16} />
											<span>Current GPS</span>
										</button>

										<button
											type="button"
											onClick={handleConfirmPlace}
											disabled={!placeCoords && !placeAddressText.trim()}
											className="flex-1 h-9 rounded-xl bg-[#111111] hover:bg-neutral-900 text-white font-bold text-[12px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
										>
											<span>Save Place</span>
										</button>
									</div>
								</motion.div>
							)}

							{/* Added Places Preview List */}
							{addedPlaces.length > 0 && (
								<div className="flex flex-col gap-1.5">
									<span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
										Added Destinations ({addedPlaces.length})
									</span>
									<div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
										{addedPlaces.map((p) => (
											<div
												key={p.id}
												className="p-2.5 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-between"
											>
												<div className="flex items-center gap-2.5 min-w-0 pr-2">
													<div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-[#111111] shrink-0">
														<LucideIcon name={p.icon} size={17} />
													</div>
													<div className="flex flex-col min-w-0">
														<span className="text-[13px] font-bold text-[#111111] truncate">
															{p.name}
														</span>
														<span className="text-[11px] text-neutral-400 truncate">
															{p.address}
														</span>
													</div>
												</div>
												<button
													type="button"
													onClick={() => handleRemovePlace(p.id)}
													className="text-neutral-400 hover:text-red-600 p-1 cursor-pointer"
												>
													<X size={18} />
												</button>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Step 2 Finish Button */}
							<div className="flex items-center gap-2 mt-2">
								<button
									type="button"
									onClick={() => setStep(1)}
									className="h-13 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-[14px] flex items-center justify-center gap-1 cursor-pointer"
								>
									<ArrowLeft size={18} />
									<span>Back</span>
								</button>

								<button
									type="button"
									onClick={handleFinishOnboarding}
									className="flex-1 h-13 rounded-2xl bg-[#111111] hover:bg-neutral-900 active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
								>
									<span>Done &amp; Open Maps</span>
									<Check size={18} />
								</button>
							</div>
						</div>
					)}
				</motion.div>
			</div>
		</AnimatePresence>
	);
};
