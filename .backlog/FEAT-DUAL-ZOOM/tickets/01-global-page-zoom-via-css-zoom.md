# 01 — Global page zoom (banner included) via CSS `zoom`, wider range

**Status:** todo

## Parent

`.backlog/FEAT-DUAL-ZOOM/PRD.md`

## What to build

Replace the single font-size `--zoom-factor` zoom with a global page zoom implemented as the CSS
`zoom` property on a wrapper around the branding header and the grid — so the banner image scales
with it — and widen the range to 40%–200%.

- `App.svelte` owns the global-zoom `$state`, seeded from `loadZoom()` and persisted by an
  `$effect` (`saveZoom`). It renders `<div class="page" style="zoom: {zoom / 100}">` around
  `BrandingHeader` and `Grid`, and renders `ZoomControl` as a **sibling outside** that wrapper.
- `ZoomControl.svelte` loses its own `loadZoom`/`saveZoom` and its `Ctrl`+wheel listener. It
  becomes a controlled component: a bound `zoom` value plus `+`/`-` that step it by 10 and a
  `%` readout, clamped/disabled at 40 and 200. It stays `position: fixed` and must not itself be
  affected by the page zoom.
- `zoomStore.ts`: `MIN_ZOOM` becomes `40` (was 80); `MAX_ZOOM` stays 200; `ZOOM_STEP` 10;
  `DEFAULT_ZOOM` 100. `clampZoom` unchanged in shape.
- `--zoom-factor` and both `font-size: calc(… * var(--zoom-factor))` rules
  (`.cm-editor-container`, `.widget-result`) are removed — plain `font-size` again.
- The `Ctrl`+wheel gesture is not wired in this ticket (ticket 02 adds the listener and its
  routing); the floating control's buttons are enough to exercise global zoom here.

## Acceptance criteria

- [ ] The page wrapper carries `style="zoom: N"` matching the control's percentage (1 at 100%,
      0.4 at 40%, 2 at 200%).
- [ ] `ZoomControl` renders outside the zoomed wrapper in `App.svelte`.
- [ ] `+`/`-` on the control change the page zoom by 10% and update the `%` text; the buttons
      disable at 40% and 200%.
- [ ] The global zoom still persists: reload restores the last value (existing
      `dcs-bridge-webui:zoom` key), clamped to 40–200.
- [ ] `--zoom-factor` no longer appears in the codebase; the editor and result use a plain
      `font-size`.
- [ ] `zoomStore.test.ts` covers the lowered `MIN_ZOOM` (40) — save/load/clamp at the new floor.
- [ ] `ZoomControl.test.ts` covers the controlled `+`/`-`/`%`/clamp/disable behaviour (no wheel).
- [ ] `App.test.ts` covers: the wrapper's `style="zoom"` reflects the persisted level, and
      `ZoomControl` is not inside `.page`.

## Blocked by

None - can start immediately
