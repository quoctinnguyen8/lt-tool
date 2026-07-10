// combat_simulator_v9/report_v9.js
// Final report generator — COUNTER/MIRROR already tuned in simulator_v9.js

'use strict';
const sim = require('./simulator_v9.js');
const fs = require('fs');
const path = require('path');
const {
    PRESET, COUNTER, MIRROR, PASSIVE_LUT, BUILD_LABEL,
    statsAtLevel, baseStatsAtLevel, freePoints,
    getDamageReduction, getPassiveChance,
    ACTIVE_BUILDS, BUILD_DIST,
    lutAt, simulateBattle
} = sim;

const MILESTONES = [1, 5, 10, 15, 20, 25, 30, 35, 40];
const ELEMENTS = ['SCISSORS', 'ROCK', 'PAPER'];
const EL_LABEL = { SCISSORS: '✂️ Kéo', ROCK: '🔨 Búa', PAPER: '📄 Bao' };
const EL_COLOR = { SCISSORS: '#ff5e7a', ROCK: '#6aa7ff', PAPER: '#58e58a' };
const SHORT = { balanced: 'BAL', skewed_hp: 'HP', skewed_atk: 'ATK', skewed_def: 'DEF', skewed_luck: 'LCK' };
const COUNTER_PAIRS = [
    { name: 'Búa vs Kéo', counter: 'ROCK', victim: 'SCISSORS' },
    { name: 'Kéo vs Bao', counter: 'SCISSORS', victim: 'PAPER' },
    { name: 'Bao vs Búa', counter: 'PAPER', victim: 'ROCK' },
];
const TURN_TARGET = {
    SCISSORS: { 1: 7.5, 5: 8.7, 10: 10.0, 15: 11.2, 20: 12.5, 25: 13.7, 30: 14.5, 35: 15.3, 40: 16.0 },
    ROCK:     { 1: 9.0, 5: 10.5, 10: 12.0, 15: 13.5, 20: 15.0, 25: 16.5, 30: 17.5, 35: 18.7, 40: 20.0 },
    PAPER:    { 1: 8.0, 5: 9.3,  10: 10.6, 15: 11.9, 20: 13.1, 25: 14.4, 30: 15.6, 35: 16.8, 40: 18.0 }
};

const N_MATRIX = 500, N_SIMPLE = 1000;
const n1 = x => Number(x).toFixed(1), n2 = x => Number(x).toFixed(2);
const pct = x => Math.round(x * 100);

function runOne(aEl, bEl, lv, aB, dB, n, gf) {
    const sa = statsAtLevel(aEl, lv, aB), sb = statsAtLevel(bEl, lv, dB);
    let wA = 0, wB = 0, hA = 0, hB = 0, tT = 0;
    for (let i = 0; i < n; i++) {
        const r = simulateBattle(sa, sb, gf);
        tT += r.turns;
        if (r.winner === 'A') { wA++; hA += r.winnerHpRatio; }
        else if (r.winner === 'B') { wB++; hB += r.winnerHpRatio; }
    }
    return { wrA: wA / n * 100, wrB: wB / n * 100, hpA: wA > 0 ? hA / wA : 0, hpB: wB > 0 ? hB / wB : 0, turns: tT / n };
}

// Build data object
console.log('Combat Simulator v9 — Generating report...\n');
const data = {
    milestones: MILESTONES, elements: ELEMENTS, elLabel: EL_LABEL, elColor: EL_COLOR,
    builds: ACTIVE_BUILDS, buildLabel: BUILD_LABEL, shortBuild: SHORT,
    counterPairs: COUNTER_PAIRS.map(cp => ({ name: cp.name, counter: cp.counter, victim: cp.victim })),
    turnTarget: TURN_TARGET,
    buildStats: {}, turnResults: {}, mirrorResults: {}, neutralResults: {}, counterResults: {},
    summary: {}
};

// Build stats
for (const el of ELEMENTS) {
    data.buildStats[el] = {};
    for (const lv of MILESTONES) {
        const base = baseStatsAtLevel(el, lv);
        data.buildStats[el][lv] = { base: { hp: base.hp, atk: n1(base.atk), def: n1(base.def), luck: n1(base.luck) } };
        for (const b of ACTIVE_BUILDS) {
            const s = statsAtLevel(el, lv, b);
            data.buildStats[el][lv][b] = {
                hp: n1(s.hp), atk: n1(s.atk), def: n1(s.def), luck: n1(s.luck),
                dmgRed: n2(getDamageReduction(s.def) * 100),
                passiveChance: n2(getPassiveChance(s.luck) * 100)
            };
        }
    }
}

