# Roadmap — dcs-bridge-webui

Registry of future ideas not yet formalized into a lot. Minimal format: title + context. Before
creating a new lot, check whether the idea is already here and formalize from the existing entry.
Path to formalization: `grill-with-docs` → `to-prd` → `to-issues`.

---

## Expand/collapse button for the "returns" pane, like the editor already has

Noticed testing `FEAT-TABLE-RETURN-SERIALIZATION` live (2026-08-26): a serialized table can be
several lines of indented Lua, and the "returns" pane (`Widget.svelte`, `<pre
class="result-body">`) has no expand control of its own — only the whole-widget "Expand" button
(`Widget.svelte:102`, `onToggleExpand`/`expanded` prop) exists today, which grows the *entire*
widget (editor + result together, `data-expanded="true"` on `.widget`), not the result pane
specifically.

Idea: a second expand/collapse control scoped to the returns pane alone, on the same model as the
existing whole-widget one — useful now that a single injection can legitimately return a long,
multi-line result (a serialized table), not just a short string/number as before this lot.
