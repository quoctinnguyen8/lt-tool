# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# workflow
- Giao tiếp bằng tiếng Việt trong toàn bộ dự án, bao gồm comments, tên biến tiếng Việt (Kéo/Búa/Bao), và báo cáo. Confidence: 0.85
- Report kết quả cuối cùng bằng tiếng Việt. Confidence: 0.85
- Ưu tiên mục tiêu khi tuning: WR counter ≥95% > HP remaining 10-35% > số lượt đánh. Confidence: 0.85

# combat-simulator
- Hệ thống điểm cộng tự do: 1 điểm/level, HP×10, ATK/DEF/LUCK×1, cộng thêm vào growth system có sẵn (không thay thế). Confidence: 0.85
- Build types: balanced (25% mỗi stat), skewed_HP/ATK/DEF/LUCK (80% vào 1 stat, ~6.67% các stat còn lại). Confidence: 0.85
- Vòng khắc chế: Búa > Kéo > Bao > Búa (truyền thống). Confidence: 0.85
- Cơ chế "We are family" (mirror) giữ nguyên: Kéo giảm dmg, Búa giảm def, Bao giảm toàn bộ chỉ số. Confidence: 0.85
- Tuning COUNTER/MIRROR per-milestone (9 mốc: 1,5,10,15,20,25,30,35,40), nội suy tuyến tính cho 40 level. Confidence: 0.70

# tooling
- Ưu tiên công cụ dạng HTML (có thể mở trực tiếp trên browser) thay vì CLI script cho các công cụ kiểm tra/mô phỏng. Confidence: 0.65
