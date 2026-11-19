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
	const mpgOptions = [25, 30, 35, 40];
	const gasOptions = [3.55, 3.95, 4.35, 4.79];
	const capOptions = [12.0, 14.0, 16.5, 18.0];

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

	const vehicleCostPerMile = mpg > 0 ? gasPrice / mpg : 0;
	const maxRange = Math.round(mpg * tankSize);
	const commuteCost = vehicleCostPerMile * 10;
	const wagePerMin = wageRate / 60;
	const commuteMinutes = wagePerMin > 0 ? (commuteCost / wagePerMin).toFixed(1) : '0';
	const tankCost = gasPrice * tankSize;
	const tankHours = wageRate > 0 ? (tankCost / wageRate).toFixed(1) : '0';

	const handleUpdateMpg = (val: number) => {
		const safeVal = Math.max(1, isNaN(val) ? 29 : val);
		setMpg(safeVal);
		saveVehicle(safeVal, gasPrice, tankSize);
	};

	const handleUpdateGas = (val: number) => {
		const safeVal = Math.max(0.1, isNaN(val) ? 3.95 : val);
		setGasPrice(safeVal);
		saveVehicle(mpg, safeVal, tankSize);
	};

	const handleUpdateCap = (val: number) => {
		const safeVal = Math.max(1, isNaN(val) ? 14 : val);
		setTankSize(safeVal);
		saveVehicle(mpg, gasPrice, safeVal);
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

			{/* Efficiency & Fuel Selectors */}
			<section className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col gap-5">
				{/* MPG */}
				<div className="flex flex-col gap-2.5">
					<div className="flex items-center justify-between">
						<label htmlFor="vehicle-mpg-input" className="text-[13px] font-bold text-[#111111]">
							Fuel Economy (MPG)
						</label>
						<div className="flex items-center bg-neutral-100 rounded-xl px-2.5 py-1 border border-neutral-200/60 focus-within:border-black transition-colors">
							<input
								id="vehicle-mpg-input"
								type="number"
								min="1"
								max="150"
								step="1"
								value={mpg}
								onChange={(e) => handleUpdateMpg(parseFloat(e.target.value))}
								className="w-14 text-[13px] font-black text-right text-[#111111] bg-transparent outline-none tabular-nums"
							/>
							<span className="text-[12px] font-bold text-neutral-500 ml-1">MPG</span>
						</div>
					</div>
					<div className="grid grid-cols-4 gap-2">
						{mpgOptions.map((opt) => (
							<button
								key={opt}
								type="button"
								onClick={() => handleUpdateMpg(opt)}
								className={`py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
									mpg === opt
										? 'bg-[#111111] text-white shadow-xs'
										: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
								}`}
							>
								{opt}
							</button>
						))}
					</div>
				</div>

				<div className="h-px bg-gray-100" />

				{/* Gas Price */}
				<div className="flex flex-col gap-2.5">
					<div className="flex items-center justify-between">
						<label htmlFor="vehicle-gas-input" className="text-[13px] font-bold text-[#111111]">
							Gas Price ($/gal)
						</label>
						<div className="flex items-center bg-neutral-100 rounded-xl px-2.5 py-1 border border-neutral-200/60 focus-within:border-black transition-colors">
							<span className="text-[12px] font-bold text-neutral-500 mr-0.5">$</span>
							<input
								id="vehicle-gas-input"
								type="number"
								min="0.10"
								max="20.00"
								step="0.05"
								value={gasPrice}
								onChange={(e) => handleUpdateGas(parseFloat(e.target.value))}
								className="w-14 text-[13px] font-black text-right text-[#111111] bg-transparent outline-none tabular-nums"
							/>
							<span className="text-[12px] font-bold text-neutral-500 ml-1">/gal</span>
						</div>
					</div>
					<div className="grid grid-cols-4 gap-2">
						{gasOptions.map((opt) => (
							<button
								key={opt}
								type="button"
								onClick={() => handleUpdateGas(opt)}
								className={`py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
									gasPrice === opt
										? 'bg-[#111111] text-white shadow-xs'
										: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
								}`}
							>
								${opt.toFixed(2)}
							</button>
						))}
					</div>
				</div>

				<div className="h-px bg-gray-100" />

				{/* Tank Size */}
				<div className="flex flex-col gap-2.5">
					<div className="flex items-center justify-between">
						<div>
							<label htmlFor="vehicle-tank-input" className="text-[13px] font-bold text-[#111111] block">
								Tank Capacity
							</label>
							<span className="text-[11px] font-medium text-neutral-400">
								Est. range: {maxRange} mi
							</span>
						</div>
						<div className="flex items-center bg-neutral-100 rounded-xl px-2.5 py-1 border border-neutral-200/60 focus-within:border-black transition-colors">
							<input
								id="vehicle-tank-input"
								type="number"
								min="1.0"
								max="100.0"
								step="0.5"
								value={tankSize}
								onChange={(e) => handleUpdateCap(parseFloat(e.target.value))}
								className="w-14 text-[13px] font-black text-right text-[#111111] bg-transparent outline-none tabular-nums"
							/>
							<span className="text-[12px] font-bold text-neutral-500 ml-1">gal</span>
						</div>
					</div>
					<div className="grid grid-cols-4 gap-2">
						{capOptions.map((opt) => (
							<button
								key={opt}
								type="button"
								onClick={() => handleUpdateCap(opt)}
								className={`py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
									tankSize === opt
										? 'bg-[#111111] text-white shadow-xs'
										: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
								}`}
							>
								{opt}g
							</button>
						))}
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
