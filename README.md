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
├── resize-frame.html       # [Tool 2] Công cụ Thay đổi Khung hình Sprite
├── css/
│   ├── portal.css          # CSS dành riêng cho trang chủ index.html
│   ├── cover-color.css     # CSS dành riêng cho công cụ cover-color.html
│   └── resize-frame.css    # CSS dành riêng cho công cụ resize-frame.html
└── js/
    ├── cover-color.js      # JS xử lý logic cho công cụ cover-color.html
    └── resize-frame.js     # JS xử lý logic cho công cụ resize-frame.html
```

---

## 🎮 Các Công Cụ Hiện Có

### 1. Sprite Recolorer (Đổi Màu Sprite / Icon)
Công cụ cho phép bạn nhanh chóng tạo ra các biến thể màu sắc khác nhau của một vật phẩm (vũ khí, trang bị, bình thuốc...) chỉ trong vài giây.

* **Chia đôi màn hình (Side-by-Side Viewport)**: Hỗ trợ hút màu trực quan (**Eyedropper 🧪**), đồng bộ Zoom & Pan giữa hai viewport.
* **Cơ chế Đổi Màu Toàn Bộ**: Nhuộm đơn sắc (có tính năng phủ trắng) hoặc **Xoay màu HSL (Hue Shift)** để giữ nguyên độ tương phản của vật phẩm đa sắc.
* **Cơ chế Đổi Từng Màu**: Thiết lập quy tắc đổi màu theo vùng độc lập kèm chỉ số sai lệch (Tolerance) và chế độ bảo toàn bóng (Shading).
* **Lọc màu khớp thông minh**: Lưới gợi ý màu khớp tự động ẩn các màu đã được đưa vào quy tắc để tránh trùng lặp.
* **Presets & Batch Processing**: Lưu preset vào localStorage, tải và xuất ảnh hàng loạt chống trình duyệt chặn pop-up.

### 2. Sprite Canvas Extender (Thay đổi Khung hình Sprite)
Công cụ chuyên dụng giúp mở rộng ranh giới khung hình (canvas padding) cho từng frame riêng lẻ trong Sprite Sheet, phục vụ việc vẽ thêm các hiệu ứng mà không làm lệch căn lề của sprite ban đầu.

* **Phân tách frame & Tự phát hiện**: Đọc ảnh và tự động nhận diện kích thước frame dựa trên chiều cao (ví dụ: ảnh 64x16 sẽ được cắt thành 4 frame 16x16).
* **Lưới Neo 3x3 trực quan**: Cho phép chọn neo sprite gốc tại 9 vị trí (Ví dụ: neo **Dưới-Giữa** cho nhân vật đứng, **Giữa-Giữa** cho vật phẩm bay, v.v.).
* **Hệ số co giãn nhanh**: Chọn nhanh các hệ số mở rộng `1.5x`, `2x`, `3x`, `4x` hoặc tự nhập kích thước đích tuỳ chọn.
* **Trình xem thử hoạt ảnh loop (Animation Preview)**: Xem thử chuyển động lập tức với thanh trượt điều chỉnh tốc độ (FPS), giúp kiểm tra độ đồng đều của các frame sau co giãn.
* **Lưới hướng dẫn (Grid Helper)**: Hiển thị các vạch nét đứt ngăn cách frame tĩnh để dễ canh lề.
* **Presets & Batch Processing**: Lưu thiết lập và co giãn đồng loạt hàng trăm sprite sheet chỉ với một click.
