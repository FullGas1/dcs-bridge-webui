import { afterEach, describe, expect, it, vi } from 'vitest';
import { overwrite, saveTextAs, suggestedFileName } from './widgetSave';

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
});

function fakeHandle(name = 'chosen.lua') {
  const chunks: string[] = [];
  const writable = { write: vi.fn((t: string) => void chunks.push(t)), close: vi.fn() };
  return {
    handle: { name, createWritable: vi.fn().mockResolvedValue(writable) } as unknown as FileSystemFileHandle,
    writable,
    written: () => chunks.join(''),
  };
}

describe('suggestedFileName', () => {
  it('keeps a remembered name that already has an extension', () => {
    expect(suggestedFileName('patrol_check.lua', 3)).toBe('patrol_check.lua');
  });

  it('appends .lua to a remembered name without an extension (a template name)', () => {
    expect(suggestedFileName('patrol check', 3)).toBe('patrol check.lua');
  });

  it('falls back to widget-{n}.lua when nothing is remembered', () => {
    expect(suggestedFileName(null, 4)).toBe('widget-4.lua');
    expect(suggestedFileName('   ', 4)).toBe('widget-4.lua');
  });
});

describe('saveTextAs', () => {
  it('uses the native picker when available and writes the text, returning the handle', async () => {
    const f = fakeHandle('renamed.lua');
    (window as { showSaveFilePicker?: unknown }).showSaveFilePicker = vi.fn().mockResolvedValue(f.handle);

    const result = await saveTextAs('return 1', 'suggested.lua');

    expect(window.showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: 'suggested.lua' }),
    );
    expect(f.written()).toBe('return 1');
    expect(f.writable.close).toHaveBeenCalled();
    expect(result).toEqual({ kind: 'picked', handle: f.handle, name: 'renamed.lua' });
  });

  it('returns cancelled and writes nothing when the picker is dismissed', async () => {
    (window as { showSaveFilePicker?: unknown }).showSaveFilePicker = vi
      .fn()
      .mockRejectedValue(new DOMException('cancelled', 'AbortError'));

    expect(await saveTextAs('return 1', 'x.lua')).toEqual({ kind: 'cancelled' });
  });

  it('falls back to a download when the picker is unavailable', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const result = await saveTextAs('return 2', 'download-me.lua');

    expect(createUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(result).toEqual({ kind: 'downloaded', name: 'download-me.lua' });
  });
});

describe('overwrite', () => {
  it('writes the text then closes', async () => {
    const f = fakeHandle();

    await overwrite(f.handle, 'return 3');

    expect(f.written()).toBe('return 3');
    expect(f.writable.close).toHaveBeenCalled();
  });
});
