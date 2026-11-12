import React from 'react';

export interface FloatingOrbitalIcon {
	id: string;
	emoji: string;
	bg: string;
	positionClasses: string;
	animationClass: string;
}

export const FLOATING_ORBITAL_ICONS: FloatingOrbitalIcon[] = [
	{
		id: 'food',
		emoji: '🍔',
		bg: 'bg-[#ffeedd]/90',
		positionClasses: 'top-3 left-6 sm:top-4 sm:left-8',
		animationClass: 'animate-[bounce_4s_infinite]',
	},
	{
		id: 'commute',
		emoji: '🚗',
		bg: 'bg-[#e0e7ff]/90',
		positionClasses: 'top-6 right-3 sm:top-7 sm:right-6',
		animationClass: 'animate-[bounce_5s_infinite_0.5s]',
	},
	{
		id: 'coffee',
		emoji: '☕',
		bg: 'bg-[#ffdad6]/90',
		positionClasses: 'top-[44%] -left-3 sm:-left-2',
		animationClass: 'animate-[bounce_4.5s_infinite_1s]',
	},
	{
		id: 'fitness',
		emoji: '🏐',
		bg: 'bg-[#d1fae5]/90',
		positionClasses: 'bottom-7 right-2 sm:bottom-9 sm:right-5',
		animationClass: 'animate-[bounce_4.2s_infinite_1.5s]',
	},
	{
		id: 'cash',
		emoji: '💵',
		bg: 'bg-[#bbf7d0]/90',
		positionClasses: 'bottom-3 left-10 sm:bottom-5 sm:left-14',
		animationClass: 'animate-[bounce_5.2s_infinite_0.8s]',
	},
];

interface IntroStepProps {
	onNext: () => void;
	onSkip: () => void;
	onDotClick: (index: number) => void;
}

