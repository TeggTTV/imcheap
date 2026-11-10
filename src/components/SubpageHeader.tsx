import React from 'react';

export interface SubpageHeaderProps {
	title: string;
	backLabel?: string;
	onBack: () => void;
}

export const SubpageHeader: React.FC<SubpageHeaderProps> = ({
	title,
	backLabel = 'Back',
	onBack,
}) => {
	return (
		<div className="flex items-center justify-between pb-3 mb-2">
			<button
				type="button"
				onClick={onBack}
				className="flex items-center gap-1.5 text-on-surface hover:opacity-75 transition-opacity cursor-pointer px-1 py-1 -ml-1"
			>
				<span className="material-symbols-outlined text-[20px] shrink-0 leading-none">
					chevron_left
				</span>
				<span className="font-medium text-sm text-on-surface">
					{backLabel}
				</span>
			</button>
			<h2 className="text-[17px] font-semibold text-[#111111]">
				{title}
			</h2>
			<div className="w-16 shrink-0" />
		</div>
	);
};

