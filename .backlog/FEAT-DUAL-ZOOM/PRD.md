# FEAT-DUAL-ZOOM — per-widget zoom on hover, global page zoom outside, wider zoom-out

**Status:** merged (PR #17) — tickets 01-03; ticket 04 (HITL) pending

**Branch:** `feature/dual-zoom`

Revises `FEAT-ADAPTIVE-LAYOUT-AND-ZOOM` ticket 03 (single page-wide font-size zoom). Originates
from `.backlog/roadmap.md` "Rework the zoom rules".

## Tickets

| Ticket | Status | Title |
|---|---|---|
| `01-global-page-zoom-via-css-zoom` | done | 01 — Global page zoom (banner included) via CSS `zoom`, wider range |
| `02-per-widget-zoom-on-hover` | done | 02 — Per-widget zoom on Ctrl+scroll over a widget |
| `03-per-widget-zoom-indicator-and-persistence` | done | 03 — Header indicator + reset, persisted per widget |
| `04-manual-verification` | todo | 04 — Manual verification (HITL), Chrome + Firefox |

## Problem Statement

The zoom (`FEAT-ADAPTIVE-LAYOUT-AND-ZOOM`) is one page-wide value that scales the font-size of
every editor and every result together, 80%–200%. Two things are missing:

- **The banner can't be shrunk.** It scales nothing but editor/result text, so the banner image
  keeps its size and still crowds the widgets on a wide screen.
- **No per-widget control.** To read one dense script you have to zoom every widget, then undo it
  everywhere.
- **Can't zoom out far enough** for a bird's-eye "which widget holds what" overview — 80% is the
  floor.

## Solution

Two independent zoom axes, chosen by where the pointer is when `Ctrl`+scroll happens:

- **Pointer over a widget → that widget only.** `Ctrl`+scroll zooms just the hovered widget
  (its whole card — header, editor, result), 40%–250%. The other widgets don't move. The widget
  shows its current zoom in its header when it isn't 100%, with a click there to snap back.
- **Pointer anywhere else (banner, gaps, `+` button, message bar) → the whole page.** `Ctrl`+
  scroll zooms everything including the banner image, 40%–200%. The floating bottom-right control
  (its `+`/`-` and its `%`) is this global zoom.

The per-widget axis is CSS `zoom` on the `.widget`; the page axis is a `--page-zoom` custom
property on a `.page` wrapper, consumed by the banner image width and the editor/result
font-size (CSS `zoom` on the page wrapper was tried and is a live no-op — see ADR 0006). Neither
axis ever touches a script's content or undo history.

## User Stories

1. As a mission debugger, I want `Ctrl`+scroll over a widget to zoom only that widget, so that I
   can read one dense script without disturbing the others.
2. As a mission debugger, I want `Ctrl`+scroll away from any widget to zoom the whole page, so
   that I can shrink everything — the banner included — for an overview.
3. As a mission debugger, I want the banner to shrink with the global zoom, so that it stops
   taking a fixed slab of vertical space when I zoom out.
4. As a mission debugger, I want to zoom the page down to 40%, so that I can see many widgets at
   once and pick the one I want.
5. As a mission debugger, I want to zoom one widget up to 250%, so that I can read a cramped line
   of a script.
6. As a mission debugger, I want a zoomed-in widget's collapsed editor to still cap at ~30 lines
   (just bigger), so that zooming to read doesn't make one widget fill the screen with a long
   script.
7. As a mission debugger, I want the floating control to always mean the page zoom, so that I
   have one unambiguous place for the global level and its `%` readout.
8. As a mission debugger, I want a widget that isn't at 100% to say so in its header, so that I
   don't forget why it looks different from its neighbours.
9. As a mission debugger, I want to click that header readout to put the widget back to 100%, so
   that resetting one widget is one action.
10. As a mission debugger, I want each widget's zoom to come back after a reload, so that a
    layout I set up for a debugging session survives closing the tab.
11. As a mission debugger, I want the page zoom to persist between visits exactly as it does
    today, so that this rework doesn't lose that.
12. As a mission debugger, I want `Ctrl`+scroll to never trigger the browser's own page zoom on
    top of the app's, exactly as today.
13. As a mission debugger, I want a plain scroll (no `Ctrl`) to scroll normally and never zoom.
14. As a mission debugger on an older saved session (no per-widget zoom stored), I want my
    widgets to load at 100%, so that the upgrade changes nothing I didn't ask for.
15. As a mission debugger, I want the `+`/`-` buttons and `Ctrl`+scroll to agree on the page
    zoom value and its 40%–200% clamp, so that the two ways of changing it never diverge.
16. As a mission debugger, I want a widget's Expand/Collapse to keep working at any widget zoom,
    so that the two features don't fight.
17. As a mission debugger, I want the floating control itself to stay a fixed on-screen size,
    not scale with the page zoom, so that it's always usable.

## Implementation Decisions

### Two axes

- **Global page zoom** — a `--page-zoom` custom property on a new `.page` wrapper (branding
  header + grid, **not** the floating control). Consumed explicitly: `.branding-header img`
  `width: calc(100% * var(--page-zoom))` (so the banner shrinks/grows) and the editor/result
  `font-size: calc(Npx * var(--page-zoom))`. Range **40–200**, step 10, default 100. Persisted
  under the existing `dcs-bridge-webui:zoom` key. (CSS `zoom` on this wrapper was the first cut
  and is a live no-op — ADR 0006.)
- **Per-widget zoom** — CSS `zoom` on the individual `.widget` element (inline style). Its height
  is content-driven so `zoom` genuinely scales it. Range **40–250**, step 10, default 100. The
  two axes compose.
- `FEAT-ADAPTIVE-LAYOUT-AND-ZOOM`'s `--zoom-factor` is renamed to `--page-zoom` and moved from
  `:root` (set by `ZoomControl`) to the `.page` wrapper (set by `App`).

### Where the pointer is

- A single `Ctrl`+`wheel` listener (on `window`, `{ passive: false }`, `preventDefault()` on
  every `Ctrl`+wheel so the browser's native zoom never fires) owned by the grid.
- `event.target.closest('.widget')` decides: a hit → adjust that widget's zoom; a miss → adjust
  the global zoom.
- Buttons on the floating control only ever adjust the global zoom.

### Modules

- **`zoomStore.ts`** — keeps `clampZoom`/`loadZoom`/`saveZoom` for the global axis; `MIN_ZOOM`
  becomes 40, `MAX_ZOOM` stays 200. Adds `PER_WIDGET_MIN_ZOOM` (40) / `PER_WIDGET_MAX_ZOOM`
  (250) and a `clampWidgetZoom`. Still pure, still no reactivity.
- **`App.svelte`** — owns the global-zoom `$state` (seeded from `loadZoom()`, persisted by an
  `$effect`), renders `<div class="page" style="zoom: …">` around `BrandingHeader` + `Grid`, and
  renders `ZoomControl` as a sibling **outside** that wrapper. Passes the global zoom (two-way)
  to `ZoomControl` and a "nudge global zoom" callback to `Grid`.
- **`Grid.svelte`** — owns the `Ctrl`+wheel listener and the target routing; threads a per-widget
  `zoom` through `WidgetRecord`, the `saveWidgets` map, and the `Widget` props (mirrors how
  ticket 02 of `FEAT-LUA-FILE-DROP` threaded `filename`).
- **`Widget.svelte`** — takes `initialZoom` + `onZoomChange`; applies `style="zoom: …"` on the
  `.widget` root; header shows `{zoom}%` as a button (calls reset to 100) only when `zoom !== 100`.
- **`ZoomControl.svelte`** — loses its own wheel listener and its `loadZoom`/`saveZoom` (App owns
  those now); becomes `+`/`-`/`%` bound to the global zoom prop. Stays `position: fixed`; gets
  an explicit reset of the CSS `zoom` context so it never scales with the page.
- **`widgetSession.ts`** — `StoredWidget` gains optional `zoom?: number`; `loadWidgets` accepts
  its absence and rejects a non-number the same way it already guards `filename`.
- **`CodeMirrorEditor.svelte`** — unchanged if CSS `zoom` scales the already-computed
  `editorHeightPx` proportionally (expected); ticket 02 verifies and, only if needed, adds a
  `remeasure()` the widget calls on zoom change.

### Mechanism choices

`transform: scale()` doesn't reflow (siblings overlap) and rebases `position: fixed`. CSS `zoom`
works where an element's size is content-driven (the per-widget axis) but is a no-op on a
viewport-filling wrapper (the page axis) — the browser re-inflates the layout under it, so
`width: 100%` content (the banner) never changes size. Hence the page axis is an explicit
`--page-zoom` variable. See ADR 0006.

## Testing Decisions

Good tests assert observable behaviour: the CSS `zoom` value on the page wrapper / a widget, the
control's `%` text, what's persisted, and which element a `Ctrl`+wheel changed. `jsdom` does no
layout, so the visual correctness of `zoom` (banner shrinks, 30-line cap holds, Expand/Collapse)
is the HITL ticket's job.

- **`zoomStore.test.ts`** — extend for the lowered `MIN_ZOOM` (40) and the new
  `clampWidgetZoom` range; existing round-trip/clamp/corrupt tests still hold.
- **`ZoomControl.test.ts`** — rewritten for the prop-driven control: `+`/`-` change the bound
  value and its `%`, clamp/disable at 40 and 200; the wheel tests move to `Grid.test.ts`.
- **`Grid.test.ts`** — `Ctrl`+wheel with `target` inside a `.widget` changes that widget's
  `style="zoom"` and not the page; `Ctrl`+wheel with `target` outside changes the page wrapper
  and no widget; a plain wheel does nothing; `preventDefault` is called on every `Ctrl`+wheel;
  a persisted widget round-trips its `zoom`.
- **`Widget.test.ts`** — `initialZoom` renders `style="zoom"` and the header `%`; the header `%`
  shows only when `!== 100`; clicking it calls `onZoomChange(100)`.
- **`widgetSession.test.ts`** — a stored entry with `zoom` round-trips; one without still loads;
  a non-number `zoom` is rejected like a bad `filename`.
- **`App.test.ts`** — the page wrapper carries `style="zoom"` from the persisted global level;
  `ZoomControl` is rendered outside that wrapper.

## Out of Scope

- A dedicated per-widget zoom control (only `Ctrl`+scroll + the header reset).
- Pinch-to-zoom / touch gestures.
- Remembering a per-widget zoom across *different* browsers (per-widget zoom rides in the same
  `localStorage` widget session as `code`/`filename`; it is per-browser like everything else).
- Changing the Expand/Collapse behaviour itself.
- Any change to what the banner *is* (see `FEAT-BANNER-COMPACT-ASPECT`).

## Further Notes

- ADR 0006 records the two axes and why. **Post-PR #17 correction (PR #18):** CSS `zoom` on the
  page wrapper turned out to be a live no-op (a viewport-filling wrapper re-inflates under it, so
  the banner never changed size). The page axis was reworked to a `--page-zoom` custom property
  consumed explicitly by the banner image width and the editor/result font-size; the per-widget
  axis stays CSS `zoom` (verified working live). ADR 0006 and the sections above reflect the
  corrected design.
- CONTEXT.md gains a **Zoom** entry (page zoom vs. widget zoom).
- `reportHeight`'s collapsed-editor cap recomputes only on a document change, so a past-the-cap
  editor keeps a stale height after a page-zoom change until the next edit — a pre-existing limit
  of the adaptive-height machinery, unchanged here.
