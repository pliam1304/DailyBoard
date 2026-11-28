[← Mục lục Docs](../index.md)

# 01. Lịch Sử Phiên Bản & Tiến Trình Phát Triển (Changelog)

Tài liệu tổng hợp lịch sử phát triển thực tế của dự án **Nhật Kí (`DailyBoard`)** trích xuất từ kho lưu trữ GitHub (`https://github.com/pliam1304/DailyBoard`, nhánh `main`), được nhóm theo các cột mốc tính năng chính.

---

## 1. Các Cột Mốc Phát Triển Chính

### Mốc 5 — Chia Sẻ Link Mở 2 Người & Dynamic OG Image (`2026-11-27`)
- **`ebdcf34`** `fix(sharing): enable open invite links and seamless signup/login join for 2-person boards`
  - Cho phép tạo **Link mời mở** (`open@invite.local`) không bắt buộc biết trước email, thêm xem trước lời mời (`preview_board_invitation`), ô nhập mã tham gia trực tiếp cho iOS PWA, bảo toàn `?invite=` qua Gmail redirect và nút đổi tài khoản khi test trên cùng trình duyệt.
- **`517f21d`** `feat(og): add dynamic Open Graph image via Takumi with Vietnamese font support`
  - Xây dựng `/api/og` render PNG `1200×630` bằng Takumi (`@takumi-rs/image-response`), nhúng cục bộ font `BeVietnamPro` chuẩn dấu tiếng Việt và sinh ảnh xem trước riêng cho link mời 2 người.

### Mốc 4 — Gia Cố Cốt Lõi & Làm Sạch Giao Diện (`2026-11-27`)
- **`87f7bb9`** `feat(core): slim IDB storage, safe PIN re-encryption, Safari PNG export & finance edit/undo`
  - Tách media nặng sang IndexedDB (`stripHeavyMediaForLocalStorage` / `mergeStoresPreservingMedia`), xoay vòng mã PIN nguyên tử (`rotateNotesPinEncryption`), xuất PNG tương thích Safari/WebKit (`exportScrapbookNodeToPng`), định dạng dấu chấm VND trực tiếp, sửa inline chi tiêu và **Hoàn tác 5 giây**.
- **`d5c8871`** `style(ui): remove AI icons and verbose meta-subtitles for clean natural UI`
  - Loại bỏ hoàn toàn biểu tượng AI (`Sparkles`, `✦`, `✨`) và các đoạn mô tả dài dòng trên 28 tệp giao diện để ứng dụng sạch, tự nhiên.

### Mốc 3 — Hũ Viên Nang 2D/3D, Lửa Trại Let-Go & Bảo Mật E2EE (`2026-11-26 → 2026-11-27`)
- **`58575b4`** `feat: add interactive 3D capsule studio, let-go bonfire, 3D flip polaroids & wax-sealed letters`
  - Nâng cấp Hũ Viên Nang với xem trước 3D, Lửa Trại Let-Go (nhịp thở 4-7-8 không lưu vết), Polaroid lật 3D gắn ghi âm mặt sau và Tâm thư niêm phong sáp.
- **`924ab48`** `feat: add 2D physics soul capsule jar, AES-256 note encryption, privacy shield & cozy desk mode`
  - Xây dựng Hũ Viên Nang vật lý 2D, mã hóa đầu cuối AES-GCM 256-bit cho ghi chú riêng tư, Privacy Shield 1 chạm (`Cmd+Shift+L`) và chế độ Cozy Desk Standby Clock.

### Mốc 2 — Phòng Nhạc Nâng Cao, Hiệu Năng Đồng Bộ & PWA (`2026-11-26`)
- **`2828761`** `Upgrade Music Studio with in-app search, curated stations, playlists, mini-player, and streamlined 4-tab daily UX`
- **`88101a1`** `Optimize sync performance, Service Worker caching, Supabase keep-alive cron, WebP compression, and password reset`
- **`af92d01`** `Fix personal photo persistence, mobile image upload, persistent login session, and natural UI copy`

### Mốc 1 — Khởi Tạo MVP & Hạ Tầng Supabase (`2026-11-26`)
- **`5650933`** `Ensure default public Supabase connection on Vercel and support both 6-digit OTP and email confirmation link`
- **`14ab594`** `Make Supabase schema idempotent with explicit authenticated role grants`
- **`959d4b4`** `Normalize Supabase Project URL when /rest/v1/ is appended`
- **`4e12b03`** `Initial release: Nhật Kí (Diary) Lofi Scrapbook & Cat Companion`

---

[← Trước: Phần II — 04. Hướng dẫn cài đặt & Triển khai](../02-van-hanh-va-chat-luong/04-huong-dan-cai-dat-va-trien-khai.md) | [Tiếp theo: 02. Quyết định kiến trúc (ADR) →](./02-quyet-dinh-kien-truc-adr.md)
