// Preset data with base and growth stats
const PRESETS = {
    'SCISSORS': { 
        name: 'Hệ Kéo', 
        base: { hp: 110, atk: 17, def: 8, luck: 5 },
        growth: { hp: 18, atk: 2.3, def: 1, luck: 2 }
    },
    'ROCK': { 
        name: 'Hệ Búa', 
        base: { hp: 140, atk: 12, def: 17, luck: 5 },
        growth: { hp: 19, atk: 1.6, def: 1.8, luck: 1 }
    },
    'PAPER': { 
        name: 'Hệ Bao', 
        base: { hp: 120, atk: 15, def: 10, luck: 5 },
        growth: { hp: 18, atk: 1.9, def: 1.6, luck: 2.2 }
    }
};

// Hệ số nhân chỉ số cho các cấp bậc quái vật (Thường, Tinh Anh, Trùm Cuối)
// Người chơi có thể tự do chỉnh sửa các hệ số này để giả lập/thử nghiệm độ khó.
const MONSTER_RANK_MULTIPLIERS = {
    'NORMAL': { hp: 1.0, atk: 1.0, def: 1.0, luck: 1.0 },
    'ELITE':  { hp: 1.3, atk: 1.1, def: 1.1, luck: 1.1 },
    'BOSS':   { hp: 1.65, atk: 1.25, def: 1.25, luck: 1.25 }
};

function applyPreset(side, code) {
    const preset = PRESETS[code];
    if (!preset) return;
    
    // Set name
    document.getElementById(`name-${side}`).value = side === 'a' ? `Pet ${preset.name}` : `Quái vật ${preset.name}`;
    
    // Set element dropdown
    document.getElementById(`element-${side}`).value = code;
    
    // Set base stats inputs
    document.getElementById(`hp-${side}`).value = preset.base.hp;
    document.getElementById(`atk-${side}`).value = preset.base.atk;
    document.getElementById(`def-${side}`).value = preset.base.def;
    document.getElementById(`luck-${side}`).value = preset.base.luck;
    
    // Fill growth stats
    if (side === 'a') {
        document.getElementById('hp-growth-a').textContent = `+${preset.growth.hp}`;
        document.getElementById('atk-growth-a').textContent = `+${preset.growth.atk}`;
        document.getElementById('def-growth-a').textContent = `+${preset.growth.def}`;
        document.getElementById('luck-growth-a').textContent = `+${preset.growth.luck}`;
    } else {
        document.getElementById('hp-growth-b').value = preset.growth.hp;
        document.getElementById('atk-growth-b').value = preset.growth.atk;
        document.getElementById('def-growth-b').value = preset.growth.def;
        document.getElementById('luck-growth-b').value = preset.growth.luck;
    }
    
    updateBadge(side);
    highlightActivePreset(side, code);
    updateStatsFromLevel(side);
}

function updateStatsFromPreset(side) {
    const element = document.getElementById(`element-${side}`).value;
    const preset = PRESETS[element];
    
    if (preset) {
        document.getElementById(`hp-${side}`).value = preset.base.hp;
        document.getElementById(`atk-${side}`).value = preset.base.atk;
        document.getElementById(`def-${side}`).value = preset.base.def;
        document.getElementById(`luck-${side}`).value = preset.base.luck;
        
        if (side === 'a') {
            document.getElementById('hp-growth-a').textContent = `+${preset.growth.hp}`;
            document.getElementById('atk-growth-a').textContent = `+${preset.growth.atk}`;
            document.getElementById('def-growth-a').textContent = `+${preset.growth.def}`;
            document.getElementById('luck-growth-a').textContent = `+${preset.growth.luck}`;
        } else {
            document.getElementById('hp-growth-b').value = preset.growth.hp;
            document.getElementById('atk-growth-b').value = preset.growth.atk;
            document.getElementById('def-growth-b').value = preset.growth.def;
            document.getElementById('luck-growth-b').value = preset.growth.luck;
        }
    } else {
        // VÔ HỆ (NONE)
        document.getElementById(`hp-${side}`).value = 100;
        document.getElementById(`atk-${side}`).value = 10;
        document.getElementById(`def-${side}`).value = 5;
        document.getElementById(`luck-${side}`).value = 5;
        
        if (side === 'a') {
            document.getElementById('hp-growth-a').textContent = `+0`;
            document.getElementById('atk-growth-a').textContent = `+0`;
            document.getElementById('def-growth-a').textContent = `+0`;
            document.getElementById('luck-growth-a').textContent = `+0`;
        } else {
            document.getElementById('hp-growth-b').value = 0;
            document.getElementById('atk-growth-b').value = 0;
            document.getElementById('def-growth-b').value = 0;
            document.getElementById('luck-growth-b').value = 0;
        }
    }
    
    updateBadge(side);
    highlightActivePreset(side, element);
    updateStatsFromLevel(side);
}

