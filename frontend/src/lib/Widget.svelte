<script lang="ts">
  import { untrack } from 'svelte';
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import ExpandToggle from './ExpandToggle.svelte';
  import TemplateDropdown from './TemplateDropdown.svelte';
  import { MAX_COLLAPSED_LINES } from './layoutConstants';
  import type { Template } from './api';
  import type { InjectionQueue, Activity, LastRun, JobHandle } from './injectionQueue';

  interface Props {
    number: number;
    queue: InjectionQueue;
    editorExpanded: boolean;
    resultExpanded: boolean;
    onClose: () => void;
    onToggleEditorExpand: () => void;
    onToggleResultExpand: () => void;
    initialCode?: string;
    onCodeChange?: (code: string) => void;
    templates: Template[];
    onSaveTemplate: (name: string, code: string) => void;
    onDeleteTemplate: (id: string) => void;
  }
  let {
    number, queue, editorExpanded, resultExpanded, onClose, onToggleEditorExpand,
    onToggleResultExpand, initialCode = '', onCodeChange, templates, onSaveTemplate,
    onDeleteTemplate,
  }: Props = $props();

  // Seeded once from the prop, then independently editable - not a live mirror of it.
  let code = $state(untrack(() => initialCode));
  let activity = $state<Activity>('idle');
  let lastRun = $state<LastRun | null>(null);
  let jobHandle: JobHandle | null = null;
  let editor: CodeMirrorEditor;

  // Ticket 02 (FEAT-ADAPTIVE-LAYOUT-AND-ZOOM): collapsed-height in px for each area, or null to
  // let CSS size it naturally to its own content (the common case, under MAX_COLLAPSED_LINES).
  // Only applied while that area is collapsed - see the markup below.
  let editorHeightPx = $state<number | null>(null);
  let resultHeightPx = $state<number | null>(null);
  let resultContainerEl: HTMLDivElement | undefined = $state();
  let resultBodyEl: HTMLPreElement | undefined = $state();

  $effect(() => {
    const body = lastRun?.body;
    if (body == null || !resultBodyEl || !resultContainerEl) {
      resultHeightPx = null;
      return;
    }
    const lineCount = body.split('\n').length;
    if (lineCount <= MAX_COLLAPSED_LINES) {
      // Natural sizing - no chrome/padding arithmetic needed or to get wrong (the status line,
      // the container's own padding, and the result body's margin all live outside the <pre>
      // and would otherwise have to be accounted for by hand).
      resultHeightPx = null;
      return;
    }
    // At/over the cap: derive the same chrome overhead from a real measurement of the *whole*
    // result container, the same way the editor's own over-cap branch does - stays correct at
    // any zoom level (ticket 03) since it's a live DOM measurement, not a hardcoded constant.
    const lineHeight = parseFloat(getComputedStyle(resultBodyEl).lineHeight) || 16;
    const chrome = resultContainerEl.scrollHeight - lineCount * lineHeight;
    resultHeightPx = MAX_COLLAPSED_LINES * lineHeight + chrome;
  });

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

<div class="widget" data-any-expanded={editorExpanded || resultExpanded}>
  <div class="widget-header">
    <span class="widget-number">Widget {number}</span>
    <span
      class="activity-indicator"
      data-activity={activity}
      aria-label={activity === 'idle' ? 'idle' : activity}
    ></span>
    <button type="button" onclick={send} disabled={activity !== 'idle'}>Send</button>
    <button type="button" onclick={stop} disabled={activity === 'idle'}>Stop</button>
    <ExpandToggle expanded={editorExpanded} onToggle={onToggleEditorExpand} area="Editor" />
    <ExpandToggle expanded={resultExpanded} onToggle={onToggleResultExpand} area="Result" />
    <button type="button" onclick={memorize}>Memorize</button>
    <TemplateDropdown {templates} onSelect={loadTemplate} onDelete={onDeleteTemplate} />
    <button type="button" class="close-btn" onclick={close} aria-label="Close widget">&times;</button>
  </div>

  <div
    class="widget-editor"
    data-expanded={editorExpanded}
    style={!editorExpanded && editorHeightPx !== null
      ? `flex: none; height: ${editorHeightPx}px;`
      : ''}
  >
    <CodeMirrorEditor
      bind:this={editor}
      initialValue={initialCode}
      onChange={handleChange}
      onInjectRequest={send}
      onHeightChange={(h) => (editorHeightPx = h)}
    />
  </div>

  <div
    class="widget-result"
    data-expanded={resultExpanded}
    bind:this={resultContainerEl}
    style={!resultExpanded && resultHeightPx !== null ? `height: ${resultHeightPx}px;` : ''}
  >
    {#if lastRun}
      <div class="status-line" data-status={lastRun.status}>
        {lastRun.status} &mdash; {formatElapsed(lastRun.elapsedMs)}
      </div>
      <pre class="result-body" bind:this={resultBodyEl}>{lastRun.body ?? ''}</pre>
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
    /* No explicit height (ticket 02, FEAT-ADAPTIVE-LAYOUT-AND-ZOOM): the widget's total height
       is just the natural sum of the editor's and the result's own heights, each independently
       capped/dynamic (see .widget-editor / .widget-result below) or unbounded while expanded
       (ticket 01) - nothing left for this container itself to constrain. */
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
    /* Collapsed height is set inline in px (ticket 02: min(lineCount, 30) x
       view.defaultLineHeight) once CodeMirror has measured it - flex:1/min-height:0 here are
       just the fallback for the brief window before that first measurement lands. */
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .widget-editor[data-expanded='true'] {
    /* Ticket 01: this area alone grows to its full natural size, overriding any inline
       collapsed-height style set above (the markup only applies that style while collapsed). */
    flex: none;
    height: auto;
    overflow: visible;
  }

  .widget-result {
    /* Collapsed height is set inline in px (ticket 02, same formula/threshold as the editor)
       once a result exists to measure - see the effect in the script block. */
    border-top: 1px solid var(--border);
    padding: 6px 8px;
    font-family: var(--mono);
    /* Ticket 03: base 13px (today's default, unchanged at 100%) scaled by the same page-wide
       zoom factor the editor uses (ZoomControl.svelte / app.css). */
    font-size: calc(13px * var(--zoom-factor));
    overflow: auto;
    flex: none;
  }

  .widget-result[data-expanded='true'] {
    /* Ticket 01: independent of the editor's own expand state - see the module docstring. */
    height: auto;
    overflow: visible;
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
