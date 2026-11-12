import React, { useMemo } from 'react';
import {
	OnboardingStepDefinition,
	PaycheckStepProps,
	formatLaborTime,
} from './types';

export const PaycheckStepContent: React.FC<PaycheckStepProps> = ({
	netpay,
	setNetpay,
	netpayInput,
	setNetpayInput,
	isEditingNetpay,
	setIsEditingNetpay,
}) => {
	return (
		<div className="my-auto py-2 flex flex-col items-center w-full">
			<div className="w-full rounded-3xl bg-[#F9FAFB] border border-[#F3F4F6] p-5 flex flex-col items-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
				<span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
					What was your net pay last month?
				</span>

				<div className="flex items-center justify-center gap-2 mb-4 w-full">
					<span className="text-[28px] sm:text-[32px] font-extrabold text-[#111111]">
						$
					</span>
					<div
						className={`relative flex items-center justify-center rounded-2xl bg-white transition-all duration-350 ease-in-out ${
							isEditingNetpay
								? 'w-56 px-3 py-1 border border-neutral-300/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
								: 'w-40 px-2 py-0 border border-transparent'
						}`}
					>
						<input
							type="text"
							inputMode="decimal"
							value={netpayInput}
							onFocus={(e) => {
								setIsEditingNetpay(true);
								if (netpayInput === '0.00') {
									e.currentTarget.select();
								}
							}}
							onBlur={() => {
								setIsEditingNetpay(false);
								const parsed = parseFloat(netpayInput);
								if (!isNaN(parsed) && parsed >= 0) {
									setNetpay(parsed);
									setNetpayInput(parsed.toFixed(2));
								} else {
									setNetpayInput(netpay.toFixed(2));
								}
							}}
							onChange={(e) => {
								const val = e.target.value;
								if (/^\d*\.?\d*$/.test(val)) {
									setNetpayInput(val);
									const parsed = parseFloat(val);
									if (!isNaN(parsed) && parsed >= 0) {
										setNetpay(parsed);
									}
								}
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									(e.target as HTMLInputElement).blur();
								}
							}}
							className="w-full text-[32px] sm:text-[36px] font-black text-[#111111] tracking-tight bg-transparent border-none p-0 text-center outline-none focus:outline-none focus:ring-0 select-text cursor-text"
						/>
					</div>
				</div>

				{/* Privacy Badge */}
				<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-100 shadow-xs text-[12px] font-medium text-gray-500">
					<svg
						className="w-3.5 h-3.5 text-emerald-600 stroke-2"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
						/>
					</svg>
					<span>Private & stored on device</span>
				</div>
			</div>
		</div>
	);
};

export function usePaycheckStep({
	wage,
	netpay,
	setNetpay,
	netpayInput,
	setNetpayInput,
	isEditingNetpay,
	setIsEditingNetpay,
}: PaycheckStepProps): OnboardingStepDefinition {
	return useMemo(() => {
		const paycheckLaborHours = wage > 0 ? netpay / wage : 0;
		const paycheckLaborLabel = formatLaborTime(paycheckLaborHours);

		return {
			id: 'step_final',
			image: '/screen final.png',
			fallbackImage: '',
			receipt: {
				icon: 'payments',
				iconEmoji: '💵',
				iconBg: 'rgba(209, 250, 229, 0.6)',
				iconColor: 'rgb(5, 150, 105)',
				title: 'Monthly Take-Home',
				subtitle: `$${netpay.toFixed(2)} • Direct Deposit`,
				cost: `$${netpay.toFixed(2)}`,
				labor: paycheckLaborLabel,
			},
			headline: 'Getting Started',
			body: 'In order to start using the app, we need to know how much you made last month. This is so you can start tracking your spending right away.',
			ctaText: 'Continue',
			renderContent: () => (
				<PaycheckStepContent
					wage={wage}
					netpay={netpay}
					setNetpay={setNetpay}
					netpayInput={netpayInput}
					setNetpayInput={setNetpayInput}
					isEditingNetpay={isEditingNetpay}
					setIsEditingNetpay={setIsEditingNetpay}
				/>
			),
		};
	}, [
		wage,
		netpay,
		setNetpay,
		netpayInput,
		setNetpayInput,
		isEditingNetpay,
		setIsEditingNetpay,
	]);
}
