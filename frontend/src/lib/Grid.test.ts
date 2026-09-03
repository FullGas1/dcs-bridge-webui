import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import Grid from './Grid.svelte';
import {
  injectScript, listTemplates, saveTemplate, deleteTemplate, checkConnection, setApiKey,
  type InjectResult, type Template,
} from './api';
import { loadWidgets, saveWidgets } from './widgetSession';

vi.mock('./api', () => ({
  injectScript: vi.fn(),
  listTemplates: vi.fn(),
  saveTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  checkConnection: vi.fn(),
  setApiKey: vi.fn(),
}));
const injectScriptMock = vi.mocked(injectScript);
const listTemplatesMock = vi.mocked(listTemplates);
const saveTemplateMock = vi.mocked(saveTemplate);
const deleteTemplateMock = vi.mocked(deleteTemplate);
const checkConnectionMock = vi.mocked(checkConnection);
const setApiKeyMock = vi.mocked(setApiKey);

beforeEach(() => {
  localStorage.clear();
  listTemplatesMock.mockResolvedValue([]);
  checkConnectionMock.mockResolvedValue({ connected: true, message: null });
});

afterEach(() => {
  cleanup();
  injectScriptMock.mockReset();
  listTemplatesMock.mockReset();
  saveTemplateMock.mockReset();
  deleteTemplateMock.mockReset();
  checkConnectionMock.mockReset();
  setApiKeyMock.mockReset();
  vi.restoreAllMocks();
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

  it('loads templates on mount and offers the same list in every widget', async () => {
    const templates: Template[] = [{ id: '1', name: 'check menu', code: 'return checkMenu()' }];
    listTemplatesMock.mockResolvedValue(templates);
    const { getByLabelText, getAllByLabelText, getAllByText } = render(Grid);
    await fireEvent.click(getByLabelText('Add widget'));
    await flush();

    const dropdownButtons = getAllByText('Templates');
    await fireEvent.click(dropdownButtons[0]!);
    await fireEvent.click(dropdownButtons[1]!);

    expect(getAllByLabelText('Delete template check menu')).toHaveLength(2);
  });

  it('makes a template saved from one widget appear in every other widget immediately', async () => {
    listTemplatesMock.mockResolvedValue([]);
    saveTemplateMock.mockResolvedValue([{ id: '1', name: 'new one', code: 'x' }]);
    const { getByLabelText, getAllByText, getAllByLabelText } = render(Grid);
    await fireEvent.click(getByLabelText('Add widget'));
    await flush();

    await fireEvent.click(getAllByText('Memorize')[0]!);
    await fireEvent.input(getAllByLabelText('Name this template')[0]!, { target: { value: 'new one' } });
    await fireEvent.click(getAllByText('Save')[0]!);
    await flush();

    const dropdownButtons = getAllByText('Templates');
    await fireEvent.click(dropdownButtons[1]!); // open the *other* widget's dropdown
    expect(getAllByText('new one')).toHaveLength(1);
  });

  it('removes a deleted template from every widget immediately', async () => {
    const templates: Template[] = [{ id: '1', name: 'check menu', code: 'x' }];
    listTemplatesMock.mockResolvedValue(templates);
    deleteTemplateMock.mockResolvedValue([]);
    const { getByLabelText, getAllByText, getAllByLabelText, queryAllByText } = render(Grid);
    await fireEvent.click(getByLabelText('Add widget'));
    await flush();

    await fireEvent.click(getAllByText('Templates')[0]!);
    await fireEvent.click(getAllByLabelText('Delete template check menu')[0]!);
    await flush();

    const dropdownButtons = getAllByText('Templates');
    await fireEvent.click(dropdownButtons[1]!);
    expect(queryAllByText('check menu')).toHaveLength(0);
  });

  it('shows the connection banner when the initial probe reports disconnected', async () => {
    checkConnectionMock.mockResolvedValue({ connected: false, message: 'refused' });
    const { findByText } = render(Grid);

    expect(await findByText(/Can't reach dcs-serve/)).toBeInTheDocument();
  });

  it('does not show the connection banner when the initial probe succeeds', async () => {
    checkConnectionMock.mockResolvedValue({ connected: true, message: null });
    const { queryByText } = render(Grid);
    await flush();

    expect(queryByText(/Can't reach dcs-serve/)).toBeNull();
  });

  it('hides the banner once a submitted key connects successfully', async () => {
    checkConnectionMock.mockResolvedValueOnce({ connected: false, message: 'refused' });
    const { findByText, getByLabelText, getByText, queryByText } = render(Grid);
    await findByText(/Can't reach dcs-serve/);

    checkConnectionMock.mockResolvedValue({ connected: true, message: null });
    await fireEvent.input(getByLabelText('api_key'), { target: { value: 'the-real-key' } });
    await fireEvent.click(getByText('Connect'));
    await flush();

    expect(setApiKeyMock).toHaveBeenCalledWith('the-real-key');
    expect(queryByText(/Can't reach dcs-serve/)).toBeNull();
  });

  it('keeps the banner visible with a failure message when the retry still fails', async () => {
    checkConnectionMock.mockResolvedValue({ connected: false, message: 'still refused' });
    const { findByText, getByLabelText, getByText, getByRole } = render(Grid);
    await findByText(/Can't reach dcs-serve/);

    await fireEvent.input(getByLabelText('api_key'), { target: { value: 'wrong-key' } });
    await fireEvent.click(getByText('Connect'));
    await flush();

    expect(getByText(/Can't reach dcs-serve/)).toBeInTheDocument();
    expect(getByRole('status')).toHaveTextContent(/still/i);
  });

  it('shows the banner again if a later injection fails with a connection-shaped error', async () => {
    checkConnectionMock.mockResolvedValue({ connected: true, message: null });
    injectScriptMock.mockResolvedValue({
      ok: false, result: null, error_type: 'connection_error', message: 'dropped', status_code: null,
    });
    const { getByText, findByText, queryByText } = render(Grid);
    await flush();
    expect(queryByText(/Can't reach dcs-serve/)).toBeNull();

    await fireEvent.click(getByText('Send'));
    await flush();

    expect(await findByText(/Can't reach dcs-serve/)).toBeInTheDocument();
  });

  it('does not show the banner when an injection fails because of the user\'s own script (dcs_error)', async () => {
    checkConnectionMock.mockResolvedValue({ connected: true, message: null });
    injectScriptMock.mockResolvedValue({
      ok: false, result: null, error_type: 'dcs_error', message: 'attempt to call a nil value', status_code: null,
    });
    const { getByText, queryByText } = render(Grid);
    await flush();

    await fireEvent.click(getByText('Send'));
    await flush();

    expect(queryByText(/Can't reach dcs-serve/)).toBeNull();
  });

  describe('ticket 01: stray file-drop guard', () => {
    function luaFile(name: string, contents: string): File {
      return new File([contents], name, { type: '' });
    }
    function fileDrop(files: File[]) {
      return { dataTransfer: { files, types: ['Files'] } };
    }

    it('prevents the browser default when a file is dropped outside any widget', async () => {
      const { container } = render(Grid);
      await flush();

      const notCancelled = await fireEvent.drop(
        container,
        fileDrop([luaFile('x.lua', 'return 1')]),
      );

      expect(notCancelled).toBe(false);
    });

    it('does not create or change a widget from a file dropped outside any widget', async () => {
      const { container, getAllByText } = render(Grid);
      await flush();

      await fireEvent.dragOver(container, fileDrop([luaFile('x.lua', 'return 1')]));
      await fireEvent.drop(container, fileDrop([luaFile('x.lua', 'return 1')]));
      await flush();

      expect(getAllByText(/Widget \d/)).toHaveLength(1);
    });

    it('stops listening on the window once unmounted', async () => {
      const { unmount } = render(Grid);
      await flush();
      unmount();

      const notCancelled = await fireEvent.drop(
        document.body,
        fileDrop([luaFile('x.lua', 'return 1')]),
      );

      expect(notCancelled).toBe(true);
    });
  });

  describe('ticket 03: transient drop message', () => {
    function luaFile(name: string, contents: string): File {
      return new File([contents], name, { type: '' });
    }
    function fileDrop(files: File[]) {
      return { dataTransfer: { files, types: ['Files'] } };
    }

    it('shows a message when a dropped file is ignored', async () => {
      const { container, getByText } = render(Grid);
      await flush();

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('notes.txt', 'return 1')]),
      );
      await flush();

      expect(getByText('1 ignored (not a .lua file)')).toBeInTheDocument();
    });

    it('shows a message when a dropped .lua is over the size cap', async () => {
      const { container, getByText } = render(Grid);
      await flush();

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('big.lua', 'x'.repeat(512 * 1024 + 1))]),
      );
      await flush();

      expect(getByText('1 ignored (over 512 KB)')).toBeInTheDocument();
    });

    it('replaces a still-showing message with the next drop rather than stacking', async () => {
      const { container, getByText, queryByText } = render(Grid);
      await flush();
      const widget = () => container.querySelector('.widget')!;

      await fireEvent.drop(widget(), fileDrop([luaFile('a.txt', '1')]));
      await flush();
      await fireEvent.drop(widget(), fileDrop([luaFile('b.md', '1')]));
      await flush();

      expect(queryByText(/not a \.lua file/)).toBeInTheDocument();
      expect(container.querySelectorAll('.drop-message')).toHaveLength(1);
      getByText('1 ignored (not a .lua file)');
    });

    it('shows no message for a clean single-file drop', async () => {
      const { container, queryByText } = render(Grid);
      await flush();

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('ok.lua', 'return 1')]),
      );
      await flush();

      expect(queryByText(/loaded|ignored/)).toBeNull();
    });

    it('dismisses the message when its close button is clicked', async () => {
      const { container, getByText, queryByText, getByLabelText } = render(Grid);
      await flush();

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('notes.txt', 'return 1')]),
      );
      await flush();
      expect(getByText('1 ignored (not a .lua file)')).toBeInTheDocument();

      await fireEvent.click(getByLabelText('Dismiss message'));

      expect(queryByText('1 ignored (not a .lua file)')).toBeNull();
    });

    it('auto-dismisses the message after five seconds', async () => {
      vi.useFakeTimers();
      try {
        const { container, queryByText } = render(Grid);
        await vi.advanceTimersByTimeAsync(0);

        await fireEvent.drop(
          container.querySelector('.widget')!,
          fileDrop([luaFile('notes.txt', 'return 1')]),
        );
        await vi.advanceTimersByTimeAsync(0);
        expect(queryByText('1 ignored (not a .lua file)')).toBeInTheDocument();

        await vi.advanceTimersByTimeAsync(5000);

        expect(queryByText('1 ignored (not a .lua file)')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('ticket 02: remembered file name through the grid', () => {
    function luaFile(name: string, contents: string): File {
      return new File([contents], name, { type: '' });
    }
    function fileDrop(files: File[]) {
      return { dataTransfer: { files, types: ['Files'] } };
    }

    it('persists a dropped file name and restores it on reload', async () => {
      const first = render(Grid);
      await flush();

      await fireEvent.drop(
        first.container.querySelector('.widget')!,
        fileDrop([luaFile('patrol.lua', 'return 1')]),
      );
      await flush();

      expect(localStorage.getItem('dcs-bridge-webui:widgets')).toContain('patrol.lua');

      cleanup();
      const reloaded = render(Grid);
      await flush();

      expect(reloaded.getByText(/Widget \d+ — patrol\.lua/)).toBeInTheDocument();
    });
  });
});
