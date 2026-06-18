// js/combat_simulator.js
// Combat Simulator v7 - orchestrator cho UI
// Import core từ ./v7_balance.js (ES module), render bảng tĩnh, chạy mô phỏng
// + auto-tune, hiển thị log CRT.

import {
    PRESET, COUNTER, MIRROR, PASSIVE_LUT,
    LEVELS, ELEMENTS, TURN_TARGET,
    COUNTER_MATCHUPS,
    statsAtLevel, lutAt,
    getDamageReduction, getPassiveChance,
    buildReport, evaluateGoals, evaluateLevel,
    tuneAll
} from './v7_balance.js';

const MATCHUP_LABELS = [
    ['SCISSORS_vs_ROCK',     '✂️ Kéo vs 🔨 Búa (khắc chế)'],
    ['ROCK_vs_PAPER',        '🔨 Búa vs 📄 Bao (khắc chế)'],
    ['PAPER_vs_SCISSORS',    '📄 Bao vs ✂️ Kéo (khắc chế)'],
    ['ROCK_vs_SCISSORS',     '🔨 Búa vs ✂️ Kéo (ngược)'],
    ['PAPER_vs_ROCK',        '📄 Bao vs 🔨 Búa (ngược)'],
    ['SCISSORS_vs_PAPER',    '✂️ Kéo vs 📄 Bao (ngược)'],
    ['SCISSORS_vs_SCISSORS', '✂️ Kéo vs ✂️ Kéo (mirror)'],
    ['ROCK_vs_ROCK',         '🔨 Búa vs 🔨 Búa (mirror)'],
    ['PAPER_vs_PAPER',       '📄 Bao vs 📄 Bao (mirror)']
];

const PASSIVE_ROWS = [
    { key: 'scissorsCritLow',  name: '✂️ Kéo crit (HP≤75%)',       fmt: v => `${(v*100).toFixed(1)}%` },
    { key: 'scissorsCritHigh', name: '✂️ Kéo crit (HP>75%)',        fmt: v => `${(v*100).toFixed(1)}%` },
    { key: 'rockGuardBase',    name: '🔨 Búa guard cơ bản',         fmt: v => `${(v*100).toFixed(1)}%` },
    { key: 'rockGuardLowHp',   name: '🔨 Búa guard (HP<30%)',       fmt: v => `${(v*100).toFixed(1)}%` },
    { key: 'paperHealBase',    name: '📄 Bao heal cơ bản',          fmt: v => `${(v*100).toFixed(1)}%` },
    { key: 'paperHealLowHp',   name: '📄 Bao heal (HP<25%)',        fmt: v => `${(v*100).toFixed(1)}%` }
];

const COUNTER_ROWS = [
    { key: 'scissors_vs_rock',           name: '✂️ Kéo vs 🔨 Búa: dmg%',    fmt: v => `${(v*100).toFixed(0)}%` },
    { key: 'rock_vs_paper',              name: '🔨 Búa vs 📄 Bao: def+',     fmt: v => `${v.toFixed(0)}` },
    { key: 'paper_vs_scissors',          name: '📄 Bao vs ✂️ Kéo: hp+',      fmt: v => `${v.toFixed(0)}` },
    { key: 'paper_vs_scissors_luck',     name: '📄 Bao vs ✂️ Kéo: luck+',    fmt: v => `${v.toFixed(1)}` }
];

const MIRROR_ROWS = [
    { key: 'scissors_dmg_mult', name: '✂️ Kéo dmg mult',  fmt: v => `${(v*100).toFixed(0)}%` },
    { key: 'rock_def_mult',     name: '🔨 Búa def mult',  fmt: v => `${(v*100).toFixed(0)}%` },
    { key: 'paper_all_mult',    name: '📄 Bao all mult',  fmt: v => `${(v*100).toFixed(0)}%` }
];

// =================== LOG ===================
const logList = document.getElementById('battle-log');
function logLine(msg, kind = 'info') {
    if (!logList) return;
    const li = document.createElement('li');
    li.className = 'log-item';
    const time = new Date().toLocaleTimeString('vi-VN');
    li.innerHTML = `<span class="log-time">[${time}]</span><span class="log-${kind}">${msg}</span>`;
    // Xoá placeholder dòng đầu
    if (logList.firstElementChild && logList.firstElementChild.style && logList.firstElementChild.style.textAlign === 'center') {
        logList.innerHTML = '';
    }
    logList.appendChild(li);
    const area = logList.parentElement;
    if (area) area.scrollTop = area.scrollHeight;
}

function clearLog() {
    if (!logList) return;
    logList.innerHTML = '<li class="log-item" style="color:#8a92b2;text-align:center;padding:2rem 0;">[ Đã xoá log ]</li>';
}

