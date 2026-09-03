import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import WidgetContextMenu from './WidgetContextMenu.svelte';

afterEach(() => cleanup());

function props(items = [{ label: 'Save as…', onSelect: vi.fn() }], onClose = vi.fn()) {
  return { x: 20, y: 30, items, onClose };
}

describe('WidgetContextMenu', () => {
  it('renders the given items at the given position', () => {
    const { getByText, container } = render(WidgetContextMenu, { props: props() });

    expect(getByText('Save as…')).toBeInTheDocument();
    const menu = container.querySelector('.widget-context-menu') as HTMLElement;
    expect(menu.style.left).toBe('20px');
    expect(menu.style.top).toBe('30px');
  });

  it('calls the item\'s onSelect and then closes when an item is clicked', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const { getByText } = render(WidgetContextMenu, {
      props: props([{ label: 'Save as…', onSelect }], onClose),
    });

    await fireEvent.click(getByText('Save as…'));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(WidgetContextMenu, { props: props(undefined, onClose) });

    await fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on a pointerdown outside the menu but not inside it', async () => {
    const onClose = vi.fn();
    const { getByText } = render(WidgetContextMenu, { props: props(undefined, onClose) });

    await fireEvent.pointerDown(getByText('Save as…'));
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
