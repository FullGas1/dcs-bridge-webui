<script lang="ts">
  import BrandingHeader from './lib/BrandingHeader.svelte';
  import Grid from './lib/Grid.svelte';
  import ZoomControl from './lib/ZoomControl.svelte';
  import { clampZoom, loadZoom, saveZoom } from './lib/zoomStore';

  // FEAT-DUAL-ZOOM: App owns the page-zoom value. It is applied as CSS `zoom` on the .page
  // wrapper (so the banner scales too) and persisted here; ZoomControl is rendered outside the
  // wrapper so it keeps a constant on-screen size.
  let pageZoom = $state(loadZoom());

  $effect(() => {
    saveZoom(pageZoom);
  });

  function nudgePageZoom(deltaPercent: number): void {
    pageZoom = clampZoom(pageZoom + deltaPercent);
  }
</script>

<main>
  <div class="page" style="zoom: {pageZoom / 100}">
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
