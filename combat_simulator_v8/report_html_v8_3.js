// e:\LingThu\lt-tool\combat_simulator_v8\report_html_v8_3.js
// Tạo HTML report self-contained cho v8.3
//   - Base stats 40 level (nội suy)
//   - Counter matchup bonus 40 level × 3 kèo (interp từ 9 mốc)
//   - Mirror debuff 40 level × 3 kèo
//   - Simulation results: turn count, winrate, HP remaining (chạy lại N=2000)

'use strict';

const sim = require('./simulator_v8_1.js');
const {
    PRESET, COUNTER, MIRROR, PASSIVE_LUT,
    statsAtLevel, lutAt, simulateBattle,
    getDamageReduction, getPassiveChance
} = sim;

// ============ APPLY TUNED VALUES (v8.3) ============
COUNTER.rock_vs_scissors_def   = {1:14, 5:26, 10:52, 15:80, 20:105, 25:128, 30:144, 35:156, 40:164};
COUNTER.rock_vs_scissors_hp    = {1:28, 5:52, 10:104, 15:160, 20:210, 25:252, 30:282, 35:306, 40:320};
COUNTER.scissors_vs_paper_dmg  = {1:0.04, 5:0.08, 10:0.14, 15:0.20, 20:0.26, 25:0.32, 30:0.38, 35:0.44, 40:0.50};
COUNTER.scissors_vs_paper_luck = {1:1, 5:3, 10:6, 15:9, 20:12, 25:15, 30:18, 35:21, 40:24};
COUNTER.paper_vs_rock_hp       = {1:70, 5:56, 10:70, 15:102, 20:140, 25:182, 30:224, 35:274, 40:328};
COUNTER.paper_vs_rock_luck     = {1:3, 5:6, 10:12, 15:18, 20:24, 25:28, 30:30, 35:30, 40:30};
MIRROR.scissors_dmg_mult = {1:0.647265625, 5:0.651171875, 10:0.5515625, 15:0.471484375, 20:0.397265625, 25:0.330859375, 30:0.299609375, 35:0.291796875, 40:0.280078125};
MIRROR.rock_def_mult     = {1:0.3021484375, 5:0.3021484375, 10:0.3021484375, 15:0.3021484375, 20:0.3021484375, 25:0.7962890625, 30:1.0841796875, 35:1.2990234375, 40:1.2796875};
MIRROR.paper_all_mult    = {1:0.4015625, 5:0.4203125, 10:1.1984375, 15:0.8046875, 20:0.9015625, 25:0.8296875, 30:1.1984375, 35:0.4859375, 40:0.6171875};

// ============ CONSTANTS ============
const LEVELS = Array.from({length: 40}, (_, i) => i + 1);
const ELEMENTS = ['SCISSORS', 'ROCK', 'PAPER'];
const COUNTER_MATCHUPS = [
    { name: 'Búa vs Kéo', counter: 'ROCK',     victim: 'SCISSORS' },
    { name: 'Kéo vs Bao', counter: 'SCISSORS', victim: 'PAPER'    },
    { name: 'Bao vs Búa', counter: 'PAPER',    victim: 'ROCK'     }
];
const TURN_TARGET = {
    SCISSORS: { 1: 7.5,  5: 8.7,  10: 10.0, 15: 11.2, 20: 12.5, 25: 13.7, 30: 14.5, 35: 15.3, 40: 16.0 },
    ROCK:     { 1: 9.0,  5: 10.5, 10: 12.0, 15: 13.5, 20: 15.0, 25: 16.5, 30: 17.5, 35: 18.7, 40: 20.0 },
    PAPER:    { 1: 8.0,  5: 9.3,  10: 10.6, 15: 11.9, 20: 13.1, 25: 14.4, 30: 15.6, 35: 16.8, 40: 18.0 }
};
const EL_LABEL = { SCISSORS: '✂️ Kéo', ROCK: '🔨 Búa', PAPER: '📄 Bao' };

// ============ HELPERS ============
function interp(table) {
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    return (lv) => {
        if (lv <= keys[0]) return table[keys[0]];
        if (lv >= keys[keys.length - 1]) return table[keys[keys.length - 1]];
        for (let i = 0; i < keys.length - 1; i++) {
            const lo = keys[i], hi = keys[i + 1];
            if (lv >= lo && lv <= hi) {
                const t = (lv - lo) / (hi - lo);
                return table[lo] + (table[hi] - table[lo]) * t;
            }
        }
        return table[keys[keys.length - 1]];
    };
}
const num0 = (x) => Math.round(x).toString();
const num1 = (x) => Number(x).toFixed(1);
const num2 = (x) => Number(x).toFixed(2);
const num3 = (x) => Number(x).toFixed(3);
const pct1 = (x) => (x * 100).toFixed(1) + '%';
const pct0 = (x) => Math.round(x * 100) + '%';

// ============ 1) BASE STATS - nội suy từ base + growth ============
const baseStats = {};
for (const el of ELEMENTS) {
    baseStats[el] = LEVELS.map(lv => {
        const s = statsAtLevel(el, lv);
        return {
            lv,
            hp: s.hp,
            atk: s.atk,
            def: s.def,
            luck: s.luck,
            dmgRed: getDamageReduction(s.def),
            passiveChance: getPassiveChance(s.luck)
        };
    });
}

