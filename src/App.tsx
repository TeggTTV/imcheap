/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
	motion,
	AnimatePresence,
	useMotionValue,
	useTransform,
	animate,
	PanInfo,
} from 'motion/react';
import {
	Transaction,
	PresetItem,
	IncomeSettings,
	INITIAL_TRANSACTIONS,
	INITIAL_PRESETS,
	INITIAL_INCOME_SETTINGS,
	calculateBalanceSummary,
	applyKeypadKey,
	calculateWorkHoursLabel,
} from './utils/expenseMath';
import { TransactionManager } from './utils/transactionDataStructure';
import { UIProvider, useUI } from './utils/uiManager';
import { PresetSheetModal } from './components/PresetSheetModal';
import { BalanceBreakdownModal } from './components/BalanceBreakdownModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { SwipeableTransactionItem } from './components/SwipeableTransactionItem';
import {
	AnalyticsView,
	PresetsView,
	SettingsView,
} from './components/SecondaryTabs';

type ActiveTab = 'dashboard' | 'analytics' | 'presets' | 'settings';
type ActiveModal = 'none' | 'preset' | 'breakdown';

const COLLAPSED_DOCK_Y = 420;

const EXPENSE_CATEGORIES = [
	{ id: 'Driving', label: 'Driving', emoji: '🚗', icon: 'directions_car' },
	{ id: 'Fitness', label: 'Fitness', emoji: '🏐', icon: 'fitness_center' },
	{ id: 'Food', label: 'Food', emoji: '🍔', icon: 'restaurant' },
	{ id: 'Other', label: 'Other', emoji: '📦', icon: 'shopping_bag' },
];

const INCOME_CATEGORIES = [
	{ id: 'Paycheck', label: 'Paycheck', emoji: '💼', icon: 'payments' },
	{ id: 'Side Gig', label: 'Side Gig', emoji: '⚡', icon: 'bolt' },
	{ id: 'Gift', label: 'Gift', emoji: '🎁', icon: 'card_giftcard' },
	{ id: 'Refund', label: 'Refund', emoji: '🔄', icon: 'replay' },
];

function AnimatedNumber({ value }: { value: number }) {
	const [displayVal, setDisplayVal] = useState(value);

	useEffect(() => {
		const controls = animate(displayVal, value, {
			duration: 0.45,
			ease: 'easeInOut',
			onUpdate: (latest) => setDisplayVal(latest),
		});
		return () => controls.stop();
	}, [value]);

	return <>${displayVal.toFixed(2)}</>;
}

