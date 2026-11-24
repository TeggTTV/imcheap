import { Coordinate, SmartPrompt } from '../types/maps';
import { getSavedLocations } from './savedLocations';

export interface StoreClassificationResult {
	isCommercialStore: boolean;
	storeName: string;
	category: 'RETAIL' | 'GROCERY' | 'FOOD' | 'OTHER';
}

const STORE_CATEGORY_KEYWORDS = [
	'shop',
	'supermarket',
	'convenience',
	'department_store',
	'restaurant',
	'cafe',
	'fast_food',
	'pharmacy',
	'fuel',
	'mall',
];

/**
 * Classifies destination coordinates against presets/saved locations first,
 * then checks OpenStreetMap Nominatim reverse geocoding (format=jsonv2) for commercial store categories.
 */
export async function classifyStoreDestination(
	coord: Coordinate,
	fallbackName: string,
): Promise<StoreClassificationResult> {
	// 1. Check saved locations and known brand presets
	try {
		const saved = getSavedLocations();
		for (const loc of saved) {
			const dLat = Math.abs(loc.lat - coord.lat);
			const dLng = Math.abs(loc.lng - coord.lng);
			if (dLat < 0.0015 && dLng < 0.0015) {
				const lower = loc.name.toLowerCase();
				if (
					lower.includes('shoprite') ||
					lower.includes('market') ||
					lower.includes('grocery') ||
					lower.includes('aldi') ||
					lower.includes('trader') ||
					lower.includes('walmart') ||
					lower.includes('target') ||
					lower.includes('costco')
				) {
					return {
						isCommercialStore: true,
						storeName: loc.name,
						category: 'GROCERY',
					};
				}
				if (
					lower.includes('starbucks') ||
					lower.includes('dunkin') ||
					lower.includes('wawa') ||
					lower.includes('cafe') ||
					lower.includes('coffee') ||
					lower.includes('chipotle') ||
					lower.includes('restaurant') ||
					lower.includes('deli') ||
					lower.includes('bakery')
				) {
					return {
						isCommercialStore: true,
						storeName: loc.name,
						category: 'FOOD',
					};
				}
				if (
					lower.includes('pharmacy') ||
					lower.includes('cvs') ||
					lower.includes('walgreens') ||
					lower.includes('mall') ||
					lower.includes('outlet')
				) {
					return {
						isCommercialStore: true,
						storeName: loc.name,
						category: 'RETAIL',
					};
				}
			}
		}
	} catch (e) {
		console.warn('Error evaluating saved locations for store match', e);
	}

	// Also check fallbackName for immediate brand match
	const nameLower = fallbackName.toLowerCase();
	if (
		nameLower.includes('shoprite') ||
		nameLower.includes('market') ||
		nameLower.includes('grocery') ||
		nameLower.includes('aldi') ||
		nameLower.includes('trader joe') ||
		nameLower.includes('walmart') ||
		nameLower.includes('target') ||
		nameLower.includes('costco')
	) {
		return {
			isCommercialStore: true,
			storeName: fallbackName,
			category: 'GROCERY',
		};
	}
	if (
		nameLower.includes('starbucks') ||
		nameLower.includes('dunkin') ||
		nameLower.includes('wawa') ||
		nameLower.includes('cafe') ||
		nameLower.includes('chipotle') ||
		nameLower.includes('restaurant') ||
		nameLower.includes('deli') ||
		nameLower.includes('food')
	) {
		return {
			isCommercialStore: true,
			storeName: fallbackName,
			category: 'FOOD',
		};
	}

	// 2. Query Nominatim reverse geocoding with format=jsonv2
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 3500);

	try {
		const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coord.lat}&lon=${coord.lng}`;
		const res = await fetch(url, {
			headers: { 'User-Agent': 'ImCheap-ExpenseTracker/1.0' },
			signal: controller.signal,
		});
		clearTimeout(timeoutId);

		if (res.ok) {
			const data = await res.json();
			const osmCategory = (data?.category || '').toLowerCase();
			const osmType = (data?.type || '').toLowerCase();
			const addresstype = (data?.addresstype || '').toLowerCase();

			const matchesCommercial = STORE_CATEGORY_KEYWORDS.some(
				(k) =>
					osmCategory === k ||
					osmType === k ||
					addresstype === k ||
					osmCategory.includes(k) ||
					osmType.includes(k),
			);

			if (matchesCommercial) {
				const resolvedName =
					data.name ||
					data.address?.shop ||
					data.address?.amenity ||
					data.address?.retail ||
					data.display_name?.split(',')[0]?.trim() ||
					fallbackName;

				let category: 'RETAIL' | 'GROCERY' | 'FOOD' = 'RETAIL';
				if (
					osmType.includes('supermarket') ||
					osmType.includes('grocery') ||
					osmType.includes('convenience') ||
					osmCategory.includes('supermarket')
				) {
					category = 'GROCERY';
				} else if (
					osmType.includes('restaurant') ||
					osmType.includes('cafe') ||
					osmType.includes('fast_food') ||
					osmCategory.includes('restaurant') ||
					osmCategory.includes('food')
				) {
					category = 'FOOD';
				}

				return {
					isCommercialStore: true,
					storeName: resolvedName,
					category,
				};
			}
		}
	} catch {
		clearTimeout(timeoutId);
	}

	return {
		isCommercialStore: false,
		storeName: fallbackName,
		category: 'OTHER',
	};
}

/**
 * Enqueues a merchant stop smart prompt in localStorage so the dashboard displays it upon return.
 */
export function enqueueMerchantSmartPrompt(
	storeName: string,
	category: 'RETAIL' | 'GROCERY' | 'FOOD',
): SmartPrompt {
	const prompt: SmartPrompt = {
		id: `prompt-merchant-${Date.now()}`,
		type: 'MERCHANT_STOP',
		title: `You were just at ${storeName}`,
		subtitle: 'Log what you spent there?',
		ctaLabel: 'Log Spend',
		payload: {
			name: storeName,
			category: category === 'FOOD' ? 'Dining & Coffee' : category === 'GROCERY' ? 'Groceries' : 'Shopping',
		},
	};

	if (typeof window !== 'undefined') {
		try {
			const stored = localStorage.getItem('imcheap_smart_prompts');
			const prompts: SmartPrompt[] = stored ? JSON.parse(stored) : [];
			const filtered = prompts.filter(
				(p) => !(p.type === 'MERCHANT_STOP' && p.payload.name === storeName),
			);
			localStorage.setItem(
				'imcheap_smart_prompts',
				JSON.stringify([prompt, ...filtered]),
			);
			window.dispatchEvent(new CustomEvent('imcheap_smart_prompts_updated'));
		} catch (e) {
			console.warn('Failed to write merchant smart prompt to localStorage', e);
		}
	}

	return prompt;
}
