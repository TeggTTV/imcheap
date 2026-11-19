import React from 'react';
import { Reorder } from 'motion/react';
import { PresetItem } from '../utils/expenseMath';
import { SwipeablePresetItem } from './SwipeablePresetItem';
import { LucideIcon } from './LucideIcon';
import { GripVertical, Plus } from 'lucide-react';

export interface PresetsViewProps {
	presets: PresetItem[];
	onOpenNewPresetModal: () => void;
	onEditPreset: (preset: PresetItem) => void;
	onDeletePreset: (id: string) => void;
	onReorderPresets?: (newOrder: PresetItem[]) => void;
	onTogglePin?: (id: string) => void;
}

export const PresetsView: React.FC<PresetsViewProps> = ({
	presets,
	onOpenNewPresetModal,
	onEditPreset,
	onDeletePreset,
	onReorderPresets,
	onTogglePin,
}) => {
	// Pinned presets
	const pinnedPresets = presets.filter((p) => p.pinned);
	const unpinnedPresets = presets.filter((p) => !p.pinned);

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
			{/* CARD 1: DASHBOARD DOCK (PINNED) */}
			<div className="bg-[#FFFFFF] rounded-[20px] border border-[#F3F4F6] shadow-sm p-4 mb-6 flex flex-col">
				<div className="flex items-center justify-between mb-3 px-1">
					<span className="text-[11px] font-bold tracking-wider uppercase text-[#9CA3AF]">
						DASHBOARD DOCK (PINNED • {pinnedPresets.length})
					</span>
					{pinnedPresets.length > 1 && (
						<span className="text-[12px] font-medium text-[#6B7280]">
							Drag ≡ to reorder
						</span>
					)}
				</div>

				{pinnedPresets.length === 0 ? (
					<div className="py-8 text-center text-on-surface-variant flex flex-col items-center justify-center gap-1.5">
						<div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant mb-1">
							<span className="material-symbols-outlined text-[20px]">
								bookmark_border
							</span>
						</div>
						<span className="text-[14px] font-semibold text-[#111111]">
							No pinned presets yet.
						</span>
						<span className="text-[12px] text-[#6B7280]">
							Tap any preset in the directory below to pin it to
							your dashboard dock.
						</span>
					</div>
				) : (
					<Reorder.Group
						axis="y"
						values={pinnedPresets}
						onReorder={handlePinnedReorder}
						className="flex flex-col divide-y divide-[#F3F4F6] list-none p-0 m-0"
					>
						{pinnedPresets.map((preset, idx) => (
							<Reorder.Item
								key={preset.id}
								value={preset}
								data-testid={`pinned-preset-${preset.id}`}
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
										<LucideIcon
											name={preset.icon}
											size={20}
										/>
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
											$
											{preset.calculatedAmount.toFixed(2)}
										</span>
									</div>
								</div>
								<div className="flex items-center gap-2 shrink-0">
									<GripVertical
										size={18}
										className="text-[#9CA3AF] select-none cursor-grab active:cursor-grabbing p-0.5"
									/>
								</div>
							</Reorder.Item>
						))}
					</Reorder.Group>
				)}

				{/* Dashed Add Button */}
				<button
					type="button"
					onClick={onOpenNewPresetModal}
					className="mt-3 w-full h-12 rounded-[14px] border-[1.5px] border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-[14px] font-bold text-[#111111] flex items-center justify-center gap-2 hover:bg-[#F3F4F6] transition-colors active:scale-95 cursor-pointer"
				>
					<Plus size={18} />
					<span>Add New Preset</span>
				</button>
			</div>

			{/* CARD 2: ALL PRESETS DIRECTORY */}
			<div className="bg-[#FFFFFF] rounded-[20px] border border-[#F3F4F6] shadow-sm p-4 flex flex-col">
				<div className="flex items-center justify-between mb-3 px-1">
					<span className="text-[11px] font-bold tracking-wider uppercase text-[#9CA3AF]">
						ALL PRESETS ({presets.length})
					</span>
					<span className="text-[12px] font-medium text-[#6B7280]">
						Swipe to edit/delete • Tap to pin
					</span>
				</div>

				<div className="flex flex-col overflow-hidden">
					{presets.length === 0 ? (
						<div className="py-6 text-center text-xs text-on-surface-variant">
							No presets yet. Tap &quot;Add New Preset&quot; above
							to create one.
						</div>
					) : (
						presets.map((preset, idx) => (
							<SwipeablePresetItem
								key={preset.id}
								preset={preset}
								onEdit={onEditPreset}
								onDelete={onDeletePreset}
								onTogglePin={onTogglePin || (() => {})}
								isLast={idx === presets.length - 1}
								formatPresetDetail={formatPresetDetail}
							/>
						))
					)}
				</div>
			</div>
		</div>
	);
};
