import { describe, expect, it } from 'vitest';
import { creatures } from '../data/creatures';
import type { Creature } from '../data/types';
import {
  computeTaming,
  torporAtLevel,
  torporDepletionPerSecond,
  tranqHits,
  DEFAULT_SERVER,
} from '../lib/taming';
import {
  babyStatProbability,
  babyWildLevel,
  mutationChances,
  usefulMutationChance,
} from '../lib/breeding';
import {
  bonusLevels,
  maxPostTameLevel,
  projectStat,
  riderDamageMultiplier,
  riderDamageTakenMultiplier,
  wildStatValue,
} from '../lib/stats';

const byName = (n: string): Creature => {
  const c = creatures.find((x) => x.name === n);
  if (!c) throw new Error(`missing creature fixture: ${n}`);
  return c;
};
const rex = byName('Rex');
const doed = byName('Doedicurus');
const giga = byName('Giganotosaurus');
const equus = byName('Equus');
const tuso = byName('Tusoteuthis');

describe('taming calculator - hand-worked examples (1x official baseline)', () => {
  it('Rex level 150 with Exceptional Kibble: 17 kibble, ~58 min, 98.7% TE, +74 levels', () => {
    const r = computeTaming(rex, 150, 'Exceptional Kibble', DEFAULT_SERVER)!;
    // affinityNeeded = 3450 + 150×150 = 25950; per-feed affinity 400×4 = 1600
    // feedings = ceil(25950/1600) = 17
    expect(r.feedings).toBe(17);
    expect(r.itemsTotal).toBe(17);
    // drain = 0.002314 × 180.0634 = 0.4166667/s; 17 × 85.248 / 0.4166667 = 3478.1 → 3479 s
    expect(r.seconds).toBe(3479);
    // TE = 1/(1 + 1.25 × 17/1600) = 0.98689…
    expect(r.tamingEffectiveness).toBeCloseTo(0.986892, 4);
    expect(r.bonusLevels).toBe(74);
    expect(r.levelAfterTame).toBe(224); // the well-known "150 kibble tame → 224"
    expect(r.maxLevelAfterTame).toBe(225);
    // torpor = 1550 × (1 + 0.06×149) = 15 407
    expect(torporAtLevel(rex, 150)).toBeCloseTo(15407, 0);
    // depletion ≈ 0.725 + 149^0.8004 / (22.3967/0.725) ≈ 2.5016/s
    expect(torporDepletionPerSecond(rex, 150)).toBeCloseTo(2.5016, 3);
    // big-food creature stays down for the whole tame → 0 narcotics
    expect(r.narcotics).toBe(0);
    expect(r.wakeTimerS).toBe(6158);
  });

  it('Rex level 150 with Raw Meat: 130 meat, ~4h20m, ~55% TE, +41 levels', () => {
    const r = computeTaming(rex, 150, 'Raw Meat', DEFAULT_SERVER)!;
    expect(r.feedings).toBe(130); // ceil(25950 / (50×4))
    expect(r.seconds).toBe(15600);
    expect(r.tamingEffectiveness).toBeCloseTo(1 / 1.8125, 4); // 1/(1+1.25×130/200)
    expect(r.bonusLevels).toBe(41);
    expect(r.levelAfterTame).toBe(191);
  });

  it('Rex level 150 with Raw Mutton (per-species affinity 187.5): 35 mutton, ~70 min', () => {
    const r = computeTaming(rex, 150, 'Raw Mutton', DEFAULT_SERVER)!;
    expect(r.feedings).toBe(35); // ceil(25950 / (187.5×4))
    expect(r.seconds).toBe(4200);
    expect(r.tamingEffectiveness).toBeCloseTo(0.944882, 4);
    expect(r.levelAfterTame).toBe(220);
  });

  it('Rex level 150 Exceptional Kibble on a 2x server: 9 kibble, still 224', () => {
    const r = computeTaming(rex, 150, 'Exceptional Kibble', {
      ...DEFAULT_SERVER,
      tamingSpeed: 2,
    })!;
    expect(r.feedings).toBe(9); // ceil(25950 / 3200)
    expect(r.tamingEffectiveness).toBeCloseTo(0.996497, 4);
    expect(r.levelAfterTame).toBe(224);
  });

  it('Doedicurus level 150 with Regular Kibble: 17 kibble, ~43.5 min, 224 post-tame', () => {
    const r = computeTaming(doed, 150, 'Regular Kibble', DEFAULT_SERVER)!;
    // affinity = 4000 + 150×150 = 26 500
    expect(r.feedings).toBe(17); // ceil(26500/1600)
    // drain = 0.003156 × 176.0315 = 0.5555554/s → 17×85.248/0.5555554 = 2608.6
    expect(r.seconds).toBe(2609);
    expect(r.tamingEffectiveness).toBeCloseTo(0.99788, 4);
    expect(r.levelAfterTame).toBe(224);
    expect(r.narcotics).toBe(0);
  });

  it('Giganotosaurus level 150 Exceptional Kibble: 19 kibble, torpor burns ~415/s', () => {
    const r = computeTaming(giga, 150, 'Exceptional Kibble', DEFAULT_SERVER)!;
    expect(r.feedings).toBe(19); // ceil((5000+24000)/1600)
    expect(r.seconds).toBe(4374);
    expect(r.levelAfterTame).toBe(223);
    expect(torporAtLevel(giga, 150)).toBeCloseTo(99400, -1);
    expect(r.torporDepletionPS).toBeGreaterThan(414); // Giga famously wakes fast
    expect(r.torporDepletionPS).toBeLessThan(415);
    expect(r.narcotics).toBeGreaterThan(400);
  });

  it('Equus (passive) level 150 with Rockarrot: 23 carrots, ~18 min, 224 post-tame', () => {
    const r = computeTaming(equs(), 150, 'Rockarrot', DEFAULT_SERVER)!;
    // affinity = 3600 + 180×150 = 30 600; passive: 210×1.6×4 = 1344/feeding
    expect(r.feedings).toBe(23);
    // food value 20 × wakeFoodDeplMult 2 = 40; drain 0.001929×432.0028 ≈ 0.8333/s
    expect(r.seconds).toBe(1104);
    expect(r.tamingEffectiveness).toBeCloseTo(0.9932, 3);
    expect(r.levelAfterTame).toBe(224);
    expect(r.narcotics).toBe(0); // passive tame, no torpor to hold
  });

  it('Tusoteuthis level 150 with Black Pearls: 4 feedings of 50 pearls = 200 pearls', () => {
    const r = computeTaming(tuso, 150, 'Black Pearl', DEFAULT_SERVER)!;
    expect(r.feedings).toBe(4); // ceil(31250 / (50×50×4))
    expect(r.itemsEach).toBe(50);
    expect(r.itemsTotal).toBe(200); // the classic "200 pearls per 150 Tuso"
    expect(r.levelAfterTame).toBe(224);
  });

  it('tranq counts: Rex 150 needs 98 crossbow arrows (body shots)', () => {
    expect(tranqHits(rex, 150, 157.5)).toBe(98); // ceil(15407 / 157.5)
    expect(tranqHits(rex, 150, 221)).toBe(70); // tranq darts
  });

  it('non-edible food returns null', () => {
    expect(computeTaming(rex, 150, 'Mejoberry', DEFAULT_SERVER)).toBeNull();
  });
});

