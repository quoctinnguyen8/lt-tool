// combat_simulator_v9\simulator_v9.js
// Fork từ simulator_v8_1.js, mở rộng với hệ thống điểm cộng tự do
//
// THAY ĐỔI so với v8.3:
//   - Mỗi level-up được 1 điểm tự do, có thể cộng vào HP/ATK/DEF/LUCK
//     1 điểm vào HP = +10 HP; 1 điểm vào ATK/DEF/LUCK = +1
//   - 5 build type: balanced (25% mỗi stat), skewed_HP/ATK/DEF/LUCK (80% 1 stat)
//   - statsAtLevel() mở rộng nhận tham số build
//   - COUNTER/MIRROR sẽ được re-tune để cân bằng với chỉ số mới
//
// Cơ chế giữ nguyên từ v8:
//   - 3 hệ SCISSORS (Kéo) / ROCK (Búa) / PAPER (Bao)
//   - Vòng khắc chế: Búa > Kéo > Bao > Búa
//   - 4 chỉ số: hp, atk, def, luck
//   - Def -> dmg reduction:  R = 1 - 0.98^(def^0.8)
//   - Luck -> tỉ lệ kích hoạt nội tại:  P = 1 - 0.99^(luck^0.75)
//   - Nội tại Kéo crit, Búa guard, Bao heal
//   - Khắc chế counter buffs, We are family mirror debuff

'use strict';

// ============================================================
//  CÔNG THỨC CƠ BẢN
// ============================================================

function getDamageReduction(def) {
    if (def <= 0) return 0;
    const r = 1 - Math.pow(0.98, Math.pow(def, 0.8));
    return Math.max(0, Math.min(0.95, r));
}

function getPassiveChance(luck) {
    if (luck <= 0) return 0;
    const p = 1 - Math.pow(0.99, Math.pow(luck, 0.75));
    return Math.max(0, Math.min(0.5, p));
}

function rawDamage(atk, def) {
    return atk * (1 - getDamageReduction(def));
}

function toIntDamage(d) {
    return Math.max(0, Math.floor(d));
}

// ============================================================
//  FREE POINT SYSTEM (v9)
// ============================================================

/** Mỗi level-up nhận 1 điểm tự do */
function freePoints(level) {
    return Math.max(0, level - 1);
}

// Chuyển đổi: 1 điểm -> chỉ số
const POINT_RATIO = { hp: 10, atk: 1, def: 1, luck: 1 };

// Phân phối điểm theo build type (tổng = 1.0)
const BUILD_DIST = {
    none:         { hp: 0,     atk: 0,     def: 0,     luck: 0     },
    balanced:     { hp: 0.25,  atk: 0.25,  def: 0.25,  luck: 0.25  },
    skewed_hp:    { hp: 0.80,  atk: 0.067, def: 0.067, luck: 0.067 },
    skewed_atk:   { hp: 0.067, atk: 0.80,  def: 0.067, luck: 0.067 },
    skewed_def:   { hp: 0.067, atk: 0.067, def: 0.80,  luck: 0.067 },
    skewed_luck:  { hp: 0.067, atk: 0.067, def: 0.067, luck: 0.80  }
};

const BUILD_IDS = Object.keys(BUILD_DIST);
const ACTIVE_BUILDS = BUILD_IDS.filter(b => b !== 'none');

const BUILD_LABEL = {
    none:         'Không build',
    balanced:     'Cân bằng (25%)',
    skewed_hp:    'Lệch 80% HP',
    skewed_atk:   'Lệch 80% ATK',
    skewed_def:   'Lệch 80% DEF',
    skewed_luck:  'Lệch 80% LUCK'
};

/** Áp dụng điểm tự do lên stats cơ bản */
function applyBuild(baseStats, buildId, fp) {
    if (buildId === 'none' || fp === 0) return { ...baseStats };
    const dist = BUILD_DIST[buildId];
    return {
        element: baseStats.element,
        level:   baseStats.level,
        hp:      baseStats.hp   + Math.round(dist.hp   * fp * POINT_RATIO.hp),
        atk:     baseStats.atk  + Math.round(dist.atk  * fp * POINT_RATIO.atk),
        def:     baseStats.def  + Math.round(dist.def  * fp * POINT_RATIO.def),
        luck:    baseStats.luck + Math.round(dist.luck * fp * POINT_RATIO.luck),
    };
}

