# 03 — Aggregated transient message and `dragover` highlight

**Status:** done

## Parent

`.backlog/FEAT-LUA-FILE-DROP/PRD.md`

## What to build

The user gets visible feedback about a drop: the target highlights while a file is dragged over
it, and one short self-dismissing message per drop reports anything that was skipped.

- **`dragover` highlight.** The widget card (and, once ticket 04 lands, the `+` button) under the
  pointer gets an accented outline/background while a file is dragged over it, removed on
  `dragleave` / `drop`. Shown **only for file drags** — `dataTransfer.types` includes `"Files"` —
  so dragging a text selection inside an editor does not flash drop targets.
- **Transient message.** A single full-width bar at the top of the widget area, inside `Grid`,
  below the branding header. One message at a time; a new drop's message replaces any previous
  one. Auto-dismisses after ~5 s and has an `×` for immediate dismissal. Non-blocking.
- **Message content.** `luaDrop.ts` gains a formatter that turns a drop's outcome into one
  aggregated line, e.g. `2 files loaded · 1 ignored (not .lua) · 1 ignored (too large)` — never
  one message per file. A drop with nothing skipped shows either a plain confirmation
  (`1 file loaded`) or no message — pick one and keep it consistent; the PRD leaves this to
  implementation.
- This ticket wires the message into the single-widget drop path (ticket 01). Ticket 04 reuses
  the same bar and formatter for `+` and multi-file drops.

## Acceptance criteria

- [x] Dragging a file over a widget adds a visible highlight to that widget; leaving or dropping
      removes it.
- [x] Dragging a text selection (not a file) over a widget adds no highlight.
- [x] Dropping a non-`.lua` file shows a transient message naming it as ignored (not `.lua`) and
      changes no widget.
- [x] Dropping an over-512 KB `.lua` shows a transient message naming it as ignored (too large).
- [x] The message clears itself after roughly 5 seconds and can be dismissed immediately with its
      `×`.
- [x] A second drop replaces the first drop's message rather than stacking.
- [x] `luaDrop.ts` message-formatter unit coverage for each mix of loaded / not-`.lua` /
      too-large counts.
- [x] `Grid.svelte` component coverage for the message appearing, auto-clearing, and
      `×`-dismissing (prior art: `Grid.test.ts`).

## Blocked by

- Ticket 01 (the drop path and `luaDrop.ts` it wires into)
