import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
	IncomeSettings,
	BalanceSummary,
	Transaction,
} from '../utils/expenseMath';
import { SetActionFeedbackButton } from './SetActionFeedbackButton';
import { SubpageHeader } from './SubpageHeader';

export type SettingsSubpage =
	| 'main'
	| 'paycheck'
	| 'vehicle'
	| 'past_cycles'
	| 'export'
	| 'tax_buffer'
	| 'fuel_economy'
	| 'gas_price'
	| 'tank_capacity';

interface ShiftItem {
	id: string;
	hours: number;
}

export interface SettingsViewProps {
	settings: IncomeSettings;
	onUpdateSettings: (next: IncomeSettings) => void;
	summary?: BalanceSummary;
	transactions?: Transaction[];
	onOpenSheet?: (sheet: 'preset' | 'breakdown' | 'log') => void;
	initialSubpage?: SettingsSubpage;
	animationsEnabled?: boolean;
	onToggleAnimations?: (enabled: boolean) => void;
}

const slideVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? 100 : -100,
		opacity: 0,
	}),
	center: {
		x: 0,
		opacity: 1,
	},
	exit: (direction: number) => ({
		x: direction > 0 ? -100 : 100,
		opacity: 0,
	}),
};

export const SettingsView: React.FC<SettingsViewProps> = ({
	settings,
	onUpdateSettings,
	summary = {
		basePaycheck: 0.0,
		loggedExpenses: 0.0,
		totalIncome: 0.0,
		availableBalance: 0.0,
		percentLeft: 100,
		unspentWorkHours: '0.0',
		itemCount: 0,
	},
	transactions = [],
	initialSubpage = 'main',
	animationsEnabled = true,
	onToggleAnimations,
}) => {
	const [currentSubpage, setCurrentSubpage] =
		useState<SettingsSubpage>(initialSubpage);
	const [direction, setDirection] = useState<number>(1);

	const navigateTo = (nextPage: SettingsSubpage) => {
		setDirection(1);
		setCurrentSubpage(nextPage);
	};

	const navigateBack = (targetPage: SettingsSubpage = 'main') => {
		setDirection(-1);
		setCurrentSubpage(targetPage);
	};

	// Preferences toggles
	const [showTimeWorked, setShowTimeWorked] = useState(true);
	const [internalAnimations, setInternalAnimations] = useState(animationsEnabled);

	const isAnimationsActive = onToggleAnimations
		? animationsEnabled
		: internalAnimations;

	const handleToggleAnimations = () => {
		const next = !isAnimationsActive;
		if (onToggleAnimations) {
			onToggleAnimations(next);
		} else {
			setInternalAnimations(next);
		}
	};

	// Paycheck Engine State
	const [shifts, setShifts] = useState<ShiftItem[]>([]);
	const [currentShiftInput, setCurrentShiftInput] = useState<number>(8.5);
	const [taxBufferRate, setTaxBufferRate] = useState<number>(12); // percent
	const [tempTaxBuffer, setTempTaxBuffer] = useState<number>(12);
	const [paycheckToast, setPaycheckToast] = useState(false);

	// Vehicle & Transit State
	const mpgOptions = [25, 30, 35, 40];
	const gasOptions = [3.55, 3.95, 4.35, 4.79];
	const capOptions = [12.0, 14.0, 16.5, 18.0];
	const [mpgIdx, setMpgIdx] = useState<number | null>(1);
	const [customMpg, setCustomMpg] = useState<number | null>(null);
	const [customMpgInput, setCustomMpgInput] = useState('');

	const [gasIdx, setGasIdx] = useState<number | null>(1);
	const [customGas, setCustomGas] = useState<number | null>(null);
	const [customGasInput, setCustomGasInput] = useState('');

	const [capIdx, setCapIdx] = useState<number | null>(1);
	const [customCap, setCustomCap] = useState<number | null>(null);
	const [customCapInput, setCustomCapInput] = useState('');

	const [vehicleSaved, setVehicleSaved] = useState(false);

	// Export State
	const [exportRange, setExportRange] = useState<'current' | 'ytd' | 'all'>(
		'ytd',
	);
	const [includeExpenses, setIncludeExpenses] = useState(true);
	const [includeShifts, setIncludeShifts] = useState(true);
	const [includeMileage, setIncludeMileage] = useState(true);
	const [exportFormat, setExportFormat] = useState<'CSV' | 'JSON'>('CSV');
	const [exportingStatus, setExportingStatus] = useState<string | null>(null);

	// Helper calculations for Paycheck Engine
	const totalAccruedHours = shifts.reduce((sum, s) => sum + s.hours, 0);
	const wageRate = settings.hourlyWage;
	const grossEarned = totalAccruedHours * wageRate;
	const taxBufferAmt = grossEarned * (taxBufferRate / 100);
	const projectedCheck = grossEarned - taxBufferAmt;

	const handleAdjustShift = (delta: number) => {
		setCurrentShiftInput((prev) =>
			Math.max(0.5, Math.min(24, Math.round((prev + delta) * 10) / 10)),
		);
	};

	const handleAddShift = () => {
		const newShift: ShiftItem = {
			id: `shift-${Date.now()}`,
			hours: currentShiftInput,
		};
		setShifts((prev) => [...prev, newShift]);
		setPaycheckToast(true);
		setTimeout(() => setPaycheckToast(false), 1800);
	};

	const handleRemoveShift = (id: string) => {
		setShifts((prev) => prev.filter((s) => s.id !== id));
	};

	const handleClearAllShifts = () => {
		setShifts([]);
	};

	// Helper calculations for Vehicle Math
	const currentMpg = customMpg ?? (mpgIdx !== null ? mpgOptions[mpgIdx] : 29);
	const currentGas =
		customGas ?? (gasIdx !== null ? gasOptions[gasIdx] : 4.05);
	const currentCap =
		customCap ?? (capIdx !== null ? capOptions[capIdx] : 14.0);
	const vehicleCostPerMile = currentGas / currentMpg;
	const maxRange = Math.round(currentMpg * currentCap);
	const commuteCost = vehicleCostPerMile * 10;
	const wagePerMin = wageRate / 60;
	const commuteMinutes =
		wagePerMin > 0 ? (commuteCost / wagePerMin).toFixed(1) : '0';
	const tankCost = currentGas * currentCap;
	const tankHours = wageRate > 0 ? (tankCost / wageRate).toFixed(1) : '0';

	const handleSaveVehicleChanges = () => {
		setVehicleSaved(true);
		const newRate = Number(vehicleCostPerMile.toFixed(2));
		onUpdateSettings({
			...settings,
			mileageRate: newRate,
		});

		setTimeout(() => {
			setVehicleSaved(false);
		}, 1200);
	};

	// Past cycles history
	interface PastCycleItem {
		id: string;
		label: string;
		spent: number;
		check: number;
		surplus: number;
		isDeficit: boolean;
	}
	const pastCycles: PastCycleItem[] = [];
	const lifetimeSurplus = pastCycles.reduce((sum, c) => sum + c.surplus, 0);

	const handleExecuteExport = () => {
		setExportingStatus('GENERATING FILE...');
		setTimeout(() => {
			let content = '';
			const filename = `imcheap-export-${exportRange}.${exportFormat.toLowerCase()}`;
			if (exportFormat === 'JSON') {
				const payload = {
					range: exportRange,
					exportedAt: new Date().toISOString(),
					settings,
					expenses: includeExpenses ? transactions : [],
					shifts: includeShifts ? shifts : [],
					mileageBenchmark: includeMileage
						? {
								mpg: currentMpg,
								gasPrice: currentGas,
								costPerMile: vehicleCostPerMile,
							}
						: null,
				};
				content = JSON.stringify(payload, null, 2);
			} else {
				const rows: string[] = ['ID,Title,Category,Amount,Type,Date'];
				if (includeExpenses) {
					transactions.forEach((tx) => {
						rows.push(
							`"${tx.id}","${tx.title}","${tx.category}",${tx.amount.toFixed(2)},"${tx.type}","${tx.timestamp}"`,
						);
					});
				}
				content = rows.join('\n');
			}

			const blob = new Blob([content], {
				type: exportFormat === 'JSON' ? 'application/json' : 'text/csv',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			setExportingStatus('READY • EXPORT COMPLETE');
			setTimeout(() => {
				setExportingStatus(null);
			}, 1600);
		}, 600);
	};

	return (
		<div className="relative w-full overflow-hidden pb-24">
			<AnimatePresence initial={false} custom={direction} mode="wait">
				{/* SUBPAGE: TAX BUFFER */}
				{currentSubpage === 'tax_buffer' && (
					<motion.div
						key="tax_buffer"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="w-full flex flex-col"
					>
						<SubpageHeader
							title="Tax Buffer"
							backLabel="Paycheck"
							onBack={() => navigateBack('paycheck')}
						/>

						<div className="bg-white rounded-2xl p-5 border border-[#F3F4F6] shadow-sm space-y-4">
							<div>
								<span className="text-xs uppercase tracking-wider text-outline font-bold">
									Estimated Tax Withholding
								</span>
								<p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
									Choose a percentage buffer to deduct
									automatically from projected paycheck
									totals.
								</p>
							</div>

							{/* Separate 0% Option */}
							<div>
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5 block">
									No Withholding
								</span>
								<button
									type="button"
									onClick={() => setTempTaxBuffer(0)}
									className="w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left"
									style={{
										borderColor:
											tempTaxBuffer === 0
												? '#111111'
												: '#F3F4F6',
										backgroundColor:
											tempTaxBuffer === 0
												? '#F9FAFB'
												: '#FFFFFF',
									}}
								>
									<div className="flex flex-col">
										<span className="font-semibold text-sm text-on-surface">
											0% (None)
										</span>
										<span className="text-xs text-outline">
											No tax buffer deduction from
											paycheck
										</span>
									</div>
									{tempTaxBuffer === 0 && (
										<span className="material-symbols-outlined text-primary text-[20px]">
											check_circle
										</span>
									)}
								</button>
							</div>

							<div className="h-px bg-slate-100 my-1" />

							{/* Percentage Buffer Selection */}
							<div>
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5 block">
									Buffer Rates
								</span>
								<div className="flex flex-col space-y-2">
									{[8, 10, 12, 15, 20, 25].map((pct) => (
										<button
											key={pct}
											type="button"
											onClick={() =>
												setTempTaxBuffer(pct)
											}
											className="w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left"
											style={{
												borderColor:
													tempTaxBuffer === pct
														? '#111111'
														: '#F3F4F6',
												backgroundColor:
													tempTaxBuffer === pct
														? '#F9FAFB'
														: '#FFFFFF',
											}}
										>
											<div className="flex flex-col">
												<span className="font-semibold text-sm text-on-surface">
													{pct}% Buffer
												</span>
												<span className="text-xs text-outline">
													{pct === 12
														? 'Recommended standard for part-time income'
														: 'Estimated withholding deduction'}
												</span>
											</div>
											{tempTaxBuffer === pct && (
												<span className="material-symbols-outlined text-primary text-[20px]">
													check_circle
												</span>
											)}
										</button>
									))}
								</div>
							</div>

							<button
								type="button"
								onClick={() => {
									setTaxBufferRate(tempTaxBuffer);
									navigateBack('paycheck');
								}}
								className="w-full h-12.5 bg-primary text-on-primary rounded-xl font-semibold text-sm shadow-md active:scale-[0.98] transition-transform cursor-pointer"
							>
								Save Tax Buffer
							</button>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE: FUEL ECONOMY */}
				{currentSubpage === 'fuel_economy' && (
					<motion.div
						key="fuel_economy"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="w-full flex flex-col"
					>
						<SubpageHeader
							title="Fuel Economy"
							backLabel="Vehicle"
							onBack={() => navigateBack('vehicle')}
						/>

						<div className="bg-white rounded-2xl p-5 border border-[#F3F4F6] shadow-sm space-y-4">
							<div>
								<span className="text-xs uppercase tracking-wider text-outline font-bold">
									Vehicle Mileage Rating
								</span>
								<p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
									Select your vehicle's combined average fuel
									economy (Miles Per Gallon).
								</p>
							</div>

							<div className="flex flex-col space-y-2">
								{mpgOptions.map((mpg, idx) => {
									const isSelected =
										customMpg === null && mpgIdx === idx;
									return (
										<button
											key={mpg}
											type="button"
											onClick={() => {
												setCustomMpg(null);
												setMpgIdx(idx);
											}}
											className="w-full p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left"
											style={{
												borderColor: isSelected
													? '#111111'
													: '#F3F4F6',
												backgroundColor: isSelected
													? '#F9FAFB'
													: '#FFFFFF',
											}}
										>
											<div className="flex flex-col">
												<span className="font-semibold text-base text-on-surface">
													{mpg} MPG
												</span>
												<span className="text-xs text-outline">
													{mpg === 25
														? 'Standard SUV / Truck'
														: mpg === 29
															? 'Average compact sedan'
															: mpg === 34
																? 'High efficiency subcompact'
																: 'Hybrid vehicle benchmark'}
												</span>
											</div>
											{isSelected && (
												<span className="material-symbols-outlined text-primary text-[20px]">
													check_circle
												</span>
											)}
										</button>
									);
								})}
							</div>

							{/* Custom MPG Input */}
							<div className="pt-2 border-t border-[#F3F4F6]">
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2 block">
									Custom Value
								</span>
								<div className="flex items-center gap-2">
									<div className="relative flex-1 group">
										<input
											type="number"
											step="any"
											min="1"
											max="150"
											value={customMpgInput}
											onChange={(e) =>
												setCustomMpgInput(
													e.target.value,
												)
											}
											placeholder={
												customMpg
													? `${customMpg} MPG`
													: 'Enter custom MPG...'
											}
											className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 tabular-nums"
										/>
										<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-outline pointer-events-none">
											MPG
										</span>
									</div>
									<SetActionFeedbackButton
										onAction={() => {
											const val =
												parseFloat(customMpgInput);
											if (!isNaN(val) && val > 0) {
												setCustomMpg(val);
												setMpgIdx(null);

												return true;
											}
											return false;
										}}
									/>
								</div>
								{customMpg !== null && (
									<p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
										<span className="material-symbols-outlined text-[14px]">
											check
										</span>
										Current custom: {customMpg} MPG
									</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE: GAS PRICE */}
				{currentSubpage === 'gas_price' && (
					<motion.div
						key="gas_price"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="w-full flex flex-col"
					>
						<SubpageHeader
							title="Gas Price"
							backLabel="Vehicle"
							onBack={() => navigateBack('vehicle')}
						/>

						<div className="bg-white rounded-2xl p-5 border border-[#F3F4F6] shadow-sm space-y-4">
							<div>
								<span className="text-xs uppercase tracking-wider text-outline font-bold">
									Fuel Station Cost
								</span>
								<p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
									Select your regional gas pump rate to
									calibrate per-mile expense calculations.
								</p>
							</div>

							<div className="flex flex-col space-y-2">
								{gasOptions.map((price, idx) => {
									const isSelected =
										customGas === null && gasIdx === idx;
									return (
										<button
											key={price}
											type="button"
											onClick={() => {
												setCustomGas(null);
												setGasIdx(idx);
											}}
											className="w-full p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left"
											style={{
												borderColor: isSelected
													? '#111111'
													: '#F3F4F6',
												backgroundColor: isSelected
													? '#F9FAFB'
													: '#FFFFFF',
											}}
										>
											<div className="flex flex-col">
												<span className="font-semibold text-base text-on-surface">
													${price.toFixed(2)} / gallon
												</span>
												<span className="text-xs text-outline">
													{price === 3.65
														? 'Low regional benchmark'
														: price === 4.05
															? 'National average benchmark'
															: price === 4.45
																? 'Metro regional benchmark'
																: 'Premium / High-cost benchmark'}
												</span>
											</div>
											{isSelected && (
												<span className="material-symbols-outlined text-primary text-[20px]">
													check_circle
												</span>
											)}
										</button>
									);
								})}
							</div>

							{/* Custom Gas Price Input */}
							<div className="pt-2 border-t border-[#F3F4F6]">
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2 block">
									Custom Value
								</span>
								<div className="flex items-center gap-2">
									<div className="relative flex-1 group">
										<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-outline pointer-events-none">
											$
										</span>
										<input
											type="number"
											step="0.01"
											min="0.5"
											max="20"
											value={customGasInput}
											onChange={(e) =>
												setCustomGasInput(
													e.target.value,
												)
											}
											placeholder={
												customGas
													? `${customGas.toFixed(2)}`
													: 'Enter gas price...'
											}
											className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-7 pr-12 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 tabular-nums"
										/>
										<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-outline pointer-events-none">
											/gal
										</span>
									</div>
									<SetActionFeedbackButton
										onAction={() => {
											const val =
												parseFloat(customGasInput);
											if (!isNaN(val) && val > 0) {
												setCustomGas(val);
												setGasIdx(null);

												return true;
											}
											return false;
										}}
									/>
								</div>
								{customGas !== null && (
									<p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
										<span className="material-symbols-outlined text-[14px]">
											check
										</span>
										Current custom: ${customGas.toFixed(2)}{' '}
										/ gallon
									</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE: TANK CAPACITY */}
				{currentSubpage === 'tank_capacity' && (
					<motion.div
						key="tank_capacity"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="w-full flex flex-col"
					>
						<SubpageHeader
							title="Tank Capacity"
							backLabel="Vehicle"
							onBack={() => navigateBack('vehicle')}
						/>

						<div className="bg-white rounded-2xl p-5 border border-[#F3F4F6] shadow-sm space-y-4">
							<div>
								<span className="text-xs uppercase tracking-wider text-outline font-bold">
									Fuel Reservoir
								</span>
								<p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
									Select your vehicle's total fuel tank volume
									in gallons.
								</p>
							</div>

							<div className="flex flex-col space-y-2">
								{capOptions.map((cap, idx) => {
									const isSelected =
										customCap === null && capIdx === idx;
									return (
										<button
											key={cap}
											type="button"
											onClick={() => {
												setCustomCap(null);
												setCapIdx(idx);
											}}
											className="w-full p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left"
											style={{
												borderColor: isSelected
													? '#111111'
													: '#F3F4F6',
												backgroundColor: isSelected
													? '#F9FAFB'
													: '#FFFFFF',
											}}
										>
											<div className="flex flex-col">
												<span className="font-semibold text-base text-on-surface">
													{cap.toFixed(1)} Gallons
												</span>
												<span className="text-xs text-outline">
													{cap === 12
														? 'Compact hatchback (e.g. Civic / Corolla)'
														: cap === 14
															? 'Mid-size sedan (e.g. Accord / Camry)'
															: cap === 16.5
																? 'Crossover / Small SUV'
																: 'Full-size SUV / Truck'}
												</span>
											</div>
											{isSelected && (
												<span className="material-symbols-outlined text-primary text-[20px]">
													check_circle
												</span>
											)}
										</button>
									);
								})}
							</div>

							{/* Custom Tank Capacity Input */}
							<div className="pt-2 border-t border-[#F3F4F6]">
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2 block">
									Custom Value
								</span>
								<div className="flex items-center gap-2">
									<div className="relative flex-1 group">
										<input
											type="number"
											step="0.1"
											min="1"
											max="100"
											value={customCapInput}
											onChange={(e) =>
												setCustomCapInput(
													e.target.value,
												)
											}
											placeholder={
												customCap
													? `${customCap.toFixed(1)} gal`
													: 'Enter tank size...'
											}
											className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 tabular-nums"
										/>
										<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-outline pointer-events-none">
											gal
										</span>
									</div>
									<SetActionFeedbackButton
										onAction={() => {
											const val =
												parseFloat(customCapInput);
											if (!isNaN(val) && val > 0) {
												setCustomCap(val);
												setCapIdx(null);

												return true;
											}
											return false;
										}}
									/>
								</div>
								{customCap !== null && (
									<p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
										<span className="material-symbols-outlined text-[14px]">
											check
										</span>
										Current custom: {customCap.toFixed(1)}{' '}
										Gallons
									</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE 1: PAYCHECK ENGINE */}
				{currentSubpage === 'paycheck' && (
					<motion.div
						key="paycheck"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="flex flex-col w-full -mt-2"
					>
						{/* Subpage Header */}
						<SubpageHeader
							title="Paycheck Engine"
							backLabel="Settings"
							onBack={() => navigateBack('main')}
						/>

						<div className="flex flex-col gap-y-3.5">
							{/* Active Cycle Card */}
							<div className="w-full bg-white rounded-2xl p-4 border border-[#F3F4F6] shadow-sm flex flex-col gap-1">
								<span className="font-medium text-xs text-on-surface-variant uppercase tracking-wider">
									Current Month's Balance
								</span>
								<div className="text-[20px] leading-7 font-bold text-on-surface tabular-nums">
									${summary.basePaycheck.toFixed(2)}
								</div>
								<p className="text-xs text-[#6B7280]">
									Active cycle • {summary.itemCount} logged
									expenses
								</p>
							</div>

							{/* Building for Next Month Card */}
							<div className="w-full bg-white rounded-2xl p-4 sm:p-5 border border-[#F3F4F6] shadow-sm flex flex-col">
								<div className="flex items-center justify-between">
									<h3 className="font-semibold text-base text-on-surface">
										Building for Next Month
									</h3>
									<span className="bg-surface-container-low px-2.5 py-0.5 rounded-full text-xs font-medium text-primary flex items-center gap-1">
										<span>🗓️</span>
										<span>Unlocks Next Cycle</span>
									</span>
								</div>
								<div className="text-[32px] leading-9 font-bold tracking-tight text-on-surface my-2.5 tabular-nums">
									{totalAccruedHours % 1 === 0
										? totalAccruedHours.toFixed(0)
										: totalAccruedHours.toFixed(1)}{' '}
									hrs
								</div>
								<div className="flex flex-col gap-2 pt-1">
									<div className="flex items-center justify-between text-sm font-medium">
										<span className="text-on-surface-variant">
											Gross Earned ({totalAccruedHours}h @
											${wageRate}/hr)
										</span>
										<span className="text-on-surface-variant font-medium tabular-nums">
											$
											{grossEarned.toLocaleString(
												'en-US',
												{
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												},
											)}
										</span>
									</div>
									<div className="flex items-center justify-between text-sm font-medium">
										<span className="text-[#6B7280]">
											Est. Tax Buffer (-{taxBufferRate}%)
										</span>
										<span className="text-[#6B7280] font-medium tabular-nums">
											-$
											{taxBufferAmt.toLocaleString(
												'en-US',
												{
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												},
											)}
										</span>
									</div>
								</div>
								<div className="border-t border-slate-100 my-3" />
								<div className="flex items-center justify-between">
									<span className="font-semibold text-sm text-on-surface">
										Projected Next Check
									</span>
									<span className="text-[18px] leading-6 font-bold text-[#16A34A] tabular-nums">
										$
										{projectedCheck.toLocaleString(
											'en-US',
											{
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											},
										)}
									</span>
								</div>
							</div>

							{/* Log Shift Stepper */}
							<div className="w-full bg-white rounded-2xl p-3 border border-[#F3F4F6] shadow-sm flex items-center justify-between gap-3">
								<div className="flex items-center gap-2">
									<div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-primary">
										<span className="material-symbols-outlined text-[19px]">
											schedule
										</span>
									</div>
									<div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-xl">
										<button
											type="button"
											aria-label="Decrease shift hours"
											onClick={() =>
												handleAdjustShift(-0.5)
											}
											className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-on-surface active:scale-95 transition-transform shadow-xs cursor-pointer"
										>
											<span className="material-symbols-outlined text-[18px]">
												remove
											</span>
										</button>
										<span className="font-bold text-on-surface min-w-15.5 text-center text-sm tabular-nums">
											{currentShiftInput % 1 === 0
												? currentShiftInput
												: currentShiftInput.toFixed(
														1,
													)}{' '}
											hrs
										</span>
										<button
											type="button"
											aria-label="Increase shift hours"
											onClick={() =>
												handleAdjustShift(0.5)
											}
											className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-on-surface active:scale-95 transition-transform shadow-xs cursor-pointer"
										>
											<span className="material-symbols-outlined text-[18px]">
												add
											</span>
										</button>
									</div>
								</div>
								<button
									type="button"
									onClick={handleAddShift}
									className="h-10 px-5 bg-[#111111] text-white font-semibold text-sm rounded-xl flex items-center gap-1 active:scale-95 transition-transform shadow-sm cursor-pointer"
								>
									<span className="material-symbols-outlined text-[18px]">
										add
									</span>
									<span>Log Shift</span>
								</button>
							</div>

							{/* Shifts Logged Container */}
							<div className="w-full flex flex-col gap-2">
								<div className="flex items-center justify-between px-1">
									<span className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">
										LOGGED SHIFTS THIS MONTH (
										{shifts.length})
									</span>
									{shifts.length > 0 && (
										<button
											type="button"
											onClick={handleClearAllShifts}
											className="text-xs text-[#6B7280] hover:text-on-surface transition-colors cursor-pointer"
										>
											Clear
										</button>
									)}
								</div>
								<div className="w-full bg-white rounded-2xl p-3.5 border border-[#F3F4F6] shadow-sm min-h-14.5">
									{shifts.length === 0 ? (
										<p className="text-xs text-on-surface-variant text-center py-2">
											No shifts logged yet this month.
										</p>
									) : (
										<div className="flex flex-wrap gap-2">
											{shifts.map((shift) => (
												<span
													key={shift.id}
													className="shift-chip bg-[#F3F4F6] text-on-surface text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-slate-200 transition-colors select-none"
												>
													<span>{shift.hours}h</span>
													<button
														type="button"
														aria-label="Remove shift"
														onClick={() =>
															handleRemoveShift(
																shift.id,
															)
														}
														className="text-on-surface-variant hover:text-error leading-none cursor-pointer"
													>
														<span className="material-symbols-outlined text-[13px]">
															close
														</span>
													</button>
												</span>
											))}
										</div>
									)}
								</div>
							</div>

							{/* Tax Setting Row - OPENS TAX BUFFER PAGE */}
							<button
								type="button"
								onClick={() => {
									setTempTaxBuffer(taxBufferRate);
									navigateTo('tax_buffer');
								}}
								className="w-full bg-white rounded-2xl p-4 border border-[#F3F4F6] shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors active:opacity-70 text-left"
							>
								<span className="text-sm font-medium text-on-surface">
									Tax Buffer Percentage
								</span>
								<span className="text-sm font-semibold text-gray-500 flex items-center gap-0.5">
									{taxBufferRate}%
									<span className="material-symbols-outlined text-[16px] text-gray-400">
										chevron_right
									</span>
								</span>
							</button>

							{/* Toast Notification */}
							<div
								className={`transition-all duration-200 transform bg-[#111111] text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 mx-auto shadow-lg text-xs font-medium ${
									paycheckToast
										? 'opacity-100 translate-y-0'
										: 'opacity-0 pointer-events-none translate-y-2'
								}`}
							>
								<span className="material-symbols-outlined text-[16px] text-secondary">
									check_circle
								</span>
								<span>Shift logged successfully</span>
							</div>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE 2: VEHICLE & TRANSIT MATH */}
				{currentSubpage === 'vehicle' && (
					<motion.div
						key="vehicle"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="flex flex-col w-full -mt-2"
					>
						{/* Header */}
						<SubpageHeader
							title="Vehicle & Transit"
							backLabel="Settings"
							onBack={() => navigateBack('main')}
						/>

						{/* Hero Stat Card */}
						<section className="relative overflow-hidden bg-white rounded-xl p-5 mb-4 shadow-sm border border-[#F3F4F6]">
							<div className="flex items-start justify-between">
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline">
									Marginal Running Cost
								</span>
								<div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface">
									<span className="material-symbols-outlined text-[18px]">
										directions_car
									</span>
								</div>
							</div>
							<div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2 mb-2">
								<div className="flex items-baseline gap-1">
									<span className="text-[32px] font-bold leading-9 text-primary tracking-tight tabular-nums">
										${vehicleCostPerMile.toFixed(2)}
									</span>
									<span className="text-[18px] text-outline font-normal">
										/ mi
									</span>
								</div>
								<div className="inline-flex items-center gap-1.5 bg-secondary-container/30 px-2.5 py-1 rounded-full">
									<span className="material-symbols-outlined text-[14px] text-secondary">
										schedule
									</span>
									<span className="text-xs text-secondary font-semibold">
										≈ 30s of work
									</span>
								</div>
							</div>
							<div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mb-3">
								<div
									className="bg-secondary h-full rounded-full transition-all duration-500"
									style={{
										width: `${Math.min(100, Math.round(vehicleCostPerMile * 200))}%`,
									}}
								/>
							</div>
							<div className="flex items-center gap-1 text-on-surface-variant">
								<span className="material-symbols-outlined text-[15px] text-outline">
									local_gas_station
								</span>
								<p className="text-xs text-on-surface-variant">
									Gas only • Excludes baseline vehicle
									depreciation
								</p>
							</div>
						</section>

						{/* Efficiency & Fuel Card - EACH OPENS A NEW SUBPAGE */}
						<section className="mb-4">
							<div className="flex items-center justify-between mb-2 px-1">
								<h3 className="text-[10px] font-bold uppercase tracking-wider text-outline">
									Efficiency &amp; Fuel
								</h3>
								<span className="text-xs text-secondary font-medium">
									Tap row to edit
								</span>
							</div>
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] overflow-hidden flex flex-col">
								{/* MPG */}
								<button
									type="button"
									onClick={() => navigateTo('fuel_economy')}
									className="w-full text-left py-3.5 px-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer"
								>
									<div className="flex items-center gap-3">
										<div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface">
											<span className="material-symbols-outlined text-[16px]">
												speed
											</span>
										</div>
										<span className="text-sm font-semibold text-on-surface">
											Fuel Economy
										</span>
									</div>
									<div className="flex items-center gap-1">
										<span className="text-sm font-semibold text-primary">
											{currentMpg} MPG
										</span>
										<span className="material-symbols-outlined text-outline text-[18px]">
											chevron_right
										</span>
									</div>
								</button>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Gas Price */}
								<button
									type="button"
									onClick={() => navigateTo('gas_price')}
									className="w-full text-left py-3.5 px-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer"
								>
									<div className="flex items-center gap-3">
										<div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface">
											<span className="material-symbols-outlined text-[16px]">
												payments
											</span>
										</div>
										<span className="text-sm font-semibold text-on-surface">
											Gas Price
										</span>
									</div>
									<div className="flex items-center gap-1">
										<span className="text-sm font-semibold text-primary">
											${currentGas.toFixed(2)}/gal
										</span>
										<span className="material-symbols-outlined text-outline text-[18px]">
											chevron_right
										</span>
									</div>
								</button>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Tank Capacity */}
								<button
									type="button"
									onClick={() => navigateTo('tank_capacity')}
									className="w-full text-left py-3.5 px-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer"
								>
									<div className="flex items-center gap-3">
										<div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface">
											<span className="material-symbols-outlined text-[16px]">
												water_drop
											</span>
										</div>
										<span className="text-sm font-semibold text-on-surface">
											Fuel Tank Capacity
										</span>
									</div>
									<div className="flex items-center gap-1">
										<span className="text-sm font-semibold text-primary">
											{currentCap.toFixed(1)} gal
										</span>
										<span className="material-symbols-outlined text-outline text-[18px]">
											chevron_right
										</span>
									</div>
								</button>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Computed Range */}
								<div className="py-3.5 px-4 flex items-center justify-between bg-surface-container-lowest">
									<div className="flex items-center gap-3">
										<div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-outline">
											<span className="material-symbols-outlined text-[16px]">
												social_distance
											</span>
										</div>
										<div className="flex flex-col">
											<span className="text-sm font-semibold text-on-surface">
												Max Tank Range
											</span>
											<span className="text-[10px] text-outline">
												Auto-calculated
											</span>
										</div>
									</div>
									<span className="text-sm font-semibold text-outline">
										{maxRange} miles
									</span>
								</div>
							</div>
						</section>

						{/* Trip Cost Examples */}
						<section className="mb-5">
							<div className="flex items-center justify-between mb-2 px-1">
								<h3 className="text-[10px] font-bold uppercase tracking-wider text-outline">
									Trip Cost Examples
								</h3>
								<span className="text-xs text-outline">
									At ${wageRate.toFixed(2)}/hr wage
								</span>
							</div>
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] overflow-hidden flex flex-col">
								<div className="py-3.5 px-4 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface">
											<span className="material-symbols-outlined text-[18px]">
												work_history
											</span>
										</div>
										<div className="flex flex-col">
											<span className="text-sm font-semibold text-on-surface">
												10-mile commute
											</span>
											<span className="text-xs text-outline">
												Round-trip daily
											</span>
										</div>
									</div>
									<div className="text-right">
										<span className="text-sm font-semibold text-on-surface tabular-nums">
											${commuteCost.toFixed(2)}
										</span>
										<span className="text-secondary font-semibold text-sm ml-1">
											({commuteMinutes}m of work)
										</span>
									</div>
								</div>
								<div className="h-px bg-slate-100 mx-4" />
								<div className="py-3.5 px-4 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface">
											<span className="material-symbols-outlined text-[18px]">
												ev_station
											</span>
										</div>
										<div className="flex flex-col">
											<span className="text-sm font-semibold text-on-surface">
												Full Tank Fill-up
											</span>
											<span className="text-xs text-outline">
												Zero to click
											</span>
										</div>
									</div>
									<div className="text-right">
										<span className="text-sm font-semibold text-on-surface tabular-nums">
											${tankCost.toFixed(2)}
										</span>
										<span className="text-secondary font-semibold text-sm ml-1">
											({tankHours} hrs of work)
										</span>
									</div>
								</div>
							</div>

							<div className="mt-3 p-3.5 rounded-xl bg-surface-container-low flex items-start gap-2.5">
								<span className="material-symbols-outlined text-secondary text-[20px] mt-0.5 select-none">
									tips_and_updates
								</span>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Biking or skipping that quick 2-mile
									convenience errand keeps{' '}
									<span className="font-semibold text-on-surface">
										${(vehicleCostPerMile * 2).toFixed(2)}
									</span>{' '}
									in your pocket and gives you{' '}
									{(
										(vehicleCostPerMile * 2) /
										(wageRate / 60)
									).toFixed(1)}{' '}
									minutes of freedom back.
								</p>
							</div>
						</section>

						{/* Save CTA */}
						<div className="pt-2">
							<button
								type="button"
								onClick={handleSaveVehicleChanges}
								className={`w-full h-13 rounded-xl font-semibold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md cursor-pointer ${
									vehicleSaved
										? 'bg-secondary text-white'
										: 'bg-primary text-on-primary'
								}`}
							>
								<span className="material-symbols-outlined text-[18px]">
									{vehicleSaved ? 'sync' : 'check'}
								</span>
								<span>
									{vehicleSaved ? 'SAVED!' : 'SAVE CHANGES'}
								</span>
							</button>
							<p className="text-center text-xs text-outline mt-2.5">
								Values update your transit calculator instantly
							</p>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE 3: PAST CYCLES & SURPLUS HISTORY */}
				{currentSubpage === 'past_cycles' && (
					<motion.div
						key="past_cycles"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="flex flex-col w-full -mt-2"
					>
						{/* Header */}
						<SubpageHeader
							title="Past Cycles"
							backLabel="Settings"
							onBack={() => navigateBack('main')}
						/>

						{/* Lifetime Surplus Hero Card */}
						<div className="bg-white rounded-xl p-5 shadow-sm border border-[#F3F4F6] mb-4">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
									Lifetime Unspent Surplus
								</span>
								<span
									className="material-symbols-outlined text-secondary text-[20px]"
									style={{
										fontVariationSettings: "'FILL' 1",
									}}
								>
									savings
								</span>
							</div>
							<div className="text-[32px] font-bold text-secondary tracking-tight mt-1 flex items-baseline gap-1 tabular-nums">
								{lifetimeSurplus >= 0 ? `+$${lifetimeSurplus.toFixed(2)}` : `-$${Math.abs(lifetimeSurplus).toFixed(2)}`}
							</div>
							<p className="text-xs text-on-surface-variant mt-1">
								Total cash preserved from completed cycles
							</p>
						</div>

						{/* Completed Periods List */}
						<div className="flex flex-col space-y-2 mb-4">
							<div className="px-1">
								<span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
									Completed Periods
								</span>
							</div>
							<div className="bg-white rounded-[18px] border border-[#F3F4F6] shadow-sm overflow-hidden divide-y divide-[#F3F4F6]">
								{pastCycles.length === 0 ? (
									<div className="p-6 text-center text-xs text-on-surface-variant">
										No completed cycles yet. Completed pay periods will appear here.
									</div>
								) : (
									pastCycles.map((cycle) => (
										<div
											key={cycle.id}
											className="w-full p-4 flex items-center justify-between"
										>
											<div className="flex items-center gap-3.5 min-w-0">
												<div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
													<span className="material-symbols-outlined text-on-surface text-[20px]">
														calendar_today
													</span>
												</div>
												<div className="min-w-0">
													<h4 className="font-semibold text-sm text-primary truncate">
														{cycle.label}
													</h4>
													<p className="text-xs text-on-surface-variant truncate mt-0.5">
														${cycle.spent.toFixed(2)}{' '}
														spent of ${cycle.check}{' '}
														check
													</p>
												</div>
											</div>
											<div className="flex items-center gap-1 shrink-0 ml-2">
												<span
													className={`font-semibold text-xs px-2.5 py-1 rounded-full tabular-nums ${
														cycle.isDeficit
															? 'bg-error-container text-on-error-container'
															: 'bg-secondary-container text-on-secondary-container'
													}`}
												>
													{cycle.surplus >= 0
														? `+$${cycle.surplus.toFixed(2)}`
														: `-$${Math.abs(cycle.surplus).toFixed(2)}`}
												</span>
											</div>
										</div>
									))
								)}
							</div>
						</div>

						{/* Rollover Rules Callout */}
						<div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3 shadow-sm">
							<div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 mt-0.5">
								<span className="material-symbols-outlined text-primary text-[18px]">
									lightbulb
								</span>
							</div>
							<div className="space-y-1">
								<h5 className="font-semibold text-sm text-on-surface">
									Surplus Allocation
								</h5>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Surplus rolls directly into your next
									cycle's budget when Rollover is active in
									Settings.
								</p>
							</div>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE 4: EXPORT DATA (LEDGER) */}
				{currentSubpage === 'export' && (
					<motion.div
						key="export"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="flex flex-col w-full -mt-2"
					>
						{/* Header */}
						<SubpageHeader
							title="Export Data"
							backLabel="Settings"
							onBack={() => navigateBack('main')}
						/>

						{/* Date Range Selection */}
						<section className="flex flex-col mb-4">
							<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5 px-1">
								Date Range
							</span>
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] overflow-hidden">
								{/* Current Cycle */}
								<div
									onClick={() => setExportRange('current')}
									className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors"
								>
									<div className="flex flex-col pr-2">
										<span className="text-sm font-semibold text-primary">
											Current Cycle ({settings.cycleLabel}
											)
										</span>
										<span className="text-xs text-on-surface-variant">
											{summary.itemCount} items logged
										</span>
									</div>
									<div
										className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
											exportRange === 'current'
												? 'border-primary bg-transparent'
												: 'border-[#D1D5DB] bg-transparent'
										}`}
									>
										{exportRange === 'current' && (
											<div className="w-2.5 h-2.5 rounded-full bg-primary" />
										)}
									</div>
								</div>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Year to Date */}
								<div
									onClick={() => setExportRange('ytd')}
									className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors"
								>
									<div className="flex flex-col pr-2">
										<span className="text-sm font-semibold text-primary">
											Year to Date (2026)
										</span>
										<span className="text-xs text-on-surface-variant">
											Jan 1 – Nov 30 • 142 items
										</span>
									</div>
									<div
										className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
											exportRange === 'ytd'
												? 'border-primary bg-transparent'
												: 'border-[#D1D5DB] bg-transparent'
										}`}
									>
										{exportRange === 'ytd' && (
											<div className="w-2.5 h-2.5 rounded-full bg-primary" />
										)}
									</div>
								</div>
								<div className="h-px bg-slate-100 mx-4" />

								{/* All-Time */}
								<div
									onClick={() => setExportRange('all')}
									className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors"
								>
									<div className="flex flex-col pr-2">
										<span className="text-sm font-semibold text-primary">
											All-Time History
										</span>
										<span className="text-xs text-on-surface-variant">
											Lifetime data • 284 items
										</span>
									</div>
									<div
										className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
											exportRange === 'all'
												? 'border-primary bg-transparent'
												: 'border-[#D1D5DB] bg-transparent'
										}`}
									>
										{exportRange === 'all' && (
											<div className="w-2.5 h-2.5 rounded-full bg-primary" />
										)}
									</div>
								</div>
							</div>
						</section>

						{/* Include Tables */}
						<section className="flex flex-col mb-4">
							<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5 px-1">
								Include Tables
							</span>
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] overflow-hidden">
								{/* Expense Transactions */}
								<div className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3 min-w-0 pr-2">
										<div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
											<span
												className="material-symbols-outlined text-[20px]"
												style={{
													fontVariationSettings:
														"'FILL' 1",
												}}
											>
												receipt_long
											</span>
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-sm font-semibold text-primary truncate">
												Expense Transactions
											</span>
											<span className="text-xs text-on-surface-variant truncate">
												All logged spending with
												work-hour equivalent
											</span>
										</div>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={includeExpenses}
										onClick={() =>
											setIncludeExpenses(!includeExpenses)
										}
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											includeExpenses
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												includeExpenses
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Work Shifts */}
								<div className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3 min-w-0 pr-2">
										<div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
											<span
												className="material-symbols-outlined text-[20px]"
												style={{
													fontVariationSettings:
														"'FILL' 1",
												}}
											>
												schedule
											</span>
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-sm font-semibold text-primary truncate">
												Work Shifts &amp; Hours
											</span>
											<span className="text-xs text-on-surface-variant truncate">
												Tracked hours with wage
												benchmarks
											</span>
										</div>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={includeShifts}
										onClick={() =>
											setIncludeShifts(!includeShifts)
										}
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											includeShifts
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												includeShifts
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Mileage Presets */}
								<div className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3 min-w-0 pr-2">
										<div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
											<span
												className="material-symbols-outlined text-[20px]"
												style={{
													fontVariationSettings:
														"'FILL' 1",
												}}
											>
												directions_car
											</span>
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-sm font-semibold text-primary truncate">
												Mileage Presets &amp; Trip Logs
											</span>
											<span className="text-xs text-on-surface-variant truncate">
												Cost per mile, fuel benchmarks
												&amp; routes
											</span>
										</div>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={includeMileage}
										onClick={() =>
											setIncludeMileage(!includeMileage)
										}
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											includeMileage
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												includeMileage
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>
							</div>
						</section>

						{/* Format Selector */}
						<section className="flex flex-col mb-6">
							<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5 px-1">
								Export Format
							</span>
							<div className="bg-surface-container-high p-1 rounded-xl flex gap-1">
								<button
									type="button"
									onClick={() => setExportFormat('CSV')}
									className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
										exportFormat === 'CSV'
											? 'bg-primary text-on-primary shadow-sm'
											: 'text-on-surface-variant'
									}`}
								>
									<span className="material-symbols-outlined text-[18px]">
										description
									</span>
									<span>Standard CSV</span>
								</button>
								<button
									type="button"
									onClick={() => setExportFormat('JSON')}
									className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
										exportFormat === 'JSON'
											? 'bg-primary text-on-primary shadow-sm'
											: 'text-on-surface-variant'
									}`}
								>
									<span className="material-symbols-outlined text-[18px]">
										data_object
									</span>
									<span>Raw JSON</span>
								</button>
							</div>
						</section>

						{/* Action Button */}
						<div className="flex flex-col items-center">
							<button
								type="button"
								onClick={handleExecuteExport}
								className="w-full h-13 bg-primary text-on-primary rounded-xl text-sm font-semibold tracking-wide shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 cursor-pointer"
							>
								<span className="material-symbols-outlined text-[20px]">
									ios_share
								</span>
								<span>
									{exportingStatus ||
										`SHARE / DOWNLOAD ${exportFormat}`}
								</span>
							</button>
							<span className="text-xs text-[#9CA3AF] text-center mt-2.5">
								Generated locally on device • Never uploaded
							</span>
						</div>
					</motion.div>
				)}

				{/* MAIN SETTINGS VIEW */}
				{currentSubpage === 'main' && (
					<motion.div
						key="main"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="flex flex-col w-full"
					>
						{/* SECTION 1: ENGINES & CALCULATIONS */}
						<section className="flex flex-col">
							<div className="px-1 mb-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
									Engines &amp; Calculations
								</span>
							</div>
							<div className="bg-white rounded-[18px] border border-[#F3F4F6] shadow-sm overflow-hidden divide-y divide-[#F3F4F6]">
								{/* Subpage 1 link */}
								<button
									type="button"
									onClick={() => navigateTo('paycheck')}
									className="w-full flex items-center justify-between p-4 text-left transition-colors active:bg-[#F9FAFB] focus:outline-none cursor-pointer"
								>
									<div className="flex items-center gap-3.5">
										<div className="w-10 h-10 rounded-xl bg-[#EEF2F6] flex items-center justify-center text-[#1E293B] shrink-0">
											<span className="material-symbols-outlined text-[20px]">
												payments
											</span>
										</div>
										<div className="flex flex-col">
											<span className="text-[16px] font-bold text-[#111111] leading-snug">
												Paycheck &amp; Hours Engine
											</span>
											<span className="text-[13px] text-[#6B7280] mt-0.5">
												$
												{settings.hourlyWage.toFixed(2)}
												/hr • {totalAccruedHours}h
												accrued for next check
											</span>
										</div>
									</div>
									<span className="material-symbols-outlined text-[22px] text-[#9CA3AF] shrink-0">
										chevron_right
									</span>
								</button>

								{/* Subpage 2 link */}
								<button
									type="button"
									onClick={() => navigateTo('vehicle')}
									className="w-full flex items-center justify-between p-4 text-left transition-colors active:bg-[#F9FAFB] focus:outline-none cursor-pointer"
								>
									<div className="flex items-center gap-3.5">
										<div className="w-10 h-10 rounded-xl bg-[#EEF2F6] flex items-center justify-center text-[#1E293B] shrink-0">
											<span className="material-symbols-outlined text-[20px]">
												directions_car
											</span>
										</div>
										<div className="flex flex-col">
											<span className="text-[16px] font-bold text-[#111111] leading-snug">
												Vehicle &amp; Transit Math
											</span>
											<span className="text-[13px] text-[#6B7280] mt-0.5">
												{currentMpg} MPG @ $
												{currentGas.toFixed(2)}/gal • $
												{settings.mileageRate.toFixed(
													2,
												)}
												/mi
											</span>
										</div>
									</div>
									<span className="material-symbols-outlined text-[22px] text-[#9CA3AF] shrink-0">
										chevron_right
									</span>
								</button>
							</div>
						</section>

						{/* SECTION 2: PREFERENCES */}
						<section className="flex flex-col mt-6">
							<div className="px-1 mb-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
									Preferences
								</span>
							</div>
							<div className="bg-white rounded-[18px] border border-[#F3F4F6] shadow-sm overflow-hidden divide-y divide-[#F3F4F6]">
								<div className="flex items-center justify-between p-4">
									<div className="flex flex-col pr-3">
										<span className="text-[15px] font-semibold text-[#111111]">
											Show Time-Worked Metric
										</span>
										<span className="text-[12px] text-[#6B7280] mt-0.5">
											Displays work hours under prices
										</span>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={showTimeWorked}
										onClick={() =>
											setShowTimeWorked(!showTimeWorked)
										}
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											showTimeWorked
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												showTimeWorked
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>
								<div className="flex items-center justify-between p-4">
									<div className="flex flex-col pr-3">
										<span className="text-[15px] font-semibold text-[#111111]">
											Animations
										</span>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={isAnimationsActive}
										onClick={handleToggleAnimations}
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											isAnimationsActive
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												isAnimationsActive
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>
							</div>
						</section>

						{/* SECTION 3: DATA & ARCHIVES */}
						<section className="flex flex-col mt-6">
							<div className="px-1 mb-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
									Data &amp; Archives
								</span>
							</div>
							<div className="bg-white rounded-[18px] border border-[#F3F4F6] shadow-sm overflow-hidden divide-y divide-[#F3F4F6]">
								<button
									type="button"
									onClick={() => navigateTo('past_cycles')}
									className="w-full flex items-center justify-between p-4 text-left transition-colors active:bg-[#F9FAFB] focus:outline-none cursor-pointer"
								>
									<div className="flex flex-col pr-2">
										<span className="text-[15px] font-semibold text-[#111111]">
											Past Cycles &amp; Surplus History
										</span>
										<span className="text-[12px] text-[#6B7280] mt-0.5">
											View previous paychecks and rolled
											surplus
										</span>
									</div>
									<span className="material-symbols-outlined text-[22px] text-[#9CA3AF] shrink-0">
										chevron_right
									</span>
								</button>
								<button
									type="button"
									onClick={() => navigateTo('export')}
									className="w-full flex items-center justify-between p-4 text-left transition-colors active:bg-[#F9FAFB] focus:outline-none cursor-pointer"
								>
									<div className="flex flex-col pr-2">
										<span className="text-[15px] font-semibold text-[#111111]">
											Export Data (CSV / JSON)
										</span>
										<span className="text-[12px] text-[#6B7280] mt-0.5">
											Download local ledger file
										</span>
									</div>
									<span className="material-symbols-outlined text-[22px] text-[#9CA3AF] shrink-0">
										chevron_right
									</span>
								</button>
							</div>
						</section>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
