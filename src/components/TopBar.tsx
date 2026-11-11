import React from 'react';

export interface TopBarProps {
	title: string;
	isSearchOpen: boolean;
	onToggleSearch: () => void;
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
	onOpenShouldIBuy?: () => void;
	onOpenOnboarding?: () => void;
	onOpenProfile?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
	title,
	isSearchOpen,
	onToggleSearch,
	searchQuery,
	onSearchQueryChange,
	onOpenShouldIBuy,
	onOpenOnboarding,
	onOpenProfile,
}) => {
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
					{onOpenShouldIBuy && (
						<button
							type="button"
							aria-label="Should I Buy This? Pause & Regret Calculator"
							onClick={onOpenShouldIBuy}
							className="h-8 px-2.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-300/60 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
						>
							<span className="material-symbols-outlined text-[15px] text-amber-700">
								hourglass_bottom
							</span>
							<span className="hidden xs:inline sm:inline">
								Worth it?
							</span>
						</button>
					)}

					<button
						type="button"
						aria-label="Toggle Search"
						onClick={onToggleSearch}
						className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 text-[#111111] transition-colors cursor-pointer"
					>
						<span className="material-symbols-outlined text-[24px]">
							{isSearchOpen ? 'close' : 'search'}
						</span>
					</button>

					<button
						type="button"
						aria-label="Open Settings / Profile"
						onClick={onOpenProfile}
						className="w-9 h-9 flex items-center justify-center rounded-full bg-[#111111] text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm"
					>
						<span className="material-symbols-outlined text-[20px]">
							person
						</span>
					</button>
				</div>
			</div>

			{/* Collapsible Search Bar */}
			{isSearchOpen && (
				<div className="px-4 pb-3 max-w-120 mx-auto">
					<div className="flex items-center gap-2 bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 shadow-xs">
						<span className="material-symbols-outlined text-outline text-[18px]">
							search
						</span>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) =>
								onSearchQueryChange(e.target.value)
							}
							placeholder="Search transactions or categories..."
							aria-label="Search transactions"
							autoFocus
							className="w-full bg-transparent text-[14px] text-on-surface placeholder:text-outline focus:outline-none"
						/>
						{searchQuery && (
							<button
								type="button"
								aria-label="Clear search"
								onClick={() => onSearchQueryChange('')}
								className="text-outline hover:text-on-surface cursor-pointer"
							>
								<span className="material-symbols-outlined text-[16px]">
									cancel
								</span>
							</button>
						)}
					</div>
				</div>
			)}
		</header>
	);
};
