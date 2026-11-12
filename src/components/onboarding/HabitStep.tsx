import React, { useMemo } from 'react';
import {
	WheelPicker,
	WheelPickerWrapper,
	WheelPickerOption,
} from '@/components/ui/wheel-picker';
import {
	OnboardingStepDefinition,
	HabitStepProps,
	formatLaborTime,
} from './types';

export const habitOptions: WheelPickerOption<string>[] = [
	{ label: 'None', value: '0.00' },
	{ label: '$2.50 (Drip Coffee)', value: '2.50' },
	{ label: '$3.50 (Americano)', value: '3.50' },
	{ label: '$4.50 (Morning Espresso)', value: '4.50' },
	{ label: '$5.50 (Artisan Latte)', value: '5.50' },
	{ label: '$6.50 (Cold Brew / Matcha)', value: '6.50' },
	{ label: '$7.50 (Cafe Specialty)', value: '7.50' },
	{ label: '$9.00 (Breakfast Combo)', value: '9.00' },
	{ label: '$12.00 (Lunch Daily)', value: '12.00' },
	{ label: '$15.00 (Daily Takeout)', value: '15.00' },
];

export const HabitStepContent: React.FC<HabitStepProps> = ({
	habitCost,
	setHabitCost,
}) => {
	return (
		<div className="my-auto py-2 flex flex-col items-center">
			<div className="w-full rounded-2xl py-3 shadow-inner flex flex-col items-center">
				<div className="flex items-center justify-between w-full px-2 mb-1.5">
					<span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
						Choose Daily Habit
					</span>
				</div>

				<div className="w-full h-25 flex items-center justify-center">
					<WheelPickerWrapper className="w-full h-25 bg-white rounded-xl shadow-xs">
						<WheelPicker
							options={habitOptions}
							value={habitCost.toFixed(2)}
							onValueChange={(val: string) => {
								const num = parseFloat(val);
								if (!isNaN(num)) setHabitCost(num);
							}}
							optionItemHeight={32}
							visibleCount={12}
							classNames={{
								optionItem:
									'text-[12.5px] text-gray-400 font-medium select-none truncate px-2',
								highlightWrapper:
									'bg-gray-100/70 border-y border-gray-300 font-bold text-[13.5px] text-gray-900',
							}}
						/>
					</WheelPickerWrapper>
				</div>
			</div>
		</div>
	);
};

export function useHabitStep({
	wage,
	habitCost,
	setHabitCost,
}: HabitStepProps): OnboardingStepDefinition {
	return useMemo(() => {
		const habitLaborHours = wage > 0 ? habitCost / wage : 0;
		const habitLaborLabel = formatLaborTime(habitLaborHours);

		return {
			id: 'step_habits',
			image: '/screen coffee.png',
			fallbackImage:
				'https://lh3.googleusercontent.com/aida-public/AB6AXuDM41rRi-r0iiJGLDYrIj6RZ8K7PbwkdujO7EnKHKRY1WKmYfppUNLUlGGM_fX3Zsfabj1ViYdzK7rTPpjHWFJPL-MNlS-sK5nFgtF0ttuIYVEz04GErE-ZKi7TgIzNXGnyNs7D3sZr3jXxzBf9g67ulRyg9Cu-3vagjr34dzSqcdwqrFYIv5V81Z_rkoMIi2Z-DZLwTqa105ABuvbMSMr3V8iuCee3KUnOyGVlaUE',
			receipt: {
				icon: 'local_cafe',
				iconEmoji: '☕',
				iconBg: '#FEF3C7',
				iconColor: '#D97706',
				title: 'Morning Espresso',
				subtitle: `$${habitCost.toFixed(2)} • Flat expense (Daily)`,
				cost: `$${habitCost.toFixed(2)}`,
				labor: habitLaborLabel,
			},
			headline: 'Small routines silently drain your paycheck.',
			body: 'Select your everyday routine price to create your initial 1-tap quick log button with automatic work-hour conversions.',
			ctaText: 'Continue',
			renderContent: () => (
				<HabitStepContent
					wage={wage}
					habitCost={habitCost}
					setHabitCost={setHabitCost}
				/>
			),
		};
	}, [wage, habitCost, setHabitCost]);
}

