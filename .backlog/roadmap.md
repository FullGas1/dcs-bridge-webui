# Roadmap — dcs-bridge-webui

Registry of future ideas not yet formalized into a lot. Minimal format: title + context. Before
creating a new lot, check whether the idea is already here and formalize from the existing entry.
Path to formalization: `grill-with-docs` → `to-prd` → `to-issues`.

---

<!-- Make the most of widget screen space — formalized as
     `.backlog/FEAT-ADAPTIVE-LAYOUT-AND-ZOOM/` (grill-with-docs, 2026-08-30). -->

## Drag-and-drop a `.lua` file into the UI

Let the user drag a `.lua` script file from their file manager and drop it either onto an
**active widget** (loads the file's contents into that widget's editor) or onto the **`(+)` "add
widget" button** (creates a new widget pre-filled with the file's contents). Today the only way
to get a script into a widget is to paste it or type it. Open questions for grilling: overwrite
vs. confirm when dropping on a non-empty widget; whether to keep the source filename anywhere
(widget title?); multi-file drop onto `(+)`; non-`.lua` / oversized file handling.

## Rework the zoom rules (revises `FEAT-ADAPTIVE-LAYOUT-AND-ZOOM`)

The current zoom (floating control + `Ctrl`+scroll, 80%–200%) is page-wide and applies to every
widget at once. Proposed changes:

- **Per-widget zoom on hover.** `Ctrl`+scroll should zoom only when the mouse is over a widget,
  and affect only that hovered widget — not all of them together.
- **Global page zoom when the mouse is outside any widget.** In that case `Ctrl`+scroll zooms the
  whole page, banner included — the banner image currently takes up too much room and there is no
  way to shrink it.
- **Allow zooming out further.** Raise the maximum shrink (lower the 80% floor) so the user can
  get a real bird's-eye overview of many scripts at once.

Open questions for grilling: does per-widget zoom persist per widget or reset on reload; how the
floating control behaves in the two modes; new lower bound for the zoom-out range; interaction
with the independent Expand-per-area already delivered in the parent lot.

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

