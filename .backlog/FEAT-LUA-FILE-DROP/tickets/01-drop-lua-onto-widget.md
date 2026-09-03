# 01 — Drop a `.lua` file onto a widget

**Status:** done

## Parent

`.backlog/FEAT-LUA-FILE-DROP/PRD.md`

## What to build

Dragging a `.lua` file from the OS file manager onto any part of a widget's card replaces that
widget's editor contents with the file's text and focuses the editor. This is the core drop
path; the file-name label (ticket 02), the transient message (ticket 03), and the `+` button
target (ticket 04) build on it.

- The whole widget card is the drop surface — over the CodeMirror editor, the result, or the
  header. CodeMirror 6 handles file drops natively (inserts at the cursor); this must be
  intercepted with a **capture-phase** `dragover` + `drop` listener on the widget root that
  `preventDefault()`s and `stopPropagation()`s so the event never reaches CodeMirror.
  `CodeMirrorEditor.svelte` is not modified.
- A new pure module `luaDrop.ts` holds the validation for a single dropped file: accepted iff the
  name ends in `.lua` (case-insensitive); rejected if larger than 512 KB (hardcoded); a leading
  UTF-8 BOM (U+FEFF) is stripped from the returned text. It returns either the script text or a
  rejection reason — the multi-file partition and the message formatter come in later tickets.
- On an accepted drop: the target widget's editor contents are fully replaced (not inserted at
  the cursor), the `code` state updates and persists exactly as an edit would, and the editor
  takes focus (mirrors template loading).
- On a rejected drop (non-`.lua` or oversized): nothing changes. No message yet — that is
  ticket 03. Rejecting silently here is an acceptable intermediate state.
- A `Grid`-level (or document-level) guard `preventDefault()`s file `dragover`/`drop` that lands
  outside any widget, so a missed drop never makes the browser open the file / leave the page.
- An empty `.lua` file loads as empty contents; a file named exactly `.lua` is accepted.
- A dropped file only loads — it never triggers an injection.

## Acceptance criteria

- [x] Dropping a `.lua` file anywhere on a widget's card (over the editor, the result, or the
      header) replaces the entire editor contents with the file's text and leaves the editor
      focused.
- [x] The replacement is a whole-document swap, not an insert at the drop position, regardless of
      where on the editor the pointer was — CodeMirror's native file-drop behaviour does not fire.
- [x] The new contents persist across a reload the same way a typed edit does.
- [x] Dropping a non-`.lua` file (e.g. `notes.txt`) leaves the widget completely unchanged.
- [x] Dropping a `.lua` file larger than 512 KB leaves the widget completely unchanged.
- [x] A `.lua` file whose bytes start with a UTF-8 BOM loads with no BOM character at the start of
      the editor contents.
- [x] An empty `.lua` file loads as empty editor contents; a file named exactly `.lua` is
      accepted and loaded.
- [x] A file dropped on the page but outside any widget does not change any widget and does not
      navigate the browser away from the app.
- [x] Dropping a file does not enqueue or start an injection.
- [x] `luaDrop.ts` has unit coverage for: `.lua` case-insensitive accept, non-`.lua` reject,
      over-512 KB reject, BOM stripped from returned text, empty file and `.lua`-named file
      accepted (prior art: `widgetSession.test.ts`, `injectionQueue.test.ts`).
- [x] `Widget.svelte` has component coverage for the replace-not-insert behaviour and the
      editor-focus-after-drop behaviour (prior art: `Widget.test.ts`), using a mock
      `{ files, types: ['Files'] }` passed to `fireEvent.drop`.

## Blocked by

None - can start immediately
