/**
 * Ticket 03 (FEAT-ADAPTIVE-LAYOUT-AND-ZOOM): a single, page-wide zoom percentage - not one per
 * widget or one per area (editor vs. result) - persisted the same way `widgetSession.ts` already
 * persists other page state. Pure functions, no Svelte reactivity here - the reactive state and
 * DOM/localStorage side effects live in ZoomControl.svelte, the only place that needs them.
 */
const STORAGE_KEY = 'dcs-bridge-webui:zoom';

export const MIN_ZOOM = 80;
export const MAX_ZOOM = 200;
export const ZOOM_STEP = 10;
export const DEFAULT_ZOOM = 100;

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
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