function highlightActivePreset(side, code) {
    const container = document.getElementById(`presets-${side}`);
    if (!container) return;
    
    const buttons = container.querySelectorAll('.preset-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-preset') === code) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateBadge(side) {
    const select = document.getElementById(`element-${side}`);
    const badge = document.getElementById(`badge-${side}`);
    const element = select.value;
    
    badge.className = 'badge-element';
    if (element === 'SCISSORS') {
        badge.classList.add('badge-scissors');
        badge.textContent = 'Hệ Kéo';
    } else if (element === 'ROCK') {
        badge.classList.add('badge-rock');
        badge.textContent = 'Hệ Búa';
    } else if (element === 'PAPER') {
        badge.classList.add('badge-paper');
        badge.textContent = 'Hệ Bao';
    } else {
        badge.className = 'badge-element badge-none';
        badge.textContent = 'Vô hệ';
    }
}

/**
 * Tính tỉ lệ giảm sát thương (%) từ chỉ số DEF.
 * Công thức: % giảm = 1 - 0.98^(def^0.8)
 */
function getDamageReduction(def) {
    if (def <= 0) return 0;
    const reduction = 1 - Math.pow(0.98, Math.pow(def, 0.8));
    return Math.max(0, reduction);
}

/**
 * Tính tỉ lệ phần trăm kích hoạt nội tại (%) dựa vào chỉ số LUCK.
 * Công thức: % kích hoạt = 1 - 0.99^(luck^0.75)
 */
function getPassiveChance(luck) {
    if (luck <= 0) return 0;
    const chance = 1 - Math.pow(0.99, Math.pow(luck, 0.75));
    return Math.max(0, chance);
}

/**
 * Cập nhật chỉ số tự động dựa trên Cấp độ (Level) và Tăng trưởng hệ nguyên tố.
 */
