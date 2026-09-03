# 02 — "Save" overwrites the dropped file in place (Chromium)

**Status:** done

## Parent

`.backlog/FEAT-SAVE-WIDGET-FILE/PRD.md`

## What to build

When a widget got its script by drag-and-drop **and** the browser can hand over a writable
handle, the menu gains **Save**, which writes the current editor text straight to that file — no
dialog, no confirm.

- In the widget drop handler, during the `drop` event, synchronously call
  `item.getAsFileSystemHandle?.()` on each `DataTransferItem` of `kind === 'file'` (the returned
  promises are awaited after the event). Keep the handle that corresponds to the **first accepted
  `.lua`** (same "first only" rule as `partitionDroppedFiles` for a widget target).
- `Widget` stores it as `fileHandle` — session-scoped `$state`, not persisted. A new drop
  replaces it; loading a template or `Save as…` (download path) clears it; a picker `Save as…`
  sets it.
- `WidgetContextMenu` shows "Save" only when `fileHandle` is set.
- "Save" → `widgetSave.overwrite(handle, text)`: `handle.createWritable()` → `write(text)` →
  `close()`. A `NotAllowedError` (permission lapsed) falls back to `saveTextAs` (i.e. behaves as
  "Save as…").
- Ambient `fsAccess.d.ts` extended with `DataTransferItem.getAsFileSystemHandle?`.

## Acceptance criteria

- [x] After a `.lua` is dropped on a widget in a browser that yields a handle, the menu shows
      both "Save" and "Save as…".
- [x] After a `.lua` is dropped in a browser that does not (Firefox), only "Save as…" shows.
- [x] For a widget typed from scratch, only "Save as…" shows.
- [x] "Save" writes exactly the editor's current text to the dropped file with no dialog and no
      confirmation.
- [x] Dropping a different `.lua` on the widget re-points "Save" at the new file; loading a
      template removes "Save".
- [x] A permission failure on "Save" falls back to the "Save as…" flow rather than erroring.
- [x] `widgetSave.test.ts` covers `overwrite` (write + close, and the `NotAllowedError`
      fallback); `Widget.test.ts` covers the menu-item visibility and that "Save" writes to the
      captured (mocked) handle.
- [x] Full frontend suite, `svelte-check`, `vite build` green.

## Blocked by

- Ticket 01 (the menu, `widgetSave.ts`, and the `Save as…` fallback that `Save` reuses)
