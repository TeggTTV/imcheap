import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from './LucideIcon';
import { X } from 'lucide-react';

export interface IconOption {
	icon: string;
	label: string;
	bgColor: string;
	iconColor: string;
	category: string;
}

export const ALL_EXPENSE_ICONS: IconOption[] = [
	// Food & Drink
	{
		icon: 'coffee',
		label: 'Coffee',
		bgColor: '#FEF3C7',
		iconColor: '#D97706',
		category: 'Food & Drink',
	},
	{
		icon: 'restaurant',
		label: 'Dining',
		bgColor: '#FFEDD5',
		iconColor: '#EA580C',
		category: 'Food & Drink',
	},
	{
		icon: 'local_bar',
		label: 'Drinks',
		bgColor: '#FEE2E2',
		iconColor: '#DC2626',
		category: 'Food & Drink',
	},
	{
		icon: 'lunch_dining',
		label: 'Fast Food',
		bgColor: '#FEF08A',
		iconColor: '#CA8A04',
		category: 'Food & Drink',
	},
	{
		icon: 'icecream',
		label: 'Treats',
		bgColor: '#FCE7F3',
		iconColor: '#DB2777',
		category: 'Food & Drink',
	},

	// Transit & Auto
	{
		icon: 'directions_car',
		label: 'Driving',
		bgColor: '#EEF2FF',
		iconColor: '#4F46E5',
		category: 'Transit',
	},
	{
		icon: 'local_gas_station',
		label: 'Gas',
		bgColor: '#FEF3C7',
		iconColor: '#B45309',
		category: 'Transit',
	},
	{
		icon: 'navigation',
		label: 'Commute',
		bgColor: '#E0E7FF',
		iconColor: '#4338CA',
		category: 'Transit',
	},
	{
		icon: 'pin_drop',
		label: 'Location',
		bgColor: '#ECFDF5',
		iconColor: '#059669',
		category: 'Transit',
	},
	{
		icon: 'train',
		label: 'Train/Transit',
		bgColor: '#F0FDF4',
		iconColor: '#16A34A',
		category: 'Transit',
	},

	// Shopping & Essentials
	{
		icon: 'local_grocery_store',
		label: 'Groceries',
		bgColor: '#ECFDF5',
		iconColor: '#059669',
		category: 'Shopping',
	},
	{
		icon: 'shopping_bag',
		label: 'Shopping',
		bgColor: '#FDF2F8',
		iconColor: '#BE185D',
		category: 'Shopping',
	},
	{
		icon: 'checkroom',
		label: 'Clothing',
		bgColor: '#F3E8FF',
		iconColor: '#7E22CE',
		category: 'Shopping',
	},
	{
		icon: 'inventory_2',
		label: 'Supplies',
		bgColor: '#F1F5F9',
		iconColor: '#475569',
		category: 'Shopping',
	},
	{
		icon: 'devices',
		label: 'Tech/Gadgets',
		bgColor: '#E0F2FE',
		iconColor: '#0284C7',
		category: 'Shopping',
	},

	// Health, Fitness & Lifestyle
	{
		icon: 'sports_volleyball',
		label: 'Volleyball',
		bgColor: '#FFE4E6',
		iconColor: '#E11D48',
		category: 'Lifestyle',
	},
	{
		icon: 'fitness_center',
		label: 'Gym',
		bgColor: '#EDE9FE',
		iconColor: '#6D28D9',
		category: 'Lifestyle',
	},
	{
		icon: 'self_improvement',
		label: 'Wellness',
		bgColor: '#CCFBF1',
		iconColor: '#0F766E',
		category: 'Lifestyle',
	},
	{
		icon: 'school',
		label: 'Education',
		bgColor: '#EEF2FF',
		iconColor: '#3730A3',
		category: 'Lifestyle',
	},
	{
		icon: 'sports_esports',
		label: 'Gaming',
		bgColor: '#F3E8FF',
		iconColor: '#9333EA',
		category: 'Lifestyle',
	},
	{
		icon: 'movie',
		label: 'Entertainment',
		bgColor: '#FFE4E6',
		iconColor: '#BE123C',
		category: 'Lifestyle',
	},
];

