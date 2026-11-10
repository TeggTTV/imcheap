import React from 'react';
import {
	Transaction,
	PresetItem,
	IncomeSettings,
	BalanceSummary,
} from '../utils/expenseMath';

interface AnalyticsViewProps {
	transactions: Transaction[];
	summary: BalanceSummary;
	settings: IncomeSettings;
	onOpenBreakdown: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
	transactions,
	summary,
	settings,
	onOpenBreakdown,
}) => {
	// Group expenses by category
	const categoryTotals = transactions.reduce<
		Record<string, { total: number; count: number; icon: string }>
	>((acc, tx) => {
		if (tx.type !== 'expense') return acc;
		if (!acc[tx.category]) {
			acc[tx.category] = { total: 0, count: 0, icon: tx.icon };
		}
		acc[tx.category].total += tx.amount;
		acc[tx.category].count += 1;
		return acc;
	}, {});

	const totalTxSum =
		Object.values(categoryTotals).reduce((s, c) => s + c.total, 0) || 1;
	const sortedCategories = Object.entries(categoryTotals).sort(
		(a, b) => b[1].total - a[1].total,
	);

	return (
		<div className="flex flex-col space-y-5 pt-4 pb-28 px-1">
			{/* Cycle Spend Card */}
			<div className="bg-surface-container-lowest rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-surface-container-high/50">
				<div className="flex items-center justify-between mb-1">
					<span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
						Spent This Cycle
					</span>
					<button
						type="button"
						onClick={onOpenBreakdown}
						className="font-label-md text-label-md text-secondary hover:underline cursor-pointer"
					>
						View Breakdown →
					</button>
				</div>
				<div className="flex items-baseline gap-2 mt-1">
					<span className="font-display-hero-mobile text-display-hero-mobile text-on-surface font-bold tabular-nums">
						${summary.loggedExpenses.toFixed(2)}
					</span>
					<span className="font-body-md text-body-md text-on-surface-variant tabular-nums">
						of ${summary.basePaycheck.toFixed(2)} paycheck
					</span>
				</div>
				<div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mt-3">
					<div
						className="h-full bg-primary rounded-full transition-all duration-500"
						style={{
							width: `${Math.min(100, 100 - summary.percentLeft)}%`,
						}}
					/>
				</div>
				<div className="flex items-center justify-between mt-2.5 text-[12px] text-on-surface-variant tabular-nums">
					<span>
						Work equivalent: ~
						{(summary.loggedExpenses / settings.hourlyWage).toFixed(
							1,
						)}{' '}
						hrs
					</span>
					<span className="text-secondary font-semibold">
						{summary.percentLeft}% remaining
					</span>
				</div>
			</div>

			{/* Category Breakdown */}
			<div className="flex flex-col space-y-2.5">
				<div className="flex items-center justify-between text-on-surface-variant text-[12px] font-label-md tracking-wider uppercase px-1">
					<span>By Category</span>
					<span className="normal-case font-body-sm text-[12px] text-outline">
						Work Hours @ ${settings.hourlyWage}/hr
					</span>
				</div>

				<div className="flex flex-col space-y-2">
					{sortedCategories.map(([catName, data]) => {
						const sharePct = Math.round(
							(data.total / totalTxSum) * 100,
						);
						const workHours = (
							data.total / settings.hourlyWage
						).toFixed(1);
						return (
							<div
								key={catName}
								className="bg-surface-container-lowest rounded-xl p-3.5 flex flex-col gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-surface-container-high/50"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
											<span className="material-symbols-outlined text-[18px]">
												{data.icon}
											</span>
										</div>
										<div className="flex flex-col">
											<span className="font-bold text-[14px] text-on-surface leading-tight">
												{catName}
											</span>
											<span className="text-[12px] text-on-surface-variant tabular-nums">
												{data.count}{' '}
												{data.count === 1
													? 'item'
													: 'items'}{' '}
												· ~{workHours}h work
											</span>
										</div>
									</div>
									<div className="text-right">
										<span className="font-bold text-[15px] text-on-surface tabular-nums block">
											-${data.total.toFixed(2)}
										</span>
										<span className="text-[11px] text-on-surface-variant tabular-nums">
											{sharePct}%
										</span>
									</div>
								</div>
								<div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
									<div
										className="h-full bg-primary rounded-full"
										style={{ width: `${sharePct}%` }}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

interface PresetsViewProps {
	presets: PresetItem[];
	onTriggerPresetLog: (preset: PresetItem) => void;
	onOpenNewPresetModal: () => void;
	onEditPreset: (preset: PresetItem) => void;
	onDeletePreset: (id: string) => void;
}

export const PresetsView: React.FC<PresetsViewProps> = ({
	presets,
	onTriggerPresetLog,
	onOpenNewPresetModal,
	onEditPreset,
	onDeletePreset,
}) => {
	return (
		<div className="flex flex-col space-y-4 pt-4 pb-28 px-1">
			<div className="flex items-center justify-between px-1">
				<div>
					<h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
						Saved Presets
					</h2>
					<p className="text-[12px] text-on-surface-variant">
						Tap to edit details or quick-log expense
					</p>
				</div>
				<button
					type="button"
					onClick={onOpenNewPresetModal}
					className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
				>
					<span className="material-symbols-outlined text-[16px]">
						add
					</span>
					<span>New Preset</span>
				</button>
			</div>

			<div className="flex flex-col space-y-2.5">
				{presets.map((preset) => (
					<div
						key={preset.id}
						className="bg-surface-container-lowest rounded-xl p-4 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-surface-container-high/50"
					>
						<button
							type="button"
							onClick={() => onEditPreset(preset)}
							className="flex items-center gap-3 text-left flex-1 cursor-pointer group focus:outline-none"
						>
							<div
								className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 group-active:scale-95 transition-transform"
								style={{
									backgroundColor: preset.bgColor,
									color: preset.iconColor,
								}}
							>
								<span className="material-symbols-outlined text-[20px]">
									{preset.icon}
								</span>
							</div>
							<div className="flex flex-col">
								<span className="font-bold text-[15px] text-on-surface leading-tight group-hover:underline">
									{preset.title}
								</span>
								<span className="text-[12px] text-on-surface-variant tabular-nums">
									{preset.category} · {preset.rawValue}{' '}
									{preset.unit}
									{preset.isRoundTrip
										? ' (Round Trip x2)'
										: ''}
								</span>
							</div>
						</button>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => onTriggerPresetLog(preset)}
								aria-label={`Quick log ${preset.title}`}
								className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md tabular-nums active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
							>
								Log {preset.type === 'income' ? '+' : '-'}$
								{preset.calculatedAmount.toFixed(2)}
							</button>
							<button
								type="button"
								onClick={() => onEditPreset(preset)}
								aria-label={`Edit preset ${preset.title}`}
								className="w-8 h-8 rounded-lg text-outline hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
							>
								<span className="material-symbols-outlined text-[18px]">
									edit
								</span>
							</button>
							{presets.length > 1 && (
								<button
									type="button"
									onClick={() => onDeletePreset(preset.id)}
									aria-label={`Delete preset ${preset.title}`}
									className="w-8 h-8 rounded-lg text-outline hover:text-error flex items-center justify-center transition-colors cursor-pointer"
								>
									<span className="material-symbols-outlined text-[18px]">
										delete
									</span>
								</button>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export { SettingsView } from './SettingsView';
export type { SettingsViewProps, SettingsSubpage } from './SettingsView';
