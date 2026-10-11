// Generates src/data/creatures.ts, src/data/foods.ts and src/data/kibble.ts
// from the ARK Smart Breeding public game-data files (values.json,
// tamingFoodData.json, kibbles.json) and the wiki egg-tier table.
// Run: npm run generate:data  (raw inputs live in .data/, kept out of the build)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = join(root, '.data');
const values = JSON.parse(readFileSync(join(data, 'values.json'), 'utf8'));
const tamingFood = JSON.parse(readFileSync(join(data, 'tamingFoodData.json'), 'utf8'));
const kibbles = JSON.parse(readFileSync(join(data, 'kibbles.json'), 'utf8'));
const eggTiers = JSON.parse(readFileSync(join(data, 'eggTiers.json'), 'utf8'));

// ---------------------------------------------------------------------------
// Curated subset: ~55 of the most-tamed creatures (ASE base game).
// name = exact species name in ASB values.json (base variant, no variants).
// ---------------------------------------------------------------------------
const SUBSET = [
  // Early game
  ['Dodo', 'Starter meat/feather piñata', 'Early Game', 'herbivore', 'passive'],
  ['Dilophosaur', 'Early guard dog, blunt-only KO', 'Early Game', 'carnivore', 'knockout'],
  ['Parasaur', 'Trophy hunt + fear roar scout', 'Early Game', 'herbivore', 'knockout'],
  ['Phiomia', 'Early pack mule, wood/thatch', 'Early Game', 'herbivore', 'knockout'],
  ['Carbonemys', 'Early water tank', 'Early Game', 'herbivore', 'knockout'],
  ['Lystrosaurus', 'XP buff pet (passive tame)', 'Early Game', 'herbivore', 'passive'],
  ['Mesopithecus', 'Door-opening poop thrower (passive)', 'Early Game', 'herbivore', 'passive'],
  ['Oviraptor', 'Egg production boost', 'Early Game', 'omnivore', 'knockout'],
  ['Ichthyosaurus', 'Friendly ocean taxi', 'Early Game', 'piscivore', 'passive'],
  ['Pteranodon', 'First flyer', 'Early Game', 'piscivore', 'knockout'],
  ['Triceratops', 'Early battle mount, fiber', 'Early Game', 'herbivore', 'knockout'],
  ['Stegosaurus', 'Plate modes: weight/battle/harvest', 'Early Game', 'herbivore', 'knockout'],
  ['Raptor', 'Early pack hunter', 'Early Game', 'carnivore', 'knockout'],
  ['Sabertooth', 'Cave runner, hide chitin', 'Early Game', 'carnivore', 'knockout'],
  ['Pulmonoscorpius', 'Torpor tank (no narcotics while KO)', 'Early Game', 'carnivore', 'knockout'],
  ['Araneo', 'Web turret', 'Early Game', 'carnivore', 'knockout'],
  ['Dimorphodon', 'Shoulder swarm defender', 'Early Game', 'omnivore', 'knockout'],
  ['Kairuku', 'Insulation padding + polymer', 'Early Game', 'piscivore', 'knockout'],

  // Utility / harvest workhorses
  ['Ankylosaurus', 'Metal & flint king', 'Workhorse', 'herbivore', 'knockout'],
  ['Doedicurus', 'Stone/obsidian harvester', 'Workhorse', 'herbivore', 'knockout'],
  ['Castoroides', 'Wood harvester, mobile smithy', 'Workhorse', 'herbivore', 'knockout'],
  ['Argentavis', 'All-round flyer, smithy + weight', 'Workhorse', 'carnivore', 'knockout'],
  ['Mammoth', 'Wood + team buff', 'Workhorse', 'herbivore', 'knockout'],
  ['Procoptodon', 'Pouch carrier, jump mount', 'Workhorse', 'herbivore', 'knockout'],
  ['Equus', 'Fast mount, lasso, mobile mortar', 'Workhorse', 'herbivore', 'passive'],
  ['Gigantopithecus', 'Fiber picker, throws riders', 'Workhorse', 'herbivore', 'passive'],
  ['Ovis', 'Mutton & pelt source', 'Workhorse', 'herbivore', 'passive'],
  ['Daeodon', 'Healing pig', 'Workhorse', 'omnivore', 'knockout'],
  ['Therizinosaurus', 'Jack-of-all harvesting', 'Workhorse', 'herbivore', 'knockout'],
  ['Dire Bear', 'Honey lover, fiber/meat', 'Workhorse', 'omnivore', 'knockout'],
  ['Chalicotherium', "Beer tamer, turret flinger", 'Workhorse', 'herbivore', 'passive'],
  ['Paraceratherium', 'Platform safari mount', 'Workhorse', 'herbivore', 'knockout'],
  ['Megatherium', 'Bug killer, chitin harvester', 'Workhorse', 'omnivore', 'knockout'],
  ['Achatina', 'Cementing paste producer (passive)', 'Workhorse', 'herbivore', 'passive'],
  ['Dunkleosteus', 'Oil & stone on the seabed', 'Workhorse', 'carnivore', 'knockout'],
  ['Anglerfish', 'Silica pearls + light', 'Workhorse', 'carnivore', 'knockout'],
  ['Pelagornis', 'Beach organic harvester', 'Workhorse', 'piscivore', 'knockout'],
  ['Tapejara', '3-seat agile flyer', 'Workhorse', 'piscivore', 'knockout'],
  ['Karkinos', 'Dual-claw carrier', 'Workhorse', 'omnivore', 'knockout'],
  ['Rock Elemental', 'Artifact cave tank (cannon/rocket KO)', 'Workhorse', 'herbivore', 'knockout'],

  // Combat carnivores
  ['Baryonyx', 'Amphibious cave bruiser', 'Carnivore', 'piscivore', 'knockout'],
  ['Kaprosuchus', 'Grab-and-drag ambusher', 'Carnivore', 'carnivore', 'knockout'],
  ['Dimetrodon', 'Living AC for incubation', 'Carnivore', 'piscivore', 'knockout'],
  ['Terror Bird', 'Fast scout attacker', 'Carnivore', 'carnivore', 'knockout'],
  ['Woolly Rhino', 'Charge damage machine', 'Carnivore', 'herbivore', 'knockout'],
  ['Direwolf', 'Pack cave fighter', 'Carnivore', 'carnivore', 'knockout'],
  ['Thylacoleo', 'Tree-pouncing ambusher', 'Carnivore', 'carnivore', 'knockout'],
  ['Griffin', 'Dive bomber, 2-seater', 'Carnivore', 'carnivore', 'knockout'],
  ['Allosaurus', 'Pack bleed debuffer', 'Carnivore', 'carnivore', 'knockout'],
  ['Carnotaurus', 'Head-on rush fighter', 'Carnivore', 'carnivore', 'knockout'],
  ['Sarco', 'Cheap water fighter', 'Carnivore', 'carnivore', 'knockout'],
  ['Spinosaurus', 'Land+water apex', 'Carnivore', 'piscivore', 'knockout'],
  ['Yutyrannus', 'Fear-roar support buff', 'Carnivore', 'carnivore', 'knockout'],

  // Apex
  ['Rex', 'Boss-fight bread and butter', 'Apex', 'carnivore', 'knockout'],
  ['Giganotosaurus', 'Base-breaking titan (slow food)', 'Apex', 'carnivore', 'knockout'],
  ['Carcharodontosaurus', 'Giga rival, blood-buff', 'Apex', 'carnivore', 'knockout'],
  ['Quetzal', 'Flying platform crane', 'Apex', 'herbivore', 'knockout'],
  ['Mosasaurus', 'Deep-sea platform apex', 'Apex', 'carnivore', 'knockout'],
  ['Plesiosaur', 'Long-neck ocean fighter', 'Apex', 'carnivore', 'knockout'],
  ['Basilosaurus', 'Insulated, shock-immune sub', 'Apex', 'omnivore', 'passive'],
  ['Tusoteuthis', 'Grab-turret oil source', 'Apex', 'carnivore', 'passive'],
  ['Megalodon', 'Ocean workhorse predator', 'Apex', 'carnivore', 'knockout'],

  // Special-mechanic tames (no standard food-affinity table)
  ['Wyvern', 'Milk-run hatchling', 'Special', 'carnivore', 'special'],
  ['Rock Drake', 'Nameless venom hatchling', 'Special', 'carnivore', 'special'],
  ['Reaper Queen', 'Impregnation tame', 'Special', 'carnivore', 'special'],
  ['Titanosaur', '3-day walking siege engine', 'Special', 'herbivore', 'special'],
];

