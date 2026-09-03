import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import Widget from './Widget.svelte';
import { InjectionQueue } from './injectionQueue';
import { injectScript, type Template } from './api';

vi.mock('./api', () => ({ injectScript: vi.fn() }));
const injectScriptMock = vi.mocked(injectScript);

afterEach(() => {
  cleanup();
  injectScriptMock.mockReset();
  vi.restoreAllMocks();
});

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const sampleTemplates: Template[] = [{ id: '1', name: 'check menu', code: 'return checkMenu()' }];

function baseProps(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    number: 1,
    queue: new InjectionQueue(),
    editorExpanded: false,
    resultExpanded: false,
    onClose: vi.fn(),
    onToggleEditorExpand: vi.fn(),
    onToggleResultExpand: vi.fn(),
    templates: sampleTemplates,
    onSaveTemplate: vi.fn(),
    onDeleteTemplate: vi.fn(),
    ...overrides,
  };
}

describe('Widget', () => {
  it('renders its number and starts idle, with send enabled and stop disabled', () => {
    const { getByText } = render(Widget, { props: baseProps({ number: 3 }) });

    expect(getByText('Widget 3')).toBeInTheDocument();
    expect(getByText('idle')).toBeInTheDocument();
    expect((getByText('Send') as HTMLButtonElement).disabled).toBe(false);
    expect((getByText('Stop') as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables send and enables stop while an injection is in flight', async () => {
    injectScriptMock.mockReturnValue(new Promise(() => {}));
    const { getByText } = render(Widget, { props: baseProps() });

    await fireEvent.click(getByText('Send'));

    expect((getByText('Send') as HTMLButtonElement).disabled).toBe(true);
    expect((getByText('Stop') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows a success status line with the raw result after a successful injection', async () => {
    injectScriptMock.mockResolvedValue({
      ok: true, result: 'hi', error_type: null, message: null, status_code: null,
    });
    const { getByText, container } = render(Widget, { props: baseProps() });

    await fireEvent.click(getByText('Send'));
    await flush();

    expect(container.querySelector('[data-status="success"]')).not.toBeNull();
    expect(getByText('hi')).toBeInTheDocument();
  });

  it('shows an error status line distinct from success when the backend reports ok:false', async () => {
    injectScriptMock.mockResolvedValue({
      ok: false, result: null, error_type: 'connection_error', message: 'refused', status_code: null,
    });
    const { getByText, container } = render(Widget, { props: baseProps() });

    await fireEvent.click(getByText('Send'));
    await flush();

    expect(container.querySelector('[data-status="error"]')).not.toBeNull();
    expect(getByText('refused')).toBeInTheDocument();
  });

  it('re-enables send after stopping an in-flight injection', async () => {
    injectScriptMock.mockImplementation(
      (_code: string, signal: AbortSignal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const { getByText } = render(Widget, { props: baseProps() });

    await fireEvent.click(getByText('Send'));
    await fireEvent.click(getByText('Stop'));
    await flush();

    expect((getByText('Send') as HTMLButtonElement).disabled).toBe(false);
    expect(getByText('idle')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(Widget, { props: baseProps({ onClose }) });

    await fireEvent.click(getByLabelText('Close widget'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('expands only the editor when its own Expand button is clicked, leaving the result alone', async () => {
    const onToggleEditorExpand = vi.fn();
    const { getByText, container, rerender } = render(Widget, {
      props: baseProps({ onToggleEditorExpand, editorExpanded: false, resultExpanded: false }),
    });

    await fireEvent.click(getByText('Expand Editor'));
    expect(onToggleEditorExpand).toHaveBeenCalledOnce();

    await rerender(baseProps({ onToggleEditorExpand, editorExpanded: true, resultExpanded: false }));
    const editorEl = container.querySelector('.widget-editor');
    const resultEl = container.querySelector('.widget-result');
    expect(editorEl?.getAttribute('data-expanded')).toBe('true');
    expect(resultEl?.getAttribute('data-expanded')).toBe('false');
    expect(getByText('Collapse Editor')).toBeInTheDocument();
    expect(getByText('Expand Result')).toBeInTheDocument();
  });

  it('expands only the result when its own Expand button is clicked, leaving the editor alone', async () => {
    const onToggleResultExpand = vi.fn();
    const { getByText, container, rerender } = render(Widget, {
      props: baseProps({ onToggleResultExpand, editorExpanded: false, resultExpanded: false }),
    });

    await fireEvent.click(getByText('Expand Result'));
    expect(onToggleResultExpand).toHaveBeenCalledOnce();

    await rerender(baseProps({ onToggleResultExpand, editorExpanded: false, resultExpanded: true }));
    const editorEl = container.querySelector('.widget-editor');
    const resultEl = container.querySelector('.widget-result');
    expect(editorEl?.getAttribute('data-expanded')).toBe('false');
    expect(resultEl?.getAttribute('data-expanded')).toBe('true');
    expect(getByText('Collapse Result')).toBeInTheDocument();
    expect(getByText('Expand Editor')).toBeInTheDocument();
  });

  it('marks the widget itself as expanded when either area is expanded', async () => {
    const { container, rerender } = render(Widget, { props: baseProps() });

    expect(container.querySelector('.widget')?.getAttribute('data-any-expanded')).toBe('false');

    await rerender(baseProps({ editorExpanded: true }));
    expect(container.querySelector('.widget')?.getAttribute('data-any-expanded')).toBe('true');
  });

  it('ticket 02: does not force an explicit height on a short, collapsed result', async () => {
    injectScriptMock.mockResolvedValue({
      ok: true, result: 'line1\nline2', error_type: null, message: null, status_code: null,
    });
    const { getByText, container } = render(Widget, { props: baseProps() });

    await fireEvent.click(getByText('Send'));
    await flush();

    const resultEl = container.querySelector('.widget-result') as HTMLElement;
    expect(resultEl.style.height).toBe('');
  });

  it('ticket 02: forces an explicit height on a collapsed result past the threshold', async () => {
    // jsdom does no real layout (scrollHeight is always 0), which would otherwise make the
    // chrome-overhead calculation go negative - an invalid CSS height jsdom silently drops,
    // masking the behavior under test. Stubbing realistic geometry here mirrors what the real
    // browser measurements already verified live.
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(800);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ lineHeight: '20px' } as CSSStyleDeclaration);

    const longResult = Array.from({ length: 35 }, (_, i) => `line${i}`).join('\n');
    injectScriptMock.mockResolvedValue({
      ok: true, result: longResult, error_type: null, message: null, status_code: null,
    });
    const { getByText, container } = render(Widget, { props: baseProps() });

    await fireEvent.click(getByText('Send'));
    await flush();

    const resultEl = container.querySelector('.widget-result') as HTMLElement;
    expect(resultEl.style.height).not.toBe('');
  });

  it('ticket 02: never applies a collapsed height while the result is expanded', async () => {
    const longResult = Array.from({ length: 35 }, (_, i) => `line${i}`).join('\n');
    injectScriptMock.mockResolvedValue({
      ok: true, result: longResult, error_type: null, message: null, status_code: null,
    });
    const { getByText, container } = render(Widget, { props: baseProps({ resultExpanded: true }) });

    await fireEvent.click(getByText('Send'));
    await flush();

    const resultEl = container.querySelector('.widget-result') as HTMLElement;
    expect(resultEl.style.height).toBe('');
  });

  it('cancels its queue slot when closed while running', async () => {
    injectScriptMock.mockReturnValue(new Promise(() => {}));
    const queue = new InjectionQueue();
    const cancelSpy = vi.spyOn(queue, 'submit');
    const { getByText, getByLabelText } = render(Widget, { props: baseProps({ queue }) });

    await fireEvent.click(getByText('Send'));
    const handle = cancelSpy.mock.results[0]!.value;
    const handleCancelSpy = vi.spyOn(handle, 'cancel');

    await fireEvent.click(getByLabelText('Close widget'));

    expect(handleCancelSpy).toHaveBeenCalledOnce();
  });

  it('opens an in-page naming dialog when Memorize is clicked (not window.prompt)', async () => {
    const { getByText, getByLabelText } = render(Widget, { props: baseProps() });

    await fireEvent.click(getByText('Memorize'));

    expect(getByLabelText('Name this template')).toBeInTheDocument();
  });

  it('saves the current code under the typed name and closes the dialog', async () => {
    const onSaveTemplate = vi.fn();
    const { getByText, getByLabelText, queryByLabelText } = render(Widget, {
      props: baseProps({ onSaveTemplate }),
    });

    await fireEvent.click(getByText('Memorize'));
    await fireEvent.input(getByLabelText('Name this template'), { target: { value: 'my template' } });
    await fireEvent.click(getByText('Save'));

    expect(onSaveTemplate).toHaveBeenCalledWith('my template', expect.any(String));
    expect(queryByLabelText('Name this template')).toBeNull();
  });

  it('does not save when the naming dialog is cancelled', async () => {
    const onSaveTemplate = vi.fn();
    const { getByText, getByLabelText, queryByLabelText } = render(Widget, {
      props: baseProps({ onSaveTemplate }),
    });

    await fireEvent.click(getByText('Memorize'));
    await fireEvent.input(getByLabelText('Name this template'), { target: { value: 'my template' } });
    await fireEvent.click(getByText('Cancel'));

    expect(onSaveTemplate).not.toHaveBeenCalled();
    expect(queryByLabelText('Name this template')).toBeNull();
  });

  it('does not save a blank template name', async () => {
    const onSaveTemplate = vi.fn();
    const { getByText, getByLabelText } = render(Widget, { props: baseProps({ onSaveTemplate }) });

    await fireEvent.click(getByText('Memorize'));
    await fireEvent.input(getByLabelText('Name this template'), { target: { value: '   ' } });
    await fireEvent.click(getByText('Save'));

    expect(onSaveTemplate).not.toHaveBeenCalled();
  });

  it('loads a selected template into its own editor', async () => {
    const { getByText, container } = render(Widget, { props: baseProps() });

    await fireEvent.click(getByText('Templates'));
    await fireEvent.click(getByText('check menu'));

    expect(container.querySelector('.cm-content')).toHaveTextContent('return checkMenu()');
  });

  it('returns focus to the editor after loading a template', async () => {
    const { getByText, container } = render(Widget, { props: baseProps() });

    await fireEvent.click(getByText('Templates'));
    await fireEvent.click(getByText('check menu'));

    expect(document.activeElement).toBe(container.querySelector('.cm-content'));
  });

  it('reports the loaded template as a code change (so it persists)', async () => {
    const onCodeChange = vi.fn();
    const { getByText } = render(Widget, { props: baseProps({ onCodeChange }) });

    await fireEvent.click(getByText('Templates'));
    await fireEvent.click(getByText('check menu'));

    expect(onCodeChange).toHaveBeenCalledWith('return checkMenu()');
  });

  it('calls onDeleteTemplate with the template id from its dropdown', async () => {
    const onDeleteTemplate = vi.fn();
    const { getByText, getByLabelText } = render(Widget, { props: baseProps({ onDeleteTemplate }) });

    await fireEvent.click(getByText('Templates'));
    await fireEvent.click(getByLabelText('Delete template check menu'));

    expect(onDeleteTemplate).toHaveBeenCalledWith('1');
  });

  describe('ticket 01: drag-and-drop a .lua file', () => {
    function luaFile(name: string, contents: string): File {
      return new File([contents], name, { type: '' });
    }

    function fileDrop(files: File[]) {
      return { dataTransfer: { files, types: ['Files'] } };
    }

    it('replaces the editor contents with a dropped .lua file', async () => {
      const { container } = render(Widget, { props: baseProps({ initialCode: 'return old()' }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('patrol.lua', 'return patrol()')]),
      );
      await flush();

      expect(container.querySelector('.cm-content')).toHaveTextContent('return patrol()');
      expect(container.querySelector('.cm-content')).not.toHaveTextContent('old');
    });

    it('replaces rather than inserts even when the drop lands on the editor itself', async () => {
      const { container } = render(Widget, { props: baseProps({ initialCode: 'AAAA' }) });

      await fireEvent.drop(
        container.querySelector('.cm-content')!,
        fileDrop([luaFile('x.lua', 'BBBB')]),
      );
      await flush();

      expect(container.querySelector('.cm-content')?.textContent).toBe('BBBB');
    });

    it('focuses the editor after a .lua drop', async () => {
      const { container } = render(Widget, { props: baseProps() });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('x.lua', 'return 1')]),
      );
      await flush();

      expect(document.activeElement).toBe(container.querySelector('.cm-content'));
    });

    it('reports the dropped script via onCodeChange so it persists', async () => {
      const onCodeChange = vi.fn();
      const { container } = render(Widget, { props: baseProps({ onCodeChange }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('x.lua', 'return dropped()')]),
      );
      await flush();

      expect(onCodeChange).toHaveBeenCalledWith('return dropped()');
    });

    it('strips a leading BOM from the dropped file', async () => {
      const { container } = render(Widget, { props: baseProps() });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('bom.lua', '﻿return 1')]),
      );
      await flush();

      expect(container.querySelector('.cm-content')?.textContent).toBe('return 1');
    });

    it('ignores a non-.lua file (contents unchanged)', async () => {
      const { container } = render(Widget, { props: baseProps({ initialCode: 'return kept()' }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('notes.txt', 'return other()')]),
      );
      await flush();

      expect(container.querySelector('.cm-content')).toHaveTextContent('return kept()');
    });

    it('ignores a .lua file over 512 KB (contents unchanged)', async () => {
      const { container } = render(Widget, { props: baseProps({ initialCode: 'return kept()' }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('big.lua', 'x'.repeat(512 * 1024 + 1))]),
      );
      await flush();

      expect(container.querySelector('.cm-content')).toHaveTextContent('return kept()');
    });

    it('does not start an injection on drop', async () => {
      const { container } = render(Widget, { props: baseProps() });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('x.lua', 'return 1')]),
      );
      await flush();

      expect(injectScriptMock).not.toHaveBeenCalled();
    });
  });

  describe('ticket 02: the remembered file name', () => {
    function luaFile(name: string, contents: string): File {
      return new File([contents], name, { type: '' });
    }
    function fileDrop(files: File[]) {
      return { dataTransfer: { files, types: ['Files'] } };
    }

    it('shows only the widget number when nothing has been dropped', () => {
      const { getByText } = render(Widget, { props: baseProps({ number: 4 }) });

      expect(getByText('Widget 4')).toBeInTheDocument();
    });

    it('shows the dropped file name next to the widget number', async () => {
      const { container, getByText } = render(Widget, { props: baseProps({ number: 4 }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('patrol_check.lua', 'return 1')]),
      );
      await flush();

      expect(getByText('Widget 4 — patrol_check.lua')).toBeInTheDocument();
    });

    it('replaces the shown name when a different file is dropped', async () => {
      const { container, getByText } = render(Widget, { props: baseProps({ number: 1 }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('first.lua', 'a')]),
      );
      await flush();
      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('second.lua', 'b')]),
      );
      await flush();

      expect(getByText('Widget 1 — second.lua')).toBeInTheDocument();
    });

    it('reports the remembered name via onFilenameChange so it persists', async () => {
      const onFilenameChange = vi.fn();
      const { container } = render(Widget, { props: baseProps({ onFilenameChange }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('x.lua', 'return 1')]),
      );
      await flush();

      expect(onFilenameChange).toHaveBeenCalledWith('x.lua');
    });

    it('shows the template name as a pseudo-file-name after loading a template', async () => {
      const { getByText } = render(Widget, { props: baseProps({ number: 2 }) });

      await fireEvent.click(getByText('Templates'));
      await fireEvent.click(getByText('check menu'));

      expect(getByText('Widget 2 — check menu')).toBeInTheDocument();
    });

    it('keeps the remembered name when Memorize is used', async () => {
      const { container, getByText, getByLabelText } = render(Widget, {
        props: baseProps({ number: 1 }),
      });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('keep.lua', 'return 1')]),
      );
      await flush();
      await fireEvent.click(getByText('Memorize'));
      await fireEvent.input(getByLabelText('Name this template'), {
        target: { value: 'a template' },
      });
      await fireEvent.click(getByText('Save'));

      expect(getByText('Widget 1 — keep.lua')).toBeInTheDocument();
    });

    it('seeds the remembered name from initialFilename', () => {
      const { getByText } = render(Widget, {
        props: baseProps({ number: 7, initialFilename: 'restored.lua' }),
      });

      expect(getByText('Widget 7 — restored.lua')).toBeInTheDocument();
    });
  });

  describe('ticket 03: drag-over highlight and drop report', () => {
    function luaFile(name: string, contents: string): File {
      return new File([contents], name, { type: '' });
    }
    function fileDrag() {
      return { dataTransfer: { types: ['Files'] } };
    }
    function fileDrop(files: File[]) {
      return { dataTransfer: { files, types: ['Files'] } };
    }

    it('marks the widget as a drop target while a file is dragged over it', async () => {
      const { container } = render(Widget, { props: baseProps() });
      const widget = container.querySelector('.widget')!;

      await fireEvent.dragEnter(widget, fileDrag());

      expect(widget.getAttribute('data-drag-over')).toBe('true');
    });

    it('clears the drop-target mark when the drag leaves', async () => {
      const { container } = render(Widget, { props: baseProps() });
      const widget = container.querySelector('.widget')!;

      await fireEvent.dragEnter(widget, fileDrag());
      await fireEvent.dragLeave(widget, fileDrag());

      expect(widget.getAttribute('data-drag-over')).toBe('false');
    });

    it('clears the drop-target mark after a drop', async () => {
      const { container } = render(Widget, { props: baseProps() });
      const widget = container.querySelector('.widget')!;

      await fireEvent.dragEnter(widget, fileDrag());
      await fireEvent.drop(widget, fileDrop([luaFile('x.lua', 'return 1')]));
      await flush();

      expect(widget.getAttribute('data-drag-over')).toBe('false');
    });

    it('does not mark a drop target for a non-file drag', async () => {
      const { container } = render(Widget, { props: baseProps() });
      const widget = container.querySelector('.widget')!;

      await fireEvent.dragEnter(widget, { dataTransfer: { types: ['text/plain'] } });

      expect(widget.getAttribute('data-drag-over')).toBe('false');
    });

    it('reports the drop outcome for an accepted file', async () => {
      const onDropReport = vi.fn();
      const { container } = render(Widget, { props: baseProps({ onDropReport }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('x.lua', 'return 1')]),
      );
      await flush();

      expect(onDropReport).toHaveBeenCalledWith({
        loaded: [{ name: 'x.lua', text: 'return 1' }],
        rejected: [],
      });
    });

    it('reports the drop outcome for a rejected file', async () => {
      const onDropReport = vi.fn();
      const { container } = render(Widget, { props: baseProps({ onDropReport }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('notes.txt', 'return 1')]),
      );
      await flush();

      expect(onDropReport).toHaveBeenCalledWith({
        loaded: [],
        rejected: [{ name: 'notes.txt', reason: 'not-lua' }],
      });
    });
  });

  describe('ticket 04: multiple files dropped on one widget', () => {
    function luaFile(name: string, contents: string): File {
      return new File([contents], name, { type: '' });
    }
    function fileDrop(files: File[]) {
      return { dataTransfer: { files, types: ['Files'] } };
    }

    it('loads only the first .lua and names the widget after it', async () => {
      const { container, getByText } = render(Widget, { props: baseProps({ number: 1 }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('first.lua', 'return first()'), luaFile('second.lua', 'return second()')]),
      );
      await flush();

      expect(container.querySelector('.cm-content')?.textContent).toBe('return first()');
      expect(getByText('Widget 1 — first.lua')).toBeInTheDocument();
    });

    it('reports the extra files as ignored', async () => {
      const onDropReport = vi.fn();
      const { container } = render(Widget, { props: baseProps({ onDropReport }) });

      await fireEvent.drop(
        container.querySelector('.widget')!,
        fileDrop([luaFile('a.lua', 'A'), luaFile('b.lua', 'B'), luaFile('c.lua', 'C')]),
      );
      await flush();

      expect(onDropReport).toHaveBeenCalledWith({
        loaded: [{ name: 'a.lua', text: 'A' }],
        rejected: [
          { name: 'b.lua', reason: 'extra-for-widget' },
          { name: 'c.lua', reason: 'extra-for-widget' },
        ],
      });
    });
  });
});
