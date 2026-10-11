// Breeding math per the documented model on ark.wiki.gg/wiki/Mutations and
// ark.wiki.gg/wiki/Breeding:
//   • Per stat, the baby has a 55% chance to take the higher parent value and
//     45% the lower (equal parents → certain).
//   • Up to 3 independent mutation rolls per baby, each 2.5% (7.31% at least
//     one when both parents' counters are under 20).
//   • A successful mutation adds +2 wild levels to one of the six mutable
//     stats (Health, Stamina, Oxygen, Food, Weight, Melee) and rerolls a
//     color region.
//   • The 20/20 rule: a parent whose combined matrilineal+patrilineal counter
//     is ≥20 cannot roll new mutations; if both are ≥20, chance is 0%.

export const MUTATION_ROLLS = 3;
export const MUTATION_CHANCE_PER_ROLL = 0.025;
export const STRONG_STAT_CHANCE = 0.55;
export const WEAK_STAT_CHANCE = 0.45;
export const MUTABLE_STATS = 6;
export const LEVELS_PER_MUTATION = 2;

/** Probability that a baby inherits the higher (or equal-max) parent value. */
export function statInheritanceChance(higher: number, lower: number): number {
  if (higher === lower) return 1;
  return STRONG_STAT_CHANCE;
}

/**
 * Probability of at least/at-exactly N mutations.
 * Model: 3 attempts per baby; each attempt first picks a parent at random
 * (50/50) - if that parent's combined counter is ≥20 the attempt fails
 * outright, otherwise it succeeds with 2.5%. Documented outcomes:
 * both parents <20 → 1−0.975³ = 7.31% at least one mutation (wiki);
 * exactly one parent <20 → 1−0.9875³ ≈ 3.70%; both ≥20 → 0%.
 */
export function mutationChances(
  motherCounter: number,
  fatherCounter: number,
): { atLeastOne: number; exactly: number[]; attemptChance: number } {
  const pMother = motherCounter < 20 ? MUTATION_CHANCE_PER_ROLL : 0;
  const pFather = fatherCounter < 20 ? MUTATION_CHANCE_PER_ROLL : 0;
  const p = 0.5 * pMother + 0.5 * pFather; // per-attempt success chance
  const atLeastOne = p > 0 ? 1 - Math.pow(1 - p, MUTATION_ROLLS) : 0;
  const exactly: number[] = [];
  for (let k = 0; k <= MUTATION_ROLLS; k++) {
    exactly[k] = binomial(MUTATION_ROLLS, k) * Math.pow(p, k) * Math.pow(1 - p, MUTATION_ROLLS - k);
  }
  return { atLeastOne, exactly, attemptChance: p };
}

function binomial(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

export interface BabyOutcome {
  /** Probability 0..1 that a single baby hits every target stat. */
  probability: number;
  /** Expected babies needed (1/p). */
  expectedBabies: number;
  /** Breakdown per stat for display. */
  perStat: { stat: string; chance: number }[];
  mutationChance: number;
}

/**
 * Chance of a baby that inherits (or exceeds) each target stat level from the
 * two parents. Per stat: 55% higher parent / 45% lower parent; a parent value
 * already ≥ target guarantees that stat when picked.
 */
export function babyStatProbability(
  parents: { stat: string; levelA: number; levelB: number }[],
  targets: Record<string, number>,
): BabyOutcome {
  let p = 1;
  const perStat: { stat: string; chance: number }[] = [];
  for (const { stat, levelA, levelB } of parents) {
    const target = targets[stat] ?? 0;
    const hi = Math.max(levelA, levelB);
    const lo = Math.min(levelA, levelB);
    // P(baby stat ≥ target): baby takes hi with 55% (or 100% if equal).
    let chance: number;
    if (lo >= target) chance = 1;
    else if (hi >= target) chance = levelA === levelB ? 1 : STRONG_STAT_CHANCE;
    else chance = 0;
    perStat.push({ stat, chance });
    p *= chance;
  }
  return {
    probability: p,
    expectedBabies: p > 0 ? 1 / p : Infinity,
    perStat,
    mutationChance: 0,
  };
}

/**
 * Wiki-documented chance of a *useful* mutation landing on a specific stat:
 * at-least-one-mutation × (desired stats / mutable stats) × retention^desired.
 * Retention = 55% chance the mutated stat roll is kept in the baby (the
 * stronger-stat inheritance bias).
 */
export function usefulMutationChance(
  desiredStats: number,
  motherCounter: number,
  fatherCounter: number,
): { chance: number; atLeastOne: number; retention: number } {
  const { atLeastOne } = mutationChances(motherCounter, fatherCounter);
  const retention = Math.pow(STRONG_STAT_CHANCE, desiredStats);
  const chance = atLeastOne * (desiredStats / MUTABLE_STATS) * retention;
  return { chance, atLeastOne, retention };
}

/** Total wild level of a baby given wild points per stat and mutations. */
export function babyWildLevel(wildPoints: number[], mutations = 0): number {
  return 1 + wildPoints.reduce((a, b) => a + b, 0) + mutations * LEVELS_PER_MUTATION;
}