// Notes for special-mechanic creatures shown in the UI.
const SPECIAL_NOTES = {
  'Wyvern': 'Hatched from wild eggs (Scorched Earth / Ragnarok / Valguero). Raise on Wyvern Milk — no standard food-affinity taming.',
  'Rock Drake': 'Hatched from wild nests (Aberration / Genesis 2 / Fjordur). Raise on Nameless Venom.',
  'Reaper Queen': 'Tamed by letting a wild Reaper Queen impregnate you at low health, then surviving the birth. No food table applies.',
  'Titanosaur': 'KO with cannons/rockets; tames at fixed level, starves after ~16–20h on official settings, cannot be fed. One tame per instance.',
  'Carcharodontosaurus': 'Knock out with tranqs, then tame by feeding it creature corpses (drag them close). Builds a feeding-frenzy meter instead of using the standard food-affinity table.',
};

// Egg-name aliases from the wiki tiers -> species names in values.json.
const EGG_ALIASES = {
  Dilo_Egg: 'Dilophosaur', Dodo_Egg: 'Dodo', Kairuku_Egg: 'Kairuku',
  Lystro_Egg: 'Lystrosaurus', Parasaur_Egg: 'Parasaur', Vulture_Egg: null,
  Archaeopteryx_Egg: null, Compy_Egg: null, Dimorph_Egg: 'Dimorphodon',
  Gallimimus_Egg: null, Hesperornis_Egg: null, Oviraptor_Egg: 'Oviraptor',
  Pteranodon_Egg: 'Pteranodon', Raptor_Egg: 'Raptor', Trike_Egg: 'Triceratops',
  Ankylo_Egg: 'Ankylosaurus', Baryonyx_Egg: 'Baryonyx', Carbonemys_Egg: 'Carbonemys',
  Carno_Egg: 'Carnotaurus', Dimetrodon_Egg: 'Dimetrodon', Diplo_Egg: null,
  Ichthyornis_Egg: null, Iguanodon_Egg: null, Kaprosuchus_Egg: 'Kaprosuchus',
  Kentro_Egg: null, Pachyrhino_Egg: null, Pelagornis_Egg: 'Pelagornis',
  Pulmonoscorpius_Egg: 'Pulmonoscorpius', Sarco_Egg: 'Sarco', Stego_Egg: 'Stegosaurus',
  Terror_Bird_Egg: 'Terror Bird', Thorny_Dragon_Egg: null, Troodon_Egg: null,
  Velonasaur_Egg: null, Allosaurus_Egg: 'Allosaurus', Argentavis_Egg: 'Argentavis',
  Griffin_Egg: 'Griffin', Megalania_Egg: null, Megalosaurus_Egg: null,
  Moschops_Egg: null, Snow_Owl_Egg: null, Spino_Egg: 'Spinosaurus',
  Tapejara_Egg: 'Tapejara', Titanoboa_Egg: null, Tropeognathus_Egg: null,
  Basilisk_Egg: null, Bronto_Egg: null, Carcharodontosaurus_Egg: 'Carcharodontosaurus',
  Giganotosaurus_Egg: 'Giganotosaurus', Megachelon_Egg: null, Quetzal_Egg: 'Quetzal',
  Rex_Egg: 'Rex', Therizino_Egg: 'Therizinosaurus', Crystal_Wyvern_Egg: null,
  Deinonychus_Egg: null, Magmasaur_Egg: null, Rock_Drake_Egg: 'Rock Drake',
  Voidwyrm_Egg: null, Wyvern_Egg: 'Wyvern', Yutyrannus_Egg: 'Yutyrannus',
};

