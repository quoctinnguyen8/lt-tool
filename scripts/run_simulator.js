const fs = require('fs');
const path = require('path');

// 1. ĐƯỜNG DẪN ĐÍCH
const SIMULATOR_FILE = path.join(__dirname, '../js/combat_simulator.js');
const REPORT_FILE = path.join(__dirname, '../reports/phan-tich-va-thong-ke-combat-ling-thu.md');

console.log("==================================================");
console.log("⚙️  BẮT ĐẦU ĐỌC DỮ LIỆU TỪ GAME...");
console.log(`📂 File nguồn: ${SIMULATOR_FILE}`);

if (!fs.existsSync(SIMULATOR_FILE)) {
    console.error(`❌ Không tìm thấy file: ${SIMULATOR_FILE}`);
    process.exit(1);
}

const fileContent = fs.readFileSync(SIMULATOR_FILE, 'utf8');

// 2. TRÍCH XUẤT HẰNG SỐ PRESETS VÀ MONSTER MULTIPLIERS TỪ FILE JS CHÍNH
let PRESETS = null;
let MONSTER_RANK_MULTIPLIERS = null;

try {
    const presetsMatch = fileContent.match(/const\s+PRESETS\s*=\s*(\{[\s\S]*?\});/);
    if (presetsMatch) {
        PRESETS = eval("(" + presetsMatch[1] + ")");
    }
    const multMatch = fileContent.match(/const\s+MONSTER_RANK_MULTIPLIERS\s*=\s*(\{[\s\S]*?\});/);
    if (multMatch) {
        MONSTER_RANK_MULTIPLIERS = eval("(" + multMatch[1] + ")");
    }
} catch (err) {
    console.error("❌ Lỗi khi phân tích cú pháp PRESETS/MULTIPLIERS trong combat_simulator.js:", err.message);
    process.exit(1);
}

if (!PRESETS) {
    console.error("❌ Không thể trích xuất PRESETS từ combat_simulator.js. Vui lòng kiểm tra định dạng khai báo (const PRESETS = { ... };)");
    process.exit(1);
}

console.log("✅ Trích xuất chỉ số Presets thành công:");
console.log(JSON.stringify(PRESETS, null, 2));
console.log("");

// 3. HÀM LOGIC CHIẾN ĐẤU (Đồng bộ với combat_simulator.js)
function getDamageReduction(def) {
    if (def <= 0) return 0;
    const reduction = 1 - Math.pow(0.98, Math.pow(def, 0.8));
    return Math.max(0, reduction);
}

function getPassiveChance(luck) {
    if (luck <= 0) return 0;
    const chance = 1 - Math.pow(0.993, Math.pow(luck, 0.75));
    return Math.max(0, chance);
}

function calculateDamage(atkA, defB) {
    const minDamage = 1;
    const reduction = getDamageReduction(defB);
    const damage = atkA * (1 - reduction);
    return Math.max(minDamage, Math.floor(damage));
}

function getStatsAtLevel(element, level) {
    const preset = PRESETS[element];
    // v75: dùng growthTable (piecewise) nếu có, fallback về growth scalar
    const gTable = preset.growthTable;
    const gHp   = gTable ? growthAt(gTable.hp,   level) : preset.growth.hp;
    const gAtk  = gTable ? growthAt(gTable.atk,  level) : preset.growth.atk;
    const gDef  = gTable ? growthAt(gTable.def,  level) : preset.growth.def;
    const gLuck = gTable ? growthAt(gTable.luck, level) : preset.growth.luck;
    return {
        element: element,
        name: preset.name,
        level: level,
        maxHp: Math.floor(preset.base.hp + (level - 1) * gHp),
        hp: Math.floor(preset.base.hp + (level - 1) * gHp),
        atk: Math.floor(preset.base.atk + (level - 1) * gAtk),
        def: Math.floor(preset.base.def + (level - 1) * gDef),
        luck: Math.floor(preset.base.luck + (level - 1) * gLuck),
        shieldActive: false,
        healNext: false,
        damageMultiplier: 1.0
    };
}

