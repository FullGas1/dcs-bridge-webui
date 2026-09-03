// FEAT-SAVE-WIDGET-FILE: writing a widget's script to a `.lua` file. Thin wrappers over the
// File System Access API (and a download fallback) so components don't touch the raw APIs and
// this stays mockable in tests.

/** True when the browser can open a native save picker (Chromium; not Firefox). */
export function fsAccessAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

/**
 * The file name to pre-fill a "Save as…" with: the widget's remembered name (adding `.lua` if it
 * has no extension), or `widget-{n}.lua` when it has none.
 */
export function suggestedFileName(remembered: string | null, widgetNumber: number): string {
  const name = remembered?.trim();
  if (!name) return `widget-${widgetNumber}.lua`;
  return /\.[^.]+$/.test(name) ? name : `${name}.lua`;
}

const LUA_PICKER_TYPES = [
  { description: 'Lua script', accept: { 'text/plain': ['.lua'] } },
];

export type SaveAsResult =
  | { kind: 'picked'; handle: FileSystemFileHandle; name: string }
  | { kind: 'downloaded'; name: string }
  | { kind: 'cancelled' };

/**
 * Writes `text` to a file the user chooses. Uses the native save picker where available (and
 * hands back its handle so a later "Save" can overwrite it directly); otherwise triggers a plain
 * download.
 */
export async function saveTextAs(text: string, name: string): Promise<SaveAsResult> {
  if (fsAccessAvailable()) {
    let handle: FileSystemFileHandle;
    try {
      handle = await window.showSaveFilePicker!({ suggestedName: name, types: LUA_PICKER_TYPES });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return { kind: 'cancelled' };
      throw err;
    }
    await overwrite(handle, text);
    return { kind: 'picked', handle, name: handle.name };
  }

  downloadText(text, name);
  return { kind: 'downloaded', name };
}

/** Writes `text` straight to `handle` - the "Save" path, no dialog. */
export async function overwrite(handle: FileSystemFileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

function downloadText(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
