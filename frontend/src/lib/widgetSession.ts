const STORAGE_KEY = 'dcs-bridge-webui:widgets';

export interface StoredWidget {
  id: number;
  code: string;
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
    typeof (value as StoredWidget).code === 'string'
  );
}
