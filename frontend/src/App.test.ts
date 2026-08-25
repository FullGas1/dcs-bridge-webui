import { afterEach, describe, expect, it, vi } from 'vitest';
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
});
