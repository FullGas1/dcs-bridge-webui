import { beforeEach, describe, expect, it } from 'vitest';
import { clampZoom, loadZoom, saveZoom, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } from './zoomStore';

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
});
