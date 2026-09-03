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
    overflow: hidden;
    /* FEAT-DUAL-ZOOM: page zoom-out shrinks the banner's *height* (it took too much vertical
       room - the original complaint). It stays full width with the image centre-cropped, so no
       grey bands ever appear at the sides. Zoom-in (page zoom > 1) leaves it at its natural
       shape. 1024 / 219 is the banner's aspect ratio. */
    aspect-ratio: calc(1024 / 219 / min(1, var(--page-zoom, 1)));
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
</style>
