// e:\LingThu\lt-tool\combat_simulator_v8\simulator.js
// Combat simulator v8 - viết lại hoàn toàn mới theo req-ver8.md
//
// KHÁC BIỆT so với v7:
//   - Vòng khắc chế TRUYỀN THỐNG:  Búa > Kéo > Bao > Búa
//     (v7 dùng Kéo > Búa > Bao > Kéo, nên logic counter phải đảo lại)
//   - Counter config được auto-tune
//
// Cơ chế giữ nguyên spec:
//   - 3 hệ SCISSORS (Kéo) / ROCK (Búa) / PAPER (Bao)
//   - 4 chỉ số: hp, atk, def, luck
//   - Def -> dmg reduction:  R = 1 - 0.98^(def^0.8)
//   - Luck -> tỉ lệ kích hoạt nội tại:  P = 1 - 0.99^(luck^0.75)
//   - Nội tại:
//       Kéo: 110%->125% dmg, 120%->150% khi HP>75%
//       Búa: 10%->30% giảm dmg, 20%->60% khi HP<30%
//       Bao: hồi 20%->40% dmg nhận vào, 40%->80% khi HP<25%
//
// Khắc chế (counter buffs theo level):
//   - Búa vs Kéo (Búa thắng): Búa +armor/def (theo level)
//   - Kéo vs Bao (Kéo thắng): Kéo +dmg% (theo level)
//   - Bao vs Búa (Bao thắng): Bao +HP & +luck (theo level)
//
// We are family (mirror, debuff):
//   - Kéo vs Kéo: giảm dmg%
//   - Búa vs Búa: giảm def%
//   - Bao vs Bao:  giảm nhẹ toàn bộ chỉ số

'use strict';

// ============================================================
//  CÔNG THỨC CƠ BẢN
// ============================================================

/** Damage reduction từ def:  R = 1 - 0.98^(def^0.8), cap 95% */
function getDamageReduction(def) {
    if (def <= 0) return 0;
    const r = 1 - Math.pow(0.98, Math.pow(def, 0.8));
    return Math.max(0, Math.min(0.95, r));
}

/** Tỉ lệ kích hoạt nội tại theo luck:  P = 1 - 0.99^(luck^0.75), cap 50% */
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
//  STATS PRESET - 4 giai đoạn [Lv1-10, Lv10-20, Lv20-30, Lv30-40]
//  base hp quanh mốc 100 mỗi hệ
// ============================================================

const PRESET = {
    SCISSORS: {
        name: 'Hệ Kéo',
        // Kéo: mạnh về atk, def thấp
        base:   { hp: 100, atk: 16, def: 2,  luck: 7 },
        growth: { hp:   [16,  26,  22,  34],
                  atk:  [ 1.6,  3.0,  3.4,  4.0],
                  def:  [ 0.10, 0.30, 0.35, 0.45],
                  luck: [ 0.6,  0.7,  0.8,  1.0] }
    },
    ROCK: {
        name: 'Hệ Búa',
        // Búa: mạnh về def, atk trung bình
        base:   { hp: 110, atk: 13, def: 6,  luck: 5 },
        growth: { hp:   [16,  28,  34,  42],
                  atk:  [ 1.0,  1.6,  2.0,  2.4],
                  def:  [ 0.7,  0.9,  1.1,  1.3],
                  luck: [ 0.3,  0.4,  0.4,  0.5] }
    },
    PAPER: {
        name: 'Hệ Bao',
        // Bao: cân bằng, hp thấp hơn, def/luck trung bình
        base:   { hp:  85, atk: 14, def: 4,  luck: 5 },
        growth: { hp:   [12,  24,  30,  36],
                  atk:  [ 1.6,  2.2,  2.6,  2.8],
                  def:  [ 0.4,  0.6,  0.7,  0.9],
                  luck: [ 0.3,  0.4,  0.5,  0.6] }
    }
};

/**
 * Tính stats tại level lv (1..40) theo base + growth 4 giai đoạn.
 */
