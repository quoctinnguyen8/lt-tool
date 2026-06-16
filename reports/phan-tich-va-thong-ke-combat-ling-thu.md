# Báo cáo Phân tích: Thống Kê Số Lượt Đấu & Tỷ Lệ Thắng Ling Thú (Tự Động Cập Nhật)

Báo cáo này được tự động tạo bởi script giả lập khi bạn chạy `node scripts/run_simulator.js`. Nó lấy trực tiếp presets thuộc tính nguyên tố từ file cấu hình game của bạn.

### ⚙️ Chỉ số Presets hiện tại được trích xuất:
* **Hệ Kéo (SCISSORS):** HP 100 (+18/Lv), ATK 15 (+1.5/Lv), DEF 7 (+1.3/Lv), LUCK 5 (+1.6/Lv)
* **Hệ Búa (ROCK):** HP 110 (+18/Lv), ATK 14 (+1.6/Lv), DEF 10 (+1.2/Lv), LUCK 5 (+1.2/Lv)
* **Hệ Bao (PAPER):** HP 100 (+18/Lv), ATK 15 (+1.6/Lv), DEF 10 (+1.4/Lv), LUCK 5 (+1.5/Lv)

---

## 📊 1. Bảng Thống Kê Số Lượt Đấu Trung Bình (Chế Độ Có Khắc Chế)

Dưới đây là số lượt đấu trung bình kết thúc trận đấu (đơn vị: *lượt*):

| Cặp Đấu / Level | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Kéo vs Bao** | 8.0 | 10.0 | 11.1 | 12.7 | 13.5 | 14.8 | 15.7 | 16.5 | 17.4 |
| **Bao vs Búa** | 9.0 | 11.1 | 12.5 | 13.7 | 15.5 | 16.6 | 17.5 | 18.8 | 19.9 |
| **Búa vs Kéo** | 9.0 | 11.0 | 12.0 | 13.9 | 14.0 | 15.9 | 16.0 | 17.0 | 18.0 |
| **Kéo vs Búa** | 9.0 | 11.0 | 12.0 | 13.9 | 14.0 | 15.8 | 16.0 | 17.0 | 18.0 |
| **Búa vs Bao** | 9.0 | 11.1 | 12.5 | 13.8 | 15.5 | 16.6 | 17.6 | 18.9 | 20.0 |
| **Bao vs Kéo** | 8.0 | 10.0 | 11.1 | 12.7 | 13.5 | 14.8 | 15.7 | 16.5 | 17.5 |
| **Kéo vs Kéo** | 8.0 | 9.9 | 11.9 | 13.1 | 14.0 | 14.9 | 16.0 | 16.8 | 17.9 |
| **Búa vs Búa** | 10.0 | 12.1 | 13.2 | 14.4 | 15.6 | 16.8 | 17.5 | 18.7 | 19.8 |
| **Bao vs Bao** | 8.0 | 11.0 | 12.2 | 14.0 | 15.1 | 16.2 | 17.5 | 18.7 | 20.2 |
| **Trung bình toàn bộ (Level)** | **8.7** | **10.8** | **12.1** | **13.6** | **14.5** | **15.8** | **16.6** | **17.7** | **18.7** |

---

## 🛡️ 2. Số Lượt Đấu Trung Bình Theo Hệ Pet (Góc Nhìn Người Chơi)

Vì mỗi người chơi chỉ sở hữu **1 Pet** cố định và đối đầu ngẫu nhiên với cả 3 hệ đối thủ, số lượt đấu trung bình thực tế mà người chơi trải nghiệm ở từng cấp độ là:

| Hệ Pet của User | Các Cặp Đấu Tính Gộp | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| ✂️ **Hệ Kéo (SCISSORS)** | *Kéo vs Bao, Kéo vs Búa, Kéo vs Kéo* | **8.3** | **10.3** | **11.7** | **13.2** | **13.8** | **15.2** | **15.9** | **16.8** | **17.8** |
| 🔨 **Hệ Búa (ROCK)** | *Búa vs Kéo, Búa vs Bao, Búa vs Búa* | **9.3** | **11.4** | **12.6** | **14.0** | **15.0** | **16.4** | **17.0** | **18.2** | **19.3** |
| 📄 **Hệ Bao (PAPER)** | *Bao vs Búa, Bao vs Kéo, Bao vs Bao* | **8.3** | **10.7** | **11.9** | **13.5** | **14.7** | **15.9** | **16.9** | **18.0** | **19.2** |

---

## ⚔️ 3. Tỷ Lệ Thắng (%) Giữa Các Kèo Khắc Chế (Pet A đi tiên vs Quái B)

Dưới đây là tỷ lệ thắng của bên đi tiên (Đấu sĩ A) trong cả hai trường hợp: Khắc chế đi tiên và Bị khắc chế đi tiên:

| Kèo Đấu (A vs B) | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **✂️ Kéo vs Bao (Kéo khắc Bao - Kéo đi tiên)** | **88.7%** | *25.7% (Thua ngược)* | **99%** | **87.7%** | **87.7%** | **69.8%** | **73.5%** | **79.6%** | **78.9%** |
| **🍃 Bao vs Búa (Bao khắc Búa - Bao đi tiên)** | **84.1%** | **78.4%** | **89.1%** | **89.7%** | **91%** | **89.2%** | **89.8%** | **86.9%** | **86%** |
| **🔨 Búa vs Kéo (Búa khắc Kéo - Búa đi tiên)** | **98.8%** | **99.1%** | **99.9%** | **88.3%** | **99.9%** | **86.7%** | **99.4%** | **99.1%** | **98.7%** |
| **🍃 Bao vs Kéo (Bao bị Kéo khắc - Bao đi tiên)** | *99.7% (Lật kèo)* | *100% (Lật kèo)* | **16.3%** | *68.4% (Lật kèo)* | *57% (Lật kèo)* | *82% (Lật kèo)* | *71.1% (Lật kèo)* | *58.7% (Lật kèo)* | *58.2% (Lật kèo)* |
| **🔨 Búa vs Bao (Búa bị Bao khắc - Búa đi tiên)** | *94.4% (Lật kèo)* | *78.7% (Lật kèo)* | **42.4%** | **33.1%** | **31.5%** | **34.4%** | **30.9%** | **32.7%** | **35.6%** |
| **✂️ Kéo vs Búa (Kéo bị Búa khắc - Kéo đi tiên)** | *84.9% (Lật kèo)* | *71.1% (Lật kèo)* | **17.8%** | *63.9% (Lật kèo)* | **13.9%** | *52.6% (Lật kèo)* | **13.1%** | **13.4%** | **13.9%** |

---

## 🔍 Đánh Giá Cân Bằng Tự Động Từ Kết Quả Giả Lập

1. **Độ Khắc Chế Của Bao vs Búa:**
   * Tỷ lệ thắng của Bao (hệ khắc Búa) ở Lv.40 hiện tại là **86.0%**.
   * ✅ Bao vẫn giữ được ưu thế thắng trước Búa ở level cao, vòng tròn khắc chế hoạt động tốt.

2. **Độ Khắc Chế Của Kéo vs Bao:**
   * Tỷ lệ thắng của Kéo (hệ khắc Bao) ở Lv.40 hiện tại là **78.9%**.
   * ✅ Kéo giữ vững ưu thế khắc chế trước Bao.

3. **Thời lượng trung bình trận đấu của Hệ Kéo:**
   * Trung bình số lượt của người sở hữu Pet Kéo ở Lv.30 là **15.9 lượt**.
   * ✅ Đạt mục tiêu thời lượng trận đấu tối thiểu ở cấp cao.
