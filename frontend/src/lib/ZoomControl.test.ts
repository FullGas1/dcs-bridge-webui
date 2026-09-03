import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import ZoomControl from './ZoomControl.svelte';
import { MAX_ZOOM, MIN_ZOOM } from './zoomStore';

afterEach(() => {
  cleanup();
});

describe('ZoomControl (FEAT-DUAL-ZOOM: controlled page-zoom control)', () => {
  it('shows the zoom prop as a percentage', () => {
    const { getByText } = render(ZoomControl, { props: { zoom: 100 } });

    expect(getByText('100%')).toBeInTheDocument();
  });

  it('steps the bound value up by 10% on zoom-in', async () => {
    const { getByLabelText, getByText } = render(ZoomControl, { props: { zoom: 100 } });

    await fireEvent.click(getByLabelText('Zoom in'));

    expect(getByText('110%')).toBeInTheDocument();
  });

  it('steps the bound value down by 10% on zoom-out', async () => {
    const { getByLabelText, getByText } = render(ZoomControl, { props: { zoom: 100 } });

    await fireEvent.click(getByLabelText('Zoom out'));

    expect(getByText('90%')).toBeInTheDocument();
  });

  it('clamps at the maximum and disables zoom-in', async () => {
    const { getByLabelText, getByText } = render(ZoomControl, { props: { zoom: MAX_ZOOM } });

    expect((getByLabelText('Zoom in') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(getByLabelText('Zoom in'));
    expect(getByText(`${MAX_ZOOM}%`)).toBeInTheDocument();
  });

  it('clamps at the minimum (40%) and disables zoom-out', async () => {
    const { getByLabelText, getByText } = render(ZoomControl, { props: { zoom: MIN_ZOOM } });

    expect(MIN_ZOOM).toBe(40);
    expect((getByLabelText('Zoom out') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(getByLabelText('Zoom out'));
    expect(getByText('40%')).toBeInTheDocument();
  });
});