function updateStatsFromLevel(side) {
    const level = parseInt(document.getElementById(`level-${side}`).value) || 1;
    
    // Đọc chỉ số cơ bản từ input
    const baseHp = parseInt(document.getElementById(`hp-${side}`).value) || 0;
    const baseAtk = parseInt(document.getElementById(`atk-${side}`).value) || 0;
    const baseDef = parseInt(document.getElementById(`def-${side}`).value) || 0;
    const baseLuck = parseInt(document.getElementById(`luck-${side}`).value) || 0;
    
    // Đọc tỉ lệ tăng trưởng
    let growthHp = 0;
    let growthAtk = 0;
    let growthDef = 0;
    let growthLuck = 0;
    
    if (side === 'a') {
        // Pet: Đọc từ element preset
        const element = document.getElementById('element-a').value;
        const preset = PRESETS[element];
        if (preset) {
            growthHp = preset.growth.hp;
            growthAtk = preset.growth.atk;
            growthDef = preset.growth.def;
            growthLuck = preset.growth.luck;
        }
    } else {
        // Monster: Đọc từ ô nhập ghi đè tăng trưởng
        growthHp = parseInt(document.getElementById('hp-growth-b').value) || 0;
        growthAtk = parseInt(document.getElementById('atk-growth-b').value) || 0;
        growthDef = parseInt(document.getElementById('def-growth-b').value) || 0;
        growthLuck = parseInt(document.getElementById('luck-growth-b').value) || 0;
    }
    
    // Tính toán chỉ số thực tế
    let actualHp = baseHp + (level - 1) * growthHp;
    let actualAtk = baseAtk + (level - 1) * growthAtk;
    let actualDef = baseDef + (level - 1) * growthDef;
    let actualLuck = baseLuck + (level - 1) * growthLuck;

    if (side === 'b') {
        const typeSelect = document.getElementById('monster-type');
        const rank = typeSelect ? typeSelect.value : 'NORMAL';
        const mults = MONSTER_RANK_MULTIPLIERS[rank] || { hp: 1.0, atk: 1.0, def: 1.0, luck: 1.0 };
        
        actualHp = actualHp * mults.hp;
        actualAtk = actualAtk * mults.atk;
        actualDef = actualDef * mults.def;
        actualLuck = actualLuck * mults.luck;
    }

    // Chỉ số sau cùng sẽ là số nguyên
    actualHp = Math.floor(actualHp);
    actualAtk = Math.floor(actualAtk);
    actualDef = Math.floor(actualDef);
    actualLuck = Math.floor(actualLuck);
    
    // Tính phần trăm giảm sát thương
    const reductionPercent = (getDamageReduction(actualDef) * 100).toFixed(1);
    
    // Tính phần trăm kích hoạt nội tại
    const passivePercent = (getPassiveChance(actualLuck) * 100).toFixed(1);
    
    // Hiển thị ra UI
    document.getElementById(`display-level-${side}`).textContent = level;
    document.getElementById(`actual-hp-${side}`).textContent = actualHp;
    document.getElementById(`actual-atk-${side}`).textContent = actualAtk;
    document.getElementById(`actual-def-${side}`).textContent = actualDef;
    document.getElementById(`actual-reduction-${side}`).textContent = reductionPercent;
    document.getElementById(`actual-luck-${side}`).textContent = actualLuck;
    document.getElementById(`actual-passive-${side}`).textContent = passivePercent;

}

/**
 * Tính toán sát thương thực tế mà Defender phải nhận.
 * Công thức: Sát thương = Max(1, ATK_A * (1 - Giảm_B))
 * 
 * @param {number} atkA Sức tấn công của Đấu sĩ A
 * @param {number} defB Giáp của Đấu sĩ B
 * @returns {number} Sát thương thực tế (trừ thẳng vào HP của B)
 */
function calculateDamage(atkA, defB) {
    const minDamage = 1;
    const reduction = getDamageReduction(defB);
    const damage = atkA * (1 - reduction);
    
    return Math.max(minDamage, Math.floor(damage));
}

