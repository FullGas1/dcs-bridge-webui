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
