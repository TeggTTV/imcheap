import React, { useState } from 'react';

export interface SetActionFeedbackButtonProps {
	onAction: () => boolean | void | Promise<boolean | void>;
	label?: string;
	className?: string;
	disabled?: boolean;
}

export const SetActionFeedbackButton: React.FC<
	SetActionFeedbackButtonProps
> = ({
	onAction,
	label = 'Set',
	className = 'w-16 h-11 bg-primary text-on-primary font-semibold text-sm rounded-xl active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-90 shrink-0',
	disabled = false,
}) => {
	const [status, setStatus] = useState<'idle' | 'loading' | 'success'>(
		'idle',
	);

	const handleClick = async () => {
		if (status !== 'idle' || disabled) return;

		const result = onAction();
		if (result === false) return;

		setStatus('loading');
		setTimeout(() => {
			setStatus('success');
			setTimeout(() => {
				setStatus('idle');
				setTimeout(() => {}, 250);
			}, 750);
		}, 250);
	};

	return (
		<button
			type="button"
			disabled={disabled || status !== 'idle'}
			onClick={handleClick}
			className={className}
		>
			{status === 'loading' ? (
				<span className="material-symbols-outlined text-[18px] animate-spin">
					progress_activity
				</span>
			) : status === 'success' ? (
				<span className="material-symbols-outlined text-[18px] text-emerald-300">
					check
				</span>
			) : (
				label
			)}
		</button>
	);
};
