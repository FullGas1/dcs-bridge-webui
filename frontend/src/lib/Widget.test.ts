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
});
