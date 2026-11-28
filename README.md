# Nhật Kí (DailyBoard) — Bảng Ghim Scrapbook Lofi & Mèo Đồng Hành

> Ứng dụng nhật ký cá nhân & 2 người theo kiến trúc **Local-First PWA** (iPhone, Android, MacBook & PC) — kết hợp bảng ghim ảnh Polaroid, Hũ Viên Nang cảm xúc 3D, mèo Lofi đồng hành, phòng nhạc YouTube/Spotify, nhắc việc lặp, chi tiêu theo cảm xúc và đồng bộ thời gian thực.

- **Live Demo:** https://dailyboard-ten.vercel.app
- **Mini-Widget (MacBook / PC):** https://dailyboard-ten.vercel.app/widget
- **Tài liệu kỹ thuật đầy đủ:** [`docs/index.md`](docs/index.md)

---

## 1. Công nghệ sử dụng

- **Frontend & Framework:** Next.js 16 (App Router), React 19, TypeScript 5.8, Tailwind CSS 4
- **Lưu trữ Local-First:** IndexedDB (ảnh Polaroid & ghi âm), Slim LocalStorage (metadata nhẹ), Account-Scoped Outbox Queue
- **Cloud & Realtime:** Supabase (Auth Email/OTP/Link, PostgreSQL + RLS 10 bảng, Private Storage Bucket, Realtime Presence & Broadcast)
- **Đồ họa, Âm thanh & Xuất bản:**
  - **Takumi (`@takumi-rs/image-response`)**: Render Dynamic Open Graph Image `1200×630` PNG chuẩn dấu tiếng Việt
  - **html-to-image**: Xuất thẻ kỷ niệm cuối ngày định dạng PNG (tối ưu riêng cho Safari/WebKit)
  - **Web Audio API**: Bộ trộn âm thanh Lofi nền (tiếng mưa rơi, mèo gừ *purr*, lửa ấm)
- **Bảo mật:** Web Crypto API (`AES-GCM 256-bit` cho Tâm thư/Viên nang riêng tư, `Salted SHA-256` cho mã PIN), CSP & HSTS Headers

---

## 2. Các tính năng chính

1. **Chế độ 1 người & Bảng chung 2 người (`Him & Her`)**: Mặc định khởi tạo gọn gàng cho 1 người (tên bảng `Name`). Bấm **Mời bạn** để tạo **Link mời mở** (`?invite=DIARY-...`) — người thứ 2 chỉ cần mở link rồi đăng nhập hoặc tạo tài khoản mới là vào thẳng bảng chung, đồng bộ realtime, hiện chấm online và gửi tim `♡`.
2. **Check-in 2 giây & Mèo Lofi Đồng Hành**: Chọn tâm trạng, thời tiết, ghi câu nói trong ngày, giữ chuỗi check-in kèm **Thẻ Ngủ Đông** (mỗi 7 ngày tích lũy 1 thẻ tự cứu chuỗi khi nghỉ 1 ngày), tích điểm cá mở vật phẩm trang trí & đồng hồ tập trung Pomodoro.
3. **Album Polaroid 3D & Lịch Kỷ Niệm**: Chụp ảnh trực tiếp hoặc tải từ thư viện (tự nén WebP, hỗ trợ ảnh HEIC di động), chọn Washi Tape & màu khung, **lật 3D mặt sau Polaroid** để gắn ghi âm kỷ niệm, phản ứng emoji/bình luận 2 người, xem Lịch tháng Scrapbook và thẻ *Ký ức ngày cũ*.
4. **Hũ Viên Nang 2D/3D & Lửa Trại Let-Go**: Thả thông điệp vào Hũ Viên Nang theo cảm xúc hoặc niêm phong theo ngày mở (`unlockDate`); góc **Lửa Trại Let-Go** giúp viết ra điều muốn buông bỏ (không lưu vết) kết hợp nhịp thở 4-7-8.
5. **Sổ Tay, Nhắc Việc Lặp & Chi Tiêu Cảm Xúc**: Ghi chú giấy rách & Tâm thư niêm phong sáp khóa mã PIN (mã hóa E2EE), câu hỏi gợi mở mỗi ngày, băng thu âm Cassette tối đa 45s, nhắc việc lặp hằng ngày/tuần, chi tiêu theo cảm xúc nhập dấu chấm VND trực tiếp kèm **Hoàn tác 5 giây**.
6. **Phòng Nhạc Lofi & Âm Thanh Nền**: Dán link hoặc tìm kiếm trực tiếp YouTube/Spotify trong app, danh sách đài Lofi tuyển chọn, đồng bộ bài đang nghe cho 2 người, Mini-Player nổi không ngắt nhạc khi chuyển tab.
7. **Xuất Thẻ Ngày PNG, Cozy Desk & PWA**: Xuất ảnh tổng kết cuối ngày, chế độ đồng hồ bàn học toàn màn hình (**Cozy Desk**), tìm kiếm toàn cục `Cmd+K`, che màn hình riêng tư `Cmd+Shift+L`, và cài trực tiếp lên Màn hình chính iPhone/Android như app thật.

