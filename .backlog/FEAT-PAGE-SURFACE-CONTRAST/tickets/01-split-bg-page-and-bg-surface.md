# 01 — Split `--bg` into `--bg-page` and `--bg-surface`

**Status:** ready

## What to build

Replace the single `--bg` CSS variable with two: `--bg-page` (the page root) and `--bg-surface`
(every card-like surface), defined in both the light-mode `:root` block and the existing
`@media (prefers-color-scheme: dark)` block in `app.css`.

Reclassify every current `var(--bg)` usage (audited directly, not assumed):

| File | Selector | New variable |
|---|---|---|
| `app.css` | `:root` (page background) | `--bg-page` |
| `app.css` | `button` | `--bg-surface` |
| `Widget.svelte` | `.widget` | `--bg-surface` |
| `Widget.svelte` | `.naming-dialog` | `--bg-surface` |
| `Widget.svelte` | `.naming-dialog input` | `--bg-surface` |
| `TemplateDropdown.svelte` | the dropdown list | `--bg-surface` |
| `ZoomControl.svelte` | `.zoom-control` | `--bg-surface` |

Starting values (confirm/adjust against a live render, both modes, before calling this done):
- Light: `--bg-page: #e5e7eb`, `--bg-surface: #fff` (unchanged from today's single value).
- Dark: `--bg-page: #0d0e12`, `--bg-surface: #16171d` (unchanged from today's single value).

## Acceptance criteria

- [ ] In light mode, the page background is visibly a light gray, distinct from white widgets,
      the naming dialog, the template dropdown, and the floating zoom control.
- [ ] In dark mode, the page background is visibly darker than those same surfaces, which keep
      today's existing dark tone unchanged.
- [ ] No leftover reference to `--bg` remains anywhere in `frontend/src` (every usage reclassified
      to one of the two new variables).
- [ ] Full frontend test suite and type-check both pass (no test currently asserts on `--bg`'s
      name/value, so none should need updating, but confirm rather than assume).
- [ ] Verified live in the browser, both light and dark mode (this is a pure CSS/visual change,
      not covered by an automated rendering test).

## Blocked by

None - can start immediately
