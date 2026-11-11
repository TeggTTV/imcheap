import React, { useState, useMemo } from 'react';
import {
	Transaction,
	BalanceSummary,
	IncomeSettings,
} from '../utils/expenseMath';
import { parseTransactionDate } from '../utils/dateUtils';
import { format, startOfWeek, addDays, isValid } from 'date-fns';

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

interface VelocityDay {
	day: string;
	dateKey: string;
	amount: number;
	hours: number;
	height: number;
}

const CATEGORY_STYLES: Record<
	string,
	{ icon: string; color: string; bgColor: string }
> = {
	fitness: {
		icon: 'sports_volleyball',
		color: '#F43F5E',
		bgColor: 'bg-[#F43F5E]/10 text-[#F43F5E]',
	},
	food: {
		icon: 'coffee',
		color: '#F59E0B',
		bgColor: 'bg-[#F59E0B]/10 text-[#F59E0B]',
	},
	groceries: {
		icon: 'shopping_cart',
		color: '#10B981',
		bgColor: 'bg-[#10B981]/10 text-[#10B981]',
	},
	supplies: {
		icon: 'shopping_cart',
		color: '#10B981',
		bgColor: 'bg-[#10B981]/10 text-[#10B981]',
	},
	driving: {
		icon: 'directions_car',
		color: '#6366F1',
		bgColor: 'bg-[#6366F1]/10 text-[#6366F1]',
	},
	transit: {
		icon: 'directions_car',
		color: '#6366F1',
		bgColor: 'bg-[#6366F1]/10 text-[#6366F1]',
	},
	bills: {
		icon: 'receipt_long',
		color: '#8B5CF6',
		bgColor: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
	},
	general: {
		icon: 'payments',
		color: '#64748B',
		bgColor: 'bg-[#64748B]/10 text-[#64748B]',
	},
};

