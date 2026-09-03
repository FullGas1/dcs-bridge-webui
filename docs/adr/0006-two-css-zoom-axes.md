# Zoom is two axes — per-widget CSS `zoom`, page `--page-zoom` variable

`FEAT-ADAPTIVE-LAYOUT-AND-ZOOM` ticket 03 made zoom a single page-wide percentage that scaled
only the `font-size` of every editor and every result, via a `--zoom-factor` custom property.
`FEAT-DUAL-ZOOM` replaces that with **two independent axes**, chosen by whether `Ctrl`+scroll
happens with the pointer over a widget:

- **Per-widget zoom** — CSS `zoom` on the individual `.widget` element. A widget's height is
  content-driven, so `zoom` genuinely scales it; the width re-inflates to fill the grid, which is
  fine. Range 40–250%.
- **Page zoom** — a `--page-zoom` custom property (0.4–2.0) set on a `.page` wrapper around the
  branding header and the grid. Consumed explicitly: the editor/result `font-size`
  (`calc(16px * var(--page-zoom))`, as the parent lot did) and the **banner image width**
  (`calc(100% * var(--page-zoom))`). Range 40–200%.

The floating control drives the page axis; a widget shows its own `%` in its header with a
click-to-reset.

Considered and rejected:

- **CSS `zoom` for the page axis too** (the first cut of this lot, PR #17). It is a **no-op on a
  viewport-filling wrapper**: under `zoom: 0.6` the browser lays the wrapper out at `1/0.6` size
  so it still fills the viewport, and anything sized `width: 100%` (the banner, the grid) ends up
  the same visual size. Verified live. `zoom` only works where the element's size is
  content-driven — hence it is kept for the per-widget axis but not the page.
- **`transform: scale()`** for the page. Same `width:100%` re-inflation once you compensate the
  layout box, plus it doesn't reflow and rebases `position: fixed`.
- **Keeping a single font-size axis.** Can't shrink the banner, which was the main ask.

Consequence: the page axis does not scale widget *chrome* (headers, buttons) — same scope as the
parent lot. And `reportHeight`'s collapsed-editor cap is recomputed only on a document change, so
after a page-zoom change a past-the-cap editor keeps a stale height until the next edit — a
pre-existing limitation of the adaptive-height machinery, not made worse here.
