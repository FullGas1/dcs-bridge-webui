import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import Grid from './Grid.svelte';
import { injectScript, type InjectResult } from './api';

vi.mock('./api', () => ({ injectScript: vi.fn() }));
const injectScriptMock = vi.mocked(injectScript);

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
});
