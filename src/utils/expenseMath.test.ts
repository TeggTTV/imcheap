import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyKeypadKey,
  calculateWorkHoursLabel,
  calculatePresetEquivalence,
  calculateBalanceSummary,
  INITIAL_TRANSACTIONS,
  INITIAL_INCOME_SETTINGS,
} from './expenseMath';

test('applyKeypadKey handles digits, decimal point, and backspace accurately', () => {
  assert.equal(applyKeypadKey('0', '5'), '5');
  assert.equal(applyKeypadKey('0.00', '5'), '5');
  assert.equal(applyKeypadKey('0.00', '.'), '0.');
  assert.equal(applyKeypadKey('', '5'), '5');
  assert.equal(applyKeypadKey('18', '.'), '18.');
  assert.equal(applyKeypadKey('18.', '.'), '18.');
  assert.equal(applyKeypadKey('18.5', '9'), '18.59');
  // Rejects 3rd decimal place
  assert.equal(applyKeypadKey('18.59', '3'), '18.59');
  assert.equal(applyKeypadKey('18.59', 'backspace'), '18.5');
  assert.equal(applyKeypadKey('5', 'back'), '0');
  assert.equal(applyKeypadKey('0.00', 'back'), '0');
});

test('calculateWorkHoursLabel matches Screen 4 reference math (~1.1 hrs of work for $18.59 @ $17/hr)', () => {
  assert.equal(calculateWorkHoursLabel('18.59', 17), '~1.1 hrs of work');
  assert.equal(calculateWorkHoursLabel('0', 17), '0.0 hrs of work');
  assert.equal(calculateWorkHoursLabel('34.00', 17), '~2.0 hrs of work');
});

test('calculatePresetEquivalence matches Screen 2 reference math for 6.4 miles and round trip toggle', () => {
  const singleTrip = calculatePresetEquivalence('6.4', 'MILES', false, 0.14, 20);
  assert.equal(singleTrip.costFormatted, '0.89');
  assert.equal(singleTrip.minutesWork, 3);

  const roundTrip = calculatePresetEquivalence('6.4', 'MILES', true, 0.14, 20);
  assert.equal(roundTrip.costFormatted, '1.79');
  assert.equal(roundTrip.minutesWork, 5);

  const wage25 = calculatePresetEquivalence('25.00', 'USD', false, 0.14, 25);
  assert.equal(wage25.costFormatted, '25.00');
  assert.equal(wage25.minutesWork, 60);
});

test('calculateBalanceSummary correctly reflects fresh state and updates when logging expense', () => {
  const initial = calculateBalanceSummary([], INITIAL_INCOME_SETTINGS);
  assert.equal(initial.basePaycheck, 238.0);
  assert.equal(initial.loggedExpenses, 0);
  assert.equal(initial.availableBalance, 238.0);
  assert.equal(initial.percentLeft, 100);
  assert.equal(initial.unspentWorkHours, '14.0');
  assert.equal(initial.itemCount, 0);

  const afterLog = calculateBalanceSummary(
    [
      {
        id: 'tx-5',
        title: 'Fitness Session',
        category: 'Fitness',
        timestamp: 'Just now',
        amount: 18.59,
        type: 'expense',
        icon: 'fitness_center',
      },
    ],
    INITIAL_INCOME_SETTINGS
  );
  assert.equal(afterLog.loggedExpenses, 18.59);
  assert.equal(afterLog.availableBalance, 219.41);
  assert.equal(afterLog.itemCount, 1);

  const afterIncome = calculateBalanceSummary(
    [
      {
        id: 'tx-inc-1',
        title: 'Side gig',
        category: 'Side Gig',
        timestamp: 'Just now',
        amount: 50.0,
        type: 'income',
        icon: 'payments',
      },
    ],
    INITIAL_INCOME_SETTINGS
  );
  assert.equal(afterIncome.totalIncome, 50.0);
  assert.equal(afterIncome.loggedExpenses, 0);
  assert.equal(afterIncome.availableBalance, 288.0); // 238 + 50 - 0 = 288
  assert.equal(afterIncome.itemCount, 1);
});
