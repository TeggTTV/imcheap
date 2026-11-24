# IMCHEAP IMMUTABLE UI & MATH CONTRACT

Any code change that violates these rules MUST be rejected by the QA Agent and sent back to the Builder Agent before completion.

## 1. Visual & Color Invariants

- **Canvas:** `#F5F6F8` / `#F8F9FF`
- **Cards & Sheets:** Solid `#FFFFFF` (never dark-mode flip unless explicitly requested)
- **Primary Ink / CTAs:** `#111111`[cite: 1]
- **Labor Accent:** `#059669` text on `#ECFDF5` pill backgrounds[cite: 1]
- **Typography:** `'Hanken Grotesk', sans-serif` with `font-variant-numeric: tabular-nums` on all currency, mileage, and hour values[cite: 1].

## 2. Geometry & Anti-Regression Rules (Historical Bugs to Block)

- **No "White Canyons":** Never put `justify-between` on a `min-h-screen` or `flex-1` bottom sheet that stretches headline and CTA buttons apart. Sheets must hug content or anchor cleanly with `100dvh` + `pb-safe`.
- **No Black Bottom Voids:** Bottom sheets and navigation docks must extend flush to the bottom edge with `pb-safe` clearance[cite: 1, 2].
- **Floating Pill Clearance:** Any floating receipt pill using `-bottom-6` MUST be paired with `pt-11` or `pt-12` on the sheet below so headlines never collide or clip[cite: 1, 2].
- **No Unrequested Grab Handles:** Static onboarding cards must NEVER render drag-handle pills (`—`)[cite: 1, 2].
- **Thumb-Zone Navigation:** Secondary `< Back` and primary `Continue →` buttons sit side-by-side at the bottom (`h-[52px]`, `rounded-2xl`), never in the top-left header[cite: 1, 2].
- **5-Tab Bottom Dock Fit:** `Dashboard`, `Maps`, `Analytics`, `Presets`, `Settings` must render on a single row at `375px` width with zero label wrapping or overlap with the collapsed `$ 0.00` Action Dock[cite: 2, 3].
- **Gesture Isolation:** Vertical wheel pickers inside bottom sheets must stop touch propagation so outer horizontal swipe gestures do not hijack scrolling[cite: 1, 2].

## 3. Math & State Invariants

- **Live Wage Divisor:** Always compute labor time via `(cost / hourlyWage) * 60`—never hardcode `/ 20`[cite: 1, 2].
- **Reactive Mileage:** Updating `MPG` or `gasPrice` must recalculate all `MILES` presets immediately[cite: 1, 2].
- **Safe Decimal Buffer:** Numeric inputs (e.g., `238.50`) must keep a raw string buffer while focused and parse on blur/commit[cite: 1, 2].
