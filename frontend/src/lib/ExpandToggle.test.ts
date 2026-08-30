import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import ExpandToggle from './ExpandToggle.svelte';

afterEach(() => {
  cleanup();
});

describe('ExpandToggle', () => {
  it('shows "Expand <area>" and calls onToggle when collapsed', async () => {
    const onToggle = vi.fn();
    const { getByText } = render(ExpandToggle, { props: { expanded: false, onToggle, area: 'Editor' } });

    const button = getByText('Expand Editor');
    await fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('shows "Collapse <area>" when expanded', () => {
    const { getByText } = render(ExpandToggle, {
      props: { expanded: true, onToggle: vi.fn(), area: 'Result' },
    });

    expect(getByText('Collapse Result')).toBeInTheDocument();
  });
});