// ============ 2) COUNTER BONUS - điểm cộng chỉ số từng level ở kèo khắc chế ============
// Mỗi kèo khắc chế (3 kèo), counter side được cộng stats theo level
// Hiển thị: bên khắc chế nhận được bao nhiêu HP/ATK%/DEF/LUCK buff ở mỗi level
const counterBonus = {};
for (const cm of COUNTER_MATCHUPS) {
    const C = cm.counter;  // hệ được buff
    const V = cm.victim;   // hệ bị thua
    // Lấy từng key buff theo kèo
    let keys;
    if (cm.name === 'Búa vs Kéo') {
        keys = ['rock_vs_scissors_def', 'rock_vs_scissors_hp'];
    } else if (cm.name === 'Kéo vs Bao') {
        keys = ['scissors_vs_paper_dmg', 'scissors_vs_paper_luck'];
    } else { // Bao vs Búa
        keys = ['paper_vs_rock_hp', 'paper_vs_rock_luck'];
    }
    const interps = keys.map(k => ({ k, fn: interp(COUNTER[k]) }));
    counterBonus[cm.name] = LEVELS.map(lv => {
        const r = { lv };
        for (const { k, fn } of interps) r[k] = fn(lv);
        return r;
    });
}

// ============ 3) MIRROR DEBUFF - khi 2 bên cùng hệ ============
const mirrorDebuff = {};
for (const el of ELEMENTS) {
    let key, type;
    if (el === 'SCISSORS') { key = 'scissors_dmg_mult'; type = 'dmg_mult'; }
    else if (el === 'ROCK') { key = 'rock_def_mult'; type = 'def_mult'; }
    else { key = 'paper_all_mult'; type = 'all_mult'; }
    const fn = interp(MIRROR[key]);
    mirrorDebuff[el] = LEVELS.map(lv => ({ lv, mult: fn(lv), type }));
}

// ============ 4) SIMULATION - chạy lại N=1000 cho từng level ============
console.log('Đang chạy simulation N=1000 cho 9 mốc level...');
const N_SIM = 1000;
const PER_SYSTEM_MATCHUPS = {
    SCISSORS: [['SCISSORS','PAPER'], ['PAPER','SCISSORS'], ['SCISSORS','SCISSORS']],
    ROCK:     [['ROCK','SCISSORS'], ['SCISSORS','ROCK'], ['ROCK','ROCK']],
    PAPER:    [['PAPER','ROCK'], ['ROCK','PAPER'], ['PAPER','PAPER']]
};

const simResults = {};
const turnSummary = {};
for (const lv of [1, 5, 10, 15, 20, 25, 30, 35, 40]) {
    const ps = {};
    for (const el of ELEMENTS) {
        const m = PER_SYSTEM_MATCHUPS[el];
        const turns = (runOneMatch(m[0][0], m[0][1], lv, N_SIM).avgTurns
                    + runOneMatch(m[1][0], m[1][1], lv, N_SIM).avgTurns
                    + runOneMatch(m[2][0], m[2][1], lv, N_SIM).avgTurns) / 3;
        ps[el] = turns;
    }
    turnSummary[lv] = ps;
    // 9 matchups cho winrate
    const allPairs = [
        ['ROCK','SCISSORS'],['SCISSORS','ROCK'],
        ['SCISSORS','PAPER'],['PAPER','SCISSORS'],
        ['PAPER','ROCK'],['ROCK','PAPER'],
        ['SCISSORS','SCISSORS'],['ROCK','ROCK'],['PAPER','PAPER']
    ];
    const matchResults = {};
    for (const [a, b] of allPairs) {
        const key = `${a}_vs_${b}`;
        // Fix bug in simulateBattle khi goFirst='B': swap inputs để luôn dùng goFirst='A'
        // - first: a goes first (runOneMatch(a, b, ..., 'A'))
        // - second: b goes first ⇒ swap thành runOneMatch(b, a, ..., 'A') rồi đổi label A↔B
        const f = runOneMatch(a, b, lv, N_SIM, 'A');
        const sSwapped = runOneMatch(b, a, lv, N_SIM, 'A');
        const s = {
            aEl: a, bEl: b, level: lv, n: sSwapped.n,
            winA: sSwapped.winB, winB: sSwapped.winA, draw: sSwapped.draw,
            winRateA: sSwapped.winRateB, winRateB: sSwapped.winRateA, drawRate: sSwapped.drawRate,
            avgTurns: sSwapped.avgTurns,
            avgHpAWin: sSwapped.avgHpBWin, avgHpBWin: sSwapped.avgHpAWin
        };
        matchResults[key] = { first: f, second: s };
    }
    simResults[lv] = { perSystem: ps, matches: matchResults };
    console.log(`  Lv.${lv} done`);
}

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
        winA, winB, draw,
        winRateA: winA / n * 100,
        winRateB: winB / n * 100,
        avgTurns: totalTurns / n,
        avgHpAWin: winA > 0 ? sumHpAWin / winA : 0,
        avgHpBWin: winB > 0 ? sumHpBWin / winB : 0
    };
}

