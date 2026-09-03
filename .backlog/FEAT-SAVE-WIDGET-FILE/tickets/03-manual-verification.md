# 03 — Manual verification (HITL), Chrome + Firefox

**Status:** todo
**Type:** HITL — the File System Access API and real file writes are not exercisable in jsdom

## Parent

`.backlog/FEAT-SAVE-WIDGET-FILE/PRD.md`

## What to build

Nothing — a verification pass against the running exe.

## Acceptance criteria

**Chrome/Edge**

- [ ] Drop a real `.lua`, edit a line, right-click the header → "Save" → the file on disk now
      has the edit, no dialog appeared.
- [ ] Right-click header → "Save as…" → the native picker opens with the file name pre-filled →
      pick a new location → the file is written and the widget header name updates to it.
- [ ] A following "Save" now overwrites that new file.
- [ ] Cancel the "Save as…" picker → nothing is written, no error.
- [ ] Widget typed from scratch → only "Save as…" in the menu, defaulting to `widget-N.lua`.
- [ ] Right-click inside the editor → the browser's own copy/paste menu still appears.
- [ ] The saved file is byte-for-byte the editor text (open it and compare; no BOM).

**Firefox**

- [ ] Right-click header → only "Save as…" (no "Save").
- [ ] "Save as…" downloads the `.lua` into the download folder with the right name.

## Blocked by

- Ticket 01
- Ticket 02
