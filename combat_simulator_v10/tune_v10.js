// combat_simulator_v10/tune_v10.js
// Auto-tuner + console report cho combat simulator v10
// Có ràng buộc monotonic: counter/mirror chỉ tăng (hoặc giảm) đều theo level
'use strict';

const sim = require('./simulator_v10.js');
const {
    MS, EL, EL_NAME, EL_EMOJI, TARGET_TURNS,
    STATS_CFG, COUNTER, MIRROR, PASSIVE,
    drRate, passiveChance,
    statsAtLv, lutAt,
    runBattles
} = sim;

const N = 2000;
const COUNTER_PAIRS = [
    { name: 'Búa vs Kéo', counter: 'ROCK', victim: 'SCISSORS' },
    { name: 'Kéo vs Bao', counter: 'SCISSORS', victim: 'PAPER' },
    { name: 'Bao vs Búa', counter: 'PAPER', victim: 'ROCK' }
];

const n1 = x => Number(x).toFixed(1);
const n2 = x => Number(x).toFixed(2);
const pct = x => Math.round(x);

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function enforceIncreasing(lut) {
    const keys = Object.keys(lut).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < keys.length; i++) {
        if (lut[keys[i]] < lut[keys[i - 1]]) lut[keys[i]] = lut[keys[i - 1]];
    }
    return lut;
}

function enforceDecreasing(lut) {
    const keys = Object.keys(lut).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < keys.length; i++) {
        if (lut[keys[i]] > lut[keys[i - 1]]) lut[keys[i]] = lut[keys[i - 1]];
    }
    return lut;
}

// ============================================================
// COUNTER TUNING with MONOTONIC
// ============================================================
function tuneCounter(counter, mirror) {
    console.log('\n⚙️  Tuning COUNTER (khắc chế)...');
    let changed = 0, totalIter = 0;

    for (const lv of MS) {
        if (lv < 10) continue;

        for (const cp of COUNTER_PAIRS) {
            let bestScore = -Infinity, bestMult = 1.0;

            for (let mult = 0.5; mult <= 3.0; mult += 0.1) {
                totalIter++;
                const test = deepClone(counter);

                if (cp.counter === 'ROCK') {
                    test.rock_vs_scissors_def[lv] = Math.round(COUNTER.rock_vs_scissors_def[lv] * mult * 10) / 10;
                    test.rock_vs_scissors_hp[lv]  = Math.round(COUNTER.rock_vs_scissors_hp[lv]  * mult);
                    enforceIncreasing(test.rock_vs_scissors_def);
                    enforceIncreasing(test.rock_vs_scissors_hp);
                } else if (cp.counter === 'SCISSORS') {
                    test.scissors_vs_paper_atk[lv]  = Math.round(COUNTER.scissors_vs_paper_atk[lv]  * mult * 10) / 10;
                    test.scissors_vs_paper_luck[lv] = Math.round(COUNTER.scissors_vs_paper_luck[lv] * mult * 10) / 10;
                    enforceIncreasing(test.scissors_vs_paper_atk);
                    enforceIncreasing(test.scissors_vs_paper_luck);
                } else {
                    test.paper_vs_rock_hp[lv]   = Math.round(COUNTER.paper_vs_rock_hp[lv]   * mult);
                    test.paper_vs_rock_luck[lv] = Math.round(COUNTER.paper_vs_rock_luck[lv] * mult * 10) / 10;
                    enforceIncreasing(test.paper_vs_rock_hp);
                    enforceIncreasing(test.paper_vs_rock_luck);
                }

                const r1 = runBattles(cp.counter, cp.victim, lv, N, 'A', { counterLUT: test, mirrorLUT: mirror });
                const rv = runBattles(cp.victim, cp.counter, lv, N, 'A', { counterLUT: test, mirrorLUT: mirror });
                const r2wr = 100 - rv.wr;
                const r2   = runBattles(cp.counter, cp.victim, lv, N, 'B', { counterLUT: test, mirrorLUT: mirror });

                let score = 0;
                score += Math.min(r1.wr, 100) * 2;
                score += Math.min(r2wr, 100) * 2;

                const hpScore = (hp) => {
                    if (hp >= 10 && hp <= 50) return 100;
                    if (hp < 10) return hp * 10;
                    if (hp > 50) return Math.max(0, 100 - (hp - 50) * 3);
                    return 0;
                };
                score += hpScore(r1.avgHp);
                score += hpScore(r2.avgHp);

                if (score > bestScore) { bestScore = score; bestMult = mult; }
            }

            if (bestMult !== 1.0) {
                changed++;
                if (cp.counter === 'ROCK') {
                    counter.rock_vs_scissors_def[lv] = Math.round(COUNTER.rock_vs_scissors_def[lv] * bestMult * 10) / 10;
                    counter.rock_vs_scissors_hp[lv]  = Math.round(COUNTER.rock_vs_scissors_hp[lv]  * bestMult);
                } else if (cp.counter === 'SCISSORS') {
                    counter.scissors_vs_paper_atk[lv]  = Math.round(COUNTER.scissors_vs_paper_atk[lv]  * bestMult * 10) / 10;
                    counter.scissors_vs_paper_luck[lv] = Math.round(COUNTER.scissors_vs_paper_luck[lv] * bestMult * 10) / 10;
                } else {
                    counter.paper_vs_rock_hp[lv]   = Math.round(COUNTER.paper_vs_rock_hp[lv]   * bestMult);
                    counter.paper_vs_rock_luck[lv] = Math.round(COUNTER.paper_vs_rock_luck[lv] * bestMult * 10) / 10;
                }
            }
        }
    }

    enforceIncreasing(counter.rock_vs_scissors_def);
    enforceIncreasing(counter.rock_vs_scissors_hp);
    enforceIncreasing(counter.scissors_vs_paper_atk);
    enforceIncreasing(counter.scissors_vs_paper_luck);
    enforceIncreasing(counter.paper_vs_rock_hp);
    enforceIncreasing(counter.paper_vs_rock_luck);

    console.log(`  ✅ Counter tuned (${changed} levels, ${totalIter} scans)`);
    return counter;
}

