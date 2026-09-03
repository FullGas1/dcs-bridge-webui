<script lang="ts">
  import BrandingHeader from './lib/BrandingHeader.svelte';
  import Grid from './lib/Grid.svelte';
  import ZoomControl from './lib/ZoomControl.svelte';
  import { clampZoom, loadZoom, saveZoom } from './lib/zoomStore';

  // FEAT-DUAL-ZOOM: App owns the page-zoom value. It is exposed as the `--page-zoom` custom
  // property on the .page wrapper (scoped there so the floating control, outside it, is
  // unaffected) and persisted here. CSS `zoom` was tried first but is a no-op on a
  // viewport-filling wrapper (the browser re-inflates the layout under it); `--page-zoom` is
  // consumed explicitly - the banner image width and the editor/result font-size (see app.css /
  // Widget.svelte).
  let pageZoom = $state(loadZoom());

  $effect(() => {
    saveZoom(pageZoom);
  });

  function nudgePageZoom(deltaPercent: number): void {
    pageZoom = clampZoom(pageZoom + deltaPercent);
  }
</script>

<main>
  <div class="page" style="--page-zoom: {pageZoom / 100}">
    <BrandingHeader />

    <Grid onNudgePageZoom={nudgePageZoom} />
  </div>

  <ZoomControl bind:zoom={pageZoom} />
</main>

<style>
  .page {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
