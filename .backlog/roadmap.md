# Roadmap — dcs-bridge-webui

Registry of future ideas not yet formalized into a lot. Minimal format: title + context. Before
creating a new lot, check whether the idea is already here and formalize from the existing entry.
Path to formalization: `grill-with-docs` → `to-prd` → `to-issues`.

---

## Make the most of widget screen space: dynamic sizing, per-pane expand, zoom

Noticed testing `FEAT-TABLE-RETURN-SERIALIZATION` live (2026-08-26): a serialized table can be
several lines of indented Lua, but the editor pane's collapsed height is fixed at 640px (~30
lines, `Widget.svelte:170`) regardless of the actual script length — a 3-line script still
reserves the full 640px, pushing the "returns" pane (`<pre class="result-body">`) down and often
off-screen, forcing a scroll through mostly empty editor space just to see the result. Widened in
conversation (2026-08-30) to three related asks, to be delivered as one lot:

**A — Dynamic collapsed height for both panes.** Below the current ~30-line threshold, the
editor's (and the returns pane's) collapsed height should track the actual line count of its own
content instead of always reserving the full fixed height — a 3-line script gets a ~3-line box,
freeing the rest of the widget for the result. At or above the threshold, today's fixed cap stays
(unchanged — `Expand` is still the only way to see the whole thing beyond that).

**B — Give the returns pane its own Expand/collapse.** Only the whole-widget "Expand" button
exists today (`Widget.svelte:102`, `onToggleExpand`/`expanded` prop, grows editor + result
together via `data-expanded` on `.widget`). Factor that mechanism so the returns pane can also be
expanded/collapsed independently of the editor, not only as a package deal with it.

**C — Zoom control on both panes.** Two buttons (`+`/`-`) plus `Ctrl` + mouse wheel, independently
zooming the script editor and the returns pane (font/content scale, not just the box height from
A) — for reading a dense result or a script comfortably without changing the browser's own zoom.

To resolve during grilling: exact interaction between A's dynamic height and B's independent
expand state (does expanding return-pane-alone override its dynamic height, or does dynamic
height only apply while collapsed?); whether C's zoom level persists (localStorage, per-widget?)
and its relationship to CodeMirror's own font-size mechanism; whether B's factored expand
mechanism is a shared component/hook used by both panes or two independent instances of the same
pattern.
