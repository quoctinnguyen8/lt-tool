# Báo cáo Phân tích: Thống Kê Số Lượt Đấu & Tỷ Lệ Thắng Ling Thú (Tự Động Cập Nhật)

Báo cáo này được tự động tạo bởi script giả lập khi bạn chạy `node scripts/run_simulator.js`. Nó lấy trực tiếp presets thuộc tính nguyên tố từ file cấu hình game của bạn.

### ⚙️ Chỉ số Presets hiện tại được trích xuất:
* **Hệ Kéo (SCISSORS):** HP 100 (+14/Lv), ATK 16 (+1.4/Lv), DEF 7 (+1.2/Lv), LUCK 5 (+1.3/Lv)
* **Hệ Búa (ROCK):** HP 110 (+19/Lv), ATK 14 (+1.6/Lv), DEF 13 (+1.2/Lv), LUCK 5 (+1.4/Lv)
* **Hệ Bao (PAPER):** HP 100 (+17/Lv), ATK 15 (+1.6/Lv), DEF 10 (+1.5/Lv), LUCK 5 (+1.5/Lv)

---

## 📊 1. Bảng Thống Kê Số Lượt Đấu Trung Bình (Chế Độ Có Khắc Chế)

Dưới đây là số lượt đấu trung bình kết thúc trận đấu (đơn vị: *lượt*):

| Cặp Đấu / Level | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Kéo vs Bao** | 7.9 | 10.2 | 5.9 | 7.3 | 7.4 | 8.9 | 9.9 | 10.9 | 11.0 |
| **Bao vs Búa** | 9.2 | 11.3 | 12.6 | 14.8 | 16.0 | 18.5 | 22.0 | 17.9 | 14.9 |
| **Búa vs Kéo** | 9.0 | 11.0 | 12.0 | 12.0 | 12.0 | 11.0 | 10.0 | 9.0 | 8.0 |
| **Kéo vs Búa** | 9.0 | 11.0 | 12.0 | 12.0 | 12.0 | 11.0 | 10.0 | 9.0 | 8.0 |
| **Búa vs Bao** | 9.2 | 11.3 | 12.7 | 14.9 | 16.0 | 18.5 | 22.1 | 17.8 | 14.8 |
| **Bao vs Kéo** | 7.9 | 10.2 | 5.9 | 7.4 | 7.4 | 8.9 | 10.0 | 10.9 | 11.0 |
| **Kéo vs Kéo** | 7.7 | 9.5 | 11.8 | 12.9 | 10.9 | 10.1 | 9.9 | 10.1 | 10.8 |
| **Búa vs Búa** | 10.0 | 12.1 | 14.1 | 14.5 | 16.3 | 18.2 | 19.6 | 21.6 | 23.6 |
| **Bao vs Bao** | 8.0 | 10.1 | 12.0 | 14.4 | 15.7 | 16.9 | 18.0 | 17.6 | 17.5 |
| **Trung bình toàn bộ (Level)** | **8.7** | **10.7** | **11.0** | **12.2** | **12.6** | **13.6** | **14.6** | **13.9** | **13.3** |

---

## 🛡️ 2. Số Lượt Đấu Trung Bình Theo Hệ Pet (Góc Nhìn Người Chơi)

Vì mỗi người chơi chỉ sở hữu **1 Pet** cố định và đối đầu ngẫu nhiên với cả 3 hệ đối thủ, số lượt đấu trung bình thực tế mà người chơi trải nghiệm ở từng cấp độ là:

