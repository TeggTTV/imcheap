---
name: Clarity Expense
colors:
  surface: '#f8f9ff'
  surface-dim: '#d4dae7'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e7eefb'
  surface-container-high: '#e2e8f5'
  surface-container-highest: '#dce3f0'
  on-surface: '#151c25'
  on-surface-variant: '#444748'
  inverse-surface: '#2a313b'
  inverse-on-surface: '#eaf1fe'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#410002'
  on-tertiary-container: '#f63a35'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#f8f9ff'
  on-background: '#151c25'
  surface-variant: '#dce3f0'
typography:
  display-hero:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  numeric-entry:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1.25rem
  margin-sm: 1rem
  margin-lg: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies high-efficiency financial minimalism. Designed for high-frequency daily logging and glanceable tracking, it eliminates visual friction in favor of crisp typographic hierarchy, precise data display, and effortless transaction entries. 

The aesthetic is ultra-modern, utilitarian minimalism:
- **Atmosphere:** Calm, disciplined, and razor-sharp. It removes anxiety from personal finance by delivering raw clarity rather than dense charts.
- **Visual Stance:** Zero decorative gradients, no unnecessary skeuomorphism, and zero ornamental icons. Structure is established through generous whitespace, high-contrast typography, and deliberate framing.
- **Tactile Quality:** Native-speed interactions with micro-feedback. Taps feel precise and immediate, using subtle border outlines and soft ambient elevation over pure white card surfaces against a cooling backdrop.

## Colors

The palette is stark, functional, and disciplined. Color is used strictly to encode meaning and direct operational focus.

- **Canvas & Surfaces:**
  - Canvas Root: Soft neutral cool gray (`#F5F6F8`) providing a soft, non-fatiguing foundation.
  - Surface Containers: Pure solid white (`#FFFFFF`) to create crisp content islands.
  - Surface Subdued: Very subtle cool gray tint (`#ECEEF1`) for nested tags, secondary inputs, and table headers.

- **Brand & Structural Content:**
  - Primary (`#111111`): Deep pitch charcoal used for primary numbers, critical headings, actionable buttons, and primary data rows.
  - Border Subdued (`#E5E7EB` / `#E2E4E8`): Hairline structural divider line to partition list items without visual noise.

- **Status & Financial Semantics:**
  - Secondary (`#16A34A`): Vibrant emerald green reserved strictly for positive financial delta, income, budgets under limit, and affirmative confirmations.
  - Tertiary (`#DC2626`): Crisp crimson red reserved for expense outflows, budget overruns, and destructive actions.
  - Neutral / Muted (`#9CA3AF`): Cool slate for category labels, timestamps, deactivated states, and helper legends.
  - Subtle Neutral (`#C7C7CC`): Icon strokes, inactive toggles, and placeholder text.

## Typography

The type system is powered by **Hanken Grotesk**, chosen for its geometric discipline, razor-sharp modern apertures, and exceptionally legible tabular numeral forms.

- **Tabular Figures:** All expense values, balances, and dates must be rendered using `font-variant-numeric: tabular-nums` to eliminate jitter when digits update.
- **Hierarchy Rules:** 
  - `numeric-entry` and `display-hero` are dedicated to primary wallet balances and active keypad input.
  - Expense amounts always use medium or bold weights (`600` or `700`) to guarantee scan-speed comprehension.
  - Secondary metadata (dates, merchant subcategories, card IDs) must always drop into `body-sm` or `label-md` rendered in neutral slate (`#9CA3AF`).
- **All-Caps Application:** Only `label-sm` is permitted to use uppercase styling, restricted strictly to section dividers (e.g., "TODAY", "YESTERDAY", "CATEGORIES") with `letterSpacing: 0.05em`.

## Layout & Spacing

The layout is built around mobile-first utility, using an 8pt-derived spacing rhythm designed for single-handed mobile reach.

- **Grid & Alignment:**
  - Phone layouts follow a single-column fluid layout with strict horizontal margin bounds (`margin: 1.25rem` / 20px).
  - Tablet/Desktop viewports constrain main content to a centered maximum column width of `480px` for the core feed and keypad interfaces, preserving mobile ergonomics on larger viewports.