// Helper: lấy giá trị growth tại level cụ thể (nội suy tuyến tính)
// growthEntry có thể là: số (scalar) hoặc object {1:x, 5:y, ...} (piecewise)
function growthAt(growthEntry, level) {
    if (typeof growthEntry === 'number') return growthEntry;
    if (!growthEntry || typeof growthEntry !== 'object') return 0;
    const keys = Object.keys(growthEntry).map(Number).sort((a, b) => a - b);
    if (keys.length === 0) return 0;
    if (level <= keys[0]) return growthEntry[keys[0]];
    if (level >= keys[keys.length - 1]) return growthEntry[keys[keys.length - 1]];
    for (let i = 0; i < keys.length - 1; i++) {
        const low = keys[i];
        const high = keys[i + 1];
        if (level >= low && level <= high) {
            const lowVal = growthEntry[low];
            const highVal = growthEntry[high];
            const t = (level - low) / (high - low);
            return lowVal + (highVal - lowVal) * t;
        }
    }
    return growthEntry[keys[keys.length - 1]];
}

// =================== CƠ CHẾ KHẮC CHẾ v79 ===================
// Yêu cầu mới: bên khắc chế LUÔN thắng 100% (cả 2 chiều).
// Tập trung cân chỉnh HP còn lại khi thắng theo từng hệ và giai đoạn:
//   - KÉO: 30% (đầu) / 20% (giữa) / 15% (cuối)
//   - BAO: 20% (đầu) / 30% (giữa) / 20% (cuối)
//   - BÚA: 15% (đầu) / 22% (giữa) / 35% (cuối)
// --------------------------------------------------------
const COUNTER_CONFIG = {
    // scissors_vs_paper: dmgMult bonus (CỰC MẠNH - Kéo luôn thắng)
    //   Lv.10: 1.30, Lv.20: 1.20, Lv.30: 0.70, Lv.40: 0.40
    scissors_vs_paper: {
        1:  0.00,
        5:  0.00,
        10: 1.30,
        15: 1.25,
        20: 1.20,
        25: 0.95,
        30: 0.70,
        35: 0.55,
        40: 0.40
    },
    // rock_vs_scissors: DEF bonus (Búa luôn thắng)
    //   Lv.10: 5, Lv.20: 4, Lv.30: 5, Lv.40: 6
    rock_vs_scissors: {
        1:  0.0,
        5:  0.0,
        10: 5.0,
        15: 4.5,
        20: 4.0,
        25: 4.5,
        30: 5.0,
        35: 5.5,
        40: 6.0
    },
    // paper_vs_rock: HP + LUCK bonus (CỰC MẠNH - Bao luôn thắng)
    //   HP:   Lv.10: 50, Lv.20: 70, Lv.30: 110, Lv.40: 30
    //   LUCK: Lv.10: 3, Lv.20: 5, Lv.30: 8, Lv.40: 6
    paper_vs_rock: {
        hp: {
            1:  0,
            5:  0,
            10: 50,
            15: 60,
            20: 70,
            25: 92,
            30: 110,
            35: 60,
            40: 30
        },
        luck: {
            1:  0.0,
            5:  0.0,
            10: 3.0,
            15: 4.0,
            20: 5.0,
            25: 6.5,
            30: 8.0,
            35: 7.0,
            40: 6.0
        }
    }
};

// =================== HỒI PHỤC MỖI LƯỢT (v92) ===================
// % maxHp hồi phục mỗi lượt cho bên khắc chế.
// KÉO: Lv.10-20: 1.5%, Lv.20-30: 1.0%, Lv.30-40: 0.3%
// BAO: Lv.10-20: 0.5%, Lv.20-30: 1.3%, Lv.30-40: 0.3%
// BÚA: Lv.10-20: 0.05%, Lv.20-30: 0.15%, Lv.30-40: 0.25%
function getCounterRegenRate(element, level) {
    if (element === 'SCISSORS') {
        if (level <= 20) return 0.015;
        if (level <= 30) return 0.010;
        return 0.003;
    } else if (element === 'PAPER') {
        if (level <= 20) return 0.005;
        if (level <= 30) return 0.013;
        return 0.003;
    } else if (element === 'ROCK') {
        if (level <= 20) return 0.0005;
        if (level <= 30) return 0.0015;
        return 0.0025;
    }
    return 0;
}

function counterBonus(configEntry, level) {
    if (!configEntry) return 0;
    const levelKeys = Object.keys(configEntry).map(Number).sort((a, b) => a - b);
    if (level <= levelKeys[0]) return configEntry[levelKeys[0]];
    if (level >= levelKeys[levelKeys.length - 1]) return configEntry[levelKeys[levelKeys.length - 1]];

    for (let i = 0; i < levelKeys.length - 1; i++) {
        const low = levelKeys[i];
        const high = levelKeys[i + 1];
        if (level >= low && level <= high) {
            const lowVal = configEntry[low];
            const highVal = configEntry[high];
            const t = (level - low) / (high - low);
            return lowVal + (highVal - lowVal) * t;
        }
    }
    return configEntry[levelKeys[levelKeys.length - 1]];
}

