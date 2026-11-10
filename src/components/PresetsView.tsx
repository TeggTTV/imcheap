import React, { useState } from 'react';
import { Reorder } from 'motion/react';
import { PresetItem } from '../utils/expenseMath';

export interface PresetsViewProps {
	presets: PresetItem[];
	onTriggerPresetLog: (preset: PresetItem) => void;
	onOpenNewPresetModal: () => void;
	onEditPreset: (preset: PresetItem) => void;
	onPrefillPresetToDock?: (preset: PresetItem) => void;
	onDeletePreset: (id: string) => void;
	onReorderPresets?: (newOrder: PresetItem[]) => void;
}

export const PresetsView: React.FC<PresetsViewProps> = ({
	presets,
	onTriggerPresetLog,
	onOpenNewPresetModal,
	onEditPreset,
	onPrefillPresetToDock,
	onReorderPresets,
}) => {
	// Top 5 pinned presets
	const pinnedPresets = presets.slice(0, 5);
	const unpinnedPresets = presets.slice(5);

	// Action feedback button state for preset logs: Record<presetId, 'idle' | 'spinning' | 'success'>
	const [logStates, setLogStates] = useState<Record<string, 'idle' | 'spinning' | 'success'>>({});

	const handleLogClick = (preset: PresetItem) => {
		if (logStates[preset.id] && logStates[preset.id] !== 'idle') return;

		setLogStates((prev) => ({ ...prev, [preset.id]: 'spinning' }));

		setTimeout(() => {
			setLogStates((prev) => ({ ...prev, [preset.id]: 'success' }));
			onTriggerPresetLog(preset);

			setTimeout(() => {
				setLogStates((prev) => ({ ...prev, [preset.id]: 'idle' }));
			}, 250);
		}, 250);
	};

	const handlePinnedReorder = (newPinned: PresetItem[]) => {
		if (onReorderPresets) {
			onReorderPresets([...newPinned, ...unpinnedPresets]);
		}
	};

	const formatPresetDetail = (preset: PresetItem) => {
		if (preset.unit === 'MILES') {
			return `${preset.rawValue.toFixed(1)} mi`;
		}
		if (preset.unit === 'SERVINGS') {
			return `${preset.rawValue} serv`;
		}
		if (preset.unit === 'USD') {
			return preset.category === 'Food' || preset.category === 'Fitness'
				? preset.category
				: 'Flat';
		}
		return preset.category;
	};

	return (
		<div className="flex flex-col w-full pb-28 pt-2">
			{/* CARD 1: DASHBOARD DOCK (TOP 5 PINNED) */}
			<div className="bg-[#FFFFFF] rounded-[20px] border border-[#F3F4F6] shadow-sm p-4 mb-6 flex flex-col">
				<div className="flex items-center justify-between mb-3 px-1">
					<span className="text-[11px] font-bold tracking-wider uppercase text-[#9CA3AF]">
						DASHBOARD DOCK (TOP 5)
					</span>
					<span className="text-[12px] font-medium text-[#6B7280]">
						Drag ≡ to reorder
					</span>
				</div>

				<Reorder.Group
					axis="y"
					values={pinnedPresets}
					onReorder={handlePinnedReorder}
					className="flex flex-col divide-y divide-[#F3F4F6] list-none p-0 m-0"
				>
					{pinnedPresets.map((preset, idx) => {
						const logState = logStates[preset.id] || 'idle';
						return (
							<Reorder.Item
								key={preset.id}
								value={preset}
								onClick={() => onEditPreset(preset)}
								className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50/60 rounded-xl px-1 transition-colors bg-white select-none"
							>
								<div className="flex items-center gap-3 min-w-0">
									<div className="w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
										{idx + 1}
									</div>
									<div
										className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
										style={{
											backgroundColor: preset.bgColor,
											color: preset.iconColor,
										}}
									>
										<span className="material-symbols-outlined text-[20px]">
											{preset.icon}
										</span>
									</div>
									<div className="flex flex-col min-w-0">
										<div className="flex items-baseline gap-1.5">
											<span className="text-[14px] font-bold text-[#111111] truncate">
												{preset.title}
											</span>
											<span className="text-[12px] text-[#6B7280] font-normal truncate tabular-nums">
												{formatPresetDetail(preset)}
											</span>
										</div>
										<span className="text-[13px] font-bold text-[#111111] tabular-nums">
											${preset.calculatedAmount.toFixed(2)}
										</span>
									</div>
								</div>
								<div className="flex items-center gap-2 shrink-0">
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											handleLogClick(preset);
										}}
										aria-label={`Log ${preset.title}`}
										className="min-w-14 px-2.5 py-1 bg-primary text-on-primary text-[11px] font-semibold rounded-lg active:scale-95 transition-transform flex items-center justify-center cursor-pointer h-7"
									>
										{logState === 'spinning' && (
											<span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										)}
										{logState === 'success' && (
											<span className="material-symbols-outlined text-[15px] text-secondary-fixed">
												check
											</span>
										)}
										{logState === 'idle' && <span>Log</span>}
									</button>
									<span className="material-symbols-outlined text-[#9CA3AF] text-[20px] select-none cursor-grab active:cursor-grabbing p-1">
										drag_handle
									</span>
								</div>
							</Reorder.Item>
						);
					})}
				</Reorder.Group>

				{/* Dashed Add Button */}
				<button
					type="button"
					onClick={onOpenNewPresetModal}
					className="mt-3 w-full h-12 rounded-[14px] border-[1.5px] border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-[14px] font-bold text-[#111111] flex items-center justify-center gap-2 hover:bg-[#F3F4F6] transition-colors active:scale-95 cursor-pointer"
				>
					<span className="material-symbols-outlined text-[18px]">add</span>
					<span>Add New Preset</span>
				</button>
			</div>

			{/* CARD 2: ALL PRESETS DIRECTORY */}
			<div className="bg-[#FFFFFF] rounded-[20px] border border-[#F3F4F6] shadow-sm p-4 flex flex-col">
				<div className="flex items-center justify-between mb-3 px-1">
					<span className="text-[11px] font-bold tracking-wider uppercase text-[#9CA3AF]">
						ALL PRESETS ({presets.length})
					</span>
				</div>

				<div className="flex flex-col divide-y divide-[#F3F4F6]">
					{presets.map((preset, idx) => {
						const isPinned = idx < 5;
						return (
							<div
								key={preset.id}
								onClick={() => onEditPreset(preset)}
								className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50/60 rounded-xl px-1 transition-colors"
							>
								<div className="flex flex-col min-w-0 pr-2">
									<span className="text-[14px] font-bold text-[#111111] truncate">
										{preset.title}
									</span>
									<span className="text-[12px] text-[#6B7280] truncate tabular-nums">
										{preset.category} • {formatPresetDetail(preset)}
									</span>
								</div>

								{isPinned ? (
									<span className="bg-[#ECFDF5] text-[#059669] px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 shrink-0">
										Pinned ★
									</span>
								) : (
									<div className="flex items-center gap-2 shrink-0">
										<span className="text-[14px] font-bold text-[#111111] tabular-nums">
											${preset.calculatedAmount.toFixed(2)}
										</span>
										<span className="material-symbols-outlined text-[#9CA3AF] text-[18px]">
											chevron_right
										</span>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
