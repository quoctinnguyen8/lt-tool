// combat_simulator_v10/simulator_v10.js
// Ling Thú combat simulator - phiên bản 10
// Viết mới hoàn toàn, không build system, tập trung cân bằng
'use strict';

// ============================================================
// MILESTONES & ELEMENTS
// ============================================================
const MS = [1, 5, 10, 15, 20, 25, 30, 35, 40];
const EL = ['SCISSORS', 'ROCK', 'PAPER'];
const EL_NAME = { SCISSORS: 'Kéo', ROCK: 'Búa', PAPER: 'Bao' };
const EL_EMOJI = { SCISSORS: '✂️', ROCK: '🔨', PAPER: '📄' };

// ============================================================
// TARGET TURN COUNTS
// ============================================================
const TARGET_TURNS = {
    SCISSORS: { 1: 7.0, 5: 8.0, 10: 8.8, 15: 9.5, 20: 10.2, 25: 11.0, 30: 11.8, 35: 12.8, 40: 14.0 },
    ROCK:     { 1: 8.5, 5: 9.8, 10: 10.8, 15: 11.8, 20: 12.8, 25: 14.0, 30: 15.2, 35: 16.5, 40: 18.0 },
    PAPER:    { 1: 7.5, 5: 8.5, 10: 9.5, 15: 10.5, 20: 11.5, 25: 12.5, 30: 13.5, 35: 14.8, 40: 16.0 }
};

// ============================================================
// CÔNG THỨC CƠ BẢN
// ============================================================
function drRate(def) {
    if (def <= 0) return 0;
    return Math.max(0, Math.min(0.95, 1 - Math.pow(0.98, Math.pow(def, 0.8))));
}
function passiveChance(luck) {
    if (luck <= 0) return 0;
    return Math.max(0, Math.min(0.90, 1 - Math.pow(0.99, Math.pow(luck, 0.75))));
}
function rawDmg(atk, def) { return atk * (1 - drRate(def)); }
function intDmg(d) { return Math.max(0, Math.floor(d)); }

// ============================================================
// STATS TABLES: base + growth per level theo 4 giai đoạn
// Giai đoạn: [2-10], [11-20], [21-30], [31-40]
// Mỗi hệ có 2 chỉ số chính được tăng mạnh, 2 chỉ số phụ tăng chậm
// ============================================================

// growth[stat][phase] = giá trị tăng mỗi level trong phase đó
const STATS_CFG = {
    SCISSORS: {
        // ATK/LUCK là primary — glass cannon: ATK+LUCK cao nhất, HP+DEF thấp nhất
        base:   { hp: 90, atk: 18, def: 2, luck: 7 },
        growth: {
            hp:   [10, 14, 10, 18],
            atk:  [1.5, 2.0, 1.0, 1.4],
            def:  [0.10, 0.15, 0.10, 0.15],
            luck: [0.7, 0.9, 0.5, 0.7]
        }
    },
    ROCK: {
        // HP/DEF là primary — tanker: HP+DEF cao nhất, ATK+LUCK thấp nhất
        base:   { hp: 110, atk: 13, def: 7, luck: 4 },
        growth: {
            hp:   [12, 16, 24, 20],
            atk:  [0.9, 1.2, 1.4, 1.1],
            def:  [0.5, 0.6, 1.1, 0.6],
            luck: [0.25, 0.25, 0.35, 0.25]
        }
    },
    PAPER: {
        // cân bằng giữa 2 thái cực — balanced
        base:   { hp: 100, atk: 14, def: 4, luck: 6 },
        growth: {
            hp:   [14, 18, 14, 22],
            atk:  [1.1, 1.3, 1.0, 1.1],
            def:  [0.2, 0.25, 0.2, 0.25],
            luck: [0.7, 0.5, 0.4, 0.5]
        }
    }
};

function phaseIdx(lv) {
    if (lv <= 10) return 0;
    if (lv <= 20) return 1;
    if (lv <= 30) return 2;
    return 3;
}

