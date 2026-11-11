import React, {
	useState,
	useEffect,
	useCallback,
	useRef,
	useMemo,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PresetItem } from '../utils/expenseMath';
import {
	WheelPicker,
	WheelPickerWrapper,
	WheelPickerOption,
} from '@/components/ui/wheel-picker';

export interface OnboardingScreenConfig {
	wage: number;
	vehicle: {
		mpg: number;
		gasPrice: number;
		tankSize: number;
	};
	habitCost: number;
	netpay: number;
}

export const ONBOARDING_CONFIG_DEFAULTS: OnboardingScreenConfig = {
	wage: 17.0,
	vehicle: {
		mpg: 29,
		gasPrice: 3.9,
		tankSize: 14.0,
	},
	habitCost: 0,
	netpay: 0,
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

// Generate options for wheel pickers
const wageOptions: WheelPickerOption<string>[] = Array.from(
	{ length: 86 }, // $10 to $95
	(_, i) => {
		const val = 10 + i;
		return { label: `$${val}/hr`, value: String(val) };
	},
);

const mpgOptions: WheelPickerOption<string>[] = Array.from(
	{ length: 46 }, // 15 to 60 MPG
	(_, i) => {
		const val = 15 + i;
		return { label: `${val} MPG`, value: String(val) };
	},
);

const gasPriceOptions: WheelPickerOption<string>[] = Array.from(
	{ length: 36 }, // $2.50 to $6.00 in $0.10 increments
	(_, i) => {
		const val = (2.5 + i * 0.1).toFixed(2);
		return { label: `$${val}/gal`, value: val };
	},
);

const tankSizeOptions: WheelPickerOption<string>[] = Array.from(
	{ length: 23 }, // 8 to 30 gal
	(_, i) => {
		const val = 8 + i;
		return { label: `${val} Gal`, value: String(val) };
	},
);

const habitOptions: WheelPickerOption<string>[] = [
	{ label: 'None', value: '0.00' },
	{ label: '$2.50 (Drip Coffee)', value: '2.50' },
	{ label: '$3.50 (Americano)', value: '3.50' },
	{ label: '$4.50 (Morning Espresso)', value: '4.50' },
	{ label: '$5.50 (Artisan Latte)', value: '5.50' },
	{ label: '$6.50 (Cold Brew / Matcha)', value: '6.50' },
	{ label: '$7.50 (Cafe Specialty)', value: '7.50' },
	{ label: '$9.00 (Breakfast Combo)', value: '9.00' },
	{ label: '$12.00 (Lunch Daily)', value: '12.00' },
	{ label: '$15.00 (Daily Takeout)', value: '15.00' },
];

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
	const [mpg, setMpg] = useState<number>(
		ONBOARDING_CONFIG_DEFAULTS.vehicle.mpg,
	);
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
				body: 'Scroll to set your hourly wage. Watch how lunch translates into exact working shift minutes in real time.',
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
				body: "Spin to match your car's fuel economy, gas price, and tank capacity. ImCheap recalculates every commute in shift labor.",
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
				body: 'Select your everyday routine price to create your initial 1-tap quick log button with automatic work-hour conversions.',
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
		const presets: PresetItem[] = [];

		try {
			localStorage.setItem('imcheap_wage', String(wage));
			localStorage.setItem('imcheap_vehicle', JSON.stringify(vehicle));
			localStorage.setItem('imcheap_presets', JSON.stringify(presets));
			localStorage.setItem('imcheap_onboarding_completed', 'true');
		} catch (err) {
			console.warn(
				'Failed to persist onboarding settings to localStorage',
				err,
			);
		}

		if (onComplete) {
			onComplete({ wage, vehicle, presets });
		}
		onClose();
	}, [
		wage,
		mpg,
		gasPrice,
		tankSize,
		habitCost,
		commuteDistance,
		commuteCost,
		onComplete,
		onClose,
	]);

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

	// Touch swipe gesture handlers (disabled on interactive wheel areas)
	const handleTouchStart = (e: React.TouchEvent) => {
		// If touch originates inside a wheel picker, don't trigger slide change
		if ((e.target as HTMLElement).closest('[data-rwp-wrapper]')) {
			touchStartX.current = null;
			touchStartY.current = null;
			return;
		}
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
				{/* 1. Upper Hero Photo Container */}
				<div className="relative w-full h-[46vh] sm:h-[400px] bg-black shrink-0 overflow-visible">
					{/* Full-bleed edge-to-edge photography with page sliding */}
					<div className="absolute inset-0 w-full h-full overflow-hidden">
						<AnimatePresence
							initial={false}
							custom={direction}
							mode="popLayout"
						>
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
								className="w-full h-full"
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
						<div className="relative w-full h-full">
							<AnimatePresence
								initial={false}
								custom={direction}
								mode="popLayout"
							>
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
									className="w-full h-full flex items-center justify-between min-w-0"
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

				{/* 2. Compact White Bottom Sheet */}
				<section className="bg-white rounded-t-[32px] px-6 pt-10 pb-6 sm:pb-8 pb-safe flex flex-col justify-between shadow-2xl relative z-10 -mt-6 flex-1 min-h-0">
					{/* Text Block & Wheel Picker Container with mode="popLayout" to eliminate displacement */}
					<div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
						<AnimatePresence
							initial={false}
							custom={direction}
							mode="popLayout"
						>
							<motion.div
								key={currentStep.id + '_sheet_content'}
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
								className="w-full h-full flex flex-col justify-between"
							>
								{/* Text Block */}
								<div className="flex flex-col gap-1.5 shrink-0 pt-8">
									<h1 className="text-[22px] sm:text-[24px] font-extrabold text-[#111111] leading-[1.2] tracking-tight">
										{currentStep.headline}
									</h1>
									<p className="text-[13px] text-[#6B7280] leading-relaxed font-normal">
										{currentStep.body}
									</p>
								</div>

								{/* SCREEN 1: HOURLY WAGE OPTION WHEEL */}
								{currentIndex === 0 && (
									<div className="my-auto py-2 flex flex-col items-center">
										<div className="w-full rounded-2xl p-3 shadow-inner flex flex-col items-center">
											<div className="flex items-center justify-between w-full px-2 mb-1.5">
												<span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
													How much do you make?
												</span>
											</div>

											{/* Native @ncdai/react-wheel-picker */}
											<div className="w-full h-[100px] flex items-center justify-center">
												<WheelPickerWrapper className="w-full h-[100px] bg-white rounded-xl  shadow-xs">
													<WheelPicker
														options={wageOptions}
														value={String(
															Math.round(wage),
														)}
														onValueChange={(
															val: string,
														) => {
															const num =
																parseFloat(val);
															if (!isNaN(num))
																setWage(num);
														}}
														optionItemHeight={32}
														visibleCount={12}
														classNames={{
															optionItem:
																'text-[13px] text-gray-400 font-medium tabular-nums select-none',
															highlightWrapper:
																'bg-gray-100/70 border-y border-gray-300 font-bold text-[15px] text-gray-900',
														}}
													/>
												</WheelPickerWrapper>
											</div>
										</div>
									</div>
								)}

								{/* SCREEN 2: VEHICLE TRANSIT MULTI-WHEEL (MPG, Gas Price, Tank) */}
								{currentIndex === 1 && (
									<div className="my-auto py-1 flex flex-col items-center">
										<div className="w-full rounded-2xl p-y2.5 shadow-inner flex flex-col items-center">
											<div className="flex items-center justify-between w-full px-1 mb-1">
												<span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
													What does a commute look
													like?
												</span>
											</div>

											{/* Multi Wheel Row: MPG + Gas Price + Tank Capacity */}
											<div className="w-full h-[100px]">
												<WheelPickerWrapper className="w-full h-[100px] bg-white rounded-xl shadow-xs flex items-stretch">
													{/* Wheel 1: MPG */}
													<div className="flex-1 flex flex-col">
														<WheelPicker
															options={mpgOptions}
															value={String(
																Math.round(mpg),
															)}
															onValueChange={(
																val: string,
															) => {
																const num =
																	parseFloat(
																		val,
																	);
																if (!isNaN(num))
																	setMpg(num);
															}}
															optionItemHeight={
																32
															}
															visibleCount={12}
															classNames={{
																optionItem:
																	'text-[12px] text-gray-400 font-medium tabular-nums',
																highlightWrapper:
																	'bg-gray-100/70 border-y border-gray-300 font-bold text-[13px] text-gray-900',
															}}
														/>
													</div>

													{/* Wheel 2: Gas Price */}
													<div className="flex-1 flex flex-col border-r border-gray-100">
														<WheelPicker
															options={
																gasPriceOptions
															}
															value={gasPrice.toFixed(
																2,
															)}
															onValueChange={(
																val: string,
															) => {
																const num =
																	parseFloat(
																		val,
																	);
																if (!isNaN(num))
																	setGasPrice(
																		num,
																	);
															}}
															optionItemHeight={
																32
															}
															visibleCount={12}
															classNames={{
																optionItem:
																	'text-[12px] text-gray-400 font-medium tabular-nums',
																highlightWrapper:
																	'bg-gray-100/70 border-y border-gray-300 font-bold text-[13px] text-gray-900',
															}}
														/>
													</div>

													{/* Wheel 3: Tank Size */}
													<div className="flex-1 flex flex-col">
														<WheelPicker
															options={
																tankSizeOptions
															}
															value={String(
																Math.round(
																	tankSize,
																),
															)}
															onValueChange={(
																val: string,
															) => {
																const num =
																	parseFloat(
																		val,
																	);
																if (!isNaN(num))
																	setTankSize(
																		num,
																	);
															}}
															optionItemHeight={
																32
															}
															visibleCount={12}
															classNames={{
																optionItem:
																	'text-[12px] text-gray-400 font-medium tabular-nums',
																highlightWrapper:
																	'bg-gray-100/70 border-y border-gray-300 font-bold text-[13px] text-gray-900',
															}}
														/>
													</div>
												</WheelPickerWrapper>
											</div>
										</div>
									</div>
								)}

								{/* SCREEN 3: ROUTINE EXPENSE WHEEL */}
								{currentIndex === 2 && (
									<div className="my-auto py-2 flex flex-col items-center">
										<div className="w-full rounded-2xl py-3 shadow-inner flex flex-col items-center">
											<div className="flex items-center justify-between w-full px-2 mb-1.5">
												<span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
													Choose Daily Habit
												</span>
											</div>

											{/* Habit Wheel */}
											<div className="w-full h-[100px] flex items-center justify-center">
												<WheelPickerWrapper className="w-full h-[100px] bg-white rounded-xl shadow-xs">
													<WheelPicker
														options={habitOptions}
														value={habitCost.toFixed(
															2,
														)}
														onValueChange={(
															val: string,
														) => {
															const num =
																parseFloat(val);
															if (!isNaN(num))
																setHabitCost(
																	num,
																);
														}}
														optionItemHeight={32}
														visibleCount={12}
														classNames={{
															optionItem:
																'text-[12.5px] text-gray-400 font-medium select-none truncate px-2',
															highlightWrapper:
																'bg-gray-100/70 border-y border-gray-300 font-bold text-[13.5px] text-gray-900',
														}}
													/>
												</WheelPickerWrapper>
											</div>
										</div>
									</div>
								)}
							</motion.div>
						</AnimatePresence>
					</div>

					{/* 3. Centered Stepper & Thumb-Zone Controls */}
					<div className="flex flex-col gap-3 w-full pt-2 shrink-0">
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