// ============================================================
//  STATS PRESET - 4 giai đoạn [Lv1-10, Lv10-20, Lv20-30, Lv30-40]
// ============================================================

const PRESET = {
    SCISSORS: {
        name: 'Hệ Kéo',
        base:   { hp: 100, atk: 16, def: 2,  luck: 7 },
        growth: { hp:   [16,  26,  22,  34],
                  atk:  [ 1.6,  3.0,  3.4,  4.0],
                  def:  [ 0.10, 0.30, 0.35, 0.45],
                  luck: [ 0.6,  0.7,  0.8,  1.0] }
    },
    ROCK: {
        name: 'Hệ Búa',
        base:   { hp: 110, atk: 13, def: 6,  luck: 5 },
        growth: { hp:   [16,  28,  34,  42],
                  atk:  [ 1.0,  1.6,  2.0,  2.4],
                  def:  [ 0.7,  0.9,  1.1,  1.3],
                  luck: [ 0.3,  0.4,  0.4,  0.5] }
    },
    PAPER: {
        name: 'Hệ Bao',
        base:   { hp:  85, atk: 14, def: 4,  luck: 5 },
        growth: { hp:   [12,  24,  30,  36],
                  atk:  [ 1.6,  2.2,  2.6,  2.8],
                  def:  [ 0.4,  0.6,  0.7,  0.9],
                  luck: [ 0.3,  0.4,  0.5,  0.6] }
    }
};

/** Tính base stats (chưa áp dụng điểm tự do) */
function baseStatsAtLevel(element, lv, preset = PRESET) {
    const p = preset[element];
    const g = p.growth;
    let hp   = p.base.hp;
    let atk  = p.base.atk;
    let def  = p.base.def;
    let luck = p.base.luck;
    for (let l = 2; l <= lv; l++) {
        const idx = l <= 10 ? 0 : l <= 20 ? 1 : l <= 30 ? 2 : 3;
        hp   += g.hp[idx];
        atk  += g.atk[idx];
        def  += g.def[idx];
        luck += g.luck[idx];
    }
    return { element, level: lv, hp, atk, def, luck };
}

/** Tính stats sau khi áp dụng build (điểm tự do) */
function statsAtLevel(element, lv, build = 'none', preset = PRESET) {
    const base = baseStatsAtLevel(element, lv, preset);
    return applyBuild(base, build, freePoints(lv));
}

// ============================================================
//  COUNTER (khắc chế) - v9 final tuned per-milestone
//  WR≥95% (52/54), Turn qua từng mốc (26/27), HP 10-35% (62%)
// ============================================================

const COUNTER = {
    // Búa vs Kéo: giảm mạnh từ v8.3 để HP xuống 10-35%
    rock_vs_scissors_def: {
        1: 8, 5: 20, 10: 35, 15: 44, 20: 52,
        25: 50, 30: 44, 35: 45, 40: 39
    },
    rock_vs_scissors_hp: {
        1: 14, 5: 40, 10: 69, 15: 87, 20: 105,
        25: 98, 30: 85, 35: 88, 40: 75
    },
    // Kéo vs Bao: v8.3 + bump Lv.10/30 để đảm bảo WR
    scissors_vs_paper_dmg: {
        1: 0.04, 5: 0.08, 10: 0.16, 15: 0.20, 20: 0.26,
        25: 0.32, 30: 0.42, 35: 0.44, 40: 0.50
    },
    scissors_vs_paper_luck: {
        1: 1, 5: 3, 10: 10, 15: 9, 20: 12,
        25: 15, 30: 27, 35: 21, 40: 24
    },
    // Kéo vs Bao DEF scale: giảm DEF bên Kéo để nhận nhiều damage → giảm overkill
    scissors_vs_paper_def_scale: {
        1: 1.0, 5: 1.0, 10: 0.80, 15: 0.58, 20: 0.12,
        25: 0.48, 30: 0.41, 35: 0.85, 40: 0.49
    },
    // Bao vs Búa: tuned, tăng mạnh từ v8.3 (~1.5-2×)
    paper_vs_rock_hp: {
        1: 70, 5: 73, 10: 112, 15: 194, 20: 280,
        25: 346, 30: 403, 35: 480, 40: 540
    },
    paper_vs_rock_luck: {
        1: 3, 5: 8, 10: 19, 15: 34, 20: 48,
        25: 53, 30: 54, 35: 55, 40: 52
    },
    // Bao vs Búa DEF scale: giảm DEF bên Bao để nhận nhiều damage → giảm overkill
    paper_vs_rock_def_scale: {
        1: 1.0, 5: 1.0, 10: 0.12, 15: 0.14, 20: 0.18,
        25: 0.37, 30: 0.60, 35: 0.80, 40: 0.90
    }
};

