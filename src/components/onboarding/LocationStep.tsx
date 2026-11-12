import React, { useState } from 'react';

interface LocationStepProps {
	onNext: () => void;
	onBack: () => void;
	onSkip: () => void;
	onDotClick: (index: number) => void;
	totalSteps?: number;
}

export const LocationStep: React.FC<LocationStepProps> = ({
	onNext,
	onBack,
	onSkip,
	onDotClick,
	totalSteps = 6,
}) => {
	const [status, setStatus] = useState<'idle' | 'loading' | 'success'>(
		'idle',
	);

	const handleTurnOnLocation = () => {
		if (status !== 'idle') return;
		setStatus('loading');
		try {
			localStorage.setItem('imcheap_location_enabled', 'true');
		} catch (err) {
			console.warn('Failed to save location preference', err);
		}

		setTimeout(() => {
			setStatus('success');
			setTimeout(() => {
				onNext();
			}, 600);
		}, 1000);
	};

	return (
		<div className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] p-6 pb-safe transform-gpu will-change-transform">
			{/* Ambient Radial Glows (GPU-Accelerated) */}
			<div className="absolute inset-0 pointer-events-none z-0 overflow-hidden transform-gpu">
				<div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-[#86f2e4]/30 blur-[60px] transform-gpu" />
				<div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-[#85f8c4]/25 blur-[50px] transform-gpu" />
				<div className="absolute -bottom-24 left-10 w-96 h-96 rounded-full bg-[#ebe7e7]/60 blur-[60px] transform-gpu" />
			</div>

			{/* Top Navigation Bar */}
			<header className="relative z-20 flex items-center justify-between w-full pt-1 pb-1">
				<div className="flex items-center gap-1.5">
					<span className="text-[18px] font-extrabold tracking-tight text-[#1c1b1b] font-sans">
						ImCheap
					</span>
					<span className="w-1.5 h-1.5 rounded-full bg-[#006948] mt-0.5 animate-pulse" />
				</div>
				<button
					type="button"
					onClick={onSkip}
					className="text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors py-1.5 px-3 rounded-full hover:bg-neutral-100 active:scale-95 cursor-pointer font-medium"
				>
					Skip
				</button>
			</header>

			{/* Center Visual Graphic & Value Proposition */}
			<div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto py-2">
				{/* 3D Isometric Paper Map with Vibrant Pin Marker */}
				<div className="relative w-72 h-56 flex items-center justify-center">
					{/* Ambient Confetti & Accent Particles */}
					<span
						className="absolute top-2 left-10 w-2.5 h-2.5 rounded-xs bg-amber-400 rotate-12 shadow-xs animate-bounce"
						style={{ animationDuration: '3.2s' }}
					/>
					<span className="absolute top-8 right-12 w-2 h-2 rounded-full bg-[#86f2e4] shadow-xs" />
					<span className="absolute top-4 right-20 w-3 h-3 rounded-md bg-amber-400 -rotate-6" />
					<span className="absolute top-14 left-4 w-2.5 h-2.5 rounded-full bg-[#006a61]" />
					<span className="absolute top-20 right-6 w-2.5 h-2.5 rounded-md bg-rose-500/80 rotate-45 shadow-xs" />
					<span className="absolute bottom-16 right-4 w-3 h-3 rounded-full bg-[#86f2e4] shadow-xs" />
					<span className="absolute bottom-20 left-6 w-2 h-2 rounded-full bg-rose-500/70" />
					<span className="absolute top-24 left-14 w-2 h-2 rounded-xs bg-[#68dba9] rotate-12" />
					<span className="absolute bottom-10 right-16 w-2 h-2 rounded-full bg-amber-300" />

					{/* Organic Fluid Map Blob Background */}
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<svg
							className="w-64 h-52 drop-shadow-xs opacity-90 overflow-visible"
							fill="none"
							viewBox="0 0 280 240"
							xmlns="http://www.w3.org/2000/svg"
						>
							<defs>
								<pattern
									id="standalone-city-streets"
									patternUnits="userSpaceOnUse"
									width="50"
									height="50"
								>
									<path
										d="M 0 25 L 50 25 M 25 0 L 25 50 M 0 10 L 50 40 M 10 0 L 40 50"
										opacity="0.65"
										stroke="#CBD5E1"
										strokeLinecap="round"
										strokeWidth="1.8"
									/>
									<circle
										cx="25"
										cy="25"
										r="2.5"
										fill="#94A3B8"
										opacity="0.5"
									/>
									<path
										d="M 0 45 Q 25 35 50 45"
										fill="none"
										stroke="#E2E8F0"
										strokeWidth="3"
									/>
								</pattern>
								<linearGradient
									id="standalone-blob-wash"
									x1="0%"
									y1="0%"
									x2="100%"
									y2="100%"
								>
									<stop offset="0%" stopColor="#FFFFFF" />
									<stop offset="60%" stopColor="#F1F5F9" />
									<stop offset="100%" stopColor="#E2E8F0" />
								</linearGradient>
								<clipPath id="standalone-blob-mask">
									<path d="M 140 20 C 205 10 255 45 250 115 C 245 175 210 215 155 225 C 95 235 45 205 35 150 C 25 90 70 30 140 20 Z" />
								</clipPath>
							</defs>

							<path
								d="M 140 20 C 205 10 255 45 250 115 C 245 175 210 215 155 225 C 95 235 45 205 35 150 C 25 90 70 30 140 20 Z"
								fill="url(#standalone-blob-wash)"
							/>
							<g clipPath="url(#standalone-blob-mask)">
								<rect
									width="280"
									height="240"
									fill="url(#standalone-city-streets)"
								/>
								<path
									d="M 40 160 C 90 120 180 190 250 100"
									fill="none"
									stroke="#FFFFFF"
									strokeLinecap="round"
									strokeWidth="6"
								/>
								<path
									d="M 80 40 C 130 90 150 170 200 220"
									fill="none"
									stroke="#FFFFFF"
									strokeLinecap="round"
									strokeWidth="4.5"
								/>
								<circle
									cx="170"
									cy="110"
									r="18"
									fill="#F8FAFC"
									opacity="0.7"
								/>
							</g>
						</svg>
					</div>

					{/* Folded 3D Isometric Paper Map with Vibrant Pin Marker */}
					<div className="relative z-10 w-44 h-36 flex items-center justify-center filter drop-shadow-md transform -rotate-1 hover:rotate-0 transition-transform duration-300">
						<svg
							className="w-full h-full overflow-visible"
							fill="none"
							viewBox="0 0 180 150"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M 18 108 L 58 126 L 102 108 L 146 126 L 158 116 L 118 98 L 74 116 L 30 98 Z"
								fill="#000000"
								opacity="0.08"
							/>
							<polygon
								points="20,50 60,68 60,122 20,104"
								fill="#38BDF8"
							/>
							<polygon
								points="20,50 60,68 60,78 20,60"
								fill="#7DD3FC"
								opacity="0.6"
							/>
							<path
								d="M 28 85 L 52 96"
								stroke="#FEF08A"
								strokeLinecap="round"
								strokeWidth="4"
							/>

							<polygon
								points="60,68 102,48 102,102 60,122"
								fill="#10B981"
							/>
							<path
								d="M 60 90 Q 80 82 102 70"
								fill="none"
								stroke="#FDE047"
								strokeWidth="4"
							/>
							<polygon
								points="75,58 92,50 92,94 75,102"
								fill="#059669"
								opacity="0.3"
							/>

							<polygon
								points="102,48 144,68 144,122 102,102"
								fill="#34D399"
							/>
							<path
								d="M 102 70 L 136 86"
								stroke="#FEF08A"
								strokeLinecap="round"
								strokeWidth="4"
							/>

							<polygon
								points="144,68 162,59 162,113 144,122"
								fill="#2DD4BF"
							/>
							<polygon
								points="144,68 162,59 162,70 144,79"
								fill="#99F6E4"
								opacity="0.7"
							/>

							<ellipse
								cx="88"
								cy="74"
								rx="14"
								ry="5.5"
								fill="#047857"
								opacity="0.25"
							/>

							<g className="transform -translate-y-2">
								<path
									d="M 88 74 C 74 54 62 40 62 26 C 62 11.6 73.6 0 88 0 C 102.4 0 114 11.6 114 26 C 114 40 102 54 88 74 Z"
									fill="url(#restore-pin-gradient)"
									filter="url(#restore-pin-shadow)"
								/>
								<path
									d="M 88 3 C 99.5 3 109 12.5 109 24 C 109 34 100 45 88 62 C 84 56 79 49 75 42 C 82 38 88 30 88 20 C 88 13.5 85 8 80 4 C 82.5 3.3 85.2 3 88 3 Z"
									fill="#FFFFFF"
									opacity="0.18"
								/>
								<circle
									cx="88"
									cy="26"
									r="8.5"
									fill="#FFFFFF"
								/>
								<circle
									cx="88"
									cy="26"
									r="4.5"
									fill="#FB7185"
									opacity="0.3"
								/>
							</g>

							<defs>
								<linearGradient
									id="restore-pin-gradient"
									x1="62"
									y1="0"
									x2="114"
									y2="74"
									gradientUnits="userSpaceOnUse"
								>
									<stop offset="0%" stopColor="#FB7185" />
									<stop offset="35%" stopColor="#F43F5E" />
									<stop offset="100%" stopColor="#E11D48" />
								</linearGradient>
								<filter
									id="restore-pin-shadow"
									x="52"
									y="-4"
									width="72"
									height="88"
									filterUnits="userSpaceOnUse"
								>
									<feDropShadow
										dx="0"
										dy="4"
										stdDeviation="3.5"
										floodColor="#9F1239"
										floodOpacity="0.28"
									/>
								</filter>
							</defs>
						</svg>
					</div>
				</div>

				{/* Headline & Value Proposition */}
				<div className="flex flex-col items-center text-center mt-3 max-w-sm px-2">
					<h2 className="text-[24px] sm:text-[26px] font-extrabold text-[#111111] tracking-tight leading-tight">
						Turn on Location Services
					</h2>
					<p className="text-[13px] text-neutral-500 mt-2 leading-relaxed max-w-xs font-normal">
						Detect local deals, store prices, and accurate sales tax
						automatically to calculate your true working hours spent
						wherever you shop.
					</p>

					{/* Privacy & Trust Badge */}
					<div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#86f2e4]/20 text-[#006f66] text-[12px] font-semibold">
						<span
							className="material-symbols-outlined text-[15px] leading-none"
							style={{ fontVariationSettings: "'FILL' 1" }}
						>
							lock
						</span>
						<span>Only used while in-app · Zero tracking</span>
					</div>
				</div>
			</div>

			{/* Bottom Action Dock */}
			<div className="relative z-20 flex flex-col items-center w-full gap-3 pt-2">
				{/* Pagination Stepper Pills (All 6 dots, final active) */}
				<div
					aria-label="Onboarding Progress"
					className="flex items-center justify-center gap-1.5 py-1"
				>
					{Array.from({ length: totalSteps }).map((_, idx) => {
						const isActive = idx === totalSteps - 1;
						return (
							<button
								key={idx}
								type="button"
								onClick={() => onDotClick(idx)}
								aria-label={`Go to step ${idx + 1}`}
								aria-current={isActive ? 'step' : undefined}
								className={`transition-all duration-280 ease-out cursor-pointer ${
									isActive
										? 'w-6 h-2 bg-[#111111] rounded-full'
										: 'w-2 h-2 bg-[#E5E7EB] rounded-full'
								}`}
							/>
						);
					})}
				</div>

				{/* Primary & Secondary Action Buttons */}
				<div className="flex items-center gap-3 w-full">
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

					{/* Turn On Location CTA: White-ish with text-secondary */}
					<button
						type="button"
						onClick={handleTurnOnLocation}
						disabled={status !== 'idle'}
						className={`flex-1 h-13 rounded-2xl font-bold text-[16px] tracking-tight border active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
							status === 'success'
								? 'bg-emerald-50 border-emerald-200 text-emerald-700'
								: 'bg-white hover:bg-neutral-50/90 border-neutral-200 text-secondary'
						}`}
					>
						{status === 'loading' && (
							<>
								<span className="material-symbols-outlined animate-spin text-[20px] text-secondary">
									progress_activity
								</span>
								<span className="text-secondary">
									Locating...
								</span>
							</>
						)}
						{status === 'success' && (
							<>
								<span className="material-symbols-outlined text-[20px] text-emerald-600">
									check_circle
								</span>
								<span className="text-emerald-700">
									Location Enabled
								</span>
							</>
						)}
						{status === 'idle' && (
							<>
								<span>Turn On Location</span>
								<span className="material-symbols-outlined text-[18px]">
									near_me
								</span>
							</>
						)}
					</button>
				</div>

				{/* Settings Reassurance Microcopy */}
				{/* <p className="text-[11px] text-neutral-400 text-center font-medium">
					You can change this anytime in Settings.
				</p> */}
			</div>
		</div>
	);
};
