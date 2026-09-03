/**
 * FEAT-DUAL-ZOOM: two zoom axes. The page axis (this file's `clampZoom` / `loadZoom` /
 * `saveZoom`) is persisted the same way `widgetSession.ts` persists other page state; the
 * per-widget axis is just `clampWidgetZoom` here, its value riding in the widget session.
 * Pure functions, no Svelte reactivity - the reactive state and DOM/localStorage side effects
 * live in App.svelte (page) and Grid/Widget (per-widget).
 */
const STORAGE_KEY = 'dcs-bridge-webui:zoom';

export const MIN_ZOOM = 40;
export const MAX_ZOOM = 200;
export const ZOOM_STEP = 10;
export const DEFAULT_ZOOM = 100;

// FEAT-DUAL-ZOOM: a single widget can be zoomed in further than the whole page is worth zooming.
export const PER_WIDGET_MIN_ZOOM = 40;
export const PER_WIDGET_MAX_ZOOM = 250;

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function clampWidgetZoom(value: number): number {
  return Math.min(PER_WIDGET_MAX_ZOOM, Math.max(PER_WIDGET_MIN_ZOOM, value));
}

/** Reads the persisted zoom level, clamped to the valid range. Falls back to DEFAULT_ZOOM when
 * nothing has been saved yet or the stored value is corrupt/out of range. */
export function loadZoom(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_ZOOM;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_ZOOM;
  return clampZoom(parsed);
}

export function saveZoom(value: number): void {
  localStorage.setItem(STORAGE_KEY, String(clampZoom(value)));
}