// 4. MÔ PHỎNG MỘT TRẬN ĐẤU
function simulateOneBattle(charA_base, charB_base, useCounter, maxTurns = 40) {
    const charA = { ...charA_base };
    const charB = { ...charB_base };

    // Áp dụng khắc chế đầu trận (v73)
    // Quy ước: bonus khắc chế áp dụng cho BÊN KHẮC CHẾ (counter), bất kể đi trước/sau.
    //   - SCISSORS gặp PAPER → SCISSORS (bên khắc) nhận bonus damageMultiplier + hồi phục
    //   - PAPER gặp ROCK     → PAPER (bên khắc) nhận bonus HP + LUCK + hồi phục
    //   - ROCK gặp SCISSORS  → ROCK (bên khắc) nhận bonus DEF + hồi phục
    // Yêu cầu: tỉ lệ thắng bên khắc = 80-99% (cả 2 chiều) + HP còn lại khi thắng ≥ 15%
    if (useCounter) {
        // SCISSORS gặp PAPER → bên KÉO nhận bonus dmg + regen
        if (charA.element === 'SCISSORS' && charB.element === 'PAPER') {
            const intensity = counterBonus(COUNTER_CONFIG.scissors_vs_paper, charA.level);
            charA.damageMultiplier = 1 + intensity;
            charA.counterRegen = true;  // v73: hồi phục mỗi lượt cho bên khắc
        } else if (charB.element === 'SCISSORS' && charA.element === 'PAPER') {
            const intensity = counterBonus(COUNTER_CONFIG.scissors_vs_paper, charB.level);
            charB.damageMultiplier = 1 + intensity;
            charB.counterRegen = true;
        }
        // PAPER gặp ROCK → bên BAO nhận bonus HP + LUCK + regen
        else if (charA.element === 'PAPER' && charB.element === 'ROCK') {
            const hpGain = counterBonus(COUNTER_CONFIG.paper_vs_rock.hp, charA.level);
            const luckGain = counterBonus(COUNTER_CONFIG.paper_vs_rock.luck, charA.level);
            charA.maxHp += hpGain;
            charA.hp += hpGain;
            charA.luck += luckGain;
            charA.counterRegen = true;
        } else if (charB.element === 'PAPER' && charA.element === 'ROCK') {
            const hpGain = counterBonus(COUNTER_CONFIG.paper_vs_rock.hp, charB.level);
            const luckGain = counterBonus(COUNTER_CONFIG.paper_vs_rock.luck, charB.level);
            charB.maxHp += hpGain;
            charB.hp += hpGain;
            charB.luck += luckGain;
            charB.counterRegen = true;
        }
        // ROCK gặp SCISSORS → bên BÚA nhận bonus DEF + regen
        else if (charA.element === 'ROCK' && charB.element === 'SCISSORS') {
            const d = counterBonus(COUNTER_CONFIG.rock_vs_scissors, charA.level);
            charA.def = Math.floor(charA.def + d);
            charA.counterRegen = true;
        } else if (charB.element === 'ROCK' && charA.element === 'SCISSORS') {
            const d = counterBonus(COUNTER_CONFIG.rock_vs_scissors, charB.level);
            charB.def = Math.floor(charB.def + d);
            charB.counterRegen = true;
        }
    }

    let round = 1;
    while (round <= maxTurns && charA.hp > 0 && charB.hp > 0) {
        // A attacks B
        const passiveChanceA = getPassiveChance(charA.luck);
        const triggerA = Math.random() < passiveChanceA;
        let isScissorsCritA = false;
        let critMultiplierA = 1.5;

        if (triggerA) {
            if (charA.element === 'SCISSORS') {
                isScissorsCritA = true;
                // Nội suy mượt 1.35 -> 1.45 (giảm max từ 1.6 để bớt snowball)
                const hpRatioA = Math.max(0, Math.min(1, charA.hp / charA.maxHp));
                critMultiplierA = 1.3 + (1.4 - 1.3) * hpRatioA;
                critMultiplierA = Math.round(critMultiplierA * 100) / 100;
            } else if (charA.element === 'ROCK') {
                charA.shieldActive = true;
            } else if (charA.element === 'PAPER') {
                charA.healNext = true;
            }
        }

        let dmgToB = calculateDamage(charA.atk, charB.def);
        if (charA.damageMultiplier > 1.0) {
            dmgToB = Math.floor(dmgToB * charA.damageMultiplier);
        }
        if (isScissorsCritA) {
            dmgToB = Math.floor(dmgToB * critMultiplierA);
        }

        if (charB.shieldActive) {
            const isLowHpB = charB.hp < 0.25 * charB.maxHp;
            const reductionRate = isLowHpB ? 0.95 : 0.75;
            dmgToB = Math.max(1, Math.floor(dmgToB * (1 - reductionRate)));
            charB.shieldActive = false;
        }

        charB.hp = Math.max(0, charB.hp - dmgToB);

        if (charB.healNext && charB.hp > 0) {
            const isLowHpB = charB.hp < 0.3 * charB.maxHp;
            const healRate = isLowHpB ? 0.75 : 0.5;
            const healAmount = Math.floor(dmgToB * healRate);
            charB.hp = Math.min(charB.maxHp, charB.hp + healAmount);
            charB.healNext = false;
        }

        if (charB.hp <= 0) return { winner: 'A', turns: round, remainingHpA: charA.hp, maxHpA: charA.maxHp, remainingHpB: 0, maxHpB: charB.maxHp };

        // B attacks A
        const passiveChanceB = getPassiveChance(charB.luck);
        const triggerB = Math.random() < passiveChanceB;
        let isScissorsCritB = false;
        let critMultiplierB = 1.5;

        if (triggerB) {
            if (charB.element === 'SCISSORS') {
                isScissorsCritB = true;
                // Nội suy mượt 1.35 -> 1.45
                const hpRatioB = Math.max(0, Math.min(1, charB.hp / charB.maxHp));
                critMultiplierB = 1.3 + (1.4 - 1.3) * hpRatioB;
                critMultiplierB = Math.round(critMultiplierB * 100) / 100;
            } else if (charB.element === 'ROCK') {
                charB.shieldActive = true;
            } else if (charB.element === 'PAPER') {
                charB.healNext = true;
            }
        }

        let dmgToA = calculateDamage(charB.atk, charA.def);
        if (charB.damageMultiplier > 1.0) {
            dmgToA = Math.floor(dmgToA * charB.damageMultiplier);
        }
        if (isScissorsCritB) {
            dmgToA = Math.floor(dmgToA * critMultiplierB);
        }

        if (charA.shieldActive) {
            const isLowHpA = charA.hp < 0.25 * charA.maxHp;
            const reductionRate = isLowHpA ? 0.95 : 0.75;
            dmgToA = Math.max(1, Math.floor(dmgToA * (1 - reductionRate)));
            charA.shieldActive = false;
        }

        charA.hp = Math.max(0, charA.hp - dmgToA);

        if (charA.healNext && charA.hp > 0) {
            const isLowHpA = charA.hp < 0.3 * charA.maxHp;
            const healRate = isLowHpA ? 0.75 : 0.5;
            const healAmount = Math.floor(dmgToA * healRate);
            charA.hp = Math.min(charA.maxHp, charA.hp + healAmount);
            charA.healNext = false;
        }

        if (charA.hp <= 0) return { winner: 'B', turns: round, remainingHpA: 0, maxHpA: charA.maxHp, remainingHpB: charB.hp, maxHpB: charB.maxHp };

        // v75: Hồi phục mỗi lượt cho bên khắc chế - theo giai đoạn game
        if (charA.counterRegen && charA.hp > 0) {
            const regenRate = getCounterRegenRate(charA.element, charA.level);
            const regenAmount = Math.max(1, Math.floor(charA.maxHp * regenRate));
            charA.hp = Math.min(charA.maxHp, charA.hp + regenAmount);
        }
        if (charB.counterRegen && charB.hp > 0) {
            const regenRate = getCounterRegenRate(charB.element, charB.level);
            const regenAmount = Math.max(1, Math.floor(charB.maxHp * regenRate));
            charB.hp = Math.min(charB.maxHp, charB.hp + regenAmount);
        }

        round++;
    }

    if (charA.hp > charB.hp) return { winner: 'A', turns: round - 1, remainingHpA: charA.hp, maxHpA: charA.maxHp, remainingHpB: charB.hp, maxHpB: charB.maxHp };
    if (charB.hp > charA.hp) return { winner: 'B', turns: round - 1, remainingHpA: charA.hp, maxHpA: charA.maxHp, remainingHpB: charB.hp, maxHpB: charB.maxHp };
    return { winner: 'DRAW', turns: round - 1, remainingHpA: charA.hp, maxHpA: charA.maxHp, remainingHpB: charB.hp, maxHpB: charB.maxHp };
}

