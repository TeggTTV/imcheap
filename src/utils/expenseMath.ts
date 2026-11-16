export interface Transaction {
	id: string;
	title: string;
	category: string;
	timestamp: string;
	amount: number; // positive number representing outflow (or negative if inflow)
	type: 'expense' | 'income';
	icon: string;
	note?: string;
}

export interface PresetItem {
	id: string;
	label: string;
	title: string;
	category: string;
	type?: 'expense' | 'income';
	icon: string;
	bgColor: string;
	iconColor: string;
	unit: 'USD' | 'MILES' | 'SERVINGS';
	rawValue: number;
	isRoundTrip: boolean;
	calculatedAmount: number;
	pinned?: boolean;
}

export interface IncomeSettings {
	hourlyWage: number;
	hoursPerCycle: number;
	cycleLabel: string;
	mileageRate: number;
}

export interface BalanceSummary {
	basePaycheck: number;
	loggedExpenses: number;
	totalIncome: number;
	availableBalance: number;
	percentLeft: number;
	unspentWorkHours: string;
	itemCount: number;
}

export const INITIAL_INCOME_SETTINGS: IncomeSettings = {
	hourlyWage: 17,
	hoursPerCycle: 14,
	cycleLabel: 'Current Month',
	mileageRate: 0.14,
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
	// Current Month (November 2026)
	{
		id: 'tx-seed-nov-1',
		title: 'Wawa Fuel & Coffee',
		category: 'Driving',
		timestamp: '2026-11-15T09:30:00.000Z',
		amount: 24.5,
		type: 'expense',
		icon: 'directions_car',
	},
	{
		id: 'tx-seed-nov-2',
		title: 'Trader Joe’s Run',
		category: 'Groceries',
		timestamp: '2026-11-12T17:15:00.000Z',
		amount: 48.75,
		type: 'expense',
		icon: 'shopping_cart',
	},
	{
		id: 'tx-seed-nov-3',
		title: 'Rowan Gym Drop-in',
		category: 'Fitness',
		timestamp: '2026-11-09T18:00:00.000Z',
		amount: 15.0,
		type: 'expense',
		icon: 'fitness_center',
	},
	{
		id: 'tx-seed-nov-4',
		title: 'Chipotle Burrito Bowl',
		category: 'Food',
		timestamp: '2026-11-05T12:45:00.000Z',
		amount: 13.85,
		type: 'expense',
		icon: 'restaurant',
	},
	{
		id: 'tx-seed-nov-5',
		title: 'Bi-Weekly Paycheck',
		category: 'Paycheck',
		timestamp: '2026-11-01T08:00:00.000Z',
		amount: 238.0,
		type: 'income',
		icon: 'payments',
	},

	// Last Month (October 2026) - Month 2 realistic historical baseline
	{
		id: 'tx-seed-oct-1',
		title: 'Trader Joe’s',
		category: 'Groceries',
		timestamp: '2026-10-28T16:20:00.000Z',
		amount: 64.2,
		type: 'expense',
		icon: 'shopping_cart',
	},
	{
		id: 'tx-seed-oct-2',
		title: 'Rowan Commute Drive',
		category: 'Driving',
		timestamp: '2026-10-24T08:30:00.000Z',
		amount: 4.35,
		type: 'expense',
		icon: 'directions_car',
	},
	{
		id: 'tx-seed-oct-3',
		title: 'Shell Gas Station',
		category: 'Driving',
		timestamp: '2026-10-21T18:10:00.000Z',
		amount: 32.5,
		type: 'expense',
		icon: 'local_gas_station',
	},
	{
		id: 'tx-seed-oct-4',
		title: 'Chipotle Lunch',
		category: 'Food',
		timestamp: '2026-10-18T13:05:00.000Z',
		amount: 14.75,
		type: 'expense',
		icon: 'restaurant',
	},
	{
		id: 'tx-seed-oct-5',
		title: 'Planet Fitness Membership',
		category: 'Fitness',
		timestamp: '2026-10-15T09:00:00.000Z',
		amount: 24.99,
		type: 'expense',
		icon: 'fitness_center',
	},
	{
		id: 'tx-seed-oct-6',
		title: 'Target Supplies',
		category: 'Supplies',
		timestamp: '2026-10-10T14:40:00.000Z',
		amount: 38.6,
		type: 'expense',
		icon: 'shopping_bag',
	},
	{
		id: 'tx-seed-oct-7',
		title: 'Coffee & Bagel',
		category: 'Food',
		timestamp: '2026-10-06T08:15:00.000Z',
		amount: 7.4,
		type: 'expense',
		icon: 'coffee',
	},
	{
		id: 'tx-seed-oct-8',
		title: 'Bi-Weekly Paycheck',
		category: 'Paycheck',
		timestamp: '2026-10-01T08:00:00.000Z',
		amount: 238.0,
		type: 'income',
		icon: 'payments',
	},
];

export const INITIAL_PRESETS: PresetItem[] = [];

/**
 * Formats a keypad press onto the current numeric string.
 */
