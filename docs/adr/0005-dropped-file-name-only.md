# A drag-and-dropped `.lua` file is remembered by base name only — no path, no handle

When a `.lua` file is dropped into a widget (or onto the `+` button), the widget remembers and
displays the file's **base name** (`patrol_check.lua`) and nothing more. The file's folder, its
absolute path, and any writable reference to it are deliberately **out of scope** — a later
"Save / Save as" lot will decide how (or whether) to enable write-back.

This is forced by the platform: the app is a plain OS browser pointed at a local FastAPI server
(ADR 0003), not Electron/Tauri, so a dropped `File` exposes only its base name — never a path.
The only way to round-trip to the exact file is the File System Access API
(`DataTransferItem.getAsFileSystemHandle()` at drop time, handle persisted in IndexedDB,
permission re-prompt on write), which is Chromium-only and pulls in real infrastructure.

Considered: capturing and persisting the `FileSystemFileHandle` now so a future Save feature has
it ready. Rejected as speculative — its only consumer is a lot that has not been designed yet, so
we would be guessing that lot's needs. When Save is grilled, it can add handle capture to the
drop path as a small, localized change.

Consequence: loading a template into a widget also sets the displayed name (to the template's
name, as a pseudo-file-name). The remembered value is therefore a display label, not a
guaranteed-real filename — the Save lot must not assume it points at a file on disk.