// ============ 5) ĐÁNH GIÁ TỔNG HỢP ============
let turnOk = 0, turnTotal = 0;
for (const el of ELEMENTS) {
    for (const lv of [1, 5, 10, 15, 20, 25, 30, 35, 40]) {
        const cur = turnSummary[lv][el];
        const tgt = TURN_TARGET[el][lv];
        const pct = (cur - tgt) / tgt * 100;
        const tol = lv < 10 ? 12 : 8;
        turnTotal++;
        if (Math.abs(pct) <= tol) turnOk++;
    }
}
let winOk = 0, winTotal = 0, hpOk = 0, hpTotal = 0;
for (const lv of [1, 5, 10, 15, 20, 25, 30, 35, 40]) {
    for (const cm of COUNTER_MATCHUPS) {
        const fKey = `${cm.counter}_vs_${cm.victim}`;
        const sKey = `${cm.victim}_vs_${cm.counter}`;
        const f = simResults[lv].matches[fKey].first;
        const s = simResults[lv].matches[sKey].second;
        winTotal += 2;
        if (f.winRateA >= 95) winOk++;
        if (s.winRateB >= 95) winOk++;
        hpTotal += 2;
        const fHp = f.avgHpAWin * 100, sHp = s.avgHpBWin * 100;
        if (fHp >= 10 && fHp <= 35) hpOk++;
        if (sHp >= 10 && sHp <= 35) hpOk++;
    }
}

// ============ 6) BUILD DATA cho HTML ============
const data = {
    levels: LEVELS,
    baseStats: {
        SCISSORS: baseStats.SCISSORS,
        ROCK: baseStats.ROCK,
        PAPER: baseStats.PAPER
    },
    counterBonus: {
        'Búa vs Kéo': counterBonus['Búa vs Kéo'],
        'Kéo vs Bao': counterBonus['Kéo vs Bao'],
        'Bao vs Búa': counterBonus['Bao vs Búa']
    },
    mirrorDebuff: {
        SCISSORS: mirrorDebuff.SCISSORS,
        ROCK: mirrorDebuff.ROCK,
        PAPER: mirrorDebuff.PAPER
    },
    sim: {},
    summary: {
        turnOk, turnTotal, winOk, winTotal, hpOk, hpTotal, N: N_SIM
    },
    turnSummary: turnSummary,
    TURN_TARGET: TURN_TARGET
};
for (const lv of [1, 5, 10, 15, 20, 25, 30, 35, 40]) {
    data.sim[lv] = {};
    for (const [a, b] of [
        ['ROCK','SCISSORS'],['SCISSORS','ROCK'],
        ['SCISSORS','PAPER'],['PAPER','SCISSORS'],
        ['PAPER','ROCK'],['ROCK','PAPER'],
        ['SCISSORS','SCISSORS'],['ROCK','ROCK'],['PAPER','PAPER']
    ]) {
        const key = `${a}_vs_${b}`;
        data.sim[lv][key] = {
            first: {
                winRateA: simResults[lv].matches[key].first.winRateA,
                winRateB: simResults[lv].matches[key].first.winRateB,
                avgHpAWin: simResults[lv].matches[key].first.avgHpAWin,
                avgHpBWin: simResults[lv].matches[key].first.avgHpBWin
            },
            second: {
                winRateA: simResults[lv].matches[key].second.winRateA,
                winRateB: simResults[lv].matches[key].second.winRateB,
                avgHpAWin: simResults[lv].matches[key].second.avgHpAWin,
                avgHpBWin: simResults[lv].matches[key].second.avgHpBWin
            }
        };
    }
}

const dataJSON = JSON.stringify(data);

// ============ 7) TẠO HTML ============
const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Combat Simulator v8.3 — Report</title>
<style>
:root {
    --bg: #0f1218; --panel: #1a1f2b; --border: #2a3142;
    --text: #e6e8ee; --muted: #8a93a6; --accent: #ffcf3f;
    --scissors: #ff5e7a; --rock: #6aa7ff; --paper: #58e58a;
    --warn: #ff6b35; --ok: #4ade80; --bad: #ef4444;
}
* { box-sizing: border-box; }
html, body { background: var(--bg); color: var(--text);
              font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
              margin: 0; padding: 0; line-height: 1.5; }
