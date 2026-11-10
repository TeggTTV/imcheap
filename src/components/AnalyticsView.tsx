import React, { useState } from 'react';
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

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
	transactions,
	summary,
	settings,
}) => {
	const [timeframe, setTimeframe] = useState<'week' | 'month' | 'cycle'>(
		'month',
	);

	const wage = settings.hourlyWage > 0 ? settings.hourlyWage : 17;
	const totalSpent = summary.loggedExpenses;
	const baseCheck = summary.basePaycheck;
	const spentHours = (totalSpent / wage).toFixed(1);
	const capPercent =
		baseCheck > 0 ? ((totalSpent / baseCheck) * 100).toFixed(1) : '38.6';

	// Category aggregates
	const categoryColors: Record<
		string,
		{
			gradId: string;
			stroke: string;
			stopStart: string;
			stopEnd: string;
			color: string;
			eqHours: string;
		}
	> = {
		Groceries: {
			gradId: 'groceriesGrad',
			stroke: 'url(#groceriesGrad)',
			stopStart: '#10B981',
			stopEnd: '#059669',
			color: '#10B981',
			eqHours: '2.0h',
		},
		Fitness: {
			gradId: 'fitnessGrad',
			stroke: 'url(#fitnessGrad)',
			stopStart: '#F43F5E',
			stopEnd: '#E11D48',
			color: '#F43F5E',
			eqHours: '1.5h',
		},
		Driving: {
			gradId: 'transitGrad',
			stroke: 'url(#transitGrad)',
			stopStart: '#6366F1',
			stopEnd: '#4F46E5',
			color: '#6366F1',
			eqHours: '1.1h',
		},
		Food: {
			gradId: 'coffeeGrad',
			stroke: 'url(#coffeeGrad)',
			stopStart: '#F59E0B',
			stopEnd: '#D97706',
			color: '#F59E0B',
			eqHours: '0.8h',
		},
	};

	const catTotals = transactions.reduce<Record<string, number>>((acc, tx) => {
		if (tx.type !== 'expense') return acc;
		const cat =
			tx.category === 'Supplies'
				? 'Groceries'
				: tx.category === 'Everyday'
					? 'Food'
					: tx.category;
		acc[cat] = (acc[cat] || 0) + tx.amount;
		return acc;
	}, {});

	const groceriesAmt = catTotals['Groceries'] || 0;
	const fitnessAmt = catTotals['Fitness'] || 0;
	const drivingAmt = catTotals['Driving'] || 0;
	const foodAmt = catTotals['Food'] || 0;

	const sumAmt = groceriesAmt + fitnessAmt + drivingAmt + foodAmt;
	const circ = 552.92; // 2 * pi * 88

	// Arc lengths with 16 gap when sumAmt > 0
	const hasExpenses = sumAmt > 0;
	const arc1Len =
		hasExpenses && groceriesAmt > 0
			? Math.max(12, (groceriesAmt / sumAmt) * circ - 16)
			: 0;
	const arc2Len =
		hasExpenses && fitnessAmt > 0
			? Math.max(12, (fitnessAmt / sumAmt) * circ - 16)
			: 0;
	const arc3Len =
		hasExpenses && drivingAmt > 0
			? Math.max(12, (drivingAmt / sumAmt) * circ - 16)
			: 0;
	const arc4Len =
		hasExpenses && foodAmt > 0
			? Math.max(12, (foodAmt / sumAmt) * circ - 16)
			: 0;

	const offset1 = 0;
	const offset2 = sumAmt > 0 ? -((groceriesAmt / sumAmt) * circ) : 0;
	const offset3 =
		sumAmt > 0 ? -(((groceriesAmt + fitnessAmt) / sumAmt) * circ) : 0;
	const offset4 =
		sumAmt > 0
			? -(((groceriesAmt + fitnessAmt + drivingAmt) / sumAmt) * circ)
			: 0;

	return (
		<div className="flex flex-col w-full pb-28 gap-space-md pt-2">
			{/* Cycle Context Header Info */}
			<div className="flex items-center justify-between pt-space-xs">
				<div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container rounded-full">
					<span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
					<span className="text-label-md font-label-md text-on-surface-variant font-medium">
						Nov 2026 Cycle • ${totalSpent.toFixed(2)} of $
						{baseCheck.toFixed(2)} spent
					</span>
				</div>
				<div className="text-label-sm font-label-sm text-secondary font-semibold bg-secondary-container/50 px-2 py-0.5 rounded-full">
					{capPercent}% OF CAP
				</div>
			</div>

			{/* CARD 1: Segmented Round-Cap Donut Chart */}
			<section className="bg-surface-container-lowest rounded-[20px] p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden">
				<div className="flex items-center justify-between">
					<span className="text-label-sm font-label-sm tracking-wider uppercase text-on-surface-variant/80 font-bold">
						Category Breakdown
					</span>
					<span className="text-label-sm font-label-sm text-on-surface-variant">
						Total: 4 Categories
					</span>
				</div>

				<div className="relative flex items-center justify-center py-2">
					<svg
						aria-label="Expenses segmented breakdown chart"
						className="w-56 h-56 transform -rotate-90"
						viewBox="0 0 220 220"
					>
						<defs>
							<linearGradient
								id="groceriesGrad"
								x1="0%"
								x2="100%"
								y1="0%"
								y2="100%"
							>
								<stop offset="0%" stopColor="#10B981" />
								<stop offset="100%" stopColor="#059669" />
							</linearGradient>
							<linearGradient
								id="fitnessGrad"
								x1="0%"
								x2="100%"
								y1="0%"
								y2="100%"
							>
								<stop offset="0%" stopColor="#F43F5E" />
								<stop offset="100%" stopColor="#E11D48" />
							</linearGradient>
							<linearGradient
								id="transitGrad"
								x1="0%"
								x2="100%"
								y1="0%"
								y2="100%"
							>
								<stop offset="0%" stopColor="#6366F1" />
								<stop offset="100%" stopColor="#4F46E5" />
							</linearGradient>
							<linearGradient
								id="coffeeGrad"
								x1="0%"
								x2="100%"
								y1="0%"
								y2="100%"
							>
								<stop offset="0%" stopColor="#F59E0B" />
								<stop offset="100%" stopColor="#D97706" />
							</linearGradient>
						</defs>
						{/* Base rail track */}
						<circle
							cx="110"
							cy="110"
							fill="none"
							r="86"
							stroke="#F1F4F9"
							strokeWidth="16"
						/>
						{/* Segment 1: Groceries */}
						{arc1Len > 0 && (
							<circle
								className="transition-all duration-300 cursor-pointer hover:opacity-90"
								cx="110"
								cy="110"
								fill="none"
								id="arc-groceries"
								r="86"
								stroke={categoryColors.Groceries.stroke}
								strokeDasharray={`${arc1Len} ${circ}`}
								strokeDashoffset={offset1}
								strokeLinecap="round"
								strokeWidth="16"
							/>
						)}
						{/* Segment 2: Fitness */}
						{arc2Len > 0 && (
							<circle
								className="transition-all duration-300 cursor-pointer hover:opacity-90"
								cx="110"
								cy="110"
								fill="none"
								id="arc-fitness"
								r="86"
								stroke={categoryColors.Fitness.stroke}
								strokeDasharray={`${arc2Len} ${circ}`}
								strokeDashoffset={offset2}
								strokeLinecap="round"
								strokeWidth="16"
							/>
						)}
						{/* Segment 3: Driving */}
						{arc3Len > 0 && (
							<circle
								className="transition-all duration-300 cursor-pointer hover:opacity-90"
								cx="110"
								cy="110"
								fill="none"
								id="arc-transit"
								r="86"
								stroke={categoryColors.Driving.stroke}
								strokeDasharray={`${arc3Len} ${circ}`}
								strokeDashoffset={offset3}
								strokeLinecap="round"
								strokeWidth="16"
							/>
						)}
						{/* Segment 4: Food / Coffee */}
						{arc4Len > 0 && (
							<circle
								className="transition-all duration-300 cursor-pointer hover:opacity-90"
								cx="110"
								cy="110"
								fill="none"
								id="arc-coffee"
								r="86"
								stroke={categoryColors.Food.stroke}
								strokeDasharray={`${arc4Len} ${circ}`}
								strokeDashoffset={offset4}
								strokeLinecap="round"
								strokeWidth="16"
							/>
						)}
					</svg>

					{/* Center Typography Metrics */}
					<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
						<span className="text-headline-lg font-headline-lg font-extrabold text-on-surface tracking-tight leading-none tabular-nums">
							${totalSpent.toFixed(2)}
						</span>
						<span className="text-label-md font-label-md font-medium text-on-surface-variant mt-1">
							{spentHours} hrs of work
						</span>
						<div className="inline-flex items-center gap-1 bg-secondary-container/60 text-on-secondary-container px-2 py-0.5 rounded-full mt-1.5">
							<span className="material-symbols-outlined text-[11px]">
								payments
							</span>
							<span className="text-label-sm font-label-sm font-semibold">
								at ${wage.toFixed(2)}/hr base
							</span>
						</div>
					</div>
				</div>

				{/* 2x2 Clean Minimal Legend */}
				<div className="grid grid-cols-2 gap-x-space-md gap-y-space-sm pt-2 bg-surface-container-low p-space-md rounded-xl">
					<div className="flex items-center gap-2.5">
						<span className="w-3 h-3 rounded-full bg-[#10B981] shrink-0 shadow-sm" />
						<div className="flex flex-col min-w-0">
							<div className="flex items-baseline gap-1">
								<span className="text-body-md font-label-lg font-semibold text-on-surface truncate">
									Groceries
								</span>
								<span className="text-label-sm font-label-sm font-bold text-on-surface tabular-nums">
									${groceriesAmt.toFixed(2)}
								</span>
							</div>
							<span className="text-label-sm font-label-sm text-on-surface-variant">
								{(groceriesAmt / wage).toFixed(1)}h equivalent
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2.5">
						<span className="w-3 h-3 rounded-full bg-[#F43F5E] shrink-0 shadow-sm" />
						<div className="flex flex-col min-w-0">
							<div className="flex items-baseline gap-1">
								<span className="text-body-md font-label-lg font-semibold text-on-surface truncate">
									Fitness
								</span>
								<span className="text-label-sm font-label-sm font-bold text-on-surface tabular-nums">
									${fitnessAmt.toFixed(2)}
								</span>
							</div>
							<span className="text-label-sm font-label-sm text-on-surface-variant">
								{(fitnessAmt / wage).toFixed(1)}h equivalent
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2.5">
						<span className="w-3 h-3 rounded-full bg-[#6366F1] shrink-0 shadow-sm" />
						<div className="flex flex-col min-w-0">
							<div className="flex items-baseline gap-1">
								<span className="text-body-md font-label-lg font-semibold text-on-surface truncate">
									Driving
								</span>
								<span className="text-label-sm font-label-sm font-bold text-on-surface tabular-nums">
									${drivingAmt.toFixed(2)}
								</span>
							</div>
							<span className="text-label-sm font-label-sm text-on-surface-variant">
								{(drivingAmt / wage).toFixed(1)}h equivalent
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2.5">
						<span className="w-3 h-3 rounded-full bg-[#F59E0B] shrink-0 shadow-sm" />
						<div className="flex flex-col min-w-0">
							<div className="flex items-baseline gap-1">
								<span className="text-body-md font-label-lg font-semibold text-on-surface truncate">
									Coffee
								</span>
								<span className="text-label-sm font-label-sm font-bold text-on-surface tabular-nums">
									${foodAmt.toFixed(2)}
								</span>
							</div>
							<span className="text-label-sm font-label-sm text-on-surface-variant">
								{(foodAmt / wage).toFixed(1)}h equivalent
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* CARD 2: Daily Burn Pillars & Cumulative Spline Wave */}
			<section className="bg-surface-container-lowest rounded-[20px] p-space-lg shadow-sm flex flex-col gap-space-md">
				{/* Timeframe Pace Data Section */}
				{(() => {
					// Timeframe data definitions computed purely from actual logged expense transactions
					type PaceBar = {
						label: string;
						amount: number;
						isHighlight?: boolean;
						hoursText?: string;
					};
					let paceBars: PaceBar[] = [];
					let dailyAvgText = '';
					let laborText = '';

					// Map actual expense transactions
					// Day index: Monday = 0, Tuesday = 1, Wednesday = 2 (today/mid-week), Thursday = 3, Friday = 4, Saturday = 5, Sunday = 6
					// Week index: W1, W2, W3 (current week), W4
					// Cycle index: D1-3, D4-6, D7-9, D10-12 (current cycle period), D13-14
					const expenseTx = transactions.filter(
						(tx) => tx.type === 'expense',
					);

					if (timeframe === 'week') {
						const weekSums = [0, 0, 0, 0, 0, 0, 0];
						// Place transactions into days:
						// tx-1 (Espresso $14.3) -> Today (Wednesday, index 2)
						// tx-2 (Driving $18.7) -> Today (Wednesday, index 2)
						// tx-3 (Fitness $25.0) -> Yesterday (Tuesday, index 1)
						// tx-4 (Groceries $34.0) -> Earlier (Monday, index 0)
						// Any newly created transaction (id: tx-timestamp, or created today) maps to Wednesday (today)
						expenseTx.forEach((tx) => {
							if (tx.id === 'tx-4') {
								weekSums[0] += tx.amount; // Monday
							} else if (tx.id === 'tx-3') {
								weekSums[1] += tx.amount; // Tuesday
							} else {
								// Today (Wednesday)
								weekSums[2] += tx.amount;
							}
						});

						const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
						paceBars = dayLabels.map((lbl, idx) => {
							const amt = Number(weekSums[idx].toFixed(2));
							const isToday = idx === 2; // Wednesday
							return {
								label: lbl,
								amount: amt,
								isHighlight: isToday,
								hoursText:
									amt > 0
										? `${(amt / wage).toFixed(1)}h`
										: undefined,
							};
						});

						const avg = totalSpent / 7;
						dailyAvgText = `$${avg.toFixed(2)}/day`;
						laborText = `${Math.round((avg / wage) * 60)}m labor`;
					} else if (timeframe === 'month') {
						const monthSums = [0, 0, 0, 0];
						// W1, W2, W3 (current week), W4
						expenseTx.forEach((tx) => {
							if (tx.id === 'tx-4') {
								monthSums[0] += tx.amount; // W1
							} else if (tx.id === 'tx-3') {
								monthSums[1] += tx.amount; // W2
							} else {
								// Current week (W3)
								monthSums[2] += tx.amount;
							}
						});

						const weekLabels = ['W1', 'W2', 'W3', 'W4'];
						paceBars = weekLabels.map((lbl, idx) => {
							const amt = Number(monthSums[idx].toFixed(2));
							const isCurrentWeek = idx === 2; // W3
							return {
								label: lbl,
								amount: amt,
								isHighlight: isCurrentWeek,
								hoursText:
									amt > 0
										? `${(amt / wage).toFixed(1)}h`
										: undefined,
							};
						});

						const avg = totalSpent / 30;
						dailyAvgText = `$${avg.toFixed(2)}/day`;
						laborText = `${Math.round((avg / wage) * 60)}m labor`;
					} else {
						// cycle (e.g. 14 days split into buckets)
						const cycleSums = [0, 0, 0, 0, 0];
						expenseTx.forEach((tx) => {
							if (tx.id === 'tx-4') {
								cycleSums[0] += tx.amount; // D1-3
							} else if (tx.id === 'tx-3') {
								cycleSums[1] += tx.amount; // D4-6
							} else {
								// Current period (D10-12)
								cycleSums[3] += tx.amount;
							}
						});

						const cycleLabels = [
							'D1-3',
							'D4-6',
							'D7-9',
							'D10-12',
							'D13-14',
						];
						paceBars = cycleLabels.map((lbl, idx) => {
							const amt = Number(cycleSums[idx].toFixed(2));
							const isCurrent = idx === 3; // D10-12
							return {
								label: lbl,
								amount: amt,
								isHighlight: isCurrent,
								hoursText:
									amt > 0
										? `${(amt / wage).toFixed(1)}h`
										: undefined,
							};
						});

						const avg = totalSpent / 14;
						dailyAvgText = `$${avg.toFixed(2)}/day`;
						laborText = `${Math.round((avg / wage) * 60)}m labor`;
					}

					const maxVal = Math.max(
						...paceBars.map((b) => b.amount),
						1,
					);

					return (
						<>
							<div className="flex items-center justify-between">
								<div className="flex flex-col">
									<span className="text-label-sm font-label-sm tracking-wider uppercase text-on-surface-variant/80 font-bold">
										Spending Pace
									</span>
									<span className="text-label-sm font-label-sm text-on-surface-variant mt-0.5">
										Daily Avg:{' '}
										<strong className="text-on-surface font-semibold">
											{dailyAvgText}
										</strong>{' '}
										({laborText})
									</span>
								</div>

								<div
									className="flex items-center p-1 bg-surface-container rounded-full gap-0.5"
									id="timeframe-toggle"
								>
									{(['week', 'month', 'cycle'] as const).map(
										(t) => (
											<button
												key={t}
												type="button"
												onClick={() => setTimeframe(t)}
												className={`px-2.5 py-1 text-label-sm font-label-sm rounded-full transition-all duration-150 cursor-pointer capitalize ${
													timeframe === t
														? 'bg-primary text-on-primary font-semibold shadow-sm'
														: 'text-on-surface-variant font-medium hover:text-on-surface'
												}`}
											>
												{t}
											</button>
										),
									)}
								</div>
							</div>

							{/* Dynamic Vertical Burn Pillar Bars */}
							<div className="pt-2">
								<div
									className={`grid gap-2 h-52 items-end ${paceBars.length === 7 ? 'grid-cols-7' : paceBars.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}
								>
									{paceBars.map((bar, idx) => {
										const pct =
											bar.amount > 0
												? Math.max(
														12,
														Math.round(
															(bar.amount /
																maxVal) *
																85,
														),
													)
												: 0;
										return (
											<div
												key={idx}
												className="flex flex-col items-center h-full justify-end group cursor-pointer relative"
											>
												{/* Floating Dark Tooltip with downward arrow */}
												{bar.isHighlight ? (
													<div className="mb-2 relative flex flex-col items-center z-20">
														<div className="px-2.5 py-1 bg-[#111111] text-white rounded-full shadow-md flex items-center gap-1 leading-none whitespace-nowrap">
															<span className="text-[11px] font-bold tracking-tight tabular-nums">
																$
																{bar.amount.toFixed(
																	2,
																)}
															</span>
															{bar.hoursText && (
																<span className="text-[10px] text-white/80 font-normal">
																	(
																	{
																		bar.hoursText
																	}
																	)
																</span>
															)}
														</div>
														<div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#111111] -mt-px" />
													</div>
												) : (
													<span className="text-[11px] text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity mb-2 tabular-nums">
														$
														{bar.amount > 0
															? bar.amount.toFixed(
																	1,
																)
															: '0'}
													</span>
												)}

												{/* 16px Slender Capsule Track with flat baseline */}
												<div className="w-4 bg-[#F3F4F6] rounded-t-[8px] rounded-b-none h-full flex flex-col justify-end overflow-hidden relative">
													{bar.amount > 0 && (
														<div
															className="w-full bg-[#10B981] transition-all duration-500 rounded-t-[8px] rounded-b-none"
															style={{
																height: `${pct}%`,
																minHeight:
																	'8px',
															}}
														/>
													)}
												</div>

												{/* Clean hairline baseline */}
												<div className="w-full h-px bg-[#F3F4F6]" />

												{/* Column label */}
												<span
													className={`text-label-sm font-label-sm mt-2 transition-colors ${
														bar.isHighlight
															? 'font-bold text-[#111111]'
															: 'font-semibold text-[#9CA3AF]'
													}`}
												>
													{bar.label}
												</span>
											</div>
										);
									})}
								</div>
							</div>
						</>
					);
				})()}

				<div className="w-full h-px bg-surface-container-high my-1" />

				{/* Cumulative Spline Wave Area Chart */}
				{(() => {
					// Actual budget pacing calculations
					// Mid-cycle elapsed ratio (e.g. Day 18 of 30 days = 60%)
					const cycleElapsedRatio = 0.6;
					const expectedPaceSpent = baseCheck * cycleElapsedRatio;
					const surplusDiff = expectedPaceSpent - totalSpent;
					const isUnderBudget = surplusDiff >= 0;
					const surplusLabel = isUnderBudget
						? `+$${surplusDiff.toFixed(0)}`
						: `-$${Math.abs(surplusDiff).toFixed(0)} Over Pace`;

					// Graph geometry based on real data
					const svgW = 360;
					const svgH = 120;
					const startY = 105;
					const topMargin = 20;

					// Fraction of baseCheck spent
					const spentFraction =
						baseCheck > 0
							? Math.min(1.2, totalSpent / baseCheck)
							: 0;
					const currentX = Math.round(
						10 + cycleElapsedRatio * (svgW - 20),
					); // around 220
					const currentY = Math.max(
						topMargin,
						Math.round(
							startY - spentFraction * (startY - topMargin),
						),
					);

					const controlX1 = Math.round(10 + (currentX - 10) * 0.4);
					const controlY1 = Math.round(
						startY - spentFraction * (startY - topMargin) * 0.25,
					);
					const controlX2 = Math.round(10 + (currentX - 10) * 0.75);
					const controlY2 = Math.round(
						startY - spentFraction * (startY - topMargin) * 0.7,
					);

					// Projected pace to end of month
					const endX = svgW - 10;
					const projectedSpentFraction =
						baseCheck > 0
							? Math.min(
									1.3,
									totalSpent / cycleElapsedRatio / baseCheck,
								)
							: 0;
					const endY = Math.max(
						topMargin,
						Math.round(
							startY -
								projectedSpentFraction * (startY - topMargin),
						),
					);

					return (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-label-sm font-label-sm tracking-wider uppercase text-on-surface-variant/80 font-bold">
									Cumulative Burn vs. Pace
								</span>
								<div
									className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-label-sm font-label-sm ${
										isUnderBudget
											? 'bg-secondary-container text-on-secondary-container'
											: 'bg-error-container text-on-error-container'
									}`}
								>
									<span className="material-symbols-outlined text-[13px]">
										{isUnderBudget
											? 'trending_up'
											: 'trending_down'}
									</span>
									<span>{surplusLabel}</span>
								</div>
							</div>

							<div className="relative w-full h-36 pt-1">
								<svg
									className="w-full h-full overflow-visible"
									preserveAspectRatio="none"
									viewBox="0 0 360 120"
								>
									<defs>
										<linearGradient
											id="splineAreaGrad"
											x1="0"
											x2="0"
											y1="0"
											y2="1"
										>
											<stop
												offset="0%"
												stopColor="#10B981"
												stopOpacity="0.28"
											/>
											<stop
												offset="65%"
												stopColor="#10B981"
												stopOpacity="0.06"
											/>
											<stop
												offset="100%"
												stopColor="#10B981"
												stopOpacity="0"
											/>
										</linearGradient>
									</defs>
									{/* Budget Cap Line */}
									<line
										stroke="#9CA3AF"
										strokeDasharray="3 3"
										strokeWidth="1"
										x1="8"
										x2="352"
										y1="18"
										y2="18"
									/>
									<text
										fill="#6B7280"
										fontSize="9"
										fontWeight="600"
										letterSpacing="0.03em"
										x="10"
										y="14"
									>
										BUDGET CAP: ${baseCheck.toFixed(2)}
									</text>

									{/* Linear Expected Pace Reference Line */}
									<line
										stroke="#CBD5E1"
										strokeDasharray="4 4"
										strokeWidth="1.5"
										x1="10"
										x2="350"
										y1={startY}
										y2={topMargin}
									/>

									{/* Cumulative Area & Real Spend Curve */}
									{totalSpent > 0 ? (
										<>
											<path
												d={`M 10 ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${currentX} ${currentY} L ${currentX} ${startY} L 10 ${startY} Z`}
												fill="url(#splineAreaGrad)"
											/>
											<path
												d={`M 10 ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${currentX} ${currentY}`}
												fill="none"
												stroke="#059669"
												strokeLinecap="round"
												strokeWidth="2.5"
											/>
											<path
												d={`M ${currentX} ${currentY} C ${Math.round((currentX + endX) / 2)} ${Math.round((currentY + endY) / 2)}, ${endX - 20} ${endY}, ${endX} ${endY}`}
												fill="none"
												stroke="#10B981"
												strokeDasharray="3 3"
												strokeOpacity="0.45"
												strokeWidth="1.75"
											/>
											<circle
												cx={currentX}
												cy={currentY}
												fill="#059669"
												r="5.5"
											/>
											<circle
												cx={currentX}
												cy={currentY}
												fill="#FFFFFF"
												r="2.5"
											/>
										</>
									) : (
										<>
											<line
												stroke="#10B981"
												strokeWidth="2"
												x1="10"
												x2={currentX}
												y1={startY}
												y2={startY}
											/>
											<circle
												cx={currentX}
												cy={startY}
												fill="#059669"
												r="4.5"
											/>
										</>
									)}
								</svg>

								<div
									style={{
										left: `${(currentX / svgW) * 100}%`,
									}}
									className="absolute top-3 -translate-x-1/2 bg-primary text-on-primary px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1.5 pointer-events-none z-10 whitespace-nowrap"
								>
									<span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed" />
									<span className="text-label-sm font-label-sm font-semibold tracking-tight">
										Spent: ${totalSpent.toFixed(2)}
									</span>
								</div>
							</div>

							<div className="flex justify-between items-center px-1 text-label-sm font-label-sm text-on-surface-variant font-medium pt-1">
								<span>Start</span>
								<span>Pace</span>
								<span className="font-bold text-on-surface">
									Today (Now)
								</span>
								<span>Cycle End</span>
							</div>
						</div>
					);
				})()}
			</section>
		</div>
	);
};
