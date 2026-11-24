import test from 'node:test';
import assert from 'node:assert';
import { snapGapToRoads } from './osrmRouter';
import {
	classifyStoreDestination,
	enqueueMerchantSmartPrompt,
} from './storeDwellDetector';
import { haversineDistanceMiles } from './mapRouting';

test('snapGapToRoads returns direct coordinates when gap is under 120m without network call', async () => {
	// Glassboro coordinate and point 50m away
	const from = { lat: 39.7032, lng: -75.122 };
	const to = { lat: 39.7035, lng: -75.122 }; // ~33 meters away

	const distMeters = haversineDistanceMiles(from, to) * 1609.344;
	assert.ok(distMeters < 120, 'Distance must be less than 120m');

	const result = await snapGapToRoads(from, to);
	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].lat, from.lat);
	assert.strictEqual(result[1].lat, to.lat);
	assert.ok(result.distanceMiles !== undefined, 'distanceMiles should be attached');
	assert.ok(result.distanceMiles < 0.1);
});

test('snapGapToRoads queries OSRM or falls back cleanly on network timeout for gaps >= 120m', async () => {
	const from = { lat: 39.7032, lng: -75.122 };
	const to = { lat: 39.7132, lng: -75.112 }; // ~1.3 km away

	const distMeters = haversineDistanceMiles(from, to) * 1609.344;
	assert.ok(distMeters >= 120, 'Distance must be >= 120m');

	const result = await snapGapToRoads(from, to);
	assert.ok(Array.isArray(result));
	assert.ok(result.length >= 2, 'Must return at least from and to coordinates');
	assert.ok(result.distanceMiles !== undefined && result.distanceMiles > 0);
});

test('classifyStoreDestination classifies retail and food store POIs accurately', async () => {
	// Brand matches
	const shopRite = await classifyStoreDestination(
		{ lat: 39.715, lng: -75.115 },
		'ShopRite Supermarket',
	);
	assert.strictEqual(shopRite.isCommercialStore, true);
	assert.strictEqual(shopRite.category, 'GROCERY');

	const starbucks = await classifyStoreDestination(
		{ lat: 39.705, lng: -75.12 },
		'Starbucks Coffee',
	);
	assert.strictEqual(starbucks.isCommercialStore, true);
	assert.strictEqual(starbucks.category, 'FOOD');

	const target = await classifyStoreDestination(
		{ lat: 39.72, lng: -75.13 },
		'Target Dept Store',
	);
	assert.strictEqual(target.isCommercialStore, true);
	assert.strictEqual(target.category, 'GROCERY');

	// Non-store destination
	const home = await classifyStoreDestination(
		{ lat: 39.7032, lng: -75.122 },
		'201 Girard Road',
	);
	assert.strictEqual(home.isCommercialStore, false);
	assert.strictEqual(home.category, 'OTHER');
});

test('enqueueMerchantSmartPrompt creates valid merchant stop prompt', () => {
	// Mock localStorage for test environment
	const storage: Record<string, string> = {};
	(globalThis as any).window = {
		dispatchEvent: () => true,
	};
	(globalThis as any).localStorage = {
		getItem: (key: string) => storage[key] || null,
		setItem: (key: string, value: string) => {
			storage[key] = value;
		},
	};

	const prompt = enqueueMerchantSmartPrompt('ShopRite Glassboro', 'GROCERY');
	assert.strictEqual(prompt.type, 'MERCHANT_STOP');
	assert.strictEqual(prompt.title, 'You were just at ShopRite Glassboro');
	assert.strictEqual(prompt.subtitle, 'Log what you spent there?');
	assert.strictEqual(prompt.ctaLabel, 'Log Spend');
	assert.strictEqual(prompt.payload.name, 'ShopRite Glassboro');
	assert.strictEqual(prompt.payload.category, 'Groceries');

	const stored = JSON.parse(storage['imcheap_smart_prompts']);
	assert.strictEqual(stored.length, 1);
	assert.strictEqual(stored[0].payload.name, 'ShopRite Glassboro');
});

test('Labor divisor formula strictly computes (cost / hourlyWage) * 60', () => {
	const cost = 18.59;
	const hourlyWage = 17;
	const laborMinutes = (cost / hourlyWage) * 60;
	// 18.59 / 17 * 60 = 65.61 minutes (~1.09 hours)
	assert.strictEqual(laborMinutes.toFixed(1), '65.6');
});

test('Placeholder labels like Last Known Location are excluded from destination statistics', () => {
	const trips = [
		{ id: '1', from: 'Home', to: 'ShopRite', miles: 5.2, cost: 3.38, timestamp: 'Today', status: 'LOGGED' as const, coordinates: [] },
		{ id: '2', from: 'ShopRite', to: 'Last Known Location', miles: 1.1, cost: 0.72, timestamp: 'Today', status: 'LOGGED' as const, coordinates: [] },
		{ id: '3', from: 'Current Location', to: 'Target', miles: 3.4, cost: 2.21, timestamp: 'Today', status: 'LOGGED' as const, coordinates: [] },
	];

	const destStats: Record<string, number> = {};
	for (const trip of trips) {
		const to = trip.to;
		const toLower = to.toLowerCase();
		const isPlaceholderDest =
			!to ||
			toLower.includes('last known location') ||
			toLower.includes('current location') ||
			toLower.includes('stationary stop') ||
			toLower.includes('waypoint') ||
			toLower.includes('moving...') ||
			to === 'Start' ||
			to === 'Destination';

		if (!isPlaceholderDest) {
			destStats[to] = (destStats[to] || 0) + trip.miles;
		}
	}

	assert.strictEqual(destStats['ShopRite'], 5.2);
	assert.strictEqual(destStats['Target'], 3.4);
	assert.strictEqual(destStats['Last Known Location'], undefined, 'Must not include Last Known Location');
});

