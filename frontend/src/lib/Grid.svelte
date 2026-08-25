<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from './Widget.svelte';
  import { InjectionQueue } from './injectionQueue';
  import { loadWidgets, saveWidgets } from './widgetSession';
  import { listTemplates, saveTemplate, deleteTemplate, type Template } from './api';

  interface WidgetRecord {
    id: number;
    code: string;
    expanded: boolean;
  }

  // One shared queue for every widget on the page (ticket 03): only one injection in flight
  // across the whole grid, regardless of which widget triggered it.
  const queue = new InjectionQueue();

  // One shared template list for every widget on the page (ticket 05).
  let templates = $state<Template[]>([]);
  onMount(() => {
    listTemplates().then((list) => (templates = list));
  });

  async function handleSaveTemplate(name: string, code: string): Promise<void> {
    templates = await saveTemplate(name, code);
  }

  async function handleDeleteTemplate(id: string): Promise<void> {
    templates = await deleteTemplate(id);
  }

  const stored = loadWidgets();
  let nextId = stored && stored.length > 0 ? Math.max(...stored.map((w) => w.id)) + 1 : 1;

  // null = genuinely nothing saved yet -> seed one empty widget (ticket 03's default).
  // An empty array IS a legitimate prior state (every widget was closed) and is respected as-is.
  let widgets = $state<WidgetRecord[]>(
    stored === null
      ? [{ id: nextId++, code: '', expanded: false }]
      : stored.map((w) => ({ id: w.id, code: w.code, expanded: false })),
  );

  $effect(() => {
    saveWidgets(widgets.map((w) => ({ id: w.id, code: w.code })));
  });

  function addWidget(): void {
    widgets.push({ id: nextId++, code: '', expanded: false });
  }

  function closeWidget(id: number): void {
    widgets = widgets.filter((w) => w.id !== id);
  }

  function toggleExpand(id: number): void {
    const widget = widgets.find((w) => w.id === id);
    if (widget) widget.expanded = !widget.expanded;
  }

  function updateCode(id: number, code: string): void {
    const widget = widgets.find((w) => w.id === id);
    if (widget) widget.code = code;
  }
</script>

<div class="grid">
  {#each widgets as w (w.id)}
    <Widget
      number={w.id}
      {queue}
      expanded={w.expanded}
      initialCode={w.code}
      onClose={() => closeWidget(w.id)}
      onToggleExpand={() => toggleExpand(w.id)}
      onCodeChange={(code) => updateCode(w.id, code)}
      {templates}
      onSaveTemplate={handleSaveTemplate}
      onDeleteTemplate={handleDeleteTemplate}
    />
  {/each}
  <button type="button" class="add-widget" onclick={addWidget} aria-label="Add widget">+</button>
</div>