function runSimulation() {
    // 1. Thu thập dữ liệu chiến đấu thực tế
    const charA = {
        name: document.getElementById('name-a').value || 'Pet',
        level: parseInt(document.getElementById('level-a').value) || 1,
        maxHp: parseInt(document.getElementById('actual-hp-a').textContent) || 100,
        hp: parseInt(document.getElementById('actual-hp-a').textContent) || 100,
        element: document.getElementById('element-a').value,
        atk: parseInt(document.getElementById('actual-atk-a').textContent) || 10,
        def: parseInt(document.getElementById('actual-def-a').textContent) || 5,
        luck: parseInt(document.getElementById('actual-luck-a').textContent) || 5,
        shieldActive: false,
        healNext: false,
        damageMultiplier: 1.0
    };

    const charB = {
        name: document.getElementById('name-b').value || 'Quái vật',
        level: parseInt(document.getElementById('level-b').value) || 1,
        maxHp: parseInt(document.getElementById('actual-hp-b').textContent) || 100,
        hp: parseInt(document.getElementById('actual-hp-b').textContent) || 100,
        element: document.getElementById('element-b').value,
        atk: parseInt(document.getElementById('actual-atk-b').textContent) || 10,
        def: parseInt(document.getElementById('actual-def-b').textContent) || 5,
        luck: parseInt(document.getElementById('actual-luck-b').textContent) || 5,
        shieldActive: false,
        healNext: false,
        damageMultiplier: 1.0
    };

    const totalTurns = parseInt(document.getElementById('turns-count').value) || 10;

    // 2. Chuẩn bị nhật ký đấu
    const logList = document.getElementById('battle-log');
    logList.innerHTML = '';

    // Áp dụng cơ chế khắc chế nếu được bật
    const useCounter = document.getElementById('counterToggle') ? document.getElementById('counterToggle').checked : false;
    let counterLogs = [];

    if (useCounter) {
        // Kéo gặp bao: kéo tăng tối đa 8% sát thương (Lv.1: 0%, Lv.40: 8%)
        if (charA.element === 'SCISSORS' && charB.element === 'PAPER') {
            const intensity = 0.08 * ((charA.level - 1) / 39);
            charA.damageMultiplier = 1 + intensity;
            if (intensity > 0) {
                counterLogs.push(`🔥 <strong>[KHẮC CHẾ]</strong> <strong>${charA.name} (Hệ Kéo - Lv.${charA.level})</strong> gặp <strong>${charB.name} (Hệ Bao)</strong>: ${charA.name} được tăng ${(intensity * 100).toFixed(1)}% sát thương gây ra!`);
            }
        }
        if (charB.element === 'SCISSORS' && charA.element === 'PAPER') {
            const intensity = 0.08 * ((charB.level - 1) / 39);
            charB.damageMultiplier = 1 + intensity;
            if (intensity > 0) {
                counterLogs.push(`🔥 <strong>[KHẮC CHẾ]</strong> <strong>${charB.name} (Hệ Kéo - Lv.${charB.level})</strong> gặp <strong>${charA.name} (Hệ Bao)</strong>: ${charB.name} được tăng ${(intensity * 100).toFixed(1)}% sát thương gây ra!`);
            }
        }

        // Bao gặp búa: bao tăng ngẫu nhiên [x-10] giá trị toàn bộ thuộc tính (HP vẫn x10)
        // x = level hiện tại chia 10, tối thiểu 1 (làm tròn lên)
        if (charA.element === 'PAPER' && charB.element === 'ROCK') {
            const lvl = charA.level;
            const k = 0.2 + 2.8 * ((lvl - 1) / 39);
            const hpGain = k * 10;
            charA.maxHp += hpGain;
            charA.hp += hpGain;
            charA.atk += k;
            charA.def += k;
            charA.luck += k;
            counterLogs.push(`🔥 <strong>[KHẮC CHẾ]</strong> <strong>${charA.name} (Hệ Bao - Lv.${charA.level})</strong> gặp <strong>${charB.name} (Hệ Búa)</strong>: ${charA.name} nhận +${k.toFixed(2)} toàn thuộc tính (HP +${hpGain.toFixed(1)}, ATK +${k.toFixed(2)}, DEF +${k.toFixed(2)}, LUCK +${k.toFixed(2)})!`);
        }
        if (charB.element === 'PAPER' && charA.element === 'ROCK') {
            const lvl = charB.level;
            const k = 0.2 + 2.8 * ((lvl - 1) / 39);
            const hpGain = k * 10;
            charB.maxHp += hpGain;
            charB.hp += hpGain;
            charB.atk += k;
            charB.def += k;
            charB.luck += k;
            counterLogs.push(`🔥 <strong>[KHẮC CHẾ]</strong> <strong>${charB.name} (Hệ Bao - Lv.${charB.level})</strong> gặp <strong>${charA.name} (Hệ Búa)</strong>: ${charB.name} nhận +${k.toFixed(2)} toàn thuộc tính (HP +${hpGain.toFixed(1)}, ATK +${k.toFixed(2)}, DEF +${k.toFixed(2)}, LUCK +${k.toFixed(2)})!`);
        }

        // Búa gặp kéo: búa tăng tối đa +8 DEF và 10% DEF (Lv.1: +0 DEF / 0%, Lv.40: +8 DEF / 10%)
        if (charA.element === 'ROCK' && charB.element === 'SCISSORS') {
            const oldDef = charA.def;
            const d = 8.0 * ((charA.level - 1) / 39);
            const intensity = 0.10 * ((charA.level - 1) / 39);
            charA.def = Math.floor((charA.def + d) * (1 + intensity));
            if (d > 0 || intensity > 0) {
                counterLogs.push(`🔥 <strong>[KHẮC CHẾ]</strong> <strong>${charA.name} (Hệ Búa - Lv.${charA.level})</strong> gặp <strong>${charB.name} (Hệ Kéo)</strong>: ${charA.name} được tăng thêm +${d.toFixed(1)} DEF và ${(intensity * 100).toFixed(1)}% DEF (${oldDef} &rarr; ${charA.def})!`);
            }
        }
        if (charB.element === 'ROCK' && charA.element === 'SCISSORS') {
            const oldDef = charB.def;
            const d = 8.0 * ((charB.level - 1) / 39);
            const intensity = 0.10 * ((charB.level - 1) / 39);
            charB.def = Math.floor((charB.def + d) * (1 + intensity));
            if (d > 0 || intensity > 0) {
                counterLogs.push(`🔥 <strong>[KHẮC CHẾ]</strong> <strong>${charB.name} (Hệ Búa - Lv.${charB.level})</strong> gặp <strong>${charA.name} (Hệ Kéo)</strong>: ${charB.name} được tăng thêm +${d.toFixed(1)} DEF và ${(intensity * 100).toFixed(1)}% DEF (${oldDef} &rarr; ${charB.def})!`);
            }
        }
    }

    if (counterLogs.length > 0) {
        const initialLogItem = document.createElement('li');
        initialLogItem.className = 'log-item';
        initialLogItem.style.borderLeft = '4px solid var(--accent-gold)';
        initialLogItem.style.backgroundColor = 'rgba(255, 215, 0, 0.05)';
        initialLogItem.innerHTML = `<div class="log-turn-header" style="color: var(--accent-gold);">🔥 HIỆU ỨNG KHẮC CHẾ ĐẦU TRẬN ĐẤU</div>` + 
            counterLogs.map(log => `<div class="log-action" style="font-size: 0.85rem; margin-top: 4px;">${log}</div>`).join('');
        logList.appendChild(initialLogItem);
    }

    // 3. Tiến trình chiến đấu
    const monsterType = document.getElementById('monster-type') ? document.getElementById('monster-type').value : 'NORMAL';
    const maxRuns = (monsterType === 'ELITE' || monsterType === 'BOSS') ? 2 : 1;
    
    let winner = null;
    
    for (let run = 1; run <= maxRuns; run++) {
        // Nếu quái đã chết ở hiệp trước thì dừng
        if (charB.hp <= 0) break;
        
        // Hiệp mới
        if (run > 1) {
            // Hiệp 2: Hồi đầy máu cho Pet
            charA.hp = charA.maxHp;
            // Reset các hiệu ứng tạm thời
            charA.shieldActive = false;
            charA.healNext = false;
            charB.shieldActive = false;
            charB.healNext = false;
        }
        
        // Log bắt đầu Hiệp đấu
        const startLogItem = document.createElement('li');
        startLogItem.className = 'log-item';
        startLogItem.style.borderLeft = '4px solid var(--accent-blue)';
        startLogItem.style.backgroundColor = 'rgba(0, 191, 255, 0.05)';
        
        const rankName = monsterType === 'ELITE' ? 'Tinh Anh' : (monsterType === 'BOSS' ? 'Trùm Cuối' : 'Quái thường');
        startLogItem.innerHTML = `<div class="log-turn-header" style="color: var(--accent-blue);">🎬 HIỆP GIẢ LẬP ${run} (${rankName})</div>
            <div class="log-action" style="font-size: 0.85rem; margin-top: 4px;">
                ⚔️ <strong>${charA.name}</strong> (HP: ${charA.hp}/${charA.maxHp}) bước vào trận chiến với 
                <strong>${charB.name}</strong> (HP: ${charB.hp}/${charB.maxHp}).
            </div>`;
        logList.appendChild(startLogItem);
        
        let round = 1;
        let endedEarly = false;
        
        while (round <= totalTurns && charA.hp > 0 && charB.hp > 0) {
            const logItem = document.createElement('li');
            logItem.className = 'log-item';
            
            let roundText = `<div class="log-turn-header">Hiệp ${run} - Lượt ${round}</div>`;

            // ==========================================
            // --- Đòn 1: Pet (A) tấn công Quái vật (B) ---
            // ==========================================
            const passiveChanceA = getPassiveChance(charA.luck);
            const triggerA = Math.random() < passiveChanceA;
            let isScissorsCritA = false;
            let critMultiplierA = 1.5;
            let passiveLogA = '';

            if (triggerA) {
                if (charA.element === 'SCISSORS') {
                    isScissorsCritA = true;
                    if (charA.hp >= charA.maxHp * 0.75) {
                        critMultiplierA = 2.0;
                        passiveLogA = ` <span class="highlight-crit">[💥 NỘI TẠI KÉO: CHÍ MẠNG 2X]</span>`;
                    } else {
                        critMultiplierA = 1.5;
                        passiveLogA = ` <span class="highlight-crit">[💥 NỘI TẠI KÉO: CHÍ MẠNG 1.5X]</span>`;
                    }
                } else if (charA.element === 'ROCK') {
                    charA.shieldActive = true;
                    passiveLogA = ` <span style="color: var(--accent-blue); font-weight: bold;">[🛡️ NỘI TẠI BÚA: TẠO KHIÊN GIẢM THƯƠNG]</span>`;
                } else if (charA.element === 'PAPER') {
                    charA.healNext = true;
                    passiveLogA = ` <span style="color: var(--accent-neon); font-weight: bold;">[🍃 NỘI TẠI BAO: SẴN SÀNG HỒI PHỤC]</span>`;
                }
            }

            let dmgToB = calculateDamage(charA.atk, charB.def);
            if (charA.damageMultiplier && charA.damageMultiplier > 1.0) {
                dmgToB = Math.floor(dmgToB * charA.damageMultiplier);
            }
            if (isScissorsCritA) {
                dmgToB = Math.floor(dmgToB * critMultiplierA);
            }

            let shieldLogB = '';
            if (charB.shieldActive) {
                const isLowHpB = charB.hp < 0.25 * charB.maxHp;
                const reductionRate = isLowHpB ? 0.95 : 0.75;
                dmgToB = Math.max(1, Math.floor(dmgToB * (1 - reductionRate)));
                shieldLogB = `<br><span style="color: var(--accent-blue); font-size: 0.75rem;">🛡️ [NỘI TẠI BÚA] kích hoạt chắn đòn! Giảm ${reductionRate * 100}% sát thương nhận vào.</span>`;
                charB.shieldActive = false;
            }

            charB.hp = Math.max(0, charB.hp - dmgToB);
            const reductionPercentB = (getDamageReduction(charB.def) * 100).toFixed(1);

            let dmgDetailA = `ATK: <span style="font-weight:600;">${charA.atk}</span> vs DEF đối phương: <span style="font-weight:600;">${charB.def} (Giảm ${reductionPercentB}%)</span>`;
            if (charA.damageMultiplier && charA.damageMultiplier > 1.0) {
                dmgDetailA += ` <span style="color: var(--accent-gold); font-size: 0.75rem; font-weight: bold;">[x${charA.damageMultiplier} Khắc chế]</span>`;
            }
            dmgDetailA += shieldLogB;

            roundText += `<div class="log-action">
                ⚔️ <strong>${charA.name} (Lv.${charA.level})</strong> tấn công <strong>${charB.name} (Lv.${charB.level})</strong>.${passiveLogA}
            </div>
            <div class="log-detail">
                ${dmgDetailA}
                <br>&rarr; Gây <span class="highlight-dmg">${dmgToB} sát thương</span>. HP của ${charB.name} còn: <strong>${charB.hp}/${charB.maxHp}</strong>.
            </div>`;

            if (charB.healNext && charB.hp > 0) {
                const isLowHpB = charB.hp < 0.3 * charB.maxHp;
                const healRate = isLowHpB ? 0.75 : 0.5;
                const healAmount = Math.floor(dmgToB * healRate);
                charB.hp = Math.min(charB.maxHp, charB.hp + healAmount);
                
                roundText += `<div class="log-detail" style="color: var(--accent-neon); font-size: 0.75rem; margin-top: 2px;">
                    🍃 [NỘI TẠI BAO] kích hoạt hồi phục! Hồi lại +${healAmount} HP (Bằng ${healRate * 100}% sát thương nhận). HP hiện tại: <strong>${charB.hp}/${charB.maxHp}</strong>.
                </div>`;
                charB.healNext = false;
            }

            if (charB.hp <= 0) {
                roundText += `<div style="color: var(--accent-neon); font-weight: bold; margin-top: 0.5rem;">💀 ${charB.name} đã ngã xuống!</div>`;
                logItem.innerHTML = roundText;
                logList.appendChild(logItem);
                winner = charA;
                endedEarly = true;
                break;
            }

            // ==========================================
            // --- Đòn 2: Quái vật (B) phản công Pet (A) ---
            // ==========================================
            const passiveChanceB = getPassiveChance(charB.luck);
            const triggerB = Math.random() < passiveChanceB;
            let isScissorsCritB = false;
            let critMultiplierB = 1.5;
            let passiveLogB = '';

            if (triggerB) {
                if (charB.element === 'SCISSORS') {
                    isScissorsCritB = true;
                    if (charB.hp >= charB.maxHp * 0.75) {
                        critMultiplierB = 2.0;
                        passiveLogB = ` <span class="highlight-crit">[💥 NỘI TẠI KÉO: CHÍ MẠNG 2X]</span>`;
                    } else {
                        critMultiplierB = 1.5;
                        passiveLogB = ` <span class="highlight-crit">[💥 NỘI TẠI KÉO: CHÍ MẠNG 1.5X]</span>`;
                    }
                } else if (charB.element === 'ROCK') {
                    charB.shieldActive = true;
                    passiveLogB = ` <span style="color: var(--accent-blue); font-weight: bold;">[🛡️ NỘI TẠI BÚA: TẠO KHIÊN GIẢM THƯƠNG]</span>`;
                } else if (charB.element === 'PAPER') {
                    charB.healNext = true;
                    passiveLogB = ` <span style="color: var(--accent-neon); font-weight: bold;">[🍃 NỘI TẠI BAO: SẴN SÀNG HỒI PHỤC]</span>`;
                }
            }

            let dmgToA = calculateDamage(charB.atk, charA.def);
            if (charB.damageMultiplier && charB.damageMultiplier > 1.0) {
                dmgToA = Math.floor(dmgToA * charB.damageMultiplier);
            }
            if (isScissorsCritB) {
                dmgToA = Math.floor(dmgToA * critMultiplierB);
            }

            let shieldLogA = '';
            if (charA.shieldActive) {
                const isLowHpA = charA.hp < 0.25 * charA.maxHp;
                const reductionRate = isLowHpA ? 0.95 : 0.75;
                dmgToA = Math.max(1, Math.floor(dmgToA * (1 - reductionRate)));
                shieldLogA = `<br><span style="color: var(--accent-blue); font-size: 0.75rem;">🛡️ [NỘI TẠI BÚA] kích hoạt chắn đòn! Giảm ${reductionRate * 100}% sát thương nhận vào.</span>`;
                charA.shieldActive = false;
            }

            charA.hp = Math.max(0, charA.hp - dmgToA);
            const reductionPercentA = (getDamageReduction(charA.def) * 100).toFixed(1);

            let dmgDetailB = `ATK: <span style="font-weight:600;">${charB.atk}</span> vs DEF đối phương: <span style="font-weight:600;">${charA.def} (Giảm ${reductionPercentA}%)</span>`;
            if (charB.damageMultiplier && charB.damageMultiplier > 1.0) {
                dmgDetailB += ` <span style="color: var(--accent-gold); font-size: 0.75rem; font-weight: bold;">[x${charB.damageMultiplier} Khắc chế]</span>`;
            }
            dmgDetailB += shieldLogA;

            roundText += `<div class="log-action" style="margin-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 0.5rem;">
                ⚔️ <strong>${charB.name} (Lv.${charB.level})</strong> phản công <strong>${charA.name} (Lv.${charA.level})</strong>.${passiveLogB}
            </div>
            <div class="log-detail">
                ${dmgDetailB}
                <br>&rarr; Gây <span class="highlight-dmg">${dmgToA} sát thương</span>. HP của ${charA.name} còn: <strong>${charA.hp}/${charA.maxHp}</strong>.
            </div>`;

            if (charA.healNext && charA.hp > 0) {
                const isLowHpA = charA.hp < 0.3 * charA.maxHp;
                const healRate = isLowHpA ? 0.75 : 0.5;
                const healAmount = Math.floor(dmgToA * healRate);
                charA.hp = Math.min(charA.maxHp, charA.hp + healAmount);
                
                roundText += `<div class="log-detail" style="color: var(--accent-neon); font-size: 0.75rem; margin-top: 2px;">
                    🍃 [NỘI TẠI BAO] kích hoạt hồi phục! Hồi lại +${healAmount} HP (Bằng ${healRate * 100}% sát thương nhận). HP hiện tại: <strong>${charA.hp}/${charA.maxHp}</strong>.
                </div>`;
                charA.healNext = false;
            }

            if (charA.hp <= 0) {
                roundText += `<div style="color: var(--accent-neon); font-weight: bold; margin-top: 0.5rem;">💀 ${charA.name} đã ngã xuống!</div>`;
                logItem.innerHTML = roundText;
                logList.appendChild(logItem);
                winner = charB;
                endedEarly = true;
                break;
            }

            logItem.innerHTML = roundText;
            logList.appendChild(logItem);
            round++;
        }
        
        // Log báo cáo cuối Hiệp đấu hiện tại
        const runOutcomeItem = document.createElement('li');
        runOutcomeItem.className = 'log-item';
        runOutcomeItem.style.borderLeft = '4px solid var(--accent-gold)';
        runOutcomeItem.style.backgroundColor = 'rgba(255, 215, 0, 0.03)';
        
        let outcomeMsg = '';
        if (charB.hp <= 0) {
            outcomeMsg = `🎉 <strong>Hiệp ${run} Kết Thúc:</strong> <strong>${charA.name}</strong> đã hạ gục <strong>${charB.name}</strong>!`;
        } else if (charA.hp <= 0) {
            outcomeMsg = `💀 <strong>Hiệp ${run} Kết Thúc:</strong> <strong>${charB.name}</strong> đã hạ gục <strong>${charA.name}</strong>!`;
        } else {
            outcomeMsg = `🤝 <strong>Hiệp ${run} Kết Thúc:</strong> Hết thời gian (${totalTurns} lượt). HP Quái còn lại: <strong>${charB.hp}/${charB.maxHp}</strong>.`;
        }
        runOutcomeItem.innerHTML = `<div class="log-detail" style="font-weight: bold; color: var(--accent-gold); padding: 4px 0;">${outcomeMsg}</div>`;
        logList.appendChild(runOutcomeItem);
    }

    // 4. Cập nhật kết quả cuối trận
    const outcomeBox = document.getElementById('outcome-box');
    if (charB.hp <= 0) {
        outcomeBox.className = 'outcome-box outcome-win';
        outcomeBox.textContent = `🏆 PET CHIẾN THẮNG CHUNG CUỘC (Đã diệt quái vật)`;
    } else {
        outcomeBox.className = 'outcome-box outcome-draw';
        outcomeBox.textContent = `🤝 QUÁI VẬT SỐNG SÓT (Pet thất bại)`;
    }

    // Cập nhật nhãn và thanh máu
    document.getElementById('label-name-a').textContent = charA.name;
    document.getElementById('label-hp-a').textContent = `${charA.hp} / ${charA.maxHp} HP`;
    const pctA = Math.max(0, (charA.hp / charA.maxHp) * 100);
    const barA = document.getElementById('bar-hp-a');
    barA.style.width = `${pctA}%`;
    if (pctA <= 25) barA.className = 'health-bar-inner low';
    else barA.className = 'health-bar-inner';

    document.getElementById('label-name-b').textContent = charB.name;
    document.getElementById('label-hp-b').textContent = `${charB.hp} / ${charB.maxHp} HP`;
    const pctB = Math.max(0, (charB.hp / charB.maxHp) * 100);
    const barB = document.getElementById('bar-hp-b');
    barB.style.width = `${pctB}%`;
    if (pctB <= 25) barB.className = 'health-bar-inner low';
    else barB.className = 'health-bar-inner';

}

// Initial initialization and event listener setups when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize elements and stats
    applyPreset('a', 'SCISSORS');
    applyPreset('b', 'ROCK');
    
    // CRT scanlines Toggle
    const crtToggle = document.getElementById('crtToggle');
    if (crtToggle) {
        crtToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('crt');
            } else {
                document.body.classList.remove('crt');
            }
        });
    }
});
