import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';

export interface TimeSelection {
	hour: number;
	minute: number;
	period: 'AM' | 'PM';
}

export interface ShiftItem {
	id: string;
	hours: number;
	date: string;
	startTime?: TimeSelection;
	endTime?: TimeSelection;
}

interface SwipeableShiftItemProps {
	shift: ShiftItem;
	hourlyWage: number;
	onEdit: (shift: ShiftItem) => void;
	onDelete: (id: string) => void;
	isLast?: boolean;
	formatDate: (dateStr: string) => string;
}

export const SwipeableShiftItem: React.FC<SwipeableShiftItemProps> = ({
	shift,
	hourlyWage,
	onEdit,
	onDelete,
	isLast,
	formatDate,
}) => {
	const [isDismissing, setIsDismissing] = useState(false);

	const x = useMotionValue(0);
	const editOpacity = useTransform(x, [20, 80], [0, 1]);
	const deleteOpacity = useTransform(x, [-80, -20], [1, 0]);

	const grossAmt = (shift.hours * hourlyWage).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	const handleDragEnd = (
		_: MouseEvent | TouchEvent | PointerEvent,
		info: PanInfo,
	) => {
		if (info.offset.x > 80) {
			onEdit(shift);
		} else if (info.offset.x < -80) {
			setIsDismissing(true);
			setTimeout(() => {
				onDelete(shift.id);
			}, 300);
		}
	};

	const timeSubtext =
		shift.startTime && shift.endTime
			? `${shift.startTime.hour}:${String(shift.startTime.minute).padStart(2, '0')} ${shift.startTime.period} to ${shift.endTime.hour}:${String(shift.endTime.minute).padStart(2, '0')} ${shift.endTime.period}`
			: null;

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
			{/* Green Left Background (Editing) revealed when sliding right */}
			<motion.div
				style={{ opacity: editOpacity }}
				className="absolute inset-0 bg-emerald-600 flex items-center justify-start px-4 text-white"
				aria-hidden="true"
			>
				<div className="flex items-center gap-2 font-semibold text-[13px] tracking-tight">
					<span className="material-symbols-outlined text-[20px]">
						edit
					</span>
					<span>Editing shift</span>
				</div>
			</motion.div>

			{/* Red Right Background (Deleting) revealed when sliding left */}
			<motion.div
				style={{ opacity: deleteOpacity }}
				className="absolute inset-0 bg-red-600 flex items-center justify-end px-4 text-white"
				aria-hidden="true"
			>
				<div className="flex items-center gap-2 font-semibold text-[13px] tracking-tight">
					<span>Deleting shift</span>
					<span className="material-symbols-outlined text-[20px]">
						delete
					</span>
				</div>
			</motion.div>

			{/* Draggable Shift Card */}
			<motion.div
				drag="x"
				dragSnapToOrigin={!isDismissing}
				dragConstraints={{ left: -140, right: 140 }}
				dragElastic={0.25}
				onDragEnd={handleDragEnd}
				animate={isDismissing ? { x: -450 } : undefined}
				transition={
					isDismissing
						? { duration: 0.28, ease: 'easeIn' }
						: undefined
				}
				style={{ x }}
				className={`relative z-10 bg-white px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing min-h-[56px] ${
					!isLast ? 'border-b border-neutral-100' : ''
				}`}
			>
				<div className="flex flex-col pointer-events-none">
					<span className="text-sm font-semibold text-neutral-800">
						{formatDate(shift.date)}
					</span>
					{timeSubtext && (
						<span className="text-[11px] text-neutral-400 font-medium">
							{timeSubtext}
						</span>
					)}
				</div>
				<div className="flex items-center gap-2 pointer-events-none">
					<span className="text-xs font-semibold text-neutral-500 tabular-nums">
						{shift.hours % 1 === 0 ? shift.hours : shift.hours.toFixed(2)} hrs · ${grossAmt}
					</span>
				</div>
			</motion.div>
		</motion.div>
	);
};
