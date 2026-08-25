import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import Widget from './Widget.svelte';
import { InjectionQueue } from './injectionQueue';
import { injectScript } from './api';

vi.mock('./api', () => ({ injectScript: vi.fn() }));
const injectScriptMock = vi.mocked(injectScript);

afterEach(() => {
  cleanup();
  injectScriptMock.mockReset();
});

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function baseProps(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    number: 1,
    queue: new InjectionQueue(),
    expanded: false,
    onClose: vi.fn(),
    onToggleExpand: vi.fn(),
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

  it('calls onToggleExpand when the expand button is clicked, and reflects the expanded prop', async () => {
    const onToggleExpand = vi.fn();
    const { getByText, container, rerender } = render(Widget, {
      props: baseProps({ onToggleExpand, expanded: false }),
    });

    await fireEvent.click(getByText('Expand'));
    expect(onToggleExpand).toHaveBeenCalledOnce();

    await rerender(baseProps({ onToggleExpand, expanded: true }));
    expect(container.querySelector('[data-expanded="true"]')).not.toBeNull();
    expect(getByText('Collapse')).toBeInTheDocument();
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
});
