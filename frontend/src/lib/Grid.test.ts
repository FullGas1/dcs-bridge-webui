import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import Grid from './Grid.svelte';
import { injectScript, type InjectResult } from './api';
import { loadWidgets, saveWidgets } from './widgetSession';

vi.mock('./api', () => ({ injectScript: vi.fn() }));
const injectScriptMock = vi.mocked(injectScript);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  injectScriptMock.mockReset();
});

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Grid', () => {
  it('starts with exactly one widget and an add control', () => {
    const { getAllByText, getByLabelText } = render(Grid);

    expect(getAllByText(/Widget \d/)).toHaveLength(1);
    expect(getByLabelText('Add widget')).toBeInTheDocument();
  });

  it('adds a widget when the add control is clicked', async () => {
    const { getAllByText, getByLabelText } = render(Grid);

    await fireEvent.click(getByLabelText('Add widget'));

    expect(getAllByText(/Widget \d/)).toHaveLength(2);
  });

  it('leaves only the add control once every widget is closed', async () => {
    const { getAllByLabelText, queryAllByText, getByLabelText } = render(Grid);

    await fireEvent.click(getAllByLabelText('Close widget')[0]!);

    expect(queryAllByText(/Widget \d/)).toHaveLength(0);
    expect(getByLabelText('Add widget')).toBeInTheDocument();
  });

  it('can add a widget again after closing every widget', async () => {
    const { getAllByLabelText, getAllByText, getByLabelText } = render(Grid);

    await fireEvent.click(getAllByLabelText('Close widget')[0]!);
    await fireEvent.click(getByLabelText('Add widget'));

    expect(getAllByText(/Widget \d/)).toHaveLength(1);
  });

  it('runs two widgets through the shared queue in submission order', async () => {
    let resolveFirst!: (value: InjectResult) => void;
    injectScriptMock
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise(() => {})); // B: still running once started, deliberately
    const { getByLabelText, getAllByText, container } = render(Grid);

    await fireEvent.click(getByLabelText('Add widget'));
    const sendButtons = getAllByText('Send') as HTMLButtonElement[];

    await fireEvent.click(sendButtons[0]!);
    await fireEvent.click(sendButtons[1]!);

    // widget A runs (its promise is deliberately still pending), B is queued behind it
    expect(container.querySelectorAll('[data-activity="running"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-activity="queued"]')).toHaveLength(1);
    expect(sendButtons[1]!.disabled).toBe(true); // can't re-submit a queued widget either

    resolveFirst({ ok: true, result: 'first', error_type: null, message: null, status_code: null });
    await flush();

    // A finished and reports its result; the queue advanced B into running on its own
    expect(getAllByText('first')[0]).toBeInTheDocument();
    expect(container.querySelectorAll('[data-activity="running"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-activity="queued"]')).toHaveLength(0);
  });

  it('restores widgets and their script text from a prior session, in the saved order', () => {
    saveWidgets([
      { id: 5, code: 'return "five"' },
      { id: 2, code: 'return "two"' },
      { id: 9, code: 'return "nine"' },
    ]);

    const { getAllByText, container } = render(Grid);

    expect(getAllByText(/Widget \d/).map((el) => el.textContent)).toEqual([
      'Widget 5', 'Widget 2', 'Widget 9',
    ]);
    // CodeMirror splits its content into per-token spans, so match on the editor's whole
    // textContent rather than a single exact-text node.
    const editors = container.querySelectorAll('.cm-content');
    expect(editors[0]).toHaveTextContent('return "five"');
    expect(editors[1]).toHaveTextContent('return "two"');
    expect(editors[2]).toHaveTextContent('return "nine"');
  });

  it('does not resurrect a widget closed before the previous session ended', async () => {
    saveWidgets([{ id: 1, code: 'a' }, { id: 2, code: 'b' }]);
    const { unmount, getAllByLabelText } = render(Grid);
    await fireEvent.click(getAllByLabelText('Close widget')[0]!); // closes widget 1
    unmount(); // simulate leaving the page; the $effect has already persisted the close

    const stored = loadWidgets();

    expect(stored).toEqual([{ id: 2, code: 'b' }]);
  });

  it('falls back to one empty widget when nothing was ever saved', () => {
    const { getAllByText } = render(Grid);

    expect(getAllByText(/Widget \d/)).toHaveLength(1);
    expect(loadWidgets()).toEqual([{ id: expect.any(Number), code: '' }]);
  });

  it('respects an explicitly empty saved session (every widget was closed) rather than reseeding one', () => {
    saveWidgets([]);

    const { queryAllByText, getByLabelText } = render(Grid);

    expect(queryAllByText(/Widget \d/)).toHaveLength(0);
    expect(getByLabelText('Add widget')).toBeInTheDocument();
  });
});
