<script lang="ts">
  import { untrack } from 'svelte';
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import type { InjectionQueue, Activity, LastRun, JobHandle } from './injectionQueue';

  interface Props {
    number: number;
    queue: InjectionQueue;
    expanded: boolean;
    onClose: () => void;
    onToggleExpand: () => void;
    initialCode?: string;
  }
  let { number, queue, expanded, onClose, onToggleExpand, initialCode = '' }: Props = $props();

  // Seeded once from the prop, then independently editable - not a live mirror of it.
  let code = $state(untrack(() => initialCode));
  let activity = $state<Activity>('idle');
  let lastRun = $state<LastRun | null>(null);
  let jobHandle: JobHandle | null = null;

  function handleChange(value: string): void {
    code = value;
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
    <button type="button" class="close-btn" onclick={close} aria-label="Close widget">&times;</button>
  </div>

  <div class="widget-editor">
    <CodeMirrorEditor initialValue={initialCode} onChange={handleChange} onInjectRequest={send} />
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
</div>

<style>
  .widget {
    border: 1px solid var(--border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
    min-height: 0;
  }

  .widget[data-expanded='true'] {
    grid-column: span 2;
    grid-row: span 2;
  }

  .widget-header {
    display: flex;
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
</style>