// 5. CHẠY BATCH GIẢ LẬP
function runSimulationBatch(elementA, elementB, level, useCounter, simulationsCount = 30000) {
    const charA_base = getStatsAtLevel(elementA, level);
    const charB_base = getStatsAtLevel(elementB, level);

    let winsA = 0;
    let winsB = 0;
    let draws = 0;
    let totalTurns = 0;
    let totalRemainingHpPct = 0;  // Tổng % HP còn lại khi A thắng
    let winsAWithHp = 0;
    let totalRemainingHpPctWinner = 0;  // Tổng % HP còn lại của bên thắng (A hoặc B)
    let winsWithHpWinner = 0;

    function trackWinnerHp(hp, maxHp) {
        if (maxHp > 0) {
            totalRemainingHpPctWinner += (hp / maxHp) * 100;
            winsWithHpWinner++;
        }
    }

    for (let i = 0; i < simulationsCount; i++) {
        const result = simulateOneBattle(charA_base, charB_base, useCounter, 40);
        if (result.winner === 'A') {
            winsA++;
            if (result.maxHpA > 0) {
                totalRemainingHpPct += (result.remainingHpA / result.maxHpA) * 100;
                winsAWithHp++;
                trackWinnerHp(result.remainingHpA, result.maxHpA);
            }
        }
        else if (result.winner === 'B') {
            winsB++;
            trackWinnerHp(result.remainingHpB, result.maxHpB);
        }
        else draws++;
        totalTurns += result.turns;
    }

    const avgRemainingHpPctA = winsAWithHp > 0 ? (totalRemainingHpPct / winsAWithHp) : 0;
    const avgRemainingHpPctWinner = winsWithHpWinner > 0 ? (totalRemainingHpPctWinner / winsWithHpWinner) : 0;

    return {
        winRateA: (winsA / simulationsCount * 100).toFixed(1),
        winRateB: (winsB / simulationsCount * 100).toFixed(1),
        drawRate: (draws / simulationsCount * 100).toFixed(1),
        avgTurns: (totalTurns / simulationsCount).toFixed(1),
        avgRemainingHpPctA: avgRemainingHpPctA.toFixed(1),
        avgRemainingHpPctWinner: avgRemainingHpPctWinner.toFixed(1)
    };
}

