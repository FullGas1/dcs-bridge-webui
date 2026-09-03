# 02 — Per-widget zoom on Ctrl+scroll over a widget

**Status:** todo

## Parent

`.backlog/FEAT-DUAL-ZOOM/PRD.md`

## What to build

`Ctrl`+scroll zooms only the widget under the pointer; `Ctrl`+scroll anywhere else zooms the
whole page (ticket 01's wrapper).

- `Grid.svelte` owns one `window` `wheel` listener (`{ passive: false }`). On every `Ctrl`+wheel
  it `preventDefault()`s (so the browser's native zoom never fires) and routes by
  `event.target.closest('.widget')`:
  - inside a widget → step that widget's zoom by ±10, clamped 40–250 (`clampWidgetZoom`);
  - otherwise → call the "nudge global zoom" callback from `App.svelte` (±10, clamped 40–200).
- `Grid` threads a per-widget `zoom` (number, default 100) through `WidgetRecord`, the props it
  passes to `<Widget>` (`initialZoom`, `onZoomChange`), and — not yet persisted here, ticket 03
  adds that — an in-memory update on wheel.
- `Widget.svelte` applies `style="zoom: {zoom / 100}"` on its `.widget` root. Nothing else in
  this ticket (the header indicator is ticket 03).
- `zoomStore.ts` gains `PER_WIDGET_MIN_ZOOM = 40`, `PER_WIDGET_MAX_ZOOM = 250`, and
  `clampWidgetZoom`.
- `ZoomControl.test.ts`'s old wheel tests move here (targeting the page path).
- Verify CodeMirror still behaves: apply a widget zoom to a widget holding a >30-line script and
  confirm in a quick manual check that the collapsed cap still shows ~30 lines (CSS `zoom`
  should scale the already-computed `editorHeightPx` proportionally). If it drifts after an
  edit, add a `remeasure()` to `CodeMirrorEditor` that the widget calls from an `$effect` on its
  zoom — keep that addition minimal.

## Acceptance criteria

- [ ] `Ctrl`+wheel-up with the event target inside a `.widget` raises that widget's
      `style="zoom"` by 0.1 and leaves the page wrapper's zoom unchanged.
- [ ] `Ctrl`+wheel-down inside a widget lowers it; it clamps at 0.4 and 2.5.
- [ ] `Ctrl`+wheel with the target outside every widget changes the page wrapper's zoom and no
      widget's.
- [ ] Every `Ctrl`+wheel calls `preventDefault()`; a wheel without `Ctrl` changes nothing and is
      not prevented.
- [ ] Two widgets zoomed differently keep independent `style="zoom"` values.
- [ ] `Grid.test.ts` covers the routing (inside vs outside), the clamps, and `preventDefault`.
- [ ] `Widget.test.ts` covers `initialZoom` → `style="zoom"`.
- [ ] Full frontend suite, `svelte-check`, `vite build` green.

## Blocked by

- Ticket 01 (the page wrapper and the App-owned global zoom the "outside" path nudges)
