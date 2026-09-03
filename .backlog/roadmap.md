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

