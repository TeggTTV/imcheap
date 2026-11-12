import React, { useMemo } from 'react';
import {
	WheelPicker,
	WheelPickerWrapper,
	WheelPickerOption,
} from '@/components/ui/wheel-picker';
import {
	OnboardingStepDefinition,
	WageStepProps,
	formatLaborTime,
} from './types';

export const wageOptions: WheelPickerOption<string>[] = Array.from(
	{ length: 86 }, // $10 to $95
	(_, i) => {
		const val = 10 + i;
		return { label: `$${val}/hr`, value: String(val) };
	},
);

export const MEAL_COST = 14.5;

export const WageStepContent: React.FC<WageStepProps> = ({ wage, setWage }) => {
	return (
		<div className="my-auto py-2 flex flex-col items-center">
			<div className="w-full rounded-2xl p-3 shadow-inner flex flex-col items-center">
				<div className="flex items-center justify-between w-full px-2 mb-1.5">
					<span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
						How much do you make?
					</span>
				</div>

				<div className="w-full h-25 flex items-center justify-center">
					<WheelPickerWrapper className="w-full h-25 bg-white rounded-xl shadow-xs">
						<WheelPicker
							options={wageOptions}
							value={String(Math.round(wage))}
							onValueChange={(val: string) => {
								const num = parseFloat(val);
								if (!isNaN(num)) setWage(num);
							}}
							optionItemHeight={32}
							visibleCount={12}
							classNames={{
								optionItem:
									'text-[13px] text-gray-400 font-medium tabular-nums select-none',
								highlightWrapper:
									'bg-gray-100/70 border-y border-gray-300 font-bold text-[15px] text-gray-900',
							}}
						/>
					</WheelPickerWrapper>
				</div>
			</div>
		</div>
	);
};

export function useWageStep({
	wage,
	setWage,
}: WageStepProps): OnboardingStepDefinition {
	return useMemo(() => {
		const mealLaborHours = wage > 0 ? MEAL_COST / wage : 0;
		const mealLaborLabel = formatLaborTime(mealLaborHours);

		return {
			id: 'step_food',
			image: '/screen burger.png',
			fallbackImage:
				'https://lh3.googleusercontent.com/aida/ALJJyrDofg9q5e9eLGgthQ0sL1Xk-CeCF6uFybE_Dwuhx9tl9PkIlLetlwxHFv_vpijFq1FEwPJxeIoYbGNY44X3n4ZI0sYfroAs5e5UhoadIyRm2tIhnijLicTf4XxxueYEu0DJ5NU7dXBIzlNPue0Wyre5zSfiojk34H9bK6lMeWlusdqxSh6yXSUCa1qoYVNZLqJTl7Cv-mloCT5a2eFG49aqRusFc7CmlLbWfljm8bnP',
			receipt: {
				icon: 'lunch_dining',
				iconEmoji: '🍔',
				iconBg: 'rgba(252, 231, 243, 0.6)',
				iconColor: 'rgb(190, 24, 93)',
				title: 'Lunch Combo',
				subtitle: `$${MEAL_COST.toFixed(2)} • Dine-in (1 meal)`,
				cost: `$${MEAL_COST.toFixed(2)}`,
				labor: mealLaborLabel,
			},
			headline: 'Everything costs hours of your life.',
			body: 'Scroll to set your hourly wage. Watch how lunch translates into exact working shift minutes in real time.',
			ctaText: 'Continue',
			renderContent: () => <WageStepContent wage={wage} setWage={setWage} />,
		};
	}, [wage, setWage]);
}

