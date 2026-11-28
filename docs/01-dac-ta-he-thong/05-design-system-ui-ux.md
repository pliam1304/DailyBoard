[← Mục lục Docs](../index.md)

# 05. Design System & Trải Nghiệm Giao Diện (UI/UX)

## 1. Triết Lý Thẩm Mỹ: Tactile Scrapbook & Lofi Desk

Thay vì giao diện dashboard phẳng lạnh, **Nhật Kí (`DailyBoard`)** mô phỏng cảm giác **một chiếc bảng ghim gỗ đặt cạnh cửa sổ bàn học**:
- **Sạch & Tự nhiên:** Tuyệt đối không sử dụng icon AI (`Sparkles`, `✦`, `✨`) hay lời dẫn kiểu máy móc; chữ trên giao diện ngắn gọn, tiếng Việt tự nhiên.
- **Có chiều sâu xúc giác:** Bề mặt bảng ghim, giấy ghi chú rách mép, băng keo Washi Tape nhiều họa tiết, ảnh Polaroid xoay nhẹ có thể lật 3D, niêm phong sáp trên tâm thư và hũ thủy tinh chứa viên nang.
- **Biểu tượng đồng nhất:** Toàn bộ hệ thống icon sử dụng thư viện vector **`lucide-react`** sắc nét ở mọi mật độ điểm ảnh.

---

## 2. Hệ Thống Chủ Đề (Themes) & Tùy Biến Cá Nhân

### 2.1. Hai Chế Độ Sáng / Đêm Tự Động Theo Giờ
- **`sunlit` (Ban ngày — 05:00 đến 18:59):** Nền giấy kem ấm `#efe4d2`, khung gỗ sáng `#b68655`, chữ nâu gỗ đậm `#382619`.
- **`cozy-night` (Ban đêm — 19:00 đến 04:59):** Nền gỗ tối dịu mắt `#1e1713`, khung gỗ trầm `#332319`, chữ kem sáng `#f4e8d6`. Kèm nút bật **Ánh nến hổ phách** (`warmAmberOn`) phủ lớp lọc ấm dịu mắt khi viết nhật ký khuya.
- Người dùng có thể bấm nút chuyển thủ công bất kỳ lúc nào; lựa chọn được lưu vào `profile.defaultTheme` và đồng bộ qua các thiết bị.

### 2.2. 4 Chất Liệu Mặt Bảng & 2 Kiểu Chữ
- **Mặt bảng (`boardTexture`):** `cork` (bảng bần cổ điển), `linen` (vải lanh ấm), `grid-paper` (giấy kẻ ô sổ tay), `walnut` (gỗ óc chó).
- **Kiểu chữ (`fontStyle`):** `rounded` (tròn mềm dễ đọc) và `handwriting` (nét viết tay cho chú thích Polaroid & Ghi chú).

---

## 3. Bảng Màu Hệ Thống (Color Tokens)

| Nhóm màu | Mã Hex (Sunlit) | Mã Hex (Cozy Night) | Vai trò sử dụng |
|---|---|---|---|
| **Nền chính (Canvas)** | `#efe4d2` | `#1e1713` | Nền ngoài khung bảng |
| **Bề mặt thẻ (Card)** | `#fbf5e9` | `#2c2119` | Thẻ nội dung, thanh điều hướng, input |
| **Viền gỗ khung bảng** | `#b68655` | `#332319` | Khung ngoài 8px bo góc `32px` |
| **Chữ chính** | `#382619` | `#f4e8d6` | Tiêu đề, nội dung chính |
| **Xanh trời (`sky`)** | `#3a75a8` | `#3a75a8` | Nút hành động chính, tab đang chọn, trái tim mặc định Người 1 |
| **Xanh mint (`sage`)** | `#3d7c57` | `#3d7c57` | Trạng thái đồng bộ, bảng chung 2 người, trái tim mặc định Người 2 |
| **Hồng phấn (`blush`)** | `#b95567` | `#b95567` | Nút Chốt ngày, nhắc cảnh báo nhẹ, trái tim hồng |
| **Kem ấm (`cream`)** | `#b57a29` | `#b57a29` | Chuỗi ngày (Streak), điểm nhấn kỷ niệm |

---

## 4. Kiến Trúc Bố Cục Responsive (Desktop vs Mobile PWA)

### Trên Desktop (`lg` ≥ 1024px) — Lưới 12 cột (4 + 8)
- **Cột trái (4 cột — Cố định):** Chứa `CatCompanion` (Cửa sổ Mèo), `LofiPlayer` (Phòng Nhạc) và `FocusPomodoroCard`. Cột này **luôn giữ mount liên tục** để nhạc YouTube/Spotify và âm thanh mưa rơi không bao giờ bị ngắt khi người dùng chuyển tab bên phải.
- **Cột phải (8 cột — 3 Tab chính):**
  1. `Hôm nay`: Check-in 2 giây, Hũ Viên Nang mini, dải tóm tắt nhanh, thẻ *Ký ức ngày cũ* và các thẻ nội dung ngày đang chọn.
  2. `Kỷ niệm`: Lịch tháng Scrapbook + Album Polaroid.
  3. `Sổ tay`: Lọc theo Tất cả / Nhắc việc / Chi tiêu & Tiết kiệm / Ghi chú & Thư.

### Trên Mobile / iPhone PWA (`< 768px`)
- Thanh điều hướng cố định dưới đáy gồm **4 tab**: `Hôm nay`, `Kỷ niệm`, `Sổ tay`, `Phòng Nhạc`.
- Khi đang phát nhạc mà chuyển sang tab khác, một **Floating Mini-Player Strip** nổi ngay phía trên thanh đáy cho phép chuyển bài tiếp theo hoặc dừng nhạc trong 1 chạm mà vẫn giữ `LofiPlayer` gắn trong DOM để không đứt luồng phát.

---

[← Trước: 04. Bảo mật & Quyền riêng tư](./04-bao-mat-va-quyen-rieng-tu.md) | [Tiếp theo: 06. Quy chuẩn mã nguồn →](./06-quy-chuan-ma-nguon.md)
