// Citations shown across the site (footer links, sources page).
export const SOURCES = [
  {
    name: 'ARK Community Wiki - Taming',
    url: 'https://ark.wiki.gg/wiki/Taming',
    what: 'Taming effectiveness mechanics, food values, torpor items, knockout table',
  },
  {
    name: 'ARK Community Wiki - Kibble',
    url: 'https://ark.wiki.gg/wiki/Kibble',
    what: 'Homestead kibble recipes, egg-size tiers, per-tier creature lists',
  },
  {
    name: 'ARK Community Wiki - Breeding',
    url: 'https://ark.wiki.gg/wiki/Breeding',
    what: 'Stat inheritance (55%/45%), gestation/incubation mechanics',
  },
  {
    name: 'ARK Community Wiki - Mutations',
    url: 'https://ark.wiki.gg/wiki/Mutations',
    what: 'Mutation rolls (3 × 2.5%, 7.31% at least one), 20/20 rule, +2 stat levels',
  },
  {
    name: 'ARK Community Wiki - Imprinting',
    url: 'https://ark.wiki.gg/wiki/Imprinting',
    what: 'Imprint stat bonus (+20%), rider bonus (×1.3 damage / ×0.7 taken)',
  },
  {
    name: 'ARK Smart Breeding - game data (GitHub)',
    url: 'https://github.com/cadon/ARKStatsExtractor',
    what: 'Per-species constants extracted from the ARK game files: taming affinity, food drain, torpor depletion, stat raw values',
  },
] as const;

export const METHOD_NOTE = `All calculators run the same formulas the game uses,
port of the constants extracted from ARK's game files by the open-source
ARK Smart Breeding project and documented on the ARK Community Wiki.
Nothing on this site is estimated: every number is derived from the published
game data for the current (post-Homestead, v313.5+) taming rules.`;
