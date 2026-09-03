import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import App from './App.svelte';

vi.mock('./lib/api', () => ({
  injectScript: vi.fn(),
  listTemplates: vi.fn().mockResolvedValue([]),
  saveTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  checkConnection: vi.fn().mockResolvedValue({ connected: true, message: null }),
  setApiKey: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});

describe('App', () => {
  it('renders the branding header above the widget grid', () => {
    const { getByRole, getByLabelText } = render(App);

    const header = getByRole('img');
    const grid = getByLabelText('Add widget');

    expect(header).toBeInTheDocument();
    expect(grid).toBeInTheDocument();
    // header precedes the grid in the DOM (appears first, i.e. visually above it)
    expect(header.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('FEAT-DUAL-ZOOM: wraps the header + grid in a .page carrying the persisted page zoom', () => {
    localStorage.setItem('dcs-bridge-webui:zoom', '60');
    const { container, getByRole } = render(App);

    const page = container.querySelector('.page') as HTMLElement;
    expect(page).not.toBeNull();
    expect(page.style.zoom).toBe('0.6');
    expect(page.contains(getByRole('img'))).toBe(true);
  });

  it('FEAT-DUAL-ZOOM: renders the zoom control outside the zoomed .page wrapper', () => {
    const { container, getByLabelText } = render(App);

    const page = container.querySelector('.page') as HTMLElement;
    const control = getByLabelText('Zoom in').closest('.zoom-control') as HTMLElement;
    expect(control).not.toBeNull();
    expect(page.contains(control)).toBe(false);
  });
});
