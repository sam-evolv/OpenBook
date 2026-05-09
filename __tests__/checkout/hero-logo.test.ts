import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import Hero from '../../app/c/[token]/components/Hero';

const baseBusiness = {
  name: 'Evolv Performance',
  category: 'fitness',
  city: 'Dublin',
  tagline: null,
  primary_colour: '#D4AF37',
};

describe('Hero (checkout page header)', () => {
  it('renders the logo to the left of the business name when logo_url is set', () => {
    const html = renderToStaticMarkup(
      createElement(Hero, {
        business: {
          ...baseBusiness,
          logo_url: 'https://example.com/logo.png',
        },
      }),
    );

    expect(html).toContain('<img');
    expect(html).toContain('src="https://example.com/logo.png"');
    expect(html).toContain('alt="Evolv Performance logo"');
    expect(html).toContain('width="48"');
    expect(html).toContain('height="48"');
    expect(html).toContain('Evolv Performance');
  });

  it('omits the logo entirely when logo_url is null', () => {
    const html = renderToStaticMarkup(
      createElement(Hero, {
        business: { ...baseBusiness, logo_url: null },
      }),
    );

    expect(html).not.toMatch(/<img\b/);
    expect(html).not.toContain('Evolv Performance logo');
    expect(html).toContain('Evolv Performance');
  });
});
