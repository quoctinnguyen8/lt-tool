# Ling Thú Tools - Bộ Công Cụ Hỗ Trợ Phát Triển Game Retro

Chào mừng bạn đến với **Ling Thú Tools**, cổng công cụ chạy trực tiếp trên trình duyệt được thiết kế dành riêng cho các nhà phát triển game (đặc biệt là thể loại pixel art). Bộ công cụ sở hữu phong cách thiết kế **Retro Arcade 8-bit** độc đáo kết hợp hiệu ứng quét dòng màn hình CRT hoài cổ.

Trang web: [https://tinnq.com/lt-tool](https://tinnq.com/lt-tool)

---

## 📂 Cấu Trúc Thư Mục Dự Án

Dự án được cấu trúc theo dạng module độc lập (flat modular style). Mỗi công cụ sau này sẽ sở hữu các tệp HTML, CSS, và JS riêng biệt để dễ dàng quản lý và mở rộng:

```text
E:/LingThu/lt-tool/
├── README.md               # Tài liệu hướng dẫn dự án
├── index.html              # Trang chủ / Bảng điều khiển chọn công cụ
├── cover-color.html        # [Tool 1] Công cụ Đổi màu Sprite / Icon
├── css/
│   ├── portal.css          # CSS dành riêng cho trang chủ index.html
│   └── cover-color.css     # CSS dành riêng cho công cụ cover-color.html
└── js/
    └── cover-color.js      # JS xử lý logic cho công cụ cover-color.html
```

---

## 🎮 Công Cụ Hiện Có: Sprite Recolorer (Đổi Màu Sprite / Icon)

Công cụ cho phép bạn nhanh chóng tạo ra các biến thể màu sắc khác nhau của một vật phẩm (vũ khí, trang bị, bình thuốc...) chỉ trong vài giây.

### Các Tính Năng Nổi Bật:
1. **Chia đôi màn hình (Side-by-Side Viewport)**:
   - Bên trái hiển thị ảnh gốc, hỗ trợ công cụ hút màu (**Eyedropper 🧪**) trực tiếp trên ảnh.
   - Bên phải hiển thị kết quả thay đổi thời gian thực.
   - Hỗ trợ **Đồng bộ Zoom & Pan**: cả hai khung ảnh tự động thu phóng và di chuyển song song.
2. **Cơ chế Đổi Màu Toàn Bộ (Global Recolor)**:
   - **Nhuộm màu (Tint)**: Phủ đều màu mục tiêu, hỗ trợ checkbox **"Phủ lên màu trắng"** hữu ích khi xử lý ảnh mặt nạ xám (grayscale templates).
   - **Xoay màu (Hue Shift)**: Dịch chuyển dải màu gốc trên bánh xe HSL từ `-180°` đến `180°`, **bảo toàn hoàn hảo độ tương phản màu sắc gốc** đối với vật phẩm đa sắc (ví dụ: ngọc đỏ gắn trên lưỡi thép xanh).
3. **Cơ chế Đổi Từng Màu (Rule-based Recolor)**:
   - Thiết lập nhiều quy tắc đổi màu đồng thời với thông số độ lệch màu (**Tolerance**) và chế độ bảo toàn bóng (**Shading Mode**).
   - Tích hợp **Lưới gợi ý Màu khớp chủ đạo** tự động quét ảnh và cho phép click chọn nhanh. Lưới sẽ **tự động ẩn các màu đã được chọn** giúp bạn không bị trùng lặp.
4. **Lưu/Tải Mẫu Màu (Presets)**:
   - Lưu trữ các quy tắc đổi màu hoặc cấu hình Hue Shift hiện tại thành preset thông qua `localStorage`.
5. **Xử lý hàng loạt (Batch Processing)**:
   - Chọn và tải lên hàng loạt nhiều tệp hình ảnh.
   - Xem trước và đổi màu đồng loạt theo cấu hình.
   - Tải về hàng loạt dưới dạng file nén hoặc tải rời có độ trễ chống chặn pop-up.
