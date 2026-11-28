[← Mục lục Docs](../index.md)

# 06. Quy Chuẩn Mã Nguồn & Quy Trình Phát Triển

## 1. Nguyên Tắc Tổ Chức Mã Nguồn

Dự án áp dụng cấu trúc hướng miền chức năng (Feature-Oriented) kết hợp tách biệt rõ ràng giữa **Logic thuần** và **Giao diện React**:

```text
src/
├── types/catyboard.ts       # Toàn bộ kiểu dữ liệu miền dùng chung (Single Source of Truth)
├── lib/                     # Pure TypeScript Modules — KHÔNG import React/JSX
│   ├── date.ts              # Xử lý ngày cục bộ YYYY-MM-DD, ma trận lịch tháng, format VND
│   ├── sharing.ts           # Quản lý thành viên, Open Invite Link, chuẩn hóa store v1→v3
│   ├── security.ts          # SHA-256 PIN, AES-GCM 256-bit, xoay PIN, rate limit, sanitize
│   ├── storage.ts           # IndexedDB + Slim LocalStorage + Debounced persistence
│   ├── outbox.ts            # Hàng đợi đồng bộ theo tài khoản (Account-Scoped Outbox)
│   ├── supabaseSync.ts      # Client Supabase, RPC, Push/Pull, Batch Signed URL, Realtime Delta
│   ├── capsules.ts          # Mã hóa/giải mã metadata Viên nang 2D/3D
│   ├── search.ts            # Tìm kiếm toàn cục, lọc riêng tư/niêm phong, lặp nhắc việc, điểm cá
│   ├── prompts.ts           # Câu hỏi ngày, chuỗi ngày + Thẻ Ngủ Đông, Monthly Wrapped
│   ├── media.ts             # Parse URL YouTube/Spotify, nén ảnh WebP
│   ├── audio.ts             # Web Audio API Ambient Engine (mưa, mèo gừ, lửa)
│   ├── snapshotExport.ts    # Xuất PNG an toàn cho Safari/WebKit
│   └── pwa.ts               # Đăng ký Service Worker & Local Notification
├── components/              # React Client Components chia theo miền (auth, board, capsule, cat...)
└── app/                     # Next.js App Router Pages & API Route Handlers
```

### Quy tắc cốt lõi
1. **Pure Domain First:** Mọi thuật toán (tính chuỗi ngày, băm/mã hóa, tách mã mời từ URL, nén lưu trữ, mở rộng nhắc việc lặp) đều viết tại `src/lib/` để chạy trực tiếp được trên Node.js test runner mà không cần giả lập DOM.
2. **Dynamic Import cho Modal nặng:** Tất cả các modal không hiển thị ngay khi mở trang đều tải lười qua `next/dynamic(..., { ssr: false })` trong `CatyBoardApp.tsx` nhằm giữ bundle khởi động gọn nhẹ.
3. **Không tự sinh lỗi trên trình duyệt thiếu API:** Các tính năng phụ thuộc trình duyệt (`window`, `localStorage`, `IndexedDB`, `Notification`, `navigator.share`) luôn kiểm tra an toàn trước khi gọi để tương thích SSR và mọi môi trường trình duyệt.
4. **Dữ liệu định danh bằng UUID v4:** Mọi bản ghi mới (ảnh, ghi chú, nhắc việc, chi tiêu, thu âm, bài nhạc) đều sinh UUID phía client (`createUuid()`) trước khi lưu, giúp thao tác offline có thể đẩy thẳng lên PostgreSQL (`upsert`) mà không xung đột khóa chính.

---

## 2. Quy Chuẩn TypeScript & Kiểm Tra Trước Commit

Trước khi gộp thay đổi hoặc đẩy lên `main`, mã nguồn cần vượt qua đủ 3 chốt kiểm tra tự động:

```bash
# 1. Kiểm tra kiểu tĩnh nghiêm ngặt (0 lỗi)
npm run typecheck

# 2. Chạy toàn bộ bộ kiểm thử đơn vị (11/11 suites)
npm test

# 3. Kiểm tra biên dịch sản xuất Next.js (Route Handlers, Types, Static/Dynamic routes)
npx next build --webpack
```

---

## 3. Quy Ước Thông Điệp Commit (Conventional Commits)

Dự án sử dụng chuẩn thông điệp ngắn gọn, rõ phạm vi để dễ theo dõi lịch sử thay đổi:
- `feat(<scope>): ...` — Tính năng mới (ví dụ: `feat(og): add dynamic Open Graph image via Takumi...`)
- `fix(<scope>): ...` — Sửa lỗi chức năng hoặc luồng dữ liệu (ví dụ: `fix(sharing): enable open invite links...`)
- `perf(<scope>): ...` — Tối ưu hiệu năng, dung lượng hoặc tốc độ đồng bộ
- `style(<scope>): ...` — Tinh chỉnh giao diện, văn bản hiển thị không đổi logic
- `docs(<scope>): ...` — Bổ sung hoặc cập nhật tài liệu

---

[← Trước: 05. Design System & UI/UX](./05-design-system-ui-ux.md) | [Tiếp theo: F01. Xác thực & Mời Link 2 người →](./chuc-nang/F01-xac-thuc-va-moi-link-2-nguoi.md)
