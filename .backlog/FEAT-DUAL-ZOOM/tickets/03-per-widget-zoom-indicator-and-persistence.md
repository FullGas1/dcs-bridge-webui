# 03 — Header indicator + reset, persisted per widget

**Status:** done

## Parent

`.backlog/FEAT-DUAL-ZOOM/PRD.md`

## What to build

Make a non-100% widget zoom visible and undoable, and remember it across reloads.

- `Widget.svelte` header: when `zoom !== 100`, show `{zoom}%` as a button next to the widget
  number/name; clicking it calls `onZoomChange(100)`. Hidden entirely at 100%.
- Persistence: `StoredWidget` gains optional `zoom?: number`. `Grid`'s `saveWidgets` map writes
  it only when `!== 100`; the seed maps a stored `zoom` (or 100) into `WidgetRecord`.
  `loadWidgets` / `isStoredWidget` accept its absence and reject a non-number value the same way
  they already guard `filename` (`FEAT-LUA-FILE-DROP` ticket 02).
- `Grid` threads `onZoomChange` → an `updateZoom(id, zoom)` that mutates `WidgetRecord.zoom`
  (the `$effect` that calls `saveWidgets` then persists it, same as `code`/`filename`).

## Acceptance criteria

- [x] A widget at 100% shows no zoom readout in its header.
- [x] A widget zoomed to 140% shows `140%` in its header; clicking it returns the widget to 100%
      and hides the readout.
- [x] A widget's zoom round-trips a reload (persisted in the `dcs-bridge-webui:widgets` entry).
- [x] A widget session saved before this field loads with every widget at 100% — no crash, no
      lost widgets.
- [x] A stored `zoom` that isn't a number makes `loadWidgets` return null, like a bad `filename`.
- [x] `widgetSession.test.ts` extended: `zoom` round-trips; absent still loads; non-number
      rejected.
- [x] `Widget.test.ts`: header readout shows/hides on the 100 boundary; click resets.
- [x] `Grid.test.ts`: a wheel-zoomed widget persists its zoom and restores it on reload.

## Blocked by

- Ticket 02 (per-widget zoom state and the wheel that sets it)
