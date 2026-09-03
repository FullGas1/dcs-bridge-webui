# FEAT-SAVE-WIDGET-FILE — save a widget's script back to a `.lua` file

**Status:** grilled (autonomous) — PRD + tickets, ready to implement

**Branch:** `feature/save-widget-to-file`

From `.backlog/roadmap.md` "Save a widget's script back to a `.lua` file". Builds on
`FEAT-LUA-FILE-DROP` (which is what first gives a widget a remembered file name) and ADR 0005.

## Tickets

| Ticket | Status | Title |
|---|---|---|
| `01-save-as` | done | 01 — "Save as…" from a header right-click (picker or download) |
| `02-save-overwrite` | done | 02 — "Save" overwrites the dropped file in place (Chromium) |
| `03-manual-verification` | todo | 03 — Manual verification (HITL), Chrome + Firefox |

## Problem Statement

The round-trip is one-way. A user drags a `.lua` in, edits it live against the running mission,
gets it right — and then has to select-all, copy, and paste it back into their real file by
hand. "Memorize" only saves a named copy into this app's own template store, not to a file on
disk.

## Solution

Right-click a widget's **header** → a small menu:

- **Save** — write the current editor text straight back to the exact `.lua` file that was
  dropped into this widget, no dialog. Only shown when that's possible (see below).
- **Save as…** — choose where to write a `.lua` file, its name pre-filled from the widget's
  remembered name (or `widget-{n}.lua`).

"Save" needs a writable handle to the original file, which only exists when: the script got into
the widget by drag-and-drop **and** the browser is Chromium (Chrome/Edge — `getAsFileSystemHandle`
/ `showSaveFilePicker` are not in Firefox). Everywhere else only "Save as…" shows, and it falls
back to a normal download into the browser's download folder.

## User Stories

1. As a mission debugger, I want to save a widget's edited script straight back to the `.lua`
   file I dropped in, so that my fixes land in my real file without a copy-paste.
2. As a mission debugger, I want "Save" to need no dialog once I've said where the file is, so
   that iterating (edit → save → re-run) is fast.
3. As a mission debugger, I want "Save as…" to pre-fill the file name from what the widget
   remembers, so that I'm not retyping `patrol_check.lua`.
4. As a mission debugger on a widget I typed from scratch, I want "Save as…" to still work (with
   a sensible default name), so that I can get a new script onto disk.
5. As a mission debugger, I want "Save" hidden when there's nothing to overwrite (typed from
   scratch, or Firefox), so that the menu never offers an action that can't work.
6. As a mission debugger in Firefox, I want "Save as…" to download the `.lua`, so that the
   feature degrades to something rather than nothing.
7. As a mission debugger, I want right-clicking the widget's **editor** to still show the
   browser's own menu (copy, paste, spell-check), so that this feature doesn't take that away.
8. As a mission debugger, I want the saved file to be exactly the editor's text — no added BOM,
   no reformatting — so that "Save" is a faithful write-back.
9. As a mission debugger, I want a successful "Save as…" to make the widget remember the new
   file, so that the next "Save" overwrites it directly.
10. As a mission debugger, I want cancelling the save picker to do nothing (no error, no empty
    file), so that a mis-click is harmless.
11. As a mission debugger, I want the menu to close on Escape, on a click elsewhere, or after I
    pick an item, so that it doesn't linger.
12. As a mission debugger, I want "Save" and "Memorize" to stay separate, so that a disk file
    and a named in-app template don't get confused.

## Implementation Decisions

### Trigger — right-click the header, not the editor