const PALETTE = [
	{ color: '#F43F5E', bgColor: 'bg-[#F43F5E]/10 text-[#F43F5E]' },
	{ color: '#10B981', bgColor: 'bg-[#10B981]/10 text-[#10B981]' },
	{ color: '#6366F1', bgColor: 'bg-[#6366F1]/10 text-[#6366F1]' },
	{ color: '#F59E0B', bgColor: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
	{ color: '#8B5CF6', bgColor: 'bg-[#8B5CF6]/10 text-[#8B5CF6]' },
	{ color: '#EC4899', bgColor: 'bg-[#EC4899]/10 text-[#EC4899]' },
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
	transactions,
	summary,
	settings,
	onOpenBreakdown,
}) => {
	const [timeframe, setTimeframe] = useState<'week' | 'month'>('month');
	const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => new Date().getDay()); // Default to today's day of week (0 = Sunday ... 6 = Saturday)

	const wage = settings.hourlyWage > 0 ? settings.hourlyWage : 17;
	const totalSpent = summary.loggedExpenses;
	const totalCycleBudget =
		summary.basePaycheck + (summary.totalIncome || 0) || 238;
	const hoursBurned =
		wage > 0
			? (totalSpent / wage).toFixed(1)
			: (totalSpent / 17).toFixed(1);

	const budgetPercentUsed =
		totalCycleBudget > 0
			? Math.min(100, (totalSpent / totalCycleBudget) * 100)
			: 0;

	// Calculate daily burn pace based on actual spent
	// If month: 30 days divisor; if week: 7 days divisor
	const daysInPeriod = timeframe === 'week' ? 7 : 30;
	const burnPaceVal = totalSpent > 0 ? totalSpent / daysInPeriod : 0;
	const burnPacePerDay = burnPaceVal.toFixed(2);
	const burnMinutesPerDay = Math.round((burnPaceVal / wage) * 60);

	// Safe spend and runway calculations
	const safeTargetPerDay = (totalCycleBudget / daysInPeriod).toFixed(2);
	const daysSafe =
		summary.availableBalance > 0
			? burnPaceVal > 0
				? Math.round(summary.availableBalance / burnPaceVal)
				: Math.round(
						summary.availableBalance /
							(parseFloat(safeTargetPerDay) || 1),
					)
			: 0;

	// Parse transaction dates and aggregate into the current week (Sunday to Saturday) using date-fns
	const velocityDays: VelocityDay[] = useMemo(() => {
		const now = new Date();
		const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday to Saturday single letters
		const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday as start of week

		// Build array for Sunday through Saturday
		const days: { dateKey: string; dayLetter: string; amount: number; dateObj: Date }[] =
			[];
		for (let i = 0; i < 7; i++) {
			const d = addDays(weekStart, i);
			const dateKey = format(d, 'yyyy-MM-dd');
			days.push({
				dateKey,
				dayLetter: dayNames[i],
				amount: 0,
				dateObj: d,
			});
		}

		// Aggregate real expense transactions into their corresponding day of this week
		const expenseTxs = transactions.filter((t) => t.type === 'expense');
		expenseTxs.forEach((tx) => {
			const txDate = parseTransactionDate(tx.timestamp);
			if (isValid(txDate)) {
				const txKey = format(txDate, 'yyyy-MM-dd');
				const targetIndex = days.findIndex((d) => d.dateKey === txKey);
				if (targetIndex >= 0 && targetIndex < days.length) {
					days[targetIndex].amount += tx.amount;
				}
			}
		});

		// Compute max height for scaling
		const maxAmt = Math.max(...days.map((d) => d.amount), 1);

		return days.map((d) => {
			const hours = wage > 0 ? Number((d.amount / wage).toFixed(1)) : 0;
			// Scale between 8px and 84px
			const height =
				d.amount > 0
					? Math.max(14, Math.round((d.amount / maxAmt) * 84))
					: 8;
			return {
				day: d.dayLetter,
				dateKey: d.dateKey,
				amount: Number(d.amount.toFixed(2)),
				hours,
				height,
			};
		});
	}, [transactions, wage]);

	// Calculate 7-day average spend from real velocity days
	const sevenDayTotal = velocityDays.reduce((acc, d) => acc + d.amount, 0);
	const sevenDayAvg = (sevenDayTotal / 7).toFixed(2);

	// Group transactions into real habit categories
	const habitItems: HabitSummaryItem[] = useMemo(() => {
		const expenseTxs = transactions.filter((t) => t.type === 'expense');
		const totalExp = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

		if (totalExp === 0 || expenseTxs.length === 0) {
			return [];
		}

		// Group expenses by category
		const categoryBuckets: Record<
			string,
			{
				categoryName: string;
				subLabels: Set<string>;
				icon: string;
				amount: number;
			}
		> = {};

		expenseTxs.forEach((tx) => {
			const rawCat = (tx.category || 'General').trim();
			const catKey = rawCat.toLowerCase();
			if (!categoryBuckets[catKey]) {
				categoryBuckets[catKey] = {
					categoryName: rawCat,
					subLabels: new Set<string>(),
					icon: tx.icon || 'payments',
					amount: 0,
				};
			}
			categoryBuckets[catKey].amount += tx.amount;
			if (tx.title && tx.title !== rawCat) {
				categoryBuckets[catKey].subLabels.add(tx.title);
			}
		});

		// Sort by amount descending
		const sorted = Object.entries(categoryBuckets).sort(
			(a, b) => b[1].amount - a[1].amount,
		);

		return sorted.map(([catKey, data], index) => {
			const style =
				CATEGORY_STYLES[catKey] || PALETTE[index % PALETTE.length];
			const icon =
				CATEGORY_STYLES[catKey]?.icon || data.icon || 'receipt_long';
			const hours = wage > 0 ? data.amount / wage : 0;
			const percentOfSpent =
				totalExp > 0
					? Math.round((data.amount / totalExp) * 1000) / 10
					: 0;

			// SubLabel preview: comma-joined up to 2 titles
			const subLabelArr = Array.from(data.subLabels).slice(0, 2);
			const subLabel =
				subLabelArr.length > 0
					? subLabelArr.join(' / ')
					: data.categoryName;

			return {
				id: catKey,
				label: data.categoryName,
				subLabel,
				icon,
				color: style.color,
				bgColor: style.bgColor,
				amount: Number(data.amount.toFixed(2)),
				hours: Number(hours.toFixed(1)),
				percentOfSpent,
			};
		});
	}, [transactions, wage]);

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
					<span>{settings.cycleLabel || 'Current Cycle'}</span>
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
								<span className="font-normal text-[20px]">
									spent
								</span>
							</div>
							<div className="text-[13px] text-[#6B7280] mt-0.5">
								of ${totalCycleBudget.toFixed(2)} cycle budget
							</div>
						</div>
						<div className="text-right">
							<div className="text-[22px] font-bold text-[#111111] leading-tight">
								{hoursBurned} hrs{' '}
								<span className="font-normal text-[18px]">
									burned
								</span>
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
							<span
								className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
									budgetPercentUsed > 90
										? 'bg-rose-50 text-rose-600'
										: 'bg-[#10B981]/10 text-[#10B981]'
								}`}
							>
								{budgetPercentUsed.toFixed(1)}% used
							</span>
						</div>
						<div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden flex">
							<div
								className={`h-full rounded-full transition-all duration-300 ${
									budgetPercentUsed > 90
										? 'bg-rose-500'
										: 'bg-[#10B981]'
								}`}
								style={{
									width: `${Math.min(100, Math.max(0, budgetPercentUsed))}%`,
								}}
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
						<span
							className={`font-semibold ${
								daysSafe <= 3
									? 'text-amber-600'
									: 'text-[#10B981]'
							}`}
						>
							{daysSafe > 0
								? `${daysSafe} days safe`
								: '0 days safe'}
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
					{habitItems.length === 0 ? (
						<div className="py-6 text-center text-[13px] text-gray-400">
							No expenses logged for this cycle yet
						</div>
					) : (
						habitItems.map((item) => (
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
											{item.label}{' '}
											{/* <span className="font-normal text-gray-500">
												 ({item.subLabel})
											</span> */}
										</span>
									</div>
									<span className="text-[15px] font-bold text-[#111111] shrink-0">
										{item.hours.toFixed(1)} hrs
									</span>
								</div>
								<div className="flex items-center gap-3 pl-[42px]">
									<span className="text-[13px] text-[#6B7280] w-14 shrink-0 tabular-nums">
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
									<span className="text-[12px] font-semibold text-[#6B7280] w-12 text-right shrink-0 tabular-nums">
										{item.percentOfSpent.toFixed(1)}%
									</span>
								</div>
							</div>
						))
					)}
				</section>
			</div>

			{/* Card 3: DAILY SPEND VELOCITY (THIS WEEK) */}
			<div className="mb-4">
				<div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-2 px-1">
					DAILY SPEND VELOCITY (THIS WEEK)
				</div>
				<section className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#F3F4F6]">
					{/* Pillar Chart */}
					<div className="relative h-[160px] pt-10 flex items-end justify-between px-3">
						{velocityDays.map((dayItem, idx) => {
							const isSelected = idx === selectedDayIndex;
							return (
								<button
									key={dayItem.dateKey}
									type="button"
									onClick={() => setSelectedDayIndex(idx)}
									className="relative flex flex-col items-center gap-2 cursor-pointer focus:outline-none"
								>
									{/* Tooltip with pointer */}
									{isSelected && (
										<div className="absolute -top-8 whitespace-nowrap bg-[#111111] text-white px-2 py-0.5 rounded-full text-[11px] font-bold shadow-md z-10 flex items-center justify-center">
											${dayItem.amount.toFixed(2)} (
											{dayItem.hours}h)
											<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#111111] rotate-45 rounded-xs" />
										</div>
									)}

									<div className="relative w-[12px] h-[100px] bg-[#F3F4F6] rounded-full overflow-hidden flex items-end">
										<div
											className={`w-full bg-[#10B981] rounded-full transition-all duration-300 ${
												isSelected
													? 'ring-2 ring-[#10B981]/20'
													: ''
											}`}
											style={{
												height: `${dayItem.height}px`,
											}}
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

					{/* Footnote with live calculations */}
					<div className="mt-4 pt-3 border-t border-[#F3F4F6] text-center text-[12px] text-[#6B7280]">
						Avg:{' '}
						<strong className="text-[#111111] font-semibold tabular-nums">
							${sevenDayAvg}/day
						</strong>{' '}
						• Safe Target:{' '}
						<strong className="text-[#10B981] font-semibold tabular-nums">
							≤ ${safeTargetPerDay}/day
						</strong>
					</div>
				</section>
			</div>
		</div>
	);
};
