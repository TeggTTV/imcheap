import React, { useMemo } from 'react';
import { RecordedTrip } from '../types/maps';
import { SubpageHeader } from './SubpageHeader';
import { Activity, Car, Clock, Compass, Fuel, Navigation, Store } from 'lucide-react';

export interface DrivingStatsViewProps {
	trips: RecordedTrip[];
	hourlyWage: number;
	mileageRate: number;
	onBack: () => void;
}

export const DrivingStatsView: React.FC<DrivingStatsViewProps> = ({
	trips,
	hourlyWage,
	mileageRate,
	onBack,
}) => {
	const validTrips = useMemo(() => {
		return trips.filter((t) => t.status !== 'IGNORED');
	}, [trips]);

	const stats = useMemo(() => {
		if (validTrips.length === 0) return null;

		let totalMiles = 0;
		let totalCost = 0;
		let totalMovingSeconds = 0;
		let movingMilesCounted = 0;

		const routeCounts: Record<string, { count: number; origin: string; dest: string }> = {};
		const destStats: Record<string, { miles: number; count: number }> = {};
		const hourBuckets: Record<string, number> = {
			'Morning (7–10 AM)': 0,
			'Midday (11 AM–2 PM)': 0,
			'Afternoon (3–6 PM)': 0,
			'Evening (7–10 PM)': 0,
			'Night (11 PM–6 AM)': 0,
		};

		let storeStopsCount = 0;

		for (const trip of validTrips) {
			const miles = trip.distanceMiles || trip.miles || 0;
			const cost = trip.costDollars ?? trip.cost ?? (miles * mileageRate);

			totalMiles += miles;
			totalCost += cost;

			// Route pair frequency
			const from = trip.from || trip.originName || 'Start';
			const to = trip.to || trip.destinationName || 'Destination';

			const toLower = to.toLowerCase();
			const fromLower = from.toLowerCase();
			const isPlaceholderDest =
				!to ||
				toLower.includes('last known location') ||
				toLower.includes('current location') ||
				toLower.includes('stationary stop') ||
				toLower.includes('waypoint') ||
				toLower.includes('moving...') ||
				to === 'Start' ||
				to === 'Destination';

			const isPlaceholderFrom =
				!from ||
				fromLower.includes('last known location') ||
				fromLower.includes('current location') ||
				fromLower.includes('moving...') ||
				from === 'Start';

			if (!isPlaceholderFrom && !isPlaceholderDest) {
				const routeKey = `${from} → ${to}`;
				if (!routeCounts[routeKey]) {
					routeCounts[routeKey] = { count: 0, origin: from, dest: to };
				}
				routeCounts[routeKey].count += 1;
			}

			// Destination stats - exclude placeholder labels like 'Last Known Location'
			if (!isPlaceholderDest) {
				if (!destStats[to]) {
					destStats[to] = { miles: 0, count: 0 };
				}
				destStats[to].miles += miles;
				destStats[to].count += 1;
			}

			// Store stops detection
			const isRetail =
				trip.destinationCategory === 'RETAIL' ||
				trip.destinationCategory === 'GROCERY' ||
				trip.destinationCategory === 'FOOD';
			const isStoreNamed =
				toLower.includes('shoprite') ||
				toLower.includes('target') ||
				toLower.includes('walmart') ||
				toLower.includes('aldi') ||
				toLower.includes('wawa') ||
				toLower.includes('starbucks') ||
				toLower.includes('market') ||
				toLower.includes('cafe') ||
				toLower.includes('food');

			if (isRetail || isStoreNamed) {
				storeStopsCount += 1;
			}

			// Peak driving window calculation
			let tripHour = 14;
			if (trip.startedAt) {
				const match = trip.startedAt.match(/(\d+):(\d+)\s*(AM|PM)?/i);
				if (match) {
					let hour = parseInt(match[1], 10);
					const meridiem = (match[3] || '').toUpperCase();
					if (meridiem === 'PM' && hour < 12) hour += 12;
					if (meridiem === 'AM' && hour === 12) hour = 0;
					tripHour = hour;
				}
			} else if (trip.timestamp) {
				const parsedDate = new Date(trip.timestamp);
				if (!isNaN(parsedDate.getTime())) {
					tripHour = parsedDate.getHours();
				}
			}

			if (tripHour >= 7 && tripHour <= 10) {
				hourBuckets['Morning (7–10 AM)'] += 1;
			} else if (tripHour >= 11 && tripHour <= 14) {
				hourBuckets['Midday (11 AM–2 PM)'] += 1;
			} else if (tripHour >= 15 && tripHour <= 18) {
				hourBuckets['Afternoon (3–6 PM)'] += 1;
			} else if (tripHour >= 19 && tripHour <= 22) {
				hourBuckets['Evening (7–10 PM)'] += 1;
			} else {
				hourBuckets['Night (11 PM–6 AM)'] += 1;
			}

			// Moving speed computation
			if (trip.path && trip.path.length >= 2) {
				const startT = trip.path[0].timestamp;
				const endT = trip.path[trip.path.length - 1].timestamp;
				const deltaSec = (endT - startT) / 1000;
				if (deltaSec >= 30 && deltaSec <= 14400) {
					totalMovingSeconds += deltaSec;
					movingMilesCounted += miles;
				}
			}
		}

		// Calculate labor time using mandatory wage formula: (cost / hourlyWage) * 60
		const wage = hourlyWage > 0 ? hourlyWage : 20;
		const totalLaborMinutes = (totalCost / wage) * 60;
		const laborLabel =
			totalLaborMinutes >= 60
				? `${(totalLaborMinutes / 60).toFixed(1)}h labor`
				: `${Math.round(totalLaborMinutes)}m labor`;

		const avgTripDistance = totalMiles / validTrips.length;

		// Average speed
		let avgSpeed = 28;
		if (movingMilesCounted > 0 && totalMovingSeconds > 60) {
			const hours = totalMovingSeconds / 3600;
			avgSpeed = Math.round(movingMilesCounted / hours);
		} else {
			// Estimate based on standard 2.2 min/mile pace
			avgSpeed = 29;
		}

		// Most frequent route
		let topRouteKey = '';
		let topRouteCount = 0;
		for (const [key, data] of Object.entries(routeCounts)) {
			if (data.count > topRouteCount) {
				topRouteCount = data.count;
				topRouteKey = key;
			}
		}
		const mostFrequentRouteStr = topRouteKey
			? `${topRouteKey} (${topRouteCount}x)`
			: 'None recorded';

		// Peak driving window
		let topWindow = 'Morning (7–10 AM)';
		let maxWindowCount = -1;
		for (const [windowName, count] of Object.entries(hourBuckets)) {
			if (count > maxWindowCount) {
				maxWindowCount = count;
				topWindow = windowName;
			}
		}

		// Destination ranking sorted by miles descending
		const rankedDestinations = Object.entries(destStats)
			.map(([destName, data]) => {
				const destCost = data.miles * mileageRate;
				const destLaborMins = (destCost / wage) * 60;
				return {
					name: destName,
					miles: data.miles,
					count: data.count,
					laborMinutes: destLaborMins,
				};
			})
			.sort((a, b) => b.miles - a.miles)
			.slice(0, 4);

		const maxDestMiles = rankedDestinations[0]?.miles || 1;

		return {
			totalTrips: validTrips.length,
			totalMiles: totalMiles.toFixed(1),
			avgTripDistance: avgTripDistance.toFixed(1),
			totalFuelCost: totalCost.toFixed(2),
			laborLabel,
			avgSpeed,
			topWindow,
			mostFrequentRouteStr,
			storeStopsCount,
			rankedDestinations,
			maxDestMiles,
		};
	}, [validTrips, mileageRate, hourlyWage]);

	return (
		<div className="flex flex-col w-full min-h-dvh bg-surface px-margin pt-3 pb-28 max-w-120 mx-auto">
			{/* Top Bar with Back Button */}
			<SubpageHeader title="Driving Stats" backLabel="Maps" onBack={onBack} />

			{!stats ? (
				/* Empty State */
				<div className="bg-white rounded-2xl border border-neutral-200/60 p-6 text-center mt-2 shadow-xs">
					<div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-500 mx-auto flex items-center justify-center mb-3">
						<Car size={20} />
					</div>
					<h3 className="text-[15px] font-bold text-[#111111] mb-1">
						No Trips Recorded
					</h3>
					<p className="text-[13px] text-neutral-500 leading-relaxed font-normal">
						No trips recorded yet. Enable trip tracking in Vehicle Settings or simulate a drive to generate habit metrics.
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-3.5 mt-1">
					{/* Card 1: Cumulative Transit Drain (2-Column Metric Grid) */}
					<div className="bg-white rounded-2xl border border-neutral-200/60 p-4 shadow-xs">
						<span className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase">
							Cumulative Transit Drain
						</span>
						<div className="grid grid-cols-2 gap-4 mt-3 pt-1 border-t border-neutral-100">
							{/* Left Column: Miles */}
							<div className="flex flex-col">
								<span className="text-[24px] font-extrabold text-[#111111] tracking-tight leading-none tabular-nums">
									{stats.totalMiles}
									<span className="text-[13px] font-medium text-neutral-400 ml-1">
										mi
									</span>
								</span>
								<span className="text-[11.5px] text-neutral-500 font-medium mt-1.5 tabular-nums">
									{stats.avgTripDistance} mi/trip avg
								</span>
							</div>

							{/* Right Column: Fuel & Labor Cost */}
							<div className="flex flex-col items-end">
								<span className="text-[24px] font-extrabold text-[#111111] tracking-tight leading-none tabular-nums">
									${stats.totalFuelCost}
								</span>
								<div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-bold tabular-nums">
									{stats.laborLabel}
								</div>
							</div>
						</div>
					</div>

					{/* Card 2: Driver Habit Profile (4-Row Grouped Spec Card) */}
					<div className="bg-white rounded-2xl border border-neutral-200/60 p-4 shadow-xs">
						<span className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase mb-1 block">
							Driver Habit Profile
						</span>
						<div className="divide-y divide-neutral-100 mt-2">
							{/* Row 1: Average Speed */}
							<div className="py-2.5 flex items-center justify-between text-[13.5px]">
								<div className="flex items-center gap-2 text-neutral-600">
									<Activity size={16} className="text-neutral-400" />
									<span>Average Speed</span>
								</div>
								<span className="font-bold text-[#111111] tabular-nums">
									{stats.avgSpeed} mph
								</span>
							</div>

							{/* Row 2: Peak Driving Window */}
							<div className="py-2.5 flex items-center justify-between text-[13.5px]">
								<div className="flex items-center gap-2 text-neutral-600">
									<Clock size={16} className="text-neutral-400" />
									<span>Peak Driving Window</span>
								</div>
								<span className="font-bold text-[#111111]">
									{stats.topWindow}
								</span>
							</div>

							{/* Row 3: Most Frequent Route */}
							<div className="py-2.5 flex items-center justify-between text-[13.5px] gap-2">
								<div className="flex items-center gap-2 text-neutral-600 shrink-0">
									<Navigation size={16} className="text-neutral-400" />
									<span>Most Frequent Route</span>
								</div>
								<span className="font-bold text-[#111111] text-right truncate max-w-[55%]">
									{stats.mostFrequentRouteStr}
								</span>
							</div>

							{/* Row 4: Store Stops Detected */}
							<div className="py-2.5 flex items-center justify-between text-[13.5px]">
								<div className="flex items-center gap-2 text-neutral-600">
									<Store size={16} className="text-neutral-400" />
									<span>Store Stops Detected</span>
								</div>
								<span className="font-bold text-[#111111] tabular-nums">
									{stats.storeStopsCount} {stats.storeStopsCount === 1 ? 'stop' : 'stops'}
								</span>
							</div>
						</div>
					</div>

					{/* Card 3: Recent Route Efficiency / Distance Distribution */}
					<div className="bg-white rounded-2xl border border-neutral-200/60 p-4 shadow-xs">
						<span className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase mb-1 block">
							Top Destinations & Labor Drain
						</span>
						<div className="flex flex-col gap-3 mt-3">
							{stats.rankedDestinations.map((dest) => {
								const fillPercent = Math.min(
									100,
									Math.max(12, Math.round((dest.miles / stats.maxDestMiles) * 100)),
								);
								const laborText =
									dest.laborMinutes >= 60
										? `${(dest.laborMinutes / 60).toFixed(1)}h`
										: `${Math.round(dest.laborMinutes)}m`;

								return (
									<div key={dest.name} className="flex flex-col gap-1.5">
										<div className="flex items-center justify-between text-[12.5px]">
											<span className="font-bold text-[#111111] truncate max-w-[60%]">
												{dest.name}
											</span>
											<div className="flex items-center gap-2 shrink-0 tabular-nums text-neutral-500 font-medium">
												<span>{dest.miles.toFixed(1)} mi</span>
												<span className="text-neutral-300">•</span>
												<span className="text-[#059669] font-bold">
													{laborText} labor
												</span>
											</div>
										</div>
										<div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
											<div
												className="h-1.5 rounded-full bg-[#111111]"
												style={{ width: `${fillPercent}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
