# FEAT-ADAPTIVE-LAYOUT-AND-ZOOM — dynamic sizing, independent expand, and page zoom

**Status:** ready-for-agent

## Tickets

| Ticket | Status | Title |
|---|---|---|
| `01-independent-expand-per-area` | done | 01 — Independent Expand/collapse per area |
| `02-dynamic-collapsed-height` | ready | 02 — Dynamic collapsed height for the editor and the result |
| `03-page-wide-zoom` | ready | 03 — Page-wide zoom control |

## Problem Statement

A widget's editor reserves a fixed ~30-line block no matter how short the actual script is, and
the result is capped at a fixed 8 lines with no way to see more without scrolling inside that
small box. Since a result can now legitimately be several lines of indented Lua
(`FEAT-TABLE-RETURN-SERIALIZATION`), this became a real problem in practice: a short 3-line
script still reserves a tall, mostly-empty editor, pushing a multi-line result off-screen and
forcing a scroll through dead space just to read it. There's also no way to read either area
larger without resizing the whole browser window.

## Solution

Three changes to how a widget's editor and result use screen space:

1. Below a shared ~30-line threshold, both the editor and the result size themselves to their
   actual content while collapsed, instead of always reserving the full fixed block — a short
   script or a short result no longer forces empty space around it.
2. The editor and the result each get their own independent Expand/collapse control, in place of
   today's single whole-widget one — expanding the result to see a long one no longer requires
   expanding the editor too, and vice versa.
3. A single page-wide zoom, adjustable from a floating control or Ctrl+scroll anywhere on the
   page, scales every editor and every result together for comfortable reading, independent of
   the browser's own zoom.

## User Stories

1. As a mission debugger, I want a short script's editor to only take up as much height as the
   script actually has, so that the result below it is visible without scrolling past empty
   space.
2. As a mission debugger, I want the editor to grow and shrink live as I type or delete lines,
   so that the layout always reflects what I'm actually working with, not a stale size from
   before my last edit.
3. As a mission debugger, I want a short result to size itself to its actual content the same
   way the editor does, so that a one-line result doesn't reserve the same space as a long one.
4. As a mission debugger, I want both the editor and the result to keep today's behavior once
   their content reaches ~30 lines while collapsed (a fixed cap, scrollable inside), so that a
   very long script or result doesn't grow the widget without bound just from typing or an
   injection completing.
5. As a mission debugger, I want to expand the result on its own without also expanding the
   editor, so that I can read a long serialized table without the editor taking half the screen
   for no reason.
6. As a mission debugger, I want to expand the editor on its own without also expanding the
   result, so that I can see my whole script comfortably while the result stays out of the way.
7. As a mission debugger, I want an expanded editor or result to still show its entire content
   with no cap, exactly like today's single Expand button already does for the whole widget, so
   that expanding never becomes a bigger-but-still-bounded box.
8. As a mission debugger, I want one zoom level that affects every editor and every result on
   the page together, so that I don't have to adjust reading size widget by widget.
9. As a mission debugger, I want to change the zoom from a control that's always visible no
   matter where I've scrolled on the page, so that I don't have to scroll back to a header to
   adjust it.
10. As a mission debugger, I want to also zoom with Ctrl+scroll anywhere on the page, so that I
    can adjust reading size without moving my mouse to a specific button.
11. As a mission debugger, I want the zoom level I set to persist between visits, so that I don't
    have to re-adjust it every time I reopen the page.
12. As a mission debugger, I want zooming to never touch my script's undo history or otherwise
    change its content, so that a purely visual reading adjustment can never affect what I'm
    editing.
13. As a mission debugger, I want the zoomed editor's line-number gutter to stay legible and
    proportioned to the zoomed text, so that zooming in doesn't make the gutter and the code fall
    out of visual sync.

## Implementation Decisions

- **Dynamic collapsed height, tracked live.** Below the shared ~30-line threshold, both the
  editor and the result size their collapsed height to their actual line count instead of always
  reserving the fixed block used today. The editor recalculates on every document change
  (`CodeMirrorEditor.svelte`'s existing `updateListener` already fires on every `docChanged` —
  this reuses that hook rather than adding a new one). The result recalculates whenever a new
  run's output replaces the previous one.
- **Height formula uses a real measured line height, not a hardcoded ratio.** The editor reads
  CodeMirror's own `EditorView.defaultLineHeight` — a value measured on the actually-rendered
  instance (current font, current zoom, everything included) — rather than a fixed px-per-line
  constant. This keeps the height calculation correct at any zoom level (see the zoom decisions
  below) without a separate synchronization step between the two features. This calculation
  belongs inside `CodeMirrorEditor.svelte` (it needs `view`), not derived from the raw script
  text in `Widget.svelte`. The result (not a CodeMirror instance) uses the equivalent real,
  computed CSS line-height of its own text element. Both use the same formula and the same
  ~30-line cap: `height = min(lineCount, 30) × measuredLineHeight + fixed chrome (header/padding)`.
