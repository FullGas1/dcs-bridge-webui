import { afterEach, describe, expect, it, vi } from 'vitest';
import { injectScript } from './api';

describe('injectScript', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs the code to /api/inject and returns the parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true, result: '42', error_type: null, message: null, status_code: null,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await injectScript('return 42', new AbortController().signal);

    expect(result.result).toBe('42');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/inject');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ code: 'return 42' });
  });

  it('throws when the backend itself returns a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));

    await expect(injectScript('return 1', new AbortController().signal)).rejects.toThrow(/500/);
  });

  it('forwards the abort signal to fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: '', error_type: null, message: null, status_code: null }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await injectScript('return 1', controller.signal);

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
});
