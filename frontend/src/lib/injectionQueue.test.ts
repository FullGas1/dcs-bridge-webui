import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InjectionQueue } from './injectionQueue';
import { injectScript } from './api';

vi.mock('./api', () => ({
  injectScript: vi.fn(),
}));

const injectScriptMock = vi.mocked(injectScript);

function neverResolves(): Promise<never> {
  return new Promise(() => {});
}

function abortableHang(_code: string, signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });
}

function ok(result: string) {
  return { ok: true, result, error_type: null, message: null, status_code: null } as const;
}

function connectionErr(message: string) {
  return {
    ok: false, result: null, error_type: 'connection_error', message, status_code: null,
  } as const;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function callbacks() {
  return { onActivityChange: vi.fn(), onResult: vi.fn() };
}

describe('InjectionQueue', () => {
  beforeEach(() => {
    injectScriptMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a single submitted job running immediately', () => {
    injectScriptMock.mockImplementation(neverResolves);
    const queue = new InjectionQueue();
    const a = callbacks();

    queue.submit('return 1', a);

    expect(a.onActivityChange).toHaveBeenCalledWith('running');
    expect(injectScriptMock).toHaveBeenCalledTimes(1);
  });

  it('queues a second job while the first is still running, distinctly from running', () => {
    injectScriptMock.mockImplementation(neverResolves);
    const queue = new InjectionQueue();
    const a = callbacks();
    const b = callbacks();

    queue.submit('return 1', a);
    queue.submit('return 2', b);

    expect(a.onActivityChange).toHaveBeenLastCalledWith('running');
    expect(b.onActivityChange).toHaveBeenLastCalledWith('queued');
    expect(injectScriptMock).toHaveBeenCalledTimes(1);
  });

  it('starts the queued job once the running one completes, in submission order', async () => {
    injectScriptMock.mockResolvedValueOnce(ok('first')).mockImplementationOnce(neverResolves);
    const queue = new InjectionQueue();
    const a = callbacks();
    const b = callbacks();

    queue.submit('return 1', a);
    queue.submit('return 2', b);
    await flush();

    expect(a.onResult).toHaveBeenCalledWith(expect.objectContaining({ status: 'success', body: 'first' }));
    expect(a.onActivityChange).toHaveBeenLastCalledWith('idle');
    expect(b.onActivityChange).toHaveBeenLastCalledWith('running');
    expect(injectScriptMock).toHaveBeenCalledTimes(2);
  });

  it('removes a queued (not yet started) job on cancel, without touching the running one', async () => {
    injectScriptMock.mockImplementation(neverResolves);
    const queue = new InjectionQueue();
    const a = callbacks();
    const b = callbacks();

    queue.submit('return 1', a);
    const bHandle = queue.submit('return 2', b);
    bHandle.cancel();

    expect(b.onActivityChange).toHaveBeenLastCalledWith('idle');
    expect(b.onResult).not.toHaveBeenCalled();
    expect(a.onActivityChange).toHaveBeenLastCalledWith('running');
    expect(injectScriptMock).toHaveBeenCalledTimes(1); // b never actually started
  });

  it('advances to the next queued job when the running job is cancelled', async () => {
    injectScriptMock.mockImplementation(abortableHang);
    const queue = new InjectionQueue();
    const a = callbacks();
    const b = callbacks();

    const aHandle = queue.submit('return 1', a);
    queue.submit('return 2', b);
    aHandle.cancel();
    await flush();

    expect(a.onResult).not.toHaveBeenCalled();
    expect(a.onActivityChange).toHaveBeenLastCalledWith('idle');
    expect(b.onActivityChange).toHaveBeenLastCalledWith('running');
  });

  it('advances to the next queued job when the running job times out', async () => {
    vi.useFakeTimers();
    injectScriptMock.mockImplementation(abortableHang);
    const queue = new InjectionQueue(30_000);
    const a = callbacks();
    const b = callbacks();

    queue.submit('return 1', a);
    queue.submit('return 2', b);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(a.onResult).toHaveBeenCalledWith(expect.objectContaining({ status: 'timeout' }));
    expect(b.onActivityChange).toHaveBeenLastCalledWith('running');
  });

  it('cancelling the currently-running job (not a queued one) aborts it via the abort signal', () => {
    let signalSeen: AbortSignal | undefined;
    injectScriptMock.mockImplementation((_code: string, signal: AbortSignal) => {
      signalSeen = signal;
      return abortableHang(_code, signal);
    });
    const queue = new InjectionQueue();
    const a = callbacks();

    const handle = queue.submit('return 1', a);
    handle.cancel();

    expect(signalSeen?.aborted).toBe(true);
  });

  it('notifies every subscriber of a settled result, in addition to the job callback', async () => {
    injectScriptMock.mockResolvedValue(ok('42'));
    const queue = new InjectionQueue();
    const listener = vi.fn();
    queue.subscribe(listener);

    queue.submit('return 42', callbacks());
    await flush();

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: 'success', body: '42' }));
  });

  it('preserves the backend error_type for subscribers to distinguish a connection failure', async () => {
    injectScriptMock.mockResolvedValue(connectionErr('refused'));
    const queue = new InjectionQueue();
    const listener = vi.fn();
    queue.subscribe(listener);

    queue.submit('return 1', callbacks());
    await flush();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', errorType: 'connection_error' }),
    );
  });

  it('stops notifying a subscriber after it unsubscribes', async () => {
    injectScriptMock.mockResolvedValue(ok('42'));
    const queue = new InjectionQueue();
    const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);
    unsubscribe();

    queue.submit('return 42', callbacks());
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });
});