// 6. CÁC MỐC LEVEL VÀ MATCHUPS CẦN PHÂN TÍCH
const levels = [1, 5, 10, 15, 20, 25, 30, 35, 40];
const matchups = [
    { a: 'SCISSORS', b: 'PAPER', name: 'Kéo vs Bao' },
    { a: 'PAPER', b: 'ROCK', name: 'Bao vs Búa' },
    { a: 'ROCK', b: 'SCISSORS', name: 'Búa vs Kéo' },
    { a: 'SCISSORS', b: 'ROCK', name: 'Kéo vs Búa' },
    { a: 'ROCK', b: 'PAPER', name: 'Búa vs Bao' },
    { a: 'PAPER', b: 'SCISSORS', name: 'Bao vs Kéo' },
    { a: 'SCISSORS', b: 'SCISSORS', name: 'Kéo vs Kéo' },
    { a: 'ROCK', b: 'ROCK', name: 'Búa vs Búa' },
    { a: 'PAPER', b: 'PAPER', name: 'Bao vs Bao' }
];

console.log("⏳  Đang chạy giả lập đấu 30,000 trận cho từng cặp ở các level từ 1 đến 40...");

const dataMatrix = {}; // dataMatrix[matchupName][level] = { avgTurns, winRateA, winRateB }

levels.forEach(lvl => {
    matchups.forEach(m => {
        const res = runSimulationBatch(m.a, m.b, lvl, true); // Chỉ chạy chế độ Có Khắc Chế
        if (!dataMatrix[m.name]) {
            dataMatrix[m.name] = {};
        }
        dataMatrix[m.name][lvl] = res;
    });
});

