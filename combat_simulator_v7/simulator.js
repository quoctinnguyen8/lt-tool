// e:\LingThu\lt-tool\combat_simulator_v7\simulator.js
// Combat simulator v7 - viết lại hoàn toàn mới theo req-ver7.md
//
// Cơ chế:
//  - 3 hệ SCISSORS (Kéo) / ROCK (Búa) / PAPER (Bao) khắc chế xoay vòng
//      Kéo > Búa > Bao > Kéo
//  - Mỗi hệ có 4 chỉ số: hp, atk, def, luck
//  - Def -> dmg reduction:  R = 1 - 0.98^(def^0.8)
//  - Luck -> tỉ lệ kích hoạt nội tại:  P = 1 - 0.99^(luck^0.75)
//  - Stats thực (có thể lẻ), sát thương làm tròn floor
//  - Nội tại:
//      Kéo: 110%->125% dmg (theo level), 120%->150% khi HP>75%
//      Búa: 10%->30% giảm dmg (theo level), 20%->60% khi HP<30%
//      Bao: hồi 20%->40% dmg nhận vào (sau def), 40%->80% khi HP<25%
//
// Khắc chế (mục tiêu 2):
//  - Kéo vs Búa:  Kéo +dmg (mạnh đầu, yếu dần về cuối)
//  - Búa vs Bao:  Búa +armor (yếu đầu, mạnh cuối)
//  - Bao vs Kéo:  Bao +hp, +luck (trung bình)
//
// We are family (mirror):
//  - Kéo vs Kéo:  giảm dmg để tăng lượt
//  - Búa vs Búa:  giảm def để cân bằng lượt
//  - Bao vs Bao:  giảm nhẹ toàn bộ chỉ số
//
// Module này chỉ chứa logic combat. Tuning/balance nằm ở run.js.

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

/** Sát thương cơ bản sau def (số thực) */
function rawDamage(atk, def) {
    return atk * (1 - getDamageReduction(def));
}

/** Floor thành số nguyên, tối thiểu 0 */
function toIntDamage(d) {
    return Math.max(0, Math.floor(d));
}

// ============================================================
//  STATS PRESET (sẽ được auto-tune trong run.js)
// ============================================================

/**
 * Mỗi hệ có:
 *   base: { hp, atk, def, luck }  - chỉ số ở level 1
 *   growth: { hp, atk, def, luck } - mảng 4 số cho 4 giai đoạn
 *                                       [Lv1-10, Lv10-20, Lv20-30, Lv30-40]
 *
 * Base HP khởi đầu khoảng 100 theo spec.
 */
const PRESET = {
    SCISSORS: {
        name: 'Hệ Kéo',
        base:   { hp: 100, atk: 16, def: 1, luck: 7 },
        growth: { hp:   [16,  28,  20, 42],
                  atk:  [ 1.8,  3.2,  3.0,  4.5],
                  def:  [ 0.05, 0.20, 0.25, 0.40],
                  luck: [ 0.6,  0.7,  0.8,  1.2] }
    },
    ROCK: {
        name: 'Hệ Búa',
        // Tăng base ATK, giảm HP để giảm turn count early
        base:   { hp: 100, atk: 11, def: 5, luck: 5 },
        growth: { hp:   [16,  28,  36, 46],
                  atk:  [ 1.1,  1.8,  2.4,  2.6],
                  def:  [ 0.6,  0.8,  1.0,  1.2],
                  luck: [ 0.3,  0.4,  0.4,  0.5] }
    },
    PAPER: {
        name: 'Hệ Bao',
        base:   { hp: 90, atk: 14, def: 4, luck: 5 },
        growth: { hp:   [16,  26,  32, 38],
                  atk:  [ 1.7,  2.3,  2.6,  2.6],
                  def:  [ 0.4,  0.5,  0.7,  0.8],
                  luck: [ 0.3,  0.4,  0.5,  0.5] }
    }
};

