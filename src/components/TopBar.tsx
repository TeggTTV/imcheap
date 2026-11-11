import React from 'react';

export interface TopBarProps {
	title: string;
	isSearchOpen: boolean;
	onToggleSearch: () => void;
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
	onOpenShouldIBuy?: () => void;
	onOpenOnboarding?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
	title,
	isSearchOpen,
	onToggleSearch,
	searchQuery,
	onSearchQueryChange,
	onOpenShouldIBuy,
	onOpenOnboarding,
}) => {
	return (
		<header className="fixed top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-xl">
			<div className="h-16 px-margin max-w-120 mx-auto flex items-center justify-between">
				<div className="flex items-center gap-space-sm">
					<button
						type="button"
						onClick={onOpenOnboarding}
						title="Replay intro tour"
						className="flex items-center gap-space-sm group cursor-pointer focus:outline-none"
					>
						<span className="material-symbols-outlined text-primary text-[22px] group-hover:rotate-45 transition-transform">
							toll
						</span>
						<h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
							{title}
						</h1>
					</button>
				</div>

				<div className="flex items-center gap-1.5">
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
						className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
					>
						<span className="material-symbols-outlined text-[20px]">
							{isSearchOpen ? 'close' : 'search'}
						</span>
					</button>
				</div>
			</div>

			{/* Collapsible Search Bar */}
			{isSearchOpen && (
				<div className="px-margin pb-3 max-w-120 mx-auto">
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
