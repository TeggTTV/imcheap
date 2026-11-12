import React, {
	useState,
	useEffect,
	useCallback,
	useRef,
} from 'react';
import { motion, AnimatePresence, Transition } from 'motion/react';
import { PresetItem } from '../utils/expenseMath';
import {
	IntroStep,
	useWageStep,
	useCommuteStep,
	useHabitStep,
	usePaycheckStep,
} from './onboarding';

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
		netpay: number;
		presets: PresetItem[];
	}) => void;
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

const imageSlideVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? '100%' : '-100%',
	}),
	center: {
		x: 0,
	},
	exit: (direction: number) => ({
		x: direction > 0 ? '-100%' : '100%',
	}),
};

const IOS_PUSH_TRANSITION: Transition = {
	duration: 0.28,
	ease: [0.25, 1, 0.5, 1],
};

const SLIDE_TRANSITION: Transition = {
	x: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
	opacity: { duration: 0.2, ease: [0.25, 1, 0.5, 1] },
};

const IMAGE_TRANSITION: Transition = {
	x: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
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
	const [netpay, setNetpay] = useState<number>(
		ONBOARDING_CONFIG_DEFAULTS.netpay,
	);
	const [isEditingNetpay, setIsEditingNetpay] = useState<boolean>(false);
	const [netpayInput, setNetpayInput] = useState<string>(
		ONBOARDING_CONFIG_DEFAULTS.netpay.toFixed(2),
	);

	const touchStartX = useRef<number | null>(null);
	const touchStartY = useRef<number | null>(null);

	// Modular step configurations
	const introDefinition = {
		id: 'step_intro',
		image: '',
		fallbackImage: '',
		receipt: null,
		headline: 'Every Dollar Costs Hours of Life',
		body: 'Convert price tags into the real time it took you to earn them.',
		ctaText: 'Get Started',
		renderContent: () => null,
	};

	const wageStep = useWageStep({ wage, setWage });
	const commuteStep = useCommuteStep({
		wage,
		mpg,
		setMpg,
		gasPrice,
		setGasPrice,
		tankSize,
		setTankSize,
	});
	const habitStep = useHabitStep({ wage, habitCost, setHabitCost });
	const paycheckStep = usePaycheckStep({
		netpay,
		setNetpay,
		netpayInput,
		setNetpayInput,
		isEditingNetpay,
		setIsEditingNetpay,
	});

	const screens = [
		introDefinition,
		wageStep,
		commuteStep,
		habitStep,
		paycheckStep,
	];

	// For the underlying split-view, anchor to step 1 (WageStep) minimum so elements are ready
	const walkthroughStep = screens[Math.max(1, currentIndex)];

	const handleFinish = useCallback(() => {
		const vehicle = { mpg, gasPrice, tankSize };
		const presets: PresetItem[] = [];

		const parsed = parseFloat(netpayInput);
		const committedNetpay = !isNaN(parsed) && parsed >= 0 ? parsed : netpay;

		try {
			localStorage.setItem('imcheap_wage', String(wage));
			localStorage.setItem('imcheap_vehicle', JSON.stringify(vehicle));
			localStorage.setItem('imcheap_presets', JSON.stringify(presets));
			localStorage.setItem('imcheap_netpay', String(committedNetpay));
			localStorage.setItem('imcheap_onboarding_completed', 'true');
		} catch (err) {
			console.warn(
				'Failed to persist onboarding settings to localStorage',
				err,
			);
		}

		if (onComplete) {
			onComplete({ wage, vehicle, netpay: committedNetpay, presets });
		}
		onClose();
	}, [wage, mpg, gasPrice, tankSize, netpay, netpayInput, onComplete, onClose]);

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
		screens.forEach((screen) => {
			if (screen.image) {
				const img = new Image();
				img.src = screen.image;
			}
		});
	}, [screens]);

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

	const handleTouchStart = (e: React.TouchEvent) => {
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

	const walkthroughImageSrc =
		imageErrors[walkthroughStep.id] && walkthroughStep.fallbackImage
			? walkthroughStep.fallbackImage
			: walkthroughStep.image;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
			{/* Device container matching mobile frame */}
			<div
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
				className="relative w-full sm:max-w-105 h-dvh sm:h-215 bg-white sm:rounded-[36px] overflow-hidden flex flex-col shadow-2xl select-none"
			>
				{/* Step 1: Native iOS Parallax Root Screen */}
				<motion.div
					initial={false}
					animate={{
						x: currentIndex === 0 ? '0%' : '-28%',
						scale: currentIndex === 0 ? 1 : 0.96,
						opacity: currentIndex === 0 ? 1 : 0.75,
					}}
					transition={IOS_PUSH_TRANSITION}
					className={`absolute inset-0 z-10 w-full h-full transform-gpu will-change-transform ${
						currentIndex === 0
							? 'pointer-events-auto'
							: 'pointer-events-none'
					}`}
				>
					<IntroStep
						onNext={nextStep}
						onSkip={handleSkip}
						onDotClick={handleDotClick}
					/>
				</motion.div>

				{/* Steps 2-5: Native iOS Push Card View with Edge Shadow */}
				<motion.div
					initial={false}
					animate={{
						x: currentIndex === 0 ? '100%' : '0%',
					}}
					transition={IOS_PUSH_TRANSITION}
					className={`absolute inset-0 z-20 w-full h-full flex flex-col bg-white shadow-[-12px_0_30px_rgba(0,0,0,0.18)] transform-gpu will-change-transform ${
						currentIndex > 0
							? 'pointer-events-auto'
							: 'pointer-events-none'
					}`}
				>
					{/* 1. Upper Hero Photo Container */}
					<div className="relative w-full h-[46vh] sm:h-100 bg-neutral-100 shrink-0 overflow-visible">
						{/* Full-bleed edge-to-edge photography with page sliding */}
						<div className="absolute inset-0 w-full h-full overflow-hidden">
							<AnimatePresence
								initial={false}
								custom={direction}
								mode="popLayout"
							>
								<motion.div
									key={walkthroughStep.id}
									custom={direction}
									variants={imageSlideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={IMAGE_TRANSITION}
									className="w-full h-full transform-gpu"
								>
									<img
										src={walkthroughImageSrc}
										alt={walkthroughStep.headline}
										onError={() => {
											setImageErrors((prev) => ({
												...prev,
												[walkthroughStep.id]: true,
											}));
										}}
										className="w-full h-full object-cover object-center pointer-events-none"
									/>
								</motion.div>
							</AnimatePresence>
						</div>

						{/* Subtle top-down vignette gradient for header legibility */}
						<div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/75 via-black/25 to-transparent pointer-events-none z-10" />

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

						{/* Pinned Floating Micro-Receipt Card (only rendered on steps that have a receipt) */}
						{walkthroughStep.receipt && (
							<div className="absolute -bottom-6 inset-x-6 z-20 h-17 bg-white rounded-2xl px-3.5 shadow-xl border border-slate-100 flex items-center overflow-hidden">
								<div className="relative w-full h-full">
									<AnimatePresence
										initial={false}
										custom={direction}
										mode="popLayout"
									>
										<motion.div
											key={walkthroughStep.id + '_receipt'}
											custom={direction}
											variants={slideVariants}
											initial="enter"
											animate="center"
											exit="exit"
											transition={SLIDE_TRANSITION}
											className="w-full h-full flex items-center justify-between min-w-0 transform-gpu"
										>
											{/* Left side: Category circular badge + title and subtext */}
											<div className="flex items-center gap-3 min-w-0 pr-2">
												<div
													className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg shadow-xs"
													style={{
														backgroundColor:
															walkthroughStep
																.receipt.iconBg,
														color: walkthroughStep
															.receipt.iconColor,
													}}
												>
													<span className="material-symbols-outlined text-[20px]">
														{
															walkthroughStep
																.receipt.icon
														}
													</span>
												</div>
												<div className="flex flex-col min-w-0">
													<span className="font-semibold text-slate-900 text-[14px] leading-tight truncate">
														{
															walkthroughStep
																.receipt.title
														}
													</span>
													<span className="text-[12px] text-slate-500 font-medium leading-normal mt-0.5 truncate tabular-nums">
														{
															walkthroughStep
																.receipt
																.subtitle
														}
													</span>
												</div>
											</div>

											{/* Right side: Emerald pill badge displaying clock icon and shift labor time */}
											<div className="bg-[#ECFDF5] text-secondary px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap flex items-center gap-1.5 shrink-0">
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
													{
														walkthroughStep.receipt
															.labor
													}
												</span>
											</div>
										</motion.div>
									</AnimatePresence>
								</div>
							</div>
						)}
					</div>

					{/* 2. Compact White Bottom Sheet */}
					<section className="bg-white rounded-t-4xl px-6 pt-6 pb-6 sm:pb-8 pb-safe flex flex-col justify-between shadow-2xl relative z-10 -mt-6 flex-1 min-h-0">
						{/* Text Block & Content Container with mode="popLayout" to eliminate displacement */}
						<div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
							<AnimatePresence
								initial={false}
								custom={direction}
								mode="popLayout"
							>
								<motion.div
									key={walkthroughStep.id + '_sheet_content'}
									custom={direction}
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={SLIDE_TRANSITION}
									className="w-full h-full flex flex-col justify-between transform-gpu"
								>
									{/* Text Block */}
									<div
										className={`flex flex-col gap-1.5 shrink-0 ${
											currentIndex === 4
												? 'pt-1'
												: 'pt-16'
										}`}
									>
										<h1 className="text-[22px] sm:text-[24px] font-extrabold text-[#111111] leading-[1.2] tracking-tight">
											{walkthroughStep.headline}
										</h1>
										<p className="text-[13px] text-[#6B7280] leading-relaxed font-normal">
											{walkthroughStep.body}
										</p>
									</div>

									{/* Step Interactive Content */}
									{walkthroughStep.renderContent()}
								</motion.div>
							</AnimatePresence>
						</div>

						{/* 3. Centered Stepper & Thumb-Zone Controls */}
						<div className="flex flex-col gap-3 w-full pt-2 shrink-0">
							{/* 5-dot pagination pills centered horizontally */}
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
											className={`transition-all duration-280 ease-out cursor-pointer ${
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
								{/* Back button */}
								<button
									type="button"
									onClick={prevStep}
									className="h-13 px-5 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.98] text-neutral-800 font-semibold text-[15px] rounded-2xl flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
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

								{/* Primary CTA button */}
								<button
									type="button"
									onClick={nextStep}
									className="flex-1 h-13 bg-[#111111] hover:bg-neutral-900 active:scale-[0.98] text-white font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
								>
									<span>{walkthroughStep.ctaText}</span>
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
				</motion.div>
			</div>
		</div>
	);
};
