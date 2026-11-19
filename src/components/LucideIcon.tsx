import React from 'react';
import * as LucideIcons from 'lucide-react';

// Common mapping from legacy Google Material Symbols to Lucide icon names
const LEGACY_MAP: Record<string, keyof typeof LucideIcons> = {
	// Navigation & System
	home: 'Home',
	map: 'Map',
	pin_drop: 'MapPin',
	location_on: 'MapPin',
	my_location: 'LocateFixed',
	gps_fixed: 'Crosshair',
	navigation: 'Navigation',
	directions_car: 'Car',
	local_gas_station: 'Fuel',
	speed: 'Gauge',
	layers: 'Layers',
	settings: 'Sliders',
	tune: 'SlidersHorizontal',
	bar_chart: 'BarChart2',
	analytics: 'LineChart',
	close: 'X',
	arrow_back: 'ArrowLeft',
	arrow_forward: 'ArrowRight',
	check: 'Check',
	add: 'Plus',
	edit: 'Pencil',
	delete: 'Trash2',
	sync: 'RefreshCw',
	search: 'Search',
	expand_more: 'ChevronDown',
	expand_less: 'ChevronUp',
	more_vert: 'MoreVertical',
	account_circle: 'User',
	visibility: 'Eye',
	visibility_off: 'EyeOff',
	badge: 'IdCard',
	work: 'Briefcase',
	school: 'GraduationCap',
	fitness_center: 'Dumbbell',
	local_grocery_store: 'ShoppingCart',
	shopping_bag: 'ShoppingBag',
	coffee: 'Coffee',
	restaurant: 'Utensils',
	local_bar: 'Wine',
	lunch_dining: 'UtensilsCrossed',
	icecream: 'IceCream',
	sports_esports: 'Gamepad2',
	payments: 'Wallet',
	receipt: 'Receipt',
	attach_money: 'DollarSign',
	savings: 'PiggyBank',
	schedule: 'Clock',
	calendar_today: 'Calendar',
	trending_up: 'TrendingUp',
	trending_down: 'TrendingDown',
	check_circle: 'CheckCircle2',
	warning: 'AlertTriangle',
	info: 'Info',
	help_outline: 'HelpCircle',
	drive_eta: 'Car',
	electric_car: 'Zap',
	flight: 'Plane',
	directions_bus: 'Bus',
	directions_bike: 'Bike',
	train: 'Train',
	local_hospital: 'HeartPulse',
	favorite: 'Heart',
	pets: 'PawPrint',
	movie: 'Film',
	palette: 'Palette',
	music_note: 'Music',
	book: 'BookOpen',
	inventory_2: 'Package',
};

// Normalize any kebab-case or snake_case string into PascalCase
function toPascalCase(str: string): string {
	return str
		.replace(/[-_]([a-z0-9])/gi, (_, char) => char.toUpperCase())
		.replace(/^[a-z]/, (char) => char.toUpperCase());
}

export interface LucideIconProps extends React.SVGProps<SVGSVGElement> {
	name?: string;
	size?: number | string;
	className?: string;
	strokeWidth?: number;
}

export const LucideIcon: React.FC<LucideIconProps> = ({
	name,
	size = 20,
	className = '',
	strokeWidth = 2,
	...props
}) => {
	if (!name) {
		const Fallback = LucideIcons.HelpCircle;
		return <Fallback size={size} strokeWidth={strokeWidth} className={className} {...props} />;
	}

	const normalized = name.trim().toLowerCase();
	let iconKey: keyof typeof LucideIcons | undefined = LEGACY_MAP[normalized];

	if (!iconKey) {
		const pascal = toPascalCase(name) as keyof typeof LucideIcons;
		if (LucideIcons[pascal]) {
			iconKey = pascal;
		}
	}

	const IconComponent = (iconKey && LucideIcons[iconKey]) || LucideIcons.MapPin;
	const ComponentToRender = IconComponent as React.FC<any>;

	return <ComponentToRender size={size} strokeWidth={strokeWidth} className={className} {...props} />;
};

/**
 * Returns an inline SVG string for Leaflet DivIcons
 */
export function getLucideIconSvgString(
	name: string,
	color: string = '#111111',
	size: number = 18,
	strokeWidth: number = 2.2,
): string {
	const normalized = name.trim().toLowerCase();
	let iconKey: keyof typeof LucideIcons | undefined = LEGACY_MAP[normalized];

	if (!iconKey) {
		const pascal = toPascalCase(name) as keyof typeof LucideIcons;
		if (LucideIcons[pascal]) {
			iconKey = pascal;
		}
	}

	if (iconKey === 'Home') {
		return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
	}
	if (iconKey === 'Car') {
		return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.2 1 12 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
	}
	if (iconKey === 'Briefcase') {
		return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>`;
	}
	if (iconKey === 'GraduationCap') {
		return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>`;
	}
	if (iconKey === 'ShoppingCart') {
		return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;
	}
	if (iconKey === 'Dumbbell') {
		return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>`;
	}

	// Default: MapPin
	return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;
}
