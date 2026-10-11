# ARKTools - arctools.top

Taming, breeding, kibble and stat calculators for **ARK: Survival Evolved**.
Static site built with [Astro](https://astro.build), deployed on **Cloudflare Pages**.

## Tools

| Page | What it does |
|---|---|
| `/taming-calculator` | Food count, tame time, taming effectiveness, post-tame level, narcotics, tranq counts and a per-food comparison for 1x–50x server rates |
| `/breeding-calculator` | 55/45 stat-inheritance probability, mutation odds (3 × 2.5% rolls, 20/20 rule), expected eggs for a perfect baby |
| `/kibble-chart` | All six Homestead kibble recipes, egg-size tiers, egg layers, and a preferred-kibble reverse lookup |
| `/stat-calculator` | Wild vs tamed vs imprinted stat projection through TE, imprinting (+20%) and domestic levels |
| `/faq`, `/sources` | Mechanics explainers with citations; data provenance and coverage |

## Data & math

All numbers come from the game's own formulas:

- Species constants (taming affinity, food drain, torpor depletion, raw stat values)
  extracted from the ARK game files and published by the open-source
  [ARK Smart Breeding](https://github.com/cadon/ARKStatsExtractor) project.
- Mechanics cross-checked against the [ARK Community Wiki](https://ark.wiki.gg)
  (Taming, Kibble, Breeding, Mutations, Imprinting pages).
- Coverage is a **curated 66-creature subset** of the most-tamed creatures;
  special-mechanic tames (Wyvern, Rock Drake, Reaper, Titanosaur, Carcharodontosaurus)
  are documented and flagged instead of silently miscomputed.

The raw game-data files live in `.data/` (not deployed). To regenerate the
`src/data/*.ts` files after updating them:

```bash
npm run generate:data
```

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm test           # vitest - hand-worked example suite
npm run build      # static build to dist/
npm run preview    # serve the build locally
```

## Test suite

`src/tests/calculators.test.ts` pins the math to community-known values,
including: level 150 Rex + Exceptional Kibble at 1x = 17 kibble, ~58 min,
98.7% TE, level 224; level 150 Tusoteuthis = 200 Black Pearls; Equus 150 =
23 Rockarrot; 7.31% at-least-one-mutation chance; 225 post-tame ceiling.

## Deploy (Cloudflare Pages)

**Option A - dashboard (recommended):**
1. Push this folder to a Git repository.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build command: `npm run build` · Build output directory: `dist`
4. Add custom domain `arctools.top` in the Pages project settings.

**Option B - CLI:**

```bash
npm run build
npx wrangler pages deploy dist --project-name=arktools
```

`wrangler.toml` pins `pages_build_output_dir = "dist"`; `public/_headers` sets
security headers and immutable caching for hashed assets.

## License & attribution

Code: MIT. Data: game facts used under community-documentation norms, cited on
`/sources`. Not affiliated with or endorsed by Studio Wildcard.
