import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { RecordedTrip } from '../types/maps';
import { Trash2, ArrowUpRight } from 'lucide-react';

export interface SwipeableTripItemProps {
	trip: RecordedTrip;
	isSelected: boolean;
	onSelect: (trip: RecordedTrip) => void;
	onLog: (trip: RecordedTrip) => void;
	onDelete: (id: string) => void;
	hourlyWage: number;
	mileageRate: number;
	isLast?: boolean;
}

export const SwipeableTripItem: React.FC<SwipeableTripItemProps> = ({
	trip,
	isSelected,
	onSelect,
	onLog,
	onDelete,
	hourlyWage,
	mileageRate,
	isLast = false,
}) => {
	const [isDismissing, setIsDismissing] = useState(false);
	const x = useMotionValue(0);
	const deleteOpacity = useTransform(x, [-80, -20], [1, 0]);

	const tripLaborMinutes =
		hourlyWage > 0
			? ((trip.cost || trip.miles * mileageRate) / hourlyWage) * 60
			: 0;

	const handleDragEnd = (
		_: MouseEvent | TouchEvent | PointerEvent,
		info: PanInfo,
	) => {
		if (info.offset.x < -80) {
			setIsDismissing(true);
			setTimeout(() => {
				onDelete(trip.id);
			}, 300);
		}
	};

	const handleClick = () => {
		if (Math.abs(x.get()) < 5) {
			onSelect(trip);
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
			{/* Red Right Background (Delete only) revealed when sliding left */}
			<motion.div
				style={{ opacity: deleteOpacity }}
				className="absolute inset-0 bg-red-600 flex items-center justify-end px-4 text-white"
				aria-hidden="true"
			>
				<div className="flex items-center gap-2 font-semibold text-[13px] tracking-tight">
					<span>Deleting trip</span>
					<Trash2 size={18} />
				</div>
			</motion.div>

			{/* Draggable Trip Card */}
			<motion.div
				data-testid={`swipeable-trip-${trip.id}`}
				drag="x"
				dragSnapToOrigin={!isDismissing}
				dragConstraints={{ left: -140, right: 0 }}
				dragElastic={0.25}
				onDragEnd={handleDragEnd}
				onClick={handleClick}
				animate={isDismissing ? { x: -450 } : undefined}
				transition={
					isDismissing
						? { duration: 0.28, ease: 'easeIn' }
						: undefined
				}
				style={{ x }}
				className={`relative z-10 px-4 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${
					isSelected
						? 'bg-neutral-50/70'
						: 'bg-white hover:bg-neutral-50/40'
				} ${!isLast ? 'border-b border-gray-100' : ''}`}
			>
				{/* Active left indicator bar */}
				{isSelected && (
					<div className="absolute left-0 top-3 bottom-3 w-1.5 bg-[#111111] rounded-r-full" />
				)}

				{/* Left Column: Route Title & Subtext */}
				<div className="flex flex-col min-w-0 pr-2 pl-1 pointer-events-none">
					<div className="flex items-center gap-1.5">
						<span className="text-[15px] font-bold text-[#111111] truncate">
							{trip.from} → {trip.to}
						</span>
						<ArrowUpRight size={15} className="text-gray-400" />
					</div>
					<span className="text-[12px] text-[#6B7280] truncate mt-0.5 tabular-nums">
						{trip.miles.toFixed(1)} mi ·{' '}
						{tripLaborMinutes.toFixed(1)}m labor · {trip.timestamp}
					</span>
				</div>

				{/* Right Column: Cost & Action Button */}
				<div className="flex flex-col items-end gap-1 shrink-0">
					<span className="text-[15px] font-bold text-[#111111] tabular-nums">
						${trip.cost.toFixed(2)}
					</span>

					{trip.status === 'UNLOGGED' && (
						<button
							type="button"
							data-testid={`log-trip-${trip.id}`}
							onClick={(e) => {
								e.stopPropagation();
								onLog(trip);
							}}
							className="bg-[#ECFDF5] hover:bg-[#D1FAE5] active:scale-95 text-secondary border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold transition-all cursor-pointer shadow-2xs"
						>
							Not Logged
						</button>
					)}
				</div>
			</motion.div>
		</motion.div>
	);
};
