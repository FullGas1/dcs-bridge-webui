import { injectScript } from './api';

export type Activity = 'idle' | 'running';
export type RunStatus = 'success' | 'error' | 'timeout';

export interface LastRun {
  status: RunStatus;
  elapsedMs: number;
  body: string | null;
}

export interface RunnerCallbacks {
  onActivityChange: (activity: Activity) => void;
  onResult: (lastRun: LastRun) => void;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Drives a single widget's injection lifecycle (run/stop/timeout), independent of any UI
 * framework so it can be unit-tested without mounting CodeMirror/Svelte. A run that is stopped
 * by the user returns to idle silently (no onResult call) - only a genuine response or a timeout
 * produces a result.
 */
export class InjectionRunner {
  private abortController: AbortController | null = null;
  private stopReason: 'user' | 'timeout' | null = null;

  constructor(
    private readonly callbacks: RunnerCallbacks,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  get isRunning(): boolean {
    return this.abortController !== null;
  }

  run(code: string): void {
    if (this.isRunning) return;

    const controller = new AbortController();
    this.abortController = controller;
    this.stopReason = null;
    this.callbacks.onActivityChange('running');
    const startedAt = performance.now();

    const timeoutHandle = setTimeout(() => {
      this.stopReason = 'timeout';
      controller.abort();
    }, this.timeoutMs);

    injectScript(code, controller.signal)
      .then((res) => {
        this.callbacks.onResult({
          status: res.ok ? 'success' : 'error',
          elapsedMs: performance.now() - startedAt,
          body: res.ok ? res.result : (res.message ?? res.result),
        });
      })
      .catch(() => {
        if (this.stopReason === 'timeout') {
          this.callbacks.onResult({
            status: 'timeout',
            elapsedMs: performance.now() - startedAt,
            body: null,
          });
        }
        // stopReason === 'user': a deliberate cancellation, not a result worth reporting.
      })
      .finally(() => {
        clearTimeout(timeoutHandle);
        this.abortController = null;
        this.callbacks.onActivityChange('idle');
      });
  }

  stop(): void {
    if (!this.abortController) return;
    this.stopReason = 'user';
    this.abortController.abort();
  }
}
