import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface NameStepProps {
	onNext: () => void;
	onBack: () => void;
	onSkip: () => void;
	onDotClick: (index: number) => void;
	totalSteps?: number;
	initialName?: string;
	onNameChange?: (name: string) => void;
}

export const NameStep: React.FC<NameStepProps> = ({
	onNext,
	onBack,
	onSkip,
	onDotClick,
	totalSteps = 9,
	initialName = '',
	onNameChange,
}) => {
	const [name, setName] = useState<string>(() => {
		if (initialName) return initialName;
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_user_name');
				if (saved) return saved;
			} catch {}
		}
		return '';
	});

	const [isAnimatingGreeting, setIsAnimatingGreeting] = useState(false);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setName(val);
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('imcheap_user_name', val);
			} catch {}
		}
		onNameChange?.(val);
	};

	const handleContinue = () => {
		const trimmed = name.trim();
		if (trimmed && typeof window !== 'undefined') {
			try {
				localStorage.setItem('imcheap_user_name', trimmed);
			} catch {}
		}

		// If no name entered, do not show greeting; proceed immediately
		if (!trimmed) {
			onNext();
			return;
		}

		// Trigger animated floating text: slide up for 500ms, hold for 250ms, then proceed
		setIsAnimatingGreeting(true);
		setTimeout(() => {
			onNext();
		}, 750);
	};

	const displayName = name.trim();

	return (
		<div className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] p-6 pb-safe">
			{/* Ambient Gradient Glows */}
			<div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
				<div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-[#86f2e4]/30 blur-[100px]" />
				<div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-[#85f8c4]/25 blur-[90px]" />
				<div className="absolute -bottom-24 left-10 w-96 h-96 rounded-full bg-[#ebe7e7]/60 blur-[110px]" />
			</div>

			{/* Top Navigation */}
			<header className="relative z-20 flex items-center justify-between w-full pt-1 pb-1">
				<div className="flex items-center gap-1.5">
					<span className="text-[18px] font-extrabold tracking-tight text-[#1c1b1b] font-sans">
						ImCheap
					</span>
				</div>
				<button
					type="button"
					onClick={onSkip}
					className="text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors py-1.5 px-3 rounded-full hover:bg-neutral-100 active:scale-95 cursor-pointer font-medium"
				>
					Skip
				</button>
			</header>

			{/* Center Body */}
			<div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto py-4">
				{/* Ambient Glow & Wave Icon */}
				<div className="relative flex items-center justify-center">
					<div className="absolute -inset-4 rounded-full bg-[#86f2e4]/40 blur-xl pointer-events-none" />
					<div className="relative w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center transition-transform hover:scale-105 duration-300">
						<span
							role="img"
							aria-label="Waving hand"
							className="text-[36px] select-none transform hover:rotate-12 transition-transform cursor-default"
						>
							👋
						</span>
					</div>
				</div>

				{/* Copy */}
				<div className="mt-6 mb-2 text-center">
					<h1 className="text-[32px] leading-[40px] font-extrabold text-[#1c1b1b] tracking-tight font-sans">
						What's your name?
					</h1>
					<p className="text-[14px] text-[#6d7a72] mt-2 max-w-[280px] mx-auto leading-relaxed">
						We'll use this to personalize your daily runway and dashboard greeting.
					</p>
				</div>

				{/* Input Field */}
				<div className="w-full max-w-[320px] mx-auto mt-6 relative">
					<div className="bg-white rounded-2xl shadow-sm transition-all duration-200 focus-within:shadow-md border border-neutral-200/60">
						<input
							type="text"
							value={name}
							onChange={handleInputChange}
							placeholder="Your name"
							autoComplete="given-name"
							className="w-full py-4 px-6 text-center text-[22px] font-semibold text-[#1c1b1b] placeholder:text-neutral-300 bg-transparent rounded-2xl focus:outline-none"
						/>
					</div>
				</div>

				{/* Floating Bottom Greeting on Continue */}
				<AnimatePresence>
					{isAnimatingGreeting && (
						<motion.div
							initial={{ opacity: 0, y: 50 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 20 }}
							transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
							className="fixed bottom-28 inset-x-4 max-w-[340px] mx-auto bg-black text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-center gap-2 z-50 pointer-events-none"
						>
							<Sparkles size={18} className="text-emerald-400" />
							<span className="text-[17px] font-bold tracking-tight">
								Nice to meet you, {displayName}!
							</span>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Bottom Controls */}
			<div className="relative z-20 w-full max-w-[360px] mx-auto flex flex-col items-center">
				{/* Pagination Dots */}
				<nav aria-label="Onboarding Progress" className="flex items-center justify-center gap-1.5 mb-6">
					{Array.from({ length: totalSteps }).map((_, i) => (
						<button
							key={i}
							type="button"
							onClick={() => onDotClick(i)}
							aria-label={`Go to step ${i + 1}`}
							className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
								i === 1 ? 'w-5 bg-[#1c1b1b]' : 'w-2 bg-neutral-200 hover:bg-neutral-300'
							}`}
						/>
					))}
				</nav>

				{/* Navigation Buttons */}
				<div className="w-full flex items-center gap-3">
					<button
						type="button"
						onClick={onBack}
						className="h-[52px] px-6 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-[#1c1b1b] text-[14px] font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-all cursor-pointer"
					>
						<ChevronLeft size={18} />
						<span>Back</span>
					</button>

					<button
						type="button"
						onClick={handleContinue}
						disabled={isAnimatingGreeting}
						className="flex-1 h-[52px] px-6 rounded-2xl bg-[#111111] hover:bg-neutral-800 text-white text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md cursor-pointer uppercase tracking-wider disabled:opacity-80"
					>
						<span>Continue</span>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>
		</div>
	);
};
