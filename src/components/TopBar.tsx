import React from 'react';
import { Hourglass, User } from 'lucide-react';

export interface TopBarProps {
	title: string;
	onOpenShouldIBuy?: () => void;
	onOpenOnboarding?: () => void;
	onOpenProfile?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
	title,
	onOpenShouldIBuy,
	onOpenOnboarding,
	onOpenProfile,
}) => {
	const isDashboard = title === 'Dashboard';

	return (
		<header className="fixed top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-xl">
			<div className="h-16 px-4 max-w-120 mx-auto flex items-center justify-between">
				<button
					type="button"
					onClick={onOpenOnboarding}
					title="Replay intro tour"
					className="focus:outline-none cursor-pointer flex items-center"
				>
					<h1 className="text-[28px] leading-none text-on-surface tracking-tight font-extrabold font-sans">
						{title === 'Dashboard' ? 'ImCheap' : title}
					</h1>
				</button>

				<div className="flex items-center gap-2">
					{/* Pause / Regret friction button */}
					{onOpenShouldIBuy && isDashboard && (
						<button
							type="button"
							aria-label="Should I Buy This? Pause & Regret Calculator"
							onClick={onOpenShouldIBuy}
							className="h-8 px-2.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-300/60 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
						>
							<Hourglass size={14} className="text-amber-700" />
							<span className="hidden xs:inline sm:inline">
								Worth it?
							</span>
						</button>
					)}

					<button
						type="button"
						aria-label="Open Settings / Profile"
						onClick={onOpenProfile}
						className="w-9 h-9 flex items-center justify-center rounded-full bg-[#111111] text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm"
					>
						<User size={18} />
					</button>
				</div>
			</div>
		</header>
	);
};
