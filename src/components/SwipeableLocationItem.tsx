import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { SavedLocation } from '../types/maps';

interface SwipeableLocationItemProps {
	location: SavedLocation;
	onEdit: (location: SavedLocation) => void;
	onDelete: (id: string) => void;
	onToggleVisibility: (id: string) => void;
	isLast?: boolean;
}

export const SwipeableLocationItem: React.FC<SwipeableLocationItemProps> = ({
	location,
	onEdit,
	onDelete,
	onToggleVisibility,
	isLast = false,
}) => {
	const [isDismissing, setIsDismissing] = useState(false);
	const x = useMotionValue(0);
	const editOpacity = useTransform(x, [20, 80], [0, 1]);
	const deleteOpacity = useTransform(x, [-80, -20], [1, 0]);

	const handleDragEnd = (
		_: MouseEvent | TouchEvent | PointerEvent,
		info: PanInfo,
	) => {
		if (info.offset.x > 80) {
			onEdit(location);
		} else if (info.offset.x < -80 && !location.isHome) {
			setIsDismissing(true);
			setTimeout(() => {
				onDelete(location.id);
			}, 300);
		}
	};

	return (
		<motion.div
			layout
			initial={{ opacity: 0 }}
			animate={{
				opacity: isDismissing ? 0 : 1,
				y: 0,
				scale: 1,
				height: isDismissing ? 0 : 'auto',
			}}
			exit={{ opacity: 0, x: -350, height: 0 }}
			transition={{
				layout: { duration: 0.28, ease: 'easeOut' },
				opacity: { duration: 0.24 },
				y: { duration: 0.28, ease: 'easeOut' },
				height: { duration: 0.28 },
			}}
			className="relative w-full overflow-hidden select-none shrink-0"
		>
			{/* Left background: Edit */}
			<motion.div
				style={{ opacity: editOpacity }}
				className="absolute inset-0 bg-[#059669] flex items-center justify-start px-4 text-white"
				aria-hidden="true"
			>
				<div className="flex items-center gap-2 font-semibold text-[13px] tracking-tight">
					<span className="material-symbols-outlined text-[20px]">edit</span>
					<span>Edit Location</span>
				</div>
			</motion.div>

			{/* Right background: Delete (only for non-home) */}
			{!location.isHome && (
				<motion.div
					style={{ opacity: deleteOpacity }}
					className="absolute inset-0 bg-red-600 flex items-center justify-end px-4 text-white"
					aria-hidden="true"
				>
					<div className="flex items-center gap-2 font-semibold text-[13px] tracking-tight">
						<span>Delete</span>
						<span className="material-symbols-outlined text-[20px]">delete</span>
					</div>
				</motion.div>
			)}

			{/* Foreground Interactive Card */}
			<motion.div
				drag="x"
				dragSnapToOrigin={!isDismissing}
				dragConstraints={{ left: location.isHome ? 0 : -140, right: 140 }}
				dragElastic={0.25}
				onDragEnd={handleDragEnd}
				animate={isDismissing ? { x: -450 } : undefined}
				transition={
					isDismissing
						? { duration: 0.28, ease: 'easeIn' }
						: undefined
				}
				style={{ x }}
				className={`relative z-10 bg-white flex items-center justify-between p-4 cursor-grab active:cursor-grabbing ${
					!isLast ? 'border-b border-gray-100' : ''
				}`}
			>
				<div
					onClick={() => onEdit(location)}
					className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
				>
					<div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-[#111111] shrink-0 border border-neutral-200/50">
						<span className="material-symbols-outlined text-[20px]">
							{location.icon || (location.isHome ? 'home' : 'pin_drop')}
						</span>
					</div>

					<div className="flex flex-col min-w-0 pr-2">
						<div className="flex items-center gap-1.5">
							<span className="text-[14px] font-bold text-[#111111] truncate">
								{location.name}
							</span>
							{location.isHome && (
								<span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 tracking-wider">
									Home
								</span>
							)}
						</div>
						<span className="text-[12px] text-neutral-500 font-medium truncate mt-0.5">
							{location.address}
						</span>
					</div>
				</div>

				{/* Map Visibility Toggle & Edit Button */}
				<div className="flex items-center gap-1 shrink-0 ml-2">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onToggleVisibility(location.id);
						}}
						aria-label={location.isVisibleOnMap ? 'Hide on map' : 'Show on map'}
						title={location.isVisibleOnMap ? 'Visible on map' : 'Hidden from map'}
						className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
							location.isVisibleOnMap
								? 'text-[#059669] hover:bg-emerald-50'
								: 'text-neutral-300 hover:bg-neutral-100'
						}`}
					>
						<span className="material-symbols-outlined text-[20px]">
							{location.isVisibleOnMap ? 'visibility' : 'visibility_off'}
						</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onEdit(location);
						}}
						aria-label="Edit location"
						className="w-8 h-8 rounded-full text-neutral-400 hover:text-[#111111] hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
					>
						<span className="material-symbols-outlined text-[18px]">more_vert</span>
					</button>
				</div>
			</motion.div>
		</motion.div>
	);
};
