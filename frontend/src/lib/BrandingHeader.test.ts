import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import BrandingHeader from './BrandingHeader.svelte';

afterEach(() => {
  cleanup();
});

describe('BrandingHeader', () => {
  it('renders one image conveying the app, with no external asset requests', () => {
    const { getByRole, container } = render(BrandingHeader);

    expect(getByRole('img')).toBeInTheDocument();
    // Hand-drawn inline SVG only - no <img src>, no background-image url(), nothing to fetch.
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('does not reference any DCS World / Eagle Dynamics trademarked asset', () => {
    const { container } = render(BrandingHeader);

    const markup = container.innerHTML.toLowerCase();
    for (const term of ['eagle dynamics', 'dcs world', '.png', '.jpg', '.jpeg', 'digital combat simulator']) {
      expect(markup).not.toContain(term);
    }
  });
});
