# Báo cáo Phân tích: Thống Kê Số Lượt Đấu & Tỷ Lệ Thắng Ling Thú (Tự Động Cập Nhật)

Báo cáo này được tự động tạo bởi script giả lập khi bạn chạy `node scripts/run_simulator.js`. Nó lấy trực tiếp presets thuộc tính nguyên tố từ file cấu hình game của bạn.

### ⚙️ Chỉ số Presets hiện tại được trích xuất:
* **Hệ Kéo (SCISSORS):** HP 110 (+16/Lv), ATK 17 (+2.5/Lv), DEF 8 (+1/Lv), LUCK 5 (+2/Lv)
* **Hệ Búa (ROCK):** HP 140 (+20/Lv), ATK 12 (+1.5/Lv), DEF 17 (+3/Lv), LUCK 5 (+1/Lv)
* **Hệ Bao (PAPER):** HP 120 (+18/Lv), ATK 15 (+2/Lv), DEF 10 (+2/Lv), LUCK 5 (+3/Lv)

---

## 📊 1. Bảng Thống Kê Số Lượt Đấu Trung Bình (Chế Độ Có Khắc Chế)

Dưới đây là số lượt đấu trung bình kết thúc trận đấu (đơn vị: *lượt*):

| Cặp Đấu / Level | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Kéo vs Bao** | 8.1 | 8.8 | 9.5 | 10.5 | 10.5 | 10.9 | 11.8 | 12.0 | 12.9 |
| **Bao vs Búa** | 9.4 | 11.6 | 14.1 | 16.5 | 19.0 | 21.5 | 24.2 | 27.0 | 30.0 |
| **Búa vs Kéo** | 10.9 | 11.8 | 12.7 | 13.9 | 14.0 | 15.0 | 16.0 | 16.0 | 17.0 |
| **Kéo vs Búa** | 10.9 | 11.8 | 12.7 | 13.8 | 14.0 | 15.0 | 16.0 | 16.0 | 17.0 |
| **Búa vs Bao** | 9.4 | 11.6 | 14.1 | 16.6 | 19.1 | 21.6 | 24.3 | 27.1 | 30.0 |
| **Bao vs Kéo** | 8.1 | 8.9 | 9.6 | 10.6 | 10.6 | 10.9 | 11.9 | 12.0 | 12.9 |
| **Kéo vs Kéo** | 7.6 | 7.7 | 7.6 | 7.8 | 8.1 | 8.0 | 8.3 | 8.7 | 9.0 |
| **Búa vs Búa** | 16.2 | 17.4 | 20.8 | 23.6 | 26.8 | 29.4 | 33.0 | 38.0 | 39.9 |
| **Bao vs Bao** | 10.0 | 11.3 | 12.6 | 14.0 | 15.4 | 16.8 | 18.6 | 20.3 | 22.1 |
| **Trung bình toàn bộ (Level)** | **10.1** | **11.2** | **12.6** | **14.1** | **15.3** | **16.6** | **18.2** | **19.7** | **21.2** |

---

## 🛡️ 2. Số Lượt Đấu Trung Bình Theo Hệ Pet (Góc Nhìn Người Chơi)

Vì mỗi người chơi chỉ sở hữu **1 Pet** cố định và đối đầu ngẫu nhiên với cả 3 hệ đối thủ, số lượt đấu trung bình thực tế mà người chơi trải nghiệm ở từng cấp độ là:

| Hệ Pet của User | Các Cặp Đấu Tính Gộp | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| ✂️ **Hệ Kéo (SCISSORS)** | *Kéo vs Bao, Kéo vs Búa, Kéo vs Kéo* | **8.9** | **9.4** | **9.9** | **10.7** | **10.9** | **11.3** | **12.0** | **12.2** | **13.0** |
| 🔨 **Hệ Búa (ROCK)** | *Búa vs Kéo, Búa vs Bao, Búa vs Búa* | **12.2** | **13.6** | **15.9** | **18.0** | **20.0** | **22.0** | **24.4** | **27.0** | **29.0** |
| 📄 **Hệ Bao (PAPER)** | *Bao vs Búa, Bao vs Kéo, Bao vs Bao* | **9.2** | **10.6** | **12.1** | **13.7** | **15.0** | **16.4** | **18.2** | **19.8** | **21.7** |

---

## ⚔️ 3. Tỷ Lệ Thắng (%) Giữa Các Kèo Khắc Chế Cứng (Pet A đi tiên vs Quái B)

Dưới đây là tỷ lệ thắng của bên **Khắc Hệ (đánh trước)** đối đầu với bên **Bị Khắc Hệ**:

| Kèo Đấu (A vs B) | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Kéo vs Bao (Kéo khắc Bao)** | **99.2%** | **98.8%** | **85.9%** | **80.8%** | **68.6%** | *34%* | *33.6%* | *14.5%* | *20.2%* |
| **Bao vs Búa (Bao khắc Búa)** | **100%** | **99.8%** | **99.7%** | **98%** | **97%** | **94%** | **91.6%** | **86.2%** | **80.8%** |
| **Búa vs Kéo (Búa khắc Kéo)** | **93.7%** | **85.4%** | **78.2%** | **88.5%** | **99.5%** | **99.7%** | **100%** | **100%** | **100%** |

---

## 🔍 Đánh Giá Cân Bằng Tự Động Từ Kết Quả Giả Lập

1. **Độ Khắc Chế Của Bao vs Búa:**
   * Tỷ lệ thắng của Bao (hệ khắc Búa) ở Lv.40 hiện tại là **80.8%**.
   * ✅ Bao vẫn giữ được ưu thế thắng trước Búa ở level cao, vòng tròn khắc chế hoạt động tốt.

2. **Độ Khắc Chế Của Kéo vs Bao:**
   * Tỷ lệ thắng của Kéo (hệ khắc Bao) ở Lv.40 hiện tại là **20.2%**.
   * ⚠️ **Cảnh báo:** Bao đã lật kèo Kéo ở level cao!

3. **Thời lượng trung bình trận đấu của Hệ Kéo:**
   * Trung bình số lượt của người sở hữu Pet Kéo ở Lv.30 là **12.0 lượt**.
   * ✅ Đạt mục tiêu thời lượng trận đấu tối thiểu ở cấp cao.
