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

