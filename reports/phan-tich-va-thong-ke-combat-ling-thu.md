# Báo cáo Phân tích: Thống Kê Số Lượt Đấu & Tỷ Lệ Thắng Ling Thú (Tự Động Cập Nhật)

Báo cáo này được tự động tạo bởi script giả lập khi bạn chạy `node scripts/run_simulator.js`. Nó lấy trực tiếp presets thuộc tính nguyên tố từ file cấu hình game của bạn.

### ⚙️ Chỉ số Presets hiện tại được trích xuất:
* **Hệ Kéo (SCISSORS):** HP 110 (+18/Lv), ATK 17 (+2.3/Lv), DEF 8 (+1/Lv), LUCK 5 (+2/Lv)
* **Hệ Búa (ROCK):** HP 140 (+19/Lv), ATK 12 (+1.6/Lv), DEF 17 (+1.8/Lv), LUCK 5 (+1/Lv)
* **Hệ Bao (PAPER):** HP 120 (+18/Lv), ATK 15 (+1.9/Lv), DEF 10 (+1.6/Lv), LUCK 5 (+2.2/Lv)

---

## 📊 1. Bảng Thống Kê Số Lượt Đấu Trung Bình (Chế Độ Có Khắc Chế)

Dưới đây là số lượt đấu trung bình kết thúc trận đấu (đơn vị: *lượt*):

| Cặp Đấu / Level | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Kéo vs Bao** | 8.9 | 9.6 | 10.5 | 10.7 | 11.4 | 11.6 | 12.6 | 13.0 | 13.7 |
| **Bao vs Búa** | 12.3 | 13.6 | 14.9 | 16.0 | 17.5 | 18.8 | 20.3 | 21.5 | 23.2 |
| **Búa vs Kéo** | 10.9 | 11.9 | 12.2 | 13.3 | 14.4 | 15.3 | 15.8 | 16.8 | 17.8 |
| **Kéo vs Búa** | 10.9 | 11.8 | 12.1 | 13.3 | 14.3 | 15.3 | 15.7 | 16.7 | 17.8 |
| **Búa vs Bao** | 12.3 | 13.7 | 15.0 | 16.1 | 17.5 | 18.9 | 20.4 | 21.7 | 23.3 |
| **Bao vs Kéo** | 8.9 | 9.7 | 10.5 | 10.8 | 11.5 | 11.8 | 12.8 | 13.1 | 13.8 |
| **Kéo vs Kéo** | 7.6 | 8.2 | 8.9 | 9.2 | 9.5 | 9.3 | 10.1 | 10.0 | 10.3 |
| **Búa vs Búa** | 16.2 | 17.4 | 18.5 | 19.8 | 21.0 | 22.6 | 24.7 | 25.7 | 27.4 |
| **Bao vs Bao** | 10.0 | 11.2 | 12.5 | 13.8 | 15.0 | 16.2 | 17.2 | 18.9 | 19.9 |
| **Trung bình toàn bộ (Level)** | **10.9** | **11.9** | **12.8** | **13.7** | **14.7** | **15.5** | **16.6** | **17.5** | **18.6** |

---

## 🛡️ 2. Số Lượt Đấu Trung Bình Theo Hệ Pet (Góc Nhìn Người Chơi)

Vì mỗi người chơi chỉ sở hữu **1 Pet** cố định và đối đầu ngẫu nhiên với cả 3 hệ đối thủ, số lượt đấu trung bình thực tế mà người chơi trải nghiệm ở từng cấp độ là:

| Hệ Pet của User | Các Cặp Đấu Tính Gộp | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| ✂️ **Hệ Kéo (SCISSORS)** | *Kéo vs Bao, Kéo vs Búa, Kéo vs Kéo* | **9.1** | **9.9** | **10.5** | **11.1** | **11.7** | **12.1** | **12.8** | **13.2** | **13.9** |
| 🔨 **Hệ Búa (ROCK)** | *Búa vs Kéo, Búa vs Bao, Búa vs Búa* | **13.1** | **14.3** | **15.2** | **16.4** | **17.6** | **18.9** | **20.3** | **21.4** | **22.8** |
| 📄 **Hệ Bao (PAPER)** | *Bao vs Búa, Bao vs Kéo, Bao vs Bao* | **10.4** | **11.5** | **12.6** | **13.5** | **14.7** | **15.6** | **16.8** | **17.8** | **19.0** |

---

## ⚔️ 3. Tỷ Lệ Thắng (%) Giữa Các Kèo Khắc Chế (Pet A đi tiên vs Quái B)

Dưới đây là tỷ lệ thắng của bên đi tiên (Đấu sĩ A) trong cả hai trường hợp: Khắc chế đi tiên và Bị khắc chế đi tiên:

| Kèo Đấu (A vs B) | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **✂️ Kéo vs Bao (Kéo khắc Bao - Kéo đi tiên)** | **83.5%** | **99.5%** | **89.1%** | **96.1%** | **82.5%** | **92.2%** | **91.2%** | **81.7%** | **86.7%** |
| **🍃 Bao vs Búa (Bao khắc Búa - Bao đi tiên)** | **94.7%** | **98.6%** | **97.2%** | **96.9%** | **93.5%** | **94.7%** | **94.6%** | **96.7%** | **92.9%** |
| **🔨 Búa vs Kéo (Búa khắc Kéo - Búa đi tiên)** | **93.5%** | *26.4% (Thua ngược)* | *42% (Thua ngược)* | **53%** | **58.3%** | **58%** | **81.9%** | **86.1%** | **88.5%** |
| **🍃 Bao vs Kéo (Bao bị Kéo khắc - Bao đi tiên)** | *93.5% (Lật kèo)* | **6.9%** | *61.3% (Lật kèo)* | **24.2%** | *62.1% (Lật kèo)* | **29.8%** | **31.5%** | **48.5%** | **37.2%** |
| **🔨 Búa vs Bao (Búa bị Bao khắc - Búa đi tiên)** | **32.3%** | **12.8%** | **15.7%** | **13.5%** | **22.4%** | **18.7%** | **17%** | **10.9%** | **18.3%** |
| **✂️ Kéo vs Búa (Kéo bị Búa khắc - Kéo đi tiên)** | *74.5% (Lật kèo)* | *96.3% (Lật kèo)* | *89.7% (Lật kèo)* | *80.6% (Lật kèo)* | *73.5% (Lật kèo)* | *71.5% (Lật kèo)* | **45.3%** | **36.4%** | **31.6%** |

---

## 🔍 Đánh Giá Cân Bằng Tự Động Từ Kết Quả Giả Lập

1. **Độ Khắc Chế Của Bao vs Búa:**
   * Tỷ lệ thắng của Bao (hệ khắc Búa) ở Lv.40 hiện tại là **92.9%**.
   * ✅ Bao vẫn giữ được ưu thế thắng trước Búa ở level cao, vòng tròn khắc chế hoạt động tốt.

2. **Độ Khắc Chế Của Kéo vs Bao:**
   * Tỷ lệ thắng của Kéo (hệ khắc Bao) ở Lv.40 hiện tại là **86.7%**.
   * ✅ Kéo giữ vững ưu thế khắc chế trước Bao.

3. **Thời lượng trung bình trận đấu của Hệ Kéo:**
   * Trung bình số lượt của người sở hữu Pet Kéo ở Lv.30 là **12.8 lượt**.
   * ✅ Đạt mục tiêu thời lượng trận đấu tối thiểu ở cấp cao.