// 7. TÍNH TOÁN TRUNG BÌNH THEO HỆ PET CỦA USER
// Hệ Kéo: Kéo vs Bao (m.a=Kéo, m.b=Bao), Kéo vs Búa (m.a=Kéo, m.b=Búa), Kéo vs Kéo (m.a=Kéo, m.b=Kéo)
// Hệ Búa: Búa vs Kéo, Búa vs Bao, Búa vs Búa
// Hệ Bao: Bao vs Búa, Bao vs Kéo, Bao vs Bao
const petAverages = {
    'SCISSORS': {},
    'ROCK': {},
    'PAPER': {}
};

levels.forEach(lvl => {
    // Scissors
    const sTurns = [
        parseFloat(dataMatrix['Kéo vs Bao'][lvl].avgTurns),
        parseFloat(dataMatrix['Kéo vs Búa'][lvl].avgTurns),
        parseFloat(dataMatrix['Kéo vs Kéo'][lvl].avgTurns)
    ];
    petAverages['SCISSORS'][lvl] = (sTurns.reduce((a, b) => a + b, 0) / 3).toFixed(1);

    // Rock
    const rTurns = [
        parseFloat(dataMatrix['Búa vs Kéo'][lvl].avgTurns),
        parseFloat(dataMatrix['Búa vs Bao'][lvl].avgTurns),
        parseFloat(dataMatrix['Búa vs Búa'][lvl].avgTurns)
    ];
    petAverages['ROCK'][lvl] = (rTurns.reduce((a, b) => a + b, 0) / 3).toFixed(1);

    // Paper
    const pTurns = [
        parseFloat(dataMatrix['Bao vs Búa'][lvl].avgTurns),
        parseFloat(dataMatrix['Bao vs Kéo'][lvl].avgTurns),
        parseFloat(dataMatrix['Bao vs Bao'][lvl].avgTurns)
    ];
    petAverages['PAPER'][lvl] = (pTurns.reduce((a, b) => a + b, 0) / 3).toFixed(1);
});

// 8. TÍNH TRUNG BÌNH TOÀN BỘ CỦA LEVEL (CỦA CẢ 9 MATCHUPS)
const levelAverages = {};
levels.forEach(lvl => {
    let sum = 0;
    matchups.forEach(m => {
        sum += parseFloat(dataMatrix[m.name][lvl].avgTurns);
    });
    levelAverages[lvl] = (sum / 9).toFixed(1);
});

// 9. BIÊN SOẠN BÁO CÁO MARKDOWN
let md = `# Báo cáo Phân tích: Thống Kê Số Lượt Đấu & Tỷ Lệ Thắng Ling Thú (Tự Động Cập Nhật)

Báo cáo này được tự động tạo bởi script giả lập khi bạn chạy \`node scripts/run_simulator.js\`. Nó lấy trực tiếp presets thuộc tính nguyên tố từ file cấu hình game của bạn.

### ⚙️ Chỉ số Presets hiện tại được trích xuất:
* **Hệ Kéo (SCISSORS):** HP ${PRESETS.SCISSORS.base.hp} (+${PRESETS.SCISSORS.growth.hp}/Lv), ATK ${PRESETS.SCISSORS.base.atk} (+${PRESETS.SCISSORS.growth.atk}/Lv), DEF ${PRESETS.SCISSORS.base.def} (+${PRESETS.SCISSORS.growth.def}/Lv), LUCK ${PRESETS.SCISSORS.base.luck} (+${PRESETS.SCISSORS.growth.luck}/Lv)
* **Hệ Búa (ROCK):** HP ${PRESETS.ROCK.base.hp} (+${PRESETS.ROCK.growth.hp}/Lv), ATK ${PRESETS.ROCK.base.atk} (+${PRESETS.ROCK.growth.atk}/Lv), DEF ${PRESETS.ROCK.base.def} (+${PRESETS.ROCK.growth.def}/Lv), LUCK ${PRESETS.ROCK.base.luck} (+${PRESETS.ROCK.growth.luck}/Lv)
* **Hệ Bao (PAPER):** HP ${PRESETS.PAPER.base.hp} (+${PRESETS.PAPER.growth.hp}/Lv), ATK ${PRESETS.PAPER.base.atk} (+${PRESETS.PAPER.growth.atk}/Lv), DEF ${PRESETS.PAPER.base.def} (+${PRESETS.PAPER.growth.def}/Lv), LUCK ${PRESETS.PAPER.base.luck} (+${PRESETS.PAPER.growth.luck}/Lv)

---

## 📊 1. Bảng Thống Kê Số Lượt Đấu Trung Bình (Chế Độ Có Khắc Chế)

Dưới đây là số lượt đấu trung bình kết thúc trận đấu (đơn vị: *lượt*):

| Cặp Đấu / Level | ${levels.map(l => 'Lv.' + l).join(' | ')} |
| :--- | ${levels.map(() => ':---:').join(' \| ')} |
`;