header { background: linear-gradient(135deg, #1a1f2b 0%, #0f1218 100%);
         border-bottom: 2px solid var(--accent);
         padding: 24px 32px; }
header h1 { margin: 0; font-size: 26px; }
header h1 .v { color: var(--accent); }
header p { margin: 6px 0 0; color: var(--muted); font-size: 13px; }
main { max-width: 1500px; margin: 0 auto; padding: 24px 32px 60px; }
.section { background: var(--panel); border: 1px solid var(--border);
            border-radius: 8px; padding: 20px 24px; margin-bottom: 20px; }
.section h2 { margin: 0 0 12px; font-size: 16px; color: var(--accent);
              text-transform: uppercase; letter-spacing: 1px; }
.section .desc { color: var(--muted); font-size: 13px; margin-bottom: 14px; }
.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
.summary-card { background: #0f1218; border: 1px solid var(--border); border-radius: 6px; padding: 14px 18px; }
.summary-card .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
.summary-card .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
.summary-card .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.value.ok { color: var(--ok); }
.value.warn { color: var(--warn); }
.value.bad { color: var(--bad); }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 6px 8px; text-align: right; border-bottom: 1px solid var(--border); }
th:first-child, td:first-child { text-align: center; }
th { background: #0f1218; color: var(--muted); font-weight: 600;
     text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
th.s, td.s { color: var(--scissors); }
th.r, td.r { color: var(--rock); }
th.p, td.p { color: var(--paper); }
th.c, td.c { color: var(--warn); }
th.m, td.m { color: #c084fc; }
.cell-ok { color: var(--ok); }
.cell-warn { color: var(--warn); }
.cell-bad { color: var(--bad); }
.scroll-x { overflow-x: auto; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 900px) { .grid2 { grid-template-columns: 1fr; } }
.nav { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.nav button { background: #2a3142; color: var(--text); border: 1px solid var(--border);
               border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 12px; }
.nav button:hover { background: var(--accent); color: #0f1218; }
.controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.controls label { font-weight: 600; font-size: 13px; }
.controls input[type=range] { flex: 1; min-width: 200px; }
.controls input[type=number] { background: #0f1218; color: var(--text);
                                border: 1px solid var(--border); border-radius: 4px;
                                padding: 6px 10px; width: 80px; font-size: 14px; }
.badge { display: inline-block; background: #2a3142; color: var(--text);
         padding: 4px 10px; border-radius: 4px; font-size: 12px;
         font-family: "Consolas", monospace; }
.chart-wrap { position: relative; height: 220px; }
.legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; margin-top: 8px; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend .dot { width: 12px; height: 12px; border-radius: 2px; }
footer { color: var(--muted); text-align: center; font-size: 12px; padding: 24px; }
.formula { background: #0f1218; border-left: 3px solid var(--accent);
            padding: 8px 14px; font-family: "Consolas", monospace;
            font-size: 12px; color: var(--muted); margin: 8px 0; }
.pill { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
.pill.ok { background: rgba(74,222,128,0.15); color: var(--ok); }
.pill.warn { background: rgba(255,107,53,0.15); color: var(--warn); }
.pill.bad { background: rgba(239,68,68,0.15); color: var(--bad); }
</style>
</head>
<body>
<header>
    <h1>⚔️ Combat Simulator <span class="v">v8.3</span> Report</h1>
    <p>40 level • Điểm cộng chỉ số theo từng level (nội suy từ 9 mốc) • Điểm cộng ở kèo khắc chế</p>
    <p style="font-size:12px;margin-top:4px;">Vòng khắc chế: <strong>Búa > Kéo > Bao > Búa</strong> (RPS truyền thống) • 6 COUNTER keys tăng đơn điệu theo progression Lv.1→40</p>
</header>

<main>

<!-- SUMMARY -->
<section class="section">
    <h2>① Đánh giá tổng hợp</h2>
    <div class="summary-grid">
        <div class="summary-card">
            <div class="label">Mục tiêu 1 — Số lượt (±8% Lv.10+, ±12% Lv.&lt;10)</div>
            <div class="value" id="sum-turn">–</div>
            <div class="sub">đạt / tổng mốc</div>
        </div>
        <div class="summary-card">
            <div class="label">Mục tiêu 2a — Winrate counter (≥95%)</div>
            <div class="value" id="sum-win">–</div>
            <div class="sub">đạt / tổng (27 kèo × 2 chiều)</div>
        </div>
        <div class="summary-card">
            <div class="label">Mục tiêu 2b — HP remaining (10-35%)</div>
            <div class="value" id="sum-hp">–</div>
            <div class="sub">đạt / tổng (27 kèo × 2 chiều)</div>
        </div>
    </div>
    <p style="color:var(--muted);font-size:12px;margin:0;">
        N=<span id="sum-n"></span> trận/kèo/level. Số lượt đánh = trung bình qua 3 kèo mỗi hệ. Winrate/HP ở 3 kèo khắc chế × 2 chiều đi trước/sau.
    </p>
</section>

<!-- ② BASE STATS 40 LEVEL -->
<section class="section">
    <h2>② Base stats theo từng level (nội suy từ base + 4 giai đoạn growth)</h2>
    <div class="desc">Mỗi hệ cộng dồn base + growth theo 4 giai đoạn [2-10], [11-20], [21-30], [31-40]. Hiển thị 40 level.</div>
    <div class="scroll-x">
    <table id="tbl-base">
        <thead>
            <tr>
                <th rowspan="2">Lv</th>
                <th colspan="6" class="s">✂️ Hệ Kéo</th>
                <th colspan="6" class="r">🔨 Hệ Búa</th>
                <th colspan="6" class="p">📄 Hệ Bao</th>
            </tr>
            <tr>
                <th class="s">HP</th><th class="s">ATK</th><th class="s">DEF</th><th class="s">LUCK</th><th class="s">dmgRed%</th><th class="s">passive%</th>
                <th class="r">HP</th><th class="r">ATK</th><th class="r">DEF</th><th class="r">LUCK</th><th class="r">dmgRed%</th><th class="r">passive%</th>
                <th class="p">HP</th><th class="p">ATK</th><th class="p">DEF</th><th class="p">LUCK</th><th class="p">dmgRed%</th><th class="p">passive%</th>
            </tr>
        </thead>
        <tbody id="tbody-base"></tbody>
    </table>
    </div>
    <div class="formula">dmgRed(def) = 1 - 0.98^(def^0.8), cap 95% &nbsp; | &nbsp; passiveChance(luck) = 1 - 0.99^(luck^0.75), cap 50%</div>
</section>

<!-- ③ COUNTER BONUS 40 LEVEL × 3 KÈO -->
<section class="section">
    <h2>③ Điểm cộng chỉ số ở kèo khắc chế (40 level × 3 kèo)</h2>
    <div class="desc">Khi hệ khắc chế thắng (counter side), được cộng thêm stats theo level. Nội suy tuyến tính từ 9 mốc (Lv.1, 5, 10, 15, 20, 25, 30, 35, 40).</div>

    <h3 style="font-size:14px;color:var(--warn);margin:14px 0 8px;">Búa vs Kéo — Búa (counter) được +def, +HP</h3>
    <div class="scroll-x">
    <table id="tbl-counter-rock">
        <thead><tr><th>Lv</th><th class="c">+DEF</th><th class="c">+HP</th><th>Lv</th><th class="c">+DEF</th><th class="c">+HP</th></tr></thead>
        <tbody id="tbody-counter-rock"></tbody>
    </table>
    </div>

    <h3 style="font-size:14px;color:var(--warn);margin:14px 0 8px;">Kéo vs Bao — Kéo (counter) được +dmg%, +luck</h3>
    <div class="scroll-x">
    <table id="tbl-counter-scissors">
        <thead><tr><th>Lv</th><th class="c">+dmg%</th><th class="c">+luck</th><th>Lv</th><th class="c">+dmg%</th><th class="c">+luck</th></tr></thead>
        <tbody id="tbody-counter-scissors"></tbody>
    </table>
    </div>

    <h3 style="font-size:14px;color:var(--warn);margin:14px 0 8px;">Bao vs Búa — Bao (counter) được +HP, +luck</h3>
    <div class="scroll-x">
    <table id="tbl-counter-paper">
        <thead><tr><th>Lv</th><th class="c">+HP</th><th class="c">+luck</th><th>Lv</th><th class="c">+HP</th><th class="c">+luck</th></tr></thead>
        <tbody id="tbody-counter-paper"></tbody>
    </table>
    </div>
</section>

<!-- ④ MIRROR DEBUFF 40 LEVEL × 3 HỆ -->
<section class="section">
    <h2>④ Mirror debuff — khi 2 bên cùng hệ (40 level)</h2>
    <div class="desc">Kéo vs Kéo: dmg_mult; Búa vs Búa: def_mult; Bao vs Bao: all_mult (giảm nhẹ toàn stats). Mult càng thấp = càng bị debuff.</div>
    <div class="scroll-x">
    <table id="tbl-mirror">
        <thead>
            <tr>
                <th>Lv</th><th class="m">Kéo dmg_mult</th>
                <th class="m">Búa def_mult</th><th class="m">Bao all_mult</th>
                <th>Lv</th><th class="m">Kéo dmg_mult</th>
                <th class="m">Búa def_mult</th><th class="m">Bao all_mult</th>
            </tr>
        </thead>
        <tbody id="tbody-mirror"></tbody>
    </table>
    </div>
</section>

<!-- ⑤ TURN COUNT -->
<section class="section">
    <h2>⑤ Số lượt đánh trung bình (9 mốc level × 3 hệ)</h2>
    <div class="desc">Target: Kéo 7.5→16, Búa 9→20, Bao 8→18 (Lv.1→40). Sai số: ±12% Lv.&lt;10, ±8% Lv.10+.</div>
    <div class="scroll-x">
    <table id="tbl-turn">
        <thead>
            <tr>
                <th>Hệ</th>
                <th>Lv.1</th><th>Lv.5</th><th>Lv.10</th><th>Lv.15</th><th>Lv.20</th>
                <th>Lv.25</th><th>Lv.30</th><th>Lv.35</th><th>Lv.40</th>
            </tr>
        </thead>
        <tbody id="tbody-turn"></tbody>
    </table>
    </div>
</section>

<!-- ⑥ WINRATE 9 kèo × 9 mốc level -->
<section class="section">
    <h2>⑥ Winrate từng kèo (9 mốc level)</h2>
    <div class="desc">Counter khắc chế phải thắng ≥95% cả 2 chiều. Mirror 50/50.</div>
    <div class="scroll-x">
    <table id="tbl-win">
        <thead>
            <tr>
                <th>Kèo</th>
                <th>Lv.1</th><th>Lv.5</th><th>Lv.10</th><th>Lv.15</th><th>Lv.20</th>
                <th>Lv.25</th><th>Lv.30</th><th>Lv.35</th><th>Lv.40</th>
            </tr>
        </thead>
        <tbody id="tbody-win"></tbody>
    </table>
    </div>
</section>

<!-- ⑦ HP remaining -->
<section class="section">
    <h2>⑦ HP còn lại TB khi bên khắc chế thắng (9 mốc level, 2 chiều)</h2>
    <div class="desc">Target: 10-35%. Bao gồm cả 2 chiều (counter đi trước và counter đi sau).</div>
    <div class="scroll-x">
    <table id="tbl-hp">
        <thead>
            <tr>
                <th>Kèo / chiều</th>
                <th>Lv.1</th><th>Lv.5</th><th>Lv.10</th><th>Lv.15</th><th>Lv.20</th>
                <th>Lv.25</th><th>Lv.30</th><th>Lv.35</th><th>Lv.40</th>
            </tr>
        </thead>
        <tbody id="tbody-hp"></tbody>
    </table>
    </div>
</section>

<!-- ⑧ CHART -->
<section class="section">
    <h2>⑧ Biểu đồ điểm cộng chỉ số theo level</h2>
    <div class="controls">
        <label>Loại:</label>
        <select id="chart-type">
            <option value="counter">Counter bonus (3 kèo)</option>
            <option value="mirror">Mirror debuff (3 hệ)</option>
            <option value="base">Base stats (HP/ATK/DEF/LUCK)</option>
        </select>
    </div>
    <div class="chart-wrap"><canvas id="chart"></canvas></div>
    <div class="legend" id="chart-legend"></div>
</section>

<footer>
    Generated by report_html_v8_3.js • Combat Simulator v8.3
</footer>

</main>

<script>
function num0(x){return Math.round(x).toString()}
function num1(x){return Number(x).toFixed(1)}
function num2(x){return Number(x).toFixed(2)}
function num3(x){return Number(x).toFixed(3)}
function pct1(x){return (x*100).toFixed(1)+'%'}
function pct0(x){return Math.round(x*100)+'%'}
const DATA = ${dataJSON};

// ============ SUMMARY ============
const sum = DATA.summary;
function paintSum(id, ok, total) {
    const pct = ok / total * 100;
    const cls = pct >= 95 ? 'ok' : pct >= 85 ? 'warn' : 'bad';
    document.getElementById(id).className = 'value ' + cls;
    document.getElementById(id).textContent = ok + ' / ' + total;
}
paintSum('sum-turn', sum.turnOk, sum.turnTotal);
paintSum('sum-win', sum.winOk, sum.winTotal);
paintSum('sum-hp', sum.hpOk, sum.hpTotal);
document.getElementById('sum-n').textContent = sum.N;

// ============ ② BASE STATS ============
(function(){
    const tbody = document.getElementById('tbody-base');
    const rows = [];
    for (let i = 0; i < DATA.levels.length; i++) {
        const lv = DATA.levels[i];
        const s = DATA.baseStats.SCISSORS[i];
        const r = DATA.baseStats.ROCK[i];
        const p = DATA.baseStats.PAPER[i];
        rows.push(\`<tr>
            <td><strong>\${lv}</strong></td>
            <td class="s">\${num0(s.hp)}</td><td class="s">\${num1(s.atk)}</td>
            <td class="s">\${num1(s.def)}</td><td class="s">\${num1(s.luck)}</td>
            <td class="s">\${pct1(s.dmgRed)}</td><td class="s">\${pct1(s.passiveChance)}</td>
            <td class="r">\${num0(r.hp)}</td><td class="r">\${num1(r.atk)}</td>
            <td class="r">\${num1(r.def)}</td><td class="r">\${num1(r.luck)}</td>
            <td class="r">\${pct1(r.dmgRed)}</td><td class="r">\${pct1(r.passiveChance)}</td>
            <td class="p">\${num0(p.hp)}</td><td class="p">\${num1(p.atk)}</td>
            <td class="p">\${num1(p.def)}</td><td class="p">\${num1(p.luck)}</td>
            <td class="p">\${pct1(p.dmgRed)}</td><td class="p">\${pct1(p.passiveChance)}</td>
        </tr>\`);
    }
    tbody.innerHTML = rows.join('');
})();

// ============ ③ COUNTER BONUS 3 BẢNG (2 cột: lv hiện tại + lv đối diện) ============
function buildCounterTable(tbodyId, data, valFn1, valFn2, fmt1, fmt2) {
    const tbody = document.getElementById(tbodyId);
    const rows = [];
    // 40 levels, 2 cặp: (1,21), (2,22), ..., (20,40)
    for (let i = 0; i < 20; i++) {
        const a = data[i], b = data[i + 20];
        rows.push(\`<tr>
            <td><strong>\${a.lv}</strong></td>
            <td class="c">\${fmt1(valFn1(a))}</td>
            <td class="c">\${fmt2(valFn2(a))}</td>
            <td><strong>\${b.lv}</strong></td>
            <td class="c">\${fmt1(valFn1(b))}</td>
            <td class="c">\${fmt2(valFn2(b))}</td>
        </tr>\`);
    }
    tbody.innerHTML = rows.join('');
}
buildCounterTable('tbody-counter-rock',
    DATA.counterBonus['Búa vs Kéo'],
    d => d.rock_vs_scissors_def, d => d.rock_vs_scissors_hp,
    v => num1(v), v => num0(v));
buildCounterTable('tbody-counter-scissors',
    DATA.counterBonus['Kéo vs Bao'],
    d => d.scissors_vs_paper_dmg, d => d.scissors_vs_paper_luck,
    v => pct1(v), v => num1(v));
buildCounterTable('tbody-counter-paper',
    DATA.counterBonus['Bao vs Búa'],
    d => d.paper_vs_rock_hp, d => d.paper_vs_rock_luck,
    v => num0(v), v => num1(v));

// ============ ④ MIRROR ============
(function(){
    const tbody = document.getElementById('tbody-mirror');
    const rows = [];
    for (let i = 0; i < 20; i++) {
        const a1 = DATA.mirrorDebuff.SCISSORS[i];
        const a2 = DATA.mirrorDebuff.ROCK[i];
        const a3 = DATA.mirrorDebuff.PAPER[i];
        const b1 = DATA.mirrorDebuff.SCISSORS[i + 20];
        const b2 = DATA.mirrorDebuff.ROCK[i + 20];
        const b3 = DATA.mirrorDebuff.PAPER[i + 20];
        rows.push(\`<tr>
            <td><strong>\${a1.lv}</strong></td>
            <td class="m">\${num3(a1.mult)}</td>
            <td class="m">\${num3(a2.mult)}</td>
            <td class="m">\${num3(a3.mult)}</td>
            <td><strong>\${b1.lv}</strong></td>
            <td class="m">\${num3(b1.mult)}</td>
            <td class="m">\${num3(b2.mult)}</td>
            <td class="m">\${num3(b3.mult)}</td>
        </tr>\`);
    }
    tbody.innerHTML = rows.join('');
})();

// ============ ⑤ TURN COUNT ============
(function(){
    const tbody = document.getElementById('tbody-turn');
    const els = [
        { key: 'SCISSORS', label: '✂️ Kéo', cls: 's' },
        { key: 'ROCK',     label: '🔨 Búa', cls: 'r' },
        { key: 'PAPER',    label: '📄 Bao', cls: 'p' }
    ];
    const lvList = [1, 5, 10, 15, 20, 25, 30, 35, 40];
    const rows = els.map(el => {
        const cells = lvList.map(lv => {
            const cur = DATA.turnSummary[lv][el.key];
            const tgt = DATA.TURN_TARGET[el.key][lv];
            const p = (cur - tgt) / tgt * 100;
            const tol = lv < 10 ? 12 : 8;
            const ok = Math.abs(p) <= tol;
            return \`<td class="\${el.cls}">\${num1(cur)}<br><span style="font-size:10px;color:var(--muted);">/\${num1(tgt)}</span></td>\`;
        });
        return \`<tr><td class="\${el.cls}"><strong>\${el.label}</strong></td>\${cells.join('')}</tr>\`;
    });
    tbody.innerHTML = rows.join('');
})();

// ============ ⑥ WINRATE ============
(function(){
    const tbody = document.getElementById('tbody-win');
    const lvList = [1, 5, 10, 15, 20, 25, 30, 35, 40];
    const rows = [];
    const matchups = [
        { key: 'ROCK_vs_SCISSORS',     name: 'Búa vs Kéo (counter)', cls: 'c' },
        { key: 'SCISSORS_vs_ROCK',     name: 'Kéo vs Búa (rev)',     cls: 'm' },
        { key: 'SCISSORS_vs_PAPER',    name: 'Kéo vs Bao (counter)', cls: 'c' },
        { key: 'PAPER_vs_SCISSORS',    name: 'Bao vs Kéo (rev)',     cls: 'm' },
        { key: 'PAPER_vs_ROCK',        name: 'Bao vs Búa (counter)', cls: 'c' },
        { key: 'ROCK_vs_PAPER',        name: 'Búa vs Bao (rev)',     cls: 'm' },
        { key: 'SCISSORS_vs_SCISSORS', name: 'Kéo vs Kéo (mirror)',  cls: 'm' },
        { key: 'ROCK_vs_ROCK',         name: 'Búa vs Búa (mirror)',  cls: 'm' },
        { key: 'PAPER_vs_PAPER',       name: 'Bao vs Bao (mirror)',  cls: 'm' }
    ];
    for (const m of matchups) {
        const cells = lvList.map(lv => {
            const r = DATA.sim[lv][m.key];
            // first = side A đi trước. For display: show winrate of side đầu (key[0])
            const wr = r.first.winRateA;
            return \`<td class="\${m.cls}">\${num1(wr)}%</td>\`;
        });
        rows.push(\`<tr><td class="\${m.cls}">\${m.name}</td>\${cells.join('')}</tr>\`);
    }
    tbody.innerHTML = rows.join('');
})();

// ============ ⑦ HP REMAINING ============
(function(){
    const tbody = document.getElementById('tbody-hp');
    const lvList = [1, 5, 10, 15, 20, 25, 30, 35, 40];
    const rows = [];
    const counterNames = [
        { name: 'Búa vs Kéo', first: 'ROCK_vs_SCISSORS',     second: 'SCISSORS_vs_ROCK' },
        { name: 'Kéo vs Bao', first: 'SCISSORS_vs_PAPER',    second: 'PAPER_vs_SCISSORS' },
        { name: 'Bao vs Búa', first: 'PAPER_vs_ROCK',        second: 'ROCK_vs_PAPER' }
    ];
    for (const cm of counterNames) {
        // First: counter đi trước (bên khắc chế thắng = winRateA side)
        const cells1 = lvList.map(lv => {
            const r = DATA.sim[lv][cm.first].first;
            const hp = r.avgHpAWin * 100;
            const cls = (hp >= 10 && hp <= 35) ? 'cell-ok' : (hp < 10 ? 'cell-bad' : 'cell-warn');
            return \`<td class="\${cls}">\${pct0(hp)}</td>\`;
        });
        rows.push(\`<tr><td class="c">\${cm.name} (counter đi trước)</td>\${cells1.join('')}</tr>\`);
        // Second: counter đi sau (bên khắc chế thắng = winRateB side)
        const cells2 = lvList.map(lv => {
            const r = DATA.sim[lv][cm.second].second;
            const hp = r.avgHpBWin * 100;
            const cls = (hp >= 10 && hp <= 35) ? 'cell-ok' : (hp < 10 ? 'cell-bad' : 'cell-warn');
            return \`<td class="\${cls}">\${pct0(hp)}</td>\`;
        });
        rows.push(\`<tr><td class="c">\${cm.name} (counter đi sau)</td>\${cells2.join('')}</tr>\`);
    }
    tbody.innerHTML = rows.join('');
})();

// ============ ⑧ CHART ============
const COLORS = { s: '#ff5e7a', r: '#6aa7ff', p: '#58e58a', c1: '#ff5e7a', c2: '#6aa7ff', c3: '#58e58a', warn: '#ff6b35' };

function drawChart(canvasId, datasets) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 50, padR = 12, padT = 12, padB = 30;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    let yMin = Infinity, yMax = -Infinity;
    for (const ds of datasets) {
        for (const v of ds.values) {
            if (v < yMin) yMin = v;
            if (v > yMax) yMax = v;
        }
    }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const yRange = yMax - yMin;
    yMin -= yRange * 0.08;
    yMax += yRange * 0.08;

    const xAt = (lv) => padL + ((lv - 1) / 39) * innerW;
    const yAt = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

    ctx.strokeStyle = '#2a3142';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8a93a6';
    ctx.font = '10px Consolas, monospace';
    ctx.textAlign = 'right';
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        const v = yMin + (yMax - yMin) * (i / ySteps);
        const y = yAt(v);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
        ctx.fillText(num1(v), padL - 4, y + 3);
    }
    ctx.textAlign = 'center';
    const xMarks = [1, 5, 10, 15, 20, 25, 30, 35, 40];
    for (const lv of xMarks) {
        const x = xAt(lv);
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + innerH);
        ctx.stroke();
        ctx.fillStyle = '#8a93a6';
        ctx.fillText('Lv.' + lv, x, H - 10);
    }
    for (const ds of datasets) {
        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < ds.values.length; i++) {
            const x = xAt(i + 1);
            const y = yAt(ds.values[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

function renderChart(type) {
    let datasets = [], legend = [];
    if (type === 'counter') {
        const rk = DATA.counterBonus['Búa vs Kéo'];
        const sk = DATA.counterBonus['Kéo vs Bao'];
        const pk = DATA.counterBonus['Bao vs Búa'];
        datasets = [
            { color: COLORS.c1, values: rk.map(d => d.rock_vs_scissors_def) },
            { color: COLORS.c2, values: rk.map(d => d.rock_vs_scissors_hp / 10) },
            { color: COLORS.c3, values: sk.map(d => d.scissors_vs_paper_dmg * 100) },
            { color: COLORS.warn, values: sk.map(d => d.scissors_vs_paper_luck) },
            { color: COLORS.s, values: pk.map(d => d.paper_vs_rock_hp / 10) },
            { color: COLORS.r, values: pk.map(d => d.paper_vs_rock_luck) }
        ];
        legend = [
            ['#ff5e7a', 'Búa vs Kéo: +def'],
            ['#6aa7ff', 'Búa vs Kéo: +HP / 10'],
            ['#58e58a', 'Kéo vs Bao: +dmg%'],
            ['#ff6b35', 'Kéo vs Bao: +luck'],
            ['#ff5e7a', 'Bao vs Búa: +HP / 10'],
            ['#6aa7ff', 'Bao vs Búa: +luck']
        ];
    } else if (type === 'mirror') {
        datasets = [
            { color: COLORS.s, values: DATA.mirrorDebuff.SCISSORS.map(d => d.mult) },
            { color: COLORS.r, values: DATA.mirrorDebuff.ROCK.map(d => d.mult) },
            { color: COLORS.p, values: DATA.mirrorDebuff.PAPER.map(d => d.mult) }
        ];
        legend = [
            ['#ff5e7a', 'Kéo dmg_mult'],
            ['#6aa7ff', 'Búa def_mult'],
            ['#58e58a', 'Bao all_mult']
        ];
    } else {
        datasets = [
            { color: COLORS.s, values: DATA.baseStats.SCISSORS.map(d => d.hp) },
            { color: COLORS.r, values: DATA.baseStats.ROCK.map(d => d.hp) },
            { color: COLORS.p, values: DATA.baseStats.PAPER.map(d => d.hp) }
        ];
        legend = [
            ['#ff5e7a', 'Kéo HP'],
            ['#6aa7ff', 'Búa HP'],
            ['#58e58a', 'Bao HP']
        ];
    }
    drawChart('chart', datasets);
    document.getElementById('chart-legend').innerHTML = legend.map(([c, l]) =>
        \`<span><span class="dot" style="background:\${c}"></span> \${l}</span>\`
    ).join('');
}

document.getElementById('chart-type').addEventListener('change', (e) => {
    renderChart(e.target.value);
});
window.addEventListener('resize', () => {
    renderChart(document.getElementById('chart-type').value);
});
renderChart('counter');
</script>
</body>
</html>
`;

// ============ GHI FILE ============
const fs = require('fs');
const path = require('path');
const outPath = path.join(__dirname, 'report_v8_3.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`\nĐã tạo HTML report: ${outPath}`);
console.log(`Kích thước: ${(html.length / 1024).toFixed(1)} KB`);
