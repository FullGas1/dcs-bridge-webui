<script lang="ts">
  // Ticket 03 (FEAT-ADAPTIVE-LAYOUT-AND-ZOOM): the single page-wide zoom control - one instance,
  // mounted once at the app level (see App.svelte), never per-widget (a per-widget control would
  // misleadingly imply a per-widget effect when the zoom is page-wide). Floating so it stays
  // reachable at any scroll position.
  import { clampZoom, loadZoom, saveZoom, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './zoomStore';

  let zoom = $state(loadZoom());

  $effect(() => {
    // A single CSS variable, read by both the editor container and the result body (app.css /
    // Widget.svelte) - purely visual (font-size), never touches a document's own content or its
    // undo history.
    document.documentElement.style.setProperty('--zoom-factor', String(zoom / 100));
    saveZoom(zoom);
  });

  $effect(() => {
    function handleWheel(e: WheelEvent): void {
      if (!e.ctrlKey) return;
      // Anywhere on the page - there's only one zoom level to adjust (see PRD: a two-zone
      // editor-vs-result split was considered and dropped in favor of this single value).
      e.preventDefault();
      zoom = clampZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    }

    // { passive: false } is required to be allowed to preventDefault() and stop the browser's
    // own native page zoom from also firing on the same gesture.
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  });

  function zoomIn(): void {
    zoom = clampZoom(zoom + ZOOM_STEP);
  }

  function zoomOut(): void {
    zoom = clampZoom(zoom - ZOOM_STEP);
  }
</script>

<div class="zoom-control">
  <button type="button" onclick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
    &minus;
  </button>
  <span class="zoom-level">{zoom}%</span>
  <button type="button" onclick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
    &plus;
  </button>
</div>

<style>
  .zoom-control {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-surface);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .zoom-level {
    font-size: 13px;
    min-width: 3.5em;
    text-align: center;
  }
</style>
