import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ArrivalEndTripModalProps {
	isOpen: boolean;
	locationName: string;
	currentMiles?: number;
	onEndTrip: () => void;
	onKeepDriving: () => void;
}

export const ArrivalEndTripModal: React.FC<ArrivalEndTripModalProps> = ({
	isOpen,
	locationName,
	currentMiles,
	onEndTrip,
	onKeepDriving,
}) => {
	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
				{/* Dim Backdrop */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onKeepDriving}
					className="absolute inset-0 bg-black/40 backdrop-blur-xs"
				/>

				{/* Sliding Action Dock */}
				<motion.div
					initial={{ y: '100%' }}
					animate={{ y: 0 }}
					exit={{ y: '100%' }}
					transition={{ type: 'spring', damping: 28, stiffness: 300 }}
					className="relative w-full max-w-120 bg-white rounded-t-[32px] p-6 shadow-2xl z-10"
				>
					{/* Drag handle */}
					<div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-5" />

					<div className="flex flex-col items-center text-center">
						<div className="w-12 h-12 rounded-full bg-emerald-50 text-[#059669] flex items-center justify-center mb-3">
							<span className="material-symbols-outlined text-[24px]">
								location_on
							</span>
						</div>

						<h3 className="text-[20px] font-black text-[#111111] tracking-tight">
							Have you reached your destination?
						</h3>
						<p className="text-[14px] text-neutral-500 font-medium mt-1 leading-relaxed">
							You arrived at <span className="font-bold text-[#111111]">{locationName}</span>
							{typeof currentMiles === 'number' && currentMiles > 0 && (
								<span> ({currentMiles.toFixed(1)} miles)</span>
							)}.
						</p>
					</div>

					<div className="flex flex-col gap-2.5 mt-6 w-full">
						{/* Red End Trip Button */}
						<button
							type="button"
							onClick={onEndTrip}
							className="w-full h-13 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
						>
							<span className="material-symbols-outlined text-[18px]">
								flag
							</span>
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
		</AnimatePresence>
	);
};
