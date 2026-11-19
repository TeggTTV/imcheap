import React, { useState } from 'react';
import { motion } from 'motion/react';
import { IncomeSettings } from '../utils/expenseMath';

interface VehicleSettingsViewProps {
	settings: IncomeSettings;
	onUpdateSettings: (settings: IncomeSettings) => void;
	onBack: () => void;
	wageRate: number;
}

export const VehicleSettingsView: React.FC<VehicleSettingsViewProps> = ({
	settings,
	onUpdateSettings,
	onBack,
	wageRate,
}) => {
	const [mpg, setMpg] = useState<number>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_vehicle');
				if (saved) {
					const parsed = JSON.parse(saved);
					if (parsed?.mpg) return parsed.mpg;
				}
			} catch {}
		}
		return 29;
	});

	const [gasPrice, setGasPrice] = useState<number>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_vehicle');
				if (saved) {
					const parsed = JSON.parse(saved);
					if (parsed?.gasPrice) return parsed.gasPrice;
				}
			} catch {}
		}
		return 3.95;
	});

	const [tankSize, setTankSize] = useState<number>(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_vehicle');
				if (saved) {
					const parsed = JSON.parse(saved);
					if (parsed?.tankSize) return parsed.tankSize;
				}
			} catch {}
		}
		return 14.0;
	});

	// Local string states for smooth typing
	const [mpgInput, setMpgInput] = useState<string>(() => String(mpg));
	const [gasInput, setGasInput] = useState<string>(() => String(gasPrice));
	const [tankInput, setTankInput] = useState<string>(() => String(tankSize));

	const vehicleCostPerMile = mpg > 0 ? gasPrice / mpg : 0;
	const maxRange = Math.round(mpg * tankSize);
	const commuteCost = vehicleCostPerMile * 10;
	const wagePerMin = wageRate / 60;
	const commuteMinutes = wagePerMin > 0 ? (commuteCost / wagePerMin).toFixed(1) : '0';
	const tankCost = gasPrice * tankSize;
	const tankHours = wageRate > 0 ? (tankCost / wageRate).toFixed(1) : '0';

	const handleMpgChange = (raw: string) => {
		setMpgInput(raw);
		const num = parseFloat(raw);
		if (!isNaN(num) && num > 0) {
			setMpg(num);
			saveVehicle(num, gasPrice, tankSize);
		}
	};

	const handleMpgBlur = () => {
		const num = parseFloat(mpgInput);
		if (isNaN(num) || num <= 0) {
			setMpgInput(String(mpg));
		} else {
			const clamped = Math.min(150, Math.max(1, Math.round(num)));
			setMpg(clamped);
			setMpgInput(String(clamped));
			saveVehicle(clamped, gasPrice, tankSize);
		}
	};

	const handleGasChange = (raw: string) => {
		setGasInput(raw);
		const num = parseFloat(raw);
		if (!isNaN(num) && num > 0) {
			setGasPrice(num);
			saveVehicle(mpg, num, tankSize);
		}
	};

	const handleGasBlur = () => {
		const num = parseFloat(gasInput);
		if (isNaN(num) || num <= 0) {
			setGasInput(gasPrice.toFixed(2));
		} else {
			const clamped = Number(Math.min(20, Math.max(0.1, num)).toFixed(2));
			setGasPrice(clamped);
			setGasInput(String(clamped));
			saveVehicle(mpg, clamped, tankSize);
		}
	};

	const handleTankChange = (raw: string) => {
		setTankInput(raw);
		const num = parseFloat(raw);
		if (!isNaN(num) && num > 0) {
			setTankSize(num);
			saveVehicle(mpg, gasPrice, num);
		}
	};

	const handleTankBlur = () => {
		const num = parseFloat(tankInput);
		if (isNaN(num) || num <= 0) {
			setTankInput(tankSize.toFixed(1));
		} else {
			const clamped = Number(Math.min(100, Math.max(1, num)).toFixed(1));
			setTankSize(clamped);
			setTankInput(String(clamped));
			saveVehicle(mpg, gasPrice, clamped);
		}
	};

	const saveVehicle = (newMpg: number, newGas: number, newTank: number) => {
		const newRate = Number((newGas / newMpg).toFixed(2));
		onUpdateSettings({
			...settings,
			mileageRate: newRate,
		});
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(
					'imcheap_vehicle',
					JSON.stringify({ mpg: newMpg, gasPrice: newGas, tankSize: newTank }),
				);
			} catch (e) {
				console.warn('Failed to save vehicle settings', e);
			}
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 15 }}
			transition={{ duration: 0.2, ease: 'easeOut' }}
			className="w-full flex flex-col gap-4"
		>
			{/* Top Bar Header */}
			<div className="flex items-center justify-between px-1">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-1.5 text-[14px] font-bold text-neutral-800 hover:text-black transition-colors cursor-pointer py-1"
				>
					<span className="material-symbols-outlined text-[20px]">arrow_back</span>
					<span>Back</span>
				</button>
				<h2 className="text-[17px] font-black text-[#111111] tracking-tight">
					Vehicle Settings
				</h2>
				<div className="w-12" />
			</div>

			{/* Hero Stat Card */}
			<section className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-gray-100">
				<div className="flex items-start justify-between">
					<span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
						Marginal Running Cost
					</span>
					<div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-[#111111]">
						<span className="material-symbols-outlined text-[18px]">
							directions_car
						</span>
					</div>
				</div>
				<div className="flex items-baseline gap-1 mt-2 mb-1">
					<span className="text-[34px] font-black leading-none text-[#111111] tracking-tight tabular-nums">
						${vehicleCostPerMile.toFixed(2)}
					</span>
					<span className="text-[16px] text-neutral-400 font-medium">/ mi</span>
				</div>
				<p className="text-[12px] text-neutral-500 font-medium mt-1">
					Gas only • Excludes depreciation &amp; insurance
				</p>
			</section>

			{/* Efficiency & Fuel Fields */}
			<section className="flex flex-col gap-3.5">
				{/* MPG Card */}
				<div className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between">
					<div className="flex flex-col min-w-0 pr-3">
						<label htmlFor="vehicle-mpg-input" className="text-[14px] font-bold text-[#111111]">
							Fuel Economy
						</label>
						<span className="text-[12px] text-neutral-400 font-medium mt-0.5">
							Vehicle average miles per gallon
						</span>
					</div>
					<div className="flex items-center bg-neutral-50 hover:bg-neutral-100/80 rounded-2xl px-3.5 py-2.5 border border-neutral-200/80 focus-within:border-black focus-within:bg-white transition-all shrink-0">
						<input
							id="vehicle-mpg-input"
							type="number"
							min="1"
							max="150"
							step="1"
							value={mpgInput}
							onChange={(e) => handleMpgChange(e.target.value)}
							onBlur={handleMpgBlur}
							className="w-16 text-[18px] font-black text-right text-[#111111] bg-transparent outline-none tabular-nums"
						/>
						<span className="text-[13px] font-extrabold text-neutral-400 ml-1.5 uppercase tracking-wide">
							MPG
						</span>
					</div>
				</div>

				{/* Gas Price Card */}
				<div className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between">
					<div className="flex flex-col min-w-0 pr-3">
						<label htmlFor="vehicle-gas-input" className="text-[14px] font-bold text-[#111111]">
							Gas Price
						</label>
						<span className="text-[12px] text-neutral-400 font-medium mt-0.5">
							Average price per gallon at pump
						</span>
					</div>
					<div className="flex items-center bg-neutral-50 hover:bg-neutral-100/80 rounded-2xl px-3.5 py-2.5 border border-neutral-200/80 focus-within:border-black focus-within:bg-white transition-all shrink-0">
						<span className="text-[16px] font-black text-neutral-400 mr-1">$</span>
						<input
							id="vehicle-gas-input"
							type="number"
							min="0.10"
							max="20.00"
							step="0.05"
							value={gasInput}
							onChange={(e) => handleGasChange(e.target.value)}
							onBlur={handleGasBlur}
							className="w-16 text-[18px] font-black text-right text-[#111111] bg-transparent outline-none tabular-nums"
						/>
						<span className="text-[13px] font-extrabold text-neutral-400 ml-1.5 uppercase tracking-wide">
							/gal
						</span>
					</div>
				</div>

				{/* Tank Capacity Card */}
				<div className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between">
					<div className="flex flex-col min-w-0 pr-3">
						<label htmlFor="vehicle-tank-input" className="text-[14px] font-bold text-[#111111]">
							Tank Capacity
						</label>
						<span className="text-[12px] text-neutral-400 font-medium mt-0.5">
							Est. full range: {maxRange} miles
						</span>
					</div>
					<div className="flex items-center bg-neutral-50 hover:bg-neutral-100/80 rounded-2xl px-3.5 py-2.5 border border-neutral-200/80 focus-within:border-black focus-within:bg-white transition-all shrink-0">
						<input
							id="vehicle-tank-input"
							type="number"
							min="1.0"
							max="100.0"
							step="0.5"
							value={tankInput}
							onChange={(e) => handleTankChange(e.target.value)}
							onBlur={handleTankBlur}
							className="w-16 text-[18px] font-black text-right text-[#111111] bg-transparent outline-none tabular-nums"
						/>
						<span className="text-[13px] font-extrabold text-neutral-400 ml-1.5 uppercase tracking-wide">
							gal
						</span>
					</div>
				</div>
			</section>

			{/* Trip Cost Examples */}
			<section className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
						Labor Impact Examples
					</span>
					<span className="text-[11px] font-semibold text-neutral-400">
						@ ${wageRate.toFixed(2)}/hr
					</span>
				</div>

				<div className="flex items-center justify-between py-2 border-b border-gray-100">
					<div className="flex flex-col">
						<span className="text-[14px] font-bold text-[#111111]">10-mile daily drive</span>
						<span className="text-[12px] text-neutral-400">Round trip commute</span>
					</div>
					<div className="text-right">
						<span className="text-[14px] font-black text-[#111111]">
							${commuteCost.toFixed(2)}
						</span>
						<span className="text-[12px] font-bold text-[#059669] ml-1.5">
							({commuteMinutes}m work)
						</span>
					</div>
				</div>

				<div className="flex items-center justify-between py-2">
					<div className="flex flex-col">
						<span className="text-[14px] font-bold text-[#111111]">Full tank fill-up</span>
						<span className="text-[12px] text-neutral-400">{tankSize} gallons</span>
					</div>
					<div className="text-right">
						<span className="text-[14px] font-black text-[#111111]">
							${tankCost.toFixed(2)}
						</span>
						<span className="text-[12px] font-bold text-[#059669] ml-1.5">
							({tankHours}h work)
						</span>
					</div>
				</div>
			</section>
		</motion.div>
	);
};