- **The result's fixed 8-line cap is retired in favor of the same ~30-line threshold as the
  editor.** Today the result is capped at a fixed height unrelated to the editor's threshold, and
  scrolling inside that small box is the only way to see more. That gap is closed by the new
  independent Expand control below, not by removing the cap outright.
- **The single whole-widget Expand button is replaced by two independent ones** — one for the
  editor, one for the result — built on one shared, reused mechanism (a component or hook
  instantiated twice) rather than two separately-written implementations. Each controls only its
  own area's expanded/collapsed state.
- **Dynamic height only governs the collapsed state.** Once an area is expanded, it reverts to
  unbounded height (matching today's existing `height: auto` whole-widget behavior, applied per
  area instead of to the whole widget) and the dynamic-height calculation plays no further role
  for that area until it's collapsed again.
- **One page-wide zoom level, not separate ones per area.** A single zoom value scales every
  editor and every result together, uniformly. (Two independent zoom levels — one for editors,
  one for results — was considered and explicitly dropped during grilling in favor of this
  simpler single value.)
- **Zoom mechanism**: a single global scale value (e.g. a shared CSS custom property or a Svelte
  store) driving font-size via relative CSS units, applied to both the CodeMirror container and
  the result's text element. Purely visual — it must never touch a document's content or its
  undo history. The line-number gutter is expected to scale proportionally since it renders in
  the same relative units as the code text; this is a visual property to confirm once
  implemented, not something requiring CodeMirror's theme-reconfiguration API if plain CSS
  inheritance already scales it correctly.
- **Zoom control**: a single floating control (fixed position, bottom-right of the page,
  reachable at any scroll position) holding one `+`/`-` button pair — not duplicated per-widget,
  since a per-widget control would misleadingly imply a per-widget effect when the zoom is
  page-wide. Ctrl+scroll works anywhere on the page (no need to target a specific area, since
  there's only one zoom level to adjust).
- **Range and step**: 80%–200%, in 10% increments per button click or wheel tick.
- **Persistence**: `localStorage`, following the existing convention already used by
  `widgetSession.ts` (a project-prefixed key, e.g. `dcs-bridge-webui:zoom`).
- **Terminology**: "the editor" and "the result" (a new `CONTEXT.md` term added during grilling —
  `_Avoid_: Return, returns, output, response, panel, pane, window`) are the only names used for
  these two areas.

## Testing Decisions

- Existing frontend tests use Vitest + `@testing-library/svelte` (`Widget.test.ts`,
  `Grid.test.ts`, `widgetSession.test.ts`, etc.); this lot follows the same pattern. There is no
  existing `CodeMirrorEditor.test.ts` — the height-calculation logic added there should get its
  own test coverage rather than only being exercised indirectly through `Widget.test.ts`.
- Good tests here assert observable behavior (an area's actual rendered height or expanded state
  in response to content/zoom changes, the zoom value persisting across a reload, Ctrl+scroll and
  button clicks producing the same resulting zoom value) rather than internal implementation
  details of the height formula.
- The shared Expand/collapse mechanism (editor and result each using the same underlying
  component/hook) should have its own focused test, then be exercised through both call sites,
  rather than duplicating the same assertions twice.
- The zoom store/persistence layer (`localStorage` read/write, clamping to the 80%–200% range) is
  testable in isolation the same way `widgetSession.ts` already is.

## Out of Scope

- Per-widget or per-area-type (editor vs. result) independent zoom levels — considered and
  dropped in favor of one page-wide zoom.
- Any change to `dcs-bridge-webui`'s backend, `dcs-serve` protocol, or table serialization
  (`FEAT-TABLE-RETURN-SERIALIZATION`) — this lot is frontend layout/UX only.
- Reconfiguring CodeMirror's theme via its extension API for zoom, unless plain CSS font-size
  inheritance turns out not to scale the editor correctly (a fallback to note during
  implementation, not a decision made now).

## Further Notes

- No ADR: every decision here is frontend layout/UX, none of them structural or costly enough to
  reverse to warrant one — raised explicitly during grilling and declined.
- Direct precedent for shape and style: the existing whole-widget Expand button and
  `data-expanded` mechanism (`Widget.svelte`, being replaced/factored here), `widgetSession.ts`
  (localStorage convention to reuse for zoom persistence).
- Originates from `.backlog/roadmap.md`'s "Make the most of widget screen space" entry, itself
  triggered by testing `FEAT-TABLE-RETURN-SERIALIZATION` live and finding the fixed-height layout
  made a multi-line serialized table awkward to read.
