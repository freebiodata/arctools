// Taming math for ARK: Survival Evolved, ported from the formulas the ARK
// Smart Breeding project extracted from the game files (Taming.cs) and
// documented on ark.wiki.gg/wiki/Taming.
//
// Model summary:
//   affinityNeeded   = affinityNeeded0 + affinityIncreasePL × level
//   foodAffinity     = a × q × serverRate × 4      (4 = two hardcoded 2x
//                      taming bonuses from patches 253.0 and 313.5)
//   feedings         = ceil(affinityNeeded / foodAffinity)
//   seconds          = ceil(feedings × foodValue / (foodConsumptionBase
//                      × foodConsumptionMult × drainMultipliers))
//   TE               = 1 / (1 + ineffectiveness × Σ(feedings / foodAffinity))
//   bonusLevels      = floor(level × TE / 2)
//   torporTotal      = torporBase × (1 + incPerLevel × (level − 1))
//   torporDepletion  = td0 + (level−1)^0.800403041 / (22.39671632 / td0)  per s
//   narcotics        = ceil(maxTorporDeficit / (40 + 8 × depletion))

import type { Creature, FoodValues } from '../data/types';
import { DEFAULT_FOODS, HIDDEN_FOODS } from '../data/foods';

/** Hardcoded taming bonus baked into the live game since patch 313.5. */
export const HARD_CODED_TAMING_MULTIPLIER = 4;

export interface ServerSettings {
  /** Server taming speed multiplier (1x…50x). */
  tamingSpeed: number;
  /** Extra event multiplier (e.g. 2 for a 2x weekend) stacked on top. */
  eventMultiplier: number;
  /** DinoCharacterFoodDrainMultiplier (1 for official). */
  foodDrainMultiplier: number;
  /** WildDinoCharacterFoodDrainMultiplier (1 for official). */
  wildFoodDrainMultiplier: number;
}

export const DEFAULT_SERVER: ServerSettings = {
  tamingSpeed: 1,
  eventMultiplier: 1,
  foodDrainMultiplier: 1,
  wildFoodDrainMultiplier: 1,
};

/** Torpor values of common knockout tools (per hit, before headshot x2.5). */
export const TRANQ_TOOLS: { name: string; torpor: number; note?: string }[] = [
  { name: 'Shocking Tranq Dart (longneck)', torpor: 442 },
  { name: 'Tranq Dart (longneck)', torpor: 221 },
  { name: 'Tranq Spear Bolt (harpoon)', torpor: 306 },
  { name: 'Electric Prod', torpor: 226, note: 'durability-limited' },
  { name: 'Tranq Arrow (crossbow)', torpor: 157.5 },
  { name: 'Tranq Arrow (bow)', torpor: 90 },
  { name: 'Slingshot (stone)', torpor: 24.5 },
  { name: 'Wooden Club', torpor: 10 },
];

export function getFoodValues(creature: Creature, foodName: string): FoodValues | null {
  if (!creature.eats.includes(foodName)) return null;
  const sv = creature.specialFoodValues[foodName];
  if (sv) return { q: 1, ...sv };
  const def = DEFAULT_FOODS[foodName];
  return def ? { q: 1, ...def } : null;
}

/** Food names worth offering in the UI for a creature, best first. */
export function usableFoods(creature: Creature): string[] {
  return creature.eats.filter((f) => !HIDDEN_FOODS.includes(f));
}

/** Effective affinity per feeding including server multipliers. */
export function effectiveAffinity(
  creature: Creature,
  food: FoodValues,
  server: ServerSettings,
): number {
  let a = food.a * (food.q ?? 1);
  if (creature.tameMethod === 'passive' && creature.taming.wakeAffinityMult) {
    a *= creature.taming.wakeAffinityMult;
  }
  a *= server.tamingSpeed * server.eventMultiplier * HARD_CODED_TAMING_MULTIPLIER;
  return a;
}