// ============================================================
// MIRROR TUNING with MONOTONIC
// ============================================================
function tuneMirror(mirror, counter) {
    console.log('\n⚙️  Tuning MIRROR (We are family)...');
    let totalIter = 0;

    for (const lv of MS) {
        for (const el of EL) {
            let key, step;
            if (el === 'SCISSORS') { key = 'scissors_dmg_mult'; step = 0.005; }
            else if (el === 'ROCK') { key = 'rock_def_mult'; step = 0.005; }
            else { key = 'paper_all_mult'; step = 0.005; }

            const target = TARGET_TURNS[el][lv];
            const tolerance = lv < 10 ? 1.0 : 0.7;
            let iter = 0;

            while (iter < 100) {
                iter++; totalIter++;
                const r = runBattles(el, el, lv, N, 'A', { mirrorLUT: mirror, counterLUT: counter });
                const diff = r.avgTurns - target;
                if (Math.abs(diff) <= tolerance) break;

                if (el === 'ROCK') {
                    mirror[key][lv] += (diff > 0 ? -step : step);
                } else {
                    mirror[key][lv] += (diff > 0 ? step : -step);
                }
                mirror[key][lv] = Math.max(0.01, Math.round(mirror[key][lv] * 10000) / 10000);

                // Không enforce monotonic trên mirror giữa các level
                // Vì mirror chỉ là internal tuning parameter, không phải "chỉ số" hiển thị
            }
        }
    }

    console.log(`  ✅ Mirror tuned (${totalIter} iterations)`);
    // Không enforce monotonic global cho mirror
    return mirror;
}

// ============================================================
// EVALUATE
// ============================================================
function evaluate(counter, mirror) {
    let score = 0, turnPass = 0, wrPass = 0, hpPass = 0;
    for (const lv of MS) {
        const tol = lv < 10 ? 1.0 : 0.7;
        for (const el of EL) {
            const r = runBattles(el, el, lv, N, 'A', { counterLUT: counter, mirrorLUT: mirror });
            if (Math.abs(r.avgTurns - TARGET_TURNS[el][lv]) <= tol) turnPass++;
        }
    }
    score += turnPass / 27 * 40;

    for (const cp of COUNTER_PAIRS) {
        for (const lv of MS) {
            if (lv < 10) continue;
            const r1 = runBattles(cp.counter, cp.victim, lv, N, 'A', { counterLUT: counter, mirrorLUT: mirror });
            const rv = runBattles(cp.victim, cp.counter, lv, N, 'A', { counterLUT: counter, mirrorLUT: mirror });
            const r2 = runBattles(cp.counter, cp.victim, lv, N, 'B', { counterLUT: counter, mirrorLUT: mirror });
            if (r1.wr >= 95) wrPass++;
            if (100 - rv.wr >= 95) wrPass++;
            if (r1.avgHp >= 10 && r1.avgHp <= 50) hpPass++;
            if (r2.avgHp >= 10 && r2.avgHp <= 50) hpPass++;
        }
    }
    score += wrPass / 42 * 40;
    score += hpPass / 42 * 20;
    return { score, turnPass, wrPass, hpPass };
}

