# Clarity Expense - Animation & Interaction Enhancements

Enhance the Clarity Expense applet with seamless native-feel mobile interactions, morphing dock animations, accurate hero balance typography matching the uploaded screenshot, smooth sliding sheets, and comprehensive item management.

## User Review & Critical Decisions

> [!IMPORTANT]
> All key preferences were confirmed in Phase 1:
> - **Dock Expansion**: Clicking the money input in the bottom dock will morph and smoothly expand upward directly into the full numeric keypad screen (Screen 4).
> - **Hero Balance Header**: Updated to display strictly `$146.00` in bold display typography accompanied by `of $238.00` in neutral tabular text, exactly matching `image_73393fb4.png`.
> - **Sheet Transitions**: Full slide-up and slide-down spring animations powered by `motion/react` (already pre-installed in `package.json`).
> - **Transaction Actions**: Tap/swipe interaction on transaction rows to edit notes/amounts or delete.
> - **Preset Management**: Tap/edit action to modify existing presets directly in the preset builder sheet.

---

### 1. Overview & Core Concept
The application provides high-speed, frictionless expense tracking designed around thumb-zone ergonomics. This update bridges the transition between the collapsed bottom dock and the expanded numeric input, ensuring visual continuity rather than jarring modal jumps.

---

### 2. User Experience & Visual Design
- **Hero Balance Match**:
  - Main Dashboard hero balance renders `$146.00` with adjacent `of $238.00` in `#9CA3AF`, with proper baseline alignment and tabular numeral spacing.
- **Morphing Bottom Dock**:
  - The bottom dock smoothly transitions its height, border radius, and content from the compact bar (`$0.00` input + quick presets) into the expanded Screen 4 keypad container with the mindful work-hours badge and category pills.
- **Sliding Balance Breakdown (Screen 3)**:
  - Tapping the hero balance slides the `Balance Breakdown` bottom sheet up with spring physics and backdrop scrim fade, and slides down smoothly upon closing.
- **Preset Sheet & Transaction Management**:
  - Editing presets by tapping or selecting edit mode.
  - Interactive transaction row details with inline removal or modification.

---

### 3. Key Product Decisions & Trade-Offs
- **Animation Framework**: Utilize the already-installed `motion` package (`motion/react`) for layout animations and `AnimatePresence`, avoiding brittle manual CSS timeout orchestration.
- **Dock Morphing**: Leverage shared layout state so the input value entered in the compact dock immediately carries over to the expanded keypad without resetting.

---

### 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                           App.tsx                            │
│  - Active Tab State ('dashboard' | 'analytics' | 'presets' ) │
│  - Active Sheet State ('none' | 'breakdown' | 'preset')      │
│  - Dock Expanded State (boolean)                             │
│  - Shared Transactions & Presets State                       │
└───────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐
│   Dashboard      │  │ Dynamic Dock     │  │ Sliding Modals         │
│  - Hero Balance  │  │  - Compact Mode  │  │  - Balance Breakdown   │
│    "$146 of $238"│  │  - Expanded Mode │  │  - Preset Config Sheet │
│  - Tx List       │  │    (Screen 4)    │  │  - Tx Edit Drawer      │
└──────────────────┘  └──────────────────┘  └────────────────────────┘
```
