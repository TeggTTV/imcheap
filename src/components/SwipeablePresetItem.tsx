import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { PresetItem } from '../utils/expenseMath';

interface SwipeablePresetItemProps {
	preset: PresetItem;
	onEdit: (preset: PresetItem) => void;
	onDelete: (id: string) => void;
	onTogglePin: (id: string) => void;
	isLast?: boolean;
	formatPresetDetail: (preset: PresetItem) => string;
}

export const SwipeablePresetItem: React.FC<SwipeablePresetItemProps> = ({
	preset,
	onEdit,
	onDelete,
	onTogglePin,
	isLast,
	formatPresetDetail,
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
			onEdit(preset);
		} else if (info.offset.x < -80) {
			setIsDismissing(true);
			setTimeout(() => {
				onDelete(preset.id);
			}, 300);
		}
	};

	const handleClick = () => {
		if (Math.abs(x.get()) < 5) {
			onTogglePin(preset.id);
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
					<span>Editing preset</span>
				</div>
			</motion.div>

			{/* Red Right Background (Deleting) revealed when sliding left */}
			<motion.div
				style={{ opacity: deleteOpacity }}
				className="absolute inset-0 bg-red-600 flex items-center justify-end px-4 text-white"
				aria-hidden="true"
			>
				<div className="flex items-center gap-2 font-semibold text-[13px] tracking-tight">
					<span>Deleting preset</span>
					<span className="material-symbols-outlined text-[20px]">
						delete
					</span>
				</div>
			</motion.div>

			{/* Draggable Preset Card */}
			<motion.div
				data-testid={`swipeable-preset-${preset.id}`}
				drag="x"
				dragSnapToOrigin={!isDismissing}
				dragConstraints={{ left: -140, right: 140 }}
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
				className={`relative z-10 bg-white px-3 py-3 flex items-center justify-between cursor-pointer active:bg-slate-50/70 min-h-[58px] ${
					!isLast ? 'border-b border-[#F3F4F6]' : ''
				}`}
			>
				<div className="flex items-center gap-3 min-w-0 pr-2 pointer-events-none">
					<div
						className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
						style={{
							backgroundColor: preset.bgColor,
							color: preset.iconColor,
						}}
					>
						<span className="material-symbols-outlined text-[20px]">
							{preset.icon}
						</span>
					</div>
					<div className="flex flex-col min-w-0">
						<span className="text-[14px] font-bold text-[#111111] truncate">
							{preset.title}
						</span>
						<span className="text-[12px] text-[#6B7280] truncate tabular-nums">
							{preset.category} • {formatPresetDetail(preset)}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2.5 shrink-0 pointer-events-none">
					<span className="text-[13px] font-bold text-[#111111] tabular-nums">
						${preset.calculatedAmount.toFixed(2)}
					</span>
					{preset.pinned ? (
						<span className="bg-[#ECFDF5] text-[#059669] px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1">
							Pinned ★
						</span>
					) : (
						<span className="bg-neutral-100 text-neutral-600 hover:bg-neutral-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors">
							<span className="material-symbols-outlined text-[13px]">
								push_pin
							</span>
							Pin
						</span>
					)}
				</div>
			</motion.div>
		</motion.div>
	);
};
