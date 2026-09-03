# Zoom is two CSS-`zoom` axes (page + per-widget), not one font-size scale

`FEAT-ADAPTIVE-LAYOUT-AND-ZOOM` ticket 03 made zoom a single page-wide percentage that scaled
only the `font-size` of every editor and every result, via a `--zoom-factor` custom property.
`FEAT-DUAL-ZOOM` replaces that with **two independent axes**, each implemented with the CSS
`zoom` property:

- a **global page zoom** on a wrapper around the branding header and the grid (so the banner
  image scales too — font-size scaling could never do that), and
- a **per-widget zoom** on the individual `.widget` element, chosen when `Ctrl`+scroll happens
  with the pointer over a widget.

`--zoom-factor` and the `font-size: calc(… * var(--zoom-factor))` rules are removed.

Considered and rejected:

- **Keep font-size scaling, add a per-widget `--zoom-factor`.** Still can't shrink the banner,
  and leaves the fragile `font-size` → `defaultLineHeight` → `reportHeight` chain (see
  `FIX-EDITOR-DROP-HEIGHT`) as the only sizing mechanism.
- **`transform: scale()`** for the page/widget. It doesn't reflow — scaled elements overlap
  their siblings — needs `transform-origin` handling, and leaves scrollbars and hit-testing at
  the unscaled geometry. CSS `zoom` reflows like the browser's own zoom, which is the exact
  mental model users have here.

Consequence: the floating zoom control must live **outside** the page wrapper (CSS `zoom`, unlike
`transform`, scales `position: fixed` descendants), and CodeMirror's line-height measurement now
runs inside a possibly-`zoom`ed context — verified in `FEAT-DUAL-ZOOM` ticket 04; if it drifts,
the fix is local to `reportHeight`.