- **Rhythm & Safe Areas:**
  - Card internal padding consistently uses `space-lg` (20px) on mobile for primary balance containers and `space-md` (14px) for compact expense rows.
  - Fixed action bars and floating number pads respect device bottom-safe insets plus an explicit `space-lg` offset.
  - Gaps between vertical dashboard stacks rely strictly on `space-md` (14px) to retain continuous narrative flow without detached blocks.

## Elevation & Depth

Visual hierarchy relies on quiet, atmospheric separation instead of heavy drop shadows or layered skeuomorphic depths.

- **Base Layer (Level 0):** Soft cool gray canvas (`#F5F6F8`), flat and unshadowed.
- **Card Tier (Level 1):** Solid white surface (`#FFFFFF`) with a micro-border `1px solid rgba(17, 17, 17, 0.04)` combined with an ultra-diffused ambient shadow:
  - `box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.02), 0px 4px 12px rgba(0, 0, 0, 0.03)`
- **Interactive / Floating Tier (Level 2):** Floating input modals, bottom sheets, and the main log trigger:
  - `box-shadow: 0px 8px 24px rgba(17, 17, 17, 0.08), 0px 2px 6px rgba(17, 17, 17, 0.04)`
- **Pressed State:** Elements flatten completely, dropping elevation to Level 0 with a slight background shift (`#F9FAFB`) for instant tactile confirmation.

## Shapes

The system uses a contemporary, refined curvature standard (`roundedness: 2`):

- **Default Elements:** 
  - Standard cards, transaction item containers, and input fields utilize `0.75rem` (12px) to `1rem` (16px) corner rounding.
  - Small tags, category pills, and numeric keypad keys utilize `0.5rem` (8px).
- **Hero Containers & Sheets:** Modal bottom sheets and top balance summaries use `rounded-xl` (1.5rem / 24px) along their exposed corners to feel soft and approachable.
- **Circular Elements:** Reserved strictly for iconography frames (e.g., category icon discs) and the quick-add floating action button.

## Components

### Buttons
- **Primary Action (Log Expense / Save):** Solid pitch black (`#111111`) fill, pure white text, no outline, `height: 52px`, `border-radius: 12px`, typography `label-lg`. Active scale down to `0.98` on tap.
- **Secondary Action:** Transparent background with subtle border `1px solid #E5E7EB`, text `#111111`.
- **Tertiary / Utility:** Pure text button, `#9CA3AF` state changing to `#111111` upon press.

### Transaction Row / Lists
- **Structure:** Clean 3-part layout (Left: Category icon pill; Middle: Title & timestamp; Right: Tabular amount).
- **Background:** White card surface. Rows inside a group are separated by hairlines (`#F3F4F6`), omitting the bottom-most divider.
- **Amount Treatment:** Inflows/income render in vibrant emerald green (`#16A34A`) with a preceding `+`. Outflows render in primary charcoal (`#111111`) with an optional subtle minus sign `−`.

### Chips & Filter Pills
- **Inactive:** Cool gray tint (`#ECEEF1`) fill, text `#9CA3AF`, no border.
- **Active / Selected:** Pitch black (`#111111`) fill, pure white text.
- **Height:** Compact `32px` touch targets with `border-radius: 8px`.

### Input Fields & Keypad
- **Quick-Entry Input:** Minimalist borderless or single baseline input. Big typographic numerals (`numeric-entry`). Currency symbol anchored at `headline-md` in `#9CA3AF`.
- **Note / Metadata Fields:** Background `#FFFFFF`, border `1px solid #E5E7EB`, focused border `1.5px solid #111111`. Zero colored glows.

### Summary Cards
- Pure white `#FFFFFF` surface with Level 1 ambient elevation. Contains the glanceable monthly spend figure, horizontal progress micro-bar (spending velocity), and comparisons with pure neutral labeling.

### Checkboxes & Segmented Controls
- **Segmented Control (Expense vs. Income):** Soft neutral container (`#ECEEF1`), with a sliding white pill indicator (`#FFFFFF`) with subtle shadow for the active state.
- **Checkboxes:** Crisp square box with `4px` radius, checked state fills `#111111` with a white minimalist check icon.