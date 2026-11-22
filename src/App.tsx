import { useState, useEffect, useMemo, useRef } from 'react';
import {
	motion,
	MotionConfig,
	useMotionValue,
	useTransform,
	animate,
	PanInfo,
} from 'motion/react';
import {
	Transaction,
	PresetItem,
	IncomeSettings,
	INITIAL_TRANSACTIONS,
	INITIAL_PRESETS,
	INITIAL_INCOME_SETTINGS,
	calculateBalanceSummary,
	applyKeypadKey,
	calculateWorkHoursLabel,
} from './utils/expenseMath';
import { TransactionManager } from './utils/transactionDataStructure';
import {
	PresetSheetModal,
	EXPENSE_ICONS,
	INCOME_ICONS,
} from './components/PresetSheetModal';
import { BalanceBreakdownModal } from './components/BalanceBreakdownModal';
import { SwipeableTransactionItem } from './components/SwipeableTransactionItem';
import { TopBar } from './components/TopBar';
import { OnboardingModal } from './components/OnboardingModal';
import { IconPickerDrawer } from './components/IconPickerDrawer';
import { LocationsView } from './components/LocationsView';
import { VehicleSettingsView } from './components/VehicleSettingsView';
import { getSavedLocations, saveLocations } from './utils/savedLocations';
import { SavedLocation } from './types/maps';
import { LucideIcon } from './components/LucideIcon';
import {
	Plus,
	Minus,
	Search,
	X,
	Receipt,
	CheckCircle2,
	Pencil,
	Delete,
	RotateCw,
	Trash2,
	ArrowRight,
	LayoutGrid,
	Map,
	BarChart2,
	SlidersHorizontal,
	Settings,
} from 'lucide-react';
import {
	MapsView,
	AnalyticsView,
	PresetsView,
	SettingsView,
	SettingsSubpage,
} from './components/SecondaryTabs';
import { SmartPromptBanner } from './components/SmartPromptBanner';
import { DevTrackingIndicator } from './components/DevTrackingIndicator';
import {
	RecordedTrip,
	SmartPrompt,
	LiveTrackingStatus,
	DevTrackingTelemetry,
	Coordinate,
} from './types/maps';
import { fetchRoadRoute } from './utils/mapRouting';
import { AutomaticTripDetectionService } from './utils/tripTracker';

type ActiveTab =
	| 'dashboard'
	| 'maps'
	| 'analytics'
	| 'presets'
	| 'settings'
	| 'locations'
	| 'vehicle_settings';
type ActiveModal = 'none' | 'preset' | 'breakdown';

const COLLAPSED_DOCK_Y = 396;

const EXPENSE_CATEGORIES = [
	{ id: 'Driving', label: 'Driving', emoji: '🚗', icon: 'directions_car' },
	{ id: 'Fitness', label: 'Fitness', emoji: '🏐', icon: 'fitness_center' },
	{ id: 'Food', label: 'Food', emoji: '🍔', icon: 'restaurant' },
	{ id: 'Other', label: 'Other', emoji: '📦', icon: 'shopping_bag' },
];

const INCOME_CATEGORIES = [
	{ id: 'Paycheck', label: 'Paycheck', emoji: '💼', icon: 'payments' },
	{ id: 'Side Gig', label: 'Side Gig', emoji: '⚡', icon: 'bolt' },
	{ id: 'Gift', label: 'Gift', emoji: '🎁', icon: 'card_giftcard' },
	{ id: 'Refund', label: 'Refund', emoji: '🔄', icon: 'replay' },
];

export const INITIAL_RECORDED_TRIPS: RecordedTrip[] = [
	// {
	// 	id: 'trip-1',
	// 	from: 'School',
	// 	to: 'Rowan',
	// 	miles: 12.8,
	// 	cost: 1.79,
	// 	timestamp: '8:15 AM',
	// 	status: 'UNLOGGED',
	// 	coordinates: DEFAULT_ROAD_ROUTES['trip-1'] || [],
	// },
	// {
	// 	id: 'trip-2',
	// 	from: 'Home',
	// 	to: 'ShopRite',
	// 	miles: 6.4,
	// 	cost: 0.89,
	// 	timestamp: 'Yesterday',
	// 	status: 'UNLOGGED',
	// 	coordinates: DEFAULT_ROAD_ROUTES['trip-2'] || [],
	// },
	// {
	// 	id: 'trip-3',
	// 	from: 'Home',
	// 	to: 'Sportime VB',
	// 	miles: 10.0,
	// 	cost: 1.4,
	// 	timestamp: 'Nov 12',
	// 	status: 'LOGGED',
	// 	coordinates: DEFAULT_ROAD_ROUTES['trip-3'] || [],
	// },
];

export const INITIAL_SMART_PROMPTS: SmartPrompt[] = [
	// {
	// 	id: 'prompt-frequent-school',
	// 	type: 'FREQUENT_ROUTE',
	// 	title: 'Frequent Drive Detected',
	// 	subtitle: 'You take School → Rowan often. Save this drive as a preset?',
	// 	ctaLabel: 'Save Drive',
	// 	payload: {
	// 		name: 'School → Rowan',
	// 		miles: 12.8,
	// 		category: 'Driving',
	// 	},
	// },
	// {
	// 	id: 'prompt-merchant-shoprite',
	// 	type: 'MERCHANT_STOP',
	// 	title: 'Merchant Stop Detected',
	// 	subtitle: 'You were just at ShopRite. Track how much you spent?',
	// 	ctaLabel: 'Log Spend',
	// 	payload: {
	// 		name: 'ShopRite',
	// 		category: 'Food',
	// 	},
	// },
];