// =================== RENDER BẢNG TĨNH ===================
function renderTablePresets() {
    const tbody = document.querySelector('#table-presets tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (const el of ELEMENTS) {
        const p = PRESET[el];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--color-${el.toLowerCase()});">${p.name}</td>
            <td>${p.base.hp}</td>
            <td>${p.base.atk}</td>
            <td>${p.base.def}</td>
            <td>${p.base.luck}</td>
            <td>[${p.growth.hp.join(', ')}]</td>
            <td>[${p.growth.atk.join(', ')}]</td>
            <td>[${p.growth.def.join(', ')}]</td>
            <td>[${p.growth.luck.join(', ')}]</td>
        `;
        tbody.appendChild(tr);
    }
}

function renderLevelGrid(tableId, rows, sourceObj) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;
    tbody.innerHTML = '';
    for (const row of rows) {
        const tr = document.createElement('tr');
        const fmt = row.fmt || (v => String(v));
        const cells = [`<td>${row.name}</td>`];
        for (const lv of LEVELS) {
            const v = lutAt(sourceObj[row.key], lv);
            cells.push(`<td>${fmt(v)}</td>`);
        }
        tr.innerHTML = cells.join('');
        tbody.appendChild(tr);
    }
}

function renderTableCounter() { renderLevelGrid('table-counter', COUNTER_ROWS, COUNTER); }
function renderTableMirror()  { renderLevelGrid('table-mirror',  MIRROR_ROWS,  MIRROR); }
function renderTablePassive() { renderLevelGrid('table-passive', PASSIVE_ROWS, PASSIVE_LUT); }

// =================== RENDER BÁO CÁO ===================
function renderReport(report, goals) {
    const { allPS, allResults, allCounter } = report;

    // Bảng 1: số lượt
    const tbTurns = document.querySelector('#table-turns tbody');
    tbTurns.innerHTML = '';
    for (const el of ELEMENTS) {
        const tr = document.createElement('tr');
        const cells = [`<td style="color: var(--color-${el.toLowerCase()});">${PRESET[el].name}</td>`];
        for (const lv of LEVELS) {
            const cur = allPS[lv][el];
            const tgt = TURN_TARGET[el][lv];
            const pct = (cur - tgt) / tgt * 100;
            const tol = lv < 10 ? 12 : 8;
            const ok = Math.abs(pct) <= tol;
            cells.push(`<td class="${ok ? 'cell-good' : 'cell-bad'}">${cur.toFixed(1)} / ${tgt.toFixed(1)}</td>`);
        }
        tr.innerHTML = cells.join('');
        tbTurns.appendChild(tr);
    }

    // Bảng 2: tỉ lệ thắng
    const tbWin = document.querySelector('#table-winrate tbody');
    tbWin.innerHTML = '';
    for (const [key, name] of MATCHUP_LABELS) {
        const tr = document.createElement('tr');
        const cells = [`<td>${name}</td>`];
        for (const lv of LEVELS) {
            const r = allResults[lv][key];
            const aOk = r.winRateA >= 95;
            const bOk = r.winRateB >= 95;
            const cls = (aOk && bOk) ? 'cell-good' : (aOk || bOk) ? 'cell-warn' : 'cell-bad';
            cells.push(`<td class="${cls}">${r.winRateA.toFixed(1)} / ${r.winRateB.toFixed(1)}</td>`);
        }
        tr.innerHTML = cells.join('');
        tbWin.appendChild(tr);
    }

    // Bảng 3: HP% còn lại
    const tbHp = document.querySelector('#table-hp tbody');
    tbHp.innerHTML = '';
    for (const cm of COUNTER_MATCHUPS) {
        for (const dir of ['first', 'second']) {
            const dirLabel = dir === 'first' ? `${cm.counter} đi trước` : `${cm.counter} đi sau`;
            const tr = document.createElement('tr');
            const cells = [`<td>${cm.name} (${dirLabel})</td>`];
            for (const lv of LEVELS) {
                const data = allCounter[lv][cm.name][dir];
                // Trong 'first' A là counter, 'second' B là counter
                const hp = (dir === 'first' ? data.avgHpAWin : data.avgHpBWin) * 100;
                let cls = 'cell-warn';
                if (lv < 10) cls = '';
                else if (hp >= 10 && hp <= 35) cls = 'cell-good';
                else cls = 'cell-bad';
                cells.push(`<td class="${cls}">${hp.toFixed(0)}%</td>`);
            }
            tr.innerHTML = cells.join('');
            tbHp.appendChild(tr);
        }
    }

    // Goal summary badge
    const badge = document.getElementById('goal-summary');
    if (badge) {
        const totalScore = goals.turnOk + goals.winOk + goals.hpOk;
        const totalCount = goals.turnTotal + goals.winTotal + goals.hpTotal;
        const pct = (totalScore / totalCount * 100).toFixed(0);
        badge.textContent = `Turn ${goals.turnOk}/${goals.turnTotal} · Win ${goals.winOk}/${goals.winTotal} · HP ${goals.hpOk}/${goals.hpTotal} (${pct}%)`;
        badge.className = 'goal-badge ' + (pct >= 80 ? 'good' : pct >= 50 ? 'warn' : 'bad');
    }
}

// =================== CHẠY MÔ PHỎNG ===================
function setRunning(running) {
    const btn = document.getElementById('btn-run-sim');
    const reset = document.getElementById('btn-reset-data');
    if (btn) {
        btn.disabled = running;
        btn.textContent = running ? '[ ĐANG CHẠY... ]' : '[ CHẠY MÔ PHỎNG ]';
    }
    if (reset) reset.disabled = running;
}

async function runSimulation() {
    setRunning(true);
    const N = Math.max(50, parseInt(document.getElementById('sim-n').value) || 200);
    const tuneN = Math.max(50, parseInt(document.getElementById('sim-tune-n').value) || 200);
    const doTune = document.getElementById('tuneToggle').checked;

    logLine(`▶ Bắt đầu chạy. N=${N}, TUNE=${doTune ? `bật (tuneN=${tuneN})` : 'tắt'}`, 'info');

    // Re-render bảng tĩnh (đề phòng COUNTER/MIRROR đã bị tune sửa)
    renderTableCounter();
    renderTableMirror();
    renderTablePassive();

    try {
        if (doTune) {
            logLine(`⏳ Đang auto-tune COUNTER + MIRROR theo từng level ... (có thể mất vài phút)`, 'warn');
            await new Promise(resolve => {
                tuneAll(tuneN, {
                    onStart: (n) => logLine(`  • TUNE start, tuneN=${n}`, 'info'),
                    onLevel: (lv, sec) => logLine(`  • TUNE Lv.${lv} xong (${sec.toFixed(1)}s)`, 'ok'),
                    onDone: () => { logLine(`✓ Auto-tune hoàn tất.`, 'ok'); resolve(); }
                });
            });
            // Cập nhật lại bảng tĩnh sau tune
            renderTableCounter();
            renderTableMirror();
        }

        logLine(`⏳ Đang chạy report với N=${N} ...`, 'warn');
        const t0 = performance.now();
        const report = buildReport(N);
        const goals = evaluateGoals(report);
        const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
        renderReport(report, goals);
        logLine(`✓ Report xong trong ${elapsed}s.`, 'ok');
        logLine(`  Turn goal: ${goals.turnOk}/${goals.turnTotal} (tol ±8% Lv.10+, ±12% Lv.<10)`, goals.turnOk === goals.turnTotal ? 'ok' : 'warn');
        logLine(`  Win rate ≥95% (counter, Lv.10+): ${goals.winOk}/${goals.winTotal}`, goals.winOk === goals.winTotal ? 'ok' : 'warn');
        logLine(`  HP remaining 10-35% (counter, Lv.10+): ${goals.hpOk}/${goals.hpTotal}`, goals.hpOk === goals.hpTotal ? 'ok' : 'warn');
    } catch (err) {
        logLine(`✗ Lỗi: ${err && err.message ? err.message : err}`, 'err');
        console.error(err);
    } finally {
        setRunning(false);
    }
}

function resetData() {
    // Reload lại module để reset COUNTER/MIRROR/PASSIVE_LUT/PRESET
    // Cách đơn giản: thử lại bằng cách gọi lại module - vì COUNTER/MIRROR là mutable object trong cùng module instance.
    // Do các object được share, ta sẽ reset về default bằng cách reload trang.
    logLine('↻ Reload trang để reset dữ liệu về mặc định v7 ...', 'warn');
    setTimeout(() => location.reload(), 300);
}

// =================== INIT ===================
document.addEventListener('DOMContentLoaded', () => {
    renderTablePresets();
    renderTableCounter();
    renderTableMirror();
    renderTablePassive();

    const btnRun = document.getElementById('btn-run-sim');
    if (btnRun) btnRun.addEventListener('click', runSimulation);
    const btnReset = document.getElementById('btn-reset-data');
    if (btnReset) btnReset.addEventListener('click', resetData);
    const btnClear = document.getElementById('btn-clear-log');
    if (btnClear) btnClear.addEventListener('click', clearLog);

    const crtToggle = document.getElementById('crtToggle');
    if (crtToggle) {
        crtToggle.addEventListener('change', (e) => {
            document.body.classList.toggle('crt', e.target.checked);
        });
    }

    logLine('✓ UI sẵn sàng. PRESET/COUNTER/MIRROR/PASSIVE đã load.', 'ok');
    logLine('  Nhấn "[ CHẠY MÔ PHỎNG ]" để chạy báo cáo. Bật AUTO-TUNE để tune bảng trước khi chạy.', 'info');
});
