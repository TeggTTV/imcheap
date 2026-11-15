import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SmartPrompt } from '../types/maps';

interface SmartPromptBannerProps {
	prompt: SmartPrompt | null;
	onAction: (prompt: SmartPrompt) => void;
	onDismiss: (promptId: string) => void;
	visible?: boolean;
}

export const SmartPromptBanner: React.FC<SmartPromptBannerProps> = ({
	prompt,
	onAction,
	onDismiss,
	visible = true,
}) => {
	if (!prompt || !visible) return null;

	const isFrequentRoute = prompt.type === 'FREQUENT_ROUTE';

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: 16, scale: 0.96 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: 12, scale: 0.95 }}
				transition={{ type: 'spring', damping: 25, stiffness: 340 }}
				className="w-full max-w-120 mx-auto px-4 pointer-events-none"
				data-testid="smart-prompt-container"
			>
				<div
					data-testid={`smart-prompt-${prompt.id}`}
					className="bg-white rounded-2xl p-3.5 shadow-xl border border-neutral-200/80 flex items-center justify-between gap-3 pointer-events-auto"
				>
					{/* Left Icon Badge */}
					<div
						className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
							isFrequentRoute
								? 'bg-[#EEF2FF] text-[#4F46E5]'
								: 'bg-[#ECFDF5] text-[#059669]'
						}`}
					>
						<span className="material-symbols-outlined text-[20px]">
							{isFrequentRoute ? 'alt_route' : 'storefront'}
						</span>
					</div>

					{/* Center Description */}
					<div className="flex flex-col min-w-0 flex-1 pr-1">
						<span className="text-[13px] font-bold text-[#111111] leading-tight truncate">
							{prompt.title}
						</span>
						<span className="text-[11.5px] text-[#6B7280] leading-snug line-clamp-2 mt-0.5 font-normal">
							{prompt.subtitle}
						</span>
					</div>

					{/* Right CTA and Dismiss Button */}
					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={() => onAction(prompt)}
							className="bg-[#111111] hover:bg-neutral-900 active:scale-95 text-white text-[12px] font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
						>
							{prompt.ctaLabel}
						</button>

						<button
							type="button"
							onClick={() => onDismiss(prompt.id)}
							aria-label="Dismiss suggestion"
							className="w-7 h-7 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors shrink-0"
						>
							<span className="material-symbols-outlined text-[16px]">
								close
							</span>
						</button>
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};
