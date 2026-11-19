import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedLocation, Coordinate } from '../types/maps';
import { searchAddresses } from '../utils/mapRouting';
import { IconPickerDrawer } from './IconPickerDrawer';
import { LucideIcon } from './LucideIcon';
import {
	X,
	Pencil,
	Search,
	RotateCw,
	LocateFixed,
	MapPin,
	ChevronDown,
	ChevronUp,
	Check,
} from 'lucide-react';

interface LocationActionDockProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (location: SavedLocation) => void;
	initialLocation?: SavedLocation | null;
	currentGps?: Coordinate;
	onPreviewRadiusChange?: (preview: { lat: number; lng: number; radius: number } | null) => void;
}

export const LocationActionDock: React.FC<LocationActionDockProps> = ({
	isOpen,
	onClose,
	onSave,
	initialLocation,
	currentGps,
	onPreviewRadiusChange,
}) => {
	const [name, setName] = useState('');
	const [address, setAddress] = useState('');
	const [lat, setLat] = useState<number>(39.7032);
	const [lng, setLng] = useState<number>(-75.122);
	const [icon, setIcon] = useState('pin_drop');
	const [radius, setRadius] = useState<number>(150);
	const [isVisibleOnMap, setIsVisibleOnMap] = useState(true);
	const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
	const [isSearchingGps, setIsSearchingGps] = useState(false);
	const [isSearchingAddress, setIsSearchingAddress] = useState(false);
	const [addressResults, setAddressResults] = useState<
		Array<{ label: string; lat: number; lng: number }>
	>([]);
	const [showAdvancedCoords, setShowAdvancedCoords] = useState(false);
	const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (isOpen) {
			setAddressResults([]);
			setShowAdvancedCoords(false);
			if (initialLocation) {
				setName(initialLocation.name);
				setAddress(initialLocation.address);
				setLat(initialLocation.lat);
				setLng(initialLocation.lng);
				setIcon(initialLocation.icon || (initialLocation.isHome ? 'home' : 'pin_drop'));
				setRadius(initialLocation.radius || 150);
				setIsVisibleOnMap(initialLocation.isVisibleOnMap !== false);
			} else {
				setName('');
				if (currentGps) {
					setLat(currentGps.lat);
					setLng(currentGps.lng);
					setAddress('');
				} else {
					setLat(39.7032);
					setLng(-75.122);
					setAddress('');
				}
				setIcon('pin_drop');
				setRadius(150);
				setIsVisibleOnMap(true);
			}
		} else {
			onPreviewRadiusChange?.(null);
		}
	}, [isOpen, initialLocation, currentGps, onPreviewRadiusChange]);

	// Keep parent map notified of live marker coordinates and radius changes
	useEffect(() => {
		if (isOpen) {
			onPreviewRadiusChange?.({ lat, lng, radius });
		} else {
			onPreviewRadiusChange?.(null);
		}
	}, [isOpen, lat, lng, radius, onPreviewRadiusChange]);

	const handleAddressChange = (val: string) => {
		setAddress(val);
		if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
		if (!val.trim() || val.length < 3) {
			setAddressResults([]);
			setIsSearchingAddress(false);
			return;
		}

		setIsSearchingAddress(true);
		searchTimeoutRef.current = setTimeout(async () => {
			const res = await searchAddresses(val);
			setAddressResults(res);
			setIsSearchingAddress(false);
		}, 400);
	};

	const handleSelectAddressResult = (item: { label: string; lat: number; lng: number }) => {
		setAddress(item.label);
		setLat(item.lat);
		setLng(item.lng);
		setAddressResults([]);
	};

	const handleUseCurrentGps = () => {
		if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
		setIsSearchingGps(true);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setIsSearchingGps(false);
				const newLat = pos.coords.latitude;
				const newLng = pos.coords.longitude;
				setLat(newLat);
				setLng(newLng);
				setAddress(`${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
				setAddressResults([]);
			},
			() => {
				setIsSearchingGps(false);
			},
			{ enableHighAccuracy: true, timeout: 8000 },
		);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedName = name.trim() || (initialLocation?.isHome ? 'Home' : 'Saved Location');
		const locationToSave: SavedLocation = {
			id: initialLocation?.id || `loc_${Date.now()}`,
			name: trimmedName,
			address: address.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
			lat,
			lng,
			icon,
			radius,
			isHome: initialLocation?.isHome || false,
			isVisibleOnMap,
			createdAt: initialLocation?.createdAt || new Date().toISOString(),
		};
		onSave(locationToSave);
		onClose();
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div
					className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none"
					role="dialog"
					aria-modal="true"
					aria-label={initialLocation ? 'Edit Location' : 'New Marker'}
				>
					{/* Modal Bottom Sheet presentation matching dashboard dock - no dimmed scrim */}
					<motion.div
						drag="y"
						dragConstraints={{ top: 0, bottom: 0 }}
						dragElastic={{ top: 0, bottom: 0.6 }}
						dragSnapToOrigin
						onDragEnd={(_, info) => {
							if (info.offset.y > 60 || info.velocity.y > 100) {
								onClose();
							}
						}}
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={{
							type: 'spring',
							damping: 28,
							stiffness: 320,
						}}
						className="relative z-50 w-full max-w-120 mx-auto bg-white rounded-t-[28px] shadow-2xl flex flex-col max-h-[75vh] overflow-hidden select-none pb-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-auto border-t border-neutral-100"
					>
						{/* Top Pill Grab Handle */}
						<div
							onClick={onClose}
							className="w-full pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing focus:outline-none"
							role="button"
							tabIndex={0}
							aria-label="Drag down to close"
						>
							<div className="w-9 h-[4px] bg-[#E5E7EB] rounded-full" />
						</div>

						<div className="px-6 pt-1 pb-4 flex items-center justify-between">
							<h2 className="text-[20px] font-black text-[#111111] tracking-tight font-sans">
								{initialLocation ? (initialLocation.isHome ? 'Edit Home Location' : 'Edit Location') : 'New Marker'}
							</h2>
							<button
								type="button"
								onClick={onClose}
								className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 cursor-pointer transition-colors"
							>
								<X size={18} />
							</button>
						</div>

						<div className="px-6 flex-1 overflow-y-auto no-scrollbar pb-6">
							<form onSubmit={handleSubmit} className="flex flex-col gap-4">
								{/* Icon & Name Row */}
								<div className="flex items-center gap-3">
									<div className="relative">
										<button
											type="button"
											onClick={() => setIsIconPickerOpen(true)}
											className="w-14 h-14 rounded-2xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80 flex items-center justify-center text-[#111111] shadow-xs cursor-pointer transition-all shrink-0 active:scale-95 group"
											title="Change marker icon"
										>
											<LucideIcon
												name={icon || 'pin_drop'}
												size={26}
											/>
										</button>
										{/* Visual Affordance Badge */}
										<span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center shadow-xs pointer-events-none border border-white">
											<Pencil size={10} />
										</span>
									</div>

									<div className="flex-1 flex flex-col gap-1">
										<label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider px-0.5">
											Location Name
										</label>
										<input
											type="text"
											value={name}
											onChange={(e) => setName(e.target.value)}
											placeholder={initialLocation?.isHome ? 'Home' : 'e.g. Work, Gym, Market'}
											required={!initialLocation?.isHome}
											className="w-full h-12 px-4 rounded-xl bg-neutral-50 border border-neutral-200 text-[15px] font-bold text-[#111111] focus:outline-none focus:border-black"
										/>
									</div>
								</div>

								{/* Address / Location Search */}
								<div className="relative flex flex-col gap-1.5">
									<label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider px-0.5">
										Address or Location
									</label>
									<div className="flex items-center gap-2">
										<div className="relative flex-1">
											<input
												type="text"
												value={address}
												onChange={(e) => handleAddressChange(e.target.value)}
												placeholder="Search address or enter place"
												className="w-full h-12 pl-4 pr-9 rounded-xl bg-neutral-50 border border-neutral-200 text-[14px] text-[#111111] focus:outline-none focus:border-black"
											/>
											{isSearchingAddress && (
												<div className="absolute right-3 top-1/2 -translate-y-1/2">
													<RotateCw size={16} className="text-neutral-400 animate-spin" />
												</div>
											)}
										</div>
										<button
											type="button"
											onClick={handleUseCurrentGps}
											disabled={isSearchingGps}
											title="Use current GPS"
											className="h-12 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 font-semibold text-[13px] flex items-center gap-1.5 cursor-pointer shrink-0"
										>
											{isSearchingGps ? (
												<RotateCw size={16} className="animate-spin" />
											) : (
												<LocateFixed size={16} />
											)}
											<span className="hidden sm:inline">Current GPS</span>
										</button>
									</div>

									{/* Autocomplete Dropdown */}
									{addressResults.length > 0 && (
										<div className="absolute top-[72px] left-0 right-0 z-20 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
											{addressResults.map((item, idx) => (
												<button
													key={idx}
													type="button"
													onClick={() => handleSelectAddressResult(item)}
													className="w-full text-left px-3.5 py-2.5 text-[13px] text-neutral-800 hover:bg-neutral-100 border-b border-gray-100 last:border-b-0 flex items-start gap-2 cursor-pointer transition-colors"
												>
													<MapPin size={16} className="text-neutral-400 mt-0.5 shrink-0" />
													<span className="line-clamp-2 leading-snug">{item.label}</span>
												</button>
											))}
										</div>
									)}
								</div>

								{/* Advanced Coordinates Accordion */}
								<div className="flex flex-col rounded-2xl border border-neutral-200/80 bg-neutral-50/70 overflow-hidden">
									<button
										type="button"
										onClick={() => setShowAdvancedCoords(!showAdvancedCoords)}
										className="w-full px-4 py-2.5 flex items-center justify-between text-neutral-600 hover:text-black cursor-pointer transition-colors"
									>
										<span className="text-[12px] font-bold uppercase tracking-wider">
											Advanced Coordinates
										</span>
										{showAdvancedCoords ? (
											<ChevronUp size={18} />
										) : (
											<ChevronDown size={18} />
										)}
									</button>

									{showAdvancedCoords && (
										<div className="px-4 pb-3 pt-1 grid grid-cols-2 gap-3 border-t border-neutral-200/60">
											<div className="flex flex-col gap-1">
												<label className="text-[11px] font-semibold text-neutral-400 px-0.5">
													Latitude
												</label>
												<input
													type="number"
													step="any"
													value={lat}
													onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
													className="h-10 px-3 rounded-xl bg-white border border-neutral-200 text-[13px] font-mono text-neutral-700 focus:outline-none focus:border-black"
												/>
											</div>
											<div className="flex flex-col gap-1">
												<label className="text-[11px] font-semibold text-neutral-400 px-0.5">
													Longitude
												</label>
												<input
													type="number"
													step="any"
													value={lng}
													onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
													className="h-10 px-3 rounded-xl bg-white border border-neutral-200 text-[13px] font-mono text-neutral-700 focus:outline-none focus:border-black"
												/>
											</div>
										</div>
									)}
								</div>

								{/* Radius Slider Input */}
								<div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70 mt-1">
									<div className="flex items-center justify-between">
										<div className="flex flex-col">
											<span className="text-[14px] font-bold text-[#111111]">
												Marker Radius
											</span>
											<span className="text-[12px] text-neutral-500 font-medium">
												Geofence zone for detecting arrivals
											</span>
										</div>
										<span className="text-[14px] font-bold font-mono tabular-nums text-[#059669] bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
											{radius}m
										</span>
									</div>
									<input
										type="range"
										min="50"
										max="1000"
										step="10"
										value={radius}
										onChange={(e) => setRadius(parseInt(e.target.value, 10) || 150)}
										className="w-full custom-slider cursor-pointer my-1"
									/>
									<div className="flex justify-between text-[11px] font-medium text-neutral-400 px-0.5">
										<span>50m (single spot)</span>
										<span>500m</span>
										<span>1000m (campus)</span>
									</div>
								</div>

								{/* Submit Button */}
								<button
									type="submit"
									className="w-full h-13 mt-3 rounded-2xl bg-[#111111] hover:bg-neutral-900 active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
								>
									<Check size={18} />
									<span>{initialLocation ? 'Save Changes' : 'Create Marker'}</span>
								</button>
							</form>
						</div>
					</motion.div>

					{/* Pull-out Icon Picker Drawer */}
					<IconPickerDrawer
						isOpen={isIconPickerOpen}
						onClose={() => setIsIconPickerOpen(false)}
						selectedIcon={icon}
						onSelectIcon={(item) => {
							setIcon(item.icon);
							setIsIconPickerOpen(false);
						}}
					/>
				</div>
			)}
		</AnimatePresence>
	);
};
