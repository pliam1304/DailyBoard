# Tài Liệu Kỹ Thuật — Nhật Kí (`DailyBoard`)

> Hệ thống tài liệu kiến trúc, đặc tả chức năng, bảo mật, vận hành và nhật ký kỹ thuật cho dự án cá nhân **Nhật Kí (`DailyBoard`)** — ứng dụng nhật ký Lofi & Scrapbook đa nền tảng (iPhone/Android PWA, MacBook & PC).

---

## 1. Thông Tin Dự Án

- **Tên sản phẩm:** Nhật Kí (`DailyBoard`) — tên bảng mặc định: `Name`
- **Nền tảng mục tiêu:** Web App & PWA (iOS Safari, Android Chrome, macOS, Windows) + Mini-Widget (`/widget`)
- **Công nghệ cốt lõi:** Next.js 16 (App Router), React 19, TypeScript 5.8, Tailwind CSS 4, Supabase (Auth / PostgreSQL / Storage / Realtime), Takumi OG Image
- **Kiến trúc dữ liệu:** Local-First (IndexedDB + Slim LocalStorage + Account-Scoped Outbox Queue) đồng bộ Realtime Delta
- **Live Demo:** https://dailyboard-ten.vercel.app
- **Mã nguồn:** https://github.com/pliam1304/DailyBoard

---

## 2. Cấu Trúc Hệ Thống Tài Liệu

Bộ tài liệu được chia thành **3 phần trọng tâm**, viết bằng thuần **GitHub-Flavored Markdown** kèm sơ đồ **Mermaid** để đọc trực tiếp trên GitHub hoặc trong IDE mà không cần công cụ build bổ sung:

1. **Phần I — Đặc Tả Hệ Thống:** Tổng quan sản phẩm, kiến trúc 3 tầng, sơ đồ ERD 10 bảng, kiến trúc bảo mật & quyền riêng tư, hệ thống giao diện UI/UX, quy chuẩn mã nguồn và đặc tả chi tiết 9 phân hệ chức năng (`F01 → F09`).
2. **Phần II — Vận Hành & Chất Lượng:** Báo cáo kiểm thử tự động (`11/11` suites), các kỹ thuật tối ưu hiệu năng offline-first, danh mục ấn phẩm đầu ra và hướng dẫn cài đặt / triển khai thực tế.
3. **Phần III — Nhật Ký Kỹ Thuật:** Lịch sử phiên bản (Changelog), Nhật ký quyết định kiến trúc (ADR) kèm định hướng mở rộng, và Nhật ký xử lý sự cố thực chiến (Troubleshooting).

---

## 3. Bản Đồ Tra Cứu Tài Liệu

### Phần I: Đặc Tả Hệ Thống

| Tài liệu | Nội dung chính |
|---|---|
| [01. Tổng quan sản phẩm](01-dac-ta-he-thong/01-tong-quan-san-pham.md) | Bài toán thực tế, triết lý Local-First Cozy, phạm vi chế độ 1 người & 2 người |
| [02. Kiến trúc hệ thống](01-dac-ta-he-thong/02-kien-truc-he-thong.md) | Kiến trúc 3 tầng Next.js + IndexedDB/Outbox + Supabase Realtime Delta |
| [03. Cơ sở dữ liệu & ERD](01-dac-ta-he-thong/03-co-so-du-lieu-erd.md) | Sơ đồ ERD 10 bảng PostgreSQL, 7 RPC `SECURITY DEFINER`, 3 Triggers & Storage |
| [04. Bảo mật & Quyền riêng tư](01-dac-ta-he-thong/04-bao-mat-va-quyen-rieng-tu.md) | RLS, mã hóa đầu cuối AES-GCM 256-bit, xoay PIN nguyên tử, Privacy Shield & CSP/HSTS |
| [05. Design System & UI/UX](01-dac-ta-he-thong/05-design-system-ui-ux.md) | Theme Sunlit/Cozy Night, 4 mặt bảng, bảng màu, Responsive 2 cột / 4 tab |
| [06. Quy chuẩn mã nguồn](01-dac-ta-he-thong/06-quy-chuan-ma-nguon.md) | Tách lớp `src/lib/` vs `src/components/`, Lazy-load Modal, quy ước Commit |

#### Đặc tả chi tiết 9 phân hệ chức năng (`F01 → F09`)

