# Saving a widget back to a `.lua` file is client-only, and "overwrite in place" is Chromium-only

`FEAT-SAVE-WIDGET-FILE` lets a widget write its script back to disk. It does this entirely in the
browser — no backend file-writing endpoint:

- **"Save as…"** uses `window.showSaveFilePicker()` where it exists (Chromium), and falls back to
  a plain `<a download>` blob download everywhere else (Firefox).
- **"Save"** (overwrite the exact dropped file, no dialog) needs a `FileSystemFileHandle`
  captured from the drop via `DataTransferItem.getAsFileSystemHandle()` — **Chromium only**. The
  handle is kept in session memory, not persisted, so it is gone after a reload and "Save"
  disappears until the user re-drops or does another "Save as…".

Why not a backend write: the app is a plain OS browser on a local FastAPI server (ADR 0003). A
dropped `File` exposes only its base name (ADR 0005), so the backend can never be told which file
to overwrite; giving the backend its own file dialog (a blocking `tkinter` call from a console
exe) is worse than the browser's own picker.

Why not persist the handle (IndexedDB): a `FileSystemFileHandle` can be stored and restored, but
it needs a fresh permission prompt on the first write of each session anyway, and the value of
"Save still works after I reopen the tab" is low against the extra moving parts. Left as a future
idea.

Consequence: Firefox users get download-only "Save as…" and never see "Save". This is acceptable
graceful degradation for a feature that is inherently gated on a Chromium API.
