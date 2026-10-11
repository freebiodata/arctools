// Shared data types for ARKTools.
// Data model mirrors the game-file values published by the ARK Smart Breeding
// project (values.json / tamingFoodData.json) and cross-checked against the
// ARK Community Wiki (ark.wiki.gg). See src/data/sources.ts for citations.

export type Diet = 'carnivore' | 'herbivore' | 'omnivore' | 'piscivore';

export type TameMethod = 'knockout' | 'passive' | 'special';

export type StatIndex = 0 | 1 | 2 | 3 | 4 | 7 | 8 | 9;

/** Raw species stat array as extracted from the game files. */
// [BaseValue, IncPerWildLevel, IncPerDomLevel, AddWhenTamed, MultAffinity]
export type StatRaw = [number, number, number, number, number];

export interface FoodValues {
  /** Food value (hunger points restored per item) at 1x. */
  f: number;
  /** Taming affinity gained per item at 1x, before server multipliers. */
  a: number;
  /** Items consumed per feeding (e.g. Tusoteuthus eats 50 Black Pearls at once). */
  q?: number;
  /** True when the source flags the value as not fully confirmed. */
  u?: boolean;
}

export interface BreedingInfo {
  /** Incubation time in seconds (egg layers); 0 for live birth. */
  incubationTime: number;
  /** Gestation time in seconds (live bearers); 0 for egg layers. */
  gestationTime: number;
  eggTempMinC: number | null;
  eggTempMaxC: number | null;
  /** Maturation time in seconds at 1x. */
  maturationTime: number;
  matingCooldownMinS: number;
  matingCooldownMaxS: number;
}

export interface Creature {
  /** Display name. */
  name: string;
  /** URL-safe identifier. */
  slug: string;
  diet: Diet;
  tameMethod: TameMethod;
  /** Short role blurb shown in tables. */
  role: string;
  /** Rough tame difficulty/popularity bucket for grouping in the UI. */
  group: string;
  /** Extra mechanics note (special foods, traps, caveats). */
  note?: string;

  /** Torpor base value and per-wild-level increment. */
  torporBase: number;
  torporIncPerLevel: number;
  /** Base stats for display: raw game stat arrays keyed by stat index. */
  stats: Partial<Record<StatIndex, StatRaw>>;
  tamedBaseHealthMultiplier: number;

  taming: {
    /** Affinity required at level 0 (base constant of the linear model). */
    affinityNeeded0: number;
    /** Additional affinity per wild level. */
    affinityIncreasePL: number;
    /** Taming ineffectiveness multiplier (TE loss constant). */
    tamingIneffectiveness: number;
    /** Torpor depletion per second at level 1 (exponential model input). Absent for passive tames. */
    torporDepletionPS0?: number;
    foodConsumptionBase: number;
    foodConsumptionMult: number;
    /** Passive-tame affinity multiplier (wake taming). */
    wakeAffinityMult?: number;
    /** Passive-tame food depletion multiplier (wake taming). */
    wakeFoodDeplMult?: number;
  };

  /** Per-food values for this creature; falls back to the global defaults. */
  specialFoodValues: Record<string, FoodValues>;
  /** Food names the creature eats while being tamed. */
  eats: string[];
  /** Preferred kibble class derived from per-food affinity values. */
  preferredKibble: string | null;

  /** Egg size tier used for kibble recipes; null = no usable eggs. */
  eggSize: string | null;

  breeding: BreedingInfo | null;
}

export const STAT_NAMES: Record<StatIndex, string> = {
  0: 'Health',
  1: 'Stamina',
  2: 'Torpor',
  3: 'Oxygen',
  4: 'Food',
  7: 'Weight',
  8: 'Melee',
  9: 'Speed',
};
