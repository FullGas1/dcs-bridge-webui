// Everything the widget / grid drop handlers need for a `.lua` dragged onto the page
// (FEAT-LUA-FILE-DROP). Pure and DOM-free so it is unit-testable in isolation: per-file
// validation, the multi-file partition for a widget vs. the add button, and the aggregated
// transient message.

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

// Ticket 04 (FEAT-LUA-FILE-DROP): a widget can only hold one script, so a multi-file drop on a
// widget keeps the first accepted `.lua` and reports the rest under this reason.
export type DropRejectionReason = LuaDropRejection | 'extra-for-widget';

export interface DropPartition {
  loaded: { name: string; text: string }[];
  rejected: { name: string; reason: DropRejectionReason }[];
}

/**
 * Reads every dropped file and splits it into the scripts to load and the ones to report as
 * ignored, in the original file order. For a `widget` target only the first accepted `.lua` is
 * kept (a widget holds one script); for the `add-button` target every accepted `.lua` is kept
 * (one new widget each).
 */
export async function partitionDroppedFiles(
  files: File[],
  target: 'widget' | 'add-button',
): Promise<DropPartition> {
  const results = await Promise.all(Array.from(files).map(readDroppedLuaFile));
  const partition: DropPartition = { loaded: [], rejected: [] };
  for (const result of results) {
    if (!result.ok) {
      partition.rejected.push({ name: result.name, reason: result.reason });
    } else if (target === 'widget' && partition.loaded.length >= 1) {
      partition.rejected.push({ name: result.name, reason: 'extra-for-widget' });
    } else {
      partition.loaded.push({ name: result.name, text: result.text });
    }
  }
  return partition;
}

const REJECTION_LABEL: Record<DropRejectionReason, string> = {
  'not-lua': 'not a .lua file',
  'too-large': 'over 512 KB',
  'extra-for-widget': 'only one file per widget',
};

/**
 * One aggregated line summarising a drop, or null when there is nothing worth saying - a clean
 * drop of a single file, since the editor visibly changing is feedback enough. A multi-file load
 * or any rejection produces a message, e.g.
 * "2 files loaded \u00B7 1 ignored (not a .lua file)".
 */
export function formatDropMessage({ loaded, rejected }: DropPartition): string | null {
  if (rejected.length === 0 && loaded.length <= 1) return null;

  const parts: string[] = [];
  if (loaded.length > 0) {
    parts.push(`${loaded.length} ${loaded.length === 1 ? 'file' : 'files'} loaded`);
  }
  for (const reason of ['not-lua', 'too-large', 'extra-for-widget'] as const) {
    const count = rejected.filter((r) => r.reason === reason).length;
    if (count > 0) parts.push(`${count} ignored (${REJECTION_LABEL[reason]})`);
  }
  return parts.join(' \u00B7 ');
}
