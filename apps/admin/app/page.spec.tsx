import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminHome from './page';

describe('[PLAT-001] admin skeleton', () => {
  it('[PLAT-001] root page renders the admin root container with no hard-coded text', () => {
    const html = renderToStaticMarkup(<AdminHome />);
    expect(html).toBe('<main data-testid="admin-root"></main>');
  });
});