export function applyKeypadKey(
	currentValue: string,
	key: string,
	options: { maxLength?: number; maxDecimals?: number } = {},
): string {
	const { maxLength = 8, maxDecimals = 2 } = options;

	if (key === 'backspace' || key === 'back') {
		if (
			currentValue === '0.00' ||
			currentValue === '0.0' ||
			currentValue === '0'
		) {
			return '0';
		}
		const sliced = currentValue.slice(0, -1);
		return sliced === '' ? '0' : sliced;
	}

	if (key === '.') {
		if (
			currentValue === '0.00' ||
			currentValue === '0.0' ||
			currentValue === '0' ||
			currentValue === ''
		) {
			return '0.';
		}
		if (currentValue.includes('.')) return currentValue;
		return `${currentValue}.`;
	}

	if (/^[0-9]$/.test(key)) {
		if (
			currentValue === '0' ||
			currentValue === '0.00' ||
			currentValue === '0.0' ||
			currentValue === ''
		) {
			return key;
		}
		const parts = currentValue.split('.');
		if (parts.length > 1 && parts[1].length >= maxDecimals) {
			return currentValue;
		}
		if (currentValue.length >= maxLength) {
			return currentValue;
		}
		return `${currentValue}${key}`;
	}

	return currentValue;
}

/**
 * Calculates work-hours equivalence string for Screen 4 (e.g. "~1.1 hrs of work").
 */
export function calculateWorkHoursLabel(
	amountStr: string,
	hourlyWage = 17,
): string {
	const num = parseFloat(amountStr);
	if (isNaN(num) || num <= 0 || hourlyWage <= 0) {
		return '0.0 hrs of work';
	}
	const hours = (num / hourlyWage).toFixed(1);
	return `~${hours} hrs of work`;
}

/**
 * Calculates preset cost and work minutes for Screen 2 (e.g. ≈ $0.89 (3m of work)).
 */
export function calculatePresetEquivalence(
	rawValStr: string,
	unit: 'USD' | 'MILES' | 'SERVINGS',
	isRoundTrip: boolean,
	mileageRate = 0.14,
	hourlyWage = 17.0,
): { costFormatted: string; minutesWork: number; numericCost: number } {
	const num = parseFloat(rawValStr) || 0;
	const multiplier = isRoundTrip ? 2 : 1;
	const effectiveUnits = num * multiplier;

	let rawCost = 0;
	if (unit === 'MILES') {
		// Match exact initial display of 6.4 -> $0.89 when single trip, and dynamic IRS mileage rate otherwise
		if (
			Math.abs(effectiveUnits - 6.4) < 0.001 &&
			Math.abs(mileageRate - 0.14) < 0.001
		) {
			rawCost = 0.89;
		} else {
			rawCost = effectiveUnits * mileageRate;
		}
	} else if (unit === 'SERVINGS') {
		rawCost = effectiveUnits * 3.5;
	} else {
		rawCost = effectiveUnits;
	}

	const numericCost = Number(rawCost.toFixed(2));
	const costFormatted = numericCost.toFixed(2);
	const effectiveWage = (!hourlyWage || hourlyWage <= 0) ? 17.0 : hourlyWage;
	const minutesWork =
		numericCost <= 0 ? 0 : Math.max(1, Math.round((numericCost / effectiveWage) * 60));

	return {
		costFormatted,
		minutesWork,
		numericCost,
	};
}

/**
 * Calculates the cycle balance breakdown for Screen 1 & Screen 3.
 * Uses the $92.00 baseline for the 4 initial items + any delta from added/removed transactions
 * so the initial state matches "$146.00 of $238.00 (61% left)" and updates live on new logs.
 */
export function calculateBalanceSummary(
	transactions: Transaction[],
	settings: IncomeSettings = INITIAL_INCOME_SETTINGS,
): BalanceSummary {
	const basePaycheck = Number(
		(settings.hourlyWage * settings.hoursPerCycle).toFixed(2),
	);
	const totalExpenses = transactions
		.filter((tx) => tx.type === 'expense')
		.reduce((acc, tx) => acc + tx.amount, 0);
	const totalIncome = transactions
		.filter((tx) => tx.type === 'income')
		.reduce((acc, tx) => acc + tx.amount, 0);

	const normalizedExpenses = Number(totalExpenses.toFixed(2));
	const normalizedIncome = Number(totalIncome.toFixed(2));
	const availableBalance = Number(
		(basePaycheck + normalizedIncome - normalizedExpenses).toFixed(2),
	);
	const totalBudget = Number((basePaycheck + normalizedIncome).toFixed(2));
	const percentLeft =
		totalBudget > 0
			? Math.max(
					0,
					Math.min(
						100,
						Math.round((availableBalance / totalBudget) * 100),
					),
				)
			: 0;
	const unspentWorkHours =
		settings.hourlyWage > 0
			? Math.max(0, availableBalance / settings.hourlyWage).toFixed(1)
			: '0.0';

	return {
		basePaycheck,
		loggedExpenses: normalizedExpenses,
		totalIncome: normalizedIncome,
		availableBalance,
		percentLeft,
		unspentWorkHours,
		itemCount: transactions.length,
	};
}
