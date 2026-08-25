<script lang="ts">
  import { untrack } from 'svelte';
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import TemplateDropdown from './TemplateDropdown.svelte';
  import type { Template } from './api';
  import type { InjectionQueue, Activity, LastRun, JobHandle } from './injectionQueue';

  interface Props {
    number: number;
    queue: InjectionQueue;
    expanded: boolean;
    onClose: () => void;
    onToggleExpand: () => void;
    initialCode?: string;
    onCodeChange?: (code: string) => void;
    templates: Template[];
    onSaveTemplate: (name: string, code: string) => void;
    onDeleteTemplate: (id: string) => void;
  }
  let {
    number, queue, expanded, onClose, onToggleExpand, initialCode = '', onCodeChange,
    templates, onSaveTemplate, onDeleteTemplate,
  }: Props = $props();

  // Seeded once from the prop, then independently editable - not a live mirror of it.
  let code = $state(untrack(() => initialCode));
  let activity = $state<Activity>('idle');
  let lastRun = $state<LastRun | null>(null);
  let jobHandle: JobHandle | null = null;
  let editor: CodeMirrorEditor;

  // In-page naming dialog for Memorize, rather than window.prompt(): the latter throws
  // "prompt() is not supported" in some embedded/automated browser contexts (observed live).
  let namingTemplate = $state(false);
  let pendingTemplateName = $state('');
  let nameInput: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (namingTemplate) nameInput?.focus();
  });

  function handleChange(value: string): void {
    code = value;
    onCodeChange?.(value);
  }

  function memorize(): void {
    pendingTemplateName = '';
    namingTemplate = true;
  }

  function confirmMemorize(): void {
    const name = pendingTemplateName.trim();
    namingTemplate = false;
    if (!name) return;
    onSaveTemplate(name, code);
  }

  function cancelMemorize(): void {
    namingTemplate = false;
  }

  function loadTemplate(template: Template): void {
    editor.setValue(template.code);
    code = template.code;
    onCodeChange?.(template.code);
    editor.focus();
  }

  function send(): void {
    if (activity !== 'idle') return;
    jobHandle = queue.submit(code, {
      onActivityChange: (next) => (activity = next),
      onResult: (next) => (lastRun = next),
    });
  }

  function stop(): void {
    jobHandle?.cancel();
  }

  function close(): void {
    jobHandle?.cancel();
    onClose();
  }

  function formatElapsed(ms: number): string {
    return `${(ms / 1000).toFixed(2)}s`;
  }
</script>

<div class="widget" data-expanded={expanded}>
  <div class="widget-header">
    <span class="widget-number">Widget {number}</span>
    <span
      class="activity-indicator"
      data-activity={activity}
      aria-label={activity === 'idle' ? 'idle' : activity}
    ></span>
    <button type="button" onclick={send} disabled={activity !== 'idle'}>Send</button>
    <button type="button" onclick={stop} disabled={activity === 'idle'}>Stop</button>
    <button type="button" onclick={onToggleExpand}>{expanded ? 'Collapse' : 'Expand'}</button>
    <button type="button" onclick={memorize}>Memorize</button>
    <TemplateDropdown {templates} onSelect={loadTemplate} onDelete={onDeleteTemplate} />
    <button type="button" class="close-btn" onclick={close} aria-label="Close widget">&times;</button>
  </div>

  <div class="widget-editor">
    <CodeMirrorEditor
      bind:this={editor}
      initialValue={initialCode}
      onChange={handleChange}
      onInjectRequest={send}
    />
  </div>

  <div class="widget-result">
    {#if lastRun}
      <div class="status-line" data-status={lastRun.status}>
        {lastRun.status} &mdash; {formatElapsed(lastRun.elapsedMs)}
      </div>
      <pre class="result-body">{lastRun.body ?? ''}</pre>
    {:else}
      <div class="status-line" data-status="idle">idle</div>
    {/if}
  </div>

  {#if namingTemplate}
    <div
      class="naming-backdrop"
      role="presentation"
      onclick={(e) => {
        if (e.target === e.currentTarget) cancelMemorize();
      }}
    >
      <form
        class="naming-dialog"
        onsubmit={(e) => {
          e.preventDefault();
          confirmMemorize();
        }}
      >
        <label for={`template-name-${number}`}>Name this template</label>
        <input
          id={`template-name-${number}`}
          type="text"
          bind:value={pendingTemplateName}
          bind:this={nameInput}
        />
        <div class="naming-actions">
          <button type="button" onclick={cancelMemorize}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  .widget {
    border: 1px solid var(--border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
    /* A real height (not just min-height) so widget-editor's flex:1 actually caps the
       CodeMirror area - otherwise it has no ceiling to distribute against and just grows to
       fit the whole script instead of scrolling internally. ~30 lines by default. */
    height: 640px;
  }

  .widget[data-expanded='true'] {
    /* No height cap at all: Expand means "show the *whole* script", however many lines that
       is - not a bigger-but-still-bounded box (a fixed/vh-based height only ever showed a
       larger fixed slice, e.g. 1400px capped a 300-line script to ~58 visible lines, still
       short of "the whole script" - reported live). With no height here, widget-editor's
       flex:1 has nothing to distribute against and CodeMirror renders at its full natural
       size instead of scrolling internally; the grid (ticket 03) scrolls the page for
       whatever doesn't fit the viewport. */
    height: auto;
  }

  .widget-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
  }

  .widget-number {
    font-size: 13px;
    opacity: 0.7;
    margin-right: auto;
  }

  .activity-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--border);
    flex: none;
  }
  .activity-indicator[data-activity='running'] {
    background: var(--accent);
  }
  .activity-indicator[data-activity='queued'] {
    background: #d4a017;
  }

  .close-btn {
    line-height: 1;
    padding: 4px 8px;
  }

  .widget-editor {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .widget-result {
    border-top: 1px solid var(--border);
    padding: 6px 8px;
    font-family: var(--mono);
    font-size: 13px;
    overflow: auto;
    max-height: 8em;
    flex: none;
  }

  .status-line[data-status='success'] {
    color: #2e7d32;
  }
  .status-line[data-status='error'],
  .status-line[data-status='timeout'] {
    color: #c62828;
  }

  .result-body {
    margin: 4px 0 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .naming-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .naming-dialog {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 20em;
  }

  .naming-dialog input {
    font: inherit;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text-h);
  }

  .naming-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
