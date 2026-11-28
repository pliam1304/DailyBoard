[← Mục lục Docs](../index.md)

# 04. Hướng Dẫn Cài Đặt, Triển Khai & Cài PWA Đa Nền Tảng

## 1. Yêu Cầu Môi Trường

- **Node.js:** Phiên bản `20.x` trở lên và `npm`.
- **Trình duyệt:** Safari (iOS/macOS), Chrome, Edge hoặc Firefox hiện đại.
- *(Tùy chọn cho đồng bộ đa thiết bị & 2 người)* Tài khoản miễn phí trên [Supabase](https://supabase.com) và [Vercel](https://vercel.com).

---

## 2. Chạy Trên Máy Cá Nhân (Local-First)

Ở chế độ mặc định, ứng dụng chạy hoàn toàn cục bộ trên IndexedDB + LocalStorage mà không cần cấu hình bất kỳ khóa API nào:

```bash
git clone https://github.com/pliam1304/DailyBoard.git
cd DailyBoard
npm install
npm run dev
```

Mở trình duyệt tại:
- `http://localhost:3000` — Bảng nhật ký đầy đủ
- `http://localhost:3000/widget` — Chế độ Mini-Widget gọn nhẹ cho MacBook/PC

---

## 3. Thiết Lập Cloud Sync & Bảng Chung 2 Người (Supabase)

1. Tạo project mới trên [supabase.com](https://supabase.com).
2. Vào **SQL Editor → New query**, dán toàn bộ nội dung file [`supabase/schema.sql`](../../supabase/schema.sql) và bấm **Run**.
   - Script có tính **idempotent** (chạy lại nhiều lần không lỗi): tự tạo 10 bảng, bật RLS, cấp quyền `GRANT` chuẩn cho `authenticated`, tạo 7 hàm RPC (`ensure_personal_board`, `preview_board_invitation`, `accept_board_invitation`...), tạo bucket riêng tư `daily-photos` và bật Realtime.
3. Vào **Project Settings → API** lấy 2 khóa công khai (`Project URL` và `anon / publishable key`), sao chép `.env.example` thành `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-publishable-or-anon-key>
   # Tùy chọn nếu muốn duyệt playlist Spotify cá nhân:
   NEXT_PUBLIC_SPOTIFY_CLIENT_ID=
   ```
4. **Cấu hình xác thực Email (Authentication → Providers → Email):**
   - Nếu muốn người dùng đăng ký vào ngay không cần đợi email: tắt *Confirm email*.
   - Nếu bật *Confirm email* kèm mã 6 số: vào **Authentication → Email Templates → Confirm signup** và bổ sung biến `{{ .Token }}` vào mẫu thư.

> [!WARNING]
> Tuyệt đối **không** đưa `service_role` key (`sb_secret_*`) vào `.env.local` hay biến môi trường `NEXT_PUBLIC_*`. Ứng dụng đã có lớp kiểm tra `isLikelyServiceRoleKey` chặn sẵn nếu dán nhầm.

---

## 4. Triển Khai Lên Vercel (HTTPS Miễn Phí)

1. Kết nối repository GitHub với [vercel.com](https://vercel.com) → **Add New Project**.
2. Khai báo các **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - *(Tùy chọn)* `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`
3. Bấm **Deploy**.
   - File `vercel.json` sẽ tự kích hoạt Cron Job gọi `/api/keep-alive` lúc `03:00` mỗi 3 ngày (`0 3 */3 * *`) giúp database Supabase gói miễn phí không bị tạm dừng.

---

## 5. Cài Đặt Như App Thật Trên iPhone (PWA) & Mời Người Thứ 2

1. **Cài PWA trên iPhone:** Mở địa chỉ Vercel bằng **Safari** → bấm nút **Chia sẻ (Share)** → chọn **Thêm vào Màn hình chính (Add to Home Screen)**.
2. **Mời người thứ 2:**
   - Mở app → bấm **Mời bạn** trên thanh tiêu đề → bấm **Tạo link mời** (có thể để trống email để tạo Link mời mở).
   - Gửi link (`/?invite=DIARY-XXXXXXXX`) qua Zalo/Messenger/iMessage; người thứ 2 mở link và **Đăng nhập** hoặc **Tạo tài khoản mới** là vào thẳng bảng chung (hoặc dán link/mã vào mục *Tham gia bảng của người khác* nếu mở trong PWA độc lập).

---

[← Trước: 03. Sản phẩm đầu ra & Ấn phẩm](./03-san-pham-dau-ra-va-an-pham.md) | [Tiếp theo: Phần III — 01. Lịch sử phiên bản (Changelog) →](../03-nhat-ky-ky-thuat/01-lich-su-phien-ban-changelog.md)
