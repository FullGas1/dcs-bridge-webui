# FEAT-LUA-FILE-DROP — drag-and-drop a `.lua` file into the UI

**Status:** grilled — PRD published, ready for `to-issues`

**Branch:** `feature/lua-file-drop`

## Tickets

| Ticket | Status | Title |
|---|---|---|
| `01-drop-lua-onto-widget` | todo | 01 — Drop a `.lua` file onto a widget (core path) |
| `02-remember-and-display-file-name` | todo | 02 — Remember and display the dropped file's name |
| `03-transient-message-and-dragover-highlight` | todo | 03 — Aggregated transient message and `dragover` highlight |
| `04-drop-onto-add-button-and-multi-file` | todo | 04 — Drop onto the `+` button, and multi-file drops |
| `05-manual-cross-browser-verification` | todo | 05 — Manual cross-browser drag-and-drop verification (HITL) |

## Problem Statement

The only way to get a script into a widget today is to paste it or type it. A mission debugger
keeps their real debug scripts as `.lua` files on disk (in a repo, a Saved Games folder, a
scratch directory). To run one, they have to open it in another editor, select all, copy, click
into a widget, and paste — every time, for every script. Setting up a page with five scripts to
work through means five round-trips through the clipboard.

## Solution

The user drags a `.lua` file straight from their file manager onto the page:

- **Onto a widget** → that widget's editor is replaced with the file's contents, and the widget
  now shows the file's name next to its number (`Widget 3 — patrol_check.lua`).
- **Onto the `+` "add widget" button** → a new widget is created, pre-filled with the file's
  contents and showing its name.

Dragging several files at once onto `+` creates one widget per file. The app only accepts
`.lua` files and caps their size; anything it skips is reported in a short, self-dismissing
message so the user knows what happened without a dialog to click through.

## User Stories

1. As a mission debugger, I want to drag a `.lua` file from my file manager onto a widget, so
   that its contents load into that widget's editor without a copy-paste round-trip.
2. As a mission debugger, I want to drop a `.lua` file onto the `+` button, so that a new widget
   is created already containing that script.
3. As a mission debugger, I want to drop the file anywhere on a widget's card — over the editor,
   the result, or the header — so that I don't have to aim at a narrow target.
4. As a mission debugger, I want the drop to replace the whole editor contents (not insert at the
   cursor), so that the widget cleanly becomes "this file".
5. As a mission debugger dropping onto a widget that already has code, I want it replaced without
   a confirmation prompt, so that re-dropping an edited file is friction-free — knowing Ctrl+Z in
   the editor brings the previous contents back.
6. As a mission debugger, I want the widget to show the dropped file's name next to its number,
   so that I can tell at a glance which widget holds which script.
7. As a mission debugger, I want the remembered name to stay put while I edit the code, so that
   it behaves like a real editor showing the file I'm working on.
8. As a mission debugger, I want the remembered name replaced when I drop a different file on the
   same widget, so that the label always reflects the current source.
9. As a mission debugger who then loads a template into that widget, I want the label to switch
   to the template's name, so that the header still tells me where the current contents came from.
10. As a mission debugger, I want to drag several `.lua` files onto `+` at once, so that I get one
    pre-filled widget per file in a single gesture.
11. As a mission debugger who drops several files onto a single widget, I want only the first
    `.lua` loaded and a note that the rest were ignored, so that the outcome is predictable.
12. As a mission debugger, I want non-`.lua` files to be ignored with a brief message, so that a
    stray drop doesn't dump a random file into a widget.
13. As a mission debugger, I want a file larger than the size cap ignored with a brief message,
    so that a wrong-file drop can't bloat local storage or bog down the editor.
