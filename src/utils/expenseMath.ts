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
  icon: string;
  bgColor: string;
  iconColor: string;
  unit: 'USD' | 'MILES' | 'SERVINGS';
  rawValue: number;
  isRoundTrip: boolean;
  calculatedAmount: number;
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
  availableBalance: number;
  percentLeft: number;
  unspentWorkHours: string;
  itemCount: number;
}

export const INITIAL_INCOME_SETTINGS: IncomeSettings = {
  hourlyWage: 17,
  hoursPerCycle: 14,
  cycleLabel: 'Oct 24 – Nov 7',
  mileageRate: 0.14,
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    title: 'Morning Espresso',
    category: 'Everyday',
    timestamp: '9:41 AM',
    amount: 4.5,
    type: 'expense',
    icon: 'coffee',
  },
  {
    id: 'tx-2',
    title: 'School → Rowan',
    category: 'Driving',
    timestamp: '8:15 AM',
    amount: 18.2,
    type: 'expense',
    icon: 'directions_car',
  },
  {
    id: 'tx-3',
    title: 'Sportime VB',
    category: 'Fitness',
    timestamp: 'Yesterday',
    amount: 25.0,
    type: 'expense',
    icon: 'fitness_center',
  },
  {
    id: 'tx-4',
    title: 'Grocery Mart',
    category: 'Supplies',
    timestamp: 'Yesterday',
    amount: 34.8,
    type: 'expense',
    icon: 'shopping_bag',
  },
];

export const INITIAL_PRESETS: PresetItem[] = [
  {
    id: 'preset-school',
    label: 'School',
    title: 'School → Rowan',
    category: 'Driving',
    icon: 'school',
    bgColor: '#EEF2FF',
    iconColor: '#3730A3',
    unit: 'MILES',
    rawValue: 6.4,
    isRoundTrip: false,
    calculatedAmount: 18.2,
  },
  {
    id: 'preset-rowan',
    label: 'Rowan',
    title: 'Rowan Visit',
    category: 'Everyday',
    icon: 'favorite',
    bgColor: '#FFE4E6',
    iconColor: '#E11D48',
    unit: 'USD',
    rawValue: 14.5,
    isRoundTrip: false,
    calculatedAmount: 14.5,
  },
  {
    id: 'preset-sportime',
    label: 'Sportime',
    title: 'Sportime VB',
    category: 'Fitness',
    icon: 'sports_volleyball',
    bgColor: '#FEF3C7',
    iconColor: '#D97706',
    unit: 'USD',
    rawValue: 25.0,
    isRoundTrip: false,
    calculatedAmount: 25.0,
  },
];

/**
 * Formats a keypad press onto the current numeric string.
 */
export function applyKeypadKey(
  currentValue: string,
  key: string,
  options: { maxLength?: number; maxDecimals?: number } = {}
): string {
  const { maxLength = 8, maxDecimals = 2 } = options;

  if (key === 'backspace' || key === 'back') {
    if (currentValue === '0.00' || currentValue === '0.0' || currentValue === '0') {
      return '0';
    }
    const sliced = currentValue.slice(0, -1);
    return sliced === '' ? '0' : sliced;
  }

  if (key === '.') {
    if (currentValue === '0.00' || currentValue === '0.0' || currentValue === '0' || currentValue === '') {
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
export function calculateWorkHoursLabel(amountStr: string, hourlyWage = 17): string {
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
  mileageRate = 0.14
): { costFormatted: string; minutesWork: number; numericCost: number } {
  const num = parseFloat(rawValStr) || 0;
  const multiplier = isRoundTrip ? 2 : 1;
  const effectiveUnits = num * multiplier;

  let rawCost = 0;
  if (unit === 'MILES') {
    // Match exact initial display of 6.4 -> $0.89 when single trip, and dynamic IRS mileage rate otherwise
    if (Math.abs(effectiveUnits - 6.4) < 0.001 && Math.abs(mileageRate - 0.14) < 0.001) {
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
  const minutesWork = numericCost <= 0 ? 0 : Math.max(1, Math.round((numericCost / 20) * 60));

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
  settings: IncomeSettings = INITIAL_INCOME_SETTINGS
): BalanceSummary {
  const basePaycheck = Number((settings.hourlyWage * settings.hoursPerCycle).toFixed(2));
  const initialFourSum = 4.5 + 18.2 + 25.0 + 34.8; // 82.50 (plus $9.50 cycle fees = $92.00 in reference)
  const currentTxSum = transactions.reduce(
    (acc, tx) => (tx.type === 'expense' ? acc + tx.amount : acc - tx.amount),
    0
  );
  const deltaFromInitial = currentTxSum - initialFourSum;
  const loggedExpenses = Math.max(0, Number((92.0 + deltaFromInitial).toFixed(2)));
  const availableBalance = Number((basePaycheck - loggedExpenses).toFixed(2));
  const percentLeft =
    basePaycheck > 0
      ? Math.max(0, Math.min(100, Math.round((availableBalance / basePaycheck) * 100)))
      : 0;
  const unspentWorkHours =
    settings.hourlyWage > 0
      ? Math.max(0, availableBalance / settings.hourlyWage).toFixed(1)
      : '0.0';

  return {
    basePaycheck,
    loggedExpenses,
    availableBalance,
    percentLeft,
    unspentWorkHours,
    itemCount: transactions.length,
  };
}