function equs(): Creature {
  return equus;
}

describe('breeding calculator', () => {
  it('stat inheritance is 55/45, certain when parents are equal', () => {
    // Higher parent wins with 55% when values differ.
    const out = babyStatProbability(
      [{ stat: 'Health', levelA: 40, levelB: 20 }],
      { Health: 40 },
    );
    expect(out.perStat[0].chance).toBeCloseTo(0.55, 6);
    // Equal parents: guaranteed.
    const eq = babyStatProbability(
      [{ stat: 'Melee', levelA: 30, levelB: 30 }],
      { Melee: 30 },
    );
    expect(eq.perStat[0].chance).toBe(1);
    // Both parents below target: impossible without a mutation.
    const imp = babyStatProbability(
      [{ stat: 'Weight', levelA: 10, levelB: 12 }],
      { Weight: 20 },
    );
    expect(imp.perStat[0].chance).toBe(0);
    expect(imp.probability).toBe(0);
  });

  it('combined multi-stat probability multiplies per-stat chances', () => {
    const out = babyStatProbability(
      [
        { stat: 'Health', levelA: 40, levelB: 20 },
        { stat: 'Melee', levelA: 30, levelB: 30 },
      ],
      { Health: 40, Melee: 30 },
    );
    expect(out.probability).toBeCloseTo(0.55, 6);
    expect(out.expectedBabies).toBeCloseTo(1 / 0.55, 4);
  });

  it('mutation chances match the documented 7.31% / ~3.7% / 0%', () => {
    // Both counters under 20: 1 − 0.975³ = 7.31% (wiki-documented value).
    expect(mutationChances(0, 0).atLeastOne).toBeCloseTo(0.073140625, 8);
    // Exactly one parent eligible: 1 − 0.9875³ ≈ 3.70%.
    expect(mutationChances(25, 0).atLeastOne).toBeCloseTo(0.0370335, 6);
    expect(mutationChances(0, 19).atLeastOne).toBeCloseTo(0.073140625, 8);
    // 20/20 rule: both parents at or above 20 → no new mutations.
    expect(mutationChances(20, 0).atLeastOne).toBeCloseTo(0.0370335, 6);
    expect(mutationChances(20, 20).atLeastOne).toBe(0);
    // Distribution sums to 1.
    const sum = mutationChances(0, 0).exactly.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
  });

  it('useful-mutation chance follows the wiki formula (7.31% × 1/6 × 0.55)', () => {
    const u = usefulMutationChance(1, 0, 0);
    expect(u.atLeastOne).toBeCloseTo(0.073140625, 8);
    expect(u.retention).toBeCloseTo(0.55, 6);
    expect(u.chance).toBeCloseTo(0.073140625 * (1 / 6) * 0.55, 8);
    // Stacking two target stats squares the retention term.
    const u2 = usefulMutationChance(2, 0, 0);
    expect(u2.chance).toBeCloseTo(0.073140625 * (2 / 6) * 0.55 ** 2, 8);
  });

  it('baby wild level accounting includes mutation levels (+2 each)', () => {
    expect(babyWildLevel([10, 0, 0, 0, 0, 0])).toBe(11); // base 1 + points
    expect(babyWildLevel([10, 0, 0, 0, 0, 0], 3)).toBe(17); // +3×2 mutation levels
  });
});