// Turn counts (mirror balanced)
for (const lv of MILESTONES) {
    data.turnResults[lv] = {};
    data.mirrorResults[lv] = {};
    data.neutralResults[lv] = {};
    data.counterResults[lv] = {};
    process.stdout.write(`  Lv.${lv}...`);

    for (const el of ELEMENTS) {
        const r = runOne(el, el, lv, 'balanced', 'balanced', N_SIMPLE, 'A');
        data.turnResults[lv][el] = n1(r.turns);
        data.mirrorResults[lv][el] = { wr: n2(r.wrA), turns: n1(r.turns) };
    }
    const NEUT = [['ROCK', 'PAPER'], ['PAPER', 'SCISSORS'], ['SCISSORS', 'ROCK']];
    for (const [a, b] of NEUT) {
        const r = runOne(a, b, lv, 'balanced', 'balanced', N_SIMPLE, 'A');
        data.neutralResults[lv][`${a}_vs_${b}`] = { wrA: n2(r.wrA), turns: n1(r.turns) };
    }

    // Counter matrix
    for (const cp of COUNTER_PAIRS) {
        data.counterResults[lv][cp.name] = { cells: {}, worst: {} };
        let mf = 100, ms = 100, bhf = -1, bhs = -1;
        for (const aB of ACTIVE_BUILDS) {
            data.counterResults[lv][cp.name].cells[aB] = {};
            for (const dB of ACTIVE_BUILDS) {
                const f = runOne(cp.counter, cp.victim, lv, aB, dB, N_MATRIX, 'A');
                const sc2 = statsAtLevel(cp.victim, lv, dB), sv2 = statsAtLevel(cp.counter, lv, aB);
                let wS = 0, hS = 0, tS = 0;
                for (let i = 0; i < N_MATRIX; i++) {
                    const r = simulateBattle(sc2, sv2, 'A');
                    tS += r.turns;
                    if (r.winner === 'B') { wS++; hS += r.winnerHpRatio; }
                }
                const wr1 = f.wrA, hp1 = f.hpA * 100, wr2 = wS / N_MATRIX * 100, hp2 = wS > 0 ? hS / wS * 100 : 0;
                data.counterResults[lv][cp.name].cells[aB][dB] = {
                    first: { wr: n2(wr1), hp: n2(hp1), turns: n1(f.turns) },
                    second: { wr: n2(wr2), hp: n2(hp2), turns: n1(tS / N_MATRIX) }
                };
                if (wr1 < mf) mf = wr1;
                if (wr2 < ms) ms = wr2;
                if (aB === 'balanced' && dB === 'balanced') { bhf = hp1; bhs = hp2; }
            }
        }
        data.counterResults[lv][cp.name].worst = { minWrF: n2(mf), minWrS: n2(ms), bbHpF: n2(bhf), bbHpS: n2(bhs) };
    }
    process.stdout.write(' done\n');
}

// Summary
let turnOk = 0, turnTotal = 0;
for (const el of ELEMENTS) {
    for (const lv of MILESTONES) {
        const cur = parseFloat(data.turnResults[lv][el]), tgt = TURN_TARGET[el][lv];
        const p = (cur - tgt) / tgt * 100, tol = lv < 10 ? 12 : 8;
        turnTotal++;
        if (Math.abs(p) <= tol) turnOk++;
    }
}
let winOk = 0, winTotal = 0, hpOk = 0, hpTotal = 0;
for (const lv of MILESTONES) {
    for (const cp of COUNTER_PAIRS) {
        const mf = parseFloat(data.counterResults[lv][cp.name].worst.minWrF);
        const ms = parseFloat(data.counterResults[lv][cp.name].worst.minWrS);
        if (mf >= 95) winOk++;
        if (ms >= 95) winOk++;
        winTotal += 2;
        // HP: count within 10-35% for all combos
        let hCount = 0, hTotal = 0;
        for (const aB of ACTIVE_BUILDS) {
            for (const dB of ACTIVE_BUILDS) {
                const hp1 = parseFloat(data.counterResults[lv][cp.name].cells[aB][dB].first.hp);
                const hp2 = parseFloat(data.counterResults[lv][cp.name].cells[aB][dB].second.hp);
                hTotal += 2;
                if (hp1 >= 10 && hp1 <= 35) hCount++;
                if (hp2 >= 10 && hp2 <= 35) hCount++;
            }
        }
        if (hCount >= hTotal / 2) hpOk++;
        hpTotal++;
    }
}
data.summary = { turnOk, turnTotal, winOk, winTotal, hpOk, hpTotal, nM: N_MATRIX, nS: N_SIMPLE };

