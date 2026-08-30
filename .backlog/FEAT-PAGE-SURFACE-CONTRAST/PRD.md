# FEAT-PAGE-SURFACE-CONTRAST — a page background distinct from widget/surface backgrounds

**Status:** ready-for-agent

## Tickets

| Ticket | Status | Title |
|---|---|---|
| `01-split-bg-page-and-bg-surface` | ready | 01 — Split `--bg` into `--bg-page` and `--bg-surface` |

## Problem Statement

The page background and every "card-like" surface (widgets, the template-naming dialog, the
template dropdown, the floating zoom control) all share one color today — there's no visual
separation between the page itself and the things sitting on it, so widgets don't stand out.

## Solution

Split the single `--bg` CSS variable into two: `--bg-page` (the page itself, now a light gray in
light mode) and `--bg-surface` (every card-like surface — widgets, dialogs, dropdowns, the
floating zoom control — unchanged from today's white/dark value). The page recedes, surfaces pop
forward, in both light and dark mode.

## User Stories

1. As a mission debugger, I want the page background visually distinct from each widget, so that
   widgets read as clear, separate cards rather than blending into the page.
2. As a mission debugger, I want this same visual separation in dark mode, so that the
   page-recedes/surface-pops hierarchy is consistent regardless of which mode I'm using, not a
   light-mode-only afterthought.
3. As a mission debugger, I want every surface-like element (the template-naming dialog, the
   template dropdown, the floating zoom control, buttons) to consistently use the new surface
   tone, so that nothing looks like it was missed and still shows the old shared color.
4. As a maintainer, I want a single, clearly-named pair of variables (not a one-off override
   scattered across components), so that a future surface-like component picks the right one by
   convention instead of guessing.

## Implementation Decisions

- **Two variables replace one**: `--bg-page` and `--bg-surface`, defined alongside the project's
  existing theme variables in `app.css` (light mode in `:root`, dark mode in the existing
  `@media (prefers-color-scheme: dark)` block — same mechanism already used for every other theme
  variable, no new theming mechanism introduced).
- **Every current usage of `--bg` is reclassified individually** (audited directly in the
  codebase, not assumed) — all of them turn out to be `--bg-surface` except the page root itself:
  - `:root`'s own `background` (`app.css`) → `--bg-page` (this is literally what paints the page).
  - `button` (`app.css`, global button styling) → `--bg-surface`.
  - `.widget` (`Widget.svelte`) → `--bg-surface`.
  - `.naming-dialog` and `.naming-dialog input` (`Widget.svelte`, the Memorize-template dialog)
    → `--bg-surface`.
  - The template dropdown's own background (`TemplateDropdown.svelte`) → `--bg-surface`.
  - `.zoom-control` (`ZoomControl.svelte`, the floating zoom control) → `--bg-surface`.
  - The banner (`BrandingHeader.svelte`) has no background of its own (just the image) — not
    affected either way.
- **Values**:
  - Light mode: `--bg-page` = `#e5e7eb` (a light gray, close to the reference swatch the user
    provided during grilling); `--bg-surface` = `#fff` (unchanged from today's single `--bg`).
  - Dark mode: `--bg-page` = `#0d0e12` (darker than today's single dark value, so the page still
    recedes relative to surfaces); `--bg-surface` = `#16171d` (unchanged from today's single dark
    `--bg`).
  - Both values are a starting point to confirm against a live render (light and dark) during
    implementation, not a final pixel-perfect match to the swatch — adjust if the live contrast
    looks off, same as any other visual tuning in this project.
- **Symmetric across both modes** — the "page recedes, surface pops" principle applies the same
  way in dark mode as in light mode, even though the user's original request only mentioned light
  mode explicitly (confirmed during grilling: dark mode should not be left as a flat, unchanged
  exception).
- **No new component, no new mechanism** — this is a variable split plus per-usage class-name
  reclassification in existing files, nothing structurally new.

## Testing Decisions

- Purely visual/theme change, no logic — verified by live inspection in the browser (light and
  dark mode), not a pixel-rendering test, consistent with how `FEAT-BRANDING-HEADER-REDESIGN` was
  verified.
- No existing test asserts on `--bg`'s value or name directly (confirmed: grepped for `--bg` in
  `frontend/src/lib/*.test.ts`, no matches) — no test needs updating, and no new automated test is
  needed for a color value.

## Out of Scope

- Any change to the actual page layout, spacing, or component structure — colors only.
- Redesigning the banner or any other already-delivered lot's visuals.
- A user-facing theme/color picker — the values are fixed, following the same
  `prefers-color-scheme`-only mechanism every other theme variable in this project already uses.

## Further Notes

- No ADR: a CSS theme-variable split, not an architectural decision — considered explicitly
  during grilling and declined.
- Originates from an explicit, standalone request during the branding-banner conversation
  ("j'aimerais aussi que le fond de la page soit en gris clair pour faire ressortir les
  widgets"), deliberately kept as its own lot rather than folded into
  `FEAT-BRANDING-HEADER-REDESIGN` — a different, unrelated concern (global page theme vs. one
  component's artwork).