describe('stat point accounting', () => {
  it('wild stat value: Rex HP with 10 wild points = 3300', () => {
    expect(wildStatValue(rex.stats[0]!, 10)).toBeCloseTo(3300, 6);
  });

  it('fresh tamed Rex melee ≈ 209% at 98.7% TE (taming bonuses applied)', () => {
    // (1×(1+0)×1×1 + 0.5) × (1 + 0.4×TE) = 1.5 × 1.39476 ≈ 2.0921
    const v = projectStat(rex, 8, { wildPoints: 0, tamingEffectiveness: 0.986892 });
    expect(v).toBeCloseTo(2.092136, 5);
  });

  it('imprinting adds 20% to Health but not Stamina (ASE stat list)', () => {
    const hp = projectStat(rex, 0, { wildPoints: 0, imprintFraction: 1 });
    expect(hp).toBeCloseTo(1100 * 1.2 + 0.5, 5);
    const stam = projectStat(rex, 1, { wildPoints: 0, imprintFraction: 1 });
    expect(stam).toBeCloseTo(420, 6); // no imprint bonus on stamina
  });

  it('domestic levels scale off the tamed base: 10 HP points on a 0-wild Rex', () => {
    const v = projectStat(rex, 0, { wildPoints: 0, domPoints: 10 });
    expect(v).toBeCloseTo((1100 + 0.5) * (1 + 0.27 * 10), 4);
  });

  it('bonus levels and the 225 post-tame ceiling for a 150 wild', () => {
    expect(bonusLevels(150, 1)).toBe(75);
    expect(maxPostTameLevel(150)).toBe(225);
    expect(bonusLevels(150, 0.986892)).toBe(74);
  });

  it('rider bonus at 100% imprint: ×1.3 damage dealt, ×0.7 taken', () => {
    expect(riderDamageMultiplier(1)).toBeCloseTo(1.3, 6);
    expect(riderDamageTakenMultiplier(1)).toBeCloseTo(0.7, 6);
  });
});

describe('dataset integrity', () => {
  it('has a healthy subset with taming data flagged by method', () => {
    expect(creatures.length).toBeGreaterThanOrEqual(60);
    for (const c of creatures) {
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);
      if (c.tameMethod !== 'special') {
        expect(c.eats.length).toBeGreaterThan(0);
        expect(c.taming.affinityNeeded0).toBeGreaterThan(0);
      }
    }
    // KO creatures need torpor numbers.
    for (const c of creatures.filter((x) => x.tameMethod === 'knockout')) {
      expect(c.torporBase).toBeGreaterThan(0);
      expect(c.taming.torporDepletionPS0).toBeGreaterThan(0);
    }
    // Preferred kibble is always a valid tier when present.
    const tiers = ['Basic', 'Simple', 'Regular', 'Superior', 'Exceptional', 'Extraordinary'];
    for (const c of creatures) {
      if (c.preferredKibble) expect(tiers).toContain(c.preferredKibble);
    }
  });

  it('non-violent creatures never get narcotics; KO creatures may', () => {
    const equusR = computeTaming(equs(), 150, 'Rockarrot', DEFAULT_SERVER)!;
    expect(equusR.narcotics).toBe(0);
    const gigaR = computeTaming(giga, 150, 'Exceptional Kibble', DEFAULT_SERVER)!;
    expect(gigaR.narcotics).toBeGreaterThan(0);
  });
});
