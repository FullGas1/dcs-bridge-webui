import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkConnection, deleteTemplate, injectScript, listTemplates, saveTemplate, setApiKey,
} from './api';

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

describe('template API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listTemplates GETs /api/templates', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => [{ id: '1', name: 'a', code: 'return 1' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const templates = await listTemplates();

    expect(fetchMock).toHaveBeenCalledWith('/api/templates');
    expect(templates).toEqual([{ id: '1', name: 'a', code: 'return 1' }]);
  });

  it('saveTemplate POSTs the name and code, returning the updated list', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => [{ id: '1', name: 'a', code: 'return 1' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const templates = await saveTemplate('a', 'return 1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/templates');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ name: 'a', code: 'return 1' });
    expect(templates).toEqual([{ id: '1', name: 'a', code: 'return 1' }]);
  });

  it('deleteTemplate DELETEs /api/templates/:id, returning the updated list', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    const templates = await deleteTemplate('abc 123');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/templates/abc%20123');
    expect(init.method).toBe('DELETE');
    expect(templates).toEqual([]);
  });

  it('throws when the backend rejects a template save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    await expect(saveTemplate('', 'x')).rejects.toThrow(/400/);
  });
});

describe('connection API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('checkConnection GETs /api/connection/status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ connected: true, message: null }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const status = await checkConnection();

    expect(fetchMock).toHaveBeenCalledWith('/api/connection/status');
    expect(status).toEqual({ connected: true, message: null });
  });

  it('setApiKey PUTs the key to /api/connection', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await setApiKey('secret123');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/connection');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ api_key: 'secret123' });
  });

  it('setApiKey throws when the backend rejects the update', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(setApiKey('x')).rejects.toThrow(/500/);
  });
});
