import React, { useState, useMemo } from 'react';
import {
	Transaction,
	BalanceSummary,
	IncomeSettings,
} from '../utils/expenseMath';

export interface AnalyticsViewProps {
	transactions: Transaction[];
	summary: BalanceSummary;
	settings: IncomeSettings;
	onOpenBreakdown?: () => void;
}

interface HabitSummaryItem {
	id: string;
	label: string;
	subLabel: string;
	icon: string;
	color: string;
	bgColor: string;
	hours: number;
	amount: number;
	percentOfSpent: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
	transactions,
	summary,
	settings,
	onOpenBreakdown,
}) => {
	const [timeframe, setTimeframe] = useState<'week' | 'month'>('month');
	const [selectedDayIndex, setSelectedDayIndex] = useState<number>(3); // Default to Thursday (index 3)

	const wage = settings.hourlyWage > 0 ? settings.hourlyWage : 17;
	const totalSpent = summary.loggedExpenses;
	const totalCycleBudget =
		summary.basePaycheck + (summary.totalIncome || 0) || 238;
	const hoursBurned =
		wage > 0 ? (totalSpent / wage).toFixed(1) : (totalSpent / 17).toFixed(1);

	const budgetPercentUsed =
		totalCycleBudget > 0
			? Math.min(100, (totalSpent / totalCycleBudget) * 100)
			: 0;

	// Calculate daily burn pace & safe days
	const burnPacePerDay = totalSpent > 0 ? (totalSpent / 30).toFixed(2) : '3.87';
	const burnMinutesPerDay = Math.round(
		(parseFloat(burnPacePerDay) / wage) * 60,
	);
	const daysSafe =
		summary.availableBalance > 0
			? Math.max(
					1,
					Math.round(
						summary.availableBalance /
							Math.max(1, parseFloat(burnPacePerDay)),
					),
				)
			: 0;

	// Habit Breakdown calculations
	const habitItems: HabitSummaryItem[] = useMemo(() => {
		const expenseTxs = transactions.filter((t) => t.type === 'expense');
		const totalExp = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

		// Group by category or title
		const groups: Record<
			string,
			{
				label: string;
				subLabel: string;
				icon: string;
				color: string;
				bgColor: string;
				amount: number;
			}
		> = {
			fitness: {
				label: 'Fitness',
				subLabel: 'Sportime VB',
				icon: 'sports_volleyball',
				color: '#F43F5E',
				bgColor: 'bg-[#F43F5E]/10 text-[#F43F5E]',
				amount: 0,
			},
			groceries: {
				label: 'Groceries',
				subLabel: 'Aldi/Market',
				icon: 'shopping_cart',
				color: '#10B981',
				bgColor: 'bg-[#10B981]/10 text-[#10B981]',
				amount: 0,
			},
			driving: {
				label: 'Driving & Fuel',
				subLabel: 'Rowan',
				icon: 'directions_car',
				color: '#6366F1',
				bgColor: 'bg-[#6366F1]/10 text-[#6366F1]',
				amount: 0,
			},
			coffee: {
				label: 'Morning Espresso',
				subLabel: 'Coffee',
				icon: 'coffee',
				color: '#F59E0B',
				bgColor: 'bg-[#F59E0B]/10 text-[#F59E0B]',
				amount: 0,
			},
		};

		expenseTxs.forEach((tx) => {
			const desc = (tx.title || '').toLowerCase();
			const cat = (tx.category || '').toLowerCase();

			if (
				desc.includes('sportime') ||
				desc.includes('gym') ||
				cat.includes('fitness')
			) {
				groups.fitness.amount += tx.amount;
			} else if (
				desc.includes('grocer') ||
				desc.includes('aldi') ||
				desc.includes('market') ||
				cat.includes('groceries') ||
				cat.includes('supplies')
			) {
				groups.groceries.amount += tx.amount;
			} else if (
				desc.includes('rowan') ||
				desc.includes('fuel') ||
				desc.includes('gas') ||
				desc.includes('drive') ||
				cat.includes('driving') ||
				cat.includes('transit')
			) {
				groups.driving.amount += tx.amount;
			} else if (
				desc.includes('coffee') ||
				desc.includes('espresso') ||
				cat.includes('food') ||
				cat.includes('everyday')
			) {
				groups.coffee.amount += tx.amount;
			} else {
				groups.groceries.amount += tx.amount;
			}
		});

		// Fallback to sample values if totalExp is 0
		if (totalExp === 0) {
			groups.fitness.amount = 47.0;
			groups.groceries.amount = 34.0;
			groups.driving.amount = 18.7;
			groups.coffee.amount = 16.4;
		}

		const effectiveTotal =
			totalExp > 0
				? totalExp
				: groups.fitness.amount +
					groups.groceries.amount +
					groups.driving.amount +
					groups.coffee.amount;

		return Object.entries(groups).map(([id, item]) => {
			const hours = wage > 0 ? item.amount / wage : item.amount / 17;
			const percentOfSpent =
				effectiveTotal > 0
					? Math.round((item.amount / effectiveTotal) * 1000) / 10
					: 0;
			return {
				id,
				label: item.label,
				subLabel: item.subLabel,
				icon: item.icon,
				color: item.color,
				bgColor: item.bgColor,
				amount: item.amount,
				hours: Math.round(hours * 10) / 10,
				percentOfSpent,
			};
		});
	}, [transactions, wage]);

	// 7-day spend velocity
	const velocityDays = useMemo(() => {
		const days = [
			{ day: 'M', amount: 38.0, hours: 2.2, height: 38 },
			{ day: 'T', amount: 22.0, hours: 1.3, height: 22 },
			{ day: 'W', amount: 52.0, hours: 3.1, height: 52 },
			{ day: 'T', amount: 57.1, hours: 3.4, height: 84 },
			{ day: 'F', amount: 44.0, hours: 2.6, height: 44 },
			{ day: 'S', amount: 60.0, hours: 3.5, height: 60 },
			{ day: 'S', amount: 16.0, hours: 0.9, height: 16 },
		];

		// Scale heights dynamically so highest value caps at 84px
		const maxAmt = Math.max(...days.map((d) => d.amount), 60);
		return days.map((d) => ({
			...d,
			height: Math.max(12, Math.round((d.amount / maxAmt) * 84)),
		}));
	}, []);

	return (
		<div className="flex flex-col relative w-full pt-2 pb-24 max-w-[480px] mx-auto min-h-screen px-4 font-sans">
			{/* Period & Filter Selector Row */}
			<div className="flex items-center justify-between mt-2 mb-5">
				{/* Cycle dropdown selector */}
				<button
					className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-[13px] font-semibold text-[#111111] active:scale-95 transition-all cursor-pointer"
					type="button"
					onClick={onOpenBreakdown}
				>
					<span>Nov 2026 Cycle</span>
					<span className="material-symbols-outlined text-[16px] text-[#6B7280]">
						expand_more
					</span>
				</button>

				{/* Segmented toggle */}
				<div className="inline-flex p-1 bg-[#E5E7EB]/60 rounded-full">
					<button
						className={`px-3.5 py-1 text-[12px] rounded-full transition-all cursor-pointer ${
							timeframe === 'week'
								? 'bg-[#111111] text-white font-semibold shadow-sm'
								: 'font-medium text-[#6B7280] hover:text-[#111111]'
						}`}
						type="button"
						onClick={() => setTimeframe('week')}
					>
						Week
					</button>
					<button
						className={`px-3.5 py-1 text-[12px] rounded-full transition-all cursor-pointer ${
							timeframe === 'month'
								? 'bg-[#111111] text-white font-semibold shadow-sm'
								: 'font-medium text-[#6B7280] hover:text-[#111111]'
						}`}
						type="button"
						onClick={() => setTimeframe('month')}
					>
						Month
					</button>
				</div>
			</div>

			{/* Card 1: CYCLE RUNWAY & LABOR DEPRECIATION */}
			<div className="mb-4">
				<div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-2 px-1">
					CYCLE RUNWAY &amp; LABOR DEPRECIATION
				</div>
				<section
					onClick={onOpenBreakdown}
					className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#F3F4F6] cursor-pointer hover:border-gray-200 transition-colors"
				>
					{/* Side-by-side core anchor */}
					<div className="flex items-start justify-between">
						<div>
							<div className="text-[24px] font-bold text-[#111111] leading-tight">
								${totalSpent.toFixed(2)}{' '}
								<span className="font-normal text-[20px]">spent</span>
							</div>
							<div className="text-[13px] text-[#6B7280] mt-0.5">
								of ${totalCycleBudget.toFixed(2)} cycle budget
							</div>
						</div>
						<div className="text-right">
							<div className="text-[22px] font-bold text-[#111111] leading-tight">
								{hoursBurned} hrs{' '}
								<span className="font-normal text-[18px]">burned</span>
							</div>
							<div className="text-[13px] text-[#6B7280] mt-0.5">
								@ ${wage.toFixed(2)}/hr wage
							</div>
						</div>
					</div>

					{/* Progress track */}
					<div className="mt-5 mb-3.5">
						<div className="flex items-center justify-between mb-1.5">
							<span className="text-[12px] font-medium text-[#6B7280]">
								Budget consumption
							</span>
							<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#10B981]/10 text-[#10B981]">
								{budgetPercentUsed.toFixed(1)}% used
							</span>
						</div>
						<div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden flex">
							<div
								className="h-full bg-[#10B981] rounded-full transition-all duration-300"
								style={{ width: `${Math.min(100, Math.max(0, budgetPercentUsed))}%` }}
							/>
						</div>
					</div>

					{/* Card Footnote */}
					<div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-[12px] text-[#6B7280]">
						<span>
							Burn Pace:{' '}
							<strong className="text-[#111111] font-semibold">
								${burnPacePerDay}/day
							</strong>{' '}
							({burnMinutesPerDay}m)
						</span>
						<span className="w-1 h-1 rounded-full bg-gray-300" />
						<span className="text-[#10B981] font-semibold">
							{daysSafe > 0 ? `${daysSafe} days safe` : '0 days safe'}
						</span>
					</div>
				</section>
			</div>

			{/* Card 2: LABOR HOURS BURNED BY HABIT */}
			<div className="mb-4">
				<div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-2 px-1">
					LABOR HOURS BURNED BY HABIT
				</div>
				<section className="bg-white rounded-[20px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#F3F4F6] divide-y divide-[#F3F4F6]">
					{habitItems.map((item) => (
						<div
							key={item.id}
							className="py-3 first:pt-1 last:pb-1"
						>
							<div className="flex items-center justify-between mb-1.5">
								<div className="flex items-center gap-2.5 min-w-0">
									<div
										className={`w-8 h-8 rounded-full ${item.bgColor} flex items-center justify-center shrink-0`}
									>
										<span className="material-symbols-outlined text-[18px]">
											{item.icon}
										</span>
									</div>
									<span className="text-[15px] font-bold text-[#111111] truncate">
										{item.label} ({item.subLabel})
									</span>
								</div>
								<span className="text-[15px] font-bold text-[#111111] shrink-0">
									{item.hours.toFixed(1)} hrs
								</span>
							</div>
							<div className="flex items-center gap-3 pl-[42px]">
								<span className="text-[13px] text-[#6B7280] w-12 shrink-0">
									${item.amount.toFixed(2)}
								</span>
								<div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
									<div
										className="h-full rounded-full transition-all duration-300"
										style={{
											width: `${Math.min(100, Math.max(0, item.percentOfSpent))}%`,
											backgroundColor: item.color,
										}}
									/>
								</div>
								<span className="text-[12px] font-semibold text-[#6B7280] w-10 text-right shrink-0">
									{item.percentOfSpent.toFixed(1)}%
								</span>
							</div>
						</div>
					))}
				</section>
			</div>

			{/* Card 3: DAILY SPEND VELOCITY (LAST 7 DAYS) */}
			<div className="mb-4">
				<div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-2 px-1">
					DAILY SPEND VELOCITY (LAST 7 DAYS)
				</div>
				<section className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#F3F4F6]">
					{/* Pillar Chart */}
					<div className="relative h-[160px] pt-10 flex items-end justify-between px-3">
						{velocityDays.map((dayItem, idx) => {
							const isSelected = idx === selectedDayIndex;
							return (
								<button
									key={idx}
									type="button"
									onClick={() => setSelectedDayIndex(idx)}
									className="relative flex flex-col items-center gap-2 cursor-pointer focus:outline-none"
								>
									{/* Tooltip with pointer */}
									{isSelected && (
										<div className="absolute -top-8 whitespace-nowrap bg-[#111111] text-white px-2 py-0.5 rounded-full text-[11px] font-bold shadow-md z-10 flex items-center justify-center">
											${dayItem.amount.toFixed(2)} ({dayItem.hours}h)
											<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#111111] rotate-45 rounded-xs" />
										</div>
									)}

									<div className="relative w-[12px] h-[100px] bg-[#F3F4F6] rounded-full overflow-hidden flex items-end">
										<div
											className={`w-full bg-[#10B981] rounded-full transition-all duration-300 ${
												isSelected ? 'ring-2 ring-[#10B981]/20' : ''
											}`}
											style={{ height: `${dayItem.height}px` }}
										/>
									</div>
									<span
										className={`text-[12px] ${
											isSelected
												? 'font-bold text-[#111111]'
												: 'font-medium text-gray-500'
										}`}
									>
										{dayItem.day}
									</span>
								</button>
							);
						})}
					</div>

					{/* Footnote */}
					<div className="mt-4 pt-3 border-t border-[#F3F4F6] text-center text-[12px] text-[#6B7280]">
						Avg:{' '}
						<strong className="text-[#111111] font-semibold">
							$16.58/day
						</strong>{' '}
						• Safe Target:{' '}
						<strong className="text-[#10B981] font-semibold">
							≤ $19.80/day
						</strong>
					</div>
				</section>
			</div>
		</div>
	);
};
