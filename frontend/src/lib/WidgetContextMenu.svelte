<script lang="ts">
  // FEAT-SAVE-WIDGET-FILE: the small floating menu shown on a widget-header right-click.
  interface MenuItem {
    label: string;
    onSelect: () => void;
  }

  interface Props {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
  }
  let { x, y, items, onClose }: Props = $props();

  function choose(item: MenuItem): void {
    onClose();
    item.onSelect();
  }

  $effect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    function onPointerDown(e: PointerEvent): void {
      if (!(e.target instanceof Node) || !menu?.contains(e.target)) onClose();
    }
    window.addEventListener('keydown', onKey);
    // capture so it fires before the target's own handlers
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  });

  let menu: HTMLDivElement | undefined = $state();
</script>

<div
  bind:this={menu}
  class="widget-context-menu"
  role="menu"
  tabindex="-1"
  style="left: {x}px; top: {y}px;"
>
  {#each items as item (item.label)}
    <button type="button" role="menuitem" onclick={() => choose(item)}>{item.label}</button>
  {/each}
</div>

<style>
  .widget-context-menu {
    position: fixed;
    z-index: 200;
    min-width: 11em;
    display: flex;
    flex-direction: column;
    padding: 4px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .widget-context-menu button {
    text-align: left;
    border: none;
    background: none;
    border-radius: 4px;
    padding: 6px 10px;
    font: inherit;
    color: var(--text-h);
    cursor: pointer;
  }
  .widget-context-menu button:hover {
    background: rgba(128, 128, 128, 0.18);
  }
</style>