// ============================================================
//  WE ARE FAMILY (mirror) - v9 tuned per-milestone
// ============================================================

const MIRROR = {
    // Kéo vs Kéo: dmg_mult tuned for target turn counts
    scissors_dmg_mult: {
        1: 0.95, 5: 0.98, 10: 0.90, 15: 0.85, 20: 0.78,
        25: 0.70, 30: 0.65, 35: 0.65, 40: 0.63
    },
    // Búa vs Búa: def_mult tuned (Lv.10 đạt 13.0/12sát cận dưới của range)
    rock_def_mult: {
        1: 0.01, 5: 0.23, 10: 0.38, 15: 0.01, 20: 0.08,
        25: 0.25, 30: 0.24, 35: 0.29, 40: 0.33
    },
    // Bao vs Bao: all_mult tuned for target turn counts
    paper_all_mult: {
        1: 0.09, 5: 3.76, 10: 3.50, 15: 2.09, 20: 1.68,
        25: 1.59, 30: 1.53, 35: 1.39, 40: 1.26
    }
};

// ============================================================
//  NỘI TẠI (Passive) theo level
// ============================================================

const PASSIVE_LUT = {
    scissorsCritLow:  { 1: 1.10, 5: 1.12, 10: 1.14, 15: 1.17, 20: 1.20, 25: 1.22, 30: 1.24, 35: 1.245, 40: 1.25 },
    scissorsCritHigh: { 1: 1.20, 5: 1.25, 10: 1.30, 15: 1.35, 20: 1.40, 25: 1.43, 30: 1.46, 35: 1.48, 40: 1.50 },
    rockGuardBase:    { 1: 0.10, 5: 0.13, 10: 0.16, 15: 0.19, 20: 0.22, 25: 0.25, 30: 0.27, 35: 0.29, 40: 0.30 },
    rockGuardLowHp:   { 1: 0.20, 5: 0.27, 10: 0.34, 15: 0.40, 20: 0.46, 25: 0.50, 30: 0.54, 35: 0.57, 40: 0.60 },
    paperHealBase:    { 1: 0.20, 5: 0.23, 10: 0.26, 15: 0.29, 20: 0.32, 25: 0.35, 30: 0.37, 35: 0.39, 40: 0.40 },
    paperHealLowHp:   { 1: 0.40, 5: 0.48, 10: 0.56, 15: 0.62, 20: 0.68, 25: 0.72, 30: 0.75, 35: 0.78, 40: 0.80 }
};

function lutAt(LUT, lv) {
    const keys = Object.keys(LUT).map(Number).sort((a, b) => a - b);
    if (lv <= keys[0]) return LUT[keys[0]];
    if (lv >= keys[keys.length - 1]) return LUT[keys[keys.length - 1]];
    for (let i = 0; i < keys.length - 1; i++) {
        const lo = keys[i], hi = keys[i + 1];
        if (lv >= lo && lv <= hi) {
            const t = (lv - lo) / (hi - lo);
            return LUT[lo] + (LUT[hi] - LUT[lo]) * t;
        }
    }
    return LUT[keys[keys.length - 1]];
}

