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
    return {
        element: element,
        name: preset.name,
        level: level,
        maxHp: Math.floor(preset.base.hp + (level - 1) * preset.growth.hp),
        hp: Math.floor(preset.base.hp + (level - 1) * preset.growth.hp),
        atk: Math.floor(preset.base.atk + (level - 1) * preset.growth.atk),
        def: Math.floor(preset.base.def + (level - 1) * preset.growth.def),
        luck: Math.floor(preset.base.luck + (level - 1) * preset.growth.luck),
        shieldActive: false,
        healNext: false,
        damageMultiplier: 1.0
    };
}

// Cơ chế khắc chế: BẢNG GIÁ TRỊ CỤ THỂ THEO LEVEL (piecewise) - đồng bộ với combat_simulator.js
const COUNTER_CONFIG = {
    // scissors_vs_paper: dmgMult bonus
    // Mục tiêu: Kéo vs Bao 70-90%
    scissors_vs_paper: {
        1:  0.00,
        5:  0.00,
        10: 0.14,
        15: 0.15,
        20: 0.15,
        25: 0.15,
        30: 0.16,
        35: 0.17,
        40: 0.18
    },
    // rock_vs_scissors: DEF bonus (cộng dồn)
    rock_vs_scissors: {
        1:  0.0,
        5:  0.0,
        10: 0.0,
        15: 0.0,
        20: 0.0,
        25: 0.0,
        30: 0.0,
        35: 0.0,
        40: 0.0
    },
    paper_vs_rock: {
        hp: {
            1:  0,
            5:  0,
            10: 8,
            15: 12,
            20: 14,
            25: 16,
            30: 18,
            35: 20,
            40: 22
        },
        luck: {
            1:  0.0,
            5:  0.0,
            10: 1.0,
            15: 1.5,
            20: 1.5,
            25: 2.0,
            30: 2.0,
            35: 2.5,
            40: 2.5
        }
    }
};

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

    // Áp dụng khắc chế đầu trận
    if (useCounter) {
        // Scissors vs Paper (Kéo gặp bao): kéo tăng sát thương theo 3 giai đoạn
        if (charA.element === 'SCISSORS' && charB.element === 'PAPER') {
            charA.damageMultiplier = 1 + counterBonus(COUNTER_CONFIG.scissors_vs_paper, charA.level);
        }
        if (charB.element === 'SCISSORS' && charA.element === 'PAPER') {
            charB.damageMultiplier = 1 + counterBonus(COUNTER_CONFIG.scissors_vs_paper, charB.level);
        }

        // Paper vs Rock (Bao gặp búa): bao tăng HP và LUCK (2 giá trị độc lập)
        if (charA.element === 'PAPER' && charB.element === 'ROCK') {
            const hpGain = counterBonus(COUNTER_CONFIG.paper_vs_rock.hp, charA.level);
            const luckGain = counterBonus(COUNTER_CONFIG.paper_vs_rock.luck, charA.level);
            charA.maxHp += hpGain;
            charA.hp += hpGain;
            charA.luck += luckGain;
        }
        if (charB.element === 'PAPER' && charA.element === 'ROCK') {
            const hpGain = counterBonus(COUNTER_CONFIG.paper_vs_rock.hp, charB.level);
            const luckGain = counterBonus(COUNTER_CONFIG.paper_vs_rock.luck, charB.level);
            charB.maxHp += hpGain;
            charB.hp += hpGain;
            charB.luck += luckGain;
        }

        // Rock vs Scissors (Búa gặp kéo): búa tăng phòng ngự theo 3 giai đoạn
        if (charA.element === 'ROCK' && charB.element === 'SCISSORS') {
            const d = counterBonus(COUNTER_CONFIG.rock_vs_scissors, charA.level);
            charA.def = Math.floor(charA.def + d);
        }
        if (charB.element === 'ROCK' && charA.element === 'SCISSORS') {
            const d = counterBonus(COUNTER_CONFIG.rock_vs_scissors, charB.level);
            charB.def = Math.floor(charB.def + d);
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

        if (charB.hp <= 0) return { winner: 'A', turns: round };

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

        if (charA.hp <= 0) return { winner: 'B', turns: round };

        round++;
    }

    if (charA.hp > charB.hp) return { winner: 'A', turns: round - 1 };
    if (charB.hp > charA.hp) return { winner: 'B', turns: round - 1 };
    return { winner: 'DRAW', turns: round - 1 };
}