/**
 * Tính stats tại level lv (1..40) theo base + growth 4 giai đoạn.
 * Trả về stats thực (có thể lẻ cho atk/def/luck; hp cũng giữ float).
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
//  COUNTER (khắc chế) - bảng theo level
// ============================================================

const COUNTER = {
    // Kéo vs Búa: dmg bonus cho Kéo (mạnh đầu, yếu dần về cuối theo spec)
    // Sẽ được auto-tune
    scissors_vs_rock: {
        1: 0.30, 5: 0.30,
        10: 0.30, 15: 0.30, 20: 0.30, 25: 0.30, 30: 0.30, 35: 0.30, 40: 0.30
    },
    // Búa vs Bao: def bonus cho Búa (yếu đầu, mạnh cuối)
    rock_vs_paper: {
        1: 5, 5: 10,
        10: 20, 15: 30, 20: 40, 25: 50, 30: 60, 35: 70, 40: 80
    },
    // Bao vs Kéo: hp bonus cho Bao
    paper_vs_scissors: {
        1: 5, 5: 10,
        10: 30, 15: 50, 20: 80, 25: 110, 30: 150, 35: 200, 40: 250
    },
    // Bao vs Kéo: luck bonus cho Bao
    paper_vs_scissors_luck: {
        1: 2, 5: 3,
        10: 5, 15: 6, 20: 7, 25: 7, 30: 6, 35: 5, 40: 4
    }
};

// ============== WE ARE FAMILY (mirror) ==============
const MIRROR = {
    // Kéo vs Kéo: giảm dmg
    scissors_dmg_mult: {
        1: 0.80, 5: 0.75,
        10: 0.65, 15: 0.60, 20: 0.55, 25: 0.52, 30: 0.50, 35: 0.48, 40: 0.46
    },
    // Búa vs Búa: giảm def
    rock_def_mult: {
        1: 0.85, 5: 0.80,
        10: 0.70, 15: 0.62, 20: 0.55, 25: 0.50, 30: 0.45, 35: 0.40, 40: 0.36
    },
    // Bao vs Bao: giảm nhẹ toàn bộ chỉ số
    paper_all_mult: {
        1: 0.92, 5: 0.90,
        10: 0.88, 15: 0.85, 20: 0.82, 25: 0.80, 30: 0.78, 35: 0.76, 40: 0.75
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
    const keys = Object.keys(LUT).map(Number).sort((a,b)=>a-b);
    if (lv <= keys[0]) return LUT[keys[0]];
    if (lv >= keys[keys.length-1]) return LUT[keys[keys.length-1]];
    for (let i = 0; i < keys.length-1; i++) {
        const lo = keys[i], hi = keys[i+1];
        if (lv >= lo && lv <= hi) {
            const t = (lv - lo) / (hi - lo);
            return LUT[lo] + (LUT[hi] - LUT[lo]) * t;
        }
    }
    return LUT[keys[keys.length-1]];
}

function mirrorAt(key, lv)  { return lutAt(MIRROR[key], lv); }
function counterAt(key, lv) { return lutAt(COUNTER[key], lv); }

// ============================================================
//  ÁP DỤNG COUNTER + MIRROR (chuẩn bị trước trận)
// ============================================================

/**
 * Chuẩn bị 2 bên cho trận đấu:
 *  - Tính maxHp = hp ban đầu
 *  - Áp dụng counter buff nếu là cặp khắc chế
 *  - Áp dụng mirror debuff nếu là cùng hệ
 * Trả về { A, B } với stats đã sẵn sàng (giữ hp = maxHp).
 */
function prepareFight(statsA, statsB) {
    const A = { ...statsA, maxHp: statsA.hp };
    const B = { ...statsB, maxHp: statsB.hp };
    A.dmgMult = 1; B.dmgMult = 1;

    // Counter
    if (A.element === 'SCISSORS' && B.element === 'ROCK') {
        A.dmgMult *= (1 + counterAt('scissors_vs_rock', A.level));
    } else if (B.element === 'SCISSORS' && A.element === 'ROCK') {
        B.dmgMult *= (1 + counterAt('scissors_vs_rock', B.level));
    } else if (A.element === 'ROCK' && B.element === 'PAPER') {
        A.def += counterAt('rock_vs_paper', A.level);
    } else if (B.element === 'ROCK' && A.element === 'PAPER') {
        B.def += counterAt('rock_vs_paper', B.level);
    } else if (A.element === 'PAPER' && B.element === 'SCISSORS') {
        const hpB = counterAt('paper_vs_scissors', A.level);
        const lkB = counterAt('paper_vs_scissors_luck', A.level);
        A.maxHp += hpB; A.hp += hpB;
        A.luck += lkB;
    } else if (B.element === 'PAPER' && A.element === 'SCISSORS') {
        const hpB = counterAt('paper_vs_scissors', B.level);
        const lkB = counterAt('paper_vs_scissors_luck', B.level);
        B.maxHp += hpB; B.hp += hpB;
        B.luck += lkB;
    }
    // Mirror
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

/**
 * attacker đánh defender (1 hit).
 * Trả về { dmg, crit, guard, heal }
 */
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

    // Floor + apply
    const dealt = toIntDamage(dmg);
    defender.hp = Math.max(0, defender.hp - dealt);

    // 5) nội tại Bao heal (sau khi nhận dmg)
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

/**
 * Mô phỏng trận đấu giữa 2 stats.
 *   statsA, statsB: { element, level, hp, atk, def, luck }
 *   goFirst: 'A' | 'B' (mặc định 'A')
 * Trả về:
 *   { winner, turns, winnerHp, winnerMaxHp, winnerHpRatio, loserHp, loserMaxHp }
 */
function simulateBattle(statsA, statsB, goFirst = 'A', opts = {}) {
    const maxTurns = opts.maxTurns || 80;
    let first = goFirst === 'B' ? statsB : statsA;
    let second = goFirst === 'B' ? statsA : statsB;
    // prepareFight tính maxHp theo hp input; với việc đổi first/second ta wrap
    // bằng cách gán nhãn và hoán vị kết quả.
    const prepared = prepareFight(first, second);
    const A = prepared.A, B = prepared.B;

    let turns = 0;
    while (turns < maxTurns && A.hp > 0 && B.hp > 0) {
        turns++;
        attackOnce(A, B);
        if (B.hp <= 0) break;
        attackOnce(B, A);
    }
    // Xác định winner theo nhãn ban đầu
    let winnerLabel; // 'A' hoặc 'B' theo nhãn gốc của user
    if (A.hp > 0 && B.hp <= 0) {
        winnerLabel = (first === statsA) ? 'A' : 'B';
    } else if (B.hp > 0 && A.hp <= 0) {
        winnerLabel = (first === statsA) ? 'B' : 'A';
    } else {
        // Hết turn: ai còn nhiều HP hơn thắng
        if (A.hp > B.hp) winnerLabel = (first === statsA) ? 'A' : 'B';
        else if (B.hp > A.hp) winnerLabel = (first === statsA) ? 'B' : 'A';
        else winnerLabel = 'DRAW';
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
