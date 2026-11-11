import test from 'node:test';
import assert from 'node:assert/strict';
import {
	createTimestamp,
	parseTransactionDate,
	formatTransactionTimestamp,
} from './dateUtils';

test('createTimestamp generates valid ISO string', () => {
	const ts = createTimestamp();
	assert.ok(!isNaN(Date.parse(ts)));
	assert.match(ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

test('parseTransactionDate parses ISO timestamps correctly', () => {
	const fixedDate = new Date('2026-05-15T14:30:00.000Z');
	const parsed = parseTransactionDate(fixedDate.toISOString());
	assert.equal(parsed.getTime(), fixedDate.getTime());
});

test('parseTransactionDate handles legacy time strings and "Yesterday"', () => {
	const legacyTime = parseTransactionDate('9:41 AM');
	assert.equal(legacyTime.getHours(), 9);
	assert.equal(legacyTime.getMinutes(), 41);

	const legacyPm = parseTransactionDate('1:15 PM');
	assert.equal(legacyPm.getHours(), 13);
	assert.equal(legacyPm.getMinutes(), 15);

	const legacyYesterday = parseTransactionDate('Yesterday');
	const now = new Date();
	const diffDays = Math.round((now.getTime() - legacyYesterday.getTime()) / (1000 * 60 * 60 * 24));
	assert.equal(diffDays, 1);
});

test('parseTransactionDate safely falls back on invalid values', () => {
	const fallback1 = parseTransactionDate(undefined);
	assert.ok(!isNaN(fallback1.getTime()));

	const fallback2 = parseTransactionDate('invalid-date-string-xyz');
	assert.ok(!isNaN(fallback2.getTime()));
});

test('formatTransactionTimestamp formats today, yesterday, and past dates', () => {
	const now = new Date();
	const todayIso = now.toISOString();
	const formattedToday = formatTransactionTimestamp(todayIso);
	assert.match(formattedToday, /^Today, \d{1,2}:\d{2}\s+(?:AM|PM)$/);

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const formattedYesterday = formatTransactionTimestamp(yesterday.toISOString());
	assert.match(formattedYesterday, /^Yesterday, \d{1,2}:\d{2}\s+(?:AM|PM)$/);

	const olderDate = new Date('2024-01-15T10:00:00.000Z');
	const formattedOlder = formatTransactionTimestamp(olderDate.toISOString());
	assert.match(formattedOlder, /^Jan 15, 2024/);
});

