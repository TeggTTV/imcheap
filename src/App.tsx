import { useState, useEffect, useMemo } from 'react';
import {
	motion,
	MotionConfig,
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
import {
	PresetSheetModal,
	EXPENSE_ICONS,
	INCOME_ICONS,
} from './components/PresetSheetModal';
import { BalanceBreakdownModal } from './components/BalanceBreakdownModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { SwipeableTransactionItem } from './components/SwipeableTransactionItem';
import { TopBar } from './components/TopBar';
import { OnboardingModal } from './components/OnboardingModal';
import {
	AnalyticsView,
	PresetsView,
	SettingsView,
	SettingsSubpage,
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
	const [dockIconIndex, setDockIconIndex] = useState<number>(0);
	const [customDockIcon, setCustomDockIcon] = useState<{
		icon: string;
		bgColor: string;
		iconColor: string;
	} | null>(null);

	const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('imcheap_animations');
			if (saved !== null) {
				return saved !== 'false';
			}
		}
		return true;
	});

	const handleToggleAnimations = (enabled: boolean) => {
		setAnimationsEnabled(enabled);
		if (typeof window !== 'undefined') {
			localStorage.setItem('imcheap_animations', String(enabled));
		}
	};

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

	const [txManager] = useState<TransactionManager>(
		() => new TransactionManager(INITIAL_TRANSACTIONS),
	);
	const [transactions, setTransactions] = useState<Transaction[]>(() =>
		txManager.getAll(),
	);
	const [presets, setPresets] = useState<PresetItem[]>(() => {
		if (typeof window !== 'undefined') {
			try {
				const savedPresets = localStorage.getItem('imcheap_presets');
				if (savedPresets) {
					const parsed = JSON.parse(savedPresets);
					if (Array.isArray(parsed) && parsed.length > 0) {
						return parsed;
					}
				}
			} catch (e) {
				console.warn('Failed to parse saved presets from localStorage', e);
			}
		}
		return INITIAL_PRESETS;
	});
	const [incomeSettings, setIncomeSettings] = useState<IncomeSettings>(() => {
		let initial = { ...INITIAL_INCOME_SETTINGS };
		if (typeof window !== 'undefined') {
			try {
				const savedWage = localStorage.getItem('imcheap_wage');
				if (savedWage) {
					const wageVal = parseFloat(savedWage);
					if (!isNaN(wageVal) && wageVal > 0) {
						initial.hourlyWage = wageVal;
					}
				}
				const savedVehicle = localStorage.getItem('imcheap_vehicle');
				if (savedVehicle) {
					const vehicle = JSON.parse(savedVehicle);
					if (vehicle?.mpg && vehicle?.gasPrice) {
						const rate = Number((vehicle.gasPrice / vehicle.mpg).toFixed(2));
						initial.mileageRate = rate;
					}
				}
			} catch (e) {
				console.warn('Failed to load income settings from localStorage', e);
			}
		}
		return initial;
	});

	const [initialSettingsSubpage, setInitialSettingsSubpage] =
		useState<SettingsSubpage>('main');

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

	// Onboarding state
	const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
		if (typeof window !== 'undefined') {
			try {
				const completed = localStorage.getItem('imcheap_onboarding_completed');
				if (!completed) {
					return true;
				}
			} catch (e) {
				console.warn('Failed to check onboarding completed flag', e);
			}
		}
		return false;
	});

	const summary = useMemo(
		() => calculateBalanceSummary(transactions, incomeSettings),
		[transactions, incomeSettings],
	);

	const filteredTransactions = useMemo(() => {
		return txManager.search(searchQuery);
	}, [txManager, transactions, searchQuery]);

	useEffect(() => {
		if (!toastMessage) return;
		const timer = setTimeout(() => {
			setToastMessage(null);
		}, 1800);
		return () => clearTimeout(timer);
	}, [toastMessage]);

	const handlePresetClick = (preset: PresetItem) => {
		// Prefill dock with preset data and open dock for review / editing / logging
		const txType = preset.type || 'expense';
		setDockAmount(preset.calculatedAmount.toFixed(2));
		setDockType(txType);
		setSelectedCategory(preset.category);
		setSelectedPresetLabel(preset.label);
		setDockNote(preset.title);
		setCustomDockIcon({
			icon: preset.icon,
			bgColor: preset.bgColor,
			iconColor: preset.iconColor,
		});
		if (activeTab !== 'dashboard') {
			setActiveTab('dashboard');
		}
		setIsDockExpanded(true);
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
	const iconList = dockType === 'income' ? INCOME_ICONS : EXPENSE_ICONS;
	const currentDockIcon =
		customDockIcon || iconList[dockIconIndex % iconList.length];

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

			txManager.createTransaction({
				title:
					dockNote.trim() ||
					(matchedPreset ? matchedPreset.title : catMeta.label),
				category: catMeta.label,
				amount: finalAmount,
				type: dockType,
				icon: matchedPreset ? matchedPreset.icon : currentDockIcon.icon,
				note: dockNote.trim() || undefined,
			});

			setTransactions(txManager.getAll());

			setTimeout(() => {
				setIsLoggingAction('idle');
				setDockAmount('');
				setSelectedPresetLabel(null);
				setDockNote('');
				setDockIconIndex(0);
				setCustomDockIcon(null);
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
			setEditingPreset(null);
		} else {
			const newPreset: PresetItem = {
				...presetData,
				id: `preset-${Date.now()}`,
			};
			setPresets((prev) => [...prev, newPreset]);
		}
	};

	const handleQuickLogPresetFromTab = (preset: PresetItem) => {
		const txType = preset.type || 'expense';
		const newTx = txManager.createTransaction({
			title: preset.title,
			category: preset.category,
			amount: preset.calculatedAmount,
			type: txType,
			icon: preset.icon,
		});
		setTransactions(txManager.getAll());
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
		<MotionConfig reducedMotion={animationsEnabled ? 'never' : 'always'}>
			<div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col antialiased">
				{/* Top App Header */}
				<TopBar
					title={tabTitle}
					isSearchOpen={isSearchOpen}
					onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
					searchQuery={searchQuery}
					onSearchQueryChange={setSearchQuery}
					onOpenOnboarding={() => setIsOnboardingOpen(true)}
					onOpenProfile={() => setActiveTab('settings')}
				/>

				{/* Main Content Container */}
				<main
					className={`flex flex-col relative w-full max-w-120 mx-auto px-margin ${
						isSearchOpen ? 'pt-28' : 'pt-16'
					} ${
						activeTab === 'dashboard'
							? 'h-screen pb-24 overflow-hidden'
							: 'pb-28 min-h-screen'
					} bg-surface`}
				>
					{activeTab === 'dashboard' && (
						<div className="flex flex-col w-full min-h-0 flex-1 overflow-y-auto no-scrollbar pb-36 pt-2 px-space-xs space-y-5">
							{/* Current Runway Hero Card */}
							<section className="w-full">
								<div
									onClick={() => setActiveModal('breakdown')}
									onKeyDown={(e) => {
										if (
											e.key === 'Enter' ||
											e.key === ' '
										) {
											e.preventDefault();
											setActiveModal('breakdown');
										}
									}}
									role="button"
									tabIndex={0}
									aria-label="View Balance Breakdown"
									className="w-full bg-[#FFFFFF] rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100 cursor-pointer focus:outline-none active:scale-[0.99] transition-transform flex flex-col gap-4 select-none"
								>
									{/* Header row: CURRENT RUNWAY and Badge */}
									<div className="flex items-center justify-between">
										<span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
											CURRENT RUNWAY
										</span>
										<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-secondary text-[12px] font-bold tracking-tight">
											<span>★</span>
											<span>
												On Track (+$$
												{summary.availableBalance > 0
													? (
															summary.availableBalance *
															0.37
														).toFixed(0)
													: '0'}{' '}
												buffer)
											</span>
										</div>
									</div>

									{/* Main Hours Left Display */}
									<div className="flex items-baseline gap-2">
										<span
											className="text-[36px] sm:text-[40px] leading-none font-extrabold text-[#111111] tracking-tight tabular-nums"
											data-testid="hero-balance"
										>
											<AnimatedNumber
												value={
													parseFloat(
														summary.unspentWorkHours,
													) || 0
												}
												enabled={animationsEnabled}
												decimals={1}
												prefix=""
											/>{' '}
											hrs
										</span>
										<span className="text-[20px] font-bold text-[#111111]">
											available
										</span>
									</div>

									{/* Subtext: remaining of paycheck */}
									<div className="text-[14px] text-[#4B5563] font-medium tracking-tight">
										${summary.availableBalance.toFixed(2)}{' '}
										remaining of $
										{(
											summary.basePaycheck +
											(summary.totalIncome || 0)
										).toFixed(2)}{' '}
										paycheck
									</div>

									{/* Green Progress Bar */}
									<div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden flex">
										<div
											className="h-full bg-[#4ADE80] rounded-full transition-all duration-300"
											style={{
												width: `${Math.min(100, Math.max(0, summary.percentLeft))}%`,
											}}
										/>
									</div>

									{/* Footer row: Safe spend and days to payday */}
									<div className="flex items-center justify-between text-[13px] text-[#4B5563] font-medium pt-0.5">
										<div>
											Safe spend:{' '}
											<span className="font-bold text-[#111111]">
												$
												{(
													summary.availableBalance / 8
												).toFixed(2)}
												/day
											</span>
										</div>
										<div className="text-[#6B7280]">
											4 days to payday
										</div>
									</div>
								</div>
							</section>

							{/* Quick Log Presets Section */}
							<section className="w-full flex flex-col gap-2.5">
								<div className="flex items-center justify-between px-1">
									<span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
										QUICK LOG
									</span>
									<span className="text-[12px] text-[#6B7280] font-normal">
										Tap to record
									</span>
								</div>

								{/* Presets Horizontal Scroll / Grid */}
								<div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
									{presets.map((preset) => (
										<button
											key={preset.id}
											type="button"
											onClick={() =>
												handlePresetClick(preset)
											}
											className="flex flex-col items-center bg-white justify-center active:scale-95 transition-all rounded-2xl p-3 w-21 h-24.5 shrink-0 cursor-pointer shadow-xs"
										>
											<div className="w-10 h-10 rounded-full flex items-center justify-center mb-2">
												<span
													className="material-symbols-outlined text-[20px]"
													style={{
														color:
															preset.iconColor ||
															'#111111',
													}}
												>
													{preset.icon}
												</span>
											</div>
											<span className="text-[12px] font-bold text-[#111111] truncate w-full text-center">
												{preset.label}
											</span>
											<span className="text-[11px] text-[#6B7280] font-medium tabular-nums mt-0.5">
												$
												{preset.calculatedAmount.toFixed(
													2,
												)}
											</span>
										</button>
									))}

									{/* Add Preset button */}
									<button
										type="button"
										onClick={() => {
											setEditingPreset(null);
											setActiveModal('preset');
										}}
										aria-label="Add new preset"
										className="flex flex-col items-center justify-center bg-[#F4F7FB] hover:bg-[#EBF0F7] active:scale-95 transition-all rounded-[20px] p-3 w-21 h-24.5 shrink-0 cursor-pointer border border-dashed border-gray-300 text-gray-400"
									>
										<div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center mb-2">
											<span className="material-symbols-outlined text-[20px] text-gray-500">
												add
											</span>
										</div>
										<span className="text-[12px] font-medium text-gray-500">
											Add
										</span>
									</button>
								</div>
							</section>

							{/* Recent Activity Section */}
							<section className="w-full flex flex-col gap-2.5">
								<div className="flex items-center justify-between px-1">
									<span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
										RECENT ACTIVITY
									</span>
									<button
										type="button"
										onClick={() => setIsDockExpanded(true)}
										className="text-[13px] text-[#4B5563] font-semibold hover:text-[#111111] flex items-center gap-0.5 cursor-pointer"
									>
										<span>See All</span>
										<span className="text-[14px]">→</span>
									</button>
								</div>

								{/* White Card Containing Transactions List */}
								<div
									className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden"
									data-testid="transactions-list"
								>
									{filteredTransactions.length === 0 ? (
										<div className="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
											<div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
												<span className="material-symbols-outlined text-[20px]">
													receipt_long
												</span>
											</div>
											<span className="text-[14px] font-semibold text-[#111111]">
												{searchQuery ? 'No matching transactions found.' : 'No transactions recorded yet.'}
											</span>
											{!searchQuery && (
												<span className="text-[12px] text-[#6B7280]">
													Tap the dock below or pick a preset to log your first expense.
												</span>
											)}
										</div>
									) : (
										<div className="divide-y divide-gray-100">
											{filteredTransactions
												.slice(0, 5)
												.map((tx, idx) => (
													<SwipeableTransactionItem
														key={tx.id}
														tx={tx}
														hourlyWage={
															incomeSettings.hourlyWage
														}
														isLast={
															idx ===
															Math.min(
																filteredTransactions.length,
																5,
															) -
																1
														}
														onEdit={(
															transactionToEdit,
														) =>
															setSelectedTxForDetail(
																transactionToEdit,
															)
														}
														onDelete={(id) => {
															txManager.removeTransaction(
																id,
															);
															setTransactions(
																txManager.getAll(),
															);
														}}
													/>
												))}
										</div>
									)}
								</div>
							</section>

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

							{/* Dimmed Background Overlay */}
							<motion.div
								style={{
									opacity: bgDimOpacity,
									pointerEvents: isDockExpanded
										? 'auto'
										: 'none',
								}}
								onClick={() => setIsDockExpanded(false)}
								className="fixed inset-0 bg-primary/40 backdrop-blur-[2px] z-45 cursor-pointer"
								aria-label="Close expanded action dock"
							/>

							{/* Persistent Bottom Action Dock */}
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
								className="fixed bottom-0 inset-x-0 max-w-120 mx-auto bg-white rounded-t-[28px] border-t border-gray-100 shadow-[0_-6px_25px_rgba(0,0,0,0.08)] flex flex-col z-50 overflow-hidden min-h-142.5 cursor-grab active:cursor-grabbing touch-none select-none"
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
									<div className="w-9 h-[4px] bg-[#E5E7EB] rounded-full" />
								</div>

								{/* Money Input */}
								<div className="relative w-full min-h-14.5 flex items-center justify-center">
									{/* Ghost toggle button for income/expense */}
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
												setDockIconIndex(0);
												setCustomDockIcon(null);
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
														: 'rgb(218, 61, 74)',
												borderStyle:
													dockType === 'income'
														? 'solid'
														: 'dashed',
												color:
													dockType === 'income'
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
									<motion.div className="flex flex-col items-center justify-center text-center pt-1 pb-1 px-6 w-full">
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
										<motion.div
											initial={{
												opacity: 0,
											}}
											animate={{
												opacity: isDockExpanded ? 1 : 0,
											}}
											transition={{
												duration: 0.1,
											}}
											className="text-body-sm font-body-sm text-outline tracking-tight tabular-nums mt-0.5"
											data-testid="dock-labor-hours"
										>
											{calculateWorkHoursLabel(
												dockAmount,
												incomeSettings.hourlyWage,
											)}
										</motion.div>
									</motion.div>
								</div>

								{/* Expanded Controls: Note, Category Chips, Keypad & CTA Button */}
								<motion.div
									initial={false}
									animate={{
										opacity: isDockExpanded ? 1 : 0,
										height: isDockExpanded ? 'auto' : 0,
									}}
									transition={{ duration: 0.25 }}
									className="flex flex-col px-6 pb-6 pt-1 overflow-hidden"
								>
									{/* Note Input */}
									<div className="flex items-center gap-3 bg-surface-container-low rounded-xl px-4 py-2.5 mb-3 border border-transparent focus-within:border-primary/20">
										<button
											type="button"
											onClick={() => {
												if (customDockIcon) {
													const matchIdx =
														iconList.findIndex(
															(item) =>
																item.icon ===
																customDockIcon.icon,
														);
													setDockIconIndex(
														(matchIdx >= 0
															? matchIdx
															: 0) + 1,
													);
													setCustomDockIcon(null);
												} else {
													setDockIconIndex(
														(i) => i + 1,
													);
												}
											}}
											aria-label="Cycle transaction icon"
											className={`relative w-10 h-10 rounded-full ${currentDockIcon.bgColor} flex items-center justify-center shrink-0 active:scale-95 transition-transform`}
										>
											<span
												className="material-symbols-outlined text-[20px]"
												style={{
													color: currentDockIcon.iconColor,
												}}
											>
												{currentDockIcon.icon}
											</span>
											<div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-xs overflow-hidden">
												<span className="material-symbols-outlined text-[10px] leading-none scale-75">
													edit
												</span>
											</div>
										</button>
										<div className="flex-1 min-w-0 flex items-center">
											<input
												aria-label="What was this for?"
												className="w-full bg-transparent p-0 m-0 border-none outline-none font-headline-sm text-headline-sm font-semibold text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-0"
												type="text"
												maxLength={40}
												placeholder={
													dockType === 'income'
														? 'e.g. Paycheck'
														: 'e.g. Grocery Store'
												}
												value={dockNote}
												onChange={(e) =>
													setDockNote(e.target.value)
												}
											/>
										</div>
									</div>

									{/* Category Selection Chips */}
									{/* <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-2">
										{currentCategories.map((cat) => {
											const isSelected =
												selectedCategory.toLowerCase() ===
												cat.id.toLowerCase();
											return (
												<button
													key={cat.id}
													type="button"
													onClick={() => {
														setSelectedCategory(
															cat.id,
														);
														setSelectedPresetLabel(
															null,
														);
													}}
													className={`px-3.5 py-1.5 rounded-full text-body-sm font-medium flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
														isSelected
															? 'bg-primary text-on-primary shadow-xs'
															: 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
													}`}
												>
													<span>{cat.emoji}</span>
													<span>{cat.label}</span>
												</button>
											);
										})}
									</div> */}

									{/* Numeric Keypad */}
									<div className="grid grid-cols-3 gap-y-1 gap-x-6 w-full max-w-72 mx-auto mb-4">
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
										className={`w-full h-13 rounded-xl font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap ${
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
							onPrefillPresetToDock={(preset) => {
								handlePresetClick(preset);
							}}
							onReorderPresets={(newOrder) => {
								setPresets(newOrder);
							}}
							onDeletePreset={(id) =>
								setPresets((prev) =>
									prev.filter((p) => p.id !== id),
								)
							}
						/>
					)}

					{activeTab === 'settings' && (
						<motion.div
							key="settings"
							initial={{ x: 60, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: -60, opacity: 0 }}
							transition={{ duration: 0.25, ease: 'easeOut' }}
							className="w-full"
						>
							<SettingsView
								key={initialSettingsSubpage}
								initialSubpage={initialSettingsSubpage}
								settings={incomeSettings}
								onUpdateSettings={setIncomeSettings}
								summary={summary}
								transactions={transactions}
								animationsEnabled={animationsEnabled}
								onToggleAnimations={handleToggleAnimations}
								onOpenSheet={(sheet) => {
									if (sheet === 'log') {
										setActiveTab('dashboard');
										setIsDockExpanded(true);
									} else {
										setActiveModal(sheet);
									}
								}}
							/>
						</motion.div>
					)}
				</main>

				{/* Bottom Navigation Tab Bar - Slides down to hide when dock is dragged up */}
				<motion.nav
					aria-label="Primary Bottom Navigation"
					style={{ y: navY }}
					className="fixed bottom-0 inset-x-0 z-50 bg-surface-container-lowest shadow-[0_-2px_12px_rgba(0,0,0,0.03)]"
				>
					<div className="flex justify-around items-center h-16 max-w-120 mx-auto px-margin-sm">
						<button
							type="button"
							onClick={() => setActiveTab('dashboard')}
							aria-current={
								activeTab === 'dashboard' ? 'page' : undefined
							}
							className={`flex flex-col items-center justify-center min-w-14 h-12 transition-all gap-0.5 cursor-pointer ${
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
							className={`flex flex-col items-center justify-center min-w-14 h-12 transition-all gap-0.5 cursor-pointer ${
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
							className={`flex flex-col items-center justify-center min-w-14 h-12 transition-all gap-0.5 cursor-pointer ${
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
							onClick={() => {
								setInitialSettingsSubpage('main');
								setActiveTab('settings');
							}}
							aria-current={
								activeTab === 'settings' ? 'page' : undefined
							}
							className={`flex flex-col items-center justify-center min-w-14 h-12 transition-all gap-0.5 cursor-pointer ${
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
						setInitialSettingsSubpage('paycheck');
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
					}}
					onDelete={(id) => {
						txManager.removeTransaction(id);
						setTransactions(txManager.getAll());
					}}
				/>

				{/* Interactive Multi-Screen Onboarding Walkthrough */}
				<OnboardingModal
					isOpen={isOnboardingOpen}
					onClose={() => setIsOnboardingOpen(false)}
					onComplete={({ wage, vehicle, presets: initialPresets }) => {
						const mileageRate = Number(
							(vehicle.gasPrice / vehicle.mpg).toFixed(2),
						);
						setIncomeSettings((prev) => ({
							...prev,
							hourlyWage: wage,
							mileageRate,
						}));
						setPresets(initialPresets);
					}}
				/>
			</div>
		</MotionConfig>
	);
}
function AnimatedNumber({
	value,
	enabled = true,
	decimals = 2,
	prefix = '$',
}: {
	value: number;
	enabled?: boolean;
	decimals?: number;
	prefix?: string;
}) {
	const [displayVal, setDisplayVal] = useState(value);

	useEffect(() => {
		if (!enabled) {
			setDisplayVal(value);
			return;
		}
		const controls = animate(displayVal, value, {
			duration: 0.8,
			ease: [0.16, 1, 0.3, 1],
			onUpdate: (latest) => setDisplayVal(latest),
		});
		return () => controls.stop();
	}, [value, enabled]);

	return (
		<>
			{prefix}
			{(enabled ? displayVal : value).toFixed(decimals)}
		</>
	);
}