// 5. CHẠY BATCH GIẢ LẬP
function runSimulationBatch(elementA, elementB, level, useCounter, simulationsCount = 30000) {
    const charA_base = getStatsAtLevel(elementA, level);
    const charB_base = getStatsAtLevel(elementB, level);

    let winsA = 0;
    let winsB = 0;
    let draws = 0;
    let totalTurns = 0;

    for (let i = 0; i < simulationsCount; i++) {
        const result = simulateOneBattle(charA_base, charB_base, useCounter, 40);
        if (result.winner === 'A') winsA++;
        else if (result.winner === 'B') winsB++;
        else draws++;
        totalTurns += result.turns;
    }

    return {
        winRateA: (winsA / simulationsCount * 100).toFixed(1),
        winRateB: (winsB / simulationsCount * 100).toFixed(1),
        drawRate: (draws / simulationsCount * 100).toFixed(1),
        avgTurns: (totalTurns / simulationsCount).toFixed(1)
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

## ⚔️ 3. Tỷ Lệ Thắng (%) Giữa Các Kèo Khắc Chế (Pet A đi tiên vs Quái B)

Dưới đây là tỷ lệ thắng của bên đi tiên (Đấu sĩ A) trong cả hai trường hợp: Khắc chế đi tiên và Bị khắc chế đi tiên:

| Kèo Đấu (A vs B) | ${levels.map(l => 'Lv.' + l).join(' | ')} |
| :--- | ${levels.map(() => ':---:').join(' \| ')} |
`;

const counterMatchups = [
    // Khắc chế đi tiên
    { name: 'Kéo vs Bao', label: '✂️ Kéo vs Bao (Kéo khắc Bao - Kéo đi tiên)' },
    { name: 'Bao vs Búa', label: '🍃 Bao vs Búa (Bao khắc Búa - Bao đi tiên)' },
    { name: 'Búa vs Kéo', label: '🔨 Búa vs Kéo (Búa khắc Kéo - Búa đi tiên)' },
    // Bị khắc chế đi tiên
    { name: 'Bao vs Kéo', label: '🍃 Bao vs Kéo (Bao bị Kéo khắc - Bao đi tiên)' },
    { name: 'Búa vs Bao', label: '🔨 Búa vs Bao (Búa bị Bao khắc - Búa đi tiên)' },
    { name: 'Kéo vs Búa', label: '✂️ Kéo vs Búa (Kéo bị Búa khắc - Kéo đi tiên)' }
];

counterMatchups.forEach(cm => {
    const row = levels.map(lvl => {
        const rate = parseFloat(dataMatrix[cm.name][lvl].winRateA);
        const isCounterFirst = ['Kéo vs Bao', 'Bao vs Búa', 'Búa vs Kéo'].includes(cm.name);
        if (isCounterFirst) {
            // Khắc hệ đi tiên: lí tưởng là rate phải cao (> 50%). Nếu < 50% thì đánh dấu nghiêng để cảnh báo
            return rate < 50 ? `*${rate}% (Thua ngược)*` : `**${rate}%**`;
        } else {
            // Bị khắc hệ đi tiên: lí tưởng là rate phải thấp (< 50%). Nếu > 50% thì đánh dấu nghiêng cảnh báo lật kèo
            return rate > 50 ? `*${rate}% (Lật kèo)*` : `**${rate}%**`;
        }
    }).join(' | ');
    md += `| **${cm.label}** | ${row} |\n`;
});

// Thêm đánh giá cân bằng tự động
md += `
---

## 🔍 Đánh Giá Cân Bằng Tự Động Từ Kết Quả Giả Lập

1. **Độ Khắc Chế Của Bao vs Búa:**
   * Tỷ lệ thắng của Bao (hệ khắc Búa) ở Lv.40 hiện tại là **${dataMatrix['Bao vs Búa'][40].winRateA}%**.
   * ${parseFloat(dataMatrix['Bao vs Búa'][40].winRateA) < 50 ? '⚠️ **Cảnh báo:** Búa đã lật kèo Bao ở level cao! Lượng HP/DEF của Búa quá trâu khiến Bao (hệ khắc) vẫn bị thua ngược.' : '✅ Bao vẫn giữ được ưu thế thắng trước Búa ở level cao, vòng tròn khắc chế hoạt động tốt.'}

2. **Độ Khắc Chế Của Kéo vs Bao:**
   * Tỷ lệ thắng của Kéo (hệ khắc Bao) ở Lv.40 hiện tại là **${dataMatrix['Kéo vs Bao'][40].winRateA}%**.
   * ${parseFloat(dataMatrix['Kéo vs Bao'][40].winRateA) < 50 ? '⚠️ **Cảnh báo:** Bao đã lật kèo Kéo ở level cao!' : '✅ Kéo giữ vững ưu thế khắc chế trước Bao.'}

3. **Thời lượng trung bình trận đấu của Hệ Kéo:**
   * Trung bình số lượt của người sở hữu Pet Kéo ở Lv.30 là **${petAverages['SCISSORS'][30]} lượt**.
   * ${parseFloat(petAverages['SCISSORS'][30]) < 12 ? '⚠️ **Đánh giá:** Thời lượng chiến đấu của hệ Kéo hơi ngắn (chỉ đạt ' + petAverages['SCISSORS'][30] + ' lượt so với mục tiêu tối thiểu 12 lượt ở Lv.30). Có thể cân nhắc tăng nhẹ HP growth hoặc giảm bớt ATK growth của Kéo.' : '✅ Đạt mục tiêu thời lượng trận đấu tối thiểu ở cấp cao.'}
`;

// 10. GHI RA FILE BÁO CÁO
fs.writeFileSync(REPORT_FILE, md, 'utf8');

console.log("==================================================");
console.log("🎉 GIẢ LẬP VÀ PHÂN TÍCH HOÀN TẤT!");
console.log(`📝 Báo cáo đã được cập nhật thành công tại:`);
console.log(`👉 ${REPORT_FILE}`);
console.log("==================================================");