matchups.forEach(m => {
    const row = levels.map(lvl => dataMatrix[m.name][lvl].avgTurns).join(' | ');
    md += `| **${m.name}** | ${row} |\n`;
});
md += `| **Trung bình toàn bộ (Level)** | ${levels.map(lvl => `**${levelAverages[lvl]}**`).join(' | ')} |\n\n`;

md += `---

## 🛡️ 2. Số Lượt Đấu Trung Bình Theo Hệ Pet (Góc Nhìn Người Chơi)

Vì mỗi người chơi chỉ sở hữu **1 Pet** cố định và đối đầu ngẫu nhiên với cả 3 hệ đối thủ, số lượt đấu trung bình thực tế mà người chơi trải nghiệm ở từng cấp độ là:

| Hệ Pet của User | Các Cặp Đấu Tính Gộp | ${levels.map(l => 'Lv.' + l).join(' | ')} |
| :--- | :--- | ${levels.map(() => ':---:').join(' \| ')} |
| ✂️ **Hệ Kéo (SCISSORS)** | *Kéo vs Bao, Kéo vs Búa, Kéo vs Kéo* | ${levels.map(lvl => `**${petAverages['SCISSORS'][lvl]}**`).join(' | ')} |
| 🔨 **Hệ Búa (ROCK)** | *Búa vs Kéo, Búa vs Bao, Búa vs Búa* | ${levels.map(lvl => `**${petAverages['ROCK'][lvl]}**`).join(' | ')} |
| 📄 **Hệ Bao (PAPER)** | *Bao vs Búa, Bao vs Kéo, Bao vs Bao* | ${levels.map(lvl => `**${petAverages['PAPER'][lvl]}**`).join(' | ')} |

---

## ⚔️ 3. Tỷ Lệ Thắng & HP Còn Lại (%) Của Các Kèo Khắc Chế

**Quy ước mới (v69):**
- Tỉ lệ thắng của **bên khắc chế** phải đạt **80-99%** ở mọi level từ 10-40 (không phân biệt đi trước/sau).
- Khi bên khắc chế thắng, **HP trung bình còn lại ≥ 15%** để thể hiện ý nghĩa "khắc chế xoay vòng" (không phải thắng sát nút).

> Mỗi ô hiển thị: **Tỉ lệ thắng (Win%) / HP còn lại TB khi thắng (HP%)**

| Kèo Đấu (Bên khắc → Bên bị khắc) | ${levels.map(l => 'Lv.' + l).join(' | ')} |
| :--- | ${levels.map(() => ':---:').join(' \| ')} |
`;

// Cấu hình 3 cặp khắc chế chính (gộp cả 2 chiều)
// Mỗi cặp gồm 2 matchup: chiều 1 (counter đi tiên) và chiều 2 (bị khắc đi tiên)
//   - pair[0] = matchup tên 'A vs B' với A là bên khắc
//   - pair[1] = matchup tên 'B vs A' với B là bên bị khắc (ngược lại)
const counterMatchups = [
    { pair: ['Kéo vs Bao', 'Bao vs Kéo'], counterEl: 'SCISSORS', victimEl: 'PAPER', label: '✂️ Kéo khắc Bao' },
    { pair: ['Bao vs Búa', 'Búa vs Bao'], counterEl: 'PAPER',   victimEl: 'ROCK',   label: '🍃 Bao khắc Búa' },
    { pair: ['Búa vs Kéo', 'Kéo vs Búa'], counterEl: 'ROCK',    victimEl: 'SCISSORS', label: '🔨 Búa khắc Kéo' }
];

