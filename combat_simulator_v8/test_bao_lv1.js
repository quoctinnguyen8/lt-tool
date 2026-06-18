const sim = require('./simulator.js');
const { MIRROR, COUNTER, statsAtLevel, simulateBattle } = sim;

// Apply the tuned values
COUNTER.rock_vs_scissors_def = {1:150,5:150,10:150,15:150,20:150,25:150,30:150,35:150,40:150};
COUNTER.scissors_vs_paper_dmg = {1:0.75,5:0.75,10:0.75,15:0.75,20:0.75,25:0.75,30:0.75,35:0.75,40:0.75};
COUNTER.paper_vs_rock_hp = {1:750,5:750,10:375,15:375,20:750,25:750,30:750,35:750,40:750};
COUNTER.paper_vs_rock_luck = {1:30,5:30,10:30,15:30,20:30,25:30,30:30,35:30,40:30};
MIRROR.scissors_dmg_mult = {1:0.518,5:0.512,10:0.448,15:0.382,20:0.360,25:0.301,30:0.275,35:0.273,40:0.263};
MIRROR.rock_def_mult = {1:0.10,5:0.10,10:0.10,15:0.10,20:0.10,25:0.796,30:1.082,35:1.297,40:1.264};
MIRROR.paper_all_mult = {1:0.20,5:0.20,10:0.20,15:0.20,20:0.285,25:0.472,30:0.698,35:0.397,40:0.285};

const fs = require('fs');
let out = '';
for (const m of [0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.80, 0.92, 1.0]) {
    MIRROR.paper_all_mult[1] = m;
    MIRROR.paper_all_mult[5] = m;

    const pairs = [['PAPER','ROCK'], ['ROCK','PAPER'], ['PAPER','PAPER']];
    let total = 0;
    const N = 500;
    for (const [a, b] of pairs) {
        for (let i = 0; i < N; i++) {
            const r = simulateBattle(statsAtLevel(a, 1), statsAtLevel(b, 1), i % 2 === 0 ? 'A' : 'B');
            total += r.turns;
        }
    }
    const avg = total / (3 * N);
    out += `Lv.1 paper_all_mult = ${m} → Bao per-system avg turns = ${avg.toFixed(2)}\n`;
}
fs.writeFileSync('test_bao_lv1.txt', out);
console.log(out);
