# 05 — Manual cross-browser drag-and-drop verification

**Status:** done
**Type:** HITL — requires a human dragging real files from the OS file manager

## Parent

`.backlog/FEAT-LUA-FILE-DROP/PRD.md`

## What to build

Nothing to build — this is a manual verification pass. jsdom has no real `DataTransfer` and no
automation can drag a file from the OS file manager, so the end-to-end gesture is only ever
exercised by hand. Run through the checklist in **Chrome/Edge and Firefox** (the app's realistic
targets on Windows).

## Acceptance criteria

- [x] Drag a real `.lua` from the file manager onto a widget → its contents replace the editor,
      editor takes focus, header shows `Widget N — name.lua`.
- [x] Drop onto the editor area specifically → whole-document replace, not an insert at the
      cursor.
- [x] Drop a different `.lua` on the same widget → name updates.
- [x] Drag several `.lua` onto `+` → one pre-filled, named widget per file, in order, no scroll
      jump.
- [x] Drop several files on one widget → only the first `.lua` loads, message says the rest were
      ignored.
- [x] Drop a `.txt` → nothing changes, message says ignored (not `.lua`).
- [x] Drop a `.lua` over 512 KB → nothing changes, message says ignored (too large).
- [x] Drop a `.lua` saved with a BOM (e.g. from Notepad "UTF-8 with BOM") → loads clean, injects
      without a syntax error in a live mission.
- [x] Miss the target (drop on empty page area) → app does not navigate away, page state intact.
- [x] `dragover` highlight shows on the hovered widget / `+` and clears on leave/drop.
- [x] Same results in both Chrome/Edge and Firefox.

## Blocked by

- Ticket 02
- Ticket 03
- Ticket 04
