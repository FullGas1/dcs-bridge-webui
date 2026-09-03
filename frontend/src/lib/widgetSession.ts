const STORAGE_KEY = 'dcs-bridge-webui:widgets';

export interface StoredWidget {
  id: number;
  code: string;
  // Ticket 02 (FEAT-LUA-FILE-DROP): the base name of the `.lua` file dropped into the widget, or
  // a loaded template's name shown as a pseudo-file-name. Absent for widgets typed from scratch
  // and for sessions saved before this field existed.
  filename?: string;
  // FEAT-DUAL-ZOOM: this widget's own zoom percentage. Absent when it is at 100% and for
  // sessions saved before this field existed.
  zoom?: number;
}

/**
 * Reads the open widgets (id + script text) saved by saveWidgets(). Returns null when nothing
 * has been saved yet (a genuinely fresh browser profile) or the entry is corrupt - callers
 * should tell that apart from a legitimately empty, previously-saved list (see ticket 04).
 */
export function loadWidgets(): StoredWidget[] | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every(isStoredWidget)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWidgets(widgets: StoredWidget[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

function isStoredWidget(value: unknown): value is StoredWidget {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StoredWidget).id === 'number' &&
    typeof (value as StoredWidget).code === 'string' &&
    ((value as StoredWidget).filename === undefined ||
      typeof (value as StoredWidget).filename === 'string') &&
    ((value as StoredWidget).zoom === undefined ||
      typeof (value as StoredWidget).zoom === 'number')
  );
}
