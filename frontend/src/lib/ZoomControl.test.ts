import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import ZoomControl from './ZoomControl.svelte';
import { loadZoom, MAX_ZOOM, MIN_ZOOM } from './zoomStore';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty('--zoom-factor');
});

afterEach(() => {
  cleanup();
});

describe('ZoomControl', () => {
  it('starts at 100% and applies a matching --zoom-factor of 1', () => {
    const { getByText } = render(ZoomControl);

    expect(getByText('100%')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--zoom-factor')).toBe('1');
  });

  it('increases zoom by 10% per click and updates the CSS variable', async () => {
    const { getByLabelText, getByText } = render(ZoomControl);

    await fireEvent.click(getByLabelText('Zoom in'));

    expect(getByText('110%')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--zoom-factor')).toBe('1.1');
  });

  it('decreases zoom by 10% per click', async () => {
    const { getByLabelText, getByText } = render(ZoomControl);

    await fireEvent.click(getByLabelText('Zoom out'));

    expect(getByText('90%')).toBeInTheDocument();
  });

  it('persists the zoom level so a later load picks it up', async () => {
    const { getByLabelText } = render(ZoomControl);

    await fireEvent.click(getByLabelText('Zoom in'));
    await fireEvent.click(getByLabelText('Zoom in'));

    expect(loadZoom()).toBe(120);
  });

  it('clamps at the maximum and disables the zoom-in button', async () => {
    const { getByLabelText, getByText } = render(ZoomControl);

    for (let i = 0; i < 15; i++) {
      await fireEvent.click(getByLabelText('Zoom in'));
    }

    expect(getByText(`${MAX_ZOOM}%`)).toBeInTheDocument();
    expect((getByLabelText('Zoom in') as HTMLButtonElement).disabled).toBe(true);
  });

  it('clamps at the minimum and disables the zoom-out button', async () => {
    const { getByLabelText, getByText } = render(ZoomControl);

    for (let i = 0; i < 15; i++) {
      await fireEvent.click(getByLabelText('Zoom out'));
    }

    expect(getByText(`${MIN_ZOOM}%`)).toBeInTheDocument();
    expect((getByLabelText('Zoom out') as HTMLButtonElement).disabled).toBe(true);
  });

  it('zooms in on Ctrl+wheel-up anywhere on the page', async () => {
    render(ZoomControl);

    await fireEvent.wheel(window, { ctrlKey: true, deltaY: -100 });

    expect(document.documentElement.style.getPropertyValue('--zoom-factor')).toBe('1.1');
  });

  it('zooms out on Ctrl+wheel-down anywhere on the page', async () => {
    render(ZoomControl);

    await fireEvent.wheel(window, { ctrlKey: true, deltaY: 100 });

    expect(document.documentElement.style.getPropertyValue('--zoom-factor')).toBe('0.9');
  });

  it('ignores a plain wheel event without Ctrl held', async () => {
    render(ZoomControl);

    await fireEvent.wheel(window, { ctrlKey: false, deltaY: -100 });

    expect(document.documentElement.style.getPropertyValue('--zoom-factor')).toBe('1');
  });
});
