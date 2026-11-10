import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Transaction } from '../utils/expenseMath';

interface SwipeableTransactionItemProps {
	tx: Transaction;
	onEdit: (tx: Transaction) => void;
	onDelete: (id: string) => void;
	isLast?: boolean;
}

const getCategoryPalette = (category: string, title: string, icon: string) => {
	const normalized = `${category} ${title} ${icon}`.toLowerCase();
	if (
		normalized.includes('coffee') ||
		normalized.includes('cafe') ||
		normalized.includes('everyday')
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
		normalized.includes('transit')
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
		normalized.includes('volley')
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
		normalized.includes('market') ||
		normalized.includes('supplies')
	) {
		return {
			bg: 'bg-[#ECFDF5]',
			iconColor: 'text-[#059669]',
		};
	}
	return {
		bg: 'bg-[#EEF2FF]',
		iconColor: 'text-[#4F46E5]',
	};
};

export const SwipeableTransactionItem: React.FC<
	SwipeableTransactionItemProps
> = ({ tx, onEdit, onDelete, isLast = false }) => {
	const x = useMotionValue(0);
	const [isDismissing, setIsDismissing] = useState(false);
	const palette = getCategoryPalette(tx.category, tx.title, tx.icon);

	// When sliding right (x > 0), green area on the left reveals with "Editing transaction"
	const editOpacity = useTransform(x, [10, 70], [0, 1]);
	// When sliding left (x < 0), red area on the right reveals with "Deleting transaction"
	const deleteOpacity = useTransform(x, [-10, -70], [0, 1]);

	const handleDragEnd = (
		_: MouseEvent | TouchEvent | PointerEvent,
		info: PanInfo,
	) => {
		const threshold = 75;
		if (info.offset.x > threshold) {
			// Swiped right -> Edit
			onEdit(tx);
		} else if (info.offset.x < -threshold) {
			// Swiped left -> Delete: animate sliding completely off-screen first
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
				className={`relative z-10 bg-white p-3.5 flex items-center justify-between cursor-grab active:cursor-grabbing min-h-16 ${
					!isLast ? 'border-b border-gray-100' : ''
				}`}
			>
				<div className="flex items-center gap-3 pointer-events-none">
					<div
						className={`w-10 h-10 rounded-full ${palette.bg} ${palette.iconColor} flex items-center justify-center shrink-0`}
					>
						<span className="material-symbols-outlined text-[20px]">
							{tx.icon}
						</span>
					</div>
					<div className="flex flex-col">
						<span className="font-bold text-[14px] text-on-surface leading-tight">
							{tx.title}
						</span>
						<span className="text-[12px] text-on-surface-variant">
							{tx.category} • {tx.timestamp}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2 pointer-events-none">
					<span
						className={`font-bold text-[15px] tracking-tight tabular-nums ${
							tx.type === 'income'
								? 'text-secondary'
								: 'text-error'
						}`}
					>
						{tx.type === 'income' ? '+' : '-'}$
						{tx.amount.toFixed(2)}
					</span>
				</div>
			</motion.div>
		</motion.div>
	);
};