14. As a mission debugger, I want one aggregated message per drop ("2 loaded · 1 ignored
    (not .lua) · 1 ignored (too large)"), so that I'm not clicking through a message per file.
15. As a mission debugger, I want that message to disappear on its own after a few seconds (with
    an × to dismiss it now), so that it never blocks my work.
16. As a mission debugger, I want the widget or `+` button under my pointer to highlight while I
    drag a file over it, so that I can see where the drop will land.
17. As a mission debugger, I want the highlight to appear only for file drags, so that dragging a
    text selection inside an editor doesn't flash drop targets everywhere.
18. As a mission debugger, I want the editor of the widget I dropped onto to take focus, so that I
    can start editing or inject immediately.
19. As a mission debugger dropping onto `+`, I want focus and scroll left alone, so that creating
    several widgets at once doesn't yank the page around.
20. As a mission debugger, I want a dropped file to only load — never auto-inject — so that I
    review it before sending it to the mission.
21. As a mission debugger, I want a file dropped just outside a valid target to do nothing, so
    that a missed drop never makes the browser navigate away from the app and lose my page.
22. As a mission debugger, I want a `.lua` saved from Windows (with a UTF-8 BOM) to load cleanly,
    so that it doesn't fail in-game on a BOM that Lua 5.1 won't skip.
23. As a mission debugger, I want my widgets' remembered file names to survive a page reload, so
    that the labels are still there when I come back.
24. As a mission debugger on an older page state saved before this feature, I want my widgets to
    still load (just without names), so that the upgrade doesn't wipe my session.
25. As a mission debugger, I want an empty `.lua` file to load as an empty widget, so that the
    feature doesn't special-case a legitimate (if odd) file.

## Implementation Decisions

### Drop targets and surface

- Two drop targets: **a widget** (the whole widget card is the drop surface, including over the
  CodeMirror editor and the result area) and the **`+` add-widget button**. There is no
  "active widget" concept — the target is whichever the pointer is over on release.
- **CodeMirror 6 handles file drops natively** (`@codemirror/view` reads dropped files as text
  and inserts them at the cursor). This must be intercepted: a **capture-phase** `dragover` +
  `drop` listener on the widget's root element calls `preventDefault()` + `stopPropagation()`, so
  the event never reaches CodeMirror's `contentDOM` handler. `CodeMirrorEditor.svelte` is not
  modified.
- A `Grid`-level (or document-level) `dragover`/`drop` guard `preventDefault()`s file drags that
  land outside any target, so a missed drop never triggers the browser's default "open the file /
  leave the page" behaviour.

### Accepting / rejecting files

- **Extension only**: a file is accepted iff its name ends in `.lua`, case-insensitive. `.lua`
  files carry no reliable MIME type, so `File.type` is not consulted.
- **Size cap: 512 KB**, hardcoded for this lot. A file over the cap is rejected. (Making this
  configurable is deferred to the future "app settings panel" lot — see `roadmap.md`.)
- A rejected file produces no change and contributes a reason to the drop's aggregated message.
- Empty `.lua` files and a file named exactly `.lua` are accepted.

### Multi-file drops

- **Onto `+`**: one new widget per accepted `.lua`, appended to the grid in file order. Rejected
  files in the batch are counted in the message. A batch with zero accepted files creates no
  widget and only shows the message.
- **Onto a widget**: only the **first** accepted `.lua` in the batch is loaded into the hovered
  widget; the rest are noted as ignored in the message.

### The remembered name

- A widget gains an optional remembered source name (base name only — **never a path or a file
  handle**; see ADR 0005). Shown in the header juxtaposed with the widget number:
  `Widget {n} — {name}`. A widget with no remembered name shows `Widget {n}` unchanged.
- Lifecycle:
  | Event | Effect on the remembered name |
  |---|---|
  | `.lua` dropped on a widget | set to the file's base name |
  | `.lua` dropped on `+` | each new widget set to its file's base name |
  | another `.lua` dropped on a widget that already has a name | replaced |
  | template loaded via the dropdown | set to the template's name (as a pseudo-file-name) |
  | code edited in the editor | unchanged |
  | "Memorize" (save as template) | unchanged |
  | new empty widget / typed from scratch | no name |
- The remembered name is a **display label**, not a guaranteed-real filename (it can be a
  template name). No provenance flag (file vs. template) is stored — a future "Save" lot adds one
  if it needs it. Template pseudo-names are shown exactly as-is (no `.lua` appended, no
  slugification) and are not visually distinguished from real file names.
- The name is persisted with the widget: `StoredWidget` gains an optional `filename`. `loadWidgets`
  tolerates its absence (older saved state) exactly as it already tolerates a lenient shape.

### Reading the file

- Files are read as **UTF-8 text**. A leading **UTF-8 BOM (U+FEFF) is stripped** before the text
  reaches the editor (Lua 5.1, which DCS runs, does not skip a BOM). CRLF line endings need no
  handling — CodeMirror normalises them to `\n`.

### Behaviour after a drop

- **Onto a widget**: the target widget's editor takes focus (mirrors template loading). No scroll.
- **Onto `+`**: no focus change, no scroll.
- A drop **never** triggers an injection.

### The transient message

- A single full-width bar at the top of the widget area (inside `Grid`, below the branding
  header). One message at a time; a new drop's message replaces any previous one.
- Auto-dismisses after ~5 s; also has an `×` to dismiss immediately. Non-blocking, no required
  interaction.
- Content is one aggregated line per drop operation, e.g.
  `2 files loaded · 1 ignored (not .lua) · 1 ignored (too large)` — not one message per file.

### Modules

- **`luaDrop.ts`** (new pure module): given the dropped `File`s and the target kind
  (`widget` | `add-button`), returns a partition — the scripts to load (base name + BOM-stripped
  text, in order) and the rejected entries (base name + reason) — plus a function that formats the
  aggregated message from that partition. Holds the extension filter, the 512 KB cap, the BOM
  strip, and the "first only" rule for a widget target.
- **`Widget.svelte`**: capture-phase drop handling on its root; `dragover` highlight state; a
  `filename` prop + a change callback; header renders `Widget {n} — {filename}` when set; editor
  focus after a widget drop; clears/sets `filename` on template load.
- **`Grid.svelte`**: `+`-button drop handling and highlight; creates N widgets from a batch;
  owns the transient message bar and its timer; the outside-target file-drop guard; threads
  `filename` through `WidgetRecord`, the `Widget` props, and the `saveWidgets` mapping.
- **`widgetSession.ts`**: `StoredWidget` / `WidgetRecord` gain optional `filename`; save and load
  updated; lenient parser still accepts entries without it.
- **`CodeMirrorEditor.svelte`**: unchanged.

## Testing Decisions

Good tests here assert **observable behaviour** — what the user sees in the DOM and what is
persisted — not internal wiring. Drops are simulated by passing a mock
`{ files: [...], types: ['Files'] }` to `fireEvent.drop` / `fireEvent.dragOver` (jsdom has no
real `DataTransfer`); `File` and `File.text()` work under jsdom.

- **`luaDrop.ts`** — unit tested in isolation (`luaDrop.test.ts`, new; prior art:
  `widgetSession.test.ts`, `injectionQueue.test.ts`). Covers: `.lua` case-insensitive accept;
  non-`.lua` reject; over-512 KB reject; BOM stripped from the returned text; multi-file partition
  order; "first accepted only" for a `widget` target; empty file and a file named `.lua`
  accepted; the aggregated message string for each mix of outcomes.
- **`Widget.svelte`** — component tests (prior art: `Widget.test.ts`). Dropping a `.lua` replaces
  the editor contents (not an insert-at-cursor), sets and displays `Widget {n} — {name}`, focuses
  the editor; dropping a second file replaces the name; a non-`.lua` drop changes nothing;
  `dragover` with a file adds the highlight, `dragleave`/`drop` removes it; `dragover` with a
  text drag does not highlight; loading a template swaps the displayed name to the template's.
- **`Grid.svelte`** — component tests (prior art: `Grid.test.ts`). Dropping N `.lua` files on
  `+` creates N widgets in order, each pre-filled and named; a mixed batch shows the aggregated
  message and creates only the accepted count; the message auto-clears and can be `×`-dismissed;
  a file dropped outside any target does not create a widget and does not navigate; persisted
  widgets round-trip their `filename`.
- **`widgetSession.test.ts`** — extend: a stored entry with `filename` round-trips; a stored
  entry without `filename` still loads (name-less widget).
- **No backend tests** — this lot is entirely frontend.

## Out of Scope

- Any path, folder, or writable handle for the dropped file — base name only (ADR 0005).
- Saving a widget's script back to a file ("Save" / "Save as") — separate roadmap entry.
- Making the size cap (or any other constant) user-configurable — the future "app settings
  panel" lot.
- A provenance flag distinguishing a file-derived name from a template-derived name.
- Visual styling of a template pseudo-name differently from a real file name.
- Naming or renaming a widget by hand.
- Dropping anything other than a local file (a URL, a browser tab, text from another app is
  covered only insofar as the outside-target guard and the capture-phase interception behave
  sanely).
- Firefox-specific file-handle capabilities (there are none to add here — base name works
  everywhere).
- Any change to the injection queue, templates storage, or the connection banner.

## Further Notes

- ADR 0005 (`docs/adr/0005-dropped-file-name-only.md`) records the base-name-only decision and
  why the File System Access API route was rejected as speculative for this lot.
- Two sibling roadmap entries were written during the same grill and depend on nothing here:
  "app settings panel" (would host the 512 KB cap) and "Save / Save as a widget's script"
  (would build on the remembered name). Both are in `.backlog/roadmap.md`.
- This repo has no `CHANGELOG.md` and no luacheck; the delivery gate is `npm test`,
  `npm run check`, and `npm run build` all green.
