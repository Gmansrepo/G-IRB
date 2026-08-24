// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Project site: https://gmansrepo.github.io/G-IRB
// `base` must match the repo name or every asset 404s on Pages.
export default defineConfig({
  site: 'https://gmansrepo.github.io',
  base: '/G-IRB',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [mdx()],
});
