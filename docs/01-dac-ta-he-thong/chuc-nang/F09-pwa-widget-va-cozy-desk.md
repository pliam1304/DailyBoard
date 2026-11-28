[← Mục lục Docs](../../index.md)

# F09 — PWA Đa Nền Tảng, Mini-Widget `/widget`, Cozy Desk & Tìm Kiếm Toàn Cục

## 1. Mục Tiêu & Trải Nghiệm Người Dùng

Mở rộng **Nhật Kí (`DailyBoard`)** từ một trang web thông thường thành trải nghiệm gần như ứng dụng gốc trên cả điện thoại lẫn máy tính:
- **PWA (Progressive Web App):** Cài trực tiếp lên Màn hình chính iPhone/Android (biểu tượng riêng, mở toàn màn hình không thanh địa chỉ, cache tài nguyên tĩnh qua Service Worker).
- **Mini-Widget (`/widget`):** Giao diện thu gọn chuyên dụng để ghim góc màn hình MacBook/PC.
- **Cozy Desk Mode (`CozyDeskModal`):** Màn hình đồng hồ bàn học Lofi toàn màn hình kèm chuỗi ngày, điều khiển nhạc đang phát và món quà từ người kia.
- **Tìm kiếm toàn cục (`Cmd + K` / `Ctrl + K`):** Tra cứu tức thời xuyên suốt ảnh, bình luận ảnh, ghi chú, nhắc việc, chi tiêu và băng thu âm.

---

## 2. Cơ Chế Hoạt Động Các Tiện Ích Hệ Thống

1. **Service Worker & PWA (`public/manifest.webmanifest`, `public/sw.js`, `src/lib/pwa.ts`):**
   - `registerServiceWorker()` đăng ký `sw.js` ngay lúc khởi động ứng dụng để cache tài nguyên tĩnh và cải thiện tốc độ mở lại trên mạng yếu.
   - `sendLocalNotification()` gửi thông báo nhắc việc khi tới giờ `dueTime` và khi nhận trái tim `♡` từ người thứ 2 (nếu người dùng đã cấp quyền thông báo).
2. **Tìm kiếm toàn cục tôn trọng quyền riêng tư (`searchAcrossBoard` — `src/lib/search.ts`):**
   - Hỗ trợ tìm không phân biệt hoa thường trên chú thích ảnh, bình luận ảnh, tiêu đề/nội dung ghi chú công khai, nhắc việc, chi tiêu và tiêu đề thu âm.
   - **Tự động lọc bảo mật:** Không bao giờ tìm trong nội dung của ghi chú `isPrivate: true` (chỉ tìm theo tiêu đề) và không tìm trong nội dung viên nang đang niêm phong trước ngày `unlockDate`.
   - Bấm vào kết quả (`handleSelectSearchHit`) sẽ tự nhảy đúng sang ngày `entryDate` và mở đúng tab/phân mục tương ứng (`memories`, `planner/notes`, `planner/reminders`, `planner/finance`).
3. **Phím tắt toàn cục (`CatyBoardApp.tsx`):**
   - `Cmd + K` / `Ctrl + K`: Mở/đóng hộp tìm kiếm toàn cục.
   - `Cmd + Shift + L` / `Ctrl + Shift + L`: Bật ngay **Privacy Shield** che toàn bộ nội dung màn hình trong khi nhạc vẫn tiếp tục phát.

---

## 3. Các Tệp Mã Nguồn & Kiểm Thử Liên Quan

- **PWA & Widget:** `public/manifest.webmanifest`, `public/sw.js`, `public/icons/caty-icon.svg`, `src/lib/pwa.ts`, `src/app/widget/page.tsx`
- **Cozy Desk & Tìm kiếm:** `src/components/desk/CozyDeskModal.tsx`, `src/components/board/SearchCommandModal.tsx`, `src/lib/search.ts`
- **Kiểm thử tự động:** `tests/core.test.ts` (test `searchAcrossBoard` tìm bình luận ảnh, thu âm, và kiểm chứng không rò rỉ nội dung ghi chú riêng tư hay viên nang niêm phong).

---

[← Trước: F08. Xuất Thẻ Ngày & OG Image](./F08-xuat-the-ngay-va-og-image.md) | [Tiếp theo: Phần II — 01. Kiểm thử tự động →](../../02-van-hanh-va-chat-luong/01-kiem-thu-tu-dong.md)