export default function App() {
	const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
	const [activeModal, setActiveModal] = useState<ActiveModal>(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			const sheet = params.get('sheet');
			if (sheet === 'preset' || sheet === 'breakdown') {
				return sheet;
			}
		}
		return 'none';
	});

	const [isDockExpanded, setIsDockExpanded] = useState<boolean>(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			return params.get('sheet') === 'log';
		}
		return false;
	});
	const [selectedCategory, setSelectedCategory] = useState<string>('Fitness');
	const [dockNote, setDockNote] = useState<string>('');

	// Continuous motion values for smooth live dragging
	const dockY = useMotionValue(COLLAPSED_DOCK_Y);

	useEffect(() => {
		if (isDockExpanded) {
			animate(dockY, 0, { type: 'spring', damping: 28, stiffness: 320 });
		} else {
			animate(dockY, COLLAPSED_DOCK_Y, {
				type: 'spring',
				damping: 28,
				stiffness: 320,
			});
		}
	}, [isDockExpanded, dockY]);

	// Motion transforms driven continuously by dock dragging
	const bgDimOpacity = useTransform(dockY, [COLLAPSED_DOCK_Y, 0], [0, 0.4]);
	const navY = useTransform(dockY, [COLLAPSED_DOCK_Y, 160], [0, 80]);
	const presetsOpacity = useTransform(dockY, [COLLAPSED_DOCK_Y, 200], [1, 0]);
	const presetsHeight = useTransform(dockY, [COLLAPSED_DOCK_Y, 180], [68, 0]);
	const compactAmountOpacity = useTransform(
		dockY,
		[COLLAPSED_DOCK_Y, 240],
		[1, 0],
	);
	const expandedAmountOpacity = useTransform(dockY, [240, 0], [0, 1]);

	const [txManager] = useState<TransactionManager>(
		() => new TransactionManager(INITIAL_TRANSACTIONS),
	);
	const [transactions, setTransactions] = useState<Transaction[]>(() =>
		txManager.getAll(),
	);
	const [presets, setPresets] = useState<PresetItem[]>(INITIAL_PRESETS);
	const [incomeSettings, setIncomeSettings] = useState<IncomeSettings>(
		INITIAL_INCOME_SETTINGS,
	);

	// Quick dock state
	const [selectedPresetLabel, setSelectedPresetLabel] = useState<
		string | null
	>(null);
	const [dockAmount, setDockAmount] = useState<string>('');
	const [dockType, setDockType] = useState<'expense' | 'income'>('expense');
	const [isLoggingAction, setIsLoggingAction] = useState<
		'idle' | 'spinning' | 'success'
	>('idle');
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	// Editing state for presets and transactions
	const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);
	const [selectedTxForDetail, setSelectedTxForDetail] =
		useState<Transaction | null>(null);

	// Search state
	const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState<string>('');

	const summary = useMemo(
		() => calculateBalanceSummary(transactions, incomeSettings),
		[transactions, incomeSettings],
	);

	const filteredTransactions = useMemo(() => {
		return txManager.search(searchQuery);
	}, [txManager, transactions, searchQuery]);

	const showToast = (msg: string) => {
		setToastMessage(msg);
	};

	useEffect(() => {
		if (!toastMessage) return;
		const timer = setTimeout(() => {
			setToastMessage(null);
		}, 1800);
		return () => clearTimeout(timer);
	}, [toastMessage]);

	const handleDockAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let val = e.target.value.replace(/[^0-9.]/g, '');
		const parts = val.split('.');
		if (parts.length > 2) {
			val = parts[0] + '.' + parts.slice(1).join('');
		}
		if (parts[1] && parts[1].length > 2) {
			val = parts[0] + '.' + parts[1].slice(0, 2);
		}
		setDockAmount(val);
	};

	const handlePresetClick = (preset: PresetItem) => {
		const newTx = txManager.createTransaction({
			title: preset.title,
			category: preset.category,
			amount: preset.calculatedAmount,
			type: 'expense',
			icon: preset.icon,
		});
		setTransactions(txManager.getAll());
		showToast(`Logged $${newTx.amount.toFixed(2)} to ${preset.label}`);
	};

	const handleKeypadClick = (val: string) => {
		setDockAmount((prev) => {
			const initial = prev || '';
			return applyKeypadKey(initial, val, {
				maxLength: 8,
				maxDecimals: 2,
			});
		});
	};

	const currentCategories =
		dockType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

	const handleCommitDockExpense = () => {
		if (isLoggingAction !== 'idle') return;

		const parsedVal = parseFloat(dockAmount);
		const matchedPreset = presets.find(
			(p) => p.label === selectedPresetLabel,
		);
		const catMeta =
			currentCategories.find(
				(c) => c.id.toLowerCase() === selectedCategory.toLowerCase(),
			) || currentCategories[0];

		// If dock is collapsed and user has no amount or preset, expand it upward
		if (
			!isDockExpanded &&
			(isNaN(parsedVal) || parsedVal <= 0) &&
			!matchedPreset
		) {
			setIsDockExpanded(true);
			return;
		}

		const finalAmount =
			!isNaN(parsedVal) && parsedVal > 0
				? parsedVal
				: matchedPreset?.calculatedAmount || 18.59;

		setIsLoggingAction('spinning');

		setTimeout(() => {
			setIsLoggingAction('success');

			const newTx = txManager.createTransaction({
				title:
					dockNote.trim() ||
					(matchedPreset ? matchedPreset.title : catMeta.label),
				category: catMeta.label,
				amount: finalAmount,
				type: dockType,
				icon: matchedPreset ? matchedPreset.icon : catMeta.icon,
				note: dockNote.trim() || undefined,
			});

			setTransactions(txManager.getAll());
			showToast(
				`Logged ${dockType === 'income' ? '+' : '-'}$${newTx.amount.toFixed(2)} to ${catMeta.label}`,
			);

			setTimeout(() => {
				setIsLoggingAction('idle');
				setDockAmount('');
				setSelectedPresetLabel(null);
				setDockNote('');
				setIsDockExpanded(false);
			}, 250);
		}, 250);
	};

	const handleSaveNewPreset = (presetData: Omit<PresetItem, 'id'>) => {
		if (editingPreset) {
			setPresets((prev) =>
				prev.map((p) =>
					p.id === editingPreset.id ? { ...presetData, id: p.id } : p,
				),
			);
			showToast(`Updated preset "${presetData.label}"`);
			setEditingPreset(null);
		} else {
			const newPreset: PresetItem = {
				...presetData,
				id: `preset-${Date.now()}`,
			};
			setPresets((prev) => [...prev, newPreset]);
			showToast(`Saved preset "${newPreset.label}"`);
		}
	};

	const handleQuickLogPresetFromTab = (preset: PresetItem) => {
		const newTx = txManager.createTransaction({
			title: preset.title,
			category: preset.category,
			amount: preset.calculatedAmount,
			type: 'expense',
			icon: preset.icon,
		});
		setTransactions(txManager.getAll());
		showToast(`Logged $${newTx.amount.toFixed(2)} to ${preset.label}`);
	};

	const tabTitle =
		activeTab === 'dashboard'
			? 'Dashboard'
			: activeTab === 'analytics'
				? 'Analytics'
				: activeTab === 'presets'
					? 'Presets'
					: 'Settings';

	return (
		<div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col antialiased">
			{/* Top App Header - Icon stays constant (toll), profile icon has no function */}
			<header className="fixed top-0 inset-x-0 z-[60] bg-surface/85 backdrop-blur-xl">
				<div className="h-16 px-margin max-w-[480px] mx-auto flex items-center justify-between">
					<div className="flex items-center gap-space-sm">
						<span className="material-symbols-outlined text-primary text-[22px]">
							toll
						</span>
						<h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
							{tabTitle}
						</h1>
					</div>

					<div className="flex items-center gap-space-xs">
						<button
							type="button"
							aria-label="Toggle Search"
							onClick={() => setIsSearchOpen((prev) => !prev)}
							className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
						>
							<span className="material-symbols-outlined text-[20px]">
								{isSearchOpen ? 'close' : 'search'}
							</span>
						</button>
						{/* Non-functional profile avatar */}
						<div
							aria-hidden="true"
							className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ml-space-xs pointer-events-none select-none"
						>
							<span className="material-symbols-outlined text-on-primary text-[18px]">
								person
							</span>
						</div>
					</div>
				</div>

				{/* Optional Collapsible Search Bar */}
				{isSearchOpen && (
					<div className="px-margin pb-3 max-w-[480px] mx-auto">
						<div className="flex items-center gap-2 bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 shadow-xs">
							<span className="material-symbols-outlined text-outline text-[18px]">
								search
							</span>
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search transactions or categories..."
								aria-label="Search transactions"
								autoFocus
								className="w-full bg-transparent text-[14px] text-on-surface placeholder:text-outline focus:outline-none"
							/>
							{searchQuery && (
								<button
									type="button"
									aria-label="Clear search"
									onClick={() => setSearchQuery('')}
									className="text-outline hover:text-on-surface cursor-pointer"
								>
									<span className="material-symbols-outlined text-[16px]">
										cancel
									</span>
								</button>
							)}
						</div>
					</div>
				)}
			</header>

			{/* Main Content Container */}
			<main
				className={`flex flex-col relative w-full max-w-[480px] mx-auto px-margin ${
					isSearchOpen ? 'pt-28' : 'pt-16'
				} pb-28 bg-surface min-h-screen`}
			>
				{activeTab === 'dashboard' && (
					<div className="flex flex-col w-full space-y-space-lg pb-10">
						{/* Elevated Hero Card: Balance, Dual-Tone Progress, and Badge */}
						<section className="pt-space-md px-space-xs">
							<div
								onClick={() => setActiveModal('breakdown')}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										setActiveModal('breakdown');
									}
								}}
								role="button"
								tabIndex={0}
								aria-label="View Balance Breakdown"
								className="w-full bg-[#FFFFFF] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100/80 cursor-pointer focus:outline-none active:scale-[0.99] transition-transform flex flex-col gap-4"
							>
								<div className="flex items-start justify-between">
									<div className="flex flex-col text-left">
										<span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-0.5 select-none">
											Remaining Balance
										</span>
										<span
											className="text-[34px] leading-tight tracking-tight font-bold tabular-nums text-[#059669]"
											data-testid="hero-balance"
										>
											<AnimatedNumber
												value={summary.availableBalance}
											/>
										</span>
										<span className="text-[13px] text-[#6B7280] font-medium tracking-tight tabular-nums select-none mt-1">
											remaining of $
											{summary.basePaycheck.toFixed(2)}{' '}
											base check
										</span>
									</div>
									<div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#059669] text-[12px] font-semibold tracking-tight shadow-sm shrink-0">
										<span className="text-[13px]">⏱️</span>
										<span>
											{summary.unspentWorkHours} hrs left
										</span>
									</div>
								</div>

								{/* Dual-tone Progress Track: 6px bar with percent left */}
								<div className="w-full h-[6px] bg-[#E5E7EB] rounded-full overflow-hidden flex">
									<div
										className="h-full bg-[#10B981] rounded-full transition-all duration-300"
										style={{
											width: `${Math.min(100, Math.max(0, summary.percentLeft))}%`,
										}}
									/>
								</div>
							</div>
						</section>

						{/* Recent Transactions List with Swipe to Edit / Delete */}
						<div className="flex flex-col space-y-3 px-space-xs pt-2 pb-48">
							<div className="flex items-center justify-between text-on-surface-variant text-[12px] font-label-md tracking-wider uppercase px-1">
								<span>Recent Transactions</span>
								<button
									type="button"
									onClick={() => setIsDockExpanded(true)}
									className="normal-case font-body-sm text-[12px] text-outline hover:text-on-surface transition-colors cursor-pointer"
								>
									Activity
								</button>
							</div>

							<div
								className="flex flex-col bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden"
								data-testid="transactions-list"
							>
								{filteredTransactions.length === 0 ? (
									<div className="p-6 text-center text-on-surface-variant text-[14px]">
										No matching transactions found.
									</div>
								) : (
									filteredTransactions.map((tx, idx) => (
										<SwipeableTransactionItem
											key={tx.id}
											tx={tx}
											isLast={
												idx ===
												filteredTransactions.length - 1
											}
											onEdit={(transactionToEdit) =>
												setSelectedTxForDetail(
													transactionToEdit,
												)
											}
											onDelete={(id) => {
												txManager.removeTransaction(id);
												setTransactions(
													txManager.getAll(),
												);
												showToast(
													'Transaction deleted',
												);
											}}
										/>
									))
								)}
							</div>
						</div>

						{/* Ambient Feedback Banner */}
						<div
							className={`fixed bottom-52 inset-x-0 z-40 transition-opacity duration-300 pointer-events-none flex items-center justify-center ${
								toastMessage ? 'opacity-100' : 'opacity-0'
							}`}
							id="quickToast"
							role="status"
							aria-live="polite"
						>
							<div className="flex items-center justify-center py-2 px-4 rounded-full bg-primary text-on-primary text-body-sm font-body-sm shadow-md">
								<span className="material-symbols-outlined text-[14px] mr-1.5 text-secondary-fixed">
									check_circle
								</span>
								<span id="toastMsg">
									{toastMessage || 'Ready to log'}
								</span>
							</div>
						</div>

						{/* Dimmed Background Overlay - Fades in live with dragging */}
						<motion.div
							style={{
								opacity: bgDimOpacity,
								pointerEvents: isDockExpanded ? 'auto' : 'none',
							}}
							onClick={() => setIsDockExpanded(false)}
							className="fixed inset-0 bg-primary/40 backdrop-blur-[2px] z-45 cursor-pointer"
							aria-label="Close expanded action dock"
						/>

						{/* Persistent Bottom Action Dock - Morphs and Expands Upward with Drag */}
						<motion.div
							drag="y"
							dragConstraints={{
								top: 0,
								bottom: COLLAPSED_DOCK_Y,
							}}
							dragElastic={0.08}
							onDragEnd={(_, info: PanInfo) => {
								const currentY = dockY.get();
								if (isDockExpanded) {
									// Dragging down from expanded
									if (
										info.offset.y > 50 ||
										info.velocity.y > 150 ||
										currentY > 100
									) {
										setIsDockExpanded(false);
									} else {
										animate(dockY, 0, {
											type: 'spring',
											damping: 28,
											stiffness: 320,
										});
									}
								} else {
									// Dragging up from collapsed
									if (
										info.offset.y < -40 ||
										info.velocity.y < -150 ||
										currentY < 250
									) {
										setIsDockExpanded(true);
									} else {
										animate(dockY, COLLAPSED_DOCK_Y, {
											type: 'spring',
											damping: 28,
											stiffness: 320,
										});
									}
								}
							}}
							style={{ y: dockY }}
							className="fixed bottom-0 inset-x-0 max-w-[480px] mx-auto bg-white rounded-t-[28px] border-t border-gray-100 shadow-[0_-6px_25px_rgba(0,0,0,0.08)] flex flex-col z-50 overflow-hidden min-h-[570px] cursor-grab active:cursor-grabbing touch-none select-none"
						>
							{/* Grab Bar Handle */}
							<div
								onClick={() =>
									setIsDockExpanded((prev) => !prev)
								}
								className="w-full pt-3 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing focus:outline-none"
								role="button"
								tabIndex={0}
								aria-label={
									isDockExpanded
										? 'Drag down to collapse'
										: 'Drag up to expand'
								}
							>
								<div className="w-[36px] h-[4px] bg-[#E5E7EB] rounded-full" />
							</div>

							{/* Preset Quick-Action Row (Collapses height and fades out as dock rises) */}
							<motion.div
								style={{
									opacity: presetsOpacity,
									height: presetsHeight,
								}}
								className="overflow-hidden"
							>
								<div
									className="px-6 pt-1 pb-2 flex items-center justify-between overflow-x-auto no-scrollbar gap-2"
									onPointerDown={(e) => e.stopPropagation()}
								>
									{presets.slice(0, 4).map((preset) => {
										const isSelected =
											selectedPresetLabel ===
											preset.label;
										return (
											<button
												key={preset.id}
												type="button"
												onClick={() =>
													handlePresetClick(preset)
												}
												className="preset-btn flex flex-col items-center gap-1 focus:outline-none group cursor-pointer shrink-0"
											>
												<div
													className={`w-[42px] h-[42px] rounded-full flex items-center justify-center group-active:scale-95 transition-all ${
														isSelected
															? 'ring-2 ring-primary ring-offset-2'
															: ''
													}`}
													style={{
														backgroundColor:
															preset.bgColor,
														color: preset.iconColor,
													}}
												>
													<span className="material-symbols-outlined text-[20px]">
														{preset.icon}
													</span>
												</div>
												<span
													className={`text-[11px] font-medium ${
														isSelected
															? 'text-primary font-bold'
															: 'text-[#4B5563]'
													}`}
												>
													{preset.label}
												</span>
											</button>
										);
									})}

									<button
										type="button"
										onClick={() => {
											setEditingPreset(null);
											setActiveModal('preset');
										}}
										className="flex flex-col items-center gap-1 focus:outline-none group cursor-pointer shrink-0"
									>
										<div className="w-[42px] h-[42px] rounded-full bg-[#F3F4F6] border border-dashed border-gray-300 flex items-center justify-center text-[#9CA3AF] group-active:scale-95 transition-transform">
											<span className="material-symbols-outlined text-[20px]">
												add
											</span>
										</div>
										<span className="text-[11px] font-medium text-[#4B5563]">
											Add
										</span>
									</button>
								</div>
								<div className="w-full border-t border-gray-100" />
							</motion.div>

							{/* Money Input: Crossfades between compact left-aligned input and centered scaled display */}
							<div className="relative w-full min-h-[58px] flex items-center justify-center">
								{/* Ghost toggle button for income/expense: absolutely positioned to the left of the centered input */}
								<motion.div
									className="absolute left-6 inset-y-0 flex items-center z-10"
									initial={{ opacity: 0 }}
									animate={{
										opacity: isDockExpanded ? 1 : 0,
									}}
									transition={{
										duration: 0.3,
										ease: 'easeInOut',
									}}
								>
									<motion.button
										type="button"
										aria-label={
											dockType === 'expense'
												? 'Switch to income (add money)'
												: 'Switch to expense (spend money)'
										}
										onClick={() => {
											const nextType =
												dockType === 'expense'
													? 'income'
													: 'expense';
											setDockType(nextType);
											const targetCats =
												nextType === 'income'
													? INCOME_CATEGORIES
													: EXPENSE_CATEGORIES;
											setSelectedCategory(
												targetCats[0].id,
											);
										}}
										animate={{
											backgroundColor:
												dockType === 'income'
													? 'rgb(236, 253, 245)'
													: 'rgba(0, 0, 0, 0)',
											borderColor:
												dockType === 'income'
													? 'rgb(16, 185, 129)'
													: 'rgb(148, 163, 184)',
											borderStyle:
												dockType === 'income'
													? 'solid'
													: 'dashed',
											color:
												dockType === 'income'
													? 'rgb(5, 150, 105)'
													: 'rgb(100, 116, 139)',
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
											key={dockType}
											initial={{
												rotate:
													dockType === 'income'
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
											{dockType === 'income'
												? 'add'
												: 'remove'}
										</motion.span>
									</motion.button>
								</motion.div>

								{/* Centered Scaled Display */}
								<motion.div
									style={
										{
											// opacity: expandedAmountOpacity,
											// pointerEvents: isDockExpanded
											// 	? 'auto'
											// 	: 'none',
										}
									}
									className="flex flex-col items-center justify-center text-center pt-1 pb-1 px-6 w-full"
								>
									<div className="flex items-baseline justify-center tracking-tight">
										<span className="font-headline-lg text-headline-lg font-bold text-on-surface-variant mr-1">
											$
										</span>
										<span
											className="font-numeric-entry text-numeric-entry text-on-surface font-bold tabular-nums"
											id="amount-display"
											data-testid="log-amount-display"
											onClick={() =>
												setIsDockExpanded(true)
											}
										>
											{dockAmount || '0.00'}
										</span>
									</div>
									{/* Psychology / Mindful Metric Badge */}
									{isDockExpanded && (
										<div className="mt-1 flex items-center gap-1.5 px-3 py-1 bg-surface-container-low rounded-full">
											<span className="material-symbols-outlined text-on-surface-variant text-[15px]">
												schedule
											</span>
											<span
												className="font-label-md text-label-md text-on-surface-variant font-medium tabular-nums"
												id="work-hours-metric"
												data-testid="log-work-hours-metric"
											>
												{calculateWorkHoursLabel(
													dockAmount || '0',
													incomeSettings.hourlyWage,
												)}
											</span>
										</div>
									)}
								</motion.div>
							</div>

							{/* Keypad, Categories, Note, and Log Button - Always in DOM and revealed as dock rises */}
							<motion.div
								className="flex flex-col px-6 pb-6 pt-1"
								onPointerDown={(e) => e.stopPropagation()}
								initial={{ opacity: 0 }}
								// Automatically transitions when isDockExpanded changes
								animate={{ opacity: isDockExpanded ? 1 : 0 }}
								transition={{
									duration: 0.3,
									ease: 'easeInOut',
								}}
							>
								{/* Category Selector Carousel */}
								<div className="mt-2 mb-3">
									<div className="flex items-center justify-between mb-2 px-1">
										<span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">
											Category
										</span>
										<span
											className={`text-[11px] font-semibold tracking-wide uppercase ${
												dockType === 'income'
													? 'text-emerald-600'
													: 'text-gray-400'
											}`}
										>
											{dockType === 'income'
												? 'Income Source'
												: 'Expense Type'}
										</span>
									</div>
									<div
										className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
										id="category-pills"
									>
										<AnimatePresence mode="wait">
											<motion.div
												key={dockType}
												initial={{
													opacity: 0,
													y: 6,
												}}
												animate={{
													opacity: 1,
													y: 0,
												}}
												exit={{
													opacity: 0,
													y: -6,
												}}
												transition={{
													duration: 0.2,
												}}
												className="flex items-center gap-2 w-full"
											>
												{currentCategories.map(
													(cat) => {
														const isSelected =
															selectedCategory.toLowerCase() ===
															cat.id.toLowerCase();
														return (
															<button
																key={cat.id}
																type="button"
																onClick={() =>
																	setSelectedCategory(
																		cat.id,
																	)
																}
																className={`category-pill flex items-center gap-1.5 rounded-full font-label-md text-label-md transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer ${
																	isSelected
																		? 'px-4 py-2 bg-primary text-on-primary shadow-sm'
																		: 'px-3.5 py-2 bg-surface-container text-on-surface'
																}`}
															>
																<span className="text-sm">
																	{cat.emoji}
																</span>
																<span>
																	{cat.label}
																</span>
															</button>
														);
													},
												)}
											</motion.div>
										</AnimatePresence>
									</div>
								</div>

								{/* Optional Note Container */}
								<div className="mb-4">
									<div className="flex items-center gap-2.5 px-3 py-2 bg-surface-container-low rounded-xl">
										<span className="material-symbols-outlined text-outline text-[18px] translate-y-[1px] select-none">
											edit_note
										</span>
										<input
											aria-label="What was this for? (optional)"
											className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
											maxLength={40}
											placeholder="What was this for? (optional)"
											type="text"
											value={dockNote}
											onChange={(e) =>
												setDockNote(e.target.value)
											}
										/>
									</div>
								</div>

								{/* Custom iOS Numeric Keypad */}
								<div
									className="grid grid-cols-3 gap-2 mb-4"
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
											onClick={() =>
												handleKeypadClick(val)
											}
											className="num-key h-14 rounded-full bg-transparent hover:bg-surface-container-low font-headline-lg text-headline-lg font-bold text-on-surface flex items-center justify-center transition-all active:scale-95 active:bg-surface-container cursor-pointer"
										>
											{val}
										</button>
									))}
									<button
										type="button"
										aria-label="Backspace"
										onClick={() =>
											handleKeypadClick('back')
										}
										className="num-key h-14 rounded-full bg-transparent hover:bg-surface-container-low font-headline-lg text-headline-lg font-bold text-on-surface flex items-center justify-center transition-all active:scale-95 active:bg-surface-container cursor-pointer"
									>
										<span className="material-symbols-outlined text-[28px]">
											backspace
										</span>
									</button>
								</div>

								{/* Primary Action CTA */}
								<button
									type="button"
									id="save-expense-btn"
									disabled={isLoggingAction !== 'idle'}
									onClick={handleCommitDockExpense}
									className={`w-full h-[52px] rounded-xl font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap ${
										isLoggingAction === 'success'
											? 'bg-emerald-600 text-white'
											: 'bg-primary text-on-primary'
									}`}
								>
									{isLoggingAction === 'spinning' ? (
										<span className="material-symbols-outlined text-[22px] animate-spin">
											progress_activity
										</span>
									) : isLoggingAction === 'success' ? (
										<motion.span
											initial={{ scale: 0.5 }}
											animate={{ scale: 1 }}
											className="material-symbols-outlined text-[24px]"
										>
											check_circle
										</motion.span>
									) : (
										<>
											<span>
												{dockType === 'income'
													? 'Log Income'
													: 'Log Expense'}
											</span>
											<span className="material-symbols-outlined text-[18px]">
												arrow_forward
											</span>
										</>
									)}
								</button>
							</motion.div>
						</motion.div>
					</div>
				)}

				{activeTab === 'analytics' && (
					<AnalyticsView
						transactions={transactions}
						summary={summary}
						settings={incomeSettings}
						onOpenBreakdown={() => setActiveModal('breakdown')}
					/>
				)}

				{activeTab === 'presets' && (
					<PresetsView
						presets={presets}
						onTriggerPresetLog={handleQuickLogPresetFromTab}
						onOpenNewPresetModal={() => {
							setEditingPreset(null);
							setActiveModal('preset');
						}}
						onEditPreset={(preset) => {
							setEditingPreset(preset);
							setActiveModal('preset');
						}}
						onDeletePreset={(id) =>
							setPresets((prev) =>
								prev.filter((p) => p.id !== id),
							)
						}
					/>
				)}

				{activeTab === 'settings' && (
					<SettingsView
						settings={incomeSettings}
						onUpdateSettings={setIncomeSettings}
						summary={summary}
						transactions={transactions}
						showToast={showToast}
						onOpenSheet={(sheet) => {
							if (sheet === 'log') {
								setActiveTab('dashboard');
								setIsDockExpanded(true);
							} else {
								setActiveModal(sheet);
							}
						}}
					/>
				)}
			</main>

			{/* Bottom Navigation Tab Bar - Slides down to hide when dock is dragged up */}
			<motion.nav
				aria-label="Primary Bottom Navigation"
				style={{ y: navY }}
				className="fixed bottom-0 inset-x-0 z-35 bg-surface-container-lowest shadow-[0_-2px_12px_rgba(0,0,0,0.03)] z-50"
			>
				<div className="flex justify-around items-center h-16 max-w-[480px] mx-auto px-margin-sm">
					<button
						type="button"
						onClick={() => setActiveTab('dashboard')}
						aria-current={
							activeTab === 'dashboard' ? 'page' : undefined
						}
						className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-all gap-0.5 cursor-pointer ${
							activeTab === 'dashboard'
								? 'text-primary font-bold'
								: 'text-on-surface-variant hover:text-on-surface'
						}`}
					>
						<span className="material-symbols-outlined text-[22px]">
							grid_view
						</span>
						<span className="font-label-sm text-label-sm">
							Dashboard
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab('analytics')}
						aria-current={
							activeTab === 'analytics' ? 'page' : undefined
						}
						className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-all gap-0.5 cursor-pointer ${
							activeTab === 'analytics'
								? 'text-primary font-bold'
								: 'text-on-surface-variant hover:text-on-surface'
						}`}
					>
						<span className="material-symbols-outlined text-[22px]">
							bar_chart
						</span>
						<span className="font-label-sm text-label-sm">
							Analytics
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab('presets')}
						aria-current={
							activeTab === 'presets' ? 'page' : undefined
						}
						className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-all gap-0.5 cursor-pointer ${
							activeTab === 'presets'
								? 'text-primary font-bold'
								: 'text-on-surface-variant hover:text-on-surface'
						}`}
					>
						<span className="material-symbols-outlined text-[22px]">
							tune
						</span>
						<span className="font-label-sm text-label-sm">
							Presets
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab('settings')}
						aria-current={
							activeTab === 'settings' ? 'page' : undefined
						}
						className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-all gap-0.5 cursor-pointer ${
							activeTab === 'settings'
								? 'text-primary font-bold'
								: 'text-on-surface-variant hover:text-on-surface'
						}`}
					>
						<span className="material-symbols-outlined text-[22px]">
							settings
						</span>
						<span className="font-label-sm text-label-sm">
							Settings
						</span>
					</button>
				</div>
			</motion.nav>

			{/* Screen 2: Preset Configuration Bottom Sheet Modal - Slides out with spring animation */}
			<PresetSheetModal
				isOpen={activeModal === 'preset'}
				onClose={() => {
					setActiveModal('none');
					setEditingPreset(null);
				}}
				onSavePreset={handleSaveNewPreset}
				mileageRate={incomeSettings.mileageRate}
				initialPreset={editingPreset || undefined}
			/>

			{/* Screen 3: Balance Breakdown Bottom Sheet Modal - Slides out with spring animation */}
			<BalanceBreakdownModal
				isOpen={activeModal === 'breakdown'}
				onClose={() => setActiveModal('none')}
				summary={summary}
				settings={incomeSettings}
				onOpenIncomeSettings={() => {
					setActiveModal('none');
					setActiveTab('settings');
				}}
			/>

			{/* Transaction Detail & Edit Modal */}
			<TransactionDetailModal
				transaction={selectedTxForDetail}
				onClose={() => setSelectedTxForDetail(null)}
				onSave={(updated) => {
					txManager.updateTransaction(updated.id, updated);
					setTransactions(txManager.getAll());
					showToast(`Updated "${updated.title}"`);
				}}
				onDelete={(id) => {
					txManager.removeTransaction(id);
					setTransactions(txManager.getAll());
					showToast('Transaction deleted');
				}}
			/>
		</div>
	);
}