// HTML generation
const dataJSON = JSON.stringify(data);
const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Combat Simulator v9 — Report</title>
<style>
:root{--bg:#0f1218;--panel:#1a1f2b;--border:#2a3142;--text:#e6e8ee;--muted:#8a93a6;--accent:#ffcf3f;--s:#ff5e7a;--r:#6aa7ff;--p:#58e58a;--ok:#4ade80;--warn:#ff6b35;--bad:#ef4444}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--text);font-family:-apple-system,"Segoe UI",system-ui,sans-serif;line-height:1.5}
header{background:linear-gradient(135deg,#1a1f2b 0%,#0f1218 100%);border-bottom:2px solid var(--accent);padding:24px 32px}
header h1{font-size:26px}header h1 .v{color:var(--accent)}
header p{margin:6px 0 0;color:var(--muted);font-size:13px}
main{max-width:1700px;margin:0 auto;padding:24px 32px 60px}
.section{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:20px 24px;margin-bottom:20px}
.section h2{color:var(--accent);font-size:16px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
.section h3{color:var(--text);font-size:14px;margin:16px 0 8px}
.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}
.summary-card{background:#0f1218;border:1px solid var(--border);border-radius:6px;padding:14px 18px}
.summary-card .label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.summary-card .value{font-size:28px;font-weight:700;margin-top:4px}
.summary-card .sub{font-size:12px;color:var(--muted);margin-top:2px}
.scroll-x{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:5px 7px;text-align:center;border-bottom:1px solid var(--border)}
th{background:#0f1218;color:var(--muted);font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:1px;position:sticky;top:0}
th:first-child,td:first-child{text-align:left}
.good{color:var(--ok);font-weight:700}.warn{color:var(--warn);font-weight:700}.bad{color:var(--bad);font-weight:700}
.heat-cell{font-size:11px;min-width:80px;padding:6px 8px}
.heat-good{background:rgba(74,222,128,0.15)}
.heat-warn{background:rgba(255,107,53,0.15)}
footer{color:var(--muted);text-align:center;font-size:12px;padding:24px}
</style>
</head>
<body>
<header>
<h1>⚔️ Combat Simulator <span class="v">v9</span> Report</h1>
<p>Hệ thống điểm cộng tự do (5 build types) • 1 điểm/level: HP×10, ATK/DEF/LUCK×1 • 9 mốc level</p>
<p>N_matrix=${N_MATRIX}/combo • Counter/Mirror re-tuned • 3 counter pairs × 25 build combos</p>
</header>
<main>
<section class="section">
<h2>① Đánh giá tổng hợp</h2>
<div class="summary-grid">
<div class="summary-card"><div class="label">Mục tiêu 1 — Số lượt</div><div class="value" id="s-turn">–</div><div class="sub">đạt/tổng (3 hệ × 9 mốc)</div></div>
<div class="summary-card"><div class="label">Mục tiêu 2a — Counter WR≥95%</div><div class="value" id="s-win">–</div><div class="sub">đạt/tổng (3 kèo × 9 mốc × 2 chiều)</div></div>
<div class="summary-card"><div class="label">Mục tiêu 2b — HP 10-35%</div><div class="value" id="s-hp">–</div><div class="sub">≥50% combos đạt (3 kèo × 9 mốc)</div></div>
</div>
</section>
<section class="section"><h2>② Chỉ số Lv.40 theo build</h2><div class="scroll-x"><table id="t2"></table></div></section>
<section class="section"><h2>③ Counter Winrate & HP Heatmap (Lv.40)</h2><div id="heat"></div></section>
<section class="section"><h2>④ Counter Worst-Case (9 mốc)</h2><div id="cw"></div></section>
<section class="section"><h2>⑤ Turn Count (mirror balanced)</h2><div class="scroll-x"><table id="t5"></table></div></section>
<footer>Generated by report_v9.js • Combat Simulator v9</footer>
</main>
<script>
const D=${dataJSON};
function n1(x){return Number(x).toFixed(1)}
function n2(x){return Number(x).toFixed(2)}
function ps(id,ok,total){const e=document.getElementById(id);const p=ok/total*100;e.textContent=ok+' / '+total;e.style.color=p>=90?'var(--ok)':p>=70?'var(--warn)':'var(--bad)';}
ps('s-turn',D.summary.turnOk,D.summary.turnTotal);ps('s-win',D.summary.winOk,D.summary.winTotal);ps('s-hp',D.summary.hpOk,D.summary.hpTotal);

// Build stats
(function(){
const lvs=[1,10,20,30,40];let r='<tr><th>Hệ</th><th>Build</th><th>Lv</th><th>HP</th><th>ATK</th><th>DEF</th><th>LUCK</th><th>DR%</th><th>PC%</th></tr>';
for(const el of D.elements){
for(const lv of lvs){
const b=D.buildStats[el][lv].base;
r+='<tr><td style="color:'+D.elColor[el]+';font-weight:700;">'+D.elLabel[el]+'</td><td>Base (v8)</td><td>'+lv+'</td><td>'+n1(b.hp)+'</td><td>'+b.atk+'</td><td>'+b.def+'</td><td>'+b.luck+'</td><td>'+(Math.round((1-Math.pow(0.98,Math.pow(parseFloat(b.def)>0?parseFloat(b.def):0,0.8)))*100))+'%</td><td>'+(Math.round((1-Math.pow(0.99,Math.pow(parseFloat(b.luck)>0?parseFloat(b.luck):0,0.75)))*100))+'%</td></tr>';
for(const bd of D.builds){
const s=D.buildStats[el][lv][bd];
r+='<tr><td></td><td>'+D.buildLabel[bd]+'</td><td>'+lv+'</td><td>'+s.hp+'</td><td>'+s.atk+'</td><td>'+s.def+'</td><td>'+s.luck+'</td><td>'+s.dmgRed+'%</td><td>'+s.passiveChance+'%</td></tr>';
}
}
r+='<tr style="height:8px"><td colspan="9"></td></tr>';
}
document.getElementById('t2').innerHTML=r;
})();

// Heatmaps
(function(){
const lv='40';let h='';
for(const cp of D.counterPairs){
h+='<h3 style="color:var(--warn);">'+cp.name+' ('+D.elLabel[cp.counter]+' khắc '+D.elLabel[cp.victim]+')</h3>';
h+='<div class="scroll-x"><table><thead><tr><th>CB\\VB</th>';
for(const b of D.builds) h+='<th>'+D.shortBuild[b]+'</th>';
h+='</tr></thead><tbody>';
for(const aB of D.builds){
h+='<tr><td style="font-weight:600;">'+D.shortBuild[aB]+'</td>';
for(const dB of D.builds){
const c=D.counterResults[lv][cp.name].cells[aB][dB];
const w1=parseFloat(c.first.wr),h1=parseFloat(c.first.hp),w2=parseFloat(c.second.wr),h2=parseFloat(c.second.hp);
const ok=w1>=95&&w2>=95&&h1>=10&&h1<=35&&h2>=10&&h2<=35;
h+='<td class="heat-cell '+(ok?'heat-good':'heat-warn')+'"><b>'+w1+'%</b> / '+h1+'%<br><b>'+w2+'%</b> / '+h2+'%</td>';
}
h+='</tr>';
}
h+='</tbody></table></div><br>';
}
document.getElementById('heat').innerHTML=h;
})();

// Worst-case
(function(){
let h='';
for(const cp of D.counterPairs){
h+='<h3>'+cp.name+'</h3><div class="scroll-x"><table><thead><tr><th>Lv</th><th>Min WR 1st</th><th>Min WR 2nd</th><th>BB HP 1st</th><th>BB HP 2nd</th></tr></thead><tbody>';
for(const lv of D.milestones){
const w=D.counterResults[lv][cp.name].worst;
h+='<tr><td>Lv.'+lv+'</td><td class="'+(parseFloat(w.minWrF)>=95?'good':'bad')+'">'+w.minWrF+'%</td><td class="'+(parseFloat(w.minWrS)>=95?'good':'bad')+'">'+w.minWrS+'%</td><td>'+w.bbHpF+'%</td><td>'+w.bbHpS+'%</td></tr>';
}
h+='</tbody></table></div>';
}
document.getElementById('cw').innerHTML=h;
})();

// Turn count
(function(){
const lvs=D.milestones;let r='<tr><th>Hệ</th>';
for(const lv of lvs) r+='<th>Lv.'+lv+'</th>';
r+='</tr>';
for(const el of D.elements){
r+='<tr><td style="color:'+D.elColor[el]+';font-weight:700;">'+D.elLabel[el]+'</td>';
for(const lv of lvs){
const cur=parseFloat(D.turnResults[lv][el]),tgt=D.turnTarget[el][lv];
const p=(cur-tgt)/tgt*100,tol=lv<10?12:8;
r+='<td class="'+(Math.abs(p)<=tol?'good':'warn')+'">'+cur+' <small style="color:var(--muted);">/'+tgt+'</small></td>';
}
r+='</tr>';
}
document.getElementById('t5').innerHTML=r;
})();
</script>
</body>
</html>`;

const outPath = path.join(__dirname, 'report_v9.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`\nReport saved: ${outPath}`);
console.log(`Size: ${(html.length/1024).toFixed(1)} KB`);
console.log(`\nSummary: Turn ${data.summary.turnOk}/${data.summary.turnTotal} | WR ${data.summary.winOk}/${data.summary.winTotal} | HP ${data.summary.hpOk}/${data.summary.hpTotal}`);
