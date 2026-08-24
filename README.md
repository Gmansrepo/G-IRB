# G-IRB

A knowledge base on internal ratings-based (IRB) credit risk models, built with
[Astro](https://astro.build) and deployed to GitHub Pages at
<https://gmansrepo.github.io/G-IRB>.

## Running it

```bash
npm install
npm run dev      # http://localhost:4321/G-IRB/
npm run build    # -> dist/
npm run preview  # serve the built output
```

The dev server serves at `/G-IRB/`, not `/`. That matches production, where the
site lives under the repository name.

## Layout

```
src/
  content/topics/     the writing — .mdx so posts can embed components
  components/viz/     interactive explainers
  lib/irb.ts          IRB maths, shared by every visualisation
  styles/tokens.css   the design system: palette, type, primitives
  pages/              routes
  data/               source data parsed at build time
public/               copied verbatim; includes .nojekyll
```

## Adding a topic

Drop an `.mdx` file in `src/content/topics/`:

```mdx
---
title: "Calibration"
summary: "One sentence for the index page."
date: 2026-09-01
tags: ["PD"]
draft: false
---

import SomeViz from '../../components/viz/SomeViz.astro';

Prose sits at a readable measure.

<SomeViz />
```

Anything with `draft: true` is excluded from the build.

## Two rules worth remembering

**Never hardcode a leading `/` in an internal link.** The site is served from
`/G-IRB/`, so `/about` 404s. Use the helper:

```astro
import { url } from '../lib/url';
<a href={url('about')}>About</a>
```

**Visualisations that inject SVG need global styles**, not Astro's scoped ones —
scoped styles never reach `innerHTML` content. See `SupervisoryFormula.astro`,
where every class is `sf-` prefixed to keep the global block from leaking.

## Numerics

`src/lib/irb.ts` was verified against Python's `statistics.NormalDist`: maximum
risk-weight error 6.7e-5 percentage points across PD in [0.03%, 30%]. Corporate
PD=1%, LGD=45%, M=2.5 returns 92.32%, matching the published Basel benchmark.
The verification harness is in `poc/`.
