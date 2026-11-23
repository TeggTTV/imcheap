import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Flag } from 'lucide-react';

interface ArrivalEndTripModalProps {
	isOpen: boolean;
	locationName: string;
	currentMiles?: number;
	countdownSeconds?: number | null;
	onEndTrip: () => void;
	onKeepDriving: () => void;
}

export const ArrivalEndTripModal: React.FC<ArrivalEndTripModalProps> = ({
	isOpen,
	locationName,
	currentMiles,
	countdownSeconds,
	onEndTrip,
	onKeepDriving,
}) => {
	return (
		<AnimatePresence>
			{isOpen && (
				<div
					className="fixed inset-0 z-50 flex flex-col justify-end"
					role="dialog"
					aria-modal="true"
					aria-label="Trip Arrival Prompt"
				>
					{/* Dim Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.22, ease: 'easeOut' }}
						onClick={onKeepDriving}
						className="fixed inset-0 bg-primary/40 backdrop-blur-[2px] cursor-pointer"
					/>

					{/* Sliding Action Dock */}
					<motion.div
						drag="y"
						dragConstraints={{ top: 0, bottom: 0 }}
						dragElastic={{ top: 0, bottom: 0.6 }}
						dragSnapToOrigin
						onDragEnd={(_, info) => {
							if (info.offset.y > 60 || info.velocity.y > 100) {
								onKeepDriving();
							}
						}}
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={{
							type: 'spring',
							damping: 28,
							stiffness: 320,
						}}
						className="relative z-50 w-full max-w-120 mx-auto bg-white rounded-t-[28px] p-6 shadow-2xl flex flex-col select-none pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
					>
						{/* Drag handle */}
						<div
							onClick={onKeepDriving}
							className="w-full pt-1 pb-3 flex justify-center cursor-grab active:cursor-grabbing focus:outline-none"
							role="button"
							tabIndex={0}
							aria-label="Drag down to close"
						>
							<div className="w-9 h-[4px] bg-[#E5E7EB] rounded-full" />
						</div>

						<div className="flex flex-col items-center text-center">
							<div className="w-12 h-12 rounded-full bg-emerald-50 text-[#059669] flex items-center justify-center mb-3">
								<MapPin size={24} />
							</div>

							<h3 className="text-[20px] font-black text-[#111111] tracking-tight font-sans">
								Have you reached your destination?
							</h3>
							<p className="text-[14px] text-neutral-500 font-medium mt-1 leading-relaxed">
								You arrived at{' '}
								<span className="font-bold text-[#111111]">
									{locationName}
								</span>
								{typeof currentMiles === 'number' &&
									currentMiles > 0 && (
										<span>
											{' '}
											({currentMiles.toFixed(1)} miles)
										</span>
									)}
								.
							</p>

							{typeof countdownSeconds === 'number' && countdownSeconds > 0 && (
								<div className="mt-3.5 px-3 py-1.5 rounded-full bg-emerald-50 text-[12px] font-bold text-emerald-800 flex items-center gap-2 border border-emerald-200/60 shadow-2xs">
									<span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
									<span>Auto-saving trip in {countdownSeconds}s</span>
								</div>
							)}
						</div>

						<div className="flex flex-col gap-2.5 mt-6 w-full">
							{/* Red End Trip Button */}
							<button
								type="button"
								onClick={onEndTrip}
								className="w-full h-13 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
							>
								<Flag size={18} />
								<span>End Trip</span>
							</button>

							{/* Cancel / Keep Driving Button */}
							<button
								type="button"
								onClick={onKeepDriving}
								className="w-full h-12 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-[0.98] text-neutral-700 font-semibold text-[14px] flex items-center justify-center transition-all cursor-pointer"
							>
								Keep Driving
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};