export default function App() {
	const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			const tab = params.get('tab');
			if (
				tab === 'maps' ||
				tab === 'analytics' ||
				tab === 'presets' ||
				tab === 'settings'
			) {
				return tab;
			}
		}
		return 'dashboard';
	});
	const [activeModal, setActiveModal] = useState<ActiveModal>(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			const sheet = params.get('sheet');
			if (sheet === 'preset' || sheet === 'breakdown') {
				return sheet;
			}
		}
		return 'none';
	});

	const [isDockExpanded, setIsDockExpanded] = useState<boolean>(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			return params.get('sheet') === 'log';
		}
		return false;
	});
	const [selectedCategory, setSelectedCategory] = useState<string>('Fitness');
	const [dockNote, setDockNote] = useState<string>('');
	const [dockIconIndex, setDockIconIndex] = useState<number>(0);
	const [customDockIcon, setCustomDockIcon] = useState<{
		icon: string;
		bgColor: string;
		iconColor: string;
	} | null>(null);
	const [isIconPickerOpen, setIsIconPickerOpen] = useState<boolean>(false);

	const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('imcheap_animations');
			if (saved !== null) {
				return saved !== 'false';
			}
		}
		return true;
	});

	const handleToggleAnimations = (enabled: boolean) => {
		setAnimationsEnabled(enabled);
		if (typeof window !== 'undefined') {
			localStorage.setItem('imcheap_animations', String(enabled));
		}
	};

	// Continuous motion values for smooth live dragging
	const dockY = useMotionValue(COLLAPSED_DOCK_Y);
	const [isSecondaryDockOpen, setIsSecondaryDockOpen] = useState(false);

	useEffect(() => {
		if (isDockExpanded) {
			animate(dockY, 0, { type: 'spring', damping: 28, stiffness: 320 });
		} else {
			animate(dockY, COLLAPSED_DOCK_Y, {
				type: 'spring',
				damping: 28,
				stiffness: 320,
			});
		}
	}, [isDockExpanded, dockY]);

	// Motion transforms driven continuously by dock dragging
	const bgDimOpacity = useTransform(dockY, [COLLAPSED_DOCK_Y, 0], [0, 0.4]);
	const dockNavY = useTransform(dockY, [COLLAPSED_DOCK_Y, 160], [0, 80]);
	const modalNavY = useMotionValue(0);

	useEffect(() => {
		const isAnyModalActive = activeModal !== 'none' || isSecondaryDockOpen;
		animate(modalNavY, isAnyModalActive ? 100 : 0, {
			type: 'spring',
			damping: 28,
			stiffness: 320,
		});
	}, [activeModal, isSecondaryDockOpen, modalNavY]);

	// Effective nav position combining dock drag and modal sheets
	const combinedNavY = useTransform([dockNavY, modalNavY], ([dY, mY]) =>
		Math.max(dY as number, mY as number),
	);

	const [txManager] = useState<TransactionManager>(() => {
		let initialTxs: Transaction[] = INITIAL_TRANSACTIONS;
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_transactions');
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed) && parsed.length > 0) {
						// Check if historical October data exists; if not, merge seeds so month 2 testing works
						const hasOct = parsed.some((t: Transaction) =>
							t.timestamp?.includes('2026-10'),
						);
						if (!hasOct) {
							const octTxs = INITIAL_TRANSACTIONS.filter((t) =>
								t.timestamp?.includes('2026-10'),
							);
							initialTxs = [...parsed, ...octTxs];
						} else {
							initialTxs = parsed;
						}
					}
				}
			} catch (e) {
				console.warn(
					'Failed to parse transactions from localStorage',
					e,
				);
			}
		}
		return new TransactionManager(initialTxs);
	});
	const [transactions, setTransactions] = useState<Transaction[]>(() =>
		txManager.getAll(),
	);

	// Persist transactions to localStorage
	useEffect(() => {
		try {
			localStorage.setItem(
				'imcheap_transactions',
				JSON.stringify(transactions),
			);
		} catch (e) {
			console.warn('Failed to save transactions to localStorage', e);
		}
	}, [transactions]);
	const [presets, setPresets] = useState<PresetItem[]>(() => {
		if (typeof window !== 'undefined') {
			try {
				const savedPresets = localStorage.getItem('imcheap_presets');
				if (savedPresets) {
					const parsed = JSON.parse(savedPresets);
					if (Array.isArray(parsed) && parsed.length > 0) {
						return parsed.map((p, idx) => ({
							...p,
							pinned:
								typeof p.pinned === 'boolean'
									? p.pinned
									: idx < 5,
						}));
					}
				}
			} catch (e) {
				console.warn(
					'Failed to parse saved presets from localStorage',
					e,
				);
			}
		}
		return INITIAL_PRESETS.map((p, idx) => ({
			...p,
			pinned: typeof p.pinned === 'boolean' ? p.pinned : idx < 5,
		}));
	});
	const [incomeSettings, setIncomeSettings] = useState<IncomeSettings>(() => {
		let initial = { ...INITIAL_INCOME_SETTINGS };
		if (typeof window !== 'undefined') {
			try {
				const savedWage = localStorage.getItem('imcheap_wage');
				if (savedWage) {
					const wageVal = parseFloat(savedWage);
					if (!isNaN(wageVal) && wageVal > 0) {
						initial.hourlyWage = wageVal;
					}
				}
				const savedVehicle = localStorage.getItem('imcheap_vehicle');
				if (savedVehicle) {
					const vehicle = JSON.parse(savedVehicle);
					if (vehicle?.mpg && vehicle?.gasPrice) {
						const rate = Number(
							(vehicle.gasPrice / vehicle.mpg).toFixed(2),
						);
						initial.mileageRate = rate;
					}
				}
			} catch (e) {
				console.warn(
					'Failed to load income settings from localStorage',
					e,
				);
			}
		}
		return initial;
	});

	// Dynamically recalculate mileage presets whenever mileageRate changes
	useEffect(() => {
		setPresets((prev) => {
			let changed = false;
			const updated = prev.map((preset) => {
				if (preset.unit === 'MILES') {
					const multiplier = preset.isRoundTrip ? 2 : 1;
					const effectiveUnits = preset.rawValue * multiplier;
					const newAmount = Number(
						(effectiveUnits * incomeSettings.mileageRate).toFixed(
							2,
						),
					);
					if (Math.abs(newAmount - preset.calculatedAmount) > 0.001) {
						changed = true;
						return { ...preset, calculatedAmount: newAmount };
					}
				}
				return preset;
			});
			if (changed) {
				try {
					localStorage.setItem(
						'imcheap_presets',
						JSON.stringify(updated),
					);
				} catch (e) {
					console.warn('Failed to save presets to localStorage', e);
				}
				return updated;
			}
			return prev;
		});
	}, [incomeSettings.mileageRate]);

	// Persist hourlyWage whenever it changes
	useEffect(() => {
		try {
			localStorage.setItem(
				'imcheap_wage',
				String(incomeSettings.hourlyWage),
			);
		} catch (e) {
			console.warn('Failed to save wage to localStorage', e);
		}
	}, [incomeSettings.hourlyWage]);

	// Persist presets whenever changed
	useEffect(() => {
		try {
			localStorage.setItem('imcheap_presets', JSON.stringify(presets));
		} catch (e) {
			console.warn('Failed to save presets to localStorage', e);
		}
	}, [presets]);

	const [initialSettingsSubpage, setInitialSettingsSubpage] =
		useState<SettingsSubpage>(() => {
			if (typeof window !== 'undefined') {
				const params = new URLSearchParams(window.location.search);
				const sub = params.get('subpage') as SettingsSubpage;
				if (sub) return sub;
			}
			return 'main';
		});

	// Quick dock state
	const [selectedPresetLabel, setSelectedPresetLabel] = useState<
		string | null
	>(null);
	const [dockAmount, setDockAmount] = useState<string>('');
	const [dockType, setDockType] = useState<'expense' | 'income'>('expense');
	const [isLoggingAction, setIsLoggingAction] = useState<
		'idle' | 'spinning' | 'success'
	>('idle');
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	// Editing state for presets and transactions
	const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);
	const [editingTransactionId, setEditingTransactionId] = useState<
		string | null
	>(null);
	const [isKeypadPristine, setIsKeypadPristine] = useState<boolean>(false);

	// Search state
	const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState<string>('');

	// Onboarding state
	const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			if (params.get('tab') || params.get('subpage')) {
				return false;
			}
			try {
				const completed = localStorage.getItem(
					'imcheap_onboarding_completed',
				);
				if (!completed) {
					return true;
				}
			} catch (e) {
				console.warn('Failed to check onboarding completed flag', e);
			}
		}
		return false;
	});

	const summary = useMemo(
		() => calculateBalanceSummary(transactions, incomeSettings),
		[transactions, incomeSettings],
	);

	const filteredTransactions = useMemo(() => {
		return txManager.search(searchQuery);
	}, [txManager, transactions, searchQuery]);

	useEffect(() => {
		if (!toastMessage) return;
		const timer = setTimeout(() => {
			setToastMessage(null);
		}, 1800);
		return () => clearTimeout(timer);
	}, [toastMessage]);

	const handlePresetClick = (preset: PresetItem) => {
		const txType = preset.type || 'expense';
		txManager.createTransaction({
			title: preset.title,
			category: preset.category,
			amount: preset.calculatedAmount,
			type: txType,
			icon: preset.icon,
		});
		setTransactions(txManager.getAll());
	};

	const handleTogglePinPreset = (id: string) => {
		setPresets((prev) =>
			prev.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p)),
		);
	};

	// Recorded Trips State
	const [trips, setTrips] = useState<RecordedTrip[]>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_trips');
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed) && parsed.length > 0)
						return parsed;
				}
			} catch (e) {
				console.warn('Failed to parse trips from localStorage', e);
			}
		}
		return INITIAL_RECORDED_TRIPS;
	});

	// Persist trips
	useEffect(() => {
		try {
			localStorage.setItem('imcheap_trips', JSON.stringify(trips));
		} catch (e) {
			console.warn('Failed to save trips to localStorage', e);
		}
	}, [trips]);

	// Recalculate trip costs when mileageRate changes
	useEffect(() => {
		setTrips((prev) => {
			let changed = false;
			const updated = prev.map((trip) => {
				const calculated = Number(
					(trip.miles * incomeSettings.mileageRate).toFixed(2),
				);
				if (Math.abs(calculated - trip.cost) > 0.001) {
					changed = true;
					return { ...trip, cost: calculated };
				}
				return trip;
			});
			return changed ? updated : prev;
		});
	}, [incomeSettings.mileageRate]);

	// Automatic Trip Detection setting
	const [autoTripDetection, setAutoTripDetection] = useState<boolean>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem(
					'imcheap_auto_trip_detection',
				);
				if (saved !== null) {
					return saved === 'true';
				}
			} catch {}
		}
		return true;
	});

	const [savedLocations, setSavedLocations] = useState(() => {
		return getSavedLocations();
	});

	// Marker being edited on the map from Locations view
	const [editingLocationFromLocationsList, setEditingLocationFromLocationsList] = useState<SavedLocation | null>(null);

	const [trackingStatus, setTrackingStatus] = useState<LiveTrackingStatus>({
		state: 'LOCATING',
	});

	// Lifted userLocation for persistent cross-tab alignment
	const [userLocation, setUserLocation] = useState<Coordinate>(() => {
		if (typeof window !== 'undefined') {
			try {
				const savedGps = localStorage.getItem('imcheap_last_known_gps');
				if (savedGps) {
					const parsed = JSON.parse(savedGps);
					if (parsed?.lat && parsed?.lng) return parsed;
				}
				const savedCustom = localStorage.getItem(
					'imcheap_user_custom_location',
				);
				if (savedCustom) {
					const parsed = JSON.parse(savedCustom);
					if (parsed?.lat && parsed?.lng) return parsed;
				}
			} catch {}
		}
		return { lat: 39.7032, lng: -75.122 };
	});

	// Dev Tracking Telemetry & Overlay State
	const [devTelemetry, setDevTelemetry] =
		useState<DevTrackingTelemetry | null>(null);
	const [devTrackingOverlay, setDevTrackingOverlay] = useState<boolean>(
		() => {
			if (typeof window !== 'undefined') {
				try {
					return (
						localStorage.getItem('imcheap_dev_tracking_overlay') ===
						'true'
					);
				} catch {}
			}
			return false;
		},
	);
	const [enableRouteSimulation, setEnableRouteSimulation] = useState<boolean>(
		() => {
			if (typeof window !== 'undefined') {
				try {
					const stored = localStorage.getItem(
						'imcheap_enable_route_simulation',
					);
					if (stored !== null) return stored === 'true';
				} catch {}
			}
			return true;
		},
	);

	// Location Permission State (defaults to false until user turns on in Onboarding or Maps overlay)
	const [isLocationEnabled, setIsLocationEnabled] = useState<boolean>(() => {
		if (typeof window !== 'undefined') {
			try {
				return (
					localStorage.getItem('imcheap_location_enabled') === 'true'
				);
			} catch {}
		}
		return false;
	});

	const tripDetectorRef = useRef<AutomaticTripDetectionService | null>(null);

	useEffect(() => {
		const detector = new AutomaticTripDetectionService({
			mileageRate: incomeSettings.mileageRate,
			hourlyWage: incomeSettings.hourlyWage,
			onTripRecorded: (newTrip) => {
				setTrips((prev) => [newTrip, ...prev]);
				setToastMessage(
					`Trip recorded: ${newTrip.from} → ${newTrip.to} (${newTrip.miles.toFixed(1)} mi)`,
				);

				const newPrompt: SmartPrompt = {
					id: `prompt-${newTrip.id}`,
					type: 'FREQUENT_ROUTE',
					title: 'Drive Recorded',
					subtitle: `You just traveled ${newTrip.from} → ${newTrip.to} (${newTrip.miles.toFixed(1)} mi). Save this drive as a preset?`,
					ctaLabel: 'Save Drive',
					payload: {
						name: `${newTrip.from} → ${newTrip.to}`,
						miles: newTrip.miles,
						category: 'Driving',
					},
				};
				setCustomPrompts((prev) => [newPrompt, ...prev]);
			},
			onStatusChange: (status) => {
				setTrackingStatus(status);
				if (status.liveLocation) {
					setUserLocation(status.liveLocation);
				}
			},
			onTelemetryUpdate: (telemetry) => {
				setDevTelemetry(telemetry);
			},
		});

		tripDetectorRef.current = detector;

		// Only start engine when both autoTripDetection AND isLocationEnabled are true
		if (autoTripDetection && isLocationEnabled) {
			detector.start();
		}

		return () => {
			detector.stop();
		};
	}, [
		autoTripDetection,
		isLocationEnabled,
		incomeSettings.mileageRate,
		incomeSettings.hourlyWage,
	]);

	// Smart Prompts State & Dismissals
	const [dismissedPromptIds, setDismissedPromptIds] = useState<string[]>(
		() => {
			if (typeof window !== 'undefined') {
				try {
					const saved = localStorage.getItem(
						'imcheap_dismissed_prompts',
					);
					if (saved) return JSON.parse(saved);
				} catch {}
			}
			return [];
		},
	);

	const [customPrompts, setCustomPrompts] = useState<SmartPrompt[]>([]);

	const availablePrompts = useMemo(() => {
		const all = [...customPrompts, ...INITIAL_SMART_PROMPTS];
		return all.filter((p) => !dismissedPromptIds.includes(p.id));
	}, [customPrompts, dismissedPromptIds]);

	const currentSmartPrompt = availablePrompts[0] || null;

	const handleDismissPrompt = (promptId: string) => {
		setDismissedPromptIds((prev) => {
			const next = [...prev, promptId];
			try {
				localStorage.setItem(
					'imcheap_dismissed_prompts',
					JSON.stringify(next),
				);
			} catch {}
			return next;
		});
	};

	const handlePromptAction = (prompt: SmartPrompt) => {
		if (prompt.type === 'FREQUENT_ROUTE') {
			const milesVal = prompt.payload.miles || 12.8;
			const initialCost = Number(
				(milesVal * incomeSettings.mileageRate).toFixed(2),
			);
			setEditingPreset({
				id: '',
				label: 'School',
				title: prompt.payload.name || 'School → Rowan',
				category: prompt.payload.category || 'Driving',
				icon: 'directions_car',
				bgColor: '#EEF2FF',
				iconColor: '#3730A3',
				unit: 'MILES',
				rawValue: milesVal,
				isRoundTrip: false,
				calculatedAmount: initialCost,
				pinned: true,
			});
			setActiveModal('preset');
		} else {
			// Merchant Stop
			setDockNote(prompt.payload.name || 'ShopRite');
			setDockType('expense');
			const foundCat = EXPENSE_CATEGORIES.find(
				(c) =>
					c.label.toLowerCase() ===
					(prompt.payload.category || 'food').toLowerCase(),
			);
			if (foundCat) {
				setSelectedCategory(foundCat.id);
			}
			setIsDockExpanded(true);
		}
		handleDismissPrompt(prompt.id);
	};

	const handleLogTrip = (trip: RecordedTrip) => {
		txManager.createTransaction({
			title: `${trip.from} → ${trip.to}`,
			category: 'Driving',
			amount: trip.cost,
			type: 'expense',
			icon: 'directions_car',
		});
		setTransactions(txManager.getAll());
		setTrips((prev) =>
			prev.map((t) =>
				t.id === trip.id ? { ...t, status: 'LOGGED' } : t,
			),
		);
		setToastMessage(`Trip logged ($${trip.cost.toFixed(2)})`);
	};

	const handleDeleteTrip = (id: string) => {
		setTrips((prev) => prev.filter((t) => t.id !== id));
	};

	const handleStartEditTransaction = (tx: Transaction) => {
		setEditingTransactionId(tx.id);
		setDockAmount(tx.amount.toFixed(2));
		setDockType(tx.type);
		setDockNote(tx.note || tx.title || '');
		setIsKeypadPristine(true);

		const cats =
			tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
		const foundCat = cats.find(
			(c) =>
				c.label.toLowerCase() === tx.category.toLowerCase() ||
				c.id.toLowerCase() === tx.category.toLowerCase(),
		);
		if (foundCat) {
			setSelectedCategory(foundCat.id);
		}

		const icons = tx.type === 'income' ? INCOME_ICONS : EXPENSE_ICONS;
		const iconMatchIdx = icons.findIndex((i) => i.icon === tx.icon);
		if (iconMatchIdx >= 0) {
			setDockIconIndex(iconMatchIdx);
			setCustomDockIcon(null);
		} else {
			const isIncome = tx.type === 'income';
			setCustomDockIcon({
				icon: tx.icon,
				bgColor: isIncome ? '#ECFDF5' : '#F3F4F6',
				iconColor: isIncome ? '#059669' : '#111111',
			});
		}

		if (activeTab !== 'dashboard') {
			setActiveTab('dashboard');
		}
		setIsDockExpanded(true);
	};

	const handleKeypadClick = (val: string) => {
		if (isKeypadPristine) {
			setIsKeypadPristine(false);
			if (val === 'back') {
				setDockAmount('');
				return;
			}
			setDockAmount(val === '.' ? '0.' : val);
			return;
		}

		setDockAmount((prev) => {
			const initial = prev || '';
			return applyKeypadKey(initial, val, {
				maxLength: 8,
				maxDecimals: 2,
			});
		});
	};

	const currentCategories =
		dockType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
	const iconList = dockType === 'income' ? INCOME_ICONS : EXPENSE_ICONS;
	const currentDockIcon =
		customDockIcon || iconList[dockIconIndex % iconList.length];

	const parsedDockAmount = parseFloat(dockAmount);
	const isEditAmountZeroOrEmpty =
		editingTransactionId !== null &&
		(isNaN(parsedDockAmount) || parsedDockAmount <= 0);

	const handleCloseDock = () => {
		setIsDockExpanded(false);
		if (editingTransactionId) {
			setEditingTransactionId(null);
			setIsKeypadPristine(false);
			setDockAmount('');
			setDockNote('');
			setCustomDockIcon(null);
		}
	};

	const handleCommitDockExpense = () => {
		if (isLoggingAction !== 'idle') return;

		// When editing and the amount is zero or cleared, delete the transaction
		if (editingTransactionId && isEditAmountZeroOrEmpty) {
			setIsLoggingAction('spinning');
			setTimeout(() => {
				setIsLoggingAction('success');
				txManager.removeTransaction(editingTransactionId);
				setTransactions(txManager.getAll());
				setToastMessage('Transaction deleted');
				setTimeout(() => {
					setToastMessage(null);
				}, 2000);

				setTimeout(() => {
					setIsLoggingAction('idle');
					handleCloseDock();
				}, 250);
			}, 250);
			return;
		}

		const parsedVal = parsedDockAmount;
		const matchedPreset = presets.find(
			(p) => p.label === selectedPresetLabel,
		);
		const catMeta =
			currentCategories.find(
				(c) => c.id.toLowerCase() === selectedCategory.toLowerCase(),
			) || currentCategories[0];

		// If dock is collapsed and user has no amount or preset, expand it upward
		if (
			!isDockExpanded &&
			(isNaN(parsedVal) || parsedVal <= 0) &&
			!matchedPreset
		) {
			setIsDockExpanded(true);
			return;
		}

		const finalAmount =
			!isNaN(parsedVal) && parsedVal > 0
				? parsedVal
				: matchedPreset?.calculatedAmount || 18.59;

		setIsLoggingAction('spinning');

		setTimeout(() => {
			setIsLoggingAction('success');

			if (editingTransactionId) {
				txManager.updateTransaction(editingTransactionId, {
					title:
						dockNote.trim() ||
						(matchedPreset ? matchedPreset.title : catMeta.label),
					category: catMeta.label,
					amount: finalAmount,
					type: dockType,
					icon: currentDockIcon.icon,
					note: dockNote.trim() || undefined,
				});
			} else {
				txManager.createTransaction({
					title:
						dockNote.trim() ||
						(matchedPreset ? matchedPreset.title : catMeta.label),
					category: catMeta.label,
					amount: finalAmount,
					type: dockType,
					icon: matchedPreset
						? matchedPreset.icon
						: currentDockIcon.icon,
					note: dockNote.trim() || undefined,
				});
			}

			setTransactions(txManager.getAll());

			setTimeout(() => {
				setIsLoggingAction('idle');
				setEditingTransactionId(null);
				setIsKeypadPristine(false);
				setDockAmount('');
				setSelectedPresetLabel(null);
				setDockNote('');
				setDockIconIndex(0);
				setCustomDockIcon(null);
				setIsDockExpanded(false);
			}, 250);
		}, 250);
	};

	const handleSaveNewPreset = (presetData: Omit<PresetItem, 'id'>) => {
		if (editingPreset) {
			setPresets((prev) =>
				prev.map((p) =>
					p.id === editingPreset.id ? { ...presetData, id: p.id } : p,
				),
			);
			setEditingPreset(null);
		} else {
			const newPreset: PresetItem = {
				...presetData,
				id: `preset-${Date.now()}`,
			};
			setPresets((prev) => [...prev, newPreset]);
		}
	};

	const tabTitle =
		activeTab === 'dashboard'
			? 'Dashboard'
			: activeTab === 'maps'
				? 'Maps'
				: activeTab === 'analytics'
					? 'Analytics'
					: activeTab === 'presets'
						? 'Presets'
						: activeTab === 'locations'
							? 'Locations'
							: activeTab === 'vehicle_settings'
								? 'Vehicle Settings'
								: 'Settings';

	return (
		<MotionConfig reducedMotion={animationsEnabled ? 'never' : 'always'}>
			<div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col antialiased">
				{/* Top App Header */}
				<TopBar
					title={tabTitle}
					onOpenOnboarding={() => setIsOnboardingOpen(true)}
					onOpenProfile={() => setActiveTab('settings')}
				/>

				{/* Main Content Container */}
				<main
					className={`flex flex-col relative w-full max-w-120 mx-auto px-margin ${
						isSearchOpen && activeTab === 'dashboard'
							? 'pt-28'
							: 'pt-16'
					} ${
						activeTab === 'dashboard'
							? 'h-dvh pb-24 overflow-hidden'
							: 'pb-28 min-h-dvh'
					} bg-surface`}
				>
					{activeTab === 'dashboard' && (
						<div className="flex flex-col w-full min-h-0 flex-1 overflow-y-auto no-scrollbar pb-36 pt-2 px-space-xs space-y-5">
							{/* Current Runway Hero Card */}
							<section className="w-full">
								<div
									onClick={() => setActiveModal('breakdown')}
									onKeyDown={(e) => {
										if (
											e.key === 'Enter' ||
											e.key === ' '
										) {
											e.preventDefault();
											setActiveModal('breakdown');
										}
									}}
									role="button"
									tabIndex={0}
									aria-label="View Balance Breakdown"
									className="w-full bg-[#FFFFFF] rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100 cursor-pointer focus:outline-none active:scale-[0.99] transition-transform flex flex-col gap-4 select-none"
								>
									{/* Header row: CURRENT RUNWAY and Badge */}
									<div className="flex items-center justify-between">
										<span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
											This Month
										</span>
										<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-secondary text-[12px] font-bold tracking-tight">
											<span>★</span>
											<span>
												On Track (+$
												{summary.availableBalance > 0
													? (
															summary.availableBalance *
															0.37
														).toFixed(0)
													: '0'}{' '}
												)
											</span>
										</div>
									</div>

									{/* Main Hours Left Display */}
									<div className="flex items-baseline gap-2">
										<span
											className="text-[36px] sm:text-[40px] leading-none font-extrabold text-[#111111] tracking-tight tabular-nums"
											data-testid="hero-balance"
										>
											<AnimatedNumber
												value={
													parseFloat(
														summary.unspentWorkHours,
													) || 0
												}
												enabled={animationsEnabled}
												decimals={1}
												prefix=""
											/>{' '}
											hrs
										</span>
										<span className="text-[20px] font-bold text-[#111111]">
											available
										</span>
									</div>

									{/* Subtext: remaining of paycheck */}
									<div className="text-[14px] text-[#4B5563] font-medium tracking-tight">
										${summary.availableBalance.toFixed(2)}{' '}
										remaining of $
										{(
											summary.basePaycheck +
											(summary.totalIncome || 0)
										).toFixed(2)}{' '}
										paycheck
									</div>

									{/* Green Progress Bar */}
									<div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden flex">
										<div
											className="h-full bg-[#4ADE80] rounded-full transition-all duration-300"
											style={{
												width: `${Math.min(100, Math.max(0, summary.percentLeft))}%`,
											}}
										/>
									</div>

									{/* Footer row: Safe spend and days to payday */}
									<div className="flex items-center justify-between text-[13px] text-[#4B5563] font-medium pt-0.5">
										<div>
											Safe spend:{' '}
											<span className="font-bold text-[#111111]">
												$
												{(
													summary.availableBalance / 8
												).toFixed(2)}
												/day
											</span>
										</div>
									</div>
								</div>
							</section>

							{/* Quick Log Presets Section */}
							<section className="w-full flex flex-col gap-2.5">
								<div className="flex items-center justify-between px-1">
									<span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
										Presets
									</span>
									{/* <span className="text-[12px] text-[#6B7280] font-normal">
										Tap to record
									</span> */}
								</div>

								{/* Presets Horizontal Scroll / Grid */}
								<div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
									{presets
										.filter((p) => p.pinned)
										.map((preset) => (
											<button
												key={preset.id}
												type="button"
												onClick={() =>
													handlePresetClick(preset)
												}
												className="flex flex-col items-center bg-white justify-center active:scale-95 transition-all rounded-2xl p-3 w-21 h-24.5 shrink-0 cursor-pointer shadow-xs"
											>
												<div className="w-10 h-10 rounded-full flex items-center justify-center mb-2">
													<LucideIcon
														name={preset.icon}
														size={20}
														style={{
															color:
																preset.iconColor ||
																'#111111',
														}}
													/>
												</div>
												<span className="text-[12px] font-bold text-[#111111] truncate w-full text-center">
													{preset.label}
												</span>
												<span className="text-[11px] text-[#6B7280] font-medium tabular-nums mt-0.5">
													$
													{preset.calculatedAmount.toFixed(
														2,
													)}
												</span>
											</button>
										))}

									{/* Add Preset button */}
									<button
										type="button"
										onClick={() => {
											setEditingPreset(null);
											setActiveModal('preset');
										}}
										aria-label="Add new preset"
										className="flex flex-col items-center justify-center bg-[#F4F7FB] hover:bg-[#EBF0F7] active:scale-95 transition-all rounded-[20px] p-3 w-21 h-24.5 shrink-0 cursor-pointer border border-dashed border-gray-300 text-gray-400"
									>
										<div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center mb-2">
											<Plus
												size={20}
												className="text-gray-500"
											/>
										</div>
										<span className="text-[12px] font-medium text-gray-500">
											Add
										</span>
									</button>
								</div>
							</section>

							{/* Recent Activity Section */}
							<section className="w-full flex flex-col gap-2.5">
								<div className="flex items-center justify-between px-1">
									<span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
										RECENTS
									</span>
								</div>

								{/* Search Bar directly above Recent Transactions */}
								<div className="relative flex items-center bg-white border border-gray-100 rounded-2xl px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] focus-within:border-black/30 transition-all">
									<Search
										size={18}
										className="text-gray-400 mr-2.5 select-none"
									/>
									<input
										type="text"
										value={searchQuery}
										onChange={(e) =>
											setSearchQuery(e.target.value)
										}
										placeholder="Search transactions or categories..."
										className="w-full bg-transparent text-[13px] text-[#111111] placeholder:text-gray-400 focus:outline-none"
									/>
									{searchQuery && (
										<button
											type="button"
											aria-label="Clear search"
											onClick={() => setSearchQuery('')}
											className="text-gray-400 hover:text-black transition-colors cursor-pointer ml-1"
										>
											<X size={16} />
										</button>
									)}
								</div>

								{/* White Card Containing Transactions List */}
								<div
									className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden"
									data-testid="transactions-list"
								>
									{filteredTransactions.length === 0 ? (
										<div className="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
											<div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
												<Receipt size={20} />
											</div>
											<span className="text-[14px] font-semibold text-[#111111]">
												{searchQuery
													? 'No matching transactions found.'
													: 'No transactions recorded yet.'}
											</span>
											{!searchQuery && (
												<span className="text-[12px] text-[#6B7280]">
													Tap the dock below or pick a
													preset to log your first
													expense.
												</span>
											)}
										</div>
									) : (
										<div className="divide-y divide-gray-100">
											{filteredTransactions.map(
												(tx, idx) => (
													<SwipeableTransactionItem
														key={tx.id}
														tx={tx}
														hourlyWage={
															incomeSettings.hourlyWage
														}
														isLast={
															idx ===
															Math.min(
																filteredTransactions.length,
																5,
															) -
																1
														}
														onEdit={(
															transactionToEdit,
														) =>
															handleStartEditTransaction(
																transactionToEdit,
															)
														}
														onDelete={(id) => {
															txManager.removeTransaction(
																id,
															);
															setTransactions(
																txManager.getAll(),
															);
														}}
													/>
												),
											)}
										</div>
									)}
								</div>
							</section>

							{/* Ambient Feedback Banner */}
							<div
								className={`fixed bottom-52 inset-x-0 z-40 transition-opacity duration-300 pointer-events-none flex items-center justify-center ${
									toastMessage ? 'opacity-100' : 'opacity-0'
								}`}
								id="quickToast"
								role="status"
								aria-live="polite"
							>
								<div className="flex items-center justify-center py-2 px-4 rounded-full bg-primary text-on-primary text-body-sm font-body-sm shadow-md">
									<CheckCircle2
										size={14}
										className="mr-1.5 text-secondary-fixed"
									/>
									<span id="toastMsg">
										{toastMessage || 'Ready to log'}
									</span>
								</div>
							</div>

							{/* Smart Dashboard Prompt Banner */}
							{activeTab === 'dashboard' &&
								!isDockExpanded &&
								currentSmartPrompt && (
									<div className="fixed bottom-45 inset-x-0 z-40">
										<SmartPromptBanner
											prompt={currentSmartPrompt}
											onAction={handlePromptAction}
											onDismiss={handleDismissPrompt}
										/>
									</div>
								)}

							{/* Dimmed Background Overlay */}
							<motion.div
								style={{
									opacity: bgDimOpacity,
									pointerEvents: isDockExpanded
										? 'auto'
										: 'none',
								}}
								onClick={handleCloseDock}
								className="fixed inset-0 bg-primary/40 backdrop-blur-[2px] z-45 cursor-pointer"
								aria-label="Close expanded action dock"
							/>

							{/* Persistent Bottom Action Dock */}
							<motion.div
								drag="y"
								dragConstraints={{
									top: 0,
									bottom: COLLAPSED_DOCK_Y,
								}}
								dragElastic={0.08}
								onDragEnd={(_, info: PanInfo) => {
									const currentY = dockY.get();
									if (isDockExpanded) {
										if (
											info.offset.y > 50 ||
											info.velocity.y > 150 ||
											currentY > 100
										) {
											handleCloseDock();
										} else {
											animate(dockY, 0, {
												type: 'spring',
												damping: 28,
												stiffness: 320,
											});
										}
									} else {
										if (
											info.offset.y < -40 ||
											info.velocity.y < -150 ||
											currentY < 250
										) {
											setIsDockExpanded(true);
										} else {
											animate(dockY, COLLAPSED_DOCK_Y, {
												type: 'spring',
												damping: 28,
												stiffness: 320,
											});
										}
									}
								}}
								style={{ y: dockY }}
								className="fixed bottom-0 inset-x-0 max-w-120 mx-auto bg-white rounded-t-[28px] border-t border-gray-100 shadow-[0_-6px_25px_rgba(0,0,0,0.08)] flex flex-col z-50 overflow-hidden min-h-142.5 cursor-grab active:cursor-grabbing touch-none select-none pb-[env(safe-area-inset-bottom)]"
							>
								{/* Grab Bar Handle */}
								<div
									onClick={() => {
										if (isDockExpanded) {
											handleCloseDock();
										} else {
											setIsDockExpanded(true);
										}
									}}
									className="w-full pt-3 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing focus:outline-none"
									role="button"
									tabIndex={0}
									aria-label={
										isDockExpanded
											? 'Drag down to collapse'
											: 'Drag up to expand'
									}
								>
									<div className="w-9 h-[4px] bg-[#E5E7EB] rounded-full" />
								</div>

								{/* Money Input */}
								<div className="relative w-full min-h-14.5 flex items-center justify-center">
									{/* Ghost toggle button for income/expense */}
									<motion.div
										className="absolute left-6 inset-y-0 flex items-center z-10"
										initial={{ opacity: 0 }}
										animate={{
											opacity: isDockExpanded ? 1 : 0,
										}}
										transition={{
											duration: 0.3,
											ease: 'easeInOut',
										}}
									>
										<motion.button
											type="button"
											aria-label={
												dockType === 'expense'
													? 'Switch to income (add money)'
													: 'Switch to expense (spend money)'
											}
											onClick={() => {
												const nextType =
													dockType === 'expense'
														? 'income'
														: 'expense';
												setDockType(nextType);
												setDockIconIndex(0);
												setCustomDockIcon(null);
												const targetCats =
													nextType === 'income'
														? INCOME_CATEGORIES
														: EXPENSE_CATEGORIES;
												setSelectedCategory(
													targetCats[0].id,
												);
											}}
											animate={{
												backgroundColor:
													dockType === 'income'
														? 'rgb(236, 253, 245)'
														: 'rgba(0, 0, 0, 0)',
												borderColor:
													dockType === 'income'
														? 'rgb(16, 185, 129)'
														: 'rgb(218, 61, 74)',
												borderStyle:
													dockType === 'income'
														? 'solid'
														: 'dashed',
												color:
													dockType === 'income'
														? 'rgb(5, 150, 105)'
														: 'rgb(218, 61, 74)',
												scale: [0.9, 1],
											}}
											whileTap={{ scale: 0.88 }}
											transition={{
												duration: 0.28,
												ease: 'easeInOut',
											}}
											className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-2 focus:outline-none"
										>
											<motion.span
												key={dockType}
												initial={{
													rotate:
														dockType === 'income'
															? -90
															: 90,
													scale: 0.6,
													opacity: 0,
												}}
												animate={{
													rotate: 0,
													scale: 1,
													opacity: 1,
												}}
												transition={{
													duration: 0.28,
													ease: 'easeInOut',
												}}
												className="flex items-center justify-center"
											>
												{dockType === 'income' ? (
													<Plus
														size={20}
														className="font-bold select-none"
													/>
												) : (
													<Minus
														size={20}
														className="font-bold select-none"
													/>
												)}
											</motion.span>
										</motion.button>
									</motion.div>

									{/* Centered Scaled Display */}
									<motion.div className="flex flex-col items-center justify-center text-center pt-1 pb-1 px-6 w-full">
										<div className="flex items-baseline justify-center tracking-tight">
											<span className="font-headline-lg text-headline-lg font-bold text-on-surface-variant mr-1">
												$
											</span>
											<span
												className="font-numeric-entry text-numeric-entry text-on-surface font-bold tabular-nums"
												id="amount-display"
												data-testid="log-amount-display"
												onClick={() =>
													setIsDockExpanded(true)
												}
											>
												{dockAmount || '0.00'}
											</span>
										</div>
										<motion.div
											initial={{
												opacity: 0,
											}}
											animate={{
												opacity: isDockExpanded ? 1 : 0,
											}}
											transition={{
												duration: 0.1,
											}}
											className="text-body-sm font-body-sm text-outline tracking-tight tabular-nums mt-0.5"
											data-testid="dock-labor-hours"
										>
											{calculateWorkHoursLabel(
												dockAmount,
												incomeSettings.hourlyWage,
											)}
										</motion.div>
									</motion.div>
								</div>

								{/* Expanded Controls: Note, Category Chips, Keypad & CTA Button */}
								<motion.div
									initial={false}
									animate={{
										opacity: isDockExpanded ? 1 : 0,
										height: isDockExpanded ? 'auto' : 0,
									}}
									transition={{ duration: 0.25 }}
									className="flex flex-col px-6 pb-6 pt-1 overflow-hidden"
								>
									{/* Note Input */}
									<div className="flex items-center gap-3 bg-surface-container-low rounded-xl px-4 py-2.5 mb-3 border border-transparent focus-within:border-primary/20">
										<button
											type="button"
											onClick={() =>
												setIsIconPickerOpen(true)
											}
											aria-label="Open icon drawer"
											className={`relative w-10 h-10 rounded-full ${currentDockIcon.bgColor} flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer`}
										>
											<LucideIcon
												name={currentDockIcon.icon}
												size={20}
												style={{
													color: currentDockIcon.iconColor,
												}}
											/>
											<div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-xs overflow-hidden">
												<Pencil size={8} />
											</div>
										</button>
										<div className="flex-1 min-w-0 flex items-center">
											<input
												aria-label="What was this for?"
												className="w-full bg-transparent p-0 m-0 border-none outline-none font-headline-sm text-headline-sm font-semibold text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-0"
												type="text"
												maxLength={40}
												placeholder={
													dockType === 'income'
														? 'e.g. Paycheck'
														: 'e.g. Grocery Store'
												}
												value={dockNote}
												onChange={(e) =>
													setDockNote(e.target.value)
												}
											/>
										</div>
									</div>

									{/* Category Selection Chips */}
									{/* <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-2">
										{currentCategories.map((cat) => {
											const isSelected =
												selectedCategory.toLowerCase() ===
												cat.id.toLowerCase();
											return (
												<button
													key={cat.id}
													type="button"
													onClick={() => {
														setSelectedCategory(
															cat.id,
														);
														setSelectedPresetLabel(
															null,
														);
													}}
													className={`px-3.5 py-1.5 rounded-full text-body-sm font-medium flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
														isSelected
															? 'bg-primary text-on-primary shadow-xs'
															: 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
													}`}
												>
													<span>{cat.emoji}</span>
													<span>{cat.label}</span>
												</button>
											);
										})}
									</div> */}

									{/* Numeric Keypad */}
									<div className="grid grid-cols-3 gap-y-1 gap-x-6 w-full max-w-72 mx-auto mb-4">
										{[
											'1',
											'2',
											'3',
											'4',
											'5',
											'6',
											'7',
											'8',
											'9',
											'.',
											'0',
										].map((val) => (
											<button
												key={val}
												type="button"
												onClick={() =>
													handleKeypadClick(val)
												}
												className="num-key h-14 rounded-full bg-transparent hover:bg-surface-container-low font-headline-lg text-headline-lg font-bold text-on-surface flex items-center justify-center transition-all active:scale-95 active:bg-surface-container cursor-pointer"
											>
												{val}
											</button>
										))}
										<button
											type="button"
											aria-label="Backspace"
											onClick={() =>
												handleKeypadClick('back')
											}
											className="num-key h-14 rounded-full bg-transparent hover:bg-surface-container-low font-headline-lg text-headline-lg font-bold text-on-surface flex items-center justify-center transition-all active:scale-95 active:bg-surface-container cursor-pointer"
										>
											<Delete size={24} />
										</button>
									</div>

									{/* Primary Action CTA */}
									<button
										type="button"
										id="save-expense-btn"
										disabled={isLoggingAction !== 'idle'}
										onClick={handleCommitDockExpense}
										className={`w-full h-13 rounded-xl font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap ${
											isLoggingAction === 'success'
												? 'bg-emerald-600 text-white'
												: isEditAmountZeroOrEmpty
													? 'bg-red-600 hover:bg-red-700 text-white'
													: 'bg-primary text-on-primary'
										}`}
									>
										{isLoggingAction === 'spinning' ? (
											<RotateCw
												size={20}
												className="animate-spin"
											/>
										) : isLoggingAction === 'success' ? (
											<motion.span
												initial={{ scale: 0.5 }}
												animate={{ scale: 1 }}
											>
												<CheckCircle2 size={22} />
											</motion.span>
										) : isEditAmountZeroOrEmpty ? (
											<>
												<span>Delete Transaction</span>
												<Trash2 size={18} />
											</>
										) : (
											<>
												<span>
													{editingTransactionId
														? dockType === 'income'
															? 'Update Income'
															: 'Update Expense'
														: dockType === 'income'
															? 'Log Income'
															: 'Log Expense'}
												</span>
												<ArrowRight size={18} />
											</>
										)}
									</button>
								</motion.div>
							</motion.div>
						</div>
					)}

					{activeTab === 'maps' && (
						<MapsView
							trips={trips}
							onLogTrip={handleLogTrip}
							onDeleteTrip={handleDeleteTrip}
							hourlyWage={incomeSettings.hourlyWage}
							mileageRate={incomeSettings.mileageRate}
							autoTripDetection={autoTripDetection}
							trackingStatus={trackingStatus}
							userLocation={userLocation}
							onUserLocationChange={setUserLocation}
							isLocationEnabled={isLocationEnabled}
							onEnableLocation={(coords) => {
								setIsLocationEnabled(true);
								if (coords) {
									setUserLocation(coords);
								}
							}}
							devTrackingOverlay={devTrackingOverlay}
							enableRouteSimulation={enableRouteSimulation}
							devTelemetry={devTelemetry}
							locations={savedLocations}
							onUpdateLocations={(updated) => {
								setSavedLocations(updated);
								saveLocations(updated);
								const home = updated.find((l) => l.isHome);
								if (home) {
									tripDetectorRef.current?.updateHomeAddress({
										address: home.address,
										lat: home.lat,
										lng: home.lng,
									});
								}
							}}
							onOpenLocationsPage={() =>
								setActiveTab('locations')
							}
							onOpenVehicleSettings={() =>
								setActiveTab('vehicle_settings')
							}
							onEndTripDirect={(destName, coord) => {
								tripDetectorRef.current?.endTripNow(
									destName,
									coord,
								);
							}}
							onUpdateHomeLocation={(homeLoc) => {
								tripDetectorRef.current?.updateHomeAddress({
									address: homeLoc.address,
									lat: homeLoc.lat,
									lng: homeLoc.lng,
								});
							}}
							initialEditLocation={editingLocationFromLocationsList}
							onCloseEditLocation={() => {
								setEditingLocationFromLocationsList(null);
								setActiveTab('locations');
							}}
							onDockStateChange={setIsSecondaryDockOpen}
						/>
					)}

					{activeTab === 'locations' && (
						<LocationsView
							locations={savedLocations}
							onUpdateLocations={(updated) => {
								setSavedLocations(updated);
								saveLocations(updated);
								const home = updated.find((l) => l.isHome);
								if (home) {
									tripDetectorRef.current?.updateHomeAddress({
										address: home.address,
										lat: home.lat,
										lng: home.lng,
									});
								}
							}}
							onBack={() => setActiveTab('maps')}
							currentGps={userLocation}
							onEditLocationOnMap={(location) => {
								setEditingLocationFromLocationsList(location);
								setActiveTab('maps');
							}}
							onDockStateChange={setIsSecondaryDockOpen}
						/>
					)}

					{activeTab === 'vehicle_settings' && (
						<VehicleSettingsView
							settings={incomeSettings}
							onUpdateSettings={setIncomeSettings}
							onBack={() => setActiveTab('maps')}
							wageRate={incomeSettings.hourlyWage}
						/>
					)}

					{activeTab === 'analytics' && (
						<AnalyticsView
							transactions={transactions}
							summary={summary}
							settings={incomeSettings}
							onOpenBreakdown={() => setActiveModal('breakdown')}
						/>
					)}

					{activeTab === 'presets' && (
						<PresetsView
							presets={presets}
							onOpenNewPresetModal={() => {
								setEditingPreset(null);
								setActiveModal('preset');
							}}
							onEditPreset={(preset) => {
								setEditingPreset(preset);
								setActiveModal('preset');
							}}
							onTogglePin={handleTogglePinPreset}
							onReorderPresets={(newOrder) => {
								setPresets(newOrder);
							}}
							onDeletePreset={(id) =>
								setPresets((prev) =>
									prev.filter((p) => p.id !== id),
								)
							}
						/>
					)}

					{activeTab === 'settings' && (
						<div key="settings" className="w-full">
							<SettingsView
								key={initialSettingsSubpage}
								initialSubpage={initialSettingsSubpage}
								settings={incomeSettings}
								onUpdateSettings={setIncomeSettings}
								summary={summary}
								transactions={transactions}
								animationsEnabled={animationsEnabled}
								onToggleAnimations={handleToggleAnimations}
								autoTripDetection={autoTripDetection}
								onToggleAutoTripDetection={setAutoTripDetection}
								devTrackingOverlay={devTrackingOverlay}
								onToggleDevTrackingOverlay={
									setDevTrackingOverlay
								}
								enableRouteSimulation={enableRouteSimulation}
								onToggleRouteSimulation={
									setEnableRouteSimulation
								}
								onUpdateHomeAddress={(home) =>
									tripDetectorRef.current?.updateHomeAddress(
										home,
									)
								}
								onOpenSheet={(sheet) => {
									if (sheet === 'log') {
										setActiveTab('dashboard');
										setIsDockExpanded(true);
									} else {
										setActiveModal(sheet);
									}
								}}
							/>
						</div>
					)}
				</main>

				{/* Bottom Navigation Tab Bar - Slides down to hide when dock is dragged up */}
				<motion.nav
					aria-label="Primary Bottom Navigation"
					style={{ y: combinedNavY }}
					className="fixed bottom-0 inset-x-0 z-50 bg-surface-container-lowest shadow-[0_-2px_12px_rgba(0,0,0,0.03)] pb-[env(safe-area-inset-bottom)]"
				>
					<div className="flex justify-around items-center h-16 max-w-120 mx-auto px-1 sm:px-3">
						{/* 1. Dashboard */}
						<button
							type="button"
							onClick={() => setActiveTab('dashboard')}
							aria-current={
								activeTab === 'dashboard' ? 'page' : undefined
							}
							className={`flex flex-col items-center justify-center flex-1 h-12 transition-all gap-0.5 cursor-pointer ${
								activeTab === 'dashboard'
									? 'text-primary font-bold'
									: 'text-on-surface-variant hover:text-on-surface'
							}`}
						>
							<LayoutGrid size={20} />
							<span className="font-label-sm text-[11px] leading-tight">
								Dashboard
							</span>
						</button>

						{/* 2. Maps */}
						<button
							type="button"
							onClick={() => setActiveTab('maps')}
							aria-current={
								activeTab === 'maps' ? 'page' : undefined
							}
							className={`flex flex-col items-center justify-center flex-1 h-12 transition-all gap-0.5 cursor-pointer ${
								activeTab === 'maps'
									? 'text-primary font-bold'
									: 'text-on-surface-variant hover:text-on-surface'
							}`}
						>
							<Map size={20} />
							<span className="font-label-sm text-[11px] leading-tight">
								Maps
							</span>
						</button>

						{/* 3. Analytics */}
						<button
							type="button"
							onClick={() => setActiveTab('analytics')}
							aria-current={
								activeTab === 'analytics' ? 'page' : undefined
							}
							className={`flex flex-col items-center justify-center flex-1 h-12 transition-all gap-0.5 cursor-pointer ${
								activeTab === 'analytics'
									? 'text-primary font-bold'
									: 'text-on-surface-variant hover:text-on-surface'
							}`}
						>
							<BarChart2 size={20} />
							<span className="font-label-sm text-[11px] leading-tight">
								Analytics
							</span>
						</button>

						{/* 4. Presets */}
						<button
							type="button"
							onClick={() => setActiveTab('presets')}
							aria-current={
								activeTab === 'presets' ? 'page' : undefined
							}
							className={`flex flex-col items-center justify-center flex-1 h-12 transition-all gap-0.5 cursor-pointer ${
								activeTab === 'presets'
									? 'text-primary font-bold'
									: 'text-on-surface-variant hover:text-on-surface'
							}`}
						>
							<SlidersHorizontal size={20} />
							<span className="font-label-sm text-[11px] leading-tight">
								Presets
							</span>
						</button>

						{/* 5. Settings */}
						<button
							type="button"
							onClick={() => {
								setInitialSettingsSubpage('main');
								setActiveTab('settings');
							}}
							aria-current={
								activeTab === 'settings' ? 'page' : undefined
							}
							className={`flex flex-col items-center justify-center flex-1 h-12 transition-all gap-0.5 cursor-pointer ${
								activeTab === 'settings'
									? 'text-primary font-bold'
									: 'text-on-surface-variant hover:text-on-surface'
							}`}
						>
							<Settings size={20} />
							<span className="font-label-sm text-[11px] leading-tight">
								Settings
							</span>
						</button>
					</div>
				</motion.nav>

				{/* Screen 2: Preset Configuration Bottom Sheet Modal - Slides out with spring animation */}
				<PresetSheetModal
					isOpen={activeModal === 'preset'}
					onClose={() => {
						setActiveModal('none');
						setEditingPreset(null);
					}}
					onSavePreset={handleSaveNewPreset}
					mileageRate={incomeSettings.mileageRate}
					hourlyWage={incomeSettings.hourlyWage}
					initialPreset={editingPreset || undefined}
				/>

				{/* Screen 3: Balance Breakdown Bottom Sheet Modal - Slides out with spring animation */}
				<BalanceBreakdownModal
					isOpen={activeModal === 'breakdown'}
					onClose={() => setActiveModal('none')}
					summary={summary}
					settings={incomeSettings}
					onOpenIncomeSettings={() => {
						setActiveModal('none');
						setInitialSettingsSubpage('paycheck');
						setActiveTab('settings');
					}}
				/>

				{/* Interactive Multi-Screen Onboarding Walkthrough */}
				<OnboardingModal
					isOpen={isOnboardingOpen}
					onClose={() => {
						setIsOnboardingOpen(false);
						if (typeof window !== 'undefined') {
							setIsLocationEnabled(
								localStorage.getItem(
									'imcheap_location_enabled',
								) === 'true',
							);
						}
					}}
					onComplete={({
						wage,
						vehicle,
						netpay,
						presets: initialPresets,
					}) => {
						if (typeof window !== 'undefined') {
							setIsLocationEnabled(
								localStorage.getItem(
									'imcheap_location_enabled',
								) === 'true',
							);
						}
						const mileageRate = Number(
							(vehicle.gasPrice / vehicle.mpg).toFixed(2),
						);
						setIncomeSettings((prev) => ({
							...prev,
							hourlyWage: wage,
							mileageRate,
							hoursPerCycle:
								wage > 0
									? Number((netpay / wage).toFixed(1))
									: prev.hoursPerCycle,
						}));
						setPresets(initialPresets);
					}}
				/>

				{/* Dev Tracking Telemetry Overlay */}
				{devTrackingOverlay && (
					<DevTrackingIndicator
						telemetry={devTelemetry}
						onSimulateDeparture={() =>
							tripDetectorRef.current?.simulateDeparture(26)
						}
						onSimulateMicroStop={() =>
							tripDetectorRef.current?.simulateMicroStop()
						}
						onSimulateResumeDriving={() =>
							tripDetectorRef.current?.simulateResumeDriving(30)
						}
						onSimulateDestination={() =>
							tripDetectorRef.current?.simulateDestinationReached()
						}
						onResetToIdle={() =>
							tripDetectorRef.current?.resetToIdle()
						}
					/>
				)}

				{/* Icon Picker Drawer for Dock & Presets */}
				<IconPickerDrawer
					isOpen={isIconPickerOpen}
					onClose={() => setIsIconPickerOpen(false)}
					selectedIcon={currentDockIcon.icon}
					type={dockType}
					onSelectIcon={(selected) => {
						setCustomDockIcon(selected);
					}}
				/>
			</div>
		</MotionConfig>
	);
}
function AnimatedNumber({
	value,
	enabled = true,
	decimals = 2,
	prefix = '$',
}: {
	value: number;
	enabled?: boolean;
	decimals?: number;
	prefix?: string;
}) {
	const [displayVal, setDisplayVal] = useState(value);

	useEffect(() => {
		if (!enabled) {
			setDisplayVal(value);
			return;
		}
		const controls = animate(displayVal, value, {
			duration: 0.8,
			ease: [0.16, 1, 0.3, 1],
			onUpdate: (latest) => setDisplayVal(latest),
		});
		return () => controls.stop();
	}, [value, enabled]);

	return (
		<>
			{prefix}
			{(enabled ? displayVal : value).toFixed(decimals)}
		</>
	);
}
