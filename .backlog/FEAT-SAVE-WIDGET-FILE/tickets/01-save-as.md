# 01 — "Save as…" from a header right-click (picker or download)

**Status:** done

## Parent

`.backlog/FEAT-SAVE-WIDGET-FILE/PRD.md`

## What to build

Right-clicking a widget's **header** opens a small menu with one item, **Save as…**, that writes
the current editor text to a `.lua` file the user chooses — via `window.showSaveFilePicker()`
where it exists, otherwise a plain download.

- `contextmenu` on `.widget-header` → `preventDefault()` → open a floating `WidgetContextMenu`
  at the pointer. Right-clicking the editor or the result is left alone (native menu).
- `WidgetContextMenu.svelte`: renders the items it's given; closes on `Escape`, on an outside
  `pointerdown`, and after a selection.
- `widgetSave.ts`:
  - `suggestedFileName(remembered, widgetNumber)` → the remembered name if it ends `.lua`, else
    `{remembered}.lua`, else `widget-{n}.lua`.
  - `saveTextAs(text, name)` → `Promise<FileSystemFileHandle | null>`: if
    `window.showSaveFilePicker` exists, call it with `{ suggestedName: name }`, write the text
    through `createWritable()`, return the handle; on `AbortError` return `null`. Otherwise make
    a `Blob`/object-URL/`<a download=name>`, click and revoke it, return `null`.
  - `fsAccessAvailable()` guard.
- On a picker save that returns a handle: `Widget` adopts it as its `fileHandle` and sets the
  remembered name to the chosen file's `.name`. On the download path: set the remembered name to
  `name`.
- Ambient `fsAccess.d.ts` for `window.showSaveFilePicker?`.

## Acceptance criteria

- [x] Right-clicking the widget header opens the menu and suppresses the browser's own menu;
      right-clicking the editor does not open ours.
- [x] The menu shows "Save as…"; it closes on Escape, on an outside click, and after the item is
      chosen.
- [x] "Save as…" with the picker available writes exactly the editor's current text (no BOM, no
      trailing changes) to the picked file, and the widget's header name updates to that file's
      name.
- [x] "Save as…" without the picker triggers a download whose file name is the suggested name.
- [x] Cancelling the picker writes nothing and changes nothing.
- [x] `suggestedFileName` covers: remembered ending `.lua`, remembered without extension, and no
      remembered name (`widget-{n}.lua`).
- [x] `widgetSave.test.ts`, `WidgetContextMenu.test.ts`, and `Widget.test.ts` cover the above
      (picker mocked, `URL.createObjectURL` mocked).
- [x] Full frontend suite, `svelte-check`, `vite build` green.

## Blocked by

None - can start immediately
