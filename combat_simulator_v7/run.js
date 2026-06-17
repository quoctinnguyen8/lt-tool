// e:\LingThu\lt-tool\combat_simulator_v7\run.js
// Combat simulator v7 - report + auto-tune theo req-ver7.md
//
// Chạy:
//    node run.js               (chạy N=2000 + in report, không tune)
//    N=10000 node run.js       (chạy N=10000, không tune)
//    TUNE=1 N=2000 node run.js (chạy tune ở N=2000, rồi in report)
//    TUNE=1 N=10000 node run.js (tune ở N=5000 rồi in report cuối 10000)

'use strict';

const sim = require('./simulator.js');
const { PRESET, COUNTER, MIRROR, PASSIVE_LUT, statsAtLevel, simulateBattle, counterAt, mirrorAt, lutAt } = sim;

const LEVELS = [1, 5, 10, 15, 20, 25, 30, 35, 40];
const ELEMENTS = ['SCISSORS', 'ROCK', 'PAPER'];

// Target số lượt trung bình theo spec
const TURN_TARGET = {
    SCISSORS: { 1: 7.5,  5: 8.7,  10: 10.0, 15: 11.2, 20: 12.5, 25: 13.7, 30: 14.5, 35: 15.3, 40: 16.0 },
    ROCK:     { 1: 9.0,  5: 10.5, 10: 12.0, 15: 13.5, 20: 15.0, 25: 16.5, 30: 17.5, 35: 18.7, 40: 20.0 },
    PAPER:    { 1: 8.0,  5: 9.3,  10: 10.6, 15: 11.9, 20: 13.1, 25: 14.4, 30: 15.6, 35: 16.8, 40: 18.0 }
};

const PER_SYSTEM_MATCHUPS = {
    SCISSORS: [
        ['SCISSORS', 'ROCK'],
        ['SCISSORS', 'PAPER'],
        ['SCISSORS', 'SCISSORS']
    ],
    ROCK: [
        ['ROCK', 'PAPER'],
        ['ROCK', 'SCISSORS'],
        ['ROCK', 'ROCK']
    ],
    PAPER: [
        ['PAPER', 'SCISSORS'],
        ['PAPER', 'ROCK'],
        ['PAPER', 'PAPER']
    ]
};

const COUNTER_MATCHUPS = [
    { name: 'Kéo vs Búa',  counter: 'SCISSORS', victim: 'ROCK',     a: 'SCISSORS', b: 'ROCK'  },
    { name: 'Búa vs Bao',  counter: 'ROCK',     victim: 'PAPER',    a: 'ROCK',     b: 'PAPER' },
    { name: 'Bao vs Kéo',  counter: 'PAPER',    victim: 'SCISSORS', a: 'PAPER',    b: 'SCISSORS' }
];

// ===================== HELPERS =====================
function line(s = '') { console.log(s); }
function pad(s, w) { return String(s).padEnd(w, ' '); }
function padN(s, w) { return String(s).padStart(w, ' '); }
function fmt(x, n = 2) { return Number(x).toFixed(n); }
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

/** Chạy N trận cho cặp (aEl, bEl) tại level lv.
 *  goFirst: 'A' (aEl đi trước), 'B' (bEl đi trước), 'RND' (random) */
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

/** Tính per-system turn count: trung bình của 3 kèo (counter+reverse+mirror) */
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

/** Đánh giá 1 level với N trận/kèo. Trả về { levelResults, perSystem, counterStats } */
function evaluateLevel(level, N) {
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
    return { levelResults, perSystem: ps, counterStats };
}

// ===================== TUNING =====================

/**
 * Tune COUNTER + MIRROR để đạt 2 mục tiêu.
 * Mỗi level độc lập.
 */
function tuneLevel(level, N) {
    // === BINARY SEARCH: COUNTER buff để đạt winrate + HP target ===
    // Quan hệ: buff ↑ (dmg mult ↑ / def ↑ / hp ↑) → winrate ↑, HP remaining ↑
    //          buff ↓ → winrate ↓, HP remaining ↓
    // Nếu HP < 10% → cần buff ↑ (để counter thắng nhanh hơn, HP cao hơn)
    // Nếu HP > 35% → cần buff ↓ (counter thắng nhanh quá, HP còn cao; giảm buff để HP thấp hơn)
    // Nếu winrate < 95% → cần buff ↑ (counter yếu, thua)
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

            if (hpTooHigh) {
                // Cần giảm buff để HP xuống
                hi = mid;
            } else if (hpTooLow) {
                // Cần tăng buff để HP lên (và winrate OK)
                lo = mid;
            } else if (!winOk) {
                // HP OK nhưng winrate thấp → tăng buff
                lo = mid;
            } else {
                // Cả 3 OK, kết thúc
                break;
            }
        }
        COUNTER[key][level] = (lo + hi) / 2;
    }

    // === BINARY SEARCH: MIRROR multiplier để đạt turn count target ===
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
                if (key === 'scissors_dmg_mult') hi = mid;     // giảm dmg
                else lo = mid;                                  // tăng def/giữ stats
            } else {
                if (key === 'scissors_dmg_mult') lo = mid;
                else hi = mid;
            }
        }
        MIRROR[key][level] = (lo + hi) / 2;
    }

    // === MAIN TUNE LOOP ===
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