function mirrorAt(key, lv)  { return lutAt(MIRROR[key], lv); }
function counterAt(key, lv) { return lutAt(COUNTER[key], lv); }

// ============================================================
//  ÁP DỤNG COUNTER + MIRROR
// ============================================================

function prepareFight(statsA, statsB) {
    const A = { ...statsA, maxHp: statsA.hp };
    const B = { ...statsB, maxHp: statsB.hp };
    A.dmgMult = 1; B.dmgMult = 1;

    if (A.element === 'ROCK' && B.element === 'SCISSORS') {
        A.def += counterAt('rock_vs_scissors_def', A.level);
        A.maxHp += counterAt('rock_vs_scissors_hp', A.level);
        A.hp   += counterAt('rock_vs_scissors_hp', A.level);
    } else if (B.element === 'ROCK' && A.element === 'SCISSORS') {
        B.def += counterAt('rock_vs_scissors_def', B.level);
        B.maxHp += counterAt('rock_vs_scissors_hp', B.level);
        B.hp   += counterAt('rock_vs_scissors_hp', B.level);
    // Kéo vs Bao: Kéo +dmg% và +luck, nhưng -DEF để nhận nhiều damage → giảm overkill
    } else if (A.element === 'SCISSORS' && B.element === 'PAPER') {
        const defScale = lutAt(COUNTER.scissors_vs_paper_def_scale, A.level) || 1.0;
        A.dmgMult *= (1 + counterAt('scissors_vs_paper_dmg', A.level));
        A.luck += counterAt('scissors_vs_paper_luck', A.level);
        A.def = Math.max(0, A.def * defScale);
    } else if (B.element === 'SCISSORS' && A.element === 'PAPER') {
        const defScale = lutAt(COUNTER.scissors_vs_paper_def_scale, B.level) || 1.0;
        B.dmgMult *= (1 + counterAt('scissors_vs_paper_dmg', B.level));
        B.luck += counterAt('scissors_vs_paper_luck', B.level);
        B.def = Math.max(0, B.def * defScale);
    // Bao vs Búa: Bao +HP và +luck, nhưng -DEF để nhận nhiều damage → giảm overkill
    } else if (A.element === 'PAPER' && B.element === 'ROCK') {
        const defScale = lutAt(COUNTER.paper_vs_rock_def_scale, A.level) || 1.0;
        const hpB = counterAt('paper_vs_rock_hp', A.level);
        const lkB = counterAt('paper_vs_rock_luck', A.level);
        A.maxHp += hpB; A.hp += hpB;
        A.luck += lkB;
        A.def = Math.max(0, A.def * defScale);
    } else if (B.element === 'PAPER' && A.element === 'ROCK') {
        const defScale = lutAt(COUNTER.paper_vs_rock_def_scale, B.level) || 1.0;
        const hpB = counterAt('paper_vs_rock_hp', B.level);
        const lkB = counterAt('paper_vs_rock_luck', B.level);
        B.maxHp += hpB; B.hp += hpB;
        B.luck += lkB;
        B.def = Math.max(0, B.def * defScale);
    }

    if (A.element === B.element) {
        if (A.element === 'SCISSORS') {
            const m = mirrorAt('scissors_dmg_mult', A.level);
            A.dmgMult *= m; B.dmgMult *= m;
        } else if (A.element === 'ROCK') {
            const m = mirrorAt('rock_def_mult', A.level);
            A.def *= m; B.def *= m;
        } else if (A.element === 'PAPER') {
            const m = mirrorAt('paper_all_mult', A.level);
            A.atk  *= m; A.def *= m; A.luck *= m;
            A.maxHp *= m; A.hp *= m;
            B.atk  *= m; B.def *= m; B.luck *= m;
            B.maxHp *= m; B.hp *= m;
        }
    }
    return { A, B };
}

// ============================================================
//  TẤN CÔNG (1 hit)
// ============================================================

