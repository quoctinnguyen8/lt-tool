// e:\LingThu\lt-tool\combat_simulator_v8\run.js
// Combat simulator v8 - report + auto-tune theo req-ver8.md
//
// Cách chạy:
//    node run.js                  (chạy N=2000 + in report, không tune)
//    N=2000 node run.js           (chạy N=2000)
//    TUNE=1 N=2000 node run.js    (tune với TUNE_N rồi in report cuối)
//    TUNE=1 TUNE_N=2000 N=2000    (tune kỹ hơn)
//
// Vòng khắc chế TRUYỀN THỐNG:  Búa > Kéo > Bao > Búa

'use strict';

const sim = require('./simulator.js');
const { PRESET, COUNTER, MIRROR, PASSIVE_LUT, statsAtLevel, simulateBattle, counterAt, mirrorAt, lutAt } = sim;

const LEVELS = [1, 5, 10, 15, 20, 25, 30, 35, 40];
const ELEMENTS = ['SCISSORS', 'ROCK', 'PAPER'];

// Target số lượt trung bình theo spec req-ver8
const TURN_TARGET = {
    SCISSORS: { 1: 7.5,  5: 8.7,  10: 10.0, 15: 11.2, 20: 12.5, 25: 13.7, 30: 14.5, 35: 15.3, 40: 16.0 },
    ROCK:     { 1: 9.0,  5: 10.5, 10: 12.0, 15: 13.5, 20: 15.0, 25: 16.5, 30: 17.5, 35: 18.7, 40: 20.0 },
    PAPER:    { 1: 8.0,  5: 9.3,  10: 10.6, 15: 11.9, 20: 13.1, 25: 14.4, 30: 15.6, 35: 16.8, 40: 18.0 }
};

// Vòng truyền thống: Búa > Kéo > Bao > Búa
// Kèo counter (counterElement_thắng_victimElement):
//   ROCK counter SCISSORS   (Búa vs Kéo)
//   SCISSORS counter PAPER  (Kéo vs Bao)
//   PAPER counter ROCK      (Bao vs Búa)
const COUNTER_MATCHUPS = [
    { name: 'Búa vs Kéo',  counter: 'ROCK',     victim: 'SCISSORS', a: 'ROCK',     b: 'SCISSORS' },
    { name: 'Kéo vs Bao',  counter: 'SCISSORS', victim: 'PAPER',    a: 'SCISSORS', b: 'PAPER'    },
    { name: 'Bao vs Búa',  counter: 'PAPER',    victim: 'ROCK',     a: 'PAPER',    b: 'ROCK'     }
];

const PER_SYSTEM_MATCHUPS = {
    SCISSORS: [
        ['SCISSORS', 'PAPER'],    // Kéo vs Bao (counter + reversed to kéo)
        ['PAPER',    'SCISSORS'], // Bao vs Kéo (mirror-like reverse, kéo defending)
        ['SCISSORS', 'SCISSORS']  // mirror
    ],
    ROCK: [
        ['ROCK',     'SCISSORS'], // Búa vs Kéo (counter)
        ['SCISSORS', 'ROCK'],     // Kéo vs Búa (reverse)
        ['ROCK',     'ROCK']      // mirror
    ],
    PAPER: [
        ['PAPER',    'ROCK'],     // Bao vs Búa (counter)
        ['ROCK',     'PAPER'],    // Búa vs Bao (reverse)
        ['PAPER',    'PAPER']     // mirror
    ]
};

// ===================== HELPERS =====================
function line(s = '') { console.log(s); }
function pad(s, w)  { return String(s).padEnd(w, ' '); }
function padN(s, w) { return String(s).padStart(w, ' '); }
function fmt(x, n = 2) { return Number(x).toFixed(n); }
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

