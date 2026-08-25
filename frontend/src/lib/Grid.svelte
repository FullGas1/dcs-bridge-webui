<script lang="ts">
  import Widget from './Widget.svelte';
  import { InjectionQueue } from './injectionQueue';

  // One shared queue for every widget on the page (ticket 03): only one injection in flight
  // across the whole grid, regardless of which widget triggered it.
  const queue = new InjectionQueue();

  let nextId = 1;
  let widgets = $state<{ id: number; expanded: boolean }[]>([{ id: nextId++, expanded: false }]);

  function addWidget(): void {
    widgets.push({ id: nextId++, expanded: false });
  }

  function closeWidget(id: number): void {
    widgets = widgets.filter((w) => w.id !== id);
  }

  function toggleExpand(id: number): void {
    const widget = widgets.find((w) => w.id === id);
    if (widget) widget.expanded = !widget.expanded;
  }
</script>

<div class="grid">
  {#each widgets as w (w.id)}
    <Widget
      number={w.id}
      {queue}
      expanded={w.expanded}
      onClose={() => closeWidget(w.id)}
      onToggleExpand={() => toggleExpand(w.id)}
    />
  {/each}
  <button type="button" class="add-widget" onclick={addWidget} aria-label="Add widget">+</button>
</div>
