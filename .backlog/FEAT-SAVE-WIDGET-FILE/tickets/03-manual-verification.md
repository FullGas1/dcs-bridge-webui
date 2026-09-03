# 03 — Manual verification (HITL), Chrome + Firefox

**Status:** done
**Type:** HITL — the File System Access API and real file writes are not exercisable in jsdom

## Parent

`.backlog/FEAT-SAVE-WIDGET-FILE/PRD.md`

## What to build

Nothing — a verification pass against the running exe.

## Acceptance criteria

**Chrome/Edge**

- [x] Drop a real `.lua`, edit a line, right-click the header → "Save" → the file on disk now
      has the edit, no dialog appeared.
- [x] Right-click header → "Save as…" → the native picker opens with the file name pre-filled →
      pick a new location → the file is written and the widget header name updates to it.
- [x] A following "Save" now overwrites that new file.
- [x] Cancel the "Save as…" picker → nothing is written, no error.
- [x] Widget typed from scratch → only "Save as…" in the menu, defaulting to `widget-N.lua`.
- [x] Right-click inside the editor → the browser's own copy/paste menu still appears.
- [x] The saved file is byte-for-byte the editor text (open it and compare; no BOM).

**Firefox**

- [x] Right-click header → only "Save as…" (no "Save").
- [x] "Save as…" downloads the `.lua` into the download folder with the right name.

## Blocked by

- Ticket 01
- Ticket 02
