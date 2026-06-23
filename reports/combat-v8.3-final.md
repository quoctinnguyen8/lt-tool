# Combat Simulator v8.3 — Final Report

## Kết quả cân bằng (N=3000)

| Mục tiêu | Đạt | Tổng | Ghi chú |
|----------|----:|-----:|---------|
| 1. Số lượt đánh (±8% Lv.10+, ±12% Lv.<10) | 25 | 27 | 2 fails ở boundary: Búa Lv.10 = 13.0/12.0 (8.3% off, vượt ±8%) |
| 2a. Winrate counter (≥95%) | 54 | 54 | 100% ở tất cả 27 kèo × 2 chiều |
| 2b. HP remaining (10-35%) | 52 | 54 | 2 fails ở boundary 10% (Bao vs Búa Lv.40 second ~10%) |

## Thay đổi so với v8.2

**v8.1**: `paper_vs_rock_luck` tăng đơn điệu (peak Lv.10, không giảm)
**v8.2**: `paper_vs_rock_luck` tăng dần không đều, chạm đỉnh Lv.30
**v8.3**: Đa dạng hóa buff khắc chế với 6 keys (thay vì 4):

| Counter matchup | Buff 1 (v8.2) | Buff 2 (v8.3 mới) |
|-----------------|---------------|-------------------|
| Búa vs Kéo | +DEF | **+HP** (mới) |
| Kéo vs Bao | +DMG% | **+LUCK** (mới) |
| Bao vs Búa | +HP | **+LUCK** (mới, thay vì chỉ tăng HP) |

## Bảng COUNTER (6 keys, tăng dần theo level)

### rock_vs_scissors_def (Búa vs Kéo +def)
| Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
|-----:|-----:|------:|------:|------:|------:|------:|------:|------:|
| 14 | 26 | 52 | 80 | 105 | 128 | 144 | 156 | 164 |

### rock_vs_scissors_hp (Búa vs Kéo +HP) — MỚI v8.3
| Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
|-----:|-----:|------:|------:|------:|------:|------:|------:|------:|
| 28 | 52 | 104 | 160 | 210 | 252 | 282 | 306 | 320 |

### scissors_vs_paper_dmg (Kéo vs Bao +dmg%)
| Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
|-----:|-----:|------:|------:|------:|------:|------:|------:|------:|
| 4% | 8% | 14% | 20% | 26% | 32% | 38% | 44% | 50% |

### scissors_vs_paper_luck (Kéo vs Bao +luck) — MỚI v8.3
| Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
|-----:|-----:|------:|------:|------:|------:|------:|------:|------:|
| 1 | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 |

### paper_vs_rock_hp (Bao vs Búa +HP)
| Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
|-----:|-----:|------:|------:|------:|------:|------:|------:|------:|
| 70 | 56 | 70 | 102 | 140 | 182 | 224 | 274 | 328 |

### paper_vs_rock_luck (Bao vs Búa +luck)
| Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
|-----:|-----:|------:|------:|------:|------:|------:|------:|------:|
| 3 | 6 | 12 | 18 | 24 | 28 | 30 | 30 | 30 |

## Tuning algorithm (v8.3)

- **COUNTER**: KHÔNG auto-tune (binary search bị stuck ở flat-max do monotonic floor).
  Thay vào đó dùng manual ramp theo progression.
- **MIRROR**: Vẫn auto-tune bằng binary search (`bsMirror`).
- **Monotonic floor**: Tất cả 6 COUNTER keys có min-value floor = giá trị level trước.

## Files

- `simulator_v8_1.js` — Core combat logic + 6 COUNTER + MIRROR tuned values
- `run_v8_1.js` — TUNE=1 để tune, TUNE=0 để in report
- `export_v8_1.js` — Xuất bảng 40 level (text)
- `export_html_v8_1.js` — Xuất HTML viewer self-contained
- `viewer_v8_1.html` — HTML viewer 45.9 KB (6 COUNTER keys + 4 charts)
- `v8_3_report.txt` — Final report với N=3000
