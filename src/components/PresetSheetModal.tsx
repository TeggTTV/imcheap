import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
	applyKeypadKey,
	calculatePresetEquivalence,
	PresetItem,
} from '../utils/expenseMath';

interface PresetSheetModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSavePreset: (preset: Omit<PresetItem, 'id'>) => void;
	mileageRate: number;
	initialPreset?: Partial<PresetItem>;
}

const EXPENSE_CATEGORIES = [
	{ id: 'Driving', label: 'Driving', icon: 'directions_car' },
	{ id: 'Fitness', label: 'Fitness', icon: 'sports_volleyball' },
	{ id: 'Food', label: 'Food', icon: 'fastfood' },
];

const INCOME_CATEGORIES = [
	{ id: 'Paycheck', label: 'Paycheck', icon: 'payments' },
	{ id: 'Side Gig', label: 'Side Gig', icon: 'bolt' },
	{ id: 'Gift', label: 'Gift', icon: 'card_giftcard' },
	{ id: 'Refund', label: 'Refund', icon: 'replay' },
];

export const EXPENSE_ICONS = [
	{ icon: 'shopping_cart', bgColor: '#ECFDF5', iconColor: '#059669' },
	{ icon: 'coffee', bgColor: '#FEF3C7', iconColor: '#D97706' },
	{ icon: 'directions_car', bgColor: '#EEF2FF', iconColor: '#4F46E5' },
	{ icon: 'sports_volleyball', bgColor: '#FFE4E6', iconColor: '#E11D48' },
	{ icon: 'school', bgColor: '#EEF2FF', iconColor: '#3730A3' },
];

export const INCOME_ICONS = [
	{ icon: 'payments', bgColor: '#ECFDF5', iconColor: '#059669' },
	{ icon: 'bolt', bgColor: '#FEF3C7', iconColor: '#D97706' },
	{ icon: 'card_giftcard', bgColor: '#EEF2FF', iconColor: '#4F46E5' },
	{ icon: 'account_balance', bgColor: '#ECFDF5', iconColor: '#059669' },
	{ icon: 'trending_up', bgColor: '#ECFDF5', iconColor: '#059669' },
];

const UNITS: Array<'USD' | 'MILES' | 'SERVINGS'> = ['USD', 'MILES', 'SERVINGS'];

const UNIT_LABELS: Record<'USD' | 'MILES' | 'SERVINGS', string> = {
	USD: '$ (USD)',
	MILES: 'MILES',
	SERVINGS: 'SERVINGS',
};

const UNIT_ICONS: Record<'USD' | 'MILES' | 'SERVINGS', string> = {
	USD: 'attach_money',
	MILES: 'directions_car',
	SERVINGS: 'restaurant',
};

