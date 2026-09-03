import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import CodeMirrorEditor from './CodeMirrorEditor.svelte';
import { MAX_COLLAPSED_LINES } from './layoutConstants';

afterEach(() => {
  cleanup();
});

function linesOf(n: number): string {
  return Array.from({ length: n }, (_, i) => `local v${i} = ${i}`).join('\n');
}

describe('CodeMirrorEditor - ticket 02 collapsed-height reporting', () => {
  it('reports null (natural sizing) for content under the collapsed-lines threshold', () => {
    const onHeightChange = vi.fn();
    render(CodeMirrorEditor, {
      props: { initialValue: linesOf(3), onChange: vi.fn(), onHeightChange },
    });

    expect(onHeightChange).toHaveBeenCalledWith(null);
  });

  it('reports an explicit px height once content reaches the collapsed-lines threshold', () => {
    const onHeightChange = vi.fn();
    render(CodeMirrorEditor, {
      props: {
        initialValue: linesOf(MAX_COLLAPSED_LINES + 5),
        onChange: vi.fn(),
        onHeightChange,
      },
    });

    const lastCall = onHeightChange.mock.calls.at(-1);
    expect(lastCall?.[0]).not.toBeNull();
    expect(typeof lastCall?.[0]).toBe('number');
  });

  it('never reports a negative collapsed height when the container measures short (stale layout after a bulk setValue)', () => {
    // Simulates the real bug: right after replacing the whole doc (dropped file / loaded
    // template) the new lines are not laid out, so scrollHeight reads far short of the real
    // content height. The old formula produced a negative px height, which CSS drops - leaving
    // the editor uncapped and stuck (FIX-EDITOR-DROP-HEIGHT).
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(40);
    const onHeightChange = vi.fn();

    render(CodeMirrorEditor, {
      props: { initialValue: linesOf(MAX_COLLAPSED_LINES + 25), onChange: vi.fn(), onHeightChange },
    });

    const reported = onHeightChange.mock.calls.at(-1)?.[0];
    expect(reported).not.toBeNull();
    expect(reported).toBeGreaterThanOrEqual(0);
  });

  it('re-reports as the document changes, switching from null to an explicit height when it crosses the threshold', () => {
    const onHeightChange = vi.fn();
    const { component } = render(CodeMirrorEditor, {
      props: { initialValue: linesOf(3), onChange: vi.fn(), onHeightChange },
    });
    expect(onHeightChange).toHaveBeenLastCalledWith(null);

    // setValue() goes through the same dispatch/updateListener path a real edit does (it's the
    // same escape hatch templates use to replace a widget's script - see Widget.svelte).
    (component as unknown as { setValue: (v: string) => void }).setValue(
      linesOf(MAX_COLLAPSED_LINES + 5),
    );

    const lastCall = onHeightChange.mock.calls.at(-1);
    expect(lastCall?.[0]).not.toBeNull();
  });
});

describe('CodeMirrorEditor - zoom must never touch document content', () => {
  it('leaves getValue() unchanged when an ancestor CSS zoom changes', () => {
    const { component, container } = render(CodeMirrorEditor, {
      props: { initialValue: 'return 42', onChange: vi.fn() },
    });
    const editor = component as unknown as { getValue: () => string };
    const before = editor.getValue();

    // FEAT-DUAL-ZOOM applies CSS `zoom` on the .page wrapper / the .widget - purely visual,
    // never a view.dispatch().
    (container.parentElement as HTMLElement).style.zoom = '1.5';

    expect(editor.getValue()).toBe(before);
  });
});
