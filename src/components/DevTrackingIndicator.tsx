import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DevTrackingTelemetry, TrackingEngineState } from '../types/maps';
import { Terminal, X } from 'lucide-react';

interface DevTrackingIndicatorProps {
	telemetry: DevTrackingTelemetry | null;
	onSimulateDeparture: () => void;
	onSimulateMicroStop: () => void;
	onSimulateResumeDriving: () => void;
	onSimulateDestination: () => void;
	onResetToIdle: () => void;
}

export const DevTrackingIndicator: React.FC<DevTrackingIndicatorProps> = ({
	telemetry,
	onSimulateDeparture,
	onSimulateMicroStop,
	onSimulateResumeDriving,
	onSimulateDestination,
	onResetToIdle,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const isDraggingRef = React.useRef(false);

	if (!telemetry) return null;

	const handlePillClick = () => {
		if (isDraggingRef.current) return;
		setIsOpen((prev) => !prev);
	};

	const getStateBadge = (state: TrackingEngineState) => {
		switch (state) {
			case 'DRIVING':
				return {
					dot: 'bg-emerald-500 animate-pulse',
					label: 'DRV',
					pillBorder: 'border-emerald-200/80',
					pillBg: 'bg-white/95',
				};
			case 'STOPPED_EVALUATING':
				return {
					dot: 'bg-amber-500 animate-pulse',
					label: 'STOP',
					pillBorder: 'border-amber-200/80',
					pillBg: 'bg-white/95',
				};
			case 'DESTINATION_REACHED':
				return {
					dot: 'bg-sky-500',
					label: 'ARRV',
					pillBorder: 'border-sky-200/80',
					pillBg: 'bg-white/95',
				};
			case 'IDLE_ANCHORED':
			default:
				return {
					dot: 'bg-neutral-400',
					label: 'IDLE',
					pillBorder: 'border-neutral-200/80',
					pillBg: 'bg-white/95',
				};
		}
	};

	const badge = getStateBadge(telemetry.state);

	const renderPrimaryMetric = () => {
		switch (telemetry.state) {
			case 'DRIVING':
				return `${telemetry.speedMph} mph · ${telemetry.accumulatedMiles} mi`;
			case 'STOPPED_EVALUATING':
				return `${telemetry.stopSeconds}s / 300s`;
			case 'DESTINATION_REACHED':
				return telemetry.originName || 'Arrived';
			case 'IDLE_ANCHORED':
			default: {
				const dwellMins = Math.floor(telemetry.dwellSeconds / 60);
				const targetMins = Math.floor(
					telemetry.targetDwellSeconds / 60,
				);
				return `${dwellMins}m / ${targetMins}m`;
			}
		}
	};

	return (
		<>
			{/* Compact Floating Dev Pill (Draggable) */}
			<motion.div
				drag
				dragMomentum={false}
				whileDrag={{ scale: 1.05 }}
				onDragStart={() => {
					isDraggingRef.current = true;
				}}
				onDragEnd={() => {
					setTimeout(() => {
						isDraggingRef.current = false;
					}, 100);
				}}
				onClick={handlePillClick}
				data-testid="dev-tracking-pill"
				className={`fixed top-20 right-3 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-sm cursor-grab active:cursor-grabbing select-none transition-colors ${badge.pillBg} ${badge.pillBorder}`}
				title="Trip Engine Dev Telemetry (Drag to move, Tap to expand)"
			>
				<span className={`w-2 h-2 rounded-full ${badge.dot}`} />
				<span className="font-mono text-[11px] font-bold text-[#111111] tracking-tight">
					{badge.label}
				</span>
				<span className="font-mono text-[11px] font-medium text-neutral-600 tabular-nums">
					{renderPrimaryMetric()}
				</span>
			</motion.div>

			{/* Expanded Diagnostics & Simulation Drawer */}
			<AnimatePresence>
				{isOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 10 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 10 }}
							transition={{ duration: 0.18, ease: 'easeOut' }}
							className="bg-white rounded-3xl p-4 max-w-xs w-full shadow-2xl border border-neutral-200/80 flex flex-col gap-3 select-none"
						>
							{/* Header */}
							<div className="flex items-center justify-between pb-1 border-b border-gray-100">
								<div className="flex items-center gap-2">
									<Terminal
										size={18}
										className="text-[#059669]"
									/>
									<span className="text-[14px] font-bold text-[#111111]">
										Trip Engine Dev Tools
									</span>
								</div>
								<button
									type="button"
									onClick={() => setIsOpen(false)}
									className="w-7 h-7 rounded-full text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer"
								>
									<X size={18} />
								</button>
							</div>

							{/* Live Telemetry Data Rows */}
							<div className="bg-[#F8F9FB] rounded-2xl p-2.5 flex flex-col gap-1.5 font-mono text-[11px] text-neutral-700">
								<div className="flex justify-between items-center">
									<span className="text-neutral-500">
										State:
									</span>
									<span className="font-bold text-[#111111]">
										{telemetry.state}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-neutral-500">
										Speed / Accuracy:
									</span>
									<span className="tabular-nums font-semibold text-[#111111]">
										{telemetry.speedMph} mph / ±
										{telemetry.accuracyMeters}m
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-neutral-500">
										Anchor Dist:
									</span>
									<span className="tabular-nums font-semibold text-[#111111]">
										{telemetry.distanceToAnchorMeters}m /
										100m gate
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-neutral-500">
										Dwell Timer:
									</span>
									<span className="tabular-nums font-semibold text-[#111111]">
										{Math.floor(
											telemetry.dwellSeconds / 60,
										)}
										m /{' '}
										{Math.floor(
											telemetry.targetDwellSeconds / 60,
										)}
										m
									</span>
								</div>
								{telemetry.state === 'STOPPED_EVALUATING' && (
									<div className="flex justify-between items-center text-amber-700 font-semibold">
										<span>Stop Evaluated:</span>
										<span className="tabular-nums">
											{telemetry.stopSeconds}s / 300s
										</span>
									</div>
								)}
								<div className="flex justify-between items-center">
									<span className="text-neutral-500">
										Trip Breadcrumbs:
									</span>
									<span className="tabular-nums font-semibold text-[#111111]">
										{telemetry.breadcrumbsCount} pts ·{' '}
										{telemetry.accumulatedMiles} mi
									</span>
								</div>
							</div>

							{/* Desk Simulation Controls */}
							<div className="flex flex-col gap-1.5 pt-0.5">
								<span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-1">
									Desk Testing Triggers
								</span>
								<div className="grid grid-cols-2 gap-1.5">
									<button
										type="button"
										onClick={() => {
											onSimulateDeparture();
											setIsOpen(false);
										}}
										className="h-8 px-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer text-center truncate"
									>
										Depart &gt;12mph
									</button>
									<button
										type="button"
										onClick={() => {
											onSimulateMicroStop();
											setIsOpen(false);
										}}
										className="h-8 px-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer text-center truncate"
									>
										Micro-Stop &lt;3mph
									</button>
									<button
										type="button"
										onClick={() => {
											onSimulateResumeDriving();
											setIsOpen(false);
										}}
										className="h-8 px-2 rounded-xl bg-neutral-100 text-neutral-800 hover:bg-neutral-200 text-[11px] font-bold transition-colors cursor-pointer text-center truncate"
									>
										Resume &gt;12mph
									</button>
									<button
										type="button"
										onClick={() => {
											onSimulateDestination();
											setIsOpen(false);
										}}
										className="h-8 px-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold hover:bg-sky-100 transition-colors cursor-pointer text-center truncate"
									>
										Arrive Dest (≥5m)
									</button>
								</div>
								<button
									type="button"
									onClick={() => {
										onResetToIdle();
										setIsOpen(false);
									}}
									className="w-full h-8 mt-1 rounded-xl bg-neutral-50 border border-gray-200 text-neutral-700 text-[11px] font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
								>
									Reset to Idle (Home)
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</>
	);
};