function attackOnce(attacker, defender) {
    let dmg = rawDamage(attacker.atk, defender.def);

    let crit = false;
    if (attacker.element === 'SCISSORS') {
        const chance = getPassiveChance(attacker.luck);
        if (Math.random() < chance) {
            const isHigh = (attacker.hp / attacker.maxHp) > 0.75;
            const mult = isHigh
                ? lutAt(PASSIVE_LUT.scissorsCritHigh, attacker.level)
                : lutAt(PASSIVE_LUT.scissorsCritLow, attacker.level);
            dmg *= mult;
            crit = true;
        }
    }

    if (attacker.dmgMult && attacker.dmgMult !== 1) {
        dmg *= attacker.dmgMult;
    }

    let guard = false;
    if (defender.element === 'ROCK') {
        const chance = getPassiveChance(defender.luck);
        if (Math.random() < chance) {
            const isLow = (defender.hp / defender.maxHp) < 0.30;
            const r = isLow
                ? lutAt(PASSIVE_LUT.rockGuardLowHp, defender.level)
                : lutAt(PASSIVE_LUT.rockGuardBase, defender.level);
            dmg *= (1 - r);
            guard = true;
        }
    }

    const dealt = toIntDamage(dmg);
    defender.hp = Math.max(0, defender.hp - dealt);

    let heal = 0;
    if (defender.element === 'PAPER' && defender.hp > 0 && dealt > 0) {
        const chance = getPassiveChance(defender.luck);
        if (Math.random() < chance) {
            const isLow = (defender.hp / defender.maxHp) < 0.25;
            const rate = isLow
                ? lutAt(PASSIVE_LUT.paperHealLowHp, defender.level)
                : lutAt(PASSIVE_LUT.paperHealBase, defender.level);
            heal = Math.max(1, Math.floor(dealt * rate));
            defender.hp = Math.min(defender.maxHp, defender.hp + heal);
        }
    }
    return { dmg: dealt, crit, guard, heal };
}

// ============================================================
//  MÔ PHỎNG 1 TRẬN
// ============================================================

function simulateBattle(statsA, statsB, goFirst = 'A', opts = {}) {
    const maxTurns = opts.maxTurns || 80;
    const first  = goFirst === 'B' ? statsB : statsA;
    const second = goFirst === 'B' ? statsA : statsB;
    const prepared = prepareFight(first, second);
    const A = prepared.A, B = prepared.B;

    let turns = 0;
    while (turns < maxTurns && A.hp > 0 && B.hp > 0) {
        turns++;
        attackOnce(A, B);
        if (B.hp <= 0) break;
        attackOnce(B, A);
    }
    let winnerLabel;
    if (A.hp > 0 && B.hp <= 0) {
        winnerLabel = (first === statsA) ? 'A' : 'B';
    } else if (B.hp > 0 && A.hp <= 0) {
        winnerLabel = (first === statsA) ? 'B' : 'A';
    } else {
        if (A.hp > B.hp)      winnerLabel = (first === statsA) ? 'A' : 'B';
        else if (B.hp > A.hp) winnerLabel = (first === statsA) ? 'B' : 'A';
        else                  winnerLabel = 'DRAW';
    }
    const winnerObj = (winnerLabel === 'A') ? prepared.A : prepared.B;
    const loserObj  = (winnerLabel === 'A') ? prepared.B : prepared.A;
    return {
        winner: winnerLabel,
        turns,
        winnerHp: winnerObj.hp,
        winnerMaxHp: winnerObj.maxHp,
        loserHp: loserObj.hp,
        loserMaxHp: loserObj.maxHp,
        winnerHpRatio: winnerObj.hp / winnerObj.maxHp
    };
}

module.exports = {
    PRESET, COUNTER, MIRROR, PASSIVE_LUT,
    BUILD_DIST, BUILD_IDS, ACTIVE_BUILDS, BUILD_LABEL, POINT_RATIO,
    getDamageReduction, getPassiveChance, rawDamage, toIntDamage,
    baseStatsAtLevel, statsAtLevel, freePoints, applyBuild,
    lutAt, mirrorAt, counterAt,
    prepareFight, attackOnce, simulateBattle
};
