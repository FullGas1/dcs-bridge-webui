import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InjectionRunner } from './injectionRunner';
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

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('InjectionRunner', () => {
  let onActivityChange: ReturnType<typeof vi.fn>;
  let onResult: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    injectScriptMock.mockReset();
    onActivityChange = vi.fn();
    onResult = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('switches to running immediately when run() is called', () => {
    injectScriptMock.mockImplementation(neverResolves);
    const runner = new InjectionRunner({ onActivityChange, onResult });

    runner.run('return 1');

    expect(runner.isRunning).toBe(true);
    expect(onActivityChange).toHaveBeenCalledWith('running');
  });

  it('ignores a second run() while one is already in flight', () => {
    injectScriptMock.mockImplementation(neverResolves);
    const runner = new InjectionRunner({ onActivityChange, onResult });

    runner.run('return 1');
    runner.run('return 2');

    expect(injectScriptMock).toHaveBeenCalledTimes(1);
  });

  it('reports success and returns to idle when the backend resolves ok', async () => {
    injectScriptMock.mockResolvedValue({
      ok: true, result: '42', error_type: null, message: null, status_code: null,
    });
    const runner = new InjectionRunner({ onActivityChange, onResult });

    runner.run('return 42');
    await flush();

    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', body: '42', elapsedMs: expect.any(Number) }),
    );
    expect(onActivityChange).toHaveBeenLastCalledWith('idle');
    expect(runner.isRunning).toBe(false);
  });

  it('reports error (distinct from success) when the backend resolves ok:false', async () => {
    injectScriptMock.mockResolvedValue({
      ok: false, result: null, error_type: 'connection_error', message: 'refused', status_code: null,
    });
    const runner = new InjectionRunner({ onActivityChange, onResult });

    runner.run('return 1');
    await flush();

    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', body: 'refused' }),
    );
  });

  it('returns to idle without reporting a result when stopped by the user', async () => {
    injectScriptMock.mockImplementation(abortableHang);
    const runner = new InjectionRunner({ onActivityChange, onResult });

    runner.run('return 1');
    runner.stop();
    await flush();

    expect(onResult).not.toHaveBeenCalled();
    expect(onActivityChange).toHaveBeenLastCalledWith('idle');
    expect(runner.isRunning).toBe(false);
  });

  it('ignores stop() when nothing is running', () => {
    const runner = new InjectionRunner({ onActivityChange, onResult });

    runner.stop();

    expect(onActivityChange).not.toHaveBeenCalled();
  });

  it('marks the run as timed out and returns to idle after the configured delay', async () => {
    vi.useFakeTimers();
    injectScriptMock.mockImplementation(abortableHang);
    const runner = new InjectionRunner({ onActivityChange, onResult }, 30_000);

    runner.run('return 1');
    await vi.advanceTimersByTimeAsync(30_000);

    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'timeout', body: null }),
    );
    expect(onActivityChange).toHaveBeenLastCalledWith('idle');
  });

  it('does not time out a run that already resolved', async () => {
    vi.useFakeTimers();
    injectScriptMock.mockResolvedValue({
      ok: true, result: 'done', error_type: null, message: null, status_code: null,
    });
    const runner = new InjectionRunner({ onActivityChange, onResult }, 30_000);

    runner.run('return 1');
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });
});
