// Stat accounting: wild vs tamed vs imprinted. Formula ported from ASB's
// StatValueCalculation (game-extracted constants):
//   tamed = (Base × (1 + (wild+mut)·IncWild) × TBHPM × imprintM + AddWhenTamed)
//           × (1 + MultAffinity·TE) × (1 + dom·IncDom)
//   wild  = Base × (1 + wild·IncWild)
// Imprint multipliers (ASE defaults): +20% on every stat except Stamina,
// Oxygen and Crafting; flyers additionally get no Speed bonus.

import type { Creature, StatIndex, StatRaw } from '../data/types';

// Imprint bonus applies to Health, Food, Weight, Melee (plus hidden Torpor /
// Water); Stamina, Oxygen and Crafting get nothing. Water isn't a tracked stat
// here, so it is omitted.
export const STAT_IMPRINT_MULT: Partial<Record<StatIndex, number>> = {
  0: 0.2, // Health
  2: 0.2, // Torpor
  4: 0.2, // Food
  7: 0.2, // Weight
  8: 0.2, // Melee
  9: 0.2, // Speed
};

/** The six stats wild points can land on (Torpor excluded, no wild speed). */
export const WILD_POINT_STATS: StatIndex[] = [0, 1, 3, 4, 7, 8];

/** Bonus levels added by taming effectiveness: floor(level × TE / 2). */
export function bonusLevels(level: number, tamingEffectiveness: number): number {
  return Math.floor((level * tamingEffectiveness) / 2);
}

export function wildStatValue(raw: StatRaw, wildPoints: number): number {
  return raw[0] * (1 + wildPoints * raw[1]);
}

export interface TamedStatInput {
  stat: StatIndex;
  raw: StatRaw;
  wildPoints: number;
  mutatedPoints: number;
  domPoints: number;
  tamingEffectiveness: number;
  imprintFraction: number;
  tamedBaseHealthMultiplier: number;
}

export function tamedStatValue(i: TamedStatInput): number {
  const [base, incWild, incDom, addWhenTamed, multAffinity] = i.raw;
  const wildIncrease = i.wildPoints * incWild + i.mutatedPoints * incWild;
  const domIncrease = i.domPoints * incDom;
  // Imprint bonus only applies to stats with a configured multiplier
  // (everything except Stamina, Oxygen and Crafting in ASE).
  const impMult = STAT_IMPRINT_MULT[i.stat];
  const imprintMult =
    i.imprintFraction > 0 && impMult ? 1 + impMult * i.imprintFraction : 1;
  const teMult = i.tamingEffectiveness >= 0 ? 1 + multAffinity * i.tamingEffectiveness : 1;
  const value =
    (base * (1 + wildIncrease) * i.tamedBaseHealthMultiplier * imprintMult + addWhenTamed) *
    teMult *
    (1 + domIncrease);
  return Math.max(0, value);
}

/** Convenience: full projection for one stat of a creature. */
export function projectStat(
  creature: Creature,
  stat: StatIndex,
  opts: {
    wildPoints: number;
    mutatedPoints?: number;
    domPoints?: number;
    tamingEffectiveness?: number;
    imprintFraction?: number;
  },
): number {
  const raw = creature.stats[stat];
  if (!raw) return 0;
  return tamedStatValue({
    stat,
    raw,
    wildPoints: opts.wildPoints,
    mutatedPoints: opts.mutatedPoints ?? 0,
    domPoints: opts.domPoints ?? 0,
    tamingEffectiveness: opts.tamingEffectiveness ?? 0,
    imprintFraction: opts.imprintFraction ?? 0,
    tamedBaseHealthMultiplier: creature.tamedBaseHealthMultiplier,
  });
}

/** Wild creature level from its wild point distribution. */
export function wildLevelFromPoints(points: Record<string, number>): number {
  let sum = 0;
  for (const v of Object.values(points)) sum += Math.max(0, Math.floor(v));
  return 1 + sum;
}

/** Maximum wild level obtainable post-tame (perfect TE, all bonus levels). */
export function maxPostTameLevel(level: number): number {
  return level + bonusLevels(level, 1);
}

/** Rider bonus of an imprinted creature: damage dealt × (1 + 0.3·imprint). */
export function riderDamageMultiplier(imprintFraction: number): number {
  return 1 + 0.3 * imprintFraction;
}

/** Damage taken while ridden by the imprinter: × (1 − 0.3·imprint). */
export function riderDamageTakenMultiplier(imprintFraction: number): number {
  return 1 - 0.3 * imprintFraction;
}
