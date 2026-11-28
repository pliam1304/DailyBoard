[← Mục lục Docs](../index.md)

# 03. Sản Phẩm Đầu Ra & Ấn Phẩm Chia Sẻ

## 1. Danh Mục Các Đầu Ra Hỗ Trợ

Bên cạnh giao diện tương tác hằng ngày, ứng dụng hỗ trợ xuất bản và chia sẻ **4 định dạng đầu ra thực tiễn**:

| Ấn phẩm / Đầu ra | Định dạng | Công cụ xử lý | Mục đích sử dụng |
|---|---|---|---|
| **Thẻ Tổng Kết Ngày (Daily Snapshot)** | PNG (độ phân giải cao) | `html-to-image` + `exportScrapbookNodeToPng` | Lưu vào thư viện ảnh điện thoại hoặc đăng Story/gửi người thương cuối ngày |
| **Tổng Kết Tháng (Monthly Wrapped)** | Giao diện thống kê trực quan | `computeMonthlyWrapped` (`src/lib/prompts.ts`) | Nhìn lại số ngày hoạt động, tâm trạng nổi bật, tổng chi/tiết kiệm & bộ sưu tập ảnh trong tháng |
| **Dynamic Open Graph Card** | PNG `1200×630` | Takumi (`@takumi-rs/image-response`) + `BeVietnamPro` | Hiển thị ảnh xem trước đẹp, chuẩn dấu tiếng Việt khi chia sẻ link web hoặc link mời 2 người lên Zalo/Messenger/Discord |
| **Gói Sao Lưu Dữ Liệu (JSON Backup)** | `.json` (có kiểm duyệt) | `validateBackupPayload` (`src/lib/security.ts`) | Tự chủ dữ liệu cá nhân: xuất toàn bộ nhật ký ra máy và nhập lại bất kỳ lúc nào |

---

## 2. Chi Tiết Hai Ấn Phẩm Hình Ảnh Trọng Tâm

### 2.1. Thẻ Tổng Kết Ngày (`DailySnapshotModal`)
- Tổng hợp trực quan các yếu tố đẹp nhất của ngày đang chọn: ảnh Polaroid chính, câu nói trong ngày (có thể chỉnh sửa ngay trước khi xuất), sticker trang trí, tâm trạng, thời tiết, số việc đã hoàn thành, bài hát ghim và dấu ngày kiểu máy phim retro (`'26 11 28`).
- Chạy qua lớp trung gian `exportScrapbookNodeToPng` (`src/lib/snapshotExport.ts`) bảo đảm ảnh & font chữ hiển thị đầy đủ trên cả Chrome Desktop lẫn Safari iOS/macOS.

### 2.2. Dynamic Open Graph Image (`/api/og`)
- **Trạng thái mặc định (`GET /api/og`):** Hiển thị phong cách bảng ghim Scrapbook ấm áp của **Nhật Kí (`DailyBoard`)** kèm mô tả ngắn gọn và nhận diện thương hiệu.
- **Trạng thái lời mời 2 người (`GET /api/og?mode=invite&code=DIARY-...`):** Được kích hoạt tự động bởi `generateMetadata` trong `src/app/page.tsx` khi URL chứa `?invite=`, hiển thị thiệp *"Lời mời vào Bảng Chung 2 Người"* để người nhận thấy rõ nội dung ngay trên khung preview tin nhắn trước khi bấm mở.

---

[← Trước: 02. Tối ưu hiệu năng](./02-toi-uu-hieu-nang.md) | [Tiếp theo: 04. Hướng dẫn cài đặt & Triển khai →](./04-huong-dan-cai-dat-va-trien-khai.md)
