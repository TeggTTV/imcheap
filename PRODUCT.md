# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
College students and hourly shift workers who need to keep a close eye on their money, tracking expenses against actual work hours and commute costs.

## Product Purpose
Translate dollar expenses into hours and minutes of shift labor, calculating commute costs from vehicle mileage so spending consequences are clear before and after purchases.

## Positioning
Every financial metric anchors to shift labor time calculated from the user's hourly wage, paired with vehicle trip cost detection.

## Operating Context
Mobile web PWA used on the go, during shifts, between classes, or while commuting in a personal car. Fast bottom-sheet logging with tabular numeric inputs and zero touch lag.

## Capabilities and Constraints
- Dual-metric display converting currency into hours and minutes of labor using the live wage divisor: `(cost / hourlyWage) * 60`
- Dynamic mileage preset recalculation based on current MPG and fuel price
- Automatic trip detection and manual route tracking
- 5-tab bottom dock (Dashboard, Maps, Analytics, Presets, Settings) fitted for 375px mobile viewports
- Canvas `#F5F6F8` / `#F8F9FF`, solid white sheets, `#111111` ink, and tabular numbers
- Strict local persistence in localStorage

## Brand Commitments
Name: ImCheap. Direct, no-nonsense, utilitarian voice without corporate fintech bloat or guilt-tripping tone.

## Evidence on Hand
- Working mobile PWA implementation in `src/`
- Immutable UI and math contract in `.antigraity/ui-contract.md`
- Preloaded seed transactions, default road routes, and preset fixtures

## Product Principles
- Ground every dollar in shift hours worked so the human cost of spending stays obvious.
- Never block logging behind slow interactions, multi-screen forms, or clutter.
- Maintain mathematical precision with reactive calculations across wages and mileage rates.
- Protect mobile thumb-zone usability across standard and compact viewports.

## Accessibility & Inclusion
- High-contrast text on solid backgrounds
- Tabular figures on all animated and changing numerical values
- Touch targets sized at 52px minimum height in primary thumb zones