// ============================================================
// REPORT
// ============================================================
function generateReport(counterLUT, mirrorLUT) {
    const W = 90;
    console.log('\n' + '='.repeat(W));
    console.log('  🐾 LING THÚ - COMBAT SIMULATOR v10 - BÁO CÁO CÂN BẰNG');
    console.log('='.repeat(W));
    console.log(`  Số trận mỗi simulation: ${N}\n`);

    // ① Stats
    console.log('─'.repeat(W));
    console.log('  📊 ① CHỈ SỐ CỦA TỪNG HỆ THEO LEVEL');
    console.log('─'.repeat(W));
    for (const el of EL) {
        console.log(`\n  ${EL_EMOJI[el]} ${EL_NAME[el]}:`);
        console.log('  ' + '─'.repeat(W - 4));
        console.log('  Lv     | HP       | ATK     | DEF     | LUCK    | DR%     | PC%');
        console.log('  ' + '─'.repeat(W - 4));
        for (const lv of MS) {
            const s = statsAtLv(el, lv);
            console.log(`  Lv.${String(lv).padStart(2)}  | ${String(n1(s.hp)).padStart(8)} | ${String(n1(s.atk)).padStart(7)} | ${String(n1(s.def)).padStart(7)} | ${String(n1(s.luck)).padStart(7)} | ${String(n1(drRate(s.def)*100)).padStart(6)}% | ${String(n1(passiveChance(s.luck)*100)).padStart(5)}%`);
        }
    }

    // ② Turn counts
    console.log('\n' + '─'.repeat(W));
    console.log('  ⚔️  ② SỐ LƯỢT ĐÁNH TRUNG BÌNH (MIRROR)');
    console.log('─'.repeat(W));
    console.log('  Lv      | ✂️ Kéo (target)  | 🔨 Búa (target)  | 📄 Bao (target)');
    console.log('  ' + '─'.repeat(W - 4));
    let turnPass = 0, turnTotal = 0;
    for (const lv of MS) {
        let row = `  Lv.${String(lv).padStart(2)}   |`;
        const tol = lv < 10 ? 1.0 : 0.7;
        for (const el of EL) {
            const r = runBattles(el, el, lv, N, 'A', { counterLUT, mirrorLUT });
            const tgt = TARGET_TURNS[el][lv];
            const ok = Math.abs(r.avgTurns - tgt) <= tol;
            if (ok) turnPass++; turnTotal++;
            row += ` ${n1(r.avgTurns).padStart(5)} (${n1(tgt)}) ${ok ? '✅' : '❌'} |`;
        }
        console.log(row);
    }
    console.log(`\n  📈 Turn: ${turnPass}/${turnTotal} (${pct(turnPass/turnTotal*100)}%)`);

    // ③ Counter
    console.log('\n' + '─'.repeat(W));
    console.log('  🏆 ③ TỈ LỆ THẮNG & HP CÒN LẠI (KHẮC CHẾ)');
    console.log('─'.repeat(W));

    let wrPass = 0, wrTotal = 0, hpPass = 0, hpTotal = 0;
    for (const cp of COUNTER_PAIRS) {
        console.log(`\n  ⚡ ${cp.name}:`);
        console.log('  ' + '─'.repeat(W - 4));
        console.log('  Lv      | Đi trước: WR%  HP%  | Đi sau: WR%   HP%  | Turns');
        console.log('  ' + '─'.repeat(W - 4));

        for (const lv of MS) {
            const r1 = runBattles(cp.counter, cp.victim, lv, N, 'A', { counterLUT, mirrorLUT });
            const r2 = runBattles(cp.counter, cp.victim, lv, N, 'B', { counterLUT, mirrorLUT });
            const rv = runBattles(cp.victim, cp.counter, lv, N, 'A', { counterLUT, mirrorLUT });
            const wr2 = 100 - rv.wr;

            if (lv >= 10) {
                if (r1.wr >= 95) wrPass++; wrTotal++;
                if (wr2 >= 95)   wrPass++; wrTotal++;
                if (r1.avgHp >= 10 && r1.avgHp <= 50) hpPass++; hpTotal++;
                if (r2.avgHp >= 10 && r2.avgHp <= 50) hpPass++; hpTotal++;
            }
            const m1 = lv >= 10 ? ((r1.wr >= 95 && r1.avgHp >= 10 && r1.avgHp <= 50) ? '✅' : (r1.wr >= 95 ? '⚠️' : '❌')) : '';
            const m2 = lv >= 10 ? ((wr2 >= 95 && r2.avgHp >= 10 && r2.avgHp <= 50) ? '✅' : (wr2 >= 95 ? '⚠️' : '❌')) : '';
            const note = lv < 10 ? ' (pre-PvP)' : '';
            console.log(`  Lv.${String(lv).padStart(2)}   | ${n1(r1.wr).padStart(5)}% ${n1(r1.avgHp).padStart(5)}% ${m1}| ${n1(wr2).padStart(5)}% ${n1(r2.avgHp).padStart(5)}% ${m2}| ${n1(r1.avgTurns)}${note}`);
        }
    }
    console.log(`\n  📈 WR: ${wrPass}/${wrTotal} ≥95% (${wrTotal>0?pct(wrPass/wrTotal*100):0}%) | HP: ${hpPass}/${hpTotal} 10-50% (${hpTotal>0?pct(hpPass/hpTotal*100):0}%)`);

    // ④ Neutral
    console.log('\n' + '─'.repeat(W));
    console.log('  🤝 ④ KÈO KHÔNG KHẮC CHẾ (NEUTRAL)');
    console.log('─'.repeat(W));
    const NEUT = [['ROCK', 'PAPER'], ['PAPER', 'SCISSORS'], ['SCISSORS', 'ROCK']];
    for (const [a, b] of NEUT) {
        console.log(`\n  ${EL_EMOJI[a]} ${EL_NAME[a]} vs ${EL_EMOJI[b]} ${EL_NAME[b]}:`);
        console.log('  ' + '─'.repeat(W - 4));
        for (const lv of MS) {
            const r1 = runBattles(a, b, lv, N, 'A', { counterLUT, mirrorLUT });
            const r2 = runBattles(a, b, lv, N, 'B', { counterLUT, mirrorLUT });
            console.log(`  Lv.${String(lv).padStart(2)}   | ${EL_NAME[a]} trước: ${n1(r1.wr)}% | ${EL_NAME[a]} sau: ${n1(r2.wr)}% | ${n1(r1.avgTurns)}t`);
        }
    }

    // ⑤ Summary + LUTs
    console.log('\n' + '='.repeat(W));
    console.log('  📋 TỔNG KẾT');
    console.log('='.repeat(W));
    console.log(`  Mục tiêu 1 - Lượt đánh:   ${turnPass}/${turnTotal} (${pct(turnPass/turnTotal*100)}%)`);
    console.log(`  Mục tiêu 2a - WR≥95%:    ${wrPass}/${wrTotal} (${wrTotal>0?pct(wrPass/wrTotal*100):0}%)`);
    console.log(`  Mục tiêu 2b - HP 10-50%: ${hpPass}/${hpTotal} (${hpTotal>0?pct(hpPass/hpTotal*100):0}%)`);

    const ok = turnPass/turnTotal >= 0.9 && wrTotal > 0 && wrPass/wrTotal >= 0.95 && hpTotal > 0 && hpPass/hpTotal >= 0.85;
    console.log(ok ? '\n  🎉 ĐẠT YÊU CẦU!' : '\n  ⚠️  Cần tuning thêm.');

    console.log('\n' + '─'.repeat(W));
    console.log('  📋 COUNTER LUT (sau tuning)');
    console.log('─'.repeat(W));
    for (const k of Object.keys(counterLUT)) console.log(`  ${k}: ${JSON.stringify(counterLUT[k])}`);
    console.log('\n  📋 MIRROR LUT (sau tuning)');
    console.log('─'.repeat(W));
    for (const k of Object.keys(mirrorLUT)) console.log(`  ${k}: ${JSON.stringify(mirrorLUT[k])}`);

    return { turnPass, turnTotal, wrPass, wrTotal, hpPass, hpTotal };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    console.log('🐾 Ling Thú - Combat Simulator v10 - Auto Tuning (monotonic)\n');
    console.log(`${N} battles/sim\n`);

    let counter = deepClone(COUNTER);
    let mirror  = deepClone(MIRROR);
    let bestScore = -Infinity, bestCounter = null, bestMirror = null;

    for (let round = 1; round <= 5; round++) {
        console.log(`${'█'.repeat(45)}\n  ROUND ${round}/5\n${'█'.repeat(45)}`);

        counter = tuneCounter(counter, mirror);
        mirror  = tuneMirror(mirror, counter);

        const ev = evaluate(counter, mirror);
        console.log(`  Score: ${n1(ev.score)} | Turn ${ev.turnPass}/27 | WR ${ev.wrPass}/42 | HP ${ev.hpPass}/42`);

        if (ev.score > bestScore) {
            bestScore = ev.score;
            bestCounter = deepClone(counter);
            bestMirror  = deepClone(mirror);
        }

        if (ev.turnPass >= 25 && ev.wrPass >= 40 && ev.hpPass >= 36) {
            console.log('  ✅ Đạt ngưỡng, dừng.');
            break;
        }
    }

    if (bestCounter) counter = bestCounter;
    if (bestMirror)  mirror  = bestMirror;

    console.log('\n' + '='.repeat(90));
    console.log('  📊 FINAL REPORT');
    console.log('='.repeat(90));
    generateReport(counter, mirror);
}

main().catch(e => { console.error(e); process.exit(1); });
