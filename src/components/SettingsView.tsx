import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
	CheckCircle2,
	Check,
	Edit,
	Calendar,
	Clock,
	ChevronRight,
	Car,
	Gauge,
	Fuel,
	Droplet,
	Milestone,
	Briefcase,
	Zap,
	Search,
	Terminal,
	RotateCw,
	PiggyBank,
	Lightbulb,
	Receipt,
	FileText,
	FileCode,
	Share2,
	CreditCard,
	Home,
	X,
	MapPin,
	LocateFixed,
	Navigation,
} from 'lucide-react';
import {
	IncomeSettings,
	BalanceSummary,
	Transaction,
} from '../utils/expenseMath';
import { SetActionFeedbackButton } from './SetActionFeedbackButton';
import { SubpageHeader } from './SubpageHeader';
import { WheelPicker, WheelPickerWrapper } from './ui/wheel-picker';
import {
	SwipeableShiftItem,
	TimeSelection,
	ShiftItem,
} from './SwipeableShiftItem';
import { reverseGeocode, searchAddresses } from '../utils/mapRouting';
import { SavedHomeAddress } from '../types/maps';
import {
	getSavedHomeAddress,
	saveHomeAddress,
	saveTripEngineConfig,
} from '../utils/tripTracker';

export type SettingsSubpage =
	| 'main'
	| 'paycheck'
	| 'vehicle'
	| 'past_cycles'
	| 'export'
	| 'tax_buffer'
	| 'fuel_economy'
	| 'gas_price'
	| 'tank_capacity';

const getTodayIsoDate = () => {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const formatShiftDate = (isoStr: string) => {
	if (!isoStr) return '';
	const parts = isoStr.split('-').map(Number);
	if (parts.length !== 3 || parts.some(isNaN)) return isoStr;
	const [y, m, d] = parts;
	const dt = new Date(y, m - 1, d);
	return dt.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
};

const formatShortShiftDate = (isoStr: string) => {
	if (!isoStr) return '';
	const parts = isoStr.split('-').map(Number);
	if (parts.length !== 3 || parts.some(isNaN)) return isoStr;
	const [y, m, d] = parts;
	const dt = new Date(y, m - 1, d);
	return dt.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
	});
};

const formatTimeString = (t: TimeSelection) => {
	const minStr = String(t.minute).padStart(2, '0');
	return `${t.hour}:${minStr} ${t.period}`;
};

const calculateShiftHours = (
	start: TimeSelection,
	end: TimeSelection,
): number => {
	const getMinutesFromMidnight = (t: TimeSelection) => {
		let h24 = t.hour;
		if (t.period === 'AM') {
			if (h24 === 12) h24 = 0;
		} else {
			if (h24 !== 12) h24 += 12;
		}
		return h24 * 60 + t.minute;
	};

	const startMins = getMinutesFromMidnight(start);
	const endMins = getMinutesFromMidnight(end);

	if (startMins === endMins) {
		return 8.5;
	}

	let diff = endMins - startMins;
	if (diff < 0) {
		diff += 24 * 60;
	}

	return Math.round((diff / 60) * 100) / 100;
};

export interface SettingsViewProps {
	settings: IncomeSettings;
	onUpdateSettings: (next: IncomeSettings) => void;
	summary?: BalanceSummary;
	transactions?: Transaction[];
	onOpenSheet?: (sheet: 'preset' | 'breakdown' | 'log') => void;
	initialSubpage?: SettingsSubpage;
	animationsEnabled?: boolean;
	onToggleAnimations?: (enabled: boolean) => void;
	autoTripDetection?: boolean;
	onToggleAutoTripDetection?: (enabled: boolean) => void;
	devTrackingOverlay?: boolean;
	onToggleDevTrackingOverlay?: (enabled: boolean) => void;
	enableRouteSimulation?: boolean;
	onToggleRouteSimulation?: (enabled: boolean) => void;
	onUpdateHomeAddress?: (home: SavedHomeAddress) => void;
}

const slideVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? 100 : -100,
		opacity: 0,
	}),
	center: {
		x: 0,
		opacity: 1,
	},
	exit: (direction: number) => ({
		x: direction > 0 ? -100 : 100,
		opacity: 0,
	}),
};

