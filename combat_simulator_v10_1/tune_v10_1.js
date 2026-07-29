// combat_simulator_v10_1/tune_v10_1.js
// Auto-tuner + console report cho combat simulator v10.1
// Counter giữ nguyên số liệu từ v10 (đã quy đổi 1:1 sang định dạng 4 thuộc tính).
// Mirror: dò lại bằng cách scale bộ delta 4 thuộc tính (quy đổi từ hệ số nhân v10)
// cho từng hệ ở từng mốc level, để bám sát TARGET_TURNS.
'use strict';

const sim = require('./simulator_v10_1.js');
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
const STATS = ['hp', 'atk', 'def', 'luck'];

const n1 = x => Number(x).toFixed(1);
const pct = x => Math.round(x);

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

// ============================================================
// MIRROR TUNING: scale toàn bộ 4 chỉ số của 1 hệ tại 1 level bằng 1 hệ số
// scale chung (giữ đúng tỉ lệ tương đối giữa hp/atk/def/luck đã quy đổi),
// dò cho tới khi turns khớp target. Kết quả cuối bake thành số cụ thể.
// ============================================================
function tuneMirror(mirror, counter) {
    console.log('\n⚙️  Tuning MIRROR (We are family) — v10.1 flat delta...');
    const baseline = deepClone(mirror); // giữ tỉ lệ gốc để scale quanh nó
    let totalIter = 0;

    for (const lv of MS) {
        for (const el of EL) {
            const target = TARGET_TURNS[el][lv];
            const tolerance = lv < 10 ? 1.0 : 0.7;
            let scale = 1.0;
            let iter = 0;
            const step = 0.01;

            while (iter < 150) {
                iter++; totalIter++;
                const test = deepClone(mirror);
                for (const stat of STATS) {
                    test[el][stat][lv] = Math.round(baseline[el][stat][lv] * scale * 10000) / 10000;
                }
                const r = runBattles(el, el, lv, N, 'A', { mirrorLUT: test, counterLUT: counter });
                const diff = r.avgTurns - target;
                if (Math.abs(diff) <= tolerance) break;

                // Delta càng âm (scale càng lớn) -> hệ càng yếu -> trận càng ngắn (ít turn hơn)
                // vì cả 2 bên cùng yếu đi nên sát thương qua lại giảm chậm hơn... nhưng
                // với HP giảm nhiều hơn ATK/DEF thì turns giảm; ta dò theo chiều thực đo được.
                scale += (diff > 0 ? step : -step);
                scale = Math.max(0, Math.round(scale * 10000) / 10000);
            }

            for (const stat of STATS) {
                mirror[el][stat][lv] = Math.round(baseline[el][stat][lv] * scale * 10000) / 10000;
            }
        }
    }

    console.log(`  ✅ Mirror tuned (${totalIter} iterations)`);
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
    console.log('  🐾 LING THÚ - COMBAT SIMULATOR v10.1 - BÁO CÁO CÂN BẰNG');
    console.log('='.repeat(W));
    console.log(`  Số trận mỗi simulation: ${N}\n`);

    console.log('─'.repeat(W));
    console.log('  📊 ① CHỈ SỐ CỦA TỪNG HỆ THEO LEVEL (giống v10, không đổi)');
    console.log('─'.repeat(W));
    for (const el of EL) {
        console.log(`\n  ${EL_EMOJI[el]} ${EL_NAME[el]}:`);
        console.log('  Lv     | HP       | ATK     | DEF     | LUCK    | DR%     | PC%');
        for (const lv of MS) {
            const s = statsAtLv(el, lv);
            console.log(`  Lv.${String(lv).padStart(2)}  | ${String(n1(s.hp)).padStart(8)} | ${String(n1(s.atk)).padStart(7)} | ${String(n1(s.def)).padStart(7)} | ${String(n1(s.luck)).padStart(7)} | ${String(n1(drRate(s.def)*100)).padStart(6)}% | ${String(n1(passiveChance(s.luck)*100)).padStart(5)}%`);
        }
    }

    console.log('\n' + '─'.repeat(W));
    console.log('  ⚔️  ② SỐ LƯỢT ĐÁNH TRUNG BÌNH (MIRROR)');
    console.log('─'.repeat(W));
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

    console.log('\n' + '─'.repeat(W));
    console.log('  🏆 ③ TỈ LỆ THẮNG & HP CÒN LẠI (KHẮC CHẾ) — không đổi so với v10');
    console.log('─'.repeat(W));
    let wrPass = 0, wrTotal = 0, hpPass = 0, hpTotal = 0;
    for (const cp of COUNTER_PAIRS) {
        console.log(`\n  ⚡ ${cp.name}:`);
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

    console.log('\n' + '='.repeat(W));
    console.log('  📋 TỔNG KẾT');
    console.log('='.repeat(W));
    console.log(`  Mục tiêu 1 - Lượt đánh:   ${turnPass}/${turnTotal} (${pct(turnPass/turnTotal*100)}%)`);
    console.log(`  Mục tiêu 2a - WR≥95%:    ${wrPass}/${wrTotal} (${wrTotal>0?pct(wrPass/wrTotal*100):0}%)`);
    console.log(`  Mục tiêu 2b - HP 10-50%: ${hpPass}/${hpTotal} (${hpTotal>0?pct(hpPass/hpTotal*100):0}%)`);
    const ok = turnPass/turnTotal >= 0.9 && wrTotal > 0 && wrPass/wrTotal >= 0.95 && hpTotal > 0 && hpPass/hpTotal >= 0.85;
    console.log(ok ? '\n  🎉 ĐẠT YÊU CẦU!' : '\n  ⚠️  Cần tuning thêm.');

    console.log('\n' + '─'.repeat(W));
    console.log('  📋 COUNTER (v10.1, 4 thuộc tính cố định, giữ nguyên số liệu v10)');
    console.log('─'.repeat(W));
    for (const pair of Object.keys(counterLUT)) {
        console.log(`  ${pair}:`);
        for (const stat of STATS) console.log(`    ${stat}: ${JSON.stringify(counterLUT[pair][stat])}`);
    }
    console.log('\n  📋 MIRROR (v10.1, 4 thuộc tính cố định, quy đổi + tune từ v10)');
    console.log('─'.repeat(W));
    for (const el of EL) {
        console.log(`  ${el}:`);
        for (const stat of STATS) console.log(`    ${stat}: ${JSON.stringify(mirrorLUT[el][stat])}`);
    }

    return { turnPass, turnTotal, wrPass, wrTotal, hpPass, hpTotal };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    console.log('🐾 Ling Thú - Combat Simulator v10.1 - Auto Tuning (flat delta)\n');
    console.log(`${N} battles/sim\n`);

    let counter = deepClone(COUNTER); // Counter không tune lại, giữ nguyên v10
    let mirror  = deepClone(MIRROR);

    const before = evaluate(counter, mirror);
    console.log(`  Trước khi tune: Score ${n1(before.score)} | Turn ${before.turnPass}/27 | WR ${before.wrPass}/42 | HP ${before.hpPass}/42`);

    mirror = tuneMirror(mirror, counter);

    const after = evaluate(counter, mirror);
    console.log(`  Sau khi tune:   Score ${n1(after.score)} | Turn ${after.turnPass}/27 | WR ${after.wrPass}/42 | HP ${after.hpPass}/42`);

    console.log('\n' + '='.repeat(90));
    console.log('  📊 FINAL REPORT');
    console.log('='.repeat(90));
    generateReport(counter, mirror);
}

main().catch(e => { console.error(e); process.exit(1); });
