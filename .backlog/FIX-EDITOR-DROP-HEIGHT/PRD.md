# FIX-EDITOR-DROP-HEIGHT — dropped/loaded scripts blow the editor's collapsed height

**Status:** merged (PR #14, PR #15)

**Branch:** `fix/editor-drop-height`

Found during `FEAT-LUA-FILE-DROP` ticket 05 (manual verification).

## Problem Statement

Dragging a `.lua` file (or loading a large template) into a widget makes the editor grow to the
file's full height instead of staying capped at ~30 lines, and toggling Expand/Collapse never
brings it back. Separately, the transient drop message is easy to miss.

## Root cause

`CodeMirrorEditor.svelte`'s `reportHeight()` runs synchronously inside the update listener, right
after a bulk `setValue()`. At that moment CodeMirror has changed its state but not laid out the
new lines, so `container.scrollHeight` reads far short of the real content height. The formula
`MAX_COLLAPSED_LINES * lineHeight + (scrollHeight - lineCount * lineHeight)` then goes **negative**.
A negative `height:` is dropped by the browser, so `.widget-editor` keeps only `flex: none` and
falls back to `height: auto` — the editor grows to its full content. It stays there because
`reportHeight()` only re-runs on `docChanged`, not on an Expand/Collapse toggle.

Pre-existing (`FEAT-ADAPTIVE-LAYOUT-AND-ZOOM`); the new drop path in `FEAT-LUA-FILE-DROP` just
made it easy to hit.

## Solution

- **`CodeMirrorEditor.svelte`** — clamp the chrome term at zero:
  `chrome = Math.max(0, scrollHeight - lineCount * lineHeight)`. Worst case (stale layout) the
  collapsed editor is ~8px shorter than ideal for one frame; it is never uncapped, and the next
  real measurement (on the next edit) refines it. Minimal and synchronous — no move to
  `requestMeasure`, no test-timing changes.
- **`app.css`** (PR #15) — `.cm-scroller` gets `min-height: 0`. It is a flex child of
  `.cm-editor` (a flex column); its default `min-height: auto` kept it at least as tall as its
  content, so a script past the ~30-line cap never scrolled *inside* the fixed-height editor —
  `.cm-scroller` just grew and overflowed. This is what actually made the editor still look
  uncapped even after the height clamp above was already computing and applying `height: ~30
  lines` correctly (confirmed from the live DOM: `.widget-editor` had `height: 537.6px` =
  exactly 30 lines, but `.cm-scroller` was ~5200px). Pre-existing; only visible once a
  past-the-cap script was easy to load (drop).
- **`Grid.svelte`** — the drop message bar becomes `position: sticky; top: 0` with an accent
  left stripe and a touch more padding, so it is not missed next to a widget whose editor just
  changed and stays visible if the page ever scrolls.

## Testing Decisions

- `CodeMirrorEditor.test.ts` — new test: with `scrollHeight` spied to a short value and an
  over-threshold doc, the reported height is never negative (was `-310` before the clamp).
- `Grid.test.ts` — new test: dropping several `.lua` on one widget shows
  `1 file loaded · 2 ignored (only one file per widget)` through the grid's message bar (the
  widget→grid wiring for the multi-file path had no integration test).
- The message-visibility change is CSS only and verified by the user in the running app
  (ticket 05 continues).

## Out of Scope

- Reworking `reportHeight` to `view.requestMeasure()` — larger change, needs the existing
  synchronous tests rewritten; the clamp fixes the observed bug.
- Any change to the ~30-line cap itself or the Expand/Collapse behaviour.

## Further Notes

- No ADR: a one-line correctness clamp, not an architectural decision.
- `FEAT-LUA-FILE-DROP` ticket 05 (manual cross-browser check) stays open pending the user's
  re-run against the build that includes this fix.