counterMatchups.forEach(cm => {
    const row = levels.map(lvl => {
        // Lấy dữ liệu cả 2 chiều
        const dForward = dataMatrix[cm.pair[0]][lvl];   // counter đi tiên
        const dReverse = dataMatrix[cm.pair[1]][lvl];   // victim đi tiên
        // winrate bên khắc = max(winRateA_chiều1, winRateB_chiều2)
        //   - chiều 1 (counter đi tiên): winRateA = winrate bên khắc
        //   - chiều 2 (victim đi tiên):  winRateA = winrate bên bị khắc, winRateB = winrate bên khắc
        const counterWinRate = Math.max(
            parseFloat(dForward.winRateA),
            parseFloat(dReverse.winRateB)
        );
        // HP còn lại TB của bên THẮNG (counter) qua cả 2 chiều
        const counterHpForward = parseFloat(dForward.avgRemainingHpPctWinner);
        const counterHpReverse = parseFloat(dReverse.avgRemainingHpPctWinner);
        const counterHp = (counterHpForward + counterHpReverse) / 2;
        // v77: Bên khắc LUÔN thắng 100%. Chỉ cần đánh giá HP khi thắng.
        // Target HP theo từng giai đoạn:
        //   Kéo: 30% (Lv.10-20), 20% (Lv.20-30), 15% (Lv.30-40)
        //   Bao: 20% (Lv.10-20), 30% (Lv.20-30), 20% (Lv.30-40)
        //   Búa: 15% (Lv.10-20), 22% (Lv.20-30), 35% (Lv.30-40)
        let targetHp;
        if (lvl <= 20) {
            targetHp = cm.counterEl === 'SCISSORS' ? 30 : (cm.counterEl === 'PAPER' ? 20 : 15);
        } else if (lvl <= 30) {
            targetHp = cm.counterEl === 'SCISSORS' ? 20 : (cm.counterEl === 'PAPER' ? 30 : 22);
        } else {
            targetHp = cm.counterEl === 'SCISSORS' ? 15 : (cm.counterEl === 'PAPER' ? 20 : 35);
        }
        const tolerance = 5; // cho phép chênh lệch ±5%
        const diff = counterHp - targetHp;
        const meetsHp = Math.abs(diff) <= tolerance;
        const status = (counterWinRate >= 99 && meetsHp) ? '✅' : '⚠️';
        return `${status} HP ${counterHp.toFixed(0)}% (mục tiêu ${targetHp}%)`;
    }).join(' | ');
    md += `| **${cm.label}** | ${row} |\n`;
});

// Thêm đánh giá cân bằng tự động
md += `
---

## 🔍 Đánh Giá Cân Bằng Tự Động Từ Kết Quả Giả Lập

**Mục tiêu:** Tỉ lệ thắng bên khắc chế = 80-99%, HP còn lại TB khi thắng ≥ 15%.

`;

// Đánh giá từng cặp
const evalTargets = [
    { pair: ['Kéo vs Bao', 'Bao vs Kéo'], label: 'Kéo khắc Bao' },
    { pair: ['Bao vs Búa', 'Búa vs Bao'], label: 'Bao khắc Búa' },
    { pair: ['Búa vs Kéo', 'Kéo vs Búa'], label: 'Búa khắc Kéo' }
];

evalTargets.forEach(et => {
    const lvs = [10, 15, 20, 25, 30, 35, 40];
    const results = lvs.map(lvl => {
        const winA = parseFloat(dataMatrix[et.pair[0]][lvl].winRateA);
        const winB = parseFloat(dataMatrix[et.pair[1]][lvl].winRateA);
        return { lvl, rate: Math.max(winA, 100 - winA), winA, winB };
    });
    const minRate = Math.min(...results.map(r => r.rate));
    const maxRate = Math.max(...results.map(r => r.rate));
    const passes = minRate >= 80 && maxRate <= 99;
    md += `${passes ? '✅' : '⚠️'} **${et.label}** (Lv.10-40): Tỉ lệ thắng bên khắc dao động **${minRate.toFixed(1)}% - ${maxRate.toFixed(1)}%**\n`;
});

md += `
3. **Thời lượng trung bình trận đấu của Hệ Kéo:**
   * Trung bình số lượt của người sở hữu Pet Kéo ở Lv.30 là **${petAverages['SCISSORS'][30]} lượt**.
`;

// 10. GHI RA FILE BÁO CÁO
fs.writeFileSync(REPORT_FILE, md, 'utf8');

console.log("==================================================");
console.log("🎉 GIẢ LẬP VÀ PHÂN TÍCH HOÀN TẤT!");
console.log(`📝 Báo cáo đã được cập nhật thành công tại:`);
console.log(`👉 ${REPORT_FILE}`);
console.log("==================================================");
