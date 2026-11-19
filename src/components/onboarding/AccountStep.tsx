import React, { useState, useEffect } from 'react';
import { Hourglass, Mail, RotateCw, CheckCircle2, ChevronRight } from 'lucide-react';

interface AccountStepProps {
	onNext: () => void;
	onBack: () => void;
	onSkip: () => void;
	userName?: string;
}

export const AccountStep: React.FC<AccountStepProps> = ({
	onNext,
	onBack,
	onSkip,
	userName = '',
}) => {
	const [showEmailForm, setShowEmailForm] = useState(false);
	const [fullName, setFullName] = useState(() => {
		if (userName) return userName;
		if (typeof window !== 'undefined') {
			try {
				return localStorage.getItem('imcheap_user_name') || '';
			} catch {}
		}
		return '';
	});

	// Synchronize when userName prop arrives or changes
	useEffect(() => {
		if (userName) {
			setFullName(userName);
		} else if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('imcheap_user_name');
				if (saved) setFullName(saved);
			} catch {}
		}
	}, [userName]);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

	const handleCreateAccount = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (status !== 'idle') return;

		setStatus('loading');

		setTimeout(() => {
			if (typeof window !== 'undefined') {
				try {
					localStorage.setItem(
						'imcheap_user_account',
						JSON.stringify({
							name: fullName,
							email: email || 'user@example.com',
							createdAt: new Date().toISOString(),
						}),
					);
					if (fullName) {
						localStorage.setItem('imcheap_user_name', fullName);
					}
				} catch {}
			}

			setStatus('success');
			setTimeout(() => {
				onNext();
			}, 400);
		}, 600);
	};

	const handleOAuthLogin = (provider: 'apple' | 'google') => {
		if (status !== 'idle') return;
		setStatus('loading');

		setTimeout(() => {
			if (typeof window !== 'undefined') {
				try {
					localStorage.setItem(
						'imcheap_user_account',
						JSON.stringify({
							name: fullName || (provider === 'apple' ? 'Apple User' : 'Google User'),
							provider,
							createdAt: new Date().toISOString(),
						}),
					);
				} catch {}
			}
			setStatus('success');
			setTimeout(() => {
				onNext();
			}, 300);
		}, 500);
	};

	return (
		<div className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] p-6 pb-safe">
			{/* Ambient Glowing Orbs */}
			<div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
				<div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-[#86f2e4]/30 blur-[100px]" />
				<div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-[#85f8c4]/25 blur-[90px]" />
				<div className="absolute -bottom-24 left-10 w-96 h-96 rounded-full bg-[#ebe7e7]/60 blur-[110px]" />
			</div>

			{/* Top Navigation */}
			<header className="relative z-20 flex items-center justify-between w-full pt-1 pb-1">
				<div className="flex items-center gap-1.5">
					<span className="text-[18px] font-extrabold tracking-tight text-[#1c1b1b] font-sans">
						ImCheap
					</span>
				</div>
				<button
					type="button"
					onClick={onSkip}
					className="text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors py-1.5 px-3 rounded-full hover:bg-neutral-100 active:scale-95 cursor-pointer font-medium"
				>
					Skip
				</button>
			</header>

			{/* Center Body */}
			<div className="relative z-10 flex-1 flex flex-col justify-center my-auto py-3">
				{/* Header Section */}
				<section className="flex flex-col items-center justify-center text-center mb-6">
					<div className="relative mb-4 group cursor-default">
						<div className="absolute inset-0 bg-[#85f8c4]/60 rounded-2xl blur-xl scale-95" />
						<div className="relative w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center">
							<Hourglass size={32} className="text-[#006948]" />
						</div>
					</div>
					<h1 className="text-[30px] leading-[36px] font-extrabold text-[#1c1b1b] tracking-tight mb-2 max-w-[320px] font-sans">
						Save your runway.
					</h1>
					<p className="text-[14px] text-[#3d4a42] max-w-[285px] mx-auto leading-relaxed">
						Create an account to back up your wage engine, presets, and shift history.
					</p>
				</section>

				{/* Options Section */}
				{!showEmailForm ? (
					<section className="flex flex-col gap-3 w-full max-w-[340px] mx-auto">
						{/* Apple Button */}
						<button
							type="button"
							onClick={() => handleOAuthLogin('apple')}
							disabled={status !== 'idle'}
							className="w-full h-[52px] rounded-2xl bg-[#111111] hover:bg-black text-white shadow-sm flex items-center justify-center gap-3 px-5 active:scale-[0.98] transition-all cursor-pointer font-semibold text-[14px] disabled:opacity-75"
						>
							<svg aria-hidden="true" className="w-5 h-5 fill-current" viewBox="0 0 170 170">
								<path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.85-12.04-14.3-6.04-8.98-10.82-19.01-14.34-30.08-3.52-11.07-5.28-21.72-5.28-31.95 0-14.54 3.79-26.68 11.37-36.43 7.58-9.74 17.08-14.77 28.5-15.08 4.25 0 9.28 1.16 15.08 3.48 5.8 2.33 9.65 3.54 11.55 3.65 1.58-.12 5.56-1.39 11.95-3.81 6.38-2.43 11.45-3.55 15.2-3.37 11.03.62 19.86 4.75 26.49 12.39-9.82 5.92-14.63 14.15-14.42 24.68.22 8.16 3.37 15.07 9.47 20.73 6.1 5.66 13.38 9.07 21.84 10.23-2.18 6.45-4.8 12.71-7.87 18.77zM119.22 33.15c0-6.9 2.52-13.43 7.55-19.58 5.03-6.16 11.32-10.15 18.88-11.97.74 2.87 1.11 5.64 1.11 8.31 0 7.02-2.58 13.56-7.73 19.63-5.15 6.07-11.66 9.87-19.53 11.41-.18-2.52-.28-5.12-.28-7.8z" />
							</svg>
							<span>Continue with Apple</span>
						</button>

						{/* Google Button */}
						<button
							type="button"
							onClick={() => handleOAuthLogin('google')}
							disabled={status !== 'idle'}
							className="w-full h-[52px] rounded-2xl bg-white hover:bg-neutral-50 text-[#1c1b1b] border border-neutral-200 shadow-xs flex items-center justify-center gap-3 px-5 active:scale-[0.98] transition-all cursor-pointer font-semibold text-[14px] disabled:opacity-75"
						>
							<svg aria-hidden="true" className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
								<path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.16z" fill="#4285F4" />
								<path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" fill="#34A853" />
								<path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z" fill="#FBBC05" />
								<path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335" />
							</svg>
							<span>Continue with Google</span>
						</button>

						{/* Email Button */}
						<button
							type="button"
							onClick={() => setShowEmailForm(true)}
							disabled={status !== 'idle'}
							className="w-full h-[52px] rounded-2xl bg-white hover:bg-neutral-50 text-[#1c1b1b] border border-neutral-200 shadow-xs flex items-center justify-center gap-3 px-5 active:scale-[0.98] transition-all cursor-pointer font-semibold text-[14px] disabled:opacity-75"
						>
							<Mail size={20} className="text-neutral-600" />
							<span>Continue with Email</span>
						</button>
					</section>
				) : (
					<form onSubmit={handleCreateAccount} className="flex flex-col gap-3 w-full max-w-[340px] mx-auto">
						{/* Prefilled Name Field */}
						<div className="flex flex-col gap-1">
							<label className="text-[12px] font-semibold text-neutral-500 px-1">
								Name
							</label>
							<input
								type="text"
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
								placeholder="Your name"
								required
								className="w-full h-12 px-4 rounded-xl bg-white border border-neutral-200 text-[14px] text-neutral-900 focus:outline-none focus:border-neutral-900"
							/>
						</div>

						{/* Email Field */}
						<div className="flex flex-col gap-1">
							<label className="text-[12px] font-semibold text-neutral-500 px-1">
								Email
							</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="name@example.com"
								required
								className="w-full h-12 px-4 rounded-xl bg-white border border-neutral-200 text-[14px] text-neutral-900 focus:outline-none focus:border-neutral-900"
							/>
						</div>

						{/* Password Field */}
						<div className="flex flex-col gap-1">
							<label className="text-[12px] font-semibold text-neutral-500 px-1">
								Password
							</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Create a password"
								required
								className="w-full h-12 px-4 rounded-xl bg-white border border-neutral-200 text-[14px] text-neutral-900 focus:outline-none focus:border-neutral-900"
							/>
						</div>

						<div className="flex items-center gap-2 mt-2">
							<button
								type="button"
								onClick={() => setShowEmailForm(false)}
								className="h-12 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[14px] font-semibold transition-colors cursor-pointer"
							>
								Back
							</button>
							<button
								type="submit"
								disabled={status !== 'idle'}
								className={`flex-1 h-12 rounded-xl text-white font-bold text-[14px] uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
									status === 'success'
										? 'bg-[#006948]'
										: 'bg-[#111111] hover:bg-neutral-800'
								}`}
							>
								{status === 'loading' ? (
									<RotateCw size={20} className="animate-spin" />
								) : status === 'success' ? (
									<>
										<CheckCircle2 size={20} />
										<span>Account Created</span>
									</>
								) : (
									<span>Create Account</span>
								)}
							</button>
						</div>
					</form>
				)}
			</div>

			{/* Footer / Skip Link */}
			<footer className="relative z-20 w-full flex flex-col items-center justify-center pt-2">
				<button
					type="button"
					onClick={onNext}
					className="group flex items-center gap-1 text-[13px] font-semibold text-neutral-600 hover:text-neutral-900 transition-colors mb-2 py-1 px-3 cursor-pointer"
				>
					<span>Continue without an account</span>
					<ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
				</button>
				<p className="text-[11px] text-neutral-400 text-center max-w-[270px] leading-tight">
					By continuing, you agree to our Terms and Privacy Policy.
				</p>
			</footer>
		</div>
	);
};