A `contextmenu` listener on the `.widget-header` element (`preventDefault`, show our menu at the
pointer). The editor and result keep their native context menus untouched (deliberate — a code
editor's right-click copy/paste/spell-check matters more than discoverability here).

### The menu

- A small floating `WidgetContextMenu` component, positioned at the click coordinates, closed on
  `Escape`, on an outside pointer-down, and after an item is chosen.
- Items: **Save** (only when the widget holds a writable file handle) and **Save as…** (always).

### "Save as…"

- If `window.showSaveFilePicker` exists → call it with `{ suggestedName }`. On resolve, write the
  text through `handle.createWritable()` and **adopt that handle** as the widget's handle +
  set the remembered name to the chosen file's `.name`. On `AbortError` (user cancelled) → do
  nothing.
- Else → build a `Blob([text], { type: 'text/plain' })`, an object URL, and a transient
  `<a download="{suggestedName}">` that is clicked and revoked. Best-effort: set the remembered
  name to `suggestedName` (we can't know where the download landed).
- `suggestedName` = the widget's remembered name if it ends in `.lua`, else `{remembered}.lua`,
  else `widget-{n}.lua`.

### "Save"

- The widget carries an optional `FileSystemFileHandle`, captured when a `.lua` is dropped into
  it: in the drop's `drop` event, synchronously call `item.getAsFileSystemHandle()` for each
  `DataTransferItem` of kind `file` (the method returns a promise that can be awaited after the
  event; the item itself must be touched during it). The handle for the **first accepted `.lua`**
  (same "first only" rule as the drop) is kept.
- The handle is **session-scoped `$state`** — not persisted. On reload it is gone and "Save"
  disappears until the user re-drops or does a "Save as…". (IndexedDB handle persistence is a
  later idea, noted in ADR 0007.)
- "Save" → `handle.createWritable()` → `write(text)` → `close()`. No confirm dialog — it is a
  deliberate menu choice on the exact file that was dropped, like Ctrl+S. A `NotAllowedError`
  (permission lapsed) falls back to a "Save as…".

### Modules

- **`widgetSave.ts`** (new): `suggestedFileName(remembered, widgetNumber)`; `saveTextAs(text,
  name)` → `Promise<FileSystemFileHandle | null>` (picker-or-download, null on cancel/download);
  `overwrite(handle, text)` → `Promise<void>`; a `fsAccessAvailable()` guard. Thin wrappers so
  components don't touch the raw APIs and the logic is mockable.
- **`WidgetContextMenu.svelte`** (new): the floating menu (items in, position in, `onSelect` /
  `onClose` out).
- **`Widget.svelte`**: `contextmenu` on the header; menu open state + coords; a `fileHandle`
  `$state`; `loadDroppedFiles` also stores the captured handle; the two save actions.
- **`Grid.svelte`**: threads the handle capture through the widget drop path only if it turns out
  `Widget` can't get it from the event itself (it can — the drop is handled in `Widget`).
- A minimal ambient `fsAccess.d.ts` declaring `window.showSaveFilePicker?` and
  `DataTransferItem.getAsFileSystemHandle?` (not in the bundled `lib.dom.d.ts`).

## Testing Decisions

`jsdom` has none of the File System Access API, so component tests **mock**
`window.showSaveFilePicker`, `URL.createObjectURL`, and a fake `FileSystemFileHandle`
(`createWritable` → an object recording `write`/`close`). Good tests assert observable outcomes:
which menu items render, what text was written, what name was suggested, that cancel writes
nothing, that the remembered name updates.

- **`widgetSave.test.ts`** — `suggestedFileName` for each input (remembered `.lua`, remembered
  bare, none); `saveTextAs` uses the picker when present and writes the text; falls back to a
  download `<a>` with the right `download` attribute when not; returns `null` on `AbortError`;
  `overwrite` writes then closes.
- **`WidgetContextMenu.test.ts`** — renders the given items; `onSelect` fires with the item;
  closes on `Escape` / outside pointerdown; a hidden "Save" item is absent.
- **`Widget.test.ts`** — right-clicking the header opens the menu and `preventDefault`s;
  right-clicking the editor does not; "Save as…" calls `widgetSave.saveTextAs` with the editor
  text and the suggested name; after a mocked successful drop that yields a handle, "Save"
  appears and writes the editor text to that handle; for a typed-from-scratch widget only "Save
  as…" appears.

## Out of Scope

- Persisting the file handle across reloads (IndexedDB) — noted for a later lot.
- A keyboard shortcut (Ctrl+S) — menu only for now.
- Saving to anything but a `.lua` file, or saving multiple widgets at once.
- Any backend file-writing endpoint — this is all client-side.
- Reworking "Memorize" / templates.
- Right-click actions other than save (copy, duplicate widget, …).

## Further Notes

- ADR 0007 records the client-only, Chromium-for-overwrite, session-only-handle design and why
  (a plain-browser follow-on to ADR 0005).
- CONTEXT.md gains a **Save** line distinguishing a disk `.lua` write from a **Template**
  ("Memorize").
