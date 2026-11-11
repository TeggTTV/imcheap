import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PresetItem } from '../utils/expenseMath';

export interface OnboardingScreenConfig {
	wage: number;
	vehicle: {
		mpg: number;
		gasPrice: number;
		tankSize: number;
	};
	habitCost: number;
}

export const ONBOARDING_CONFIG_DEFAULTS: OnboardingScreenConfig = {
	wage: 17.0,
	vehicle: {
		mpg: 29,
		gasPrice: 4.05,
		tankSize: 14.0,
	},
	habitCost: 4.5,
};

interface OnboardingModalProps {
	isOpen: boolean;
	onClose: () => void;
	onComplete?: (config: {
		wage: number;
		vehicle: { mpg: number; gasPrice: number; tankSize: number };
		presets: PresetItem[];
	}) => void;
}

function formatLaborTime(hours: number): string {
	if (hours <= 0 || isNaN(hours)) return '0m';
	const totalMinutes = Math.round(hours * 60);
	if (totalMinutes < 60) {
		return `≈ ${totalMinutes}m of labor`;
	}
	const hrs = (totalMinutes / 60).toFixed(1);
	return `≈ ${hrs}h of labor`;
}

const slideVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? '100%' : '-100%',
		opacity: 0,
	}),
	center: {
		x: 0,
		opacity: 1,
	},
	exit: (direction: number) => ({
		x: direction > 0 ? '-100%' : '100%',
		opacity: 0,
	}),
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
	isOpen,
	onClose,
	onComplete,
}) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [direction, setDirection] = useState<number>(1);
	const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

	// User-configurable parameters
	const [wage, setWage] = useState<number>(ONBOARDING_CONFIG_DEFAULTS.wage);
	const [mpg, setMpg] = useState<number>(ONBOARDING_CONFIG_DEFAULTS.vehicle.mpg);
	const [gasPrice, setGasPrice] = useState<number>(
		ONBOARDING_CONFIG_DEFAULTS.vehicle.gasPrice,
	);
	const [tankSize, setTankSize] = useState<number>(
		ONBOARDING_CONFIG_DEFAULTS.vehicle.tankSize,
	);
	const [habitCost, setHabitCost] = useState<number>(
		ONBOARDING_CONFIG_DEFAULTS.habitCost,
	);

	const touchStartX = useRef<number | null>(null);
	const touchStartY = useRef<number | null>(null);

	// Calculated live costs & labor
	// Screen 1: Meal = $14.50
	const mealCost = 14.5;
	const mealLaborHours = wage > 0 ? mealCost / wage : 0;
	const mealLaborLabel = formatLaborTime(mealLaborHours);

	// Screen 2: Commute 12.8 miles @ gasPrice / mpg
	const costPerMile = mpg > 0 ? gasPrice / mpg : 0.14;
	const commuteDistance = 12.8;
	const commuteCost = Number((commuteDistance * costPerMile).toFixed(2));
	const commuteLaborHours = wage > 0 ? commuteCost / wage : 0;
	const commuteLaborLabel = formatLaborTime(commuteLaborHours);

	// Screen 3: Morning habit = habitCost
	const habitLaborHours = wage > 0 ? habitCost / wage : 0;
	const habitLaborLabel = formatLaborTime(habitLaborHours);

	const screens = useMemo(() => {
		return [
			{
				id: 'step_food',
				image: '/screen burger.png',
				fallbackImage:
					'https://lh3.googleusercontent.com/aida/ALJJyrDofg9q5e9eLGgthQ0sL1Xk-CeCF6uFybE_Dwuhx9tl9PkIlLetlwxHFv_vpijFq1FEwPJxeIoYbGNY44X3n4ZI0sYfroAs5e5UhoadIyRm2tIhnijLicTf4XxxueYEu0DJ5NU7dXBIzlNPue0Wyre5zSfiojk34H9bK6lMeWlusdqxSh6yXSUCa1qoYVNZLqJTl7Cv-mloCT5a2eFG49aqRusFc7CmlLbWfljm8bnP',
				receipt: {
					icon: 'lunch_dining',
					iconEmoji: '🍔',
					iconBg: 'rgba(252, 231, 243, 0.6)',
					iconColor: 'rgb(190, 24, 93)',
					title: 'Lunch Combo',
					subtitle: `$${mealCost.toFixed(2)} • Dine-in (1 meal)`,
					cost: `$${mealCost.toFixed(2)}`,
					labor: mealLaborLabel,
				},
				headline: 'Everything costs hours of your life.',
				body: 'Set your hourly wage to visualize the physical minutes behind every meal, latte, and takeout order before you tap to pay.',
				ctaText: 'Continue',
			},
			{
				id: 'step_driving',
				image: '/screen driving.png',
				fallbackImage:
					'https://lh3.googleusercontent.com/aida/ALJJyrCD2ywDVkW6Nfv0hG6gH0hhawWjqRn-_TKkleErEYe-orU8c_T90jv1s4V4kJQhj0PjMG_3fE8uS1RqoGNYr080jTprLVwQkh54uXUFTOWyhdIkX3iM-MVwpq5FCy0_3X_9hAEWJLuJNdEgUUKInq0PvxfYnpBNhjpGgdo0XwlrwndHNyXqIc-txCn3pmUNMiQoLWMMvPea2z7gocC2e7BQw8CHGvaSsNBGrscaWNU',
				receipt: {
					icon: 'directions_car',
					iconEmoji: '🚗',
					iconBg: '#EEF2FF',
					iconColor: '#4F46E5',
					title: 'Daily Commute',
					subtitle: `$${commuteCost.toFixed(2)} • Campus Route (${commuteDistance} mi)`,
					cost: `$${commuteCost.toFixed(2)}`,
					labor: commuteLaborLabel,
				},
				headline: 'Stop counting dollars. Start counting miles.',
				body: "Sync your vehicle's fuel economy, gas price, and tank capacity to reveal the true cost of every errand and road trip in working shift minutes.",
				ctaText: 'Continue',
			},
			{
				id: 'step_habits',
				image: '/screen coffee.png',
				fallbackImage:
					'https://lh3.googleusercontent.com/aida-public/AB6AXuDM41rRi-r0iiJGLDYrIj6RZ8K7PbwkdujO7EnKHKRY1WKmYfppUNLUlGGM_fX3Zsfabj1ViYdzK7rTPpjHWFJPL-MNlS-sK5nFgtF0ttuIYVEz04GErE-ZKi7TgIzNXGnyNs7D3sZr3jXxzBf9g67ulRyg9Cu-3vagjr34dzSqcdwqrFYIv5V81Z_rkoMIi2Z-DZLwTqa105ABuvbMSMr3V8iuCee3KUnOyGVlaUE',
				receipt: {
					icon: 'local_cafe',
					iconEmoji: '☕',
					iconBg: '#FEF3C7',
					iconColor: '#D97706',
					title: 'Morning Espresso',
					subtitle: `$${habitCost.toFixed(2)} • Flat expense (Daily)`,
					cost: `$${habitCost.toFixed(2)}`,
					labor: habitLaborLabel,
				},
				headline: 'Small routines silently drain your paycheck.',
				body: 'Track your everyday coffee runs, takeout meals, and subscriptions in real time. Know the exact minutes of your shift behind every purchase.',
				ctaText: 'Get Started',
			},
		];
	}, [
		wage,
		mealCost,
		mealLaborLabel,
		commuteCost,
		commuteDistance,
		commuteLaborLabel,
		habitCost,
		habitLaborLabel,
	]);

	const currentStep = screens[currentIndex];

	const handleFinish = useCallback(() => {
		const vehicle = { mpg, gasPrice, tankSize };
		const presets: PresetItem[] = [
			{
				id: 'preset-coffee-espresso',
				label: 'Espresso',
				title: 'Morning Espresso',
				category: 'Food',
				type: 'expense',
				icon: 'local_cafe',
				bgColor: '#FEF3C7',
				iconColor: '#D97706',
				unit: 'USD',
				rawValue: habitCost,
				isRoundTrip: false,
				calculatedAmount: habitCost,
			},
			{
				id: 'preset-daily-commute',
				label: 'Commute',
				title: 'Daily Commute',
				category: 'Driving',
				type: 'expense',
				icon: 'directions_car',
				bgColor: '#EEF2FF',
				iconColor: '#4F46E5',
				unit: 'MILES',
				rawValue: commuteDistance,
				isRoundTrip: false,
				calculatedAmount: commuteCost,
			},
		];

		try {
			localStorage.setItem('imcheap_wage', String(wage));
			localStorage.setItem('imcheap_vehicle', JSON.stringify(vehicle));
			localStorage.setItem('imcheap_presets', JSON.stringify(presets));
			localStorage.setItem('imcheap_onboarding_completed', 'true');
		} catch (err) {
			console.warn('Failed to persist onboarding settings to localStorage', err);
		}

		if (onComplete) {
			onComplete({ wage, vehicle, presets });
		}
		onClose();
	}, [wage, mpg, gasPrice, tankSize, habitCost, commuteDistance, commuteCost, onComplete, onClose]);

	const handleSkip = useCallback(() => {
		try {
			localStorage.setItem('imcheap_onboarding_completed', 'true');
		} catch (err) {
			console.warn('Failed to persist onboarding completed flag', err);
		}
		onClose();
	}, [onClose]);

	const nextStep = useCallback(() => {
		if (currentIndex < screens.length - 1) {
			setDirection(1);
			setCurrentIndex((prev) => prev + 1);
		} else {
			handleFinish();
		}
	}, [currentIndex, screens.length, handleFinish]);

	const prevStep = useCallback(() => {
		if (currentIndex > 0) {
			setDirection(-1);
			setCurrentIndex((prev) => prev - 1);
		}
	}, [currentIndex]);

	const handleDotClick = (index: number) => {
		if (index === currentIndex) return;
		setDirection(index > currentIndex ? 1 : -1);
		setCurrentIndex(index);
	};

	useEffect(() => {
		if (!isOpen) {
			setCurrentIndex(0);
			setDirection(1);
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowRight' || e.key === ' ') {
				e.preventDefault();
				nextStep();
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				prevStep();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				handleSkip();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, nextStep, prevStep, handleSkip]);

	// Touch swipe gesture handlers
	const handleTouchStart = (e: React.TouchEvent) => {
		touchStartX.current = e.touches[0].clientX;
		touchStartY.current = e.touches[0].clientY;
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (touchStartX.current === null || touchStartY.current === null)
			return;
		const diffX = touchStartX.current - e.changedTouches[0].clientX;
		const diffY = touchStartY.current - e.changedTouches[0].clientY;

		if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
			if (diffX > 0) {
				nextStep();
			} else {
				prevStep();
			}
		}

		touchStartX.current = null;
		touchStartY.current = null;
	};

	if (!isOpen) return null;

	const imageSrc =
		imageErrors[currentStep.id] && currentStep.fallbackImage
			? currentStep.fallbackImage
			: currentStep.image;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
			{/* Device container matching mobile frame */}
			<div
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
				className="relative w-full sm:max-w-[420px] h-[100dvh] sm:h-[860px] bg-white sm:rounded-[36px] overflow-hidden flex flex-col shadow-2xl select-none"
			>
				{/* 1. Upper Hero Photo Container (60%-62% height) */}
				<div className="relative w-full h-[52vh] sm:h-[460px] bg-black shrink-0 overflow-visible">
					{/* Full-bleed edge-to-edge photography with page sliding */}
					<div className="absolute inset-0 w-full h-full overflow-hidden">
						<AnimatePresence initial={false} custom={direction}>
							<motion.div
								key={currentStep.id}
								custom={direction}
								variants={slideVariants}
								initial="enter"
								animate="center"
								exit="exit"
								transition={{
									x: {
										type: 'spring',
										stiffness: 300,
										damping: 30,
									},
									opacity: { duration: 0.2 },
								}}
								className="absolute inset-0 w-full h-full"
							>
								<img
									src={imageSrc}
									alt={currentStep.headline}
									onError={() => {
										setImageErrors((prev) => ({
											...prev,
											[currentStep.id]: true,
										}));
									}}
									className="w-full h-full object-cover object-center pointer-events-none"
								/>
							</motion.div>
						</AnimatePresence>
					</div>

					{/* Subtle top-down vignette gradient for header legibility */}
					<div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/75 via-black/25 to-transparent pointer-events-none z-10" />

					{/* Minimalist pinned top bar: Left ImCheap wordmark in crisp white, right Skip button */}
					<div className="relative z-20 flex items-center justify-between px-6 pt-6">
						<span className="text-[18px] font-extrabold tracking-tight text-white font-sans drop-shadow-sm">
							ImCheap
						</span>
						<button
							type="button"
							onClick={handleSkip}
							className="text-[15px] text-white opacity-85 hover:opacity-100 transition-opacity cursor-pointer font-medium drop-shadow-sm"
						>
							Skip
						</button>
					</div>

					{/* Pinned Floating Micro-Receipt Card across the image/sheet seam */}
					<div className="absolute -bottom-6 inset-x-6 z-20 h-[68px] bg-white rounded-2xl px-3.5 shadow-xl border border-slate-100 flex items-center overflow-hidden">
						<div className="relative w-full h-full flex items-center">
							<AnimatePresence initial={false} custom={direction}>
								<motion.div
									key={currentStep.id + '_receipt'}
									custom={direction}
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{
										x: {
											type: 'spring',
											stiffness: 300,
											damping: 30,
										},
										opacity: { duration: 0.2 },
									}}
									className="absolute inset-0 flex items-center justify-between min-w-0"
								>
									{/* Left side: Category circular badge + title and subtext */}
									<div className="flex items-center gap-3 min-w-0 pr-2">
										<div
											className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg shadow-xs"
											style={{
												backgroundColor:
													currentStep.receipt.iconBg,
												color: currentStep.receipt
													.iconColor,
											}}
										>
											<span className="material-symbols-outlined text-[20px]">
												{currentStep.receipt.icon}
											</span>
										</div>
										<div className="flex flex-col min-w-0">
											<span className="font-semibold text-slate-900 text-[14px] leading-tight truncate">
												{currentStep.receipt.title}
											</span>
											<span className="text-[12px] text-slate-500 font-medium leading-normal mt-0.5 truncate tabular-nums">
												{currentStep.receipt.subtitle}
											</span>
										</div>
									</div>

									{/* Right side: Emerald pill badge displaying clock icon and shift labor time */}
									<div className="bg-[#ECFDF5] text-[#059669] px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap flex items-center gap-1.5 shrink-0">
										<span
											className="material-symbols-outlined text-[15px]"
											style={{
												fontVariationSettings:
													"'FILL' 1",
											}}
										>
											schedule
										</span>
										<span className="tabular-nums">
											{currentStep.receipt.labor}
										</span>
									</div>
								</motion.div>
							</AnimatePresence>
						</div>
					</div>
				</div>

				{/* 2. Compact White Bottom Sheet (Lower Screen Area) */}
				<section className="bg-white rounded-t-[32px] px-6 pt-10 pb-6 sm:pb-8 pb-safe flex flex-col justify-between shadow-2xl relative z-10 -mt-6 flex-1 min-h-0 overflow-y-auto no-scrollbar">
					{/* Text Block & Interactive Config Inputs */}
					<div className="relative overflow-hidden flex flex-col justify-center my-auto min-h-0">
						<AnimatePresence initial={false} custom={direction}>
							<motion.div
								key={currentStep.id + '_text'}
								custom={direction}
								variants={slideVariants}
								initial="enter"
								animate="center"
								exit="exit"
								transition={{
									x: {
										type: 'spring',
										stiffness: 300,
										damping: 30,
									},
									opacity: { duration: 0.2 },
								}}
								className="flex flex-col gap-2 w-full"
							>
								<h1 className="text-[23px] sm:text-[25px] font-extrabold text-[#111111] leading-[1.2] tracking-tight">
									{currentStep.headline}
								</h1>
								<p className="text-[13.5px] text-[#6B7280] leading-relaxed font-normal">
									{currentStep.body}
								</p>

								{/* SCREEN 1: HOURLY WAGE CONFIG */}
								{currentIndex === 0 && (
									<div className="mt-2 bg-[#F9FAFB] border border-gray-100 rounded-2xl p-3.5 flex flex-col gap-2">
										<div className="flex items-center justify-between">
											<span className="text-[12px] font-bold text-gray-700 uppercase tracking-wider">
												Base Hourly Wage
											</span>
											<span className="text-[15px] font-extrabold text-[#111111] tabular-nums">
												${wage.toFixed(2)}/hr
											</span>
										</div>

										{/* Quick Wage Preset Chips */}
										<div className="flex items-center gap-1.5 flex-wrap">
											{[15, 17, 20, 25, 30].map((rate) => (
												<button
													key={rate}
													type="button"
													onClick={() => setWage(rate)}
													className={`px-3 py-1 text-[12px] font-bold rounded-xl transition-all cursor-pointer ${
														wage === rate
															? 'bg-[#111111] text-white shadow-xs'
															: 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
													}`}
												>
													${rate}/hr
												</button>
											))}
										</div>

										{/* Stepper + Input */}
										<div className="flex items-center gap-2 mt-1">
											<button
												type="button"
												onClick={() =>
													setWage((w) =>
														Math.max(1, Number((w - 0.5).toFixed(2))),
													)
												}
												className="w-9 h-9 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-700 font-bold active:scale-95 transition-transform"
											>
												-
											</button>
											<div className="flex-1 flex items-center justify-center bg-white border border-gray-200 rounded-xl h-9 px-3">
												<span className="text-gray-400 text-[13px] mr-1">$</span>
												<input
													type="number"
													step="0.5"
													min="1"
													max="999"
													value={wage}
													onChange={(e) => {
														const val = parseFloat(e.target.value);
														if (!isNaN(val) && val > 0) setWage(val);
													}}
													className="w-full text-center font-bold text-[14px] text-gray-900 bg-transparent focus:outline-none tabular-nums"
												/>
												<span className="text-gray-400 text-[12px] ml-1">/hr</span>
											</div>
											<button
												type="button"
												onClick={() =>
													setWage((w) => Number((w + 0.5).toFixed(2)))
												}
												className="w-9 h-9 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-700 font-bold active:scale-95 transition-transform"
											>
												+
											</button>
										</div>
									</div>
								)}

								{/* SCREEN 2: VEHICLE EFFICIENCY, GAS PRICE & TANK CAPACITY CONFIG */}
								{currentIndex === 1 && (
									<div className="mt-2 bg-[#F9FAFB] border border-gray-100 rounded-2xl p-3 flex flex-col gap-2.5">
										{/* Row 1: MPG */}
										<div className="flex items-center justify-between">
											<span className="text-[12px] font-bold text-gray-700">
												Fuel Economy
											</span>
											<div className="flex items-center gap-1">
												{[22, 29, 35, 42].map((val) => (
													<button
														key={val}
														type="button"
														onClick={() => setMpg(val)}
														className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all ${
															mpg === val
																? 'bg-[#111111] text-white'
																: 'bg-white text-gray-600 border border-gray-200'
														}`}
													>
														{val} MPG
													</button>
												))}
											</div>
										</div>

										{/* Row 2: Gas Price & Tank Size */}
										<div className="grid grid-cols-2 gap-2">
											<div className="bg-white border border-gray-200 rounded-xl p-2 flex flex-col">
												<span className="text-[11px] text-gray-500 font-medium">
													Gas Price
												</span>
												<div className="flex items-center justify-between mt-1">
													<span className="text-[13px] font-bold text-gray-900 tabular-nums">
														${gasPrice.toFixed(2)}/gal
													</span>
													<div className="flex items-center gap-1">
														<button
															type="button"
															onClick={() =>
																setGasPrice((g) =>
																	Math.max(1, Number((g - 0.1).toFixed(2))),
																)
															}
															className="w-5 h-5 rounded-md bg-gray-100 hover:bg-gray-200 text-[11px] font-bold flex items-center justify-center"
														>
															-
														</button>
														<button
															type="button"
															onClick={() =>
																setGasPrice((g) =>
																	Number((g + 0.1).toFixed(2)),
																)
															}
															className="w-5 h-5 rounded-md bg-gray-100 hover:bg-gray-200 text-[11px] font-bold flex items-center justify-center"
														>
															+
														</button>
													</div>
												</div>
											</div>

											<div className="bg-white border border-gray-200 rounded-xl p-2 flex flex-col">
												<span className="text-[11px] text-gray-500 font-medium">
													Tank Capacity
												</span>
												<div className="flex items-center justify-between mt-1">
													<span className="text-[13px] font-bold text-gray-900 tabular-nums">
														{tankSize.toFixed(1)} Gal
													</span>
													<div className="flex items-center gap-1">
														<button
															type="button"
															onClick={() =>
																setTankSize((t) =>
																	Math.max(5, Number((t - 1).toFixed(1))),
																)
															}
															className="w-5 h-5 rounded-md bg-gray-100 hover:bg-gray-200 text-[11px] font-bold flex items-center justify-center"
														>
															-
														</button>
														<button
															type="button"
															onClick={() =>
																setTankSize((t) =>
																	Number((t + 1).toFixed(1)),
																)
															}
															className="w-5 h-5 rounded-md bg-gray-100 hover:bg-gray-200 text-[11px] font-bold flex items-center justify-center"
														>
															+
														</button>
													</div>
												</div>
											</div>
										</div>

										{/* Computed Subtext */}
										<div className="flex items-center justify-between text-[11.5px] text-gray-500 px-0.5">
											<span>
												Running cost:{' '}
												<strong className="text-gray-900 tabular-nums">
													${costPerMile.toFixed(2)}/mi
												</strong>
											</span>
											<span>
												Full tank:{' '}
												<strong className="text-gray-900 tabular-nums">
													${(gasPrice * tankSize).toFixed(2)}
												</strong>
											</span>
										</div>
									</div>
								)}

								{/* SCREEN 3: EVERYDAY ROUTINE / HABIT COST CONFIG */}
								{currentIndex === 2 && (
									<div className="mt-2 bg-[#F9FAFB] border border-gray-100 rounded-2xl p-3.5 flex flex-col gap-2">
										<div className="flex items-center justify-between">
											<span className="text-[12px] font-bold text-gray-700 uppercase tracking-wider">
												Morning Coffee / Habit Cost
											</span>
											<span className="text-[15px] font-extrabold text-[#111111] tabular-nums">
												${habitCost.toFixed(2)}
											</span>
										</div>

										{/* Quick Habit Chips */}
										<div className="flex items-center gap-1.5 flex-wrap">
											{[3.5, 4.5, 5.75, 7.0, 9.5].map((cost) => (
												<button
													key={cost}
													type="button"
													onClick={() => setHabitCost(cost)}
													className={`px-3 py-1 text-[12px] font-bold rounded-xl transition-all cursor-pointer ${
														habitCost === cost
															? 'bg-[#111111] text-white shadow-xs'
															: 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
													}`}
												>
													${cost.toFixed(2)}
												</button>
											))}
										</div>

										<div className="flex items-center justify-between text-[11.5px] text-gray-500 pt-0.5">
											<span>
												Seeds initial quick-tap preset: <strong>Morning Espresso</strong>
											</span>
										</div>
									</div>
								)}
							</motion.div>
						</AnimatePresence>
					</div>

					{/* 3. Centered Stepper & Thumb-Zone Controls */}
					<div className="flex flex-col gap-3 w-full pt-3 shrink-0">
						{/* 3-dot pagination pills centered horizontally */}
						<div className="flex items-center justify-center gap-1.5 py-1 w-full">
							{screens.map((screen, idx) => {
								const isActive = idx === currentIndex;
								return (
									<button
										key={screen.id}
										type="button"
										onClick={() => handleDotClick(idx)}
										aria-label={`Go to step ${idx + 1}`}
										aria-current={
											isActive ? 'step' : undefined
										}
										className={`transition-all duration-300 cursor-pointer ${
											isActive
												? 'w-6 h-2 bg-[#111111] rounded-full'
												: 'w-2 h-2 bg-[#E5E7EB] rounded-full'
										}`}
									/>
								);
							})}
						</div>

						{/* Bottom Action Row */}
						<div className="flex items-center gap-3 w-full">
							{/* Screens 2 & 3: Muted Back button */}
							{currentIndex > 0 && (
								<button
									type="button"
									onClick={prevStep}
									className="h-[52px] px-5 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.98] text-neutral-800 font-semibold text-[15px] rounded-2xl flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
								>
									<svg
										className="w-4 h-4 stroke-[2.5]"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M15.75 19.5L8.25 12l7.5-7.5"
										/>
									</svg>
									<span>Back</span>
								</button>
							)}

							{/* Primary CTA button */}
							<button
								type="button"
								onClick={nextStep}
								className={`${
									currentIndex === 0 ? 'w-full' : 'flex-1'
								} h-[52px] bg-[#111111] hover:bg-neutral-900 active:scale-[0.98] text-white font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer`}
							>
								<span>
									{currentIndex === screens.length - 1
										? 'Get Started'
										: 'Continue'}
								</span>
								<svg
									className="w-4 h-4 stroke-[2.5]"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M8.25 4.5l7.5 7.5-7.5 7.5"
									/>
								</svg>
							</button>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
};