export const IntroStep: React.FC<IntroStepProps> = ({
	onNext,
	onSkip,
	onDotClick,
}) => {
	return (
		<div className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] p-6 pb-safe transform-gpu will-change-transform">
			{/* Ambient Radial Glows (GPU-Accelerated) */}
			<div className="absolute inset-0 pointer-events-none z-0 overflow-hidden transform-gpu">
				<div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-[#86f2e4]/30 blur-[60px] transform-gpu" />
				<div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-[#85f8c4]/25 blur-[50px] transform-gpu" />
				<div className="absolute -bottom-24 left-10 w-96 h-96 rounded-full bg-[#ebe7e7]/60 blur-[60px] transform-gpu" />
			</div>

			{/* Top Utility Bar */}
			<div className="relative z-20 flex items-center justify-between w-full pt-1 pb-1">
				<span className="text-[18px] font-extrabold tracking-tight text-[#1c1b1b] font-sans">
					ImCheap
				</span>
				<button
					type="button"
					onClick={onSkip}
					className="text-[14px] text-[#6d7a72] hover:text-[#1c1b1b] py-1 px-2.5 rounded-full active:bg-neutral-200/50 transition-colors cursor-pointer font-semibold"
				>
					Skip
				</button>
			</div>

			{/* Concentric Orbital Canvas */}
			<div className="relative w-full aspect-square max-w-85 sm:max-w-92.5 mx-auto flex items-center justify-center my-auto shrink-0 z-10">
				{/* Ambient Radial Underglows */}
				<div className="absolute inset-0 m-auto w-64 h-64 rounded-full bg-[#86f2e4]/40 blur-3xl pointer-events-none" />
				<div className="absolute inset-0 m-auto w-44 h-44 rounded-full bg-[#85f8c4]/35 blur-2xl pointer-events-none" />

				{/* Orbit Ring 3 (Outer ~304px) */}
				<div className="absolute w-72.5 h-72.5 sm:w-76 sm:h-76 rounded-full shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.85)] pointer-events-none" />
				{/* Orbit Ring 2 (Middle ~226px) */}
				<div className="absolute w-54 h-54 sm:w-56.5 sm:h-56.5 rounded-full shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.9)] pointer-events-none" />
				{/* Orbit Ring 1 (Inner ~150px) */}
				<div className="absolute w-35.5 h-35.5 sm:w-37.5 sm:h-37.5 rounded-full shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.95)] pointer-events-none" />

				{/* Center Core Badge: High-Elevation Time Hub */}
				<div className="relative z-10 w-20 h-20 rounded-full bg-white/90 backdrop-blur-md shadow-xl flex flex-col items-center justify-center transform active:scale-95 transition-transform duration-300">
					<div className="w-24 h-24 rounded-full bg-[#85f8c4]/30 flex items-center justify-center">
						<span
							className="material-symbols-outlined text-secondary text-[28px]"
							style={{
								fontVariationSettings: "'FILL' 1, 'wght' 600",
							}}
						>
							hourglass_top
						</span>
					</div>
				</div>

				{/* Floating Planetary Icons (Luma-Inspired Aesthetic) */}
				{FLOATING_ORBITAL_ICONS.map((item) => (
					<div
						key={item.id}
						className={`absolute ${item.positionClasses} z-10 transform hover:scale-110 active:scale-95 transition-all duration-300 ${item.animationClass}`}
					>
						<div
							className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${item.bg} backdrop-blur-md shadow-lg shadow-black/8 ring-2 ring-white/95 flex items-center justify-center cursor-pointer`}
						>
							<span className="text-2xl sm:text-3xl select-none leading-none">
								{item.emoji}
							</span>
						</div>
					</div>
				))}
			</div>

			{/* Centered Brand & Typography Hierarchy */}
			<div className="relative z-10 text-center flex flex-col items-center shrink-0 mb-3">
				<h1 className="text-[26px] sm:text-[30px] text-[#1c1b1b] font-extrabold tracking-tight leading-tight">
					Every Dollar Costs
				</h1>
				<h2 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight text-secondary leading-tight">
					Hours of Life
				</h2>
				<p className="text-[13px] text-[#6d7a72] mt-1.5 max-w-72.5 leading-relaxed">
					Convert price tags into the real time it took you to earn
					them. Mindful spending, zero guilt.
				</p>
			</div>

			{/* Stepper Pagination & Action Controls */}
			<div className="relative z-10 w-full flex flex-col gap-3 shrink-0">
				{/* 5-dot Stepper Indicator */}
				<div
					aria-label="Progress: Step 1 of 5"
					className="flex items-center justify-center space-x-1.5 py-1 w-full"
				>
					<button
						type="button"
						onClick={() => onDotClick(0)}
						aria-label="Go to step 1"
						aria-current="step"
						className="w-6 h-2 rounded-full bg-[#1c1b1b] transition-all duration-350 ease-in-out cursor-pointer"
					/>
					{[1, 2, 3, 4].map((idx) => (
						<button
							key={idx}
							type="button"
							onClick={() => onDotClick(idx)}
							aria-label={`Go to step ${idx + 1}`}
							className="w-2 h-2 rounded-full bg-primary-fixed transition-all duration-350 ease-in-out cursor-pointer"
						/>
					))}
				</div>

				{/* Primary Bottom CTA Button */}
				<button
					type="button"
					onClick={onNext}
					className="w-full h-13 rounded-2xl bg-[#111111] hover:bg-neutral-900 active:scale-[0.98] transition-transform duration-200 text-white font-bold text-[16px] flex items-center justify-center gap-2 shadow-sm cursor-pointer"
				>
					<span>Get Started</span>
					<span className="material-symbols-outlined text-[18px]">
						arrow_forward
					</span>
				</button>

				{/* Security Lock Note */}
				{/* <div className="flex items-center justify-center space-x-1.5 text-center -mt-1">
					<span className="material-symbols-outlined text-[#6d7a72] text-[13px]">
						lock
					</span>
					<span className="text-[11px] text-[#6d7a72] font-medium">
						Private by default. No bank logins needed.
					</span>
				</div> */}
			</div>
		</div>
	);
};
