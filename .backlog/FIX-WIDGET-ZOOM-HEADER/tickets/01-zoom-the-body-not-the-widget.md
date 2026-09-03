# 01 — Move the per-widget zoom onto a `.widget-body` wrapper

**Status:** done

## Parent

`.backlog/FIX-WIDGET-ZOOM-HEADER/PRD.md`

## What to build

- Wrap `.widget-editor` and `.widget-result` in a new `<div class="widget-body">` inside
  `.widget`. The header stays a direct child of `.widget`, before the body.
- The per-widget zoom inline style moves from `.widget` to `.widget-body`
  (`style={zoom !== 100 ? \`zoom: \${zoom / 100}\` : ''}`).
- `.widget-body` gets the flex-column layout that `.widget` had between the header and the
  editor/result: `flex: 1; display: flex; flex-direction: column; min-height: 0`.
- `Widget.svelte`'s `onHeaderContextMenu` drops the `/ (zoom / 100)` coordinate adjustment — the
  `.widget` the menu renders in is no longer zoomed.
- `data-widget-id`, `data-any-expanded`, `data-drag-over`, the drop capture handlers and the
  `WidgetContextMenu` all stay on / in `.widget`, unchanged.

## Acceptance criteria

- [x] A widget at `initialZoom` 150 renders `style="zoom: 1.5"` on `.widget-body` and no zoom
      style on `.widget` or `.widget-header`.
- [x] A widget at 100 has no zoom style anywhere.
- [x] `Ctrl`+wheel over a widget changes `.widget-body`'s `style.zoom`, still clamped 40–250,
      still not touching the page zoom.
- [x] Two widgets keep independent `.widget-body` zooms; a wheel-zoomed widget still persists
      and restores its zoom.
- [x] The header `%` readout still shows and still resets the zoom to 100.
- [x] `Widget.test.ts` and `Grid.test.ts` updated to assert `.widget-body` for the zoom style;
      full suite, `svelte-check`, `vite build` green.

## Blocked by

None - can start immediately
