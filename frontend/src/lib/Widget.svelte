<script lang="ts">
  import { untrack } from 'svelte';
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import { InjectionRunner, type Activity, type LastRun } from './injectionRunner';

  interface Props {
    initialCode?: string;
  }
  let { initialCode = '' }: Props = $props();

  // Seeded once from the prop, then independently editable - not a live mirror of it.
  let code = $state(untrack(() => initialCode));
  let activity = $state<Activity>('idle');
  let lastRun = $state<LastRun | null>(null);

  const runner = new InjectionRunner({
    onActivityChange: (next) => (activity = next),
    onResult: (next) => (lastRun = next),
  });

  function handleChange(value: string): void {
    code = value;
  }

  function send(): void {
    runner.run(code);
  }

  function stop(): void {
    runner.stop();
  }

  function formatElapsed(ms: number): string {
    return `${(ms / 1000).toFixed(2)}s`;
  }
</script>

<div class="widget">
  <div class="widget-header">
    <span
      class="activity-indicator"
      data-activity={activity}
      aria-label={activity === 'running' ? 'running' : 'idle'}
    ></span>
    <button type="button" onclick={send} disabled={activity === 'running'}>Send</button>
    <button type="button" onclick={stop} disabled={activity !== 'running'}>Stop</button>
  </div>

  <CodeMirrorEditor initialValue={initialCode} onChange={handleChange} onInjectRequest={send} />

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
  }

  .widget-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
  }

  .activity-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--border);
  }
  .activity-indicator[data-activity='running'] {
    background: var(--accent);
  }

  .widget-result {
    border-top: 1px solid var(--border);
    padding: 6px 8px;
    font-family: var(--mono);
    font-size: 13px;
    overflow: auto;
    max-height: 8em;
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