function statsAtLv(el, lv, cfg = STATS_CFG) {
    const c = cfg[el];
    let hp = c.base.hp, atk = c.base.atk, def = c.base.def, luck = c.base.luck;
    for (let l = 2; l <= lv; l++) {
        const p = phaseIdx(l);
        hp   += c.growth.hp[p];
        atk  += c.growth.atk[p];
        def  += c.growth.def[p];
        luck += c.growth.luck[p];
    }
    return { element: el, level: lv, hp: Math.round(hp * 10) / 10,
             atk: Math.round(atk * 10) / 10, def: Math.round(def * 10) / 10,
             luck: Math.round(luck * 10) / 10, maxHp: Math.round(hp * 10) / 10 };
}

// ============================================================
// PASSIVE LUT (nội tại theo level, nội suy tuyến tính)
// ============================================================
const PASSIVE = {
    scissorsCritLow:  { 1: 1.10, 5: 1.12, 10: 1.14, 15: 1.17, 20: 1.20, 25: 1.22, 30: 1.24, 35: 1.245, 40: 1.25 },
    scissorsCritHigh: { 1: 1.20, 5: 1.25, 10: 1.30, 15: 1.35, 20: 1.40, 25: 1.43, 30: 1.46, 35: 1.48, 40: 1.50 },
    rockGuardBase:    { 1: 0.10, 5: 0.13, 10: 0.16, 15: 0.19, 20: 0.22, 25: 0.25, 30: 0.27, 35: 0.29, 40: 0.30 },
    rockGuardLowHp:   { 1: 0.20, 5: 0.27, 10: 0.34, 15: 0.40, 20: 0.46, 25: 0.50, 30: 0.54, 35: 0.57, 40: 0.60 },
    paperHealBase:    { 1: 0.20, 5: 0.23, 10: 0.26, 15: 0.29, 20: 0.32, 25: 0.35, 30: 0.37, 35: 0.39, 40: 0.40 },
    paperHealLowHp:   { 1: 0.40, 5: 0.48, 10: 0.56, 15: 0.62, 20: 0.68, 25: 0.72, 30: 0.75, 35: 0.78, 40: 0.80 }
};

function lutAt(table, lv) {
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    if (lv <= keys[0]) return table[keys[0]];
    if (lv >= keys[keys.length - 1]) return table[keys[keys.length - 1]];
    for (let i = 0; i < keys.length - 1; i++) {
        if (lv >= keys[i] && lv <= keys[i + 1]) {
            const t = (lv - keys[i]) / (keys[i + 1] - keys[i]);
            return table[keys[i]] + (table[keys[i + 1]] - table[keys[i]]) * t;
        }
    }
    return table[keys[keys.length - 1]];
}

// ============================================================
// COUNTER (khắc chế) - sẽ được tune
// Búa > Kéo: Búa +def và +hp
// Kéo > Bao: Kéo +dmg% và +luck
// Bao > Búa: Bao +hp và +luck
// ============================================================
const COUNTER = {
    rock_vs_scissors_def:  { 1: 1, 5: 5, 10: 11.5, 15: 17.5, 20: 24.7, 25: 24.7, 30: 24.7, 35: 24.7, 40: 24.7 },
    rock_vs_scissors_hp:   { 1: 5, 5: 12, 10: 24, 15: 39, 20: 54, 25: 54, 30: 54, 35: 54, 40: 54 },
    scissors_vs_paper_atk: { 1: 0.5, 5: 1.4, 10: 5.8, 15: 11.1, 20: 13.8, 25: 20.3, 30: 31.9, 35: 31.9, 40: 31.9 },
    scissors_vs_paper_luck:{ 1: 1, 5: 2, 10: 7.4, 15: 10.8, 20: 10.8, 25: 17.3, 30: 24.8, 35: 24.8, 40: 24.8 },
    paper_vs_rock_hp:      { 1: 5, 5: 15, 10: 15, 15: 15, 20: 15, 25: 156, 30: 323, 35: 323, 40: 323 },
    paper_vs_rock_luck:    { 1: 1, 5: 2, 10: 2, 15: 2, 20: 2, 25: 20, 30: 39.2, 35: 39.2, 40: 39.2 }
};

// ============================================================
// MIRROR (We are family)
// ============================================================
const MIRROR = {
    scissors_dmg_mult: { 1: 0.87, 5: 0.86, 10: 0.765, 15: 0.765, 20: 0.705, 25: 0.685, 30: 0.665, 35: 0.665, 40: 0.655 },
    rock_def_mult:     { 1: 0.01, 5: 0.235, 10: 0.29, 15: 0.385, 20: 0.41, 25: 0.35, 30: 0.305, 35: 0.42, 40: 0.555 },
    paper_all_mult:    { 1: 0.40, 5: 0.395, 10: 0.395, 15: 0.415, 20: 0.46, 25: 0.49, 30: 0.52, 35: 0.56, 40: 0.60 }
};