function statsAtLevel(element, lv, preset = PRESET) {
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

// ============================================================
//  COUNTER (khắc chế) - bảng theo level, sẽ auto-tune
//
//  Vòng khắc chế (theo spec):
//      Búa > Kéo > Bao > Búa
//
//  Các buff khi khắc chế (counter thắng):
//      rock_vs_scissors:   Búa +def (mạnh dần cuối game)
//      scissors_vs_paper:  Kéo +dmg% (mạnh đầu, trung bình cuối)
//      paper_vs_rock:      Bao +HP, +luck (tăng dần)
// ============================================================

const COUNTER = {
    // Búa vs Kéo: Búa (counter) được +def  (tăng dần theo level)
    // v8.3 final-11: tune cho last few HP>35% và HP<10%
    rock_vs_scissors_def: {
        1: 14, 5: 26,
        10: 52, 15: 80, 20: 105, 25: 128, 30: 144, 35: 156, 40: 164
    },
    // Búa vs Kéo: Búa (counter) được +HP  (tăng dần theo level - v8.3)
    rock_vs_scissors_hp: {
        1: 28, 5: 52,
        10: 104, 15: 160, 20: 210, 25: 252, 30: 282, 35: 306, 40: 320
    },
    // Kéo vs Bao: Kéo (counter) được +dmg%  (tăng dần theo level)
    scissors_vs_paper_dmg: {
        1: 0.04, 5: 0.08,
        10: 0.14, 15: 0.20, 20: 0.26, 25: 0.32, 30: 0.38, 35: 0.44, 40: 0.50
    },
    // Kéo vs Bao: Kéo (counter) được +luck  (tăng dần - v8.3)
    scissors_vs_paper_luck: {
        1: 1, 5: 3,
        10: 6, 15: 9, 20: 12, 25: 15, 30: 18, 35: 21, 40: 24
    },
    // Bao vs Búa: Bao (counter) được +HP (v8.3 final-15: tune Lv.40 second 10%→11%)
    paper_vs_rock_hp: {
        1: 70, 5: 56,
        10: 70, 15: 102, 20: 140, 25: 182, 30: 224, 35: 274, 40: 328
    },
    // Bao vs Búa: Bao (counter) được +luck (v8.3 final-5: tune Lv.1 luck)
    paper_vs_rock_luck: {
        1: 3, 5: 6,
        10: 12, 15: 18, 20: 24, 25: 28, 30: 30, 35: 30, 40: 30
    }
};

// ============== WE ARE FAMILY (mirror) ==============
// v8.3: MIRROR tuned từ TUNE_N=1000 với auto-tune binary search
const MIRROR = {
    // Kéo vs Kéo: giảm dmg%
    scissors_dmg_mult: {
        1: 0.647265625, 5: 0.651171875,
        10: 0.5515625, 15: 0.471484375, 20: 0.397265625, 25: 0.330859375, 30: 0.299609375, 35: 0.291796875, 40: 0.280078125
    },
    // Búa vs Búa: giảm def%
    rock_def_mult: {
        1: 0.3021484375, 5: 0.3021484375,
        10: 0.3021484375, 15: 0.3021484375, 20: 0.3021484375, 25: 0.7962890625, 30: 1.0841796875, 35: 1.2990234375, 40: 1.2796875
    },
    // Bao vs Bao: giảm nhẹ toàn bộ chỉ số
    paper_all_mult: {
        1: 0.4015625, 5: 0.4203125,
        10: 1.1984375, 15: 0.8046875, 20: 0.9015625, 25: 0.8296875, 30: 1.1984375, 35: 0.4859375, 40: 0.6171875
    }
};

// ============== NỘI TẠI (Passive) theo level ==============
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
//  ÁP DỤNG COUNTER + MIRROR (chuẩn bị trước trận)
//
//  Vòng khắc chế:  Búa > Kéo > Bao > Búa
//   - ROCK.counter(SCISSORS): Búa thắng, Búa +def
//   - SCISSORS.counter(PAPER): Kéo thắng, Kéo +dmg%
//   - PAPER.counter(ROCK):     Bao thắng, Bao +HP & +luck
// ============================================================

function prepareFight(statsA, statsB) {
    const A = { ...statsA, maxHp: statsA.hp };
    const B = { ...statsB, maxHp: statsB.hp };
    A.dmgMult = 1; B.dmgMult = 1;

    // ---- Counter: ROCK > SCISSORS  (Búa đánh Kéo) ----
    if (A.element === 'ROCK' && B.element === 'SCISSORS') {
        A.def += counterAt('rock_vs_scissors_def', A.level);
        A.maxHp += counterAt('rock_vs_scissors_hp', A.level);
        A.hp   += counterAt('rock_vs_scissors_hp', A.level);
    } else if (B.element === 'ROCK' && A.element === 'SCISSORS') {
        B.def += counterAt('rock_vs_scissors_def', B.level);
        B.maxHp += counterAt('rock_vs_scissors_hp', B.level);
        B.hp   += counterAt('rock_vs_scissors_hp', B.level);
    }
    // ---- Counter: SCISSORS > PAPER  (Kéo đánh Bao) ----
    else if (A.element === 'SCISSORS' && B.element === 'PAPER') {
        A.dmgMult *= (1 + counterAt('scissors_vs_paper_dmg', A.level));
        A.luck += counterAt('scissors_vs_paper_luck', A.level);
    } else if (B.element === 'SCISSORS' && A.element === 'PAPER') {
        B.dmgMult *= (1 + counterAt('scissors_vs_paper_dmg', B.level));
        B.luck += counterAt('scissors_vs_paper_luck', B.level);
    }
    // ---- Counter: PAPER > ROCK  (Bao đánh Búa) ----
    else if (A.element === 'PAPER' && B.element === 'ROCK') {
        const hpB = counterAt('paper_vs_rock_hp', A.level);
        const lkB = counterAt('paper_vs_rock_luck', A.level);
        A.maxHp += hpB; A.hp += hpB;
        A.luck += lkB;
    } else if (B.element === 'PAPER' && A.element === 'ROCK') {
        const hpB = counterAt('paper_vs_rock_hp', B.level);
        const lkB = counterAt('paper_vs_rock_luck', B.level);
        B.maxHp += hpB; B.hp += hpB;
        B.luck += lkB;
    }

    // ---- Mirror: same element ----
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
    // 1) dmg cơ bản sau def
    let dmg = rawDamage(attacker.atk, defender.def);

    // 2) nội tại Kéo crit
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

    // 3) counter/mirror dmg bonus
    if (attacker.dmgMult && attacker.dmgMult !== 1) {
        dmg *= attacker.dmgMult;
    }

    // 4) nội tại Búa guard
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

    // 5) nội tại Bao heal
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
    getDamageReduction, getPassiveChance, rawDamage, toIntDamage,
    statsAtLevel, lutAt, mirrorAt, counterAt,
    prepareFight, attackOnce, simulateBattle
};