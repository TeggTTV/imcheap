import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Transaction } from '../utils/expenseMath';
import { formatTransactionTimestamp } from '../utils/dateUtils';

interface SwipeableTransactionItemProps {
	tx: Transaction;
	onEdit: (tx: Transaction) => void;
	onDelete: (id: string) => void;
	isLast?: boolean;
	hourlyWage?: number;
}

const getCategoryPalette = (category: string, title: string, icon: string) => {
	const normalized = `${category} ${title} ${icon}`.toLowerCase();
	if (
		normalized.includes('coffee') ||
		normalized.includes('cafe') ||
		normalized.includes('espresso')
	) {
		return {
			bg: 'bg-[#FEF3C7]',
			iconColor: 'text-[#D97706]',
		};
	}
	if (
		normalized.includes('driv') ||
		normalized.includes('commute') ||
		normalized.includes('car') ||
		normalized.includes('gas') ||
		normalized.includes('transit') ||
		normalized.includes('school') ||
		normalized.includes('rowan')
	) {
		return {
			bg: 'bg-[#EEF2FF]',
			iconColor: 'text-[#4F46E5]',
		};
	}
	if (
		normalized.includes('fit') ||
		normalized.includes('sport') ||
		normalized.includes('gym') ||
		normalized.includes('volley') ||
		normalized.includes('vb')
	) {
		return {
			bg: 'bg-[#FFE4E6]',
			iconColor: 'text-[#E11D48]',
		};
	}
	if (
		normalized.includes('groc') ||
		normalized.includes('food') ||
		normalized.includes('mart') ||
		normalized.includes('cart')
	) {
		return {
			bg: 'bg-[#ECFDF5]',
			iconColor: 'text-[#059669]',
		};
	}
	return {
		bg: 'bg-surface-container-high',
		iconColor: 'text-on-surface',
	};
};

export const SwipeableTransactionItem: React.FC<
	SwipeableTransactionItemProps
> = ({ tx, onEdit, onDelete, isLast, hourlyWage = 17 }) => {
	const palette = getCategoryPalette(tx.category, tx.title, tx.icon);
	const [isDismissing, setIsDismissing] = useState(false);

	const x = useMotionValue(0);
	const editOpacity = useTransform(x, [20, 80], [0, 1]);
	const deleteOpacity = useTransform(x, [-80, -20], [1, 0]);

	// Calculate labor time in minutes/hours
	const wage = hourlyWage || 17;
	const laborHours = tx.amount / wage;
	const laborText =
		laborHours < 1
			? `${Math.round(laborHours * 60)}m labor`
			: `${laborHours.toFixed(1)}h labor`;

	const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
		if (info.offset.x > 80) {
			onEdit(tx);
		} else if (info.offset.x < -80) {
			setIsDismissing(true);
			setTimeout(() => {
				onDelete(tx.id);
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
					<span>Editing transaction</span>
				</div>
			</motion.div>

			{/* Red Right Background (Deleting) revealed when sliding left */}
			<motion.div
				style={{ opacity: deleteOpacity }}
				className="absolute inset-0 bg-red-600 flex items-center justify-end px-4 text-white"
				aria-hidden="true"
			>
				<div className="flex items-center gap-2 font-semibold text-[13px] tracking-tight">
					<span>Deleting transaction</span>
					<span className="material-symbols-outlined text-[20px]">
						delete
					</span>
				</div>
			</motion.div>

			{/* Draggable Transaction Card */}
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
				className={`relative z-10 bg-white p-3.5 flex items-center justify-between cursor-grab active:cursor-grabbing min-h-[70px] ${
					!isLast ? 'border-b border-gray-100' : ''
				}`}
			>
				<div className="flex items-center gap-3.5 pointer-events-none">
					<div
						className={`w-11 h-11 rounded-full ${palette.bg} ${palette.iconColor} flex items-center justify-center shrink-0`}
					>
						<span className="material-symbols-outlined text-[22px]">
							{tx.icon}
						</span>
					</div>
					<div className="flex flex-col">
						<span className="font-bold text-[15px] text-[#111111] leading-tight">
							{tx.title}
						</span>
						<span className="text-[12.5px] text-[#6B7280] mt-0.5">
							{tx.category} • {formatTransactionTimestamp(tx.timestamp)}
						</span>
					</div>
				</div>

				<div className="flex flex-col items-end gap-1 pointer-events-none">
					<span
						className={`font-bold text-[15px] tracking-tight tabular-nums ${
							tx.type === 'income'
								? 'text-[#059669]'
								: 'text-[#111111]'
						}`}
					>
						{tx.type === 'income' ? '+' : '-'}$
						{tx.amount.toFixed(2)}
					</span>

					{/* Labor pill badge */}
					<div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-semibold tracking-tight tabular-nums">
						<span className="material-symbols-outlined text-[12px] leading-none">
							schedule
						</span>
						<span>{laborText}</span>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
};
