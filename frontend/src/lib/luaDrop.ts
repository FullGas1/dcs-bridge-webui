// Validation for a `.lua` file dragged onto the page (FEAT-LUA-FILE-DROP, ticket 01). Pure and
// DOM-free: it takes a `File` and returns either the script text or a rejection reason, so the
// widget / grid drop handlers stay thin and this logic is unit-testable in isolation. The
// multi-file partition and the aggregated message live in later tickets and build on this.

/** Hardcoded for now — made configurable by the future app-settings-panel lot (see roadmap). */
export const MAX_LUA_FILE_BYTES = 512 * 1024;

export type LuaDropRejection = 'not-lua' | 'too-large';

/**
 * True when a drag carries OS files (as opposed to, say, a text selection dragged inside an
 * editor). Used to scope both the drop handlers and, later, the drag-over highlight.
 */
export function dragHasFiles(event: DragEvent): boolean {
  return !!event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files');
}

export type DroppedLuaFile =
  | { ok: true; name: string; text: string }
  | { ok: false; name: string; reason: LuaDropRejection };

/**
 * Accepts `file` iff its name ends in `.lua` (case-insensitive) and it is at most
 * MAX_LUA_FILE_BYTES. On acceptance, returns its text with a single leading UTF-8 BOM removed
 * (Lua 5.1, which DCS runs, does not skip a BOM). The extension and size checks happen before the
 * file is ever read.
 */
export async function readDroppedLuaFile(file: File): Promise<DroppedLuaFile> {
  if (!/\.lua$/i.test(file.name)) {
    return { ok: false, name: file.name, reason: 'not-lua' };
  }
  if (file.size > MAX_LUA_FILE_BYTES) {
    return { ok: false, name: file.name, reason: 'too-large' };
  }
  const raw = await file.text();
  return { ok: true, name: file.name, text: raw.replace(/^\uFEFF/, '') };
}

const REJECTION_LABEL: Record<LuaDropRejection, string> = {
  'not-lua': 'not a .lua file',
  'too-large': 'over 512 KB',
};

/**
 * One aggregated line summarising a drop, or null when there is nothing worth saying \u2014 a clean
 * drop of a single file, since the editor visibly changing is feedback enough. A multi-file load
 * or any rejection produces a message: `2 files loaded \u00B7 1 ignored (not a .lua file)`.
 */
export function formatDropMessage(results: DroppedLuaFile[]): string | null {
  const loaded = results.filter((r) => r.ok).length;
  const rejected = results.filter((r): r is Extract<DroppedLuaFile, { ok: false }> => !r.ok);
  if (rejected.length === 0 && loaded <= 1) return null;

  const parts: string[] = [];
  if (loaded > 0) parts.push(`${loaded} ${loaded === 1 ? 'file' : 'files'} loaded`);
  for (const reason of ['not-lua', 'too-large'] as const) {
    const count = rejected.filter((r) => r.reason === reason).length;
    if (count > 0) parts.push(`${count} ignored (${REJECTION_LABEL[reason]})`);
  }
  return parts.join(' \u00B7 ');
}
