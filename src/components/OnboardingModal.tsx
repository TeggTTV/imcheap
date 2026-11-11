import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface OnboardingReceipt {
	icon: string;
	iconEmoji: string;
	iconBg: string;
	iconColor: string;
	title: string;
	subtitle: string;
	cost: string;
	labor: string;
}

export interface OnboardingScreenData {
	id: string;
	image: string;
	fallbackImage?: string;
	receipt: OnboardingReceipt;
	headline: string;
	body: string;
	ctaText: string;
	isFinal: boolean;
}

export const ONBOARDING_SCREENS: OnboardingScreenData[] = [
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
			subtitle: '$14.50 • Dine-in (1 meal)',
			cost: '$14.50',
			labor: '≈ 51m of labor',
		},
		headline: 'Everything costs hours of your life.',
		body: 'Connect your hourly wage to visualize the physical minutes behind every meal, latte, and takeout order before you tap to pay.',
		ctaText: 'Continue',
		isFinal: false,
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
			subtitle: '$1.79 • Campus Route (12.8 mi)',
			cost: '$1.79',
			labor: '≈ 6.3m of labor',
		},
		headline: 'Stop counting dollars. Start counting miles.',
		body: "ImCheap syncs with your vehicle's fuel economy and local gas rates to reveal the true cost of every errand and road trip in working shift minutes.",
		ctaText: 'Continue',
		isFinal: false,
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
			subtitle: '$4.50 • Flat expense (Daily)',
			cost: '$4.50',
			labor: '≈ 15.9m of labor',
		},
		headline: 'Small routines silently drain your paycheck.',
		body: 'Track your everyday coffee runs, takeout meals, and subscriptions in real time. Know the exact minutes of your shift behind every purchase.',
		ctaText: 'Get Started',
		isFinal: true,
	},
];

interface OnboardingModalProps {
	isOpen: boolean;
	onClose: () => void;
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
}) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [direction, setDirection] = useState<number>(1);
	const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
	const touchStartX = useRef<number | null>(null);
	const touchStartY = useRef<number | null>(null);

	const currentStep = ONBOARDING_SCREENS[currentIndex];

	const nextStep = useCallback(() => {
		if (currentIndex < ONBOARDING_SCREENS.length - 1) {
			setDirection(1);
			setCurrentIndex((prev) => prev + 1);
		} else {
			onClose();
		}
	}, [currentIndex, onClose]);

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
				onClose();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, nextStep, prevStep, onClose]);

	// Swipe gesture handlers
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
				className="relative w-full sm:max-w-105 h-dvh sm:h-215 bg-white sm:rounded-[36px] overflow-hidden flex flex-col shadow-2xl select-none"
			>
				{/* 1. Upper Hero Photo Container (Dominant photo area on desktop, flexible on mobile) */}
				<div className="relative w-full h-[60vh] min-h-55  sm:h-127.5 bg-black shrink-0 overflow-visible">
					{/* Full-bleed photography with page sliding */}
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

					{/* Top Vignette Gradient for header legibility */}
					<div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/75 via-black/25 to-transparent pointer-events-none z-10" />

					{/* Navigation Bar Overlay */}
					<div className="relative z-20 flex items-center justify-between px-6 pt-6">
						<span className="text-[18px] font-extrabold tracking-tight text-white font-sans drop-shadow-sm">
							ImCheap
						</span>
						<button
							type="button"
							onClick={onClose}
							className="text-[15px] text-white opacity-80 hover:opacity-100 transition-opacity cursor-pointer font-medium drop-shadow-sm"
						>
							Skip
						</button>
					</div>

					{/* 2. Floating Micro-Receipt Pill (Anchored across the image/sheet boundary) */}
					<div className="absolute -bottom-6 inset-x-6 z-20 h-17 bg-white rounded-2xl p-3.5 shadow-xl border border-slate-100 overflow-hidden">
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
								className="absolute inset-0 px-3.5 flex items-center justify-between"
							>
								{/* Left Group: Icon + Name & Subtext */}
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
										<span className="text-[12px] text-slate-500 font-medium leading-normal mt-0.5 truncate">
											{currentStep.receipt.subtitle}
										</span>
									</div>
								</div>

								{/* Right Group: Emerald labor conversion pill */}
								<div className="bg-[#ECFDF5] text-secondary px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap flex items-center gap-1.5 shrink-0">
									<span
										className="material-symbols-outlined text-[15px]"
										style={{
											fontVariationSettings: "'FILL' 1",
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

				{/* 3. Compact White Bottom Sheet (Fills remaining height, responsive padding and spacing for mobile viewports) */}
				<section className="relative max-h-87.5 z-10 -mt-6 flex-1 w-full bg-white rounded-t-4xl px-6 pt-16 sm:pt-16 pb-6 sm:pb-8 pb-safe flex flex-col justify-between min-h-0">
					{/* Text Block */}
					<div className="relative overflow-hidden min-h-24 sm:min-h-32.5 flex flex-col justify-center">
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
								className="flex flex-col gap-1.5 sm:gap-2 w-full"
							>
								<h1 className="text-[22px] sm:text-[27px] font-extrabold text-[#111111] leading-[1.2] tracking-tight">
									{currentStep.headline}
								</h1>
								<p className="text-[13px] sm:text-[14px] text-[#6B7280] leading-relaxed font-normal">
									{currentStep.body}
								</p>
							</motion.div>
						</AnimatePresence>
					</div>

					{/* Navigation Controls: Centered Dots + Action Buttons */}
					<div className="flex flex-col gap-3 w-full pt-3 shrink-0">
						{/* Centered Pagination Indicator Pills */}
						<div className="flex items-center justify-center gap-1.5 py-1 w-full">
							{ONBOARDING_SCREENS.map((screen, idx) => {
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

						{/* Balanced Action Button Row */}
						<div className="flex items-center gap-3 w-full">
							{/* Back Button (shown when stepIndex > 0) */}
							{currentIndex > 0 && (
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
							)}

							{/* Primary CTA Button */}
							<button
								type="button"
								onClick={nextStep}
								className="flex-1 h-13 bg-[#111111] hover:bg-neutral-900 active:scale-[0.98] text-white font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
							>
								<span>
									{currentIndex ===
									ONBOARDING_SCREENS.length - 1
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
