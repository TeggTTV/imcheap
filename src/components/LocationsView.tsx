import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedLocation, Coordinate } from '../types/maps';
import { SwipeableLocationItem } from './SwipeableLocationItem';
import { LocationActionDock } from './LocationActionDock';

interface LocationsViewProps {
	locations: SavedLocation[];
	onUpdateLocations: (locations: SavedLocation[]) => void;
	onBack: () => void;
	currentGps?: Coordinate;
	onCreateNewRequest?: () => void;
	onDockStateChange?: (isOpen: boolean) => void;
}

export const LocationsView: React.FC<LocationsViewProps> = ({
	locations,
	onUpdateLocations,
	onBack,
	currentGps,
	onCreateNewRequest,
	onDockStateChange,
}) => {
	const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
	const [isActionDockOpen, setIsActionDockOpen] = useState(false);

	React.useEffect(() => {
		onDockStateChange?.(isActionDockOpen);
	}, [isActionDockOpen, onDockStateChange]);

	const handleOpenCreate = () => {
		if (onCreateNewRequest) {
			onCreateNewRequest();
			return;
		}
		setEditingLocation(null);
		setIsActionDockOpen(true);
	};

	const handleOpenEdit = (loc: SavedLocation) => {
		setEditingLocation(loc);
		setIsActionDockOpen(true);
	};

	const handleSaveLocation = (savedLoc: SavedLocation) => {
		const existingIndex = locations.findIndex((l) => l.id === savedLoc.id);
		let updated: SavedLocation[];
		if (existingIndex >= 0) {
			updated = [...locations];
			updated[existingIndex] = savedLoc;
		} else {
			updated = [...locations, savedLoc];
		}
		onUpdateLocations(updated);
		setIsActionDockOpen(false);
		setEditingLocation(null);
	};

	const handleDeleteLocation = (id: string) => {
		const updated = locations.filter((l) => l.id !== id || l.isHome);
		onUpdateLocations(updated);
	};

	const handleToggleVisibility = (id: string) => {
		const updated = locations.map((l) =>
			l.id === id ? { ...l, isVisibleOnMap: !l.isVisibleOnMap } : l,
		);
		onUpdateLocations(updated);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 15 }}
			transition={{ duration: 0.2, ease: 'easeOut' }}
			className="w-full flex flex-col gap-4"
		>
			{/* Header Navigation */}
			<div className="flex items-center justify-between px-1">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-1.5 text-[14px] font-bold text-neutral-800 hover:text-black transition-colors cursor-pointer py-1"
				>
					<span className="material-symbols-outlined text-[20px]">arrow_back</span>
					<span>Back</span>
				</button>
				<h2 className="text-[17px] font-black text-[#111111] tracking-tight">
					Saved Locations
				</h2>
				<div className="w-12" />
			</div>

			{/* Main Action: New Location Button as First Item */}
			<button
				type="button"
				onClick={handleOpenCreate}
				className="w-full h-14 rounded-2xl bg-[#111111] hover:bg-neutral-800 active:scale-[0.99] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
			>
				<span className="material-symbols-outlined text-[20px]">add_location_alt</span>
				<span>New Location</span>
			</button>

			{/* Locations List Card */}
			<div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden">
				<div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-neutral-50/60">
					<span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
						Locations ({locations.length})
					</span>
					<span className="text-[11px] font-semibold text-neutral-400">
						Swipe right to edit, left to delete
					</span>
				</div>

				<div className="divide-y divide-gray-100">
					{locations.map((loc, idx) => (
						<SwipeableLocationItem
							key={loc.id}
							location={loc}
							onEdit={handleOpenEdit}
							onDelete={handleDeleteLocation}
							onToggleVisibility={handleToggleVisibility}
							isLast={idx === locations.length - 1}
						/>
					))}
				</div>
			</div>

			{/* Location Action Dock for Creating/Editing */}
			<LocationActionDock
				isOpen={isActionDockOpen}
				onClose={() => {
					setIsActionDockOpen(false);
					setEditingLocation(null);
				}}
				onSave={handleSaveLocation}
				initialLocation={editingLocation}
				currentGps={currentGps}
			/>
		</motion.div>
	);
};