| Mã | Phân hệ | Trọng tâm kỹ thuật |
|:---:|---|---|
| **F01** | [Xác thực & Mời Link 2 người](01-dac-ta-he-thong/chuc-nang/F01-xac-thuc-va-moi-link-2-nguoi.md) | Email/OTP/Link, Open Invite Link (`?invite=`), chống rớt mã qua Gmail, rời bảng |
| **F02** | [Check-in, Mèo & Pomodoro](01-dac-ta-he-thong/chuc-nang/F02-checkin-meo-va-pomodoro.md) | Check-in 2s, Mèo 1–2 nhân vật, chuỗi ngày + Thẻ Ngủ Đông, điểm cá, Pomodoro |
| **F03** | [Album Polaroid & Lịch tháng](01-dac-ta-he-thong/chuc-nang/F03-album-polaroid-va-lich.md) | Nén WebP, Polaroid lật 3D + ghi âm mặt sau, Lịch Scrapbook & Ký ức ngày cũ |
| **F04** | [Hũ Viên Nang & Lửa Trại Let-Go](01-dac-ta-he-thong/chuc-nang/F04-hu-vien-nang-va-lua-trai.md) | Hũ 2D/3D Studio, niêm phong ngày mở, Lửa trại xả stress không lưu vết 4-7-8 |
| **F05** | [Sổ Tay, Nhắc Việc & Tài Chính](01-dac-ta-he-thong/chuc-nang/F05-so-tay-nhac-viec-va-tai-chinh.md) | Tâm thư khóa PIN E2EE, băng thu âm 45s, nhắc việc lặp, chi tiêu VND + Undo 5s |
| **F06** | [Phòng Nhạc Lofi & Âm Thanh](01-dac-ta-he-thong/chuc-nang/F06-phong-nhac-lofi-va-am-thanh.md) | YouTube/Spotify Embed, tìm nhạc trong app, Web Audio Ambient, Sync nhạc 2 người |
| **F07** | [Đồng Bộ Local-First & Outbox](01-dac-ta-he-thong/chuc-nang/F07-dong-bo-local-first-va-outbox.md) | IndexedDB + Slim LocalStorage, Outbox Queue theo tài khoản, Realtime Delta |
| **F08** | [Xuất Thẻ Ngày & OG Image](01-dac-ta-he-thong/chuc-nang/F08-xuat-the-ngay-va-og-image.md) | End-of-Day Wizard, xuất PNG Safari-safe, Dynamic OG `1200×630` bằng Takumi |
| **F09** | [PWA, Mini-Widget & Cozy Desk](01-dac-ta-he-thong/chuc-nang/F09-pwa-widget-va-cozy-desk.md) | Service Worker PWA iOS/Android, `/widget` MacBook, Cozy Desk & Global Search |

---

### Phần II: Vận Hành & Chất Lượng

| Tài liệu | Nội dung chính |
|---|---|
| [01. Kiểm thử tự động](02-van-hanh-va-chat-luong/01-kiem-thu-tu-dong.md) | Chiến lược `node:test`, bảng chi tiết 11 test suites (`11/11` Passed) |
| [02. Tối ưu hiệu năng](02-van-hanh-va-chat-luong/02-toi-uu-hieu-nang.md) | Slim LocalStorage, WebP, Batch Signed URLs 20h, Dynamic Import & Keep-Alive Cron |
| [03. Sản phẩm đầu ra & Ấn phẩm](02-van-hanh-va-chat-luong/03-san-pham-dau-ra-va-an-pham.md) | Thẻ ngày PNG, Monthly Wrapped, OG Image Takumi, JSON Backup/Restore |
| [04. Hướng dẫn cài đặt & Triển khai](02-van-hanh-va-chat-luong/04-huong-dan-cai-dat-va-trien-khai.md) | Setup Local, Supabase SQL & Auth, Deploy Vercel, PWA iOS & Checklist bảo mật |

---

### Phần III: Nhật Ký Kỹ Thuật

| Tài liệu | Nội dung chính |
|---|---|
| [01. Lịch sử phiên bản (Changelog)](03-nhat-ky-ky-thuat/01-lich-su-phien-ban-changelog.md) | Tổng hợp các cột mốc phát triển từ 13 commits chính |
| [02. Quyết định kiến trúc (ADR)](03-nhat-ky-ky-thuat/02-quyet-dinh-kien-truc-adr.md) | 6 quyết định kiến trúc cốt lõi & định hướng mở rộng tương lai |
| [03. Nhật ký xử lý sự cố](03-nhat-ky-ky-thuat/03-xu-ly-su-co-troubleshooting.md) | Phân tích nguyên nhân gốc rễ & cách khắc phục 6 lỗi thực chiến |