const KIBBLE_TIERS = ['Basic', 'Simple', 'Regular', 'Superior', 'Exceptional', 'Extraordinary'];

// Build species name -> egg size map.
const eggBySpecies = {};
for (const [tier, eggs] of Object.entries(eggTiers)) {
  for (const egg of eggs) {
    const base = egg.replace(/_Egg.*$/, '');
    const sp = EGG_ALIASES[egg] ?? EGG_ALIASES[base];
    if (sp) eggBySpecies[sp] = tier;
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const NAME_ALIASES = {
  Therizinosaurus: 'Therizinosaur',
  Spinosaurus: 'Spino',
  Wyvern: 'Fire Wyvern',
};

function findSpecies(name) {
  const real = NAME_ALIASES[name] || name;
  const bad = /Corrupt|Mega|Ghost|Skeleton|Summoned|Bionic|Retrieve|Mission|Gauntlet|LifeSupport|Escort|Volcano|Minion|Event/i;
  const cands = values.species.filter(
    (s) => s.name === real && s.taming && s.taming.affinityNeeded0 !== undefined
  );
  const score = (s) => {
    let n = (s.variants || []).filter((v) => !bad.test(v)).length * 2;
    if (bad.test(s.blueprintPath || '')) n += 20;
    const bp = s.blueprintPath || '';
    if (/PrimalEarth/.test(bp)) n -= 8;
    else if (/ScorchedEarth|Aberration|Extinction/.test(bp)) n -= 5;
    else if (/Mods/.test(bp)) n -= 3;
    return n;
  };
  return cands.sort((a, b) => score(a) - score(b))[0] || null;
}

function derivePreferredKibble(eats, special) {
  const fullValue = [];
  for (const tier of KIBBLE_TIERS) {
    const food = `${tier} Kibble`;
    if (!eats || !eats.includes(food)) continue;
    const sv = special && special[food];
    // preferred-class kibbles keep the default affinity (400); non-preferred
    // are overridden down to 16 in the game data.
    if (!sv || sv.a >= 100) fullValue.push(tier);
  }
  if (!fullValue.length) return null;
  // lowest tier that gives full affinity = the preferred class
  return fullValue.sort((a, b) => KIBBLE_TIERS.indexOf(a) - KIBBLE_TIERS.indexOf(b))[0];
}

const STAT_KEYS = [0, 1, 2, 3, 4, 7, 8, 9];
const out = [];
const missing = [];

for (const [name, role, group, diet, method] of SUBSET) {
  const sp = findSpecies(name);
  if (!sp || !sp.taming) {
    missing.push(name);
    continue;
  }
  const t = sp.taming;
  const tf = tamingFood.tamingFoodData[sp.name] || {};
  const eats = tf.eats || [];
  const special = tf.specialFoodValues || {};
  // Tame method from the game data; the special-mechanic list overrides.
  const dataMethod = t.violent ? 'knockout' : t.nonViolent ? 'passive' : 'special';
  const method = SPECIAL_NOTES[name] ? 'special' : dataMethod;
  const stats = {};
  for (const k of STAT_KEYS) {
    const raw = sp.fullStatsRaw?.[k];
    if (raw) stats[k] = raw.slice(0, 5);
  }
  const br = sp.breeding || null;
  out.push({
    name: sp.name,
    slug: slugify(name),
    diet, role, group,
    tameMethod: method,
    note: SPECIAL_NOTES[name] || undefined,
    torporBase: stats[2]?.[0] ?? 0,
    torporIncPerLevel: stats[2]?.[1] ?? 0,
    stats,
    tamedBaseHealthMultiplier: sp.TamedBaseHealthMultiplier ?? 1,
    taming: {
      affinityNeeded0: t.affinityNeeded0,
      affinityIncreasePL: t.affinityIncreasePL,
      tamingIneffectiveness: t.tamingIneffectiveness,
      torporDepletionPS0: t.torporDepletionPS0,
      foodConsumptionBase: t.foodConsumptionBase,
      foodConsumptionMult: t.foodConsumptionMult,
      wakeAffinityMult: t.wakeAffinityMult,
      wakeFoodDeplMult: t.wakeFoodDeplMult,
    },
    specialFoodValues: special,
    eats,
    preferredKibble: derivePreferredKibble(eats, special),
    eggSize: eggBySpecies[name] ?? null,
    breeding: br ? {
      incubationTime: br.incubationTime || 0,
      gestationTime: br.gestationTime || 0,
      eggTempMinC: br.eggTempMin ?? null,
      eggTempMaxC: br.eggTempMax ?? null,
      maturationTime: br.maturationTime || 0,
      matingCooldownMinS: br.matingCooldownMin || 0,
      matingCooldownMaxS: br.matingCooldownMax || 0,
    } : null,
  });
}

if (missing.length) console.warn('!! Missing species:', missing.join(', '));

const banner = `// AUTO-GENERATED by scripts/generate-data.mjs — do not edit by hand.
// Source: ARK game files as published by the ARK Smart Breeding project
// (github.com/cadon/ARKStatsExtractor, values v${values.version}, taming food v${tamingFood.version})
// cross-checked with the ARK Community Wiki (ark.wiki.gg). Subset: ${out.length} popular creatures.
import type { Creature } from './types';

export const DATA_VERSION = '${tamingFood.version}';
export const CREATURE_COUNT = ${out.length};

export const creatures: Creature[] = ${JSON.stringify(out, null, 2)};
`;

mkdirSync(join(root, 'src/data'), { recursive: true });
writeFileSync(join(root, 'src/data/creatures.ts'), banner);
console.log(`creatures.ts: ${out.length} creatures written`);

// foods.ts — global default food values
const defaults = tamingFood.tamingFoodData.default.specialFoodValues;
const foodsBanner = `// AUTO-GENERATED by scripts/generate-data.mjs — do not edit by hand.
// Global default per-food taming values (any creature-specific overrides live
// in each creature's specialFoodValues). Source: ARK Smart Breeding tamingFoodData.json v${tamingFood.version}.
import type { FoodValues } from './types';

export const DEFAULT_FOODS: Record<string, FoodValues> = ${JSON.stringify(defaults, null, 2)};

/** Foods excluded from the calculator UI (legacy/ASA-only items). */
export const HIDDEN_FOODS = ['Kibble', 'Archelon Algae (ASA)', 'Stimberry',
  'Basic Augmented Kibble', 'Simple Augmented Kibble', 'Regular Augmented Kibble',
  'Superior Augmented Kibble', 'Exceptional Augmented Kibble', 'Extraordinary Augmented Kibble'];
`;
writeFileSync(join(root, 'src/data/foods.ts'), foodsBanner);
console.log('foods.ts written');

// kibble.ts — recipes + tier info
const recipes = kibbles.kibble;
const recipeNotes = {
  Basic: 'Preferred by most extra-small-egg early creatures.',
  Simple: 'Preferred by small-egg creatures.',
  Regular: 'Preferred by medium-egg creatures.',
  Superior: 'Preferred by large-egg creatures.',
  Exceptional: 'Preferred by extra-large-egg creatures.',
  Extraordinary: 'Preferred by special-egg creatures.',
};
const kibbleOut = KIBBLE_TIERS.map((tier) => ({
  tier,
  eggSize: tier === 'Basic' ? 'Extra Small Egg' : tier === 'Simple' ? 'Small Egg'
    : tier === 'Regular' ? 'Medium Egg' : tier === 'Superior' ? 'Large Egg'
    : tier === 'Exceptional' ? 'Extra Large Egg' : 'Special Egg',
  recipe: Object.entries(recipes[tier]).map(([ingredient, qty]) => ({ ingredient, qty })),
  note: recipeNotes[tier],
}));
const kibbleBanner = `// AUTO-GENERATED by scripts/generate-data.mjs — do not edit by hand.
// Homestead kibble recipes (ASE). Source: ASB kibbles.json v${kibbles.ver},
// cross-checked with ark.wiki.gg/wiki/Kibble.

export interface KibbleInfo {
  tier: string;
  eggSize: string;
  recipe: { ingredient: string; qty: number }[];
  note: string;
}

export const KIBBLE_TIERS = ${JSON.stringify(KIBBLE_TIERS)};

export const kibbleRecipes: KibbleInfo[] = ${JSON.stringify(kibbleOut, null, 2)};
`;
writeFileSync(join(root, 'src/data/kibble.ts'), kibbleBanner);
console.log('kibble.ts written');

// Egg tier -> creatures that lay them (for the kibble chart)
const eggLayers = {};
for (const c of out) {
  if (c.eggSize) {
    (eggLayers[c.eggSize] ||= []).push(c.name);
  }
}
const eggBanner = `// AUTO-GENERATED by scripts/generate-data.mjs — do not edit by hand.
// Which creatures in our subset lay which egg size (wiki egg-tier tables).

export const EGG_LAYERS: Record<string, string[]> = ${JSON.stringify(eggLayers, null, 2)};
`;
writeFileSync(join(root, 'src/data/eggs.ts'), eggBanner);
console.log('eggs.ts written');
