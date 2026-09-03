import { beforeEach, describe, expect, it } from 'vitest';
import {
  clampZoom, clampWidgetZoom, loadZoom, saveZoom,
  MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, PER_WIDGET_MIN_ZOOM, PER_WIDGET_MAX_ZOOM,
} from './zoomStore';

beforeEach(() => {
  localStorage.clear();
});

describe('zoomStore', () => {
  it('defaults to 100% when nothing has ever been saved', () => {
    expect(loadZoom()).toBe(DEFAULT_ZOOM);
  });

  it('round-trips a saved zoom level', () => {
    saveZoom(150);

    expect(loadZoom()).toBe(150);
  });

  it('clamps a value above the max on save', () => {
    saveZoom(500);

    expect(loadZoom()).toBe(MAX_ZOOM);
  });

  it('clamps a value below the min on save', () => {
    saveZoom(10);

    expect(loadZoom()).toBe(MIN_ZOOM);
  });

  it('falls back to the default for a corrupt stored value', () => {
    localStorage.setItem('dcs-bridge-webui:zoom', 'not-a-number');

    expect(loadZoom()).toBe(DEFAULT_ZOOM);
  });

  it('clampZoom clamps in both directions without touching storage', () => {
    expect(clampZoom(500)).toBe(MAX_ZOOM);
    expect(clampZoom(10)).toBe(MIN_ZOOM);
    expect(clampZoom(120)).toBe(120);
  });

  it('FEAT-DUAL-ZOOM: the page zoom-out floor is 40%', () => {
    expect(MIN_ZOOM).toBe(40);
    saveZoom(20);
    expect(loadZoom()).toBe(40);
  });

  it('FEAT-DUAL-ZOOM: clampWidgetZoom uses the wider 40-250 per-widget range', () => {
    expect(PER_WIDGET_MIN_ZOOM).toBe(40);
    expect(PER_WIDGET_MAX_ZOOM).toBe(250);
    expect(clampWidgetZoom(1000)).toBe(250);
    expect(clampWidgetZoom(5)).toBe(40);
    expect(clampWidgetZoom(175)).toBe(175);
  });
});
