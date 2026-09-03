# Roadmap — dcs-bridge-webui

Registry of future ideas not yet formalized into a lot. Minimal format: title + context. Before
creating a new lot, check whether the idea is already here and formalize from the existing entry.
Path to formalization: `grill-with-docs` → `to-prd` → `to-issues`.

---

<!-- Make the most of widget screen space — formalized as
     `.backlog/FEAT-ADAPTIVE-LAYOUT-AND-ZOOM/` (grill-with-docs, 2026-08-30). -->

<!-- Drag-and-drop a `.lua` file into the UI — formalized as `.backlog/FEAT-LUA-FILE-DROP/`
     (grill-with-docs) and delivered (PR #13-#16, fixes FIX-EDITOR-DROP-HEIGHT #14/#15). -->


<!-- Rework the zoom rules — formalized as `.backlog/FEAT-DUAL-ZOOM/` (autonomous grill, ADR 0006):
     per-widget zoom on Ctrl+scroll over a widget, global page zoom (banner included) elsewhere,
     both CSS `zoom`, ranges widened to 40%. -->

## App settings panel

A button in the page header that opens a grid of editable parameters to reconfigure the app,
persisted across reloads. Today every tunable is either a hardcoded constant or ambient
localStorage state with no UI to change it. First candidate settings to expose:

- **Max drag-and-dropped file size** (see the drag-and-drop entry — shipped as a hardcoded 512 KB
  first, to be made configurable here).
- **Zoom-out floor and zoom-in ceiling** (see the zoom-rules entry — currently hardcoded
  80%–200%).

Open questions for grilling: storage (localStorage vs backend, like templates); per-setting
validation and what happens on a bad value; whether "reset to defaults" is offered; whether the
panel is a modal, a drawer, or an inline section; which of the existing hardcoded constants
(`MAX_COLLAPSED_LINES`, queue behaviour, etc.) are in scope vs. deliberately left alone.

## Save a widget's script back to a `.lua` file

A right-click context menu on a widget with two forms, both building on the source file
remembered when a `.lua` was drag-and-dropped into it (see the drag-and-drop entry, which is
what first gives a widget an associated file):

- **Save** — keep the remembered name and overwrite the original source file in place.
- **Save as…** — open a file picker rooted at the original file's folder (when the widget got
  its script by drag-and-drop) with the remembered file name pre-filled.

Lets the user round-trip: drop a script in, edit it live against the mission, save it back.

Intent: also remember the dropped file's **full path** so a later Save can target it directly.

Hard constraint to resolve in grilling: this app is a **plain OS browser** pointed at a local
FastAPI server (ADR 0003) — not Electron/Tauri — so a drag-and-dropped `File` exposes **only its
base name**, never an absolute path or folder. Storing "the full path" as a string is not
possible from a drop. The realistic routes:
- **File System Access API** — `DataTransferItem.getAsFileSystemHandle()` at drop time yields a
  `FileSystemFileHandle` (no readable path, but writable back to that exact file after a
  permission re-prompt); persist the handle in IndexedDB. Chromium only (Chrome/Edge — the common
  case on Windows; Firefox unsupported).
- **Backend filesystem round-trip** — the browser still can't supply the path, so the backend
  would need its own "pick a file" step.

Other open questions: what "Save" does for a widget typed from scratch (no remembered file) —
fall back to "Save as…", or hide it; whether "Save as…" updates the widget's remembered
name/handle; confirm-on-overwrite for "Save"; how this coexists with the existing "Memorize"
template action (disk file vs. named template are different things).

