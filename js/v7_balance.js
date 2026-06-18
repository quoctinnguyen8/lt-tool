// js/v7_balance.js
// Combat simulator v7 - port dữ liệu + core sang ES module để dùng chung
// cho cả Node (combat_simulator_v7/run.js không cần đổi) và browser.
//
// Cơ chế (giữ nguyên từ combat_simulator_v7/simulator.js):
//  - 3 hệ SCISSORS (Kéo) / ROCK (Búa) / PAPER (Bao) khắc chế xoay vòng
//  - Def -> dmg reduction:  R = 1 - 0.98^(def^0.8) (cap 95%)
//  - Luck -> passive:        P = 1 - 0.99^(luck^0.75) (cap 50%)
//  - Nội tại:
//      Kéo: crit 110%->125% (theo level), 120%->150% khi HP>75%
//      Búa: guard 10%->30%, 20%->60% khi HP<30%
//      Bao: heal 20%->40% dmg nhận vào (sau def), 40%->80% khi HP<25%

'use strict';

// ============================================================
//  CÔNG THỨC CƠ BẢN
// ============================================================

export function getDamageReduction(def) {
    if (def <= 0) return 0;
    const r = 1 - Math.pow(0.98, Math.pow(def, 0.8));
    return Math.max(0, Math.min(0.95, r));
}

