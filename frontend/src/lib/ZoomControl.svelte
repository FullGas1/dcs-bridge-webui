<script lang="ts">
  // FEAT-DUAL-ZOOM: the floating control now drives the *page* zoom only (App.svelte owns the
  // value and its persistence; the per-widget axis is Ctrl+scroll over a widget - Grid.svelte).
  // Still one instance, mounted once at the app level, and outside the zoomed page wrapper so it
  // keeps a constant on-screen size.
  import { clampZoom, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './zoomStore';

  let { zoom = $bindable(100) }: { zoom?: number } = $props();

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
    /* FEAT-DUAL-ZOOM: the control lives outside the zoomed page wrapper; this guards against it
       ever inheriting a zoom context so it stays a fixed on-screen size. */
    zoom: 1;
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
