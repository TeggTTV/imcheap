import React from 'react';

export interface TopBarProps {
	title: string;
	isSearchOpen: boolean;
	onToggleSearch: () => void;
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
	title,
	isSearchOpen,
	onToggleSearch,
	searchQuery,
	onSearchQueryChange,
}) => {
	return (
		<header className="fixed top-0 inset-x-0 z-60 bg-surface/85 backdrop-blur-xl">
			<div className="h-16 px-margin max-w-120 mx-auto flex items-center justify-between">
				<div className="flex items-center gap-space-sm">
					<span className="material-symbols-outlined text-primary text-[22px]">
						toll
					</span>
					<h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
						{title}
					</h1>
				</div>

				<div className="flex items-center gap-space-xs">
					<button
						type="button"
						aria-label="Toggle Search"
						onClick={onToggleSearch}
						className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
					>
						<span className="material-symbols-outlined text-[20px]">
							{isSearchOpen ? 'close' : 'search'}
						</span>
					</button>
					{/* Non-functional profile avatar */}
					<div
						aria-hidden="true"
						className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ml-space-xs pointer-events-none select-none"
					>
						<span className="material-symbols-outlined text-on-primary text-[18px]">
							person
						</span>
					</div>
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
							onChange={(e) => onSearchQueryChange(e.target.value)}
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