export function getPassiveChance(luck) {
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
//  STATS PRESET
// ============================================================

export const PRESET = {
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

export const LEVELS = [1, 5, 10, 15, 20, 25, 30, 35, 40];
export const ELEMENTS = ['SCISSORS', 'ROCK', 'PAPER'];

// Target số lượt trung bình theo spec
export const TURN_TARGET = {
    SCISSORS: { 1: 7.5,  5: 8.7,  10: 10.0, 15: 11.2, 20: 12.5, 25: 13.7, 30: 14.5, 35: 15.3, 40: 16.0 },
    ROCK:     { 1: 9.0,  5: 10.5, 10: 12.0, 15: 13.5, 20: 15.0, 25: 16.5, 30: 17.5, 35: 18.7, 40: 20.0 },
    PAPER:    { 1: 8.0,  5: 9.3,  10: 10.6, 15: 11.9, 20: 13.1, 25: 14.4, 30: 15.6, 35: 16.8, 40: 18.0 }
};

export function statsAtLevel(element, lv, preset = PRESET) {
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

export const COUNTER = {
    scissors_vs_rock: {
        1: 0.30, 5: 0.30,
        10: 0.30, 15: 0.30, 20: 0.30, 25: 0.30, 30: 0.30, 35: 0.30, 40: 0.30
    },
    rock_vs_paper: {
        1: 5, 5: 10,
        10: 20, 15: 30, 20: 40, 25: 50, 30: 60, 35: 70, 40: 80
    },
    paper_vs_scissors: {
        1: 5, 5: 10,
        10: 30, 15: 50, 20: 80, 25: 110, 30: 150, 35: 200, 40: 250
    },
    paper_vs_scissors_luck: {
        1: 2, 5: 3,
        10: 5, 15: 6, 20: 7, 25: 7, 30: 6, 35: 5, 40: 4
    }
};

// ============== WE ARE FAMILY (mirror) ==============
export const MIRROR = {
    scissors_dmg_mult: {
        1: 0.80, 5: 0.75,
        10: 0.65, 15: 0.60, 20: 0.55, 25: 0.52, 30: 0.50, 35: 0.48, 40: 0.46
    },
    rock_def_mult: {
        1: 0.85, 5: 0.80,
        10: 0.70, 15: 0.62, 20: 0.55, 25: 0.50, 30: 0.45, 35: 0.40, 40: 0.36
    },
    paper_all_mult: {
        1: 0.92, 5: 0.90,
        10: 0.88, 15: 0.85, 20: 0.82, 25: 0.80, 30: 0.78, 35: 0.76, 40: 0.75
    }
};

// ============== NỘI TẠI (Passive) theo level ==============
export const PASSIVE_LUT = {
    scissorsCritLow:  { 1: 1.10, 5: 1.12, 10: 1.14, 15: 1.17, 20: 1.20, 25: 1.22, 30: 1.24, 35: 1.245, 40: 1.25 },
    scissorsCritHigh: { 1: 1.20, 5: 1.25, 10: 1.30, 15: 1.35, 20: 1.40, 25: 1.43, 30: 1.46, 35: 1.48, 40: 1.50 },
    rockGuardBase:    { 1: 0.10, 5: 0.13, 10: 0.16, 15: 0.19, 20: 0.22, 25: 0.25, 30: 0.27, 35: 0.29, 40: 0.30 },
    rockGuardLowHp:   { 1: 0.20, 5: 0.27, 10: 0.34, 15: 0.40, 20: 0.46, 25: 0.50, 30: 0.54, 35: 0.57, 40: 0.60 },
    paperHealBase:    { 1: 0.20, 5: 0.23, 10: 0.26, 15: 0.29, 20: 0.32, 25: 0.35, 30: 0.37, 35: 0.39, 40: 0.40 },
    paperHealLowHp:   { 1: 0.40, 5: 0.48, 10: 0.56, 15: 0.62, 20: 0.68, 25: 0.72, 30: 0.75, 35: 0.78, 40: 0.80 }
};

export function lutAt(LUT, lv) {
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

export function mirrorAt(key, lv)  { return lutAt(MIRROR[key], lv); }
export function counterAt(key, lv) { return lutAt(COUNTER[key], lv); }

// ============================================================
//  ÁP DỤNG COUNTER + MIRROR (chuẩn bị trước trận)
// ============================================================

export function prepareFight(statsA, statsB) {
    const A = { ...statsA, maxHp: statsA.hp };
    const B = { ...statsB, maxHp: statsB.hp };
    A.dmgMult = 1; B.dmgMult = 1;

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

export function attackOnce(attacker, defender) {
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

export function simulateBattle(statsA, statsB, goFirst = 'A', opts = {}) {
    const maxTurns = opts.maxTurns || 80;
    let first = goFirst === 'B' ? statsB : statsA;
    let second = goFirst === 'B' ? statsA : statsB;
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

// ============================================================
//  CHẠY NHIỀU TRẬN CHO 1 CẶP
// ============================================================

export function runOneMatch(aEl, bEl, level, n, goFirst = 'RND') {
    const sa = statsAtLevel(aEl, level);
    const sb = statsAtLevel(bEl, level);
    let winA = 0, winB = 0, draw = 0, totalTurns = 0;
    let sumHpAWin = 0, sumHpBWin = 0;
    for (let i = 0; i < n; i++) {
        let gf;
        if (goFirst === 'A') gf = 'A';
        else if (goFirst === 'B') gf = 'B';
        else gf = (i % 2 === 0) ? 'A' : 'B';
        const r = simulateBattle(sa, sb, gf);
        totalTurns += r.turns;
        if (r.winner === 'A') { winA++; sumHpAWin += r.winnerHpRatio; }
        else if (r.winner === 'B') { winB++; sumHpBWin += r.winnerHpRatio; }
        else { draw++; }
    }
    return {
        aEl, bEl, level, n,
        winA, winB, draw,
        winRateA: winA / n * 100,
        winRateB: winB / n * 100,
        drawRate: draw / n * 100,
        avgTurns: totalTurns / n,
        avgHpAWin: winA > 0 ? sumHpAWin / winA : 0,
        avgHpBWin: winB > 0 ? sumHpBWin / winB : 0
    };
}

// ============================================================
//  TÍNH REPORT CHO 1 LEVEL
// ============================================================

const PER_SYSTEM_MATCHUPS = {
    SCISSORS: [['SCISSORS','ROCK'], ['SCISSORS','PAPER'], ['SCISSORS','SCISSORS']],
    ROCK:     [['ROCK','PAPER'],    ['ROCK','SCISSORS'], ['ROCK','ROCK']],
    PAPER:    [['PAPER','SCISSORS'],['PAPER','ROCK'],     ['PAPER','PAPER']]
};

export const COUNTER_MATCHUPS = [
    { name: 'Kéo vs Búa',  counter: 'SCISSORS', victim: 'ROCK',     a: 'SCISSORS', b: 'ROCK'  },
    { name: 'Búa vs Bao',  counter: 'ROCK',     victim: 'PAPER',    a: 'ROCK',     b: 'PAPER' },
    { name: 'Bao vs Kéo',  counter: 'PAPER',    victim: 'SCISSORS', a: 'PAPER',    b: 'SCISSORS' }
];

function perSystemTurnsFromMap(levelResults) {
    const out = {};
    for (const el of ELEMENTS) {
        const m = PER_SYSTEM_MATCHUPS[el];
        out[el] = (levelResults[`${m[0][0]}_vs_${m[0][1]}`].avgTurns +
                   levelResults[`${m[1][0]}_vs_${m[1][1]}`].avgTurns +
                   levelResults[`${m[2][0]}_vs_${m[2][1]}`].avgTurns) / 3;
    }
    return out;
}

export function evaluateLevel(level, N, log = () => {}) {
    const pairs = [
        ['SCISSORS', 'ROCK'],
        ['ROCK', 'PAPER'],
        ['PAPER', 'SCISSORS'],
        ['ROCK', 'SCISSORS'],
        ['PAPER', 'ROCK'],
        ['SCISSORS', 'PAPER'],
        ['SCISSORS', 'SCISSORS'],
        ['ROCK', 'ROCK'],
        ['PAPER', 'PAPER']
    ];
    const levelResults = {};
    for (const [a, b] of pairs) {
        const key = `${a}_vs_${b}`;
        levelResults[key] = runOneMatch(a, b, level, N, 'RND');
    }
    const ps = perSystemTurnsFromMap(levelResults);
    const counterStats = {};
    for (const cm of COUNTER_MATCHUPS) {
        const fKey = `${cm.a}_vs_${cm.b}`;
        const sKey = `${cm.b}_vs_${cm.a}`;
        counterStats[cm.name] = {
            first: levelResults[fKey],
            second: levelResults[sKey]
        };
    }
    if (log.onDone) log.onDone({ levelResults, perSystem: ps, counterStats });
    return { levelResults, perSystem: ps, counterStats };
}

// ============================================================
//  AUTO-TUNE (binary search) - y hệt combat_simulator_v7/run.js
// ============================================================

export function tuneAll(N, log = () => {}) {
    log.onStart && log.onStart(N);
    for (const lv of LEVELS) {
        const t0 = Date.now();
        tuneLevel(lv, N, log);
        log.onLevel && log.onLevel(lv, (Date.now() - t0) / 1000);
    }
    log.onDone && log.onDone();
}

export function tuneLevel(level, N, log = () => {}) {
    function bsCounter(key) {
        let lo, hi;
        if (key === 'scissors_vs_rock') { lo = 0.05; hi = 1.50; }
        else if (key === 'rock_vs_paper') { lo = 0; hi = 600; }
        else if (key === 'paper_vs_scissors') { lo = 0; hi = 1500; }
        else if (key === 'paper_vs_scissors_luck') { lo = 0; hi = 60; }
        else return;

        for (let it = 0; it < 14; it++) {
            const mid = (lo + hi) / 2;
            COUNTER[key][level] = mid;
            const ev = evaluateLevel(level, N);
            let avgHp = -1, minWin = 100;
            if (key === 'scissors_vs_rock') {
                const f = ev.counterStats['Kéo vs Búa'].first;
                const s = ev.counterStats['Kéo vs Búa'].second;
                avgHp = (f.avgHpAWin + s.avgHpBWin) / 2;
                minWin = Math.min(f.winRateA, s.winRateB);
            } else if (key === 'rock_vs_paper') {
                const f = ev.counterStats['Búa vs Bao'].first;
                const s = ev.counterStats['Búa vs Bao'].second;
                avgHp = (f.avgHpAWin + s.avgHpBWin) / 2;
                minWin = Math.min(f.winRateA, s.winRateB);
            } else {
                const f = ev.counterStats['Bao vs Kéo'].first;
                const s = ev.counterStats['Bao vs Kéo'].second;
                avgHp = (f.avgHpAWin + s.avgHpBWin) / 2;
                minWin = Math.min(f.winRateA, s.winRateB);
            }
            const winOk = minWin >= 95;
            const hpTooHigh = avgHp > 0.35;
            const hpTooLow  = avgHp < 0.10;
            if (hpTooHigh) { hi = mid; }
            else if (hpTooLow) { lo = mid; }
            else if (!winOk) { lo = mid; }
            else { break; }
        }
        COUNTER[key][level] = (lo + hi) / 2;
    }

    function bsMirror(key, elSystem, targetTurn) {
        let lo, hi;
        if (key === 'scissors_dmg_mult') { lo = 0.30; hi = 2.00; }
        else if (key === 'rock_def_mult') { lo = 0.10; hi = 2.00; }
        else if (key === 'paper_all_mult') { lo = 0.40; hi = 2.00; }
        else return;

        for (let it = 0; it < 14; it++) {
            const mid = (lo + hi) / 2;
            MIRROR[key][level] = mid;
            const ev = evaluateLevel(level, N);
            const cur = ev.perSystem[elSystem];
            if (cur < targetTurn) {
                if (key === 'scissors_dmg_mult') hi = mid;
                else lo = mid;
            } else {
                if (key === 'scissors_dmg_mult') lo = mid;
                else hi = mid;
            }
        }
        MIRROR[key][level] = (lo + hi) / 2;
    }

    for (let outer = 0; outer < 8; outer++) {
        bsCounter('scissors_vs_rock');
        bsCounter('rock_vs_paper');
        bsCounter('paper_vs_scissors');
        bsCounter('paper_vs_scissors_luck');
        bsMirror('scissors_dmg_mult', 'SCISSORS', TURN_TARGET.SCISSORS[level]);
        bsMirror('rock_def_mult',     'ROCK',     TURN_TARGET.ROCK[level]);
        bsMirror('paper_all_mult',    'PAPER',    TURN_TARGET.PAPER[level]);
    }
}

// ============================================================
//  TỔNG HỢP REPORT (gọi 1 lần, in cả 3 bảng)
// ============================================================

export function buildReport(N) {
    const allResults = {};
    const allPS = {};
    const allCounter = {};
    for (const lv of LEVELS) {
        const ev = evaluateLevel(lv, N);
        allResults[lv] = ev.levelResults;
        allPS[lv] = ev.perSystem;
        allCounter[lv] = ev.counterStats;
    }
    return { allResults, allPS, allCounter };
}

export function evaluateGoals(report) {
    const { allPS, allCounter } = report;
    let turnOk = 0, turnTotal = 0;
    for (const el of ELEMENTS) {
        for (const lv of LEVELS) {
            const cur = allPS[lv][el];
            const tgt = TURN_TARGET[el][lv];
            const pct = (cur - tgt) / tgt * 100;
            const tol = lv < 10 ? 12 : 8;
            const ok = Math.abs(pct) <= tol;
            turnTotal++;
            if (ok) turnOk++;
        }
    }
    let winOk = 0, winTotal = 0, hpOk = 0, hpTotal = 0;
    for (const cm of COUNTER_MATCHUPS) {
        for (const lv of LEVELS) {
            if (lv < 10) continue;
            const f = allCounter[lv][cm.name].first;
            const s = allCounter[lv][cm.name].second;
            winTotal += 2;
            if (f.winRateA >= 95) winOk++;
            if (s.winRateB >= 95) winOk++;
            hpTotal += 2;
            const fHp = f.avgHpAWin * 100;
            const sHp = s.avgHpBWin * 100;
            if (fHp >= 10 && fHp <= 35) hpOk++;
            if (sHp >= 10 && sHp <= 35) hpOk++;
        }
    }
    return { turnOk, turnTotal, winOk, winTotal, hpOk, hpTotal };
}
