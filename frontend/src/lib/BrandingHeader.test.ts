import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import BrandingHeader from './BrandingHeader.svelte';

afterEach(() => {
  cleanup();
});

describe('BrandingHeader', () => {
  it('renders one local image conveying the app, no inline SVG left over', () => {
    const { container } = render(BrandingHeader);

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]!.getAttribute('src')).toBe('/banner.jpg');
    expect(container.querySelectorAll('svg')).toHaveLength(0);
  });

  it('does not reference any DCS World / Eagle Dynamics trademarked term in its accessible text', () => {
    const { container } = render(BrandingHeader);

    const img = container.querySelector('img')!;
    const accessibleText = (img.getAttribute('alt') ?? '').toLowerCase();
    for (const term of ['eagle dynamics', 'dcs world', 'digital combat simulator']) {
      expect(accessibleText).not.toContain(term);
    }
  });
});