// ============================================================
// PREPARE FIGHT: áp dụng counter + mirror
// ============================================================
function prepareFight(a, b, counterLUT, mirrorLUT) {
    const A = { ...a, maxHp: a.hp, dmgMult: 1 };
    const B = { ...b, maxHp: b.hp, dmgMult: 1 };

    // --- COUNTER ---
    if (A.element === 'ROCK' && B.element === 'SCISSORS') {
        const defB = lutAt(counterLUT.rock_vs_scissors_def, A.level);
        const hpB  = lutAt(counterLUT.rock_vs_scissors_hp, A.level);
        A.def += defB; A.maxHp += hpB; A.hp += hpB;
    } else if (B.element === 'ROCK' && A.element === 'SCISSORS') {
        const defB = lutAt(counterLUT.rock_vs_scissors_def, B.level);
        const hpB  = lutAt(counterLUT.rock_vs_scissors_hp, B.level);
        B.def += defB; B.maxHp += hpB; B.hp += hpB;
    } else if (A.element === 'SCISSORS' && B.element === 'PAPER') {
        A.atk += lutAt(counterLUT.scissors_vs_paper_atk, A.level);
        A.luck += lutAt(counterLUT.scissors_vs_paper_luck, A.level);
    } else if (B.element === 'SCISSORS' && A.element === 'PAPER') {
        B.atk += lutAt(counterLUT.scissors_vs_paper_atk, B.level);
        B.luck += lutAt(counterLUT.scissors_vs_paper_luck, B.level);
    } else if (A.element === 'PAPER' && B.element === 'ROCK') {
        const hpB  = lutAt(counterLUT.paper_vs_rock_hp, A.level);
        const lkB  = lutAt(counterLUT.paper_vs_rock_luck, A.level);
        A.maxHp += hpB; A.hp += hpB;
        A.luck += lkB;
    } else if (B.element === 'PAPER' && A.element === 'ROCK') {
        const hpB  = lutAt(counterLUT.paper_vs_rock_hp, B.level);
        const lkB  = lutAt(counterLUT.paper_vs_rock_luck, B.level);
        B.maxHp += hpB; B.hp += hpB;
        B.luck += lkB;
    }

    // --- MIRROR ---
    if (A.element === B.element) {
        if (A.element === 'SCISSORS') {
            const m = lutAt(mirrorLUT.scissors_dmg_mult, A.level);
            A.dmgMult *= m; B.dmgMult *= m;
        } else if (A.element === 'ROCK') {
            const m = lutAt(mirrorLUT.rock_def_mult, A.level);
            A.def *= m; B.def *= m;
        } else if (A.element === 'PAPER') {
            const m = lutAt(mirrorLUT.paper_all_mult, A.level);
            A.hp *= m; A.maxHp *= m; A.atk *= m; A.def *= m; A.luck *= m;
            B.hp *= m; B.maxHp *= m; B.atk *= m; B.def *= m; B.luck *= m;
        }
    }
    return { A, B };
}

// ============================================================
// TẤN CÔNG 1 LƯỢT
// ============================================================
function attackOnce(attacker, defender) {
    let dmg = rawDmg(attacker.atk, defender.def);

    // Kéo passive: crit
    let crit = false;
    if (attacker.element === 'SCISSORS') {
        if (Math.random() < passiveChance(attacker.luck)) {
            const isHigh = (attacker.hp / attacker.maxHp) > 0.75;
            const mult = isHigh ? lutAt(PASSIVE.scissorsCritHigh, attacker.level)
                               : lutAt(PASSIVE.scissorsCritLow, attacker.level);
            dmg *= mult; crit = true;
        }
    }
    if (attacker.dmgMult && attacker.dmgMult !== 1) dmg *= attacker.dmgMult;

    // Búa passive: guard (giảm sát thương nhận)
    let guard = false;
    if (defender.element === 'ROCK') {
        if (Math.random() < passiveChance(defender.luck)) {
            const isLow = (defender.hp / defender.maxHp) < 0.30;
            const r = isLow ? lutAt(PASSIVE.rockGuardLowHp, defender.level)
                           : lutAt(PASSIVE.rockGuardBase, defender.level);
            dmg *= (1 - r); guard = true;
        }
    }
    const dealt = intDmg(dmg);
    defender.hp = Math.max(0, defender.hp - dealt);

    // Bao passive: heal từ sát thương nhận
    let heal = 0;
    if (defender.element === 'PAPER' && defender.hp > 0 && dealt > 0) {
        if (Math.random() < passiveChance(defender.luck)) {
            const isLow = (defender.hp / defender.maxHp) < 0.25;
            const rate = isLow ? lutAt(PASSIVE.paperHealLowHp, defender.level)
                              : lutAt(PASSIVE.paperHealBase, defender.level);
            heal = Math.max(1, Math.floor(dealt * rate));
            defender.hp = Math.min(defender.maxHp, defender.hp + heal);
        }
    }
    return { dmg: dealt, crit, guard, heal };
}