| Hệ Pet của User | Các Cặp Đấu Tính Gộp | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| ✂️ **Hệ Kéo (SCISSORS)** | *Kéo vs Bao, Kéo vs Búa, Kéo vs Kéo* | **8.2** | **10.2** | **9.9** | **10.7** | **10.1** | **10.0** | **9.9** | **10.0** | **9.9** |
| 🔨 **Hệ Búa (ROCK)** | *Búa vs Kéo, Búa vs Bao, Búa vs Búa* | **9.4** | **11.5** | **12.9** | **13.8** | **14.8** | **15.9** | **17.2** | **16.1** | **15.5** |
| 📄 **Hệ Bao (PAPER)** | *Bao vs Búa, Bao vs Kéo, Bao vs Bao* | **8.4** | **10.5** | **10.2** | **12.2** | **13.0** | **14.8** | **16.7** | **15.5** | **14.5** |

---

## ⚔️ 3. Tỷ Lệ Thắng & HP Còn Lại (%) Của Các Kèo Khắc Chế

**Quy ước mới (v69):**
- Tỉ lệ thắng của **bên khắc chế** phải đạt **80-99%** ở mọi level từ 10-40 (không phân biệt đi trước/sau).
- Khi bên khắc chế thắng, **HP trung bình còn lại ≥ 15%** để thể hiện ý nghĩa "khắc chế xoay vòng" (không phải thắng sát nút).

> Mỗi ô hiển thị: **Tỉ lệ thắng (Win%) / HP còn lại TB khi thắng (HP%)**

| Kèo Đấu (Bên khắc → Bên bị khắc) | Lv.1 | Lv.5 | Lv.10 | Lv.15 | Lv.20 | Lv.25 | Lv.30 | Lv.35 | Lv.40 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **✂️ Kéo khắc Bao** | ⚠️ HP 11% (mục tiêu 30%) | ⚠️ HP 6% (mục tiêu 30%) | ⚠️ HP 58% (mục tiêu 30%) | ⚠️ HP 46% (mục tiêu 30%) | ⚠️ HP 45% (mục tiêu 30%) | ⚠️ HP 28% (mục tiêu 20%) | ✅ HP 20% (mục tiêu 20%) | ⚠️ HP 9% (mục tiêu 15%) | ⚠️ HP 17% (mục tiêu 15%) |
| **🍃 Bao khắc Búa** | ⚠️ HP 8% (mục tiêu 20%) | ⚠️ HP 10% (mục tiêu 20%) | ✅ HP 24% (mục tiêu 20%) | ✅ HP 23% (mục tiêu 20%) | ⚠️ HP 26% (mục tiêu 20%) | ✅ HP 33% (mục tiêu 30%) | ⚠️ HP 17% (mục tiêu 30%) | ⚠️ HP 33% (mục tiêu 20%) | ⚠️ HP 55% (mục tiêu 20%) |
| **🔨 Búa khắc Kéo** | ⚠️ HP 8% (mục tiêu 15%) | ⚠️ HP 8% (mục tiêu 15%) | ⚠️ HP 23% (mục tiêu 15%) | ⚠️ HP 32% (mục tiêu 15%) | ⚠️ HP 30% (mục tiêu 15%) | ⚠️ HP 43% (mục tiêu 22%) | ⚠️ HP 54% (mục tiêu 22%) | ⚠️ HP 69% (mục tiêu 35%) | ⚠️ HP 79% (mục tiêu 35%) |

---

## 🔍 Đánh Giá Cân Bằng Tự Động Từ Kết Quả Giả Lập

**Mục tiêu:** Tỉ lệ thắng bên khắc chế = 80-99%, HP còn lại TB khi thắng ≥ 15%.

⚠️ **Kéo khắc Bao** (Lv.10-40): Tỉ lệ thắng bên khắc dao động **67.4% - 100.0%**
⚠️ **Bao khắc Búa** (Lv.10-40): Tỉ lệ thắng bên khắc dao động **98.8% - 100.0%**
⚠️ **Búa khắc Kéo** (Lv.10-40): Tỉ lệ thắng bên khắc dao động **100.0% - 100.0%**

3. **Thời lượng trung bình trận đấu của Hệ Kéo:**
   * Trung bình số lượt của người sở hữu Pet Kéo ở Lv.30 là **9.9 lượt**.
