import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedLocation, Coordinate } from '../types/maps';
import { IconPickerDrawer } from './IconPickerDrawer';

interface LocationActionDockProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (location: SavedLocation) => void;
	initialLocation?: SavedLocation | null;
	currentGps?: Coordinate;
}

export const LocationActionDock: React.FC<LocationActionDockProps> = ({
	isOpen,
	onClose,
	onSave,
	initialLocation,
	currentGps,
}) => {
	const [name, setName] = useState('');
	const [address, setAddress] = useState('');
	const [lat, setLat] = useState<number>(39.7032);
	const [lng, setLng] = useState<number>(-75.122);
	const [icon, setIcon] = useState('pin_drop');
	const [isVisibleOnMap, setIsVisibleOnMap] = useState(true);
	const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
	const [isSearchingGps, setIsSearchingGps] = useState(false);

	useEffect(() => {
		if (isOpen) {
			if (initialLocation) {
				setName(initialLocation.name);
				setAddress(initialLocation.address);
				setLat(initialLocation.lat);
				setLng(initialLocation.lng);
				setIcon(initialLocation.icon || (initialLocation.isHome ? 'home' : 'pin_drop'));
				setIsVisibleOnMap(initialLocation.isVisibleOnMap !== false);
			} else {
				setName('');
				if (currentGps) {
					setLat(currentGps.lat);
					setLng(currentGps.lng);
					setAddress(`${currentGps.lat.toFixed(4)}, ${currentGps.lng.toFixed(4)}`);
				} else {
					setLat(39.7032);
					setLng(-75.122);
					setAddress('Glassboro, NJ');
				}
				setIcon('pin_drop');
				setIsVisibleOnMap(true);
			}
		}
	}, [isOpen, initialLocation, currentGps]);

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
			isHome: initialLocation?.isHome || false,
			isVisibleOnMap,
			createdAt: initialLocation?.createdAt || new Date().toISOString(),
		};
		onSave(locationToSave);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<div className="fixed inset-0 z-50 flex items-end justify-center">
				{/* Backdrop */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onClose}
					className="absolute inset-0 bg-black/40 backdrop-blur-xs"
				/>

				{/* Dock Modal */}
				<motion.div
					initial={{ y: '100%' }}
					animate={{ y: 0 }}
					exit={{ y: '100%' }}
					transition={{ type: 'spring', damping: 28, stiffness: 300 }}
					className="relative w-full max-w-120 bg-white rounded-t-[32px] p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto no-scrollbar"
				>
					{/* Drag Handle */}
					<div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-5" />

					<div className="flex items-center justify-between mb-5">
						<h2 className="text-[20px] font-black text-[#111111] tracking-tight font-sans">
							{initialLocation ? (initialLocation.isHome ? 'Edit Home Location' : 'Edit Location') : 'New Marker'}
						</h2>
						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 cursor-pointer transition-colors"
						>
							<span className="material-symbols-outlined text-[18px]">close</span>
						</button>
					</div>

					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						{/* Icon & Name Row */}
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setIsIconPickerOpen(true)}
								className="w-14 h-14 rounded-2xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/60 flex items-center justify-center text-[#111111] shadow-xs cursor-pointer transition-all shrink-0 active:scale-95"
								title="Change marker icon"
							>
								<span className="material-symbols-outlined text-[28px]">
									{icon || 'pin_drop'}
								</span>
							</button>

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
						<div className="flex flex-col gap-1.5">
							<label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider px-0.5">
								Address or Description
							</label>
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={address}
									onChange={(e) => setAddress(e.target.value)}
									placeholder="Search address or enter description"
									className="flex-1 h-12 px-4 rounded-xl bg-neutral-50 border border-neutral-200 text-[14px] text-[#111111] focus:outline-none focus:border-black"
								/>
								<button
									type="button"
									onClick={handleUseCurrentGps}
									disabled={isSearchingGps}
									title="Use current GPS"
									className="h-12 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 font-semibold text-[13px] flex items-center gap-1.5 cursor-pointer shrink-0"
								>
									<span className="material-symbols-outlined text-[18px]">
										{isSearchingGps ? 'sync' : 'my_location'}
									</span>
									<span className="hidden sm:inline">Current GPS</span>
								</button>
							</div>
						</div>

						{/* Latitude & Longitude Preview */}
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-semibold text-neutral-400 px-0.5">
									Latitude
								</label>
								<input
									type="number"
									step="any"
									value={lat}
									onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
									className="h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200 text-[13px] font-mono text-neutral-700 focus:outline-none focus:border-black"
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
									className="h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200 text-[13px] font-mono text-neutral-700 focus:outline-none focus:border-black"
								/>
							</div>
						</div>

						{/* Show on Map Toggle */}
						<div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70 mt-1">
							<div className="flex flex-col">
								<span className="text-[14px] font-bold text-[#111111]">
									Show marker on map
								</span>
								<span className="text-[12px] text-neutral-500 font-medium">
									Always render this location's pin on the map
								</span>
							</div>
							<button
								type="button"
								onClick={() => setIsVisibleOnMap(!isVisibleOnMap)}
								className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
									isVisibleOnMap ? 'bg-[#111111]' : 'bg-neutral-300'
								}`}
							>
								<div
									className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
										isVisibleOnMap ? 'translate-x-5' : 'translate-x-0'
									}`}
								/>
							</button>
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							className="w-full h-13 mt-2 rounded-2xl bg-[#111111] hover:bg-neutral-900 active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
						>
							<span className="material-symbols-outlined text-[18px]">check</span>
							<span>{initialLocation ? 'Save Changes' : 'Create Marker'}</span>
						</button>
					</form>
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
		</AnimatePresence>
	);
};
