import { injectScript, type InjectResult } from './api';

export type Activity = 'idle' | 'queued' | 'running';
export type RunStatus = 'success' | 'error' | 'timeout';

export interface LastRun {
  status: RunStatus;
  elapsedMs: number;
  body: string | null;
  /** null for a locally-detected timeout (never got a backend response to classify). */
  errorType: InjectResult['error_type'] | null;
}

export interface JobCallbacks {
  onActivityChange: (activity: Activity) => void;
  onResult: (lastRun: LastRun) => void;
}

export type ResultListener = (result: LastRun) => void;

export interface JobHandle {
  /** Removes a still-queued job, or aborts it if it's the one currently running. No-op once settled. */
  cancel: () => void;
}

const DEFAULT_TIMEOUT_MS = 30_000;

interface Job extends JobCallbacks {
  code: string;
  abortController: AbortController;
  stopReason: 'user' | 'timeout' | null;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  settled: boolean;
}

/**
 * A single global FIFO across every widget: only one call to dcs-serve is ever in flight,
 * so two scripts injected close together can't race each other inside the same DCS mission
 * (ticket 03). Framework-free so it unit-tests without mounting any component.
 */
export class InjectionQueue {
  private pending: Job[] = [];
  private current: Job | null = null;
  private listeners = new Set<ResultListener>();

  constructor(private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS) {}

  /** Observes every settled result across every widget (ticket 06: detecting dcs-serve going
   * unreachable mid-session doesn't depend on which widget happened to trigger the call). */
  subscribe(listener: ResultListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  submit(code: string, callbacks: JobCallbacks): JobHandle {
    const job: Job = {
      code,
      ...callbacks,
      abortController: new AbortController(),
      stopReason: null,
      timeoutHandle: null,
      settled: false,
    };

    if (this.current === null) {
      this.start(job);
    } else {
      this.pending.push(job);
      job.onActivityChange('queued');
    }

    return { cancel: () => this.cancel(job) };
  }

  private cancel(job: Job): void {
    if (job.settled) return;

    if (this.current === job) {
      job.stopReason = 'user';
      job.abortController.abort();
      return;
    }

    const index = this.pending.indexOf(job);
    if (index !== -1) {
      this.pending.splice(index, 1);
      job.settled = true;
      job.onActivityChange('idle');
    }
  }

  private start(job: Job): void {
    this.current = job;
    job.onActivityChange('running');
    const startedAt = performance.now();

    job.timeoutHandle = setTimeout(() => {
      job.stopReason = 'timeout';
      job.abortController.abort();
    }, this.timeoutMs);

    injectScript(job.code, job.abortController.signal)
      .then((res) => {
        this.settle(job, {
          status: res.ok ? 'success' : 'error',
          elapsedMs: performance.now() - startedAt,
          body: res.ok ? res.result : (res.message ?? res.result),
          errorType: res.ok ? null : res.error_type,
        });
      })
      .catch(() => {
        if (job.stopReason === 'timeout') {
          this.settle(job, {
            status: 'timeout',
            elapsedMs: performance.now() - startedAt,
            body: null,
            errorType: null,
          });
        }
        // stopReason === 'user': a deliberate cancellation, not a result worth reporting.
      })
      .finally(() => {
        if (job.timeoutHandle) clearTimeout(job.timeoutHandle);
        job.settled = true;
        job.onActivityChange('idle');
        this.current = null;
        this.advance();
      });
  }

  private settle(job: Job, result: LastRun): void {
    job.onResult(result);
    for (const listener of this.listeners) listener(result);
  }

  private advance(): void {
    const next = this.pending.shift();
    if (next) this.start(next);
  }
}
