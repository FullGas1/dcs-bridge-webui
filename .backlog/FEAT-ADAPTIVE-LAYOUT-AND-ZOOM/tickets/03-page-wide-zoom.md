# 03 — Page-wide zoom control

**Status:** ready

## What to build

A single zoom level for the whole page (not per-widget, not separate for editors vs. results —
that two-level option was considered and dropped during grilling), controllable from a floating
button pair and from Ctrl+scroll anywhere on the page, and persisted across visits.

- One global scale value drives font-size (relative CSS units) applied to both every
  CodeMirror editor's container and every result's text element, uniformly.
- Purely visual: must never touch a document's content or its undo history. The line-number
  gutter is expected to scale proportionally since it renders in the same relative units as the
  code text — confirm this visually; only fall back to reconfiguring CodeMirror's own
  theme/extension API if plain CSS inheritance doesn't scale it correctly.
- Control: a single floating control, fixed position, bottom-right of the page, reachable at any
  scroll position — not duplicated per-widget (a per-widget control would misleadingly imply a
  per-widget effect). One `+`/`-` button pair.
- Ctrl+scroll works anywhere on the page (no need to target a specific area — there's only one
  zoom level).
- Range: 80%–200%, in 10% increments per button click or wheel tick, clamped at both ends.
- Persistence: `localStorage`, following the existing convention already used by
  `widgetSession.ts` (a project-prefixed key, e.g. `dcs-bridge-webui:zoom`).

## Acceptance criteria

- [ ] Clicking `+`/`-` on the floating control changes every editor's and every result's text
      size together, in 10% steps, clamped to 80%–200%.
- [ ] Ctrl+scroll anywhere on the page changes the same single zoom value, in the same 10% steps.
- [ ] The floating control stays visible and in the same screen position while the page is
      scrolled.
- [ ] The zoom level persists: reloading the page restores the last-set value instead of
      resetting to 100%.
- [ ] Zooming an editor does not add an undo-history entry and does not change its document
      content — only visual size changes.
- [ ] The zoom store/persistence layer (localStorage read/write, clamping to the 80%–200% range)
      has its own test coverage, the same way `widgetSession.ts` already does.

## Blocked by

None - can start immediately (independent of tickets 01/02: the dynamic-height formula in
ticket 02 reads the live measured line height at calculation time, so it stays correct
regardless of the zoom level in effect, with no ordering dependency needed between the two).