export const SettingsView: React.FC<SettingsViewProps> = ({
	settings,
	onUpdateSettings,
	summary = {
		basePaycheck: 0.0,
		loggedExpenses: 0.0,
		totalIncome: 0.0,
		availableBalance: 0.0,
		percentLeft: 100,
		unspentWorkHours: '0.0',
		itemCount: 0,
	},
	transactions = [],
	initialSubpage = 'main',
	animationsEnabled = true,
	onToggleAnimations,
	autoTripDetection: propsAutoTripDetection,
	onToggleAutoTripDetection,
	devTrackingOverlay: propsDevTrackingOverlay,
	onToggleDevTrackingOverlay,
	enableRouteSimulation: propsEnableRouteSimulation,
	onToggleRouteSimulation,
	onUpdateHomeAddress,
}) => {
	const [currentSubpage, setCurrentSubpage] =
		useState<SettingsSubpage>(initialSubpage);
	const [direction, setDirection] = useState<number>(1);

	const navigateTo = (nextPage: SettingsSubpage) => {
		setDirection(1);
		setCurrentSubpage(nextPage);
	};

	const navigateBack = (targetPage: SettingsSubpage = 'main') => {
		setDirection(-1);
		setCurrentSubpage(targetPage);
	};

	// Preferences toggles
	const [showTimeWorked, setShowTimeWorked] = useState(true);
	const [internalAnimations, setInternalAnimations] =
		useState(animationsEnabled);

	const isAnimationsActive = onToggleAnimations
		? animationsEnabled
		: internalAnimations;

	const handleToggleAnimations = () => {
		const next = !isAnimationsActive;
		if (onToggleAnimations) {
			onToggleAnimations(next);
		} else {
			setInternalAnimations(next);
		}
	};

	// Home Address Setting State
	const [homeAddress, setHomeAddress] = useState<SavedHomeAddress>(() => {
		return getSavedHomeAddress();
	});
	const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
	const [addressQuery, setAddressQuery] = useState('');
	const [addressResults, setAddressResults] = useState<
		Array<{ label: string; lat: number; lng: number }>
	>([]);
	const [isSearchingAddress, setIsSearchingAddress] = useState(false);
	const addressSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleSearchAddressChange = (val: string) => {
		setAddressQuery(val);

		if (addressSearchTimeoutRef.current) {
			clearTimeout(addressSearchTimeoutRef.current);
		}

		if (val.trim().length >= 3) {
			setIsSearchingAddress(true);
			addressSearchTimeoutRef.current = setTimeout(async () => {
				const results = await searchAddresses(val);
				setAddressResults(results);
				setIsSearchingAddress(false);
			}, 400);
		} else {
			setAddressResults([]);
			setIsSearchingAddress(false);
		}
	};

	const handleSelectHomeAddress = (item: {
		label: string;
		lat: number;
		lng: number;
	}) => {
		const newHome: SavedHomeAddress = {
			address: item.label,
			lat: item.lat,
			lng: item.lng,
		};
		setHomeAddress(newHome);
		saveHomeAddress(newHome);
		onUpdateHomeAddress?.(newHome);
		setIsLocationModalOpen(false);
		setAddressQuery('');
		setAddressResults([]);
	};

	const handleUseCurrentGpsAsHome = () => {
		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				async (pos) => {
					const coords = {
						lat: pos.coords.latitude,
						lng: pos.coords.longitude,
					};
					const addr = await reverseGeocode(coords);
					const newHome: SavedHomeAddress = {
						address:
							addr ||
							`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
						lat: coords.lat,
						lng: coords.lng,
					};
					setHomeAddress(newHome);
					saveHomeAddress(newHome);
					onUpdateHomeAddress?.(newHome);
					setIsLocationModalOpen(false);
				},
				() => {
					setIsLocationModalOpen(false);
				},
				{ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
			);
		} else {
			setIsLocationModalOpen(false);
		}
	};

	// Paycheck Engine State
	const [shifts, setShifts] = useState<ShiftItem[]>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_shifts');
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed)) {
						const fallbackDate = getTodayIsoDate();
						return parsed.map((s: any) => ({
							id:
								s.id ||
								`shift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
							hours: typeof s.hours === 'number' ? s.hours : 8,
							date: s.date || fallbackDate,
						}));
					}
				}
			} catch (e) {
				console.warn('Failed to parse shifts from localStorage', e);
			}
		}
		return [];
	});

	React.useEffect(() => {
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('imcheap_shifts', JSON.stringify(shifts));
			} catch (e) {
				console.warn('Failed to save shifts to localStorage', e);
			}
		}
	}, [shifts]);

	const [selectedShiftDate, setSelectedShiftDate] =
		useState<string>(getTodayIsoDate);
	const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
	const [] = useState<string>('8.5');
	const [taxBufferRate, setTaxBufferRate] = useState<number>(12); // percent
	const [tempTaxBuffer, setTempTaxBuffer] = useState<number>(12);
	const [paycheckToast, setPaycheckToast] = useState(false);
	const [wageInput, setWageInput] = useState('');

	const [tempYear, setTempYear] = useState<string>(() =>
		String(new Date().getFullYear()),
	);
	const [tempMonth, setTempMonth] = useState<string>(() =>
		String(new Date().getMonth() + 1).padStart(2, '0'),
	);
	const [tempDay, setTempDay] = useState<string>(() =>
		String(new Date().getDate()).padStart(2, '0'),
	);

	const openDatePicker = () => {
		const [y, m, d] = (selectedShiftDate || getTodayIsoDate()).split('-');
		setTempYear(y || String(new Date().getFullYear()));
		setTempMonth(m || String(new Date().getMonth() + 1).padStart(2, '0'));
		setTempDay(d || String(new Date().getDate()).padStart(2, '0'));
		setIsDatePickerOpen(true);
	};

	const handleSaveDate = () => {
		const validDay = Math.min(
			Number(tempDay),
			new Date(Number(tempYear), Number(tempMonth), 0).getDate(),
		);
		const formattedDay = String(validDay).padStart(2, '0');
		setSelectedShiftDate(`${tempYear}-${tempMonth}-${formattedDay}`);
		setIsDatePickerOpen(false);
	};

	const monthOptions = [
		{ value: '01', label: 'Jan' },
		{ value: '02', label: 'Feb' },
		{ value: '03', label: 'Mar' },
		{ value: '04', label: 'Apr' },
		{ value: '05', label: 'May' },
		{ value: '06', label: 'Jun' },
		{ value: '07', label: 'Jul' },
		{ value: '08', label: 'Aug' },
		{ value: '09', label: 'Sep' },
		{ value: '10', label: 'Oct' },
		{ value: '11', label: 'Nov' },
		{ value: '12', label: 'Dec' },
	];

	const currentYearNum = new Date().getFullYear();
	const yearOptions = [
		{
			value: String(currentYearNum - 2),
			label: String(currentYearNum - 2),
		},
		{
			value: String(currentYearNum - 1),
			label: String(currentYearNum - 1),
		},
		{ value: String(currentYearNum), label: String(currentYearNum) },
		{
			value: String(currentYearNum + 1),
			label: String(currentYearNum + 1),
		},
		{
			value: String(currentYearNum + 2),
			label: String(currentYearNum + 2),
		},
	];

	const daysInSelectedMonth = new Date(
		Number(tempYear),
		Number(tempMonth),
		0,
	).getDate();
	const dayOptions = Array.from({ length: daysInSelectedMonth }, (_, i) => {
		const dayVal = String(i + 1).padStart(2, '0');
		return { value: dayVal, label: String(i + 1) };
	});

	// Time State for Shift Entry
	const [startTime, setStartTime] = useState<TimeSelection>({
		hour: 9,
		minute: 0,
		period: 'AM',
	});
	const [endTime, setEndTime] = useState<TimeSelection>({
		hour: 5,
		minute: 30,
		period: 'PM',
	});
	const [activeTimePickerTarget, setActiveTimePickerTarget] = useState<
		'start' | 'end' | null
	>(null);
	const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

	const handleStartEditShift = (shift: ShiftItem) => {
		setEditingShiftId(shift.id);
		setSelectedShiftDate(shift.date);
		if (shift.startTime) {
			setStartTime(shift.startTime);
		}
		if (shift.endTime) {
			setEndTime(shift.endTime);
		}
	};

	const handleCancelEditShift = () => {
		setEditingShiftId(null);
	};

	const [tempTimeHour, setTempTimeHour] = useState<string>('9');
	const [tempTimeMinute, setTempTimeMinute] = useState<string>('00');
	const [tempTimePeriod, setTempTimePeriod] = useState<string>('AM');

	const openTimePicker = (target: 'start' | 'end') => {
		const current = target === 'start' ? startTime : endTime;
		setTempTimeHour(String(current.hour));
		setTempTimeMinute(String(current.minute).padStart(2, '0'));
		setTempTimePeriod(current.period);
		setActiveTimePickerTarget(target);
	};

	const handleSaveTime = () => {
		if (!activeTimePickerTarget) return;
		const updated: TimeSelection = {
			hour: Number(tempTimeHour) || 9,
			minute: Number(tempTimeMinute) || 0,
			period: tempTimePeriod === 'PM' ? 'PM' : 'AM',
		};
		if (activeTimePickerTarget === 'start') {
			setStartTime(updated);
		} else {
			setEndTime(updated);
		}
		setActiveTimePickerTarget(null);
	};

	const hourOptions = Array.from({ length: 12 }, (_, i) => {
		const val = String(i + 1);
		return { value: val, label: val };
	});

	const minuteOptions = [
		{ value: '00', label: '00' },
		{ value: '15', label: '15' },
		{ value: '30', label: '30' },
		{ value: '45', label: '45' },
	];

	const periodOptions = [
		{ value: 'AM', label: 'AM' },
		{ value: 'PM', label: 'PM' },
	];

	// Vehicle & Transit State
	const mpgOptions = [25, 30, 35, 40];
	const gasOptions = [3.55, 3.95, 4.35, 4.79];
	const capOptions = [12.0, 14.0, 16.5, 18.0];
	const [customMpg, setCustomMpg] = useState<number | null>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_vehicle');
				if (saved) {
					const v = JSON.parse(saved);
					if (v?.mpg && !mpgOptions.includes(v.mpg)) return v.mpg;
				}
			} catch {}
		}
		return null;
	});
	const [mpgIdx, setMpgIdx] = useState<number | null>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_vehicle');
				if (saved) {
					const v = JSON.parse(saved);
					if (v?.mpg) {
						const idx = mpgOptions.indexOf(v.mpg);
						if (idx !== -1) return idx;
						return null;
					}
				}
			} catch {}
		}
		return 1;
	});
	const [customMpgInput, setCustomMpgInput] = useState('');

	const [customGas, setCustomGas] = useState<number | null>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_vehicle');
				if (saved) {
					const v = JSON.parse(saved);
					if (v?.gasPrice && !gasOptions.includes(v.gasPrice))
						return v.gasPrice;
				}
			} catch {}
		}
		return null;
	});
	const [gasIdx, setGasIdx] = useState<number | null>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_vehicle');
				if (saved) {
					const v = JSON.parse(saved);
					if (v?.gasPrice) {
						const idx = gasOptions.indexOf(v.gasPrice);
						if (idx !== -1) return idx;
						return null;
					}
				}
			} catch {}
		}
		return 1;
	});
	const [customGasInput, setCustomGasInput] = useState('');

	const [capIdx, setCapIdx] = useState<number | null>(1);
	const [customCap, setCustomCap] = useState<number | null>(null);
	const [customCapInput, setCustomCapInput] = useState('');

	const [] = useState(false);

	// Automatic Trip Detection State
	const [autoTripDetection, setAutoTripDetection] = useState<boolean>(() => {
		if (typeof propsAutoTripDetection === 'boolean') {
			return propsAutoTripDetection;
		}
		if (typeof window !== 'undefined') {
			try {
				return (
					localStorage.getItem('imcheap_auto_trip_detection') ===
					'true'
				);
			} catch {}
		}
		return false;
	});

	const handleToggleTripDetection = () => {
		const next = !autoTripDetection;
		setAutoTripDetection(next);
		try {
			localStorage.setItem('imcheap_auto_trip_detection', String(next));
		} catch {}
		if (onToggleAutoTripDetection) {
			onToggleAutoTripDetection(next);
		}
	};

	// Dev Tracking Overlay & Dwell Threshold State
	const [devTrackingOverlay, setDevTrackingOverlay] = useState<boolean>(
		() => {
			if (typeof propsDevTrackingOverlay === 'boolean') {
				return propsDevTrackingOverlay;
			}
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

	const [destinationDwellMins, setDestinationDwellMins] = useState<number>(
		() => {
			if (typeof window !== 'undefined') {
				try {
					const saved = localStorage.getItem(
						'imcheap_trip_engine_config',
					);
					if (saved) {
						const cfg = JSON.parse(saved);
						if (cfg?.destinationDwellMinutes) {
							return cfg.destinationDwellMinutes;
						}
					}
				} catch {}
			}
			return 5;
		},
	);

	const handleToggleDevTrackingOverlay = () => {
		const next = !devTrackingOverlay;
		setDevTrackingOverlay(next);
		try {
			localStorage.setItem('imcheap_dev_tracking_overlay', String(next));
		} catch {}
		if (onToggleDevTrackingOverlay) {
			onToggleDevTrackingOverlay(next);
		}
	};

	// Dev Route Simulation State
	const [enableRouteSimulation, setEnableRouteSimulation] = useState<boolean>(
		() => {
			if (typeof propsEnableRouteSimulation === 'boolean') {
				return propsEnableRouteSimulation;
			}
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

	const handleToggleRouteSimulation = () => {
		const next = !enableRouteSimulation;
		setEnableRouteSimulation(next);
		try {
			localStorage.setItem(
				'imcheap_enable_route_simulation',
				String(next),
			);
		} catch {}
		if (onToggleRouteSimulation) {
			onToggleRouteSimulation(next);
		}
	};

	const handleChangeDestinationDwell = (mins: number) => {
		setDestinationDwellMins(mins);
		saveTripEngineConfig({ destinationDwellMinutes: mins });
	};

	// Export State
	const [exportRange, setExportRange] = useState<'current' | 'ytd' | 'all'>(
		'ytd',
	);
	const [includeExpenses, setIncludeExpenses] = useState(true);
	const [includeShifts, setIncludeShifts] = useState(true);
	const [includeMileage, setIncludeMileage] = useState(true);
	const [exportFormat, setExportFormat] = useState<'CSV' | 'JSON'>('CSV');
	const [exportingStatus, setExportingStatus] = useState<string | null>(null);

	// Helper calculations for Paycheck Engine
	const totalAccruedHours = shifts.reduce((sum, s) => sum + s.hours, 0);
	const wageRate = settings.hourlyWage;
	const isWageConfigured = wageRate > 0;
	const grossEarned = totalAccruedHours * wageRate;
	const taxBufferAmt = grossEarned * (taxBufferRate / 100);
	const projectedCheck = grossEarned - taxBufferAmt;

	const calculatedShiftHours = calculateShiftHours(startTime, endTime);

	const currentShiftGrossPreview = isWageConfigured
		? (calculatedShiftHours * wageRate).toLocaleString('en-US', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})
		: '0.00';

	const handleAddOrUpdateShift = () => {
		if (wageRate <= 0) return;
		if (calculatedShiftHours <= 0) return;

		if (editingShiftId) {
			setShifts((prev) =>
				prev.map((s) =>
					s.id === editingShiftId
						? {
								...s,
								hours: calculatedShiftHours,
								date: selectedShiftDate || getTodayIsoDate(),
								startTime,
								endTime,
							}
						: s,
				),
			);
			setEditingShiftId(null);
		} else {
			const newShift: ShiftItem = {
				id: `shift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
				hours: calculatedShiftHours,
				date: selectedShiftDate || getTodayIsoDate(),
				startTime,
				endTime,
			};
			setShifts((prev) => [...prev, newShift]);
		}
		setPaycheckToast(true);
		setTimeout(() => setPaycheckToast(false), 1800);
	};

	const handleRemoveShift = (id: string) => {
		setShifts((prev) => prev.filter((s) => s.id !== id));
	};

	const handleClearAllShifts = () => {
		setShifts([]);
	};

	const sortedShifts = [...shifts].sort((a, b) => {
		const dateDiff = b.date.localeCompare(a.date);
		if (dateDiff !== 0) return dateDiff;
		return b.id.localeCompare(a.id);
	});

	// Helper calculations for Vehicle Math
	const currentMpg = customMpg ?? (mpgIdx !== null ? mpgOptions[mpgIdx] : 29);
	const currentGas =
		customGas ?? (gasIdx !== null ? gasOptions[gasIdx] : 4.05);
	const currentCap =
		customCap ?? (capIdx !== null ? capOptions[capIdx] : 14.0);
	const vehicleCostPerMile = currentGas / currentMpg;
	const maxRange = Math.round(currentMpg * currentCap);
	const commuteCost = vehicleCostPerMile * 10;
	const wagePerMin = wageRate / 60;
	const commuteMinutes =
		wagePerMin > 0 ? (commuteCost / wagePerMin).toFixed(1) : '0';
	const tankCost = currentGas * currentCap;
	const tankHours = wageRate > 0 ? (tankCost / wageRate).toFixed(1) : '0';

	React.useEffect(() => {
		const newRate = Number(vehicleCostPerMile.toFixed(2));
		if (newRate > 0 && Math.abs(newRate - settings.mileageRate) > 0.0001) {
			onUpdateSettings({
				...settings,
				mileageRate: newRate,
			});
			if (typeof window !== 'undefined') {
				try {
					localStorage.setItem(
						'imcheap_vehicle',
						JSON.stringify({
							mpg: currentMpg,
							gasPrice: currentGas,
						}),
					);
				} catch (e) {
					console.warn(
						'Failed to save vehicle settings to localStorage',
						e,
					);
				}
			}
		}
	}, [
		currentGas,
		currentMpg,
		vehicleCostPerMile,
		settings.mileageRate,
		onUpdateSettings,
	]);

	// Past cycles history
	interface PastCycleItem {
		id: string;
		label: string;
		spent: number;
		check: number;
		surplus: number;
		isDeficit: boolean;
	}
	const pastCycles: PastCycleItem[] = [];
	const lifetimeSurplus = pastCycles.reduce((sum, c) => sum + c.surplus, 0);

	const handleExecuteExport = () => {
		setExportingStatus('GENERATING FILE...');
		setTimeout(() => {
			let content = '';
			const filename = `imcheap-export-${exportRange}.${exportFormat.toLowerCase()}`;
			if (exportFormat === 'JSON') {
				const payload = {
					range: exportRange,
					exportedAt: new Date().toISOString(),
					settings,
					expenses: includeExpenses ? transactions : [],
					shifts: includeShifts ? shifts : [],
					mileageBenchmark: includeMileage
						? {
								mpg: currentMpg,
								gasPrice: currentGas,
								costPerMile: vehicleCostPerMile,
							}
						: null,
				};
				content = JSON.stringify(payload, null, 2);
			} else {
				const rows: string[] = ['ID,Title,Category,Amount,Type,Date'];
				if (includeExpenses) {
					transactions.forEach((tx) => {
						rows.push(
							`"${tx.id}","${tx.title}","${tx.category}",${tx.amount.toFixed(2)},"${tx.type}","${tx.timestamp}"`,
						);
					});
				}
				content = rows.join('\n');
			}

			const blob = new Blob([content], {
				type: exportFormat === 'JSON' ? 'application/json' : 'text/csv',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			setExportingStatus('READY • EXPORT COMPLETE');
			setTimeout(() => {
				setExportingStatus(null);
			}, 1600);
		}, 600);
	};

	return (
		<div className="relative w-full overflow-hidden">
			<AnimatePresence initial={false} custom={direction} mode="wait">
				{/* SUBPAGE: TAX BUFFER */}
				{currentSubpage === 'tax_buffer' && (
					<motion.div
						key="tax_buffer"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="w-full flex flex-col"
					>
						<SubpageHeader
							title="Tax Buffer"
							backLabel="Paycheck"
							onBack={() => navigateBack('paycheck')}
						/>

						<div className="bg-white rounded-2xl p-5 border border-[#F3F4F6] shadow-sm space-y-4">
							<div>
								<span className="text-xs uppercase tracking-wider text-outline font-bold">
									Estimated Tax Withholding
								</span>
								<p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
									Choose a percentage buffer to deduct
									automatically from projected paycheck
									totals.
								</p>
							</div>

							{/* Separate 0% Option */}
							<div>
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5 block">
									No Withholding
								</span>
								<button
									type="button"
									onClick={() => setTempTaxBuffer(0)}
									className="w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left"
									style={{
										borderColor:
											tempTaxBuffer === 0
												? '#111111'
												: '#F3F4F6',
										backgroundColor:
											tempTaxBuffer === 0
												? '#F9FAFB'
												: '#FFFFFF',
									}}
								>
									<div className="flex flex-col">
										<span className="font-semibold text-sm text-on-surface">
											0% (None)
										</span>
										<span className="text-xs text-outline">
											No tax buffer deduction from
											paycheck
										</span>
									</div>
									{tempTaxBuffer === 0 && (
										<CheckCircle2
											className="text-primary"
											size={20}
										/>
									)}
								</button>
							</div>

							<div className="h-px bg-slate-100 my-1" />

							{/* Percentage Buffer Selection */}
							<div>
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5 block">
									Buffer Rates
								</span>
								<div className="flex flex-col space-y-2">
									{[8, 10, 12, 15, 20, 25].map((pct) => (
										<button
											key={pct}
											type="button"
											onClick={() =>
												setTempTaxBuffer(pct)
											}
											className="w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left"
											style={{
												borderColor:
													tempTaxBuffer === pct
														? '#111111'
														: '#F3F4F6',
												backgroundColor:
													tempTaxBuffer === pct
														? '#F9FAFB'
														: '#FFFFFF',
											}}
										>
											<div className="flex flex-col">
												<span className="font-semibold text-sm text-on-surface">
													{pct}% Buffer
												</span>
												<span className="text-xs text-outline">
													{pct === 12
														? 'Recommended standard for part-time income'
														: 'Estimated withholding deduction'}
												</span>
											</div>
											{tempTaxBuffer === pct && (
												<CheckCircle2
													className="text-primary"
													size={20}
												/>
											)}
										</button>
									))}
								</div>
							</div>

							<button
								type="button"
								onClick={() => {
									setTaxBufferRate(tempTaxBuffer);
									navigateBack('paycheck');
								}}
								className="w-full h-12.5 bg-primary text-on-primary rounded-xl font-semibold text-sm shadow-md active:scale-[0.98] transition-transform cursor-pointer"
							>
								Save Tax Buffer
							</button>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE: FUEL ECONOMY */}
				{currentSubpage === 'fuel_economy' && (
					<motion.div
						key="fuel_economy"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="w-full flex flex-col"
					>
						<SubpageHeader
							title="Fuel Economy"
							backLabel="Vehicle"
							onBack={() => navigateBack('vehicle')}
						/>

						<div className="bg-white rounded-2xl p-5 border border-[#F3F4F6] shadow-sm space-y-4">
							<div>
								<span className="text-xs uppercase tracking-wider text-outline font-bold">
									Vehicle Mileage Rating
								</span>
								<p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
									Select your vehicle's combined average fuel
									economy (Miles Per Gallon).
								</p>
							</div>

							<div className="flex flex-col space-y-2">
								{mpgOptions.map((mpg, idx) => {
									const isSelected =
										customMpg === null && mpgIdx === idx;
									return (
										<button
											key={mpg}
											type="button"
											onClick={() => {
												setCustomMpg(null);
												setMpgIdx(idx);
											}}
											className="w-full p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left"
											style={{
												borderColor: isSelected
													? '#111111'
													: '#F3F4F6',
												backgroundColor: isSelected
													? '#F9FAFB'
													: '#FFFFFF',
											}}
										>
											<div className="flex flex-col">
												<span className="font-semibold text-base text-on-surface">
													{mpg} MPG
												</span>
												<span className="text-xs text-outline">
													{mpg === 25
														? 'Standard SUV / Truck'
														: mpg === 29
															? 'Average compact sedan'
															: mpg === 34
																? 'High efficiency subcompact'
																: 'Hybrid vehicle benchmark'}
												</span>
											</div>
											{isSelected && (
												<CheckCircle2
													className="text-primary"
													size={20}
												/>
											)}
										</button>
									);
								})}
							</div>

							{/* Custom MPG Input */}
							<div className="pt-2 border-t border-[#F3F4F6]">
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2 block">
									Custom Value
								</span>
								<div className="flex items-center gap-2">
									<div className="relative flex-1 group">
										<input
											type="number"
											step="any"
											min="1"
											max="150"
											value={customMpgInput}
											onChange={(e) =>
												setCustomMpgInput(
													e.target.value,
												)
											}
											placeholder={
												customMpg
													? `${customMpg} MPG`
													: 'Enter custom MPG...'
											}
											className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 tabular-nums"
										/>
										<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-outline pointer-events-none">
											MPG
										</span>
									</div>
									<SetActionFeedbackButton
										onAction={() => {
											const val =
												parseFloat(customMpgInput);
											if (!isNaN(val) && val > 0) {
												setCustomMpg(val);
												setMpgIdx(null);

												return true;
											}
											return false;
										}}
									/>
								</div>
								{customMpg !== null && (
									<p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
										<Check size={14} />
										Current custom: {customMpg} MPG
									</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE: GAS PRICE */}
				{currentSubpage === 'gas_price' && (
					<motion.div
						key="gas_price"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="w-full flex flex-col"
					>
						<SubpageHeader
							title="Gas Price"
							backLabel="Vehicle"
							onBack={() => navigateBack('vehicle')}
						/>

						<div className="bg-white rounded-2xl p-5 border border-[#F3F4F6] shadow-sm space-y-4">
							<div>
								<span className="text-xs uppercase tracking-wider text-outline font-bold">
									Fuel Station Cost
								</span>
								<p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
									Select your regional gas pump rate to
									calibrate per-mile expense calculations.
								</p>
							</div>

							<div className="flex flex-col space-y-2">
								{gasOptions.map((price, idx) => {
									const isSelected =
										customGas === null && gasIdx === idx;
									return (
										<button
											key={price}
											type="button"
											onClick={() => {
												setCustomGas(null);
												setGasIdx(idx);
											}}
											className="w-full p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left"
											style={{
												borderColor: isSelected
													? '#111111'
													: '#F3F4F6',
												backgroundColor: isSelected
													? '#F9FAFB'
													: '#FFFFFF',
											}}
										>
											<div className="flex flex-col">
												<span className="font-semibold text-base text-on-surface">
													${price.toFixed(2)} / gallon
												</span>
												<span className="text-xs text-outline">
													{price === 3.65
														? 'Low regional benchmark'
														: price === 4.05
															? 'National average benchmark'
															: price === 4.45
																? 'Metro regional benchmark'
																: 'Premium / High-cost benchmark'}
												</span>
											</div>
											{isSelected && (
												<CheckCircle2
													className="text-primary"
													size={20}
												/>
											)}
										</button>
									);
								})}
							</div>

							{/* Custom Gas Price Input */}
							<div className="pt-2 border-t border-[#F3F4F6]">
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2 block">
									Custom Value
								</span>
								<div className="flex items-center gap-2">
									<div className="relative flex-1 group">
										<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-outline pointer-events-none">
											$
										</span>
										<input
											type="number"
											step="0.01"
											min="0.5"
											max="20"
											value={customGasInput}
											onChange={(e) =>
												setCustomGasInput(
													e.target.value,
												)
											}
											placeholder={
												customGas
													? `${customGas.toFixed(2)}`
													: 'Enter gas price...'
											}
											className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-7 pr-12 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 tabular-nums"
										/>
										<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-outline pointer-events-none">
											/gal
										</span>
									</div>
									<SetActionFeedbackButton
										onAction={() => {
											const val =
												parseFloat(customGasInput);
											if (!isNaN(val) && val > 0) {
												setCustomGas(val);
												setGasIdx(null);

												return true;
											}
											return false;
										}}
									/>
								</div>
								{customGas !== null && (
									<p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
										<Check size={14} />
										Current custom: ${customGas.toFixed(
											2,
										)}{' '}
										/ gallon
									</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE: TANK CAPACITY */}
				{currentSubpage === 'tank_capacity' && (
					<motion.div
						key="tank_capacity"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="w-full flex flex-col"
					>
						<SubpageHeader
							title="Tank Capacity"
							backLabel="Vehicle"
							onBack={() => navigateBack('vehicle')}
						/>

						<div className="bg-white rounded-2xl p-5 border border-[#F3F4F6] shadow-sm space-y-4">
							<div>
								<span className="text-xs uppercase tracking-wider text-outline font-bold">
									Fuel Reservoir
								</span>
								<p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
									Select your vehicle's total fuel tank volume
									in gallons.
								</p>
							</div>

							<div className="flex flex-col space-y-2">
								{capOptions.map((cap, idx) => {
									const isSelected =
										customCap === null && capIdx === idx;
									return (
										<button
											key={cap}
											type="button"
											onClick={() => {
												setCustomCap(null);
												setCapIdx(idx);
											}}
											className="w-full p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left"
											style={{
												borderColor: isSelected
													? '#111111'
													: '#F3F4F6',
												backgroundColor: isSelected
													? '#F9FAFB'
													: '#FFFFFF',
											}}
										>
											<div className="flex flex-col">
												<span className="font-semibold text-base text-on-surface">
													{cap.toFixed(1)} Gallons
												</span>
												<span className="text-xs text-outline">
													{cap === 12
														? 'Compact hatchback (e.g. Civic / Corolla)'
														: cap === 14
															? 'Mid-size sedan (e.g. Accord / Camry)'
															: cap === 16.5
																? 'Crossover / Small SUV'
																: 'Full-size SUV / Truck'}
												</span>
											</div>
											{isSelected && (
												<CheckCircle2
													className="text-primary"
													size={20}
												/>
											)}
										</button>
									);
								})}
							</div>

							{/* Custom Tank Capacity Input */}
							<div className="pt-2 border-t border-[#F3F4F6]">
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2 block">
									Custom Value
								</span>
								<div className="flex items-center gap-2">
									<div className="relative flex-1 group">
										<input
											type="number"
											step="0.1"
											min="1"
											max="100"
											value={customCapInput}
											onChange={(e) =>
												setCustomCapInput(
													e.target.value,
												)
											}
											placeholder={
												customCap
													? `${customCap.toFixed(1)} gal`
													: 'Enter tank size...'
											}
											className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 tabular-nums"
										/>
										<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-outline pointer-events-none">
											gal
										</span>
									</div>
									<SetActionFeedbackButton
										onAction={() => {
											const val =
												parseFloat(customCapInput);
											if (!isNaN(val) && val > 0) {
												setCustomCap(val);
												setCapIdx(null);

												return true;
											}
											return false;
										}}
									/>
								</div>
								{customCap !== null && (
									<p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
										<Check size={14} />
										Current custom: {customCap.toFixed(
											1,
										)}{' '}
										Gallons
									</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE 1: PAYCHECK ENGINE */}
				{currentSubpage === 'paycheck' && (
					<motion.div
						key="paycheck"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="flex flex-col w-full -mt-2"
					>
						{/* Subpage Header */}
						<SubpageHeader
							title="Paycheck Engine"
							backLabel="Settings"
							onBack={() => navigateBack('main')}
						/>

						<div className="flex flex-col gap-y-3.5">
							{/* Hourly Wage Card */}
							<div className="w-full bg-white rounded-2xl p-4 border border-[#F3F4F6] shadow-sm flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<div>
										<span className="font-semibold text-sm text-on-surface">
											Hourly Wage
										</span>
										<p className="text-xs text-on-surface-variant">
											Base hourly rate for labor
											calculations
										</p>
									</div>
									<span className="text-[18px] font-bold text-on-surface tabular-nums">
										${settings.hourlyWage.toFixed(2)}/hr
									</span>
								</div>
								<div className="flex items-center gap-2 pt-1">
									<div className="relative flex-1 group">
										<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-outline pointer-events-none">
											$
										</span>
										<input
											type="number"
											step="0.50"
											min="1"
											max="500"
											value={wageInput}
											onChange={(e) =>
												setWageInput(e.target.value)
											}
											placeholder={settings.hourlyWage.toFixed(
												2,
											)}
											className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-7 pr-12 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 tabular-nums"
										/>
										<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-outline pointer-events-none">
											/hr
										</span>
									</div>
									<SetActionFeedbackButton
										onAction={() => {
											const val = parseFloat(wageInput);
											if (!isNaN(val) && val > 0) {
												onUpdateSettings({
													...settings,
													hourlyWage: val,
												});
												if (
													typeof window !==
													'undefined'
												) {
													try {
														localStorage.setItem(
															'imcheap_wage',
															String(val),
														);
													} catch (e) {
														console.warn(
															'Failed to save wage to localStorage',
															e,
														);
													}
												}
												return true;
											}
											return false;
										}}
									/>
								</div>
							</div>
							{/* Active Cycle Card */}
							<div className="w-full bg-white rounded-2xl p-4 border border-[#F3F4F6] shadow-sm flex flex-col gap-1">
								<span className="font-medium text-xs text-on-surface-variant uppercase tracking-wider">
									Current Month's Balance
								</span>
								<div className="text-[20px] leading-7 font-bold text-on-surface tabular-nums">
									${summary.basePaycheck.toFixed(2)}
								</div>
								<p className="text-xs text-[#6B7280]">
									Active cycle • {summary.itemCount} logged
									expenses
								</p>
							</div>

							{/* Building for Next Month Card */}
							<div className="w-full bg-white rounded-2xl p-4 sm:p-5 border border-[#F3F4F6] shadow-sm flex flex-col">
								<div className="flex items-center justify-between">
									<h3 className="font-semibold text-base text-on-surface">
										Building for Next Month
									</h3>
									<span className="bg-surface-container-low px-2.5 py-0.5 rounded-full text-xs font-medium text-primary flex items-center gap-1">
										<span>🗓️</span>
										<span>Unlocks Next Cycle</span>
									</span>
								</div>
								<div className="text-[32px] leading-9 font-bold tracking-tight text-on-surface my-2.5 tabular-nums">
									{totalAccruedHours % 1 === 0
										? totalAccruedHours.toFixed(0)
										: totalAccruedHours.toFixed(1)}{' '}
									hrs
								</div>
								<div className="flex flex-col gap-2 pt-1">
									<div className="flex items-center justify-between text-sm font-medium">
										<span className="text-on-surface-variant">
											Gross Earned ({totalAccruedHours}h @
											${wageRate}/hr)
										</span>
										<span className="text-on-surface-variant font-medium tabular-nums">
											$
											{grossEarned.toLocaleString(
												'en-US',
												{
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												},
											)}
										</span>
									</div>
									<div className="flex items-center justify-between text-sm font-medium">
										<span className="text-[#6B7280]">
											Est. Tax Buffer (-{taxBufferRate}%)
										</span>
										<span className="text-[#6B7280] font-medium tabular-nums">
											-$
											{taxBufferAmt.toLocaleString(
												'en-US',
												{
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												},
											)}
										</span>
									</div>
								</div>
								<div className="border-t border-slate-100 my-3" />
								<div className="flex items-center justify-between">
									<span className="font-semibold text-sm text-on-surface">
										Projected Next Check
									</span>
									<span className="text-[18px] leading-6 font-bold text-[#16A34A] tabular-nums">
										$
										{projectedCheck.toLocaleString(
											'en-US',
											{
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											},
										)}
									</span>
								</div>
							</div>

							{/* Shift Entry Grouped Card */}
							<div className="w-full bg-white rounded-2xl p-4 border border-neutral-200/60 shadow-xs flex flex-col">
								{editingShiftId && (
									<div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-neutral-100">
										<span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
											<Edit size={16} />
											Editing Shift
										</span>
										<button
											type="button"
											onClick={handleCancelEditShift}
											className="text-xs text-neutral-400 hover:text-neutral-700 font-medium cursor-pointer"
										>
											Cancel
										</button>
									</div>
								)}

								{/* Top Row: Horizontal 3-Column Grid */}
								<div className="grid grid-cols-3 gap-2">
									{/* Column 1: DATE */}
									<div className="flex flex-col gap-1.5">
										<span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
											DATE
										</span>
										<button
											type="button"
											onClick={openDatePicker}
											className="h-11.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer text-left w-full hover:bg-neutral-100/70"
										>
											<span className="text-[12.5px] font-semibold text-neutral-800 tabular-nums truncate">
												{formatShortShiftDate(
													selectedShiftDate,
												)}
											</span>
											<Calendar
												size={16}
												className="text-neutral-400 shrink-0"
											/>
										</button>
									</div>

									{/* Column 2: START */}
									<div className="flex flex-col gap-1.5">
										<span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
											START
										</span>
										<button
											type="button"
											onClick={() =>
												openTimePicker('start')
											}
											className="h-11.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer text-left w-full hover:bg-neutral-100/70"
										>
											<span className="text-[12.5px] font-semibold text-neutral-800 tabular-nums truncate">
												{formatTimeString(startTime)}
											</span>
											<Clock
												size={16}
												className="text-neutral-400 shrink-0"
											/>
										</button>
									</div>

									{/* Column 3: END */}
									<div className="flex flex-col gap-1.5">
										<span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
											END
										</span>
										<button
											type="button"
											onClick={() =>
												openTimePicker('end')
											}
											className="h-11.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer text-left w-full hover:bg-neutral-100/70"
										>
											<span className="text-[12.5px] font-semibold text-neutral-800 tabular-nums truncate">
												{formatTimeString(endTime)}
											</span>
											<Clock
												size={16}
												className="text-neutral-400 shrink-0"
											/>
										</button>
									</div>
								</div>

								{/* Bottom Row: Full-Width Action CTA */}
								<button
									type="button"
									onClick={handleAddOrUpdateShift}
									disabled={!isWageConfigured}
									className={`w-full h-12 font-bold text-[15px] rounded-xl mt-3 flex items-center justify-center gap-2 transition-all ${
										isWageConfigured
											? 'bg-[#111111] text-white active:scale-[0.98] cursor-pointer shadow-xs'
											: 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
									}`}
								>
									{isWageConfigured ? (
										<span>
											{editingShiftId
												? 'Update Shift'
												: 'Log Shift'}{' '}
											(${currentShiftGrossPreview}) •{' '}
											{calculatedShiftHours}h
										</span>
									) : (
										<span>Configure Wage First</span>
									)}
								</button>
							</div>

							{/* Shifts Logged Container */}
							<div className="w-full flex flex-col gap-2">
								<div className="flex items-center justify-between px-1">
									<span className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">
										LOGGED SHIFTS THIS MONTH (
										{sortedShifts.length})
									</span>
									{sortedShifts.length > 0 && (
										<button
											type="button"
											onClick={handleClearAllShifts}
											className="text-xs text-[#6B7280] hover:text-on-surface transition-colors cursor-pointer"
										>
											Clear
										</button>
									)}
								</div>
								<div className="w-full bg-white rounded-2xl border border-neutral-200/60 shadow-xs overflow-hidden">
									{sortedShifts.length === 0 ? (
										<p className="text-xs text-on-surface-variant text-center py-4">
											No shifts logged yet this month.
										</p>
									) : (
										sortedShifts.map((shift, idx) => (
											<SwipeableShiftItem
												key={shift.id}
												shift={shift}
												hourlyWage={wageRate}
												onEdit={handleStartEditShift}
												onDelete={handleRemoveShift}
												isLast={
													idx ===
													sortedShifts.length - 1
												}
												formatDate={formatShiftDate}
											/>
										))
									)}
								</div>
							</div>

							{/* Tax Setting Row - OPENS TAX BUFFER PAGE */}
							<button
								type="button"
								onClick={() => {
									setTempTaxBuffer(taxBufferRate);
									navigateTo('tax_buffer');
								}}
								className="w-full bg-white rounded-2xl p-4 border border-[#F3F4F6] shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors active:opacity-70 text-left"
							>
								<span className="text-sm font-medium text-on-surface">
									Tax Buffer Percentage
								</span>
								<span className="text-sm font-semibold text-gray-500 flex items-center gap-0.5">
									{taxBufferRate}%
									<ChevronRight
										size={16}
										className="text-gray-400"
									/>
								</span>
							</button>

							{/* Toast Notification */}
							<div
								className={`transition-all duration-200 transform bg-[#111111] text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 mx-auto shadow-lg text-xs font-medium ${
									paycheckToast
										? 'opacity-100 translate-y-0'
										: 'opacity-0 pointer-events-none translate-y-2'
								}`}
							>
								<CheckCircle2
									size={16}
									className="text-secondary"
								/>
								<span>Shift logged successfully</span>
							</div>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE 2: VEHICLE & TRANSIT MATH */}
				{currentSubpage === 'vehicle' && (
					<motion.div
						key="vehicle"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="flex flex-col w-full -mt-2"
					>
						{/* Header */}
						<SubpageHeader
							title="Vehicle & Transit"
							backLabel="Settings"
							onBack={() => navigateBack('main')}
						/>
						{/* Hero Stat Card */}
						<section className="relative overflow-hidden bg-white rounded-xl p-5 mb-4 shadow-sm border border-[#F3F4F6]">
							<div className="flex items-start justify-between">
								<span className="text-[10px] font-bold uppercase tracking-wider text-outline">
									Marginal Running Cost
								</span>
								<div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface">
									<Car size={18} />
								</div>
							</div>
							<div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2 mb-2">
								<div className="flex items-baseline gap-1">
									<span className="text-[32px] font-bold leading-9 text-primary tracking-tight tabular-nums">
										${vehicleCostPerMile.toFixed(2)}
									</span>
									<span className="text-[18px] text-outline font-normal">
										/ mi
									</span>
								</div>
								<div className="inline-flex items-center gap-1.5 bg-secondary-container/30 px-2.5 py-1 rounded-full">
									<Clock
										size={14}
										className="text-secondary"
									/>
									<span className="text-xs text-secondary font-semibold">
										≈ 30s of work
									</span>
								</div>
							</div>
							<div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mb-3">
								<div
									className="bg-secondary h-full rounded-full transition-all duration-500"
									style={{
										width: `${Math.min(100, Math.round(vehicleCostPerMile * 200))}%`,
									}}
								/>
							</div>
							<div className="flex items-center gap-1 text-on-surface-variant">
								<Fuel size={15} className="text-outline" />
								<p className="text-xs text-on-surface-variant">
									Gas only • Excludes baseline vehicle
									depreciation
								</p>
							</div>
						</section>
						{/* Efficiency & Fuel Card - EACH OPENS A NEW SUBPAGE */}
						<section className="mb-4">
							<div className="flex items-center justify-between mb-2 px-1">
								<h3 className="text-[10px] font-bold uppercase tracking-wider text-outline">
									Efficiency &amp; Fuel
								</h3>
								<span className="text-xs text-secondary font-medium">
									Tap row to edit
								</span>
							</div>
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] overflow-hidden flex flex-col">
								{/* MPG */}
								<button
									type="button"
									onClick={() => navigateTo('fuel_economy')}
									className="w-full text-left py-3.5 px-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer"
								>
									<div className="flex items-center gap-3">
										<div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface">
											<Gauge size={16} />
										</div>
										<span className="text-sm font-semibold text-on-surface">
											Fuel Economy
										</span>
									</div>
									<div className="flex items-center gap-1">
										<span className="text-sm font-semibold text-primary">
											{currentMpg} MPG
										</span>
										<ChevronRight
											size={18}
											className="text-outline"
										/>
									</div>
								</button>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Gas Price */}
								<button
									type="button"
									onClick={() => navigateTo('gas_price')}
									className="w-full text-left py-3.5 px-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer"
								>
									<div className="flex items-center gap-3">
										<div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface">
											<CreditCard size={16} />
										</div>
										<span className="text-sm font-semibold text-on-surface">
											Gas Price
										</span>
									</div>
									<div className="flex items-center gap-1">
										<span className="text-sm font-semibold text-primary">
											${currentGas.toFixed(2)}/gal
										</span>
										<ChevronRight
											size={18}
											className="text-outline"
										/>
									</div>
								</button>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Tank Capacity */}
								<button
									type="button"
									onClick={() => navigateTo('tank_capacity')}
									className="w-full text-left py-3.5 px-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer"
								>
									<div className="flex items-center gap-3">
										<div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface">
											<Droplet size={16} />
										</div>
										<span className="text-sm font-semibold text-on-surface">
											Fuel Tank Capacity
										</span>
									</div>
									<div className="flex items-center gap-1">
										<span className="text-sm font-semibold text-primary">
											{currentCap.toFixed(1)} gal
										</span>
										<ChevronRight
											size={18}
											className="text-outline"
										/>
									</div>
								</button>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Computed Range */}
								<div className="py-3.5 px-4 flex items-center justify-between bg-surface-container-lowest">
									<div className="flex items-center gap-3">
										<div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-outline">
											<Milestone size={16} />
										</div>
										<div className="flex flex-col">
											<span className="text-sm font-semibold text-on-surface">
												Max Tank Range
											</span>
											<span className="text-[10px] text-outline">
												Auto-calculated
											</span>
										</div>
									</div>
									<span className="text-sm font-semibold text-outline">
										{maxRange} miles
									</span>
								</div>
							</div>
						</section>
						{/* Trip Cost Examples */}
						<section className="mb-5">
							<div className="flex items-center justify-between mb-2 px-1">
								<h3 className="text-[10px] font-bold uppercase tracking-wider text-outline">
									Trip Cost Examples
								</h3>
								<span className="text-xs text-outline">
									At ${wageRate.toFixed(2)}/hr wage
								</span>
							</div>
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] overflow-hidden flex flex-col">
								<div className="py-3.5 px-4 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface">
											<Briefcase size={18} />
										</div>
										<div className="flex flex-col">
											<span className="text-sm font-semibold text-on-surface">
												10-mile commute
											</span>
											<span className="text-xs text-outline">
												Round-trip daily
											</span>
										</div>
									</div>
									<div className="text-right">
										<span className="text-sm font-semibold text-on-surface tabular-nums">
											${commuteCost.toFixed(2)}
										</span>
										<span className="text-secondary font-semibold text-sm ml-1">
											({commuteMinutes}m of work)
										</span>
									</div>
								</div>
								<div className="h-px bg-slate-100 mx-4" />
								<div className="py-3.5 px-4 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface">
											<Zap size={18} />
										</div>
										<div className="flex flex-col">
											<span className="text-sm font-semibold text-on-surface">
												Full Tank Fill-up
											</span>
											<span className="text-xs text-outline">
												Zero to click
											</span>
										</div>
									</div>
									<div className="text-right">
										<span className="text-sm font-semibold text-on-surface tabular-nums">
											${tankCost.toFixed(2)}
										</span>
										<span className="text-secondary font-semibold text-sm ml-1">
											({tankHours} hrs of work)
										</span>
									</div>
								</div>
							</div>
						</section>
						{/* Automatic Trip Detection Section */}
						<section className="mb-5 flex flex-col gap-3">
							<div className="flex items-center justify-between px-1">
								<h3 className="text-[10px] font-bold uppercase tracking-wider text-outline">
									Automated Tracking
								</h3>
							</div>
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] p-4 flex items-center justify-between">
								<div className="flex items-center gap-3 pr-2 min-w-0">
									<div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface shrink-0">
										<Search size={18} />
									</div>
									<div className="flex flex-col min-w-0">
										<span className="text-sm font-semibold text-on-surface truncate">
											Automatic Trip Detection
										</span>
										<span className="text-xs text-outline leading-snug">
											Tracks drives and store stops to
											suggest unlogged trips
										</span>
									</div>
								</div>

								<button
									type="button"
									role="switch"
									aria-checked={autoTripDetection}
									onClick={handleToggleTripDetection}
									data-testid="auto-trip-detection-toggle"
									className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
										autoTripDetection
											? 'bg-[#10B981]'
											: 'bg-[#E5E7EB]'
									}`}
								>
									<span
										className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
											autoTripDetection
												? 'translate-x-5'
												: 'translate-x-0'
										}`}
									/>
								</button>
							</div>

							{/* Dev Tracking Overlay Toggle */}
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] p-4 flex items-center justify-between">
								<div className="flex items-center gap-3 pr-2 min-w-0">
									<div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[#059669] shrink-0">
										<Terminal size={18} />
									</div>
									<div className="flex flex-col min-w-0">
										<span className="text-sm font-semibold text-on-surface truncate">
											Dev Tracking Overlay
										</span>
										<span className="text-xs text-outline leading-snug">
											Shows live 4-state engine telemetry
											and desk test triggers
										</span>
									</div>
								</div>

								<button
									type="button"
									role="switch"
									aria-checked={devTrackingOverlay}
									onClick={handleToggleDevTrackingOverlay}
									data-testid="dev-tracking-overlay-toggle"
									className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
										devTrackingOverlay
											? 'bg-[#10B981]'
											: 'bg-[#E5E7EB]'
									}`}
								>
									<span
										className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
											devTrackingOverlay
												? 'translate-x-5'
												: 'translate-x-0'
										}`}
									/>
								</button>
							</div>

							{/* Simulated Route Driving Toggle */}
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] p-4 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0">
										<Navigation size={20} />
									</div>
									<div className="flex flex-col min-w-0">
										<span className="text-sm font-semibold text-on-surface truncate">
											Simulate Route Driving
										</span>
										<span className="text-xs text-outline leading-snug">
											Step marker along roads for testing.
											Turn off for live GPS driving.
										</span>
									</div>
								</div>

								<button
									type="button"
									role="switch"
									aria-checked={enableRouteSimulation}
									onClick={handleToggleRouteSimulation}
									data-testid="enable-route-simulation-toggle"
									className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
										enableRouteSimulation
											? 'bg-[#10B981]'
											: 'bg-[#E5E7EB]'
									}`}
								>
									<span
										className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
											enableRouteSimulation
												? 'translate-x-5'
												: 'translate-x-0'
										}`}
									/>
								</button>
							</div>

							{/* Destination Dwell Threshold Selector */}
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] p-4 flex flex-col gap-2.5">
								<div className="flex items-center justify-between">
									<div className="flex flex-col">
										<span className="text-sm font-semibold text-on-surface">
											Destination Dwell Time
										</span>
										<span className="text-xs text-outline leading-snug">
											Stationary duration before declaring
											a destination
										</span>
									</div>
									<span className="text-xs font-mono font-bold text-[#059669] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
										{destinationDwellMins}m
									</span>
								</div>

								<div className="grid grid-cols-4 gap-2 pt-1">
									{[3, 5, 10, 15].map((mins) => (
										<button
											key={mins}
											type="button"
											onClick={() =>
												handleChangeDestinationDwell(
													mins,
												)
											}
											className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
												destinationDwellMins === mins
													? 'bg-[#111111] text-white shadow-xs'
													: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
											}`}
										>
											{mins} min
										</button>
									))}
								</div>
							</div>
						</section>
						{/* Save CTA */}
						{/* <div className="pt-2">
							<button
								type="button"
								onClick={handleSaveVehicleChanges}
								className={`w-full h-13 rounded-xl font-semibold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md cursor-pointer ${
									vehicleSaved
										? 'bg-secondary text-white'
										: 'bg-primary text-on-primary'
								}`}
							>
								{vehicleSaved ? (
									<RotateCw size={18} className="animate-spin" />
								) : (
									<Check size={18} />
								)}
								<span>
									{vehicleSaved ? 'SAVED!' : 'SAVE CHANGES'}
								</span>
							</button>
							<p className="text-center text-xs text-outline mt-2.5">
								Values update your transit calculator instantly
							</p>
						</div> */}
					</motion.div>
				)}

				{/* SUBPAGE 3: PAST CYCLES & SURPLUS HISTORY */}
				{currentSubpage === 'past_cycles' && (
					<motion.div
						key="past_cycles"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="flex flex-col w-full -mt-2"
					>
						{/* Header */}
						<SubpageHeader
							title="Past Cycles"
							backLabel="Settings"
							onBack={() => navigateBack('main')}
						/>

						{/* Lifetime Surplus Hero Card */}
						<div className="bg-white rounded-xl p-5 shadow-sm border border-[#F3F4F6] mb-4">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
									Lifetime Unspent Surplus
								</span>
								<PiggyBank
									className="text-secondary"
									size={20}
								/>
							</div>
							<div className="text-[32px] font-bold text-secondary tracking-tight mt-1 flex items-baseline gap-1 tabular-nums">
								{lifetimeSurplus >= 0
									? `+$${lifetimeSurplus.toFixed(2)}`
									: `-$${Math.abs(lifetimeSurplus).toFixed(2)}`}
							</div>
							<p className="text-xs text-on-surface-variant mt-1">
								Total cash preserved from completed cycles
							</p>
						</div>

						{/* Completed Periods List */}
						<div className="flex flex-col space-y-2 mb-4">
							<div className="px-1">
								<span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
									Completed Periods
								</span>
							</div>
							<div className="bg-white rounded-[18px] border border-[#F3F4F6] shadow-sm overflow-hidden divide-y divide-[#F3F4F6]">
								{pastCycles.length === 0 ? (
									<div className="p-6 text-center text-xs text-on-surface-variant">
										No completed cycles yet. Completed pay
										periods will appear here.
									</div>
								) : (
									pastCycles.map((cycle) => (
										<div
											key={cycle.id}
											className="w-full p-4 flex items-center justify-between"
										>
											<div className="flex items-center gap-3.5 min-w-0">
												<div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
													<Calendar
														className="text-on-surface"
														size={20}
													/>
												</div>
												<div className="min-w-0">
													<h4 className="font-semibold text-sm text-primary truncate">
														{cycle.label}
													</h4>
													<p className="text-xs text-on-surface-variant truncate mt-0.5">
														$
														{cycle.spent.toFixed(2)}{' '}
														spent of ${cycle.check}{' '}
														check
													</p>
												</div>
											</div>
											<div className="flex items-center gap-1 shrink-0 ml-2">
												<span
													className={`font-semibold text-xs px-2.5 py-1 rounded-full tabular-nums ${
														cycle.isDeficit
															? 'bg-error-container text-on-error-container'
															: 'bg-secondary-container text-on-secondary-container'
													}`}
												>
													{cycle.surplus >= 0
														? `+$${cycle.surplus.toFixed(2)}`
														: `-$${Math.abs(cycle.surplus).toFixed(2)}`}
												</span>
											</div>
										</div>
									))
								)}
							</div>
						</div>

						{/* Rollover Rules Callout */}
						<div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3 shadow-sm">
							<div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 mt-0.5">
								<Lightbulb className="text-primary" size={18} />
							</div>
							<div className="space-y-1">
								<h5 className="font-semibold text-sm text-on-surface">
									Surplus Allocation
								</h5>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Surplus rolls directly into your next
									cycle's budget when Rollover is active in
									Settings.
								</p>
							</div>
						</div>
					</motion.div>
				)}

				{/* SUBPAGE 4: EXPORT DATA (LEDGER) */}
				{currentSubpage === 'export' && (
					<motion.div
						key="export"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="flex flex-col w-full -mt-2"
					>
						{/* Header */}
						<SubpageHeader
							title="Export Data"
							backLabel="Settings"
							onBack={() => navigateBack('main')}
						/>

						{/* Date Range Selection */}
						<section className="flex flex-col mb-4">
							<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5 px-1">
								Date Range
							</span>
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] overflow-hidden">
								{/* Current Cycle */}
								<div
									onClick={() => setExportRange('current')}
									className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors"
								>
									<div className="flex flex-col pr-2">
										<span className="text-sm font-semibold text-primary">
											Current Cycle ({settings.cycleLabel}
											)
										</span>
										<span className="text-xs text-on-surface-variant">
											{summary.itemCount} items logged
										</span>
									</div>
									<div
										className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
											exportRange === 'current'
												? 'border-primary bg-transparent'
												: 'border-[#D1D5DB] bg-transparent'
										}`}
									>
										{exportRange === 'current' && (
											<div className="w-2.5 h-2.5 rounded-full bg-primary" />
										)}
									</div>
								</div>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Year to Date */}
								<div
									onClick={() => setExportRange('ytd')}
									className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors"
								>
									<div className="flex flex-col pr-2">
										<span className="text-sm font-semibold text-primary">
											Year to Date (2026)
										</span>
										<span className="text-xs text-on-surface-variant">
											Jan 1 – Nov 30 • 142 items
										</span>
									</div>
									<div
										className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
											exportRange === 'ytd'
												? 'border-primary bg-transparent'
												: 'border-[#D1D5DB] bg-transparent'
										}`}
									>
										{exportRange === 'ytd' && (
											<div className="w-2.5 h-2.5 rounded-full bg-primary" />
										)}
									</div>
								</div>
								<div className="h-px bg-slate-100 mx-4" />

								{/* All-Time */}
								<div
									onClick={() => setExportRange('all')}
									className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors"
								>
									<div className="flex flex-col pr-2">
										<span className="text-sm font-semibold text-primary">
											All-Time History
										</span>
										<span className="text-xs text-on-surface-variant">
											Lifetime data • 284 items
										</span>
									</div>
									<div
										className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
											exportRange === 'all'
												? 'border-primary bg-transparent'
												: 'border-[#D1D5DB] bg-transparent'
										}`}
									>
										{exportRange === 'all' && (
											<div className="w-2.5 h-2.5 rounded-full bg-primary" />
										)}
									</div>
								</div>
							</div>
						</section>

						{/* Include Tables */}
						<section className="flex flex-col mb-4">
							<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5 px-1">
								Include Tables
							</span>
							<div className="bg-white rounded-xl shadow-sm border border-[#F3F4F6] overflow-hidden">
								{/* Expense Transactions */}
								<div className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3 min-w-0 pr-2">
										<div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
											<Receipt size={20} />
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-sm font-semibold text-primary truncate">
												Expense Transactions
											</span>
											<span className="text-xs text-on-surface-variant truncate">
												All logged spending with
												work-hour equivalent
											</span>
										</div>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={includeExpenses}
										onClick={() =>
											setIncludeExpenses(!includeExpenses)
										}
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											includeExpenses
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												includeExpenses
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Work Shifts */}
								<div className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3 min-w-0 pr-2">
										<div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
											<Clock size={20} />
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-sm font-semibold text-primary truncate">
												Work Shifts &amp; Hours
											</span>
											<span className="text-xs text-on-surface-variant truncate">
												Tracked hours with wage
												benchmarks
											</span>
										</div>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={includeShifts}
										onClick={() =>
											setIncludeShifts(!includeShifts)
										}
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											includeShifts
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												includeShifts
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>
								<div className="h-px bg-slate-100 mx-4" />

								{/* Mileage Presets */}
								<div className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3 min-w-0 pr-2">
										<div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
											<Car size={20} />
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-sm font-semibold text-primary truncate">
												Mileage Presets &amp; Trip Logs
											</span>
											<span className="text-xs text-on-surface-variant truncate">
												Cost per mile, fuel benchmarks
												&amp; routes
											</span>
										</div>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={includeMileage}
										onClick={() =>
											setIncludeMileage(!includeMileage)
										}
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											includeMileage
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												includeMileage
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>
							</div>
						</section>

						{/* Format Selector */}
						<section className="flex flex-col mb-6">
							<span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5 px-1">
								Export Format
							</span>
							<div className="bg-surface-container-high p-1 rounded-xl flex gap-1">
								<button
									type="button"
									onClick={() => setExportFormat('CSV')}
									className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
										exportFormat === 'CSV'
											? 'bg-primary text-on-primary shadow-sm'
											: 'text-on-surface-variant'
									}`}
								>
									<FileText size={18} />
									<span>Standard CSV</span>
								</button>
								<button
									type="button"
									onClick={() => setExportFormat('JSON')}
									className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
										exportFormat === 'JSON'
											? 'bg-primary text-on-primary shadow-sm'
											: 'text-on-surface-variant'
									}`}
								>
									<FileCode size={18} />
									<span>Raw JSON</span>
								</button>
							</div>
						</section>

						{/* Action Button */}
						<div className="flex flex-col items-center">
							<button
								type="button"
								onClick={handleExecuteExport}
								className="w-full h-13 bg-primary text-on-primary rounded-xl text-sm font-semibold tracking-wide shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 cursor-pointer"
							>
								<Share2 size={20} />
								<span>
									{exportingStatus ||
										`SHARE / DOWNLOAD ${exportFormat}`}
								</span>
							</button>
							<span className="text-xs text-[#9CA3AF] text-center mt-2.5">
								Generated locally on device • Never uploaded
							</span>
						</div>
					</motion.div>
				)}

				{/* MAIN SETTINGS VIEW */}
				{currentSubpage === 'main' && (
					<motion.div
						key="main"
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="flex flex-col w-full"
					>
						{/* SECTION 1: ENGINES & CALCULATIONS */}
						<section className="flex flex-col">
							<div className="px-1 mb-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
									Engines &amp; Calculations
								</span>
							</div>
							<div className="bg-white rounded-[18px] border border-[#F3F4F6] shadow-sm overflow-hidden divide-y divide-[#F3F4F6]">
								{/* Subpage 1 link: Paycheck */}
								<button
									type="button"
									onClick={() => navigateTo('paycheck')}
									className="w-full flex items-center justify-between p-4 text-left transition-colors active:bg-[#F9FAFB] focus:outline-none cursor-pointer"
								>
									<div className="flex items-center gap-3.5">
										<div className="w-10 h-10 rounded-xl bg-[#EEF2F6] flex items-center justify-center text-[#1E293B] shrink-0">
											<CreditCard size={20} />
										</div>
										<div className="flex flex-col">
											<span className="text-[16px] font-bold text-[#111111] leading-snug">
												Paycheck &amp; Hours
											</span>
											<span className="text-[13px] text-[#6B7280] mt-0.5">
												$
												{settings.hourlyWage.toFixed(2)}
												/hr • {totalAccruedHours}h
												accrued for next check
											</span>
										</div>
									</div>
									<ChevronRight
										size={22}
										className="text-[#9CA3AF] shrink-0"
									/>
								</button>

								{/* Subpage 2 link: Vehicle & Commute Costs */}
								<button
									type="button"
									onClick={() => navigateTo('vehicle')}
									className="w-full flex items-center justify-between p-4 text-left transition-colors active:bg-[#F9FAFB] focus:outline-none cursor-pointer"
								>
									<div className="flex items-center gap-3.5">
										<div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center text-[#059669] shrink-0">
											<Car size={20} />
										</div>
										<div className="flex flex-col">
											<span className="text-[16px] font-bold text-[#111111] leading-snug">
												Vehicle &amp; Commute Costs
											</span>
											<span className="text-[13px] text-[#6B7280] mt-0.5">
												${vehicleCostPerMile.toFixed(2)}/mi benchmark • {currentMpg} MPG @ ${currentGas.toFixed(2)}
											</span>
										</div>
									</div>
									<ChevronRight
										size={22}
										className="text-[#9CA3AF] shrink-0"
									/>
								</button>
							</div>
						</section>

						{/* SECTION: DEVELOPER CONTROLS */}
						<section className="flex flex-col mt-6">
							<div className="px-1 mb-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
									Developer Controls
								</span>
							</div>
							<div className="bg-white rounded-[18px] border border-[#F3F4F6] shadow-sm overflow-hidden divide-y divide-[#F3F4F6]">
								{/* Simulate Route Driving */}
								<div className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3 pr-2 min-w-0">
										<div className="w-9 h-9 rounded-xl bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0">
											<Navigation size={18} />
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-[15px] font-semibold text-[#111111]">
												Simulate Route Driving
											</span>
											<span className="text-[12px] text-[#6B7280] leading-snug mt-0.5">
												Steps along roads for testing. Disable for live GPS driving.
											</span>
										</div>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={enableRouteSimulation}
										onClick={handleToggleRouteSimulation}
										data-testid="main-enable-route-simulation-toggle"
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											enableRouteSimulation
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												enableRouteSimulation
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>

								{/* Dev Tracking Overlay */}
								<div className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3 pr-2 min-w-0">
										<div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0">
											<Terminal size={18} />
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-[15px] font-semibold text-[#111111]">
												Dev Tracking Overlay
											</span>
											<span className="text-[12px] text-[#6B7280] leading-snug mt-0.5">
												Shows live 4-state engine telemetry and test triggers
											</span>
										</div>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={devTrackingOverlay}
										onClick={handleToggleDevTrackingOverlay}
										data-testid="main-dev-tracking-overlay-toggle"
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											devTrackingOverlay
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												devTrackingOverlay
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>
							</div>
						</section>

						{/* SECTION 2: PREFERENCES */}
						<section className="flex flex-col mt-6">
							<div className="px-1 mb-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
									Preferences
								</span>
							</div>
							<div className="bg-white rounded-[18px] border border-[#F3F4F6] shadow-sm overflow-hidden divide-y divide-[#F3F4F6]">
								<div className="flex items-center justify-between p-4">
									<div className="flex flex-col pr-3">
										<span className="text-[15px] font-semibold text-[#111111]">
											Show Time-Worked Metric
										</span>
										<span className="text-[12px] text-[#6B7280] mt-0.5">
											Displays work hours under prices
										</span>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={showTimeWorked}
										onClick={() =>
											setShowTimeWorked(!showTimeWorked)
										}
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											showTimeWorked
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												showTimeWorked
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div>
								{/* <div className="flex items-center justify-between p-4">
									<div className="flex flex-col pr-3">
										<span className="text-[15px] font-semibold text-[#111111]">
											Animations
										</span>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={isAnimationsActive}
										onClick={handleToggleAnimations}
										className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
											isAnimationsActive
												? 'bg-[#10B981]'
												: 'bg-[#E5E7EB]'
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
												isAnimationsActive
													? 'translate-x-5'
													: 'translate-x-0'
											}`}
										/>
									</button>
								</div> */}
							</div>
						</section>

						{/* SECTION 3: DATA & ARCHIVES */}
						<section className="flex flex-col mt-6">
							<div className="px-1 mb-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
									Data &amp; Archives
								</span>
							</div>
							<div className="bg-white rounded-[18px] border border-[#F3F4F6] shadow-sm overflow-hidden divide-y divide-[#F3F4F6]">
								<button
									type="button"
									onClick={() => navigateTo('past_cycles')}
									className="w-full flex items-center justify-between p-4 text-left transition-colors active:bg-[#F9FAFB] focus:outline-none cursor-pointer"
								>
									<div className="flex flex-col pr-2">
										<span className="text-[15px] font-semibold text-[#111111]">
											Past Cycles &amp; Surplus History
										</span>
										<span className="text-[12px] text-[#6B7280] mt-0.5">
											View previous paychecks and rolled
											surplus
										</span>
									</div>
									<ChevronRight
										size={22}
										className="text-[#9CA3AF] shrink-0"
									/>
								</button>
								<button
									type="button"
									onClick={() => navigateTo('export')}
									className="w-full flex items-center justify-between p-4 text-left transition-colors active:bg-[#F9FAFB] focus:outline-none cursor-pointer"
								>
									<div className="flex flex-col pr-2">
										<span className="text-[15px] font-semibold text-[#111111]">
											Export Data (CSV / JSON)
										</span>
										<span className="text-[12px] text-[#6B7280] mt-0.5">
											Download local ledger file
										</span>
									</div>
									<ChevronRight
										size={22}
										className="text-[#9CA3AF] shrink-0"
									/>
								</button>
							</div>
						</section>
					</motion.div>
				)}
			</AnimatePresence>

			{/* WheelPicker Time Modal */}
			<AnimatePresence>
				{activeTimePickerTarget && (
					<div
						className="fixed inset-0 z-50 flex flex-col justify-end"
						role="dialog"
						aria-modal="true"
						aria-label={
							activeTimePickerTarget === 'start'
								? 'Select Start Time'
								: 'Select End Time'
						}
					>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2, ease: 'easeOut' }}
							className="fixed inset-0 bg-black/40 backdrop-blur-xs"
							onClick={() => setActiveTimePickerTarget(null)}
						/>
						<motion.div
							initial={{ y: '100%' }}
							animate={{ y: 0 }}
							exit={{ y: '100%' }}
							transition={{
								type: 'spring',
								damping: 28,
								stiffness: 300,
							}}
							className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 pb-8"
						>
							<div className="flex items-center justify-between border-b border-neutral-100 pb-3">
								<div>
									<h3 className="text-base font-bold text-neutral-900">
										{activeTimePickerTarget === 'start'
											? 'Select Start Time'
											: 'Select End Time'}
									</h3>
									<p className="text-xs text-neutral-500">
										Set shift clock time
									</p>
								</div>
								<button
									type="button"
									onClick={handleSaveTime}
									className="px-4 py-1.5 bg-[#111111] text-white text-xs font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
								>
									Done
								</button>
							</div>

							<div className="relative py-2">
								{/* Selection highlight bar indicator */}
								<div className="absolute top-1/2 left-3 right-3 -translate-y-1/2 h-8.5 bg-neutral-200/50 rounded-lg pointer-events-none" />
								<WheelPickerWrapper className="w-full h-44 bg-neutral-50 rounded-2xl border border-neutral-200/80 overflow-hidden">
									<WheelPicker
										value={tempTimeHour}
										onValueChange={(val) =>
											setTempTimeHour(String(val))
										}
										options={hourOptions}
										optionItemHeight={34}
									/>
									<WheelPicker
										value={tempTimeMinute}
										onValueChange={(val) =>
											setTempTimeMinute(String(val))
										}
										options={minuteOptions}
										optionItemHeight={34}
									/>
									<WheelPicker
										value={tempTimePeriod}
										onValueChange={(val) =>
											setTempTimePeriod(String(val))
										}
										options={periodOptions}
										optionItemHeight={34}
									/>
								</WheelPickerWrapper>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* WheelPicker Date Modal */}
			<AnimatePresence>
				{isDatePickerOpen && (
					<div
						className="fixed inset-0 z-50 flex flex-col justify-end"
						role="dialog"
						aria-modal="true"
						aria-label="Select Date"
					>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2, ease: 'easeOut' }}
							className="fixed inset-0 bg-black/40 backdrop-blur-xs"
							onClick={() => setIsDatePickerOpen(false)}
						/>
						<motion.div
							initial={{ y: '100%' }}
							animate={{ y: 0 }}
							exit={{ y: '100%' }}
							transition={{
								type: 'spring',
								damping: 28,
								stiffness: 300,
							}}
							className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 pb-8"
						>
							<div className="flex items-center justify-between border-b border-neutral-100 pb-3">
								<div>
									<h3 className="text-base font-bold text-neutral-900">
										Select Shift Date
									</h3>
									<p className="text-xs text-neutral-500">
										Pick the day this shift was worked
									</p>
								</div>
								<button
									type="button"
									onClick={handleSaveDate}
									className="px-4 py-1.5 bg-[#111111] text-white text-xs font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
								>
									Done
								</button>
							</div>

							<div className="relative py-2">
								{/* Selection highlight bar indicator */}
								<div className="absolute top-1/2 left-3 right-3 -translate-y-1/2 h-8.5 bg-neutral-200/50 rounded-lg pointer-events-none" />
								<WheelPickerWrapper className="w-full h-44 bg-neutral-50 rounded-2xl border border-neutral-200/80 overflow-hidden">
									<WheelPicker
										value={tempMonth}
										onValueChange={(val) => {
											setTempMonth(String(val));
											const maxDays = new Date(
												Number(tempYear),
												Number(val),
												0,
											).getDate();
											if (Number(tempDay) > maxDays) {
												setTempDay(
													String(maxDays).padStart(
														2,
														'0',
													),
												);
											}
										}}
										options={monthOptions}
										optionItemHeight={34}
									/>
									<WheelPicker
										value={tempDay}
										onValueChange={(val) =>
											setTempDay(String(val))
										}
										options={dayOptions}
										optionItemHeight={34}
									/>
									<WheelPicker
										value={tempYear}
										onValueChange={(val) => {
											setTempYear(String(val));
											const maxDays = new Date(
												Number(val),
												Number(tempMonth),
												0,
											).getDate();
											if (Number(tempDay) > maxDays) {
												setTempDay(
													String(maxDays).padStart(
														2,
														'0',
													),
												);
											}
										}}
										options={yearOptions}
										optionItemHeight={34}
									/>
								</WheelPickerWrapper>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* Exact Address Calibration Modal */}
			<AnimatePresence>
				{isLocationModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
						<div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 border border-gray-100">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Home
										size={22}
										className="text-secondary"
									/>
									<h3 className="text-[16px] font-bold text-[#111111]">
										Set Home Address
									</h3>
								</div>
								<button
									type="button"
									onClick={() =>
										setIsLocationModalOpen(false)
									}
									data-testid="close-address-modal-btn"
									className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer"
								>
									<X size={20} />
								</button>
							</div>

							<p className="text-[12px] text-[#6B7280] leading-relaxed">
								The app uses your Home Address to immediately
								detect when you leave or return from trips.
							</p>

							<div className="relative w-full">
								<input
									type="text"
									data-testid="address-search-input"
									value={addressQuery}
									onChange={(e) =>
										handleSearchAddressChange(
											e.target.value,
										)
									}
									placeholder="e.g. 201 Girard Rd, Glassboro NJ"
									className="w-full bg-[#F4F7FB] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-[#111111] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary"
								/>
								{isSearchingAddress && (
									<div className="absolute right-3 top-2.5">
										<RotateCw
											size={18}
											className="text-gray-400 animate-spin"
										/>
									</div>
								)}
							</div>

							{/* Search Suggestions */}
							{addressResults.length > 0 && (
								<div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100 max-h-48 overflow-y-auto">
									{addressResults.map((item, idx) => (
										<button
											key={idx}
											type="button"
											data-testid={`address-result-${idx}`}
											onClick={() =>
												handleSelectHomeAddress(item)
											}
											className="w-full text-left p-2.5 hover:bg-neutral-50 transition-colors text-[13px] text-[#111111] font-medium flex items-start gap-2 cursor-pointer"
										>
											<MapPin
												size={16}
												className="text-gray-400 shrink-0 mt-0.5"
											/>
											<span className="truncate">
												{item.label}
											</span>
										</button>
									))}
								</div>
							)}

							<div className="flex items-center gap-2 pt-1">
								<button
									type="button"
									onClick={handleUseCurrentGpsAsHome}
									className="w-full py-2.5 px-3 rounded-xl border border-gray-200 text-[#111111] font-bold text-[13px] hover:bg-neutral-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
								>
									<LocateFixed size={18} />
									<span>Use Current Location as Home</span>
								</button>
							</div>
						</div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
};
