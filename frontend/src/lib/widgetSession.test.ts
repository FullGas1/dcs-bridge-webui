import { beforeEach, describe, expect, it } from 'vitest';
import { loadWidgets, saveWidgets } from './widgetSession';

beforeEach(() => {
  localStorage.clear();
});

describe('widgetSession', () => {
  it('returns null when nothing has ever been saved', () => {
    expect(loadWidgets()).toBeNull();
  });

  it('round-trips a list of widgets', () => {
    saveWidgets([{ id: 1, code: 'return 1' }, { id: 2, code: 'return 2' }]);

    expect(loadWidgets()).toEqual([{ id: 1, code: 'return 1' }, { id: 2, code: 'return 2' }]);
  });

  it('round-trips an explicitly empty list (distinct from never having saved)', () => {
    saveWidgets([]);

    expect(loadWidgets()).toEqual([]);
  });

  it('preserves widget order', () => {
    saveWidgets([{ id: 3, code: 'c' }, { id: 1, code: 'a' }, { id: 2, code: 'b' }]);

    expect(loadWidgets()!.map((w) => w.id)).toEqual([3, 1, 2]);
  });

  it('returns null for malformed JSON rather than throwing', () => {
    localStorage.setItem('dcs-bridge-webui:widgets', '{not json');

    expect(loadWidgets()).toBeNull();
  });

  it('returns null when the stored value is not a widget array', () => {
    localStorage.setItem('dcs-bridge-webui:widgets', JSON.stringify({ oops: true }));

    expect(loadWidgets()).toBeNull();
  });

  it('returns null when an entry is missing required fields', () => {
    localStorage.setItem('dcs-bridge-webui:widgets', JSON.stringify([{ id: 1 }]));

    expect(loadWidgets()).toBeNull();
  });
});
