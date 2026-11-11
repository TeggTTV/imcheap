import {
	format,
	isToday,
	isYesterday,
	isThisYear,
	parseISO,
	isValid,
} from 'date-fns';

/**
 * Returns a current real ISO 8601 timestamp string (e.g. 2026-11-11T01:38:00.000Z).
 */
export function createTimestamp(date: Date = new Date()): string {
	return date.toISOString();
}

/**
 * Parses a timestamp value into a valid Date object.
 * Gracefully handles ISO strings, standard date strings, legacy mocks, and invalid inputs.
 */
export function parseTransactionDate(rawTimestamp: string | undefined | null): Date {
	if (!rawTimestamp || typeof rawTimestamp !== 'string') {
		return new Date();
	}

	const trimmed = rawTimestamp.trim();

	// Check if already an ISO date or standard parseable string
	const isoParsed = parseISO(trimmed);
	if (isValid(isoParsed)) {
		return isoParsed;
	}

	const nativeParsed = new Date(trimmed);
	if (isValid(nativeParsed)) {
		return nativeParsed;
	}

	// Legacy relative strings fallback (e.g. "9:41 AM", "Yesterday", "Just now")
	const lower = trimmed.toLowerCase();
	const now = new Date();

	if (lower.includes('yesterday')) {
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		return yesterday;
	}

	// If time like "9:41 AM"
	const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i);
	if (timeMatch) {
		let hours = parseInt(timeMatch[1], 10);
		const minutes = parseInt(timeMatch[2], 10);
		const meridiem = timeMatch[3]?.toLowerCase();

		if (meridiem === 'pm' && hours < 12) hours += 12;
		if (meridiem === 'am' && hours === 12) hours = 0;

		const dateWithTime = new Date(now);
		dateWithTime.setHours(hours, minutes, 0, 0);
		return dateWithTime;
	}

	return now;
}

/**
 * Consistently formats a transaction's timestamp for UI presentation:
 * - "Today, 9:41 AM" (or "9:41 AM" if today)
 * - "Yesterday, 8:15 AM" (or "Yesterday")
 * - "Nov 9, 3:30 PM" (current year)
 * - "Nov 9, 2025, 3:30 PM" (prior years)
 */
export function formatTransactionTimestamp(
	rawTimestamp: string | undefined | null,
	options: { includeTime?: boolean } = { includeTime: true }
): string {
	if (!rawTimestamp) {
		return 'Just now';
	}

	const parsed = parseTransactionDate(rawTimestamp);
	if (!isValid(parsed)) {
		return rawTimestamp;
	}

	const timeStr = format(parsed, 'h:mm a');

	if (isToday(parsed)) {
		return options.includeTime ? `Today, ${timeStr}` : 'Today';
	}

	if (isYesterday(parsed)) {
		return options.includeTime ? `Yesterday, ${timeStr}` : 'Yesterday';
	}

	if (isThisYear(parsed)) {
		return options.includeTime
			? `${format(parsed, 'MMM d')}, ${timeStr}`
			: format(parsed, 'MMM d');
	}

	return options.includeTime
		? `${format(parsed, 'MMM d, yyyy')}, ${timeStr}`
		: format(parsed, 'MMM d, yyyy');
}