// ============================================================
// MÔ PHỎNG 1 TRẬN
// ============================================================
function simulateBattle(a, b, goFirst = 'A', opts = {}) {
    const counterLUT = opts.counterLUT || COUNTER;
    const mirrorLUT  = opts.mirrorLUT  || MIRROR;
    const maxTurns   = opts.maxTurns   || 100;

    const first  = goFirst === 'B' ? b : a;
    const second = goFirst === 'B' ? a : b;
    const prep = prepareFight(first, second, counterLUT, mirrorLUT);
    const atk1 = prep.A, atk2 = prep.B;

    // Map prepared objects back to original: aObj luôn là stats của bên 'A' gốc
    const aObj = goFirst === 'B' ? atk2 : atk1;
    const bObj = goFirst === 'B' ? atk1 : atk2;

    let turns = 0;
    while (turns < maxTurns && atk1.hp > 0 && atk2.hp > 0) {
        turns++;
        attackOnce(atk1, atk2);
        if (atk2.hp <= 0) break;
        attackOnce(atk2, atk1);
    }

    let winner;
    if (atk1.hp > 0 && atk2.hp <= 0)
        winner = goFirst === 'B' ? 'B' : 'A';
    else if (atk2.hp > 0 && atk1.hp <= 0)
        winner = goFirst === 'B' ? 'A' : 'B';
    else if (atk1.hp > atk2.hp)
        winner = goFirst === 'B' ? 'B' : 'A';
    else if (atk2.hp > atk1.hp)
        winner = goFirst === 'B' ? 'A' : 'B';
    else
        winner = 'DRAW';

    const wObj = winner === 'A' ? aObj : (winner === 'B' ? bObj : null);
    const lObj = winner === 'A' ? bObj : (winner === 'B' ? aObj : null);

    return {
        winner, turns,
        winnerHp: wObj ? wObj.hp : atk1.hp,
        winnerMaxHp: wObj ? wObj.maxHp : atk1.maxHp,
        winnerHpRatio: wObj ? wObj.hp / wObj.maxHp : 0,
        loserHp: lObj ? lObj.hp : 0,
        loserMaxHp: lObj ? lObj.maxHp : 1
    };
}

// ============================================================
// BATTLE RUNNER: chạy N trận giữa 2 pet
// ============================================================
function runBattles(aEl, bEl, lv, n, goFirst, opts = {}) {
    const sa = statsAtLv(aEl, lv);
    const sb = statsAtLv(bEl, lv);
    let wins = 0, hpSum = 0, turnSum = 0, draws = 0;
    for (let i = 0; i < n; i++) {
        const r = simulateBattle(sa, sb, goFirst, opts);
        turnSum += r.turns;
        if (r.winner === 'A') { wins++; hpSum += r.winnerHpRatio; }
        else if (r.winner === 'B') { /* B thắng */ }
        else { draws++; }
    }
    return {
        wr: wins / n * 100,
        avgHp: wins > 0 ? hpSum / wins * 100 : 0,
        avgTurns: turnSum / n,
        draws: draws / n * 100
    };
}

// Export
module.exports = {
    MS, EL, EL_NAME, EL_EMOJI, TARGET_TURNS,
    STATS_CFG, COUNTER, MIRROR, PASSIVE,
    drRate, passiveChance, rawDmg, intDmg,
    statsAtLv, lutAt, phaseIdx,
    prepareFight, attackOnce, simulateBattle,
    runBattles
};
