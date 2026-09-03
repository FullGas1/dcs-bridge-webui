# 04 — Manual verification (HITL), Chrome + Firefox

**Status:** done
**Type:** HITL — needs a human at the running app; CSS `zoom` visual behaviour is not testable in jsdom

## Parent

`.backlog/FEAT-DUAL-ZOOM/PRD.md`

## What to build

Nothing — a verification pass against the running exe, in **Chrome and Firefox**.

## Acceptance criteria

- [x] `Ctrl`+scroll over a widget zooms only that widget; the others don't move.
- [x] `Ctrl`+scroll over the banner / a gap / the `+` button zooms the whole page, banner
      included, and the banner visibly shrinks.
- [x] Page zoom goes down to 40% and up to 200%; widget zoom down to 40% and up to 250%; the
      floating control's `%` and buttons match the page zoom and clamp correctly.
- [x] A widget zoomed off 100% shows its `%` in the header; clicking it snaps back to 100%.
- [x] A zoomed-in widget's collapsed editor still caps at ~30 lines (just larger); Expand and
      Collapse still work at that zoom, and after editing a line the cap doesn't drift.
- [x] The floating control stays a constant on-screen size at any page zoom and is still usable.
- [x] `Ctrl`+scroll never triggers the browser's own zoom; a plain scroll scrolls normally.
- [x] Page zoom and each widget's zoom persist across a reload; an older session loads at 100%.
- [x] Same results in Chrome and Firefox.

## Blocked by

- Ticket 01
- Ticket 02
- Ticket 03
