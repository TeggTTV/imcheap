import React from 'react';

export interface ReceiptConfig {
	icon: string;
	iconEmoji: string;
	iconBg: string;
	iconColor: string;
	title: string;
	subtitle: string;
	cost: string;
	labor: string;
}

export interface OnboardingStepDefinition {
	id: string;
	image: string;
	fallbackImage?: string;
	headline: string;
	body: string;
	ctaText: string;
	receipt: ReceiptConfig | null;
	renderContent: () => React.ReactNode;
}

export interface WageStepProps {
	wage: number;
	setWage: (wage: number) => void;
}

export interface CommuteStepProps {
	wage: number;
	mpg: number;
	setMpg: (mpg: number) => void;
	gasPrice: number;
	setGasPrice: (gasPrice: number) => void;
	tankSize: number;
	setTankSize: (tankSize: number) => void;
}

export interface HabitStepProps {
	wage: number;
	habitCost: number;
	setHabitCost: (habitCost: number) => void;
}

export interface PaycheckStepProps {
	wage: number;
	netpay: number;
	setNetpay: (netpay: number) => void;
	netpayInput: string;
	setNetpayInput: (netpayInput: string) => void;
	isEditingNetpay: boolean;
	setIsEditingNetpay: (isEditing: boolean) => void;
}

export function formatLaborTime(hours: number): string {
	if (hours <= 0 || isNaN(hours)) return '0m';
	const totalMinutes = Math.round(hours * 60);
	if (totalMinutes < 60) {
		return `≈ ${totalMinutes}m of labor`;
	}
	const hrs = (totalMinutes / 60).toFixed(1);
	return `≈ ${hrs}h of labor`;
}

