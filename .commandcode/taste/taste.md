# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# workflow
- Giao tiếp bằng tiếng Việt trong toàn bộ dự án, bao gồm comments, tên biến tiếng Việt (Kéo/Búa/Bao), và báo cáo. Confidence: 0.85
- Report kết quả cuối cùng bằng tiếng Việt. Confidence: 0.85
- Ưu tiên mục tiêu khi tuning: WR counter ≥95% > HP remaining 10-35% > số lượt đánh. Confidence: 0.85

# combat-simulator
See [combat-simulator/taste.md](combat-simulator/taste.md)
# coding-style
- Luôn dùng `'use strict';` ở đầu mọi file JavaScript. Confidence: 0.90
- Dùng comment block `// ====` để phân chia section trong code. Confidence: 0.75

# workflow
- Trước khi viết phiên bản mới, đọc code phiên bản trước làm tham khảo. Confidence: 0.85
- Phát triển theo chu kỳ: viết code → chạy thử → phát hiện bug → sửa → chạy lại (lặp đến khi đạt). Confidence: 0.85
- Dùng `todo_write` để theo dõi tiến độ các bước trong dự án nhiều bước. Confidence: 0.75
- Khi auto-tuning: dùng multi-round với best-score tracking để tránh local minima; mỗi round tune COUNTER trước rồi MIRROR sau. Confidence: 0.70

# tooling
- Ưu tiên công cụ dạng HTML (có thể mở trực tiếp trên browser) thay vì CLI script cho các công cụ kiểm tra/mô phỏng. Confidence: 0.80
- Thích báo cáo HTML tự chứa (self-contained), nhúng toàn bộ dữ liệu trực tiếp trong file để xem offline trên browser, không phụ thuộc server hay external file. Confidence: 0.75