---

## 3. Cài đặt & Khởi chạy

### 3.1. Yêu cầu môi trường
- [Node.js 20+](https://nodejs.org/) và `npm`
- *(Tùy chọn cho đồng bộ đa thiết bị)* Tài khoản [Supabase](https://supabase.com) miễn phí

### 3.2. Chạy ngay ở chế độ Local-First (không cần cấu hình DB)
```bash
npm install
npm run dev
```
Mở trình duyệt tại:
- `http://localhost:3000` — Giao diện bảng đầy đủ
- `http://localhost:3000/widget` — Chế độ Mini-Widget gọn nhẹ cho MacBook & PC

### 3.3. Kết nối đồng bộ Cloud đa thiết bị (Supabase)
1. Tạo project mới trên Supabase → vào **SQL Editor** → chạy toàn bộ nội dung file [`supabase/schema.sql`](supabase/schema.sql).
2. Sao chép `.env.example` thành `.env.local` và điền khóa công khai:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
   ```
3. Xem hướng dẫn đầy đủ về cấu hình Gmail OTP, triển khai lên Vercel và cài PWA trên iPhone tại [`docs/02-van-hanh-va-chat-luong/04-huong-dan-cai-dat-va-trien-khai.md`](docs/02-van-hanh-va-chat-luong/04-huong-dan-cai-dat-va-trien-khai.md) (hoặc bản tóm tắt nhanh tại [`DEPLOY.md`](DEPLOY.md)).

---

## 4. Kiểm thử & Build sản xuất

```bash
npm run typecheck          # Kiểm tra kiểu TypeScript (tsc --noEmit)
npm test                   # Chạy toàn bộ 11 unit test suites (node:test)
npx next build --webpack   # Biên dịch bản production
```

*(Hiện tại toàn bộ `11/11` unit test suites kiểm tra logic media, ngày tháng/VND, chia sẻ & link mời mở, lưu trữ tách media, mã hóa E2EE/xoay PIN, viên nang và chuỗi ngày đều đạt 100% Passed).*

---

## 5. Cấu trúc dự án

```text
AppCaNhan/
├── src/
│   ├── app/               # Next.js App Router (/, /widget, /api/og, /api/music-search, /api/keep-alive)
│   ├── components/        # UI theo miền chức năng (auth, board, calendar, capsule, cat, desk, music, snapshot, sync)
│   ├── lib/               # Logic nghiệp vụ thuần (security, storage, outbox, supabaseSync, sharing, capsules, search...)
│   ├── assets/fonts/      # Font BeVietnamPro nhúng cục bộ cho Dynamic OG Image
│   └── types/             # Định nghĩa kiểu dữ liệu (catyboard.ts)
├── supabase/              # Schema PostgreSQL 10 bảng, RLS Policies, Triggers & RPC Functions (schema.sql)
├── public/                # PWA Manifest, Service Worker (sw.js) & App Icons
├── tests/                 # Automated Unit Tests (core.test.ts)
├── docs/                  # Hệ thống tài liệu kiến trúc, đặc tả chức năng, bảo mật, vận hành & ADR
└── DEPLOY.md              # Hướng dẫn deploy nhanh lên Supabase & Vercel
```

---

## 6. Tài liệu kỹ thuật (`docs/`)

| Tài liệu | Nội dung chính |
|---|---|
| [Trang chủ tài liệu (`docs/index.md`)](docs/index.md) | Bản đồ tra cứu toàn bộ hệ thống tài liệu |
| [Kiến trúc hệ thống](docs/01-dac-ta-he-thong/02-kien-truc-he-thong.md) | Mô hình 3 tầng, Local-First IndexedDB/Outbox & Realtime Delta |
| [Thiết kế CSDL & ERD](docs/01-dac-ta-he-thong/03-co-so-du-lieu-erd.md) | Sơ đồ ERD 10 bảng PostgreSQL, RPC Functions & Anti-Tampering Triggers |
| [Bảo mật & Quyền riêng tư](docs/01-dac-ta-he-thong/04-bao-mat-va-quyen-rieng-tu.md) | RLS, E2EE AES-GCM 256-bit, xoay PIN nguyên tử & CSP/HSTS |
| [Đặc tả 9 phân hệ (F01 → F09)](docs/01-dac-ta-he-thong/chuc-nang/F01-xac-thuc-va-moi-link-2-nguoi.md) | Luồng xử lý chi tiết & sơ đồ Mermaid cho từng tính năng |
| [Quyết định kiến trúc (ADR)](docs/03-nhat-ky-ky-thuat/02-quyet-dinh-kien-truc-adr.md) | Các đánh đổi kỹ thuật cốt lõi & định hướng mở rộng |
| [Nhật ký xử lý sự cố](docs/03-nhat-ky-ky-thuat/03-xu-ly-su-co-troubleshooting.md) | Phân tích nguyên nhân gốc rễ các lỗi thực tế đã khắc phục |
