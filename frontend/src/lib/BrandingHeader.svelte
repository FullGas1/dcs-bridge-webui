<!--
  Ticket 01 (FEAT-BRANDING-HEADER-REDESIGN): banner.jpg was supplied by the user, built to the
  brief worked out in this lot's grilling - generic helicopters + an invented tactical-map motif,
  no DCS World / Eagle Dynamics branding or reproduction of DCS's own F10 UI (still honors the
  trademark-risk decision the previous SVG banner documented, just with a richer asset).
-->
<div class="branding-header">
  <img
    src="/banner.jpg"
    alt="dcs-bridge-webui: helicopters and a live code injection crossing into a tactical map, for real-time Lua injection and debugging"
  />
</div>

<style>
  .branding-header {
    border-bottom: 1px solid var(--border);
    line-height: 0;
    /* FEAT-DUAL-ZOOM: when the page is zoomed out the banner shrinks with it; the freed space
       reads as page background rather than a gap. */
    background: var(--bg-page);
  }

  img {
    display: block;
    /* FEAT-DUAL-ZOOM: page zoom shrinks/grows the banner (App .page wrapper's --page-zoom, 1 at
       100%). A `width:100%` under a CSS `zoom` re-inflates and never changes size, so scale the
       width explicitly. */
    width: calc(100% * var(--page-zoom, 1));
    max-width: 100%;
    height: auto;
  }
</style>
