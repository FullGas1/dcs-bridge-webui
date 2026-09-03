# FIX-WIDGET-ZOOM-HEADER — per-widget zoom scales the editor + result only, not the header

**Status:** merged (PR #26); ticket 02 (HITL) pending

**Branch:** `fix/widget-zoom-body-only`

Revises `FEAT-DUAL-ZOOM`'s per-widget axis. From a direct user complaint: at 220% widget zoom
the header buttons become huge and eat the screen — the header should stay at its 100% size.

## Problem

`FEAT-DUAL-ZOOM` applies the per-widget zoom as CSS `zoom` on the whole `.widget`, so the header
(number, file name, `%` readout, Send/Stop/Expand/Memorize/Templates/×) scales with it. Zooming a
widget in to read a dense script blows the header up out of proportion.

## Solution

Wrap the editor and the result in a new `.widget-body` element and move the per-widget `zoom`
onto that wrapper. The header stays outside it, always at 100%.

- `Widget.svelte`: `<div class="widget-body" style="zoom: …">` around `.widget-editor` and
  `.widget-result`; the `style="zoom"` moves off `.widget`.
- `.widget-body` takes over the flex-column layout role between the header and the editor/result
  (`flex: 1; display: flex; flex-direction: column; min-height: 0`).
- The right-click menu no longer needs its zoom coordinate adjustment (the `.widget` it renders
  inside is no longer zoomed) — removed.
- `data-widget-id`, the drop handlers, `data-drag-over` and the context menu all stay on
  `.widget` and are unaffected.
- The collapsed ~30-line editor cap keeps holding, because CSS `zoom` still scales the
  already-computed `editorHeightPx` and the content together — same as before, just scoped to
  the body.

## User Stories

1. As a mission debugger, I want zooming a widget to only enlarge its script and its result, so
   that the header controls don't grow and crowd the screen.
2. As a mission debugger, I want the widget header — number, file name, `%` readout, all its
   buttons — to stay exactly the size it is at 100%, at any widget zoom.
3. As a mission debugger, I want the ~30-line collapsed editor cap and Expand/Collapse to keep
   working when a widget is zoomed, so that this change doesn't break the layout machinery.
4. As a mission debugger, I want the header `%` readout to stay small and clickable at 220%, so
   that I can still reset the zoom.

## Testing Decisions

- **`Widget.test.ts`** — `initialZoom` puts `style="zoom"` on `.widget-body`, not `.widget`; the
  header (`.widget-header`) never carries a zoom style.
- **`Grid.test.ts`** — the `Ctrl`+wheel routing tests assert `.widget-body`'s `style.zoom`
  instead of `.widget`'s.
- The visual "header stays put, editor grows" is the HITL ticket's job (`jsdom` does no layout).

## Out of Scope

- The page zoom axis (`--page-zoom`) — unchanged.
- The per-widget zoom range, persistence, the header readout, the wheel routing — all unchanged.

## Further Notes

- Touches ADR 0006's per-widget line only in scope, not in mechanism (still CSS `zoom`); ADR
  updated with a one-line note.