function runOneMatch(aEl, bEl, level, n, goFirst = 'RND') {
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

function evaluateLevel(level, N) {
    const pairs = [
        ['ROCK',     'SCISSORS'],
        ['SCISSORS', 'ROCK'],
        ['SCISSORS', 'PAPER'],
        ['PAPER',    'SCISSORS'],
        ['PAPER',    'ROCK'],
        ['ROCK',     'PAPER'],
        ['SCISSORS', 'SCISSORS'],
        ['ROCK',     'ROCK'],
        ['PAPER',    'PAPER']
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
    return { levelResults, perSystem: ps, counterStats };
}

// ===================== TUNING =====================

/**
 * BINARY SEARCH: COUNTER buff để đạt winrate + HP target cho CẢ HAI CHIỀU.
 *   - buff ↑ → winrate ↑, HP remaining ↑
 *   - Nếu 1 chiều thắng, chiều kia thua → chia đôi hiệu số, tăng buff
 *   - Nếu HP > 35% → buff ↓
 *   - Nếu HP < 10% → buff ↑
 *   - winrate < 95% ở chiều nào → buff ↑
 */
function bsCounter(key, level, N) {
    let lo, hi;
    if      (key === 'scissors_vs_paper_dmg') { lo = 0.00; hi = 1.50; }
    else if (key === 'rock_vs_scissors_def')  { lo = 0;    hi = 300;  }
    else if (key === 'paper_vs_rock_hp')      { lo = 0;    hi = 1500; }
    else if (key === 'paper_vs_rock_luck')    { lo = 0;    hi = 60;   }
    else return;

    let counterName;
    if      (key === 'rock_vs_scissors_def')      counterName = 'Búa vs Kéo';
    else if (key === 'scissors_vs_paper_dmg')     counterName = 'Kéo vs Bao';
    else                                          counterName = 'Bao vs Búa';

    for (let it = 0; it < 16; it++) {
        const mid = (lo + hi) / 2;
        COUNTER[key][level] = mid;
        const ev = evaluateLevel(level, N);
        const f = ev.counterStats[counterName].first;
        const s = ev.counterStats[counterName].second;

        const winF = f.winRateA;        // counter đi trước thắng
        const winS = s.winRateB;        // counter đi sau thắng
        const minWin = Math.min(winF, winS);
        const avgHp  = (f.avgHpAWin + s.avgHpBWin) / 2;

        // Lv < 10 user chấp nhận sai số gấp rưỡi
        const tolHpLow  = level < 10 ? 0.05 : 0.10;
        const tolHpHigh = level < 10 ? 0.50 : 0.35;

        const winOk    = minWin >= 95;
        const hpTooHi  = avgHp > tolHpHigh;
        const hpTooLo  = avgHp < tolHpLow;
        const winFirstBad  = winF < 95;
        const winSecondBad = winS < 95;

        if (hpTooHi) {
            hi = mid; // giảm buff
        } else if (hpTooLo) {
            lo = mid; // tăng buff
        } else if (!winOk) {
            // Cả 2 chiều winrate < 95% → tăng buff
            // Chỉ 1 chiều tệ → vẫn tăng buff
            lo = mid;
        } else {
            // OK
            break;
        }
    }
    COUNTER[key][level] = (lo + hi) / 2;
}

/**
 * BINARY SEARCH: MIRROR multiplier để đạt turn count target.
 */
function bsMirror(key, elSystem, targetTurn, level, N) {
    let lo, hi;
    // Clamp bounds để mirror không đi quá cực đoan
    //   < 0.30 → stats quá yếu → dmg = 0 → maxTurns (vô lý)
    //   > 1.40 → stats quá mạnh → mirror thành "không phải mirror"
    if      (key === 'scissors_dmg_mult') { lo = 0.20; hi = 0.70; }
    else if (key === 'rock_def_mult')     { lo = 0.30; hi = 1.40; }
    else if (key === 'paper_all_mult')    { lo = 0.40; hi = 1.20; }
    else return;

    for (let it = 0; it < 14; it++) {
        const mid = (lo + hi) / 2;
        MIRROR[key][level] = mid;
        const ev = evaluateLevel(level, N);
        const cur = ev.perSystem[elSystem];
        const pct = (cur - targetTurn) / targetTurn;
        if (pct < -0.001) {
            // Cần tăng số lượt
            if (key === 'scissors_dmg_mult') hi = mid;   // giảm dmg → turn tăng
            else if (key === 'rock_def_mult') lo = mid;  // tăng def → turn tăng
            else if (key === 'paper_all_mult') lo = mid; // tăng stats → turn tăng
        } else if (pct > 0.001) {
            // Cần giảm số lượt
            if (key === 'scissors_dmg_mult') lo = mid;
            else if (key === 'rock_def_mult') hi = mid;
            else if (key === 'paper_all_mult') hi = mid;
        } else {
            // Đạt target chính xác
            break;
        }
        if (hi - lo < 0.005) break;
    }
    MIRROR[key][level] = (lo + hi) / 2;
}

function tuneLevel(level, N) {
    // Vòng lặp ngoài: COUNTER + MIRROR tương tác qua lại 4 lần
    for (let round = 0; round < 4; round++) {
        // COUNTER: tăng đến khi cả 2 chiều đạt winrate >= 95% (ưu tiên 100%) HOẶC hit upper bound
        // Sau đó GIẢM nếu HP > 35% (giữ winrate 100%)
        for (let it = 0; it < 8; it++) {
            bsCounter('rock_vs_scissors_def',      level, N);
            bsCounter('scissors_vs_paper_dmg',     level, N);
            bsCounter('paper_vs_rock_hp',          level, N);
            bsCounter('paper_vs_rock_luck',        level, N);
        }
        // Sau COUNTER, GIẢM nếu HP > tolHigh (kể cả khi winrate = 100%)
        for (let it = 0; it < 6; it++) {
            reduceCounterIfHpTooHigh(level, N);
        }
        // Cuối cùng: ép chính xác cho Bao vs Búa ở Lv.1,5 (HP remaining quá cao)
        if (level === 1 || level === 5) {
            forcePaperVsRockHp(level, N);
        }
        // MIRROR: tinh chỉnh turn count
        for (let it = 0; it < 8; it++) {
            bsMirror('scissors_dmg_mult', 'SCISSORS', TURN_TARGET.SCISSORS[level], level, N);
            bsMirror('rock_def_mult',     'ROCK',     TURN_TARGET.ROCK[level],     level, N);
            bsMirror('paper_all_mult',    'PAPER',    TURN_TARGET.PAPER[level],    level, N);
        }
    }

    // Cuối cùng: nếu số lượt của 1 hệ vẫn lệch quá target, điều chỉnh growth tạm
    //   (chỉ áp dụng khi 3 hệ đều có mirror tốt nhưng vẫn fail tolerance)
    adjustGrowthForTurnCount(level, N);
}

/**
 * Điều chỉnh growth tổng quát nếu mirror không thể đạt target.
 *  - Ưu tiên điều chỉnh tăng/giảm dmg (kéo), def (búa), hp (bao) để số lượt đạt target.
 *  - Chỉ chỉnh tỉ lệ nhỏ (±20%).
 */
function adjustGrowthForTurnCount(level, N) {
    // Nếu số lượt của 1 hệ vẫn lệch quá ±10% target, điều chỉnh growth tổng quát
    // (chỉ áp dụng cho Lv.20-40 nơi mirror đã bị bound)
    if (level < 20) return;
    const ev = evaluateLevel(level, N);
    for (const el of ['SCISSORS', 'ROCK', 'PAPER']) {
        const cur = ev.perSystem[el];
        const tgt = TURN_TARGET[el][level];
        const pct = (cur - tgt) / tgt;
        if (Math.abs(pct) <= 0.10) continue;

        const idx = level <= 10 ? 0 : level <= 20 ? 1 : level <= 30 ? 2 : 3;
        // pct > 0 → quá nhiều lượt
        //   SCISSORS: tăng atk growth → dmg nhiều → turn giảm
        //   ROCK:     giảm def growth → dmg nhận nhiều → turn giảm
        //   PAPER:    tăng atk growth → dmg nhiều → turn giảm
        // pct < 0 → quá ít lượt → ngược lại
        if (el === 'SCISSORS') {
            if (pct > 0) PRESET.SCISSORS.growth.atk[idx] *= 1.05;
            else         PRESET.SCISSORS.growth.atk[idx] *= 0.95;
        } else if (el === 'ROCK') {
            if (pct > 0) PRESET.ROCK.growth.def[idx] *= 0.95;
            else         PRESET.ROCK.growth.def[idx] *= 1.05;
        } else if (el === 'PAPER') {
            if (pct > 0) PRESET.PAPER.growth.atk[idx] *= 1.05;
            else         PRESET.PAPER.growth.atk[idx] *= 0.95;
        }
    }
    // Re-tune mirror sau khi đổi growth
    for (let it = 0; it < 4; it++) {
        bsMirror('scissors_dmg_mult', 'SCISSORS', TURN_TARGET.SCISSORS[level], level, N);
        bsMirror('rock_def_mult',     'ROCK',     TURN_TARGET.ROCK[level],     level, N);
        bsMirror('paper_all_mult',    'PAPER',    TURN_TARGET.PAPER[level],    level, N);
    }
}

/**
 * Tìm paper_vs_rock_hp để Bao vs Búa HP remaining ở mức [tolLow, tolHigh].
 * Bắt đầu từ giá trị hiện tại, GIẢM nếu HP quá cao.
 */
function forcePaperVsRockHp(level, N) {
    const tolLow  = level < 10 ? 0.05 : 0.10;
    const tolHigh = level < 10 ? 0.35 : 0.30;  // Mục tiêu chặt hơn ở Lv.1,5

    let lo = 0;
    let hi = COUNTER.paper_vs_rock_hp[level];
    for (let it = 0; it < 12; it++) {
        const mid = (lo + hi) / 2;
        COUNTER.paper_vs_rock_hp[level] = mid;
        const ev = evaluateLevel(level, N);
        const f = ev.counterStats['Bao vs Búa'].first;
        const s = ev.counterStats['Bao vs Búa'].second;
        const avgHp = (f.avgHpAWin + s.avgHpBWin) / 2;
        const minWin = Math.min(f.winRateA, s.winRateB);
        if (avgHp > tolHigh) {
            hi = mid;
        } else if (avgHp < tolLow) {
            lo = mid;
        } else if (minWin < 95) {
            lo = mid;
        } else {
            break;
        }
    }
    COUNTER.paper_vs_rock_hp[level] = (lo + hi) / 2;

    // Tương tự với paper_vs_rock_luck
    let lo2 = 0;
    let hi2 = COUNTER.paper_vs_rock_luck[level];
    for (let it = 0; it < 8; it++) {
        const mid = (lo2 + hi2) / 2;
        COUNTER.paper_vs_rock_luck[level] = mid;
        const ev = evaluateLevel(level, N);
        const f = ev.counterStats['Bao vs Búa'].first;
        const s = ev.counterStats['Bao vs Búa'].second;
        const avgHp = (f.avgHpAWin + s.avgHpBWin) / 2;
        const minWin = Math.min(f.winRateA, s.winRateB);
        if (avgHp > tolHigh) {
            hi2 = mid;
        } else if (avgHp < tolLow) {
            lo2 = mid;
        } else if (minWin < 95) {
            lo2 = mid;
        } else {
            break;
        }
    }
    COUNTER.paper_vs_rock_luck[level] = (lo2 + hi2) / 2;
}

/**
 * GIẢM counter buff nếu HP remaining > tolHigh (kể cả khi winrate = 100%).
 * Ưu tiên giảm buff gây ảnh hưởng HP nhiều nhất.
 */
function reduceCounterIfHpTooHigh(level, N) {
    const tolHigh = level < 10 ? 0.50 : 0.35;
    const targets = [
        { key: 'rock_vs_scissors_def',     counterName: 'Búa vs Kéo' },
        { key: 'scissors_vs_paper_dmg',    counterName: 'Kéo vs Bao' },
        { key: 'paper_vs_rock_hp',         counterName: 'Bao vs Búa' },
        { key: 'paper_vs_rock_luck',       counterName: 'Bao vs Búa' }
    ];
    for (const t of targets) {
        const cur = COUNTER[t.key][level];
        if (cur <= 0) continue;
        const ev = evaluateLevel(level, N);
        const f = ev.counterStats[t.counterName].first;
        const s = ev.counterStats[t.counterName].second;
        const avgHp = (f.avgHpAWin + s.avgHpBWin) / 2;
        if (avgHp <= tolHigh) continue;
        // HP > tolHigh, giảm buff 5% mỗi vòng
        let lo = 0, hi = cur;
        for (let it = 0; it < 10; it++) {
            const mid = (lo + hi) / 2;
            COUNTER[t.key][level] = mid;
            const ev2 = evaluateLevel(level, N);
            const f2 = ev2.counterStats[t.counterName].first;
            const s2 = ev2.counterStats[t.counterName].second;
            const avgHp2 = (f2.avgHpAWin + s2.avgHpBWin) / 2;
            const minWin = Math.min(f2.winRateA, s2.winRateB);
            if (avgHp2 > tolHigh) {
                hi = mid;
            } else if (avgHp2 < tolHigh * 0.85) {
                // HP quá thấp, tăng lại
                lo = mid;
            } else if (minWin < 95) {
                lo = mid;
            } else {
                break;
            }
        }
        COUNTER[t.key][level] = (lo + hi) / 2;
    }
}

function tuneAll(N) {
    console.log(`\n>>> Bắt đầu TUNE với N=${N} ...`);
    for (const lv of LEVELS) {
        process.stdout.write(`  Tuning Lv.${lv} ... `);
        const t0 = Date.now();
        tuneLevel(lv, N);
        console.log(`(${(Date.now() - t0) / 1000}s)`);
    }
    console.log('<<< TUNE xong\n');
}

// ===================== REPORT =====================
function printReport(N) {
    console.log('='.repeat(96));
    console.log('  COMBAT SIMULATOR v8  --  ' + new Date().toISOString());
    console.log('='.repeat(96));
    console.log(`Số trận / kèo / level: ${N}  (gồm cả 2 chiều đi trước/đi sau)`);
    console.log(`Các mốc level: ${LEVELS.join(', ')}`);

    console.log('\n=== BASE STATS + GROWTH ===');
    for (const el of ELEMENTS) {
        const p = PRESET[el];
        console.log(`  ${pad(p.name, 8)} base=HP${p.base.hp}/ATK${p.base.atk}/DEF${p.base.def}/LUCK${p.base.luck}`);
        console.log(`    gHp   = [${p.growth.hp.join(', ')}]`);
        console.log(`    gAtk  = [${p.growth.atk.join(', ')}]`);
        console.log(`    gDef  = [${p.growth.def.join(', ')}]`);
        console.log(`    gLuck = [${p.growth.luck.join(', ')}]`);
    }

    // STATS chi tiết từng mốc level
    console.log('\n=== STATS CHI TIẾT TỪNG MỐC LEVEL ===');
    console.log('| ' + pad('Hệ / Lv', 12) + ' | ' +
        pad('HP',   7) + ' | ' + pad('ATK', 6) + ' | ' + pad('DEF', 6) + ' | ' +
        pad('LUCK', 6) + ' | ' + pad('dmgRed%', 8) + ' | ' + pad('passive%', 9) + ' |');
    console.log('| ' + pad('-'.repeat(12), 12) + ' | ' +
        '------: | ' + '-----: | ' + '-----: | ' + '-----: | ' +
        '--------: | ' + '---------: |');
    for (const el of ELEMENTS) {
        for (const lv of LEVELS) {
            const s = statsAtLevel(el, lv);
            const dr = (getDamageReductionLocal(s.def) * 100).toFixed(1);
            const pc = (getPassiveChanceLocal(s.luck) * 100).toFixed(1);
            console.log('| ' + pad(`${PRESET[el].name} Lv.${lv}`, 12) + ' | ' +
                padN(s.hp.toFixed(0),   7) + ' | ' + padN(s.atk.toFixed(1), 6) + ' | ' +
                padN(s.def.toFixed(1),  6) + ' | ' + padN(s.luck.toFixed(1), 6) + ' | ' +
                padN(dr + '%', 8) + ' | ' + padN(pc + '%', 9) + ' |');
        }
    }

    console.log('\n=== COUNTER TABLE ===');
    console.log('  rock_vs_scissors_def:  ', COUNTER.rock_vs_scissors_def);
    console.log('  scissors_vs_paper_dmg: ', COUNTER.scissors_vs_paper_dmg);
    console.log('  paper_vs_rock_hp:      ', COUNTER.paper_vs_rock_hp);
    console.log('  paper_vs_rock_luck:    ', COUNTER.paper_vs_rock_luck);
    console.log('\n=== MIRROR TABLE ===');
    console.log('  scissors_dmg_mult:', MIRROR.scissors_dmg_mult);
    console.log('  rock_def_mult:    ', MIRROR.rock_def_mult);
    console.log('  paper_all_mult:   ', MIRROR.paper_all_mult);

    console.log('\nĐang chạy simulation...');
    const t0 = Date.now();
    const allResults = {};
    const allPS = {};
    const allCounter = {};
    for (const lv of LEVELS) {
        process.stdout.write(`  Lv.${lv} ... `);
        const t1 = Date.now();
        const ev = evaluateLevel(lv, N);
        allResults[lv]  = ev.levelResults;
        allPS[lv]       = ev.perSystem;
        allCounter[lv]  = ev.counterStats;
        console.log(`(${(Date.now() - t1) / 1000}s)`);
    }
    console.log(`Tổng thời gian: ${(Date.now() - t0) / 1000}s`);

    // ----- BẢNG 1: SỐ LƯỢT -----
    console.log('\n' + '-'.repeat(96));
    console.log('  BẢNG 1: SỐ LƯỢT ĐÁNH TRUNG BÌNH THEO HỆ (actual)');
    console.log('  Target: Kéo 7.5→16,  Búa 9→20,  Bao 8→18  (Lv.1 → Lv.40)');
    console.log('-'.repeat(96));
    console.log('| ' + pad('Hệ / Lv', 14) + ' | ' + LEVELS.map(l => padN('Lv.' + l, 7)).join(' | ') + ' |');
    console.log('| ' + pad('-'.repeat(14), 14) + ' | ' + LEVELS.map(() => '------:').join(' | ') + ' |');
    for (const el of ELEMENTS) {
        const label = el === 'SCISSORS' ? '✂️ Kéo' : el === 'ROCK' ? '🔨 Búa' : '📄 Bao';
        const cells = [pad(label, 14)]
            .concat(LEVELS.map(l => padN(allPS[l][el].toFixed(1), 7)));
        console.log('| ' + cells.join(' | ') + ' |');
    }
    console.log('\nTarget chi tiết (actual/target):');
    for (const el of ELEMENTS) {
        const label = el === 'SCISSORS' ? 'Kéo' : el === 'ROCK' ? 'Búa' : 'Bao';
        console.log(`  ${label}: ` + LEVELS.map(l => `${allPS[l][el].toFixed(1)}/${TURN_TARGET[el][l]}`).join('  '));
    }

    // Chấm điểm số lượt: Lv<10 sai số gấp rưỡi (±12% thay vì ±8%)
    let turnOk = 0, turnTotal = 0;
    const turnFlags = [];
    for (const el of ELEMENTS) {
        for (const lv of LEVELS) {
            const cur = allPS[lv][el];
            const tgt = TURN_TARGET[el][lv];
            const pct = (cur - tgt) / tgt * 100;
            const tol = lv < 10 ? 12 : 8;
            const ok = Math.abs(pct) <= tol;
            turnTotal++;
            if (ok) turnOk++;
            turnFlags.push({ el, lv, cur, tgt, pct, ok, tol });
        }
    }
    console.log(`\n  Mục tiêu 1 (số lượt ±8% Lv.10+, ±12% Lv.<10): ${turnOk}/${turnTotal} mốc đạt`);

    // ----- BẢNG 2: WIN RATE -----
    console.log('\n' + '-'.repeat(96));
    console.log('  BẢNG 2: TỈ LỆ THẮNG CỦA TỪNG KÈO (A-first/B-second)');
    console.log('  Target: kèo khắc chế phải thắng cả 2 chiều (>=95%, tốt nhất 100%)');
    console.log('-'.repeat(96));
    const matchupNames = [
        ['ROCK_vs_SCISSORS',     'Búa vs Kéo (counter)'],
        ['SCISSORS_vs_PAPER',    'Kéo vs Bao (counter)'],
        ['PAPER_vs_ROCK',        'Bao vs Búa (counter)'],
        ['SCISSORS_vs_ROCK',     'Kéo vs Búa (rev)'],
        ['ROCK_vs_PAPER',        'Búa vs Bao (rev)'],
        ['PAPER_vs_SCISSORS',    'Bao vs Kéo (rev)'],
        ['SCISSORS_vs_SCISSORS', 'Kéo vs Kéo (mirror)'],
        ['ROCK_vs_ROCK',         'Búa vs Búa (mirror)'],
        ['PAPER_vs_PAPER',       'Bao vs Bao (mirror)']
    ];
    console.log('| ' + pad('Kèo', 28) + ' | ' + LEVELS.map(l => padN('Lv.' + l, 9)).join(' | ') + ' |');
    console.log('| ' + pad('-'.repeat(28), 28) + ' | ' + LEVELS.map(() => '---------:').join(' | ') + ' |');
    for (const [key, name] of matchupNames) {
        const cells = [pad(name, 28)]
            .concat(LEVELS.map(lv => {
                const r = allResults[lv][key];
                return padN(r.winRateA.toFixed(1) + '/' + r.winRateB.toFixed(1), 9);
            }));
        console.log('| ' + cells.join(' | ') + ' |');
    }

    // ----- BẢNG 3: HP CÒN LẠI -----
    console.log('\n' + '-'.repeat(96));
    console.log('  BẢNG 3: HP% CÒN LẠI TB KHI BÊN KHẮC CHẾ THẮNG (target 10-35%)');
    console.log('-'.repeat(96));
    console.log('| ' + pad('Kèo / chiều', 30) + ' | ' + LEVELS.map(l => padN('Lv.' + l, 9)).join(' | ') + ' |');
    console.log('| ' + pad('-'.repeat(30), 30) + ' | ' + LEVELS.map(() => '---------:').join(' | ') + ' |');
    for (const cm of COUNTER_MATCHUPS) {
        const fName = `${cm.name} (${cm.counter}-first)`;
        const sName = `${cm.name} (${cm.counter}-second)`;
        const fCells = [pad(fName, 30)]
            .concat(LEVELS.map(lv => {
                const f = allCounter[lv][cm.name].first;
                return padN((f.avgHpAWin * 100).toFixed(0) + '%', 9);
            }));
        const sCells = [pad(sName, 30)]
            .concat(LEVELS.map(lv => {
                const s = allCounter[lv][cm.name].second;
                return padN((s.avgHpBWin * 100).toFixed(0) + '%', 9);
            }));
        console.log('| ' + fCells.join(' | ') + ' |');
        console.log('| ' + sCells.join(' | ') + ' |');
    }

    // ----- ĐÁNH GIÁ -----
    console.log('\n' + '='.repeat(96));
    console.log('  ĐÁNH GIÁ TỔNG HỢP');
    console.log('='.repeat(96));
    let winOk = 0, winTotal = 0, hpOk = 0, hpTotal = 0;
    for (const cm of COUNTER_MATCHUPS) {
        for (const lv of LEVELS) {
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
    console.log(`  Mục tiêu 1 (số lượt ±8% Lv.10+, ±12% Lv.<10):  ${turnOk}/${turnTotal} mốc đạt`);
    console.log(`  Mục tiêu 2 (counter winrate >=95%):  ${winOk}/${winTotal} mốc đạt (toàn bộ level)`);
    console.log(`  Mục tiêu 2 (HP remaining 10-35%):    ${hpOk}/${hpTotal} mốc đạt (toàn bộ level)`);
    console.log('='.repeat(96) + '\n');
}

function getDamageReductionLocal(def) {
    if (def <= 0) return 0;
    const r = 1 - Math.pow(0.98, Math.pow(def, 0.8));
    return Math.max(0, Math.min(0.95, r));
}
function getPassiveChanceLocal(luck) {
    if (luck <= 0) return 0;
    const p = 1 - Math.pow(0.99, Math.pow(luck, 0.75));
    return Math.max(0, Math.min(0.5, p));
}

// ===================== MAIN =====================
const N = parseInt(process.env.N || '2000', 10);
const TUNE = process.env.TUNE === '1';
const TUNE_N = parseInt(process.env.TUNE_N || '500', 10);

console.log(`N = ${N}, TUNE = ${TUNE}, TUNE_N = ${TUNE_N}`);
if (TUNE) {
    tuneAll(TUNE_N);
}
printReport(N);