function tuneAll(N) {
    console.log(`\n>>> Bắt đầu TUNE với N=${N} ...`);
    for (const lv of LEVELS) {
        process.stdout.write(`  Tuning Lv.${lv} ... `);
        const t0 = Date.now();
        tuneLevel(lv, N);
        console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    }
    console.log('<<< TUNE xong\n');
}

// ===================== REPORT =====================
function printReport(N) {
    console.log('='.repeat(96));
    console.log('  COMBAT SIMULATOR v7  --  ' + new Date().toISOString());
    console.log('='.repeat(96));
    console.log(`Số trận / kèo / level: ${N}  (gồm cả 2 chiều đi trước/đi sau)`);
    console.log(`Các mốc level: ${LEVELS.join(', ')}`);

    console.log('\n=== BASE STATS + GROWTH ===');
    for (const el of ELEMENTS) {
        const p = PRESET[el];
        const phase = el === 'SCISSORS' ? 'đầu (10-20)' : el === 'ROCK' ? 'cuối (30-40)' : 'giữa (20-30)';
        console.log(`  ${pad(p.name, 8)} base=HP${p.base.hp}/ATK${p.base.atk}/DEF${p.base.def}/LUCK${p.base.luck}  phase: ${phase}`);
        console.log(`    gHp   = [${p.growth.hp.join(', ')}]`);
        console.log(`    gAtk  = [${p.growth.atk.join(', ')}]`);
        console.log(`    gDef  = [${p.growth.def.join(', ')}]`);
        console.log(`    gLuck = [${p.growth.luck.join(', ')}]`);
    }
    console.log('\n=== COUNTER TABLE ===');
    console.log('  scissors_vs_rock dmg%: ', COUNTER.scissors_vs_rock);
    console.log('  rock_vs_paper def+:    ', COUNTER.rock_vs_paper);
    console.log('  paper_vs_scissors hp+: ', COUNTER.paper_vs_scissors);
    console.log('  paper_vs_scissors lck: ', COUNTER.paper_vs_scissors_luck);
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
        allResults[lv] = ev.levelResults;
        allPS[lv] = ev.perSystem;
        allCounter[lv] = ev.counterStats;
        console.log(`(${((Date.now() - t1) / 1000).toFixed(1)}s)`);
    }
    console.log(`Tổng thời gian: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

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

    let turnOk = 0, turnTotal = 0;
    for (const el of ELEMENTS) {
        for (const lv of LEVELS) {
            const cur = allPS[lv][el];
            const tgt = TURN_TARGET[el][lv];
            const pct = (cur - tgt) / tgt * 100;
            // Dưới level 10 cho phép lệch 1.5x tiêu chuẩn (±12% thay vì ±8%)
            const tol = lv < 10 ? 12 : 8;
            const ok = Math.abs(pct) <= tol;
            turnTotal++;
            if (ok) turnOk++;
        }
    }
    console.log(`\n  Mục tiêu 1 (số lượt ±8% Lv.10+, ±12% Lv.<10): ${turnOk}/${turnTotal} mốc đạt\n`);

    // ----- BẢNG 2: WIN RATE -----
    console.log('-'.repeat(96));
    console.log('  BẢNG 2: TỈ LỆ THẮNG CỦA TỪNG KÈO (A-first/B-second)');
    console.log('  Target: kèo khắc chế phải thắng cả 2 chiều (>=95%, tốt nhất 100%)');
    console.log('-'.repeat(96));
    const matchupNames = [
        ['SCISSORS_vs_ROCK',     'Kéo vs Búa (counter)'],
        ['ROCK_vs_PAPER',        'Búa vs Bao (counter)'],
        ['PAPER_vs_SCISSORS',    'Bao vs Kéo (counter)'],
        ['ROCK_vs_SCISSORS',     'Búa vs Kéo (rev)'],
        ['PAPER_vs_ROCK',        'Bao vs Búa (rev)'],
        ['SCISSORS_vs_PAPER',    'Kéo vs Bao (rev)'],
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
    console.log(`  Mục tiêu 1 (số lượt ±8% Lv.10+, ±12% Lv.<10):  ${turnOk}/${turnTotal} mốc đạt`);
    console.log(`  Mục tiêu 2 (counter winrate >=95%):  ${winOk}/${winTotal} mốc đạt (Lv.10+)`);
    console.log(`  Mục tiêu 2 (HP remaining 10-35%):    ${hpOk}/${hpTotal} mốc đạt (Lv.10+)`);
    console.log('='.repeat(96) + '\n');
}

// ===================== MAIN =====================
const N = parseInt(process.env.N || '2000', 10);
const TUNE = process.env.TUNE === '1';
const TUNE_N = parseInt(process.env.TUNE_N || '500', 10);

console.log(`N = ${N}, TUNE = ${TUNE}, TUNE_N = ${TUNE_N}`);
if (TUNE) {
    // Tune với số mẫu nhỏ để nhanh, in report cuối với N
    tuneAll(TUNE_N);
}
printReport(N);
