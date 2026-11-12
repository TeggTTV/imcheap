import React, { useMemo } from 'react';
import {
	WheelPicker,
	WheelPickerWrapper,
	WheelPickerOption,
} from '@/components/ui/wheel-picker';
import {
	OnboardingStepDefinition,
	CommuteStepProps,
	formatLaborTime,
} from './types';

export const mpgOptions: WheelPickerOption<string>[] = Array.from(
	{ length: 46 }, // 15 to 60 MPG
	(_, i) => {
		const val = 15 + i;
		return { label: `${val} MPG`, value: String(val) };
	},
);

export const gasPriceOptions: WheelPickerOption<string>[] = Array.from(
	{ length: 36 }, // $2.50 to $6.00 in $0.10 increments
	(_, i) => {
		const val = (2.5 + i * 0.1).toFixed(2);
		return { label: `$${val}/gal`, value: val };
	},
);

export const tankSizeOptions: WheelPickerOption<string>[] = Array.from(
	{ length: 23 }, // 8 to 30 gal
	(_, i) => {
		const val = 8 + i;
		return { label: `${val} Gal`, value: String(val) };
	},
);

export const COMMUTE_DISTANCE = 12.8;

export const CommuteStepContent: React.FC<CommuteStepProps> = ({
	mpg,
	setMpg,
	gasPrice,
	setGasPrice,
	tankSize,
	setTankSize,
}) => {
	return (
		<div className="my-auto py-1 flex flex-col items-center">
			<div className="w-full rounded-2xl p-y2.5 shadow-inner flex flex-col items-center">
				<div className="flex items-center justify-between w-full px-1 mb-1">
					<span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
						What does a commute look like?
					</span>
				</div>

				<div className="w-full h-25">
					<WheelPickerWrapper className="w-full h-25 bg-white rounded-xl shadow-xs flex items-stretch">
						{/* Wheel 1: MPG */}
						<div className="flex-1 flex flex-col">
							<WheelPicker
								options={mpgOptions}
								value={String(Math.round(mpg))}
								onValueChange={(val: string) => {
									const num = parseFloat(val);
									if (!isNaN(num)) setMpg(num);
								}}
								optionItemHeight={32}
								visibleCount={12}
								classNames={{
									optionItem:
										'text-[12px] text-gray-400 font-medium tabular-nums',
									highlightWrapper:
										'bg-gray-100/70 border-y border-gray-300 font-bold text-[13px] text-gray-900',
								}}
							/>
						</div>

						{/* Wheel 2: Gas Price */}
						<div className="flex-1 flex flex-col border-r border-gray-100">
							<WheelPicker
								options={gasPriceOptions}
								value={gasPrice.toFixed(2)}
								onValueChange={(val: string) => {
									const num = parseFloat(val);
									if (!isNaN(num)) setGasPrice(num);
								}}
								optionItemHeight={32}
								visibleCount={12}
								classNames={{
									optionItem:
										'text-[12px] text-gray-400 font-medium tabular-nums',
									highlightWrapper:
										'bg-gray-100/70 border-y border-gray-300 font-bold text-[13px] text-gray-900',
								}}
							/>
						</div>

						{/* Wheel 3: Tank Size */}
						<div className="flex-1 flex flex-col">
							<WheelPicker
								options={tankSizeOptions}
								value={String(Math.round(tankSize))}
								onValueChange={(val: string) => {
									const num = parseFloat(val);
									if (!isNaN(num)) setTankSize(num);
								}}
								optionItemHeight={32}
								visibleCount={12}
								classNames={{
									optionItem:
										'text-[12px] text-gray-400 font-medium tabular-nums',
									highlightWrapper:
										'bg-gray-100/70 border-y border-gray-300 font-bold text-[13px] text-gray-900',
								}}
							/>
						</div>
					</WheelPickerWrapper>
				</div>
			</div>
		</div>
	);
};

export function useCommuteStep({
	wage,
	mpg,
	setMpg,
	gasPrice,
	setGasPrice,
	tankSize,
	setTankSize,
}: CommuteStepProps): OnboardingStepDefinition {
	return useMemo(() => {
		const costPerMile = mpg > 0 ? gasPrice / mpg : 0.14;
		const commuteCost = Number((COMMUTE_DISTANCE * costPerMile).toFixed(2));
		const commuteLaborHours = wage > 0 ? commuteCost / wage : 0;
		const commuteLaborLabel = formatLaborTime(commuteLaborHours);

		return {
			id: 'step_driving',
			image: '/screen driving.png',
			fallbackImage:
				'https://lh3.googleusercontent.com/aida/ALJJyrCD2ywDVkW6Nfv0hG6gH0hhawWjqRn-_TKkleErEYe-orU8c_T90jv1s4V4kJQhj0PjMG_3fE8uS1RqoGNYr080jTprLVwQkh54uXUFTOWyhdIkX3iM-MVwpq5FCy0_3X_9hAEWJLuJNdEgUUKInq0PvxfYnpBNhjpGgdo0XwlrwndHNyXqIc-txCn3pmUNMiQoLWMMvPea2z7gocC2e7BQw8CHGvaSsNBGrscaWNU',
			receipt: {
				icon: 'directions_car',
				iconEmoji: '🚗',
				iconBg: '#EEF2FF',
				iconColor: '#4F46E5',
				title: 'Daily Commute',
				subtitle: `$${commuteCost.toFixed(2)} • Campus Route (${COMMUTE_DISTANCE} mi)`,
				cost: `$${commuteCost.toFixed(2)}`,
				labor: commuteLaborLabel,
			},
			headline: 'Stop counting dollars. Start counting miles.',
			body: "Spin to match your car's fuel economy, gas price, and tank capacity. ImCheap recalculates every commute in shift labor.",
			ctaText: 'Continue',
			renderContent: () => (
				<CommuteStepContent
					wage={wage}
					mpg={mpg}
					setMpg={setMpg}
					gasPrice={gasPrice}
					setGasPrice={setGasPrice}
					tankSize={tankSize}
					setTankSize={setTankSize}
				/>
			),
		};
	}, [wage, mpg, setMpg, gasPrice, setGasPrice, tankSize, setTankSize]);
}