export const PresetSheetModal: React.FC<PresetSheetModalProps> = ({
	isOpen,
	onClose,
	onSavePreset,
	mileageRate,
	initialPreset,
}) => {
	const [presetType, setPresetType] = useState<'expense' | 'income'>(
		initialPreset?.type || 'expense',
	);
	const [currentValue, setCurrentValue] = useState<string>(
		initialPreset?.rawValue !== undefined
			? String(initialPreset.rawValue)
			: '0',
	);
	const [unit, setUnit] = useState<'USD' | 'MILES' | 'SERVINGS'>(
		initialPreset?.unit || 'USD',
	);
	const [title, setTitle] = useState<string>(initialPreset?.title || '');
	const [isRoundTrip, setIsRoundTrip] = useState<boolean>(
		initialPreset?.isRoundTrip ?? false,
	);
	const [selectedCategory, setSelectedCategory] = useState<string>(
		initialPreset?.category ||
			(initialPreset?.type === 'income' ? 'Paycheck' : 'Driving'),
	);
	const [customCategories, setCustomCategories] = useState<
		Array<{ id: string; label: string; icon: string }>
	>([]);
	const [isAddingCategory, setIsAddingCategory] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');
	const [iconIndex, setIconIndex] = useState(0);

	// Synchronize or reset form states whenever the modal opens or initialPreset changes
	React.useEffect(() => {
		if (isOpen) {
			if (initialPreset) {
				setPresetType(initialPreset.type || 'expense');
				setCurrentValue(
					initialPreset.rawValue !== undefined
						? String(initialPreset.rawValue)
						: '0',
				);
				setUnit(initialPreset.unit || 'USD');
				setTitle(initialPreset.title || '');
				setIsRoundTrip(initialPreset.isRoundTrip ?? false);
				setSelectedCategory(
					initialPreset.category ||
						(initialPreset.type === 'income' ? 'Paycheck' : 'Driving'),
				);
			} else {
				// Reset all fields clean for new preset
				setPresetType('expense');
				setCurrentValue('0');
				setUnit('USD');
				setTitle('');
				setIsRoundTrip(false);
				setSelectedCategory('Driving');
				setIconIndex(0);
				setIsAddingCategory(false);
				setNewCategoryName('');
			}
		}
	}, [isOpen, initialPreset]);

	const baseCategories =
		presetType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
	const allCategories = [...baseCategories, ...customCategories];
	const iconList = presetType === 'income' ? INCOME_ICONS : EXPENSE_ICONS;
	const currentIconMeta = iconList[iconIndex % iconList.length];

	const togglePresetType = () => {
		const nextType = presetType === 'expense' ? 'income' : 'expense';
		setPresetType(nextType);
		setIconIndex(0);
		const nextCats =
			nextType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
		setSelectedCategory(nextCats[0].id);
	};

	const cycleUnit = () => {
		if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
			try {
				navigator.vibrate(15);
			} catch {
				// ignore
			}
		}
		const nextIdx = (UNITS.indexOf(unit) + 1) % UNITS.length;
		setUnit(UNITS[nextIdx]);
	};

	const equiv = calculatePresetEquivalence(
		currentValue,
		unit,
		isRoundTrip,
		mileageRate,
	);

	const handleKeyPress = (key: string) => {
		setCurrentValue((prev) =>
			applyKeypadKey(prev, key, { maxLength: 6, maxDecimals: 2 }),
		);
	};

	const handleAddCategorySubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = newCategoryName.trim();
		if (!trimmed) return;
		const newCat = { id: trimmed, label: trimmed, icon: 'label' };
		setCustomCategories((prev) => [...prev, newCat]);
		setSelectedCategory(trimmed);
		setNewCategoryName('');
		setIsAddingCategory(false);
	};

	const handleSave = () => {
		const cleanTitle = title.trim() || 'Custom Preset';
		const shortLabel = cleanTitle.split(/\s+|→/)[0] || 'Preset';
		onSavePreset({
			label: shortLabel.slice(0, 10),
			title: cleanTitle,
			category: selectedCategory,
			type: presetType,
			icon: currentIconMeta.icon,
			bgColor: currentIconMeta.bgColor,
			iconColor: currentIconMeta.iconColor,
			unit,
			rawValue: parseFloat(currentValue) || 0,
			isRoundTrip,
			calculatedAmount: equiv.numericCost > 0 ? equiv.numericCost : 0.89,
		});
		onClose();
		setSelectedCategory(baseCategories[0].id);
		setCurrentValue('0.00');
		setUnit('USD');
		setTitle('');
		setIsRoundTrip(false);
		setIconIndex(0);
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div
					className="fixed inset-0 z-50 flex flex-col justify-end"
					role="dialog"
					aria-modal="true"
					aria-label="Configure Preset"
				>
					{/* Dimmed Scrim with fade */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.22, ease: 'easeOut' }}
						className="fixed inset-0 bg-primary/40 backdrop-blur-[2px]"
						onClick={onClose}
					/>

					{/* iOS Bottom Sheet Container with spring sliding, draggable down to dismiss */}
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
						className="relative z-20 w-full max-w-120 mx-auto bg-surface-container-lowest rounded-t-[28px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col pt-2 pb-5 px-6 touch-none"
					>
						{/* Top Grab Handle */}
						<button
							type="button"
							// onClick={onClose}
							aria-label="Close preset sheet"
							className="w-full flex flex-col items-center py-1.5 cursor-grab active:cursor-grabbing focus:outline-none"
						>
							<div className="w-9 h-1 rounded-full bg-surface-container-highest" />
						</button>

						{/* Numeric Value & Unit Selector Row */}
						<div className="relative w-full min-h-21 py-1 flex items-center justify-center border-none">
							{/* Left: Ghost Toggle Button for income/expense matching the action dock */}
							<div className="absolute left-0 inset-y-0 flex items-center z-10">
								<motion.button
									type="button"
									aria-label={
										presetType === 'expense'
											? 'Switch to income preset (add money)'
											: 'Switch to expense preset (spend money)'
									}
									onClick={togglePresetType}
									animate={{
										backgroundColor:
											presetType === 'income'
												? 'rgb(236, 253, 245)'
												: 'rgba(0, 0, 0, 0)',
										borderColor:
											presetType === 'income'
												? 'rgb(16, 185, 129)'
												: 'rgb(218, 61, 74)',
										borderStyle:
											presetType === 'income'
												? 'solid'
												: 'dashed',
										color:
											presetType === 'income'
												? 'rgb(5, 150, 105)'
												: 'rgb(218, 61, 74)',
										scale: [0.9, 1],
									}}
									whileTap={{ scale: 0.88 }}
									transition={{
										duration: 0.28,
										ease: 'easeInOut',
									}}
									className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-2 focus:outline-none"
								>
									<motion.span
										key={presetType}
										initial={{
											rotate:
												presetType === 'income'
													? -90
													: 90,
											scale: 0.6,
											opacity: 0,
										}}
										animate={{
											rotate: 0,
											scale: 1,
											opacity: 1,
										}}
										transition={{
											duration: 0.28,
											ease: 'easeInOut',
										}}
										className="material-symbols-outlined text-[20px] font-bold select-none"
									>
										{presetType === 'income'
											? 'add'
											: 'remove'}
									</motion.span>
								</motion.button>
							</div>

							{/* Center: Large Number in the exact middle with Pill off to its right */}
							<div className="relative flex items-center justify-center">
								<span
									className="font-bold text-on-surface tracking-tight leading-none text-[40px] tabular-nums"
									id="numeric-val"
									data-testid="preset-numeric-val"
								>
									{currentValue}
								</span>

								{/* Inline Tap-to-Cycle Pill positioned directly to the right without shifting the number center */}
								<div className="absolute left-full ml-2 flex items-center">
									<motion.button
										type="button"
										onClick={cycleUnit}
										whileTap={{ scale: 0.88 }}
										className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high border border-gray-300/80 shadow-xs active:bg-surface-container-highest transition-colors cursor-pointer focus:outline-none select-none whitespace-nowrap"
										aria-label={`Cycle unit. Current: ${unit}`}
									>
										<span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover:text-primary transition-colors">
											{UNIT_ICONS[unit]}
										</span>
										<span className="font-bold text-[12px] tracking-wider uppercase text-on-surface">
											{unit}
										</span>
										<span className="material-symbols-outlined text-[13px] text-outline opacity-60 group-hover:opacity-100 transition-opacity">
											sync
										</span>
									</motion.button>
								</div>
							</div>
						</div>

						{/* Preset Identity Input Bar */}
						<div className="mt-2 bg-surface-container-low/70 rounded-xl px-3 py-2 flex items-center gap-3">
							<button
								type="button"
								onClick={() => setIconIndex((i) => i + 1)}
								aria-label="Cycle preset icon"
								className={`relative w-10 h-10 rounded-full ${currentIconMeta.bgColor} flex items-center justify-center shrink-0 active:scale-95 transition-transform`}
							>
								<span
									className="material-symbols-outlined text-[20px]"
									style={{ color: currentIconMeta.iconColor }}
								>
									{currentIconMeta.icon}
								</span>
								<div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-xs overflow-hidden">
									<span className="material-symbols-outlined text-[10px] leading-none scale-75">
										edit
									</span>
								</div>
							</button>
							<div className="flex-1 min-w-0 flex items-center">
								<input
									aria-label="Preset Title"
									className="w-full bg-transparent p-0 m-0 border-none outline-none font-headline-sm text-headline-sm font-semibold text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-0"
									type="text"
									placeholder="e.g. Grocery Store"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
								/>
							</div>
							<button
								aria-label="Edit Preset Identity"
								onClick={() => {
									const el =
										document.querySelector<HTMLInputElement>(
											'input[aria-label="Preset Title"]',
										);
									el?.focus();
								}}
								className="w-7 h-7 flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
								type="button"
							>
								<span className="material-symbols-outlined text-[18px]">
									edit_note
								</span>
							</button>
						</div>

						{/* Round Trip Section */}
						{unit === 'MILES' && (
							<div className="mt-2.5 flex items-center justify-between py-0.5">
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-on-surface">
										<span className="material-symbols-outlined text-[14px]">
											sync_alt
										</span>
									</div>
									<div>
										<p className="font-label-md text-label-md font-medium text-on-surface">
											Round Trip (x2)
										</p>
										<p className="font-body-sm text-body-sm text-on-surface-variant">
											Multiplies mileage calculation
										</p>
									</div>
								</div>
								<button
									aria-checked={isRoundTrip}
									aria-label="Round Trip (x2)"
									onClick={() =>
										setIsRoundTrip((prev) => !prev)
									}
									className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center relative focus:outline-none cursor-pointer ${
										isRoundTrip
											? 'bg-primary'
											: 'bg-surface-container-highest'
									}`}
									id="toggle-btn"
									role="switch"
									type="button"
								>
									<div
										className={`w-5 h-5 bg-surface-container-lowest rounded-full shadow-md transform transition-transform duration-200 ${
											isRoundTrip
												? 'translate-x-5'
												: 'translate-x-0.5'
										}`}
										id="toggle-knob"
									/>
								</button>
							</div>
						)}

						{/* Custom iOS Numeric Keypad (Matches Main Action Dock) */}
						<div
							className="grid grid-cols-3 gap-2 mt-3 mb-2"
							id="numeric-keypad"
						>
							{[
								'1',
								'2',
								'3',
								'4',
								'5',
								'6',
								'7',
								'8',
								'9',
								'.',
								'0',
							].map((val) => (
								<button
									key={val}
									type="button"
									onClick={() => handleKeyPress(val)}
									className="num-key h-14 rounded-full bg-transparent hover:bg-surface-container-low font-headline-lg text-headline-lg font-bold text-on-surface flex items-center justify-center transition-all active:scale-95 active:bg-surface-container cursor-pointer"
								>
									{val}
								</button>
							))}
							<button
								type="button"
								aria-label="Backspace"
								onClick={() => handleKeyPress('backspace')}
								className="num-key h-14 rounded-full bg-transparent hover:bg-surface-container-low font-headline-lg text-headline-lg font-bold text-on-surface flex items-center justify-center transition-all active:scale-95 active:bg-surface-container cursor-pointer"
							>
								<span className="material-symbols-outlined text-[28px]">
									backspace
								</span>
							</button>
						</div>

						{/* Save Preset CTA */}
						<div className="mt-3 pb-1">
							<button
								type="button"
								id="save-preset-btn"
								onClick={handleSave}
								className="w-full h-12.5 bg-primary text-on-primary rounded-2xl flex items-center justify-center gap-2 font-label-lg text-label-lg font-bold uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all hover:bg-neutral-800 cursor-pointer whitespace-nowrap"
							>
								<span>Save Preset</span>
								<span className="material-symbols-outlined text-[18px]">
									arrow_forward
								</span>
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};