export interface TamingResult {
  /** Number of feedings (a feeding may consume multiple items, see itemsEach). */
  feedings: number;
  /** Items consumed per feeding. */
  itemsEach: number;
  /** Total items of this food the tame will consume. */
  itemsTotal: number;
  /** Total taming time in seconds. */
  seconds: number;
  /** Final taming effectiveness 0..1 (no damage taken). */
  tamingEffectiveness: number;
  /** Post-tame bonus levels. */
  bonusLevels: number;
  /** Creature level after tame. */
  levelAfterTame: number;
  /** Maximum possible level after tame (perfect 100% TE). */
  maxLevelAfterTame: number;
  /** Torpor of the wild creature at this level. */
  torporTotal: number;
  /** Torpor depletion per second while KO'd. */
  torporDepletionPS: number;
  /** Extra torpor that must be maintained over the tame. */
  torporDeficit: number;
  narcotics: number;
  narcoberries: number;
  bioToxin: number;
  /** Seconds until the KO'd creature wakes with no further torpor. */
  wakeTimerS: number;
}

export function torporAtLevel(creature: Creature, level: number): number {
  return creature.torporBase * (1 + creature.torporIncPerLevel * (level - 1));
}

export function torporDepletionPerSecond(creature: Creature, level: number): number {
  const td0 = creature.taming.torporDepletionPS0;
  if (!td0) return 0;
  // Exponential fit from Crumplecorn's decompiled-game analysis, used by ASB.
  return td0 + Math.pow(level - 1, 0.800403041) / (22.39671632 / td0);
}

export function computeTaming(
  creature: Creature,
  level: number,
  foodName: string,
  server: ServerSettings = DEFAULT_SERVER,
): TamingResult | null {
  const food = getFoodValues(creature, foodName);
  if (!food) return null;
  const t = creature.taming;

  const affinityNeeded = t.affinityNeeded0 + t.affinityIncreasePL * level;
  const aff = effectiveAffinity(creature, food, server);
  if (aff <= 0) return null;

  const feedings = Math.ceil(affinityNeeded / aff);
  const itemsEach = Math.max(1, food.q ?? 1);
  const itemsTotal = feedings * itemsEach;

  let foodValue = food.f;
  if (creature.tameMethod === 'passive' && t.wakeFoodDeplMult) {
    foodValue *= t.wakeFoodDeplMult;
  }
  const drainRate =
    t.foodConsumptionBase * t.foodConsumptionMult *
    server.foodDrainMultiplier * server.wildFoodDrainMultiplier;
  const seconds = Math.ceil((feedings * foodValue) / drainRate);

  // TE formula from the decompiled game: 1/(1 + IM·Σ(N/A)) - ASB Taming.cs.
  const teRaw = 1 / (1 + t.tamingIneffectiveness * (feedings / aff));
  const tamingEffectiveness = Math.max(0, Math.min(1, teRaw));

  const bonusLevels = Math.floor((level * tamingEffectiveness) / 2);

  const torporTotal = torporAtLevel(creature, level);
  const depl = creature.tameMethod === 'knockout' ? torporDepletionPerSecond(creature, level) : 0;
  const torporDeficit = Math.max(0, depl * seconds - torporTotal);

  return {
    feedings,
    itemsEach,
    itemsTotal,
    seconds,
    tamingEffectiveness,
    bonusLevels,
    levelAfterTame: level + bonusLevels,
    maxLevelAfterTame: level + Math.floor(level / 2),
    torporTotal,
    torporDepletionPS: depl,
    torporDeficit,
    narcotics: torporDeficit > 0 ? Math.ceil(torporDeficit / (40 + 8 * depl)) : 0,
    narcoberries: torporDeficit > 0 ? Math.ceil(torporDeficit / (7.5 + 3 * depl)) : 0,
    bioToxin: torporDeficit > 0 ? Math.ceil(torporDeficit / (80 + 16 * depl)) : 0,
    wakeTimerS: depl > 0 ? Math.floor(torporTotal / depl) : 0,
  };
}

/** Tranq tool hits needed to knock the creature out (body shots). */
export function tranqHits(creature: Creature, level: number, toolTorpor: number): number {
  return Math.ceil(torporAtLevel(creature, level) / toolTorpor);
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}
