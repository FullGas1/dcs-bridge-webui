<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from './Widget.svelte';
  import ConnectionBanner from './ConnectionBanner.svelte';
  import { InjectionQueue } from './injectionQueue';
  import { loadWidgets, saveWidgets } from './widgetSession';
  import {
    dragHasFiles, formatDropMessage, partitionDroppedFiles, type DropPartition,
  } from './luaDrop';
  import {
    listTemplates, saveTemplate, deleteTemplate, checkConnection, setApiKey, type Template,
  } from './api';

  // FEAT-DUAL-ZOOM: App owns the page zoom; Grid calls this when a Ctrl+scroll lands outside any
  // widget (ticket 02 wires the listener).
  let { onNudgePageZoom }: { onNudgePageZoom?: (deltaPercent: number) => void } = $props();

  interface WidgetRecord {
    id: number;
    code: string;
    // Ticket 02 (FEAT-LUA-FILE-DROP): base name of the dropped `.lua`, or a loaded template's
    // name shown as a pseudo-file-name; null for a widget typed from scratch.
    filename: string | null;
    // Ticket 01 (FEAT-ADAPTIVE-LAYOUT-AND-ZOOM): independent per area, replacing the old single
    // `expanded` flag that grew editor + result together.
    editorExpanded: boolean;
    resultExpanded: boolean;
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

  // Ticket 01 (FEAT-LUA-FILE-DROP): a `.lua` dropped onto a widget or the add button is handled
  // there (and that handler stops propagation). Anything that bubbles up to the window is a
  // missed drop - swallow it so the browser doesn't navigate away to open the file.
  onMount(() => {
    function guardStrayFileDrag(event: DragEvent): void {
      if (dragHasFiles(event)) event.preventDefault();
    }
    window.addEventListener('dragover', guardStrayFileDrag);
    window.addEventListener('drop', guardStrayFileDrag);
    return () => {
      window.removeEventListener('dragover', guardStrayFileDrag);
      window.removeEventListener('drop', guardStrayFileDrag);
    };
  });

  // Connection banner (ticket 06). Optimistic default so the banner doesn't flash on a page
  // that's actually fine while the initial probe is in flight.
  let connected = $state(true);
  onMount(async () => {
    const status = await checkConnection();
    connected = status.connected;
  });

  // A successful run proves we're connected; a connection/auth-shaped failure means we're not.
  // A script the user wrote themselves failing (dcs_error) says nothing about connectivity.
  queue.subscribe((result) => {
    if (result.status === 'success') {
      connected = true;
    } else if (result.errorType === 'connection_error' || result.errorType === 'http_error') {
      connected = false;
    }
  });

  async function handleConnectionSubmit(apiKey: string): Promise<boolean> {
    await setApiKey(apiKey);
    const status = await checkConnection();
    connected = status.connected;
    return status.connected;
  }

  const stored = loadWidgets();
  let nextId = stored && stored.length > 0 ? Math.max(...stored.map((w) => w.id)) + 1 : 1;

  // null = genuinely nothing saved yet -> seed one empty widget (ticket 03's default).
  // An empty array IS a legitimate prior state (every widget was closed) and is respected as-is.
  let widgets = $state<WidgetRecord[]>(
    stored === null
      ? [{ id: nextId++, code: '', filename: null, editorExpanded: false, resultExpanded: false }]
      : stored.map((w) => ({
          id: w.id, code: w.code, filename: w.filename ?? null,
          editorExpanded: false, resultExpanded: false,
        })),
  );

  $effect(() => {
    saveWidgets(
      widgets.map((w) => (w.filename ? { id: w.id, code: w.code, filename: w.filename }
                                    : { id: w.id, code: w.code })),
    );
  });

  function addWidget(): void {
    widgets.push({
      id: nextId++, code: '', filename: null, editorExpanded: false, resultExpanded: false,
    });
  }

  // Ticket 04 (FEAT-LUA-FILE-DROP): `.lua` files dropped on the add button - one new widget per
  // accepted file, in file order, pre-filled and named. Focus and scroll are left alone (several
  // widgets may appear at once). `dragDepth` mirrors the per-widget highlight logic.
  let addDragDepth = $state(0);

  function onAddDragEnter(event: DragEvent): void {
    if (!dragHasFiles(event)) return;
    event.preventDefault();
    addDragDepth += 1;
  }

  function onAddDragLeave(event: DragEvent): void {
    if (!dragHasFiles(event)) return;
    addDragDepth = Math.max(0, addDragDepth - 1);
  }

  function onAddDragOver(event: DragEvent): void {
    if (!dragHasFiles(event)) return;
    event.preventDefault();
  }

  function onAddDrop(event: DragEvent): void {
    if (!dragHasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    addDragDepth = 0;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) void addWidgetsFromFiles(Array.from(files));
  }

  async function addWidgetsFromFiles(files: File[]): Promise<void> {
    const partition = await partitionDroppedFiles(files, 'add-button');
    reportDrop(partition);
    for (const file of partition.loaded) {
      widgets.push({
        id: nextId++, code: file.text, filename: file.name,
        editorExpanded: false, resultExpanded: false,
      });
    }
  }

  function closeWidget(id: number): void {
    widgets = widgets.filter((w) => w.id !== id);
  }

  function toggleEditorExpand(id: number): void {
    const widget = widgets.find((w) => w.id === id);
    if (widget) widget.editorExpanded = !widget.editorExpanded;
  }

  function toggleResultExpand(id: number): void {
    const widget = widgets.find((w) => w.id === id);
    if (widget) widget.resultExpanded = !widget.resultExpanded;
  }

  function updateCode(id: number, code: string): void {
    const widget = widgets.find((w) => w.id === id);
    if (widget) widget.code = code;
  }

  function updateFilename(id: number, filename: string | null): void {
    const widget = widgets.find((w) => w.id === id);
    if (widget) widget.filename = filename;
  }

  // Ticket 03 (FEAT-LUA-FILE-DROP): one aggregated, self-dismissing line about the last drop.
  // A new drop replaces any message still on screen.
  const DROP_MESSAGE_MS = 5000;
  let dropMessage = $state<string | null>(null);
  let dropMessageTimer: ReturnType<typeof setTimeout> | undefined;

  function reportDrop(partition: DropPartition): void {
    const message = formatDropMessage(partition);
    clearTimeout(dropMessageTimer);
    dropMessage = message;
    if (message !== null) {
      dropMessageTimer = setTimeout(() => (dropMessage = null), DROP_MESSAGE_MS);
    }
  }

  function dismissDropMessage(): void {
    clearTimeout(dropMessageTimer);
    dropMessage = null;
  }

  onMount(() => () => clearTimeout(dropMessageTimer));
</script>

{#if !connected}
  <ConnectionBanner onSubmit={handleConnectionSubmit} />
{/if}

{#if dropMessage}
  <div class="drop-message" role="status">
    <span>{dropMessage}</span>
    <button type="button" onclick={dismissDropMessage} aria-label="Dismiss message">&times;</button>
  </div>
{/if}

<div class="grid">
  {#each widgets as w (w.id)}
    <Widget
      number={w.id}
      {queue}
      editorExpanded={w.editorExpanded}
      resultExpanded={w.resultExpanded}
      initialCode={w.code}
      initialFilename={w.filename}
      onClose={() => closeWidget(w.id)}
      onToggleEditorExpand={() => toggleEditorExpand(w.id)}
      onToggleResultExpand={() => toggleResultExpand(w.id)}
      onCodeChange={(code) => updateCode(w.id, code)}
      onFilenameChange={(filename) => updateFilename(w.id, filename)}
      onDropReport={reportDrop}
      {templates}
      onSaveTemplate={handleSaveTemplate}
      onDeleteTemplate={handleDeleteTemplate}
    />
  {/each}
  <button
    type="button"
    class="add-widget"
    data-drag-over={addDragDepth > 0}
    onclick={addWidget}
    ondragenter={onAddDragEnter}
    ondragleave={onAddDragLeave}
    ondragover={onAddDragOver}
    ondrop={onAddDrop}
    aria-label="Add widget"
  >+</button>
</div>

<style>
  /* Ticket 03 (FEAT-LUA-FILE-DROP): full-width bar under the branding header, above the grid.
     FIX-EDITOR-DROP-HEIGHT: sticky + accent stripe so it is not missed against a widget whose
     editor just changed, and stays put if the page ever scrolls. */
  .drop-message {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    font-size: 13px;
  }

  .drop-message span {
    flex: 1;
  }

  .drop-message button {
    line-height: 1;
    padding: 2px 8px;
  }

  /* Ticket 04: a file is being dragged over the add button - dropping here makes new widgets. */
  .add-widget[data-drag-over='true'] {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    border-style: solid;
  }
</style>