export const ALL_INCOME_ICONS: IconOption[] = [
	{
		icon: 'payments',
		label: 'Paycheck',
		bgColor: '#ECFDF5',
		iconColor: '#059669',
		category: 'Income',
	},
	{
		icon: 'bolt',
		label: 'Side Gig',
		bgColor: '#FEF3C7',
		iconColor: '#D97706',
		category: 'Income',
	},
	{
		icon: 'card_giftcard',
		label: 'Gift',
		bgColor: '#EEF2FF',
		iconColor: '#4F46E5',
		category: 'Income',
	},
	{
		icon: 'account_balance',
		label: 'Bank Deposit',
		bgColor: '#ECFDF5',
		iconColor: '#047857',
		category: 'Income',
	},
	{
		icon: 'trending_up',
		label: 'Investments',
		bgColor: '#F0FDF4',
		iconColor: '#15803D',
		category: 'Income',
	},
	{
		icon: 'replay',
		label: 'Refund',
		bgColor: '#EFF6FF',
		iconColor: '#2563EB',
		category: 'Income',
	},
	{
		icon: 'work',
		label: 'Shift Bonus',
		bgColor: '#F5F3FF',
		iconColor: '#6D28D9',
		category: 'Income',
	},
	{
		icon: 'savings',
		label: 'Tip Jar',
		bgColor: '#FEF3C7',
		iconColor: '#CA8A04',
		category: 'Income',
	},
];

interface IconPickerDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	selectedIcon: string;
	onSelectIcon: (item: {
		icon: string;
		bgColor: string;
		iconColor: string;
	}) => void;
	type?: 'expense' | 'income';
}

export const IconPickerDrawer: React.FC<IconPickerDrawerProps> = ({
	isOpen,
	onClose,
	selectedIcon,
	onSelectIcon,
	type = 'expense',
}) => {
	const iconList = type === 'income' ? ALL_INCOME_ICONS : ALL_EXPENSE_ICONS;

	const handleItemClick = (item: IconOption) => {
		// If clicking the currently selected icon, do nothing
		if (item.icon === selectedIcon) return;

		onSelectIcon({
			icon: item.icon,
			bgColor: item.bgColor,
			iconColor: item.iconColor,
		});
		onClose();
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={onClose}
						className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs cursor-pointer"
					/>

					{/* Drawer Sheet */}
					<motion.div
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={{
							type: 'spring',
							damping: 28,
							stiffness: 300,
						}}
						className="fixed bottom-0 inset-x-0 z-50 max-w-120 mx-auto bg-surface-container-lowest rounded-t-[32px] shadow-2xl border-t border-neutral-100 flex flex-col max-h-142.5 overflow-hidden select-none pb-safe"
					>
						{/* Drag Handle & Header */}
						<div className="pt-3 pb-2 px-6 flex flex-col items-center border-b border-neutral-100 shrink-0">
							<div className="w-10 h-1 rounded-full bg-neutral-200 mb-3" />
							<div className="w-full flex items-center justify-between">
								<h2 className="text-[18px] font-bold text-on-surface font-sans">
									Choose Icon
								</h2>
								<button
									type="button"
									onClick={onClose}
									className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
								>
									<X size={18} />
								</button>
							</div>
						</div>

						{/* Icon Grid */}
						<div className="p-5 overflow-y-auto no-scrollbar grid grid-cols-4 sm:grid-cols-5 gap-3.5">
							{iconList.map((item) => {
								const isSelected = item.icon === selectedIcon;
								return (
									<button
										key={item.icon}
										type="button"
										onClick={() => handleItemClick(item)}
										className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-150 cursor-pointer ${
											isSelected
												? 'bg-neutral-900 text-white scale-[1.02]'
												: 'hover:bg-neutral-50 active:scale-95 text-neutral-700'
										}`}
									>
										<div
											className="w-12 h-12 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105"
											style={{
												backgroundColor: isSelected
													? 'rgba(255,255,255,0.2)'
													: item.bgColor,
											}}
										>
											<LucideIcon
												name={item.icon}
												size={24}
												style={{
													color: isSelected
														? '#FFFFFF'
														: item.iconColor,
												}}
											/>
										</div>
										<span
											className={`text-[11px] font-medium tracking-tight text-center truncate max-w-full ${
												isSelected
													? 'text-white font-bold'
													: 'text-neutral-600'
											}`}
										>
											{item.label}
										</span>
									</button>
								);
							})}
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
};
