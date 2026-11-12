import React from 'react';

interface OutroStepProps {
	onNext: () => void;
	onBack: () => void;
}

export const OutroStep: React.FC<OutroStepProps> = ({ onNext, onBack }) => {
	return (
		<div className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] p-6 pb-safe transform-gpu will-change-transform">
			{/* Ambient Radial Glows */}
			<div className="absolute inset-0 pointer-events-none z-0 overflow-hidden transform-gpu">
				<div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-[#86f2e4]/30 blur-[60px] transform-gpu" />
				<div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-[#85f8c4]/25 blur-[50px] transform-gpu" />
				<div className="absolute -bottom-24 left-10 w-96 h-96 rounded-full bg-[#ebe7e7]/60 blur-[60px] transform-gpu" />
			</div>

			{/* Floating Ambient Particles */}
			<div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
				<div className="absolute top-12 left-8 w-2 h-2 rounded-full bg-[#89f5e7] opacity-70 animate-pulse" />
				<div className="absolute top-20 right-10 w-2.5 h-2.5 rounded-full bg-[#e6e3d3] opacity-80" />
				<div className="absolute top-44 left-1/4 w-1.5 h-1.5 rounded-full bg-[#68dba9]" />
				<div className="absolute top-52 right-8 w-2 h-2 rounded-sm rotate-45 bg-[#86f2e4]/50" />
				<div className="absolute top-72 left-6 w-2.5 h-1.5 rounded-full rotate-12 bg-[#85f8c4]" />
				<div className="absolute top-80 right-16 w-2 h-2 rounded-full bg-[#cac7b8]" />
				<div className="absolute top-36 right-1/3 w-1.5 h-1.5 rounded-full bg-[#006948]/40" />
			</div>

			{/* Top Bar - Clean Logo Wordmark Only */}
			<div className="relative z-20 flex items-center justify-between w-full pt-1 pb-1">
				<span className="text-[18px] font-extrabold tracking-tight text-[#1c1b1b] font-sans">
					ImCheap
				</span>
			</div>

			{/* Luminous Celebratory Emblem Section */}
			<div className="relative w-full aspect-square max-w-75 sm:max-w-85 mx-auto flex items-center justify-center my-auto shrink-0 z-10">
				{/* Ambient Radiance Backdrop */}
				<div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-[#86f2e4]/30 to-[#85f8c4]/20 blur-2xl pointer-events-none" />

				{/* Outer Translucent Ring 1 */}
				<div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center shadow-sm">
					{/* Inner Glowing Ring 2 */}
					<div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-inner">
						{/* Centerpiece Core Badge */}
						<div className="relative w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-full bg-white shadow-[0_16px_36px_-6px_rgba(0,105,72,0.22)] flex items-center justify-center transform active:scale-95 transition-transform duration-300">
							<div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#006948] flex items-center justify-center shadow-md">
								<svg
									className="w-7 h-7 sm:w-8 sm:h-8 text-white stroke-[3]"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M4.5 12.75l6 6 9-13.5"
									/>
								</svg>
							</div>
						</div>
					</div>
				</div>

				{/* Floating Planetary Icons (Matching IntroStep Style) */}
				{/* Top-Left: Hourglass */}
				<div className="absolute top-1 left-2 sm:left-4 z-10 transform -rotate-6 hover:scale-110 active:scale-95 transition-all duration-300 animate-[bounce_4.5s_infinite]">
					<div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#ffeedd]/90 backdrop-blur-md shadow-lg shadow-black/8 ring-2 ring-white/95 flex items-center justify-center cursor-pointer">
						<span className="text-2xl select-none leading-none">
							⏳
						</span>
					</div>
				</div>

				{/* Bottom-Right: Target */}
				<div className="absolute bottom-1 right-2 sm:right-4 z-10 transform -rotate-3 hover:scale-110 active:scale-95 transition-all duration-300 animate-[bounce_5s_infinite_0.5s]">
					<div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#e0e7ff]/90 backdrop-blur-md shadow-lg shadow-black/8 ring-2 ring-white/95 flex items-center justify-center cursor-pointer">
						<span className="text-2xl select-none leading-none">
							🎯
						</span>
					</div>
				</div>
			</div>

			{/* Centered Typography & Content */}
			<div className="relative z-10 text-center flex flex-col items-center shrink-0 mb-4 px-2">
				<h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#1c1b1b] tracking-tight mb-2">
					You're All Set!
				</h1>
				<p className="text-[14px] text-[#4b5563] max-w-[300px] leading-relaxed">
					Your personal time-cost engine is ready. Step inside to start
					tracking your runway and preserving your hours.
				</p>
			</div>

			{/* Bottom Action Row (No Pagination Dots) */}
			<div className="relative z-10 w-full flex items-center gap-3 shrink-0 pt-2">
				{/* Back Button */}
				<button
					type="button"
					onClick={onBack}
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

				{/* Get Started Button */}
				<button
					type="button"
					onClick={onNext}
					className="flex-1 h-13 bg-[#111111] hover:bg-neutral-900 active:scale-[0.98] text-white font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
				>
					<span>Get Started</span>
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
	);
};

