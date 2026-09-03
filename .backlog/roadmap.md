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

<!-- "App settings panel" (editable app parameters persisted across reloads) — dropped 2026-09-03
     by the user; the hardcoded constants (512 KB drop cap, 40-200% / 40-250% zoom ranges) stay
     as-is. -->

<!-- Save a widget's script back to a `.lua` file — formalized as
     `.backlog/FEAT-SAVE-WIDGET-FILE/` (autonomous grill, ADR 0007): header right-click →
     "Save as…" (picker / download) + "Save" (overwrite the dropped file, Chromium only). -->

## Persist a widget's file handle across reloads

Follow-on to `FEAT-SAVE-WIDGET-FILE`: its "Save" only works within the session because the
`FileSystemFileHandle` captured on drop is kept in memory. Persisting it in IndexedDB would let
"Save" survive reopening the tab (still with a permission re-prompt on first write). Low priority
— noted in ADR 0007.

