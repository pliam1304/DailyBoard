# Hướng Dẫn Đưa Nhật Kí (Diary) Lên Online (Miễn Phí 0đ — Dùng Thật Trên iPhone, MacBook & PC)

Để mở **Camera trực tiếp trên iPhone Safari**, dùng **PWA như app thật**, bật **thông báo** và **đồng bộ realtime 2 người (`Him & Her`)**, bạn chỉ cần làm theo 3 bước sau (mất khoảng 5 phút):

## Bước 1: Tạo Database & Lưu Ảnh miễn phí trên Supabase

1. Đăng ký tài khoản miễn phí tại [supabase.com](https://supabase.com) → bấm **New Project**.
2. Vào menu **SQL Editor** → tạo query mới → copy toàn bộ nội dung file [`supabase/schema.sql`](supabase/schema.sql) và bấm **Run**.
3. Vào **Project Settings → API** và lưu lại 2 giá trị:
   - `Project URL` (`https://xxxx.supabase.co`)
   - `anon public key`
4. Vào **Authentication → Providers → Email**: bật *Confirm email*.
5. Để gửi **Mã xác thực 6 chữ số về Gmail** khi người dùng mới đăng ký: vào **Authentication → Email Templates → Confirm signup**, thêm biến `{{ .Token }}` vào nội dung email (ví dụ: `Mã xác thực tạo bảng mới của bạn là: <b>{{ .Token }}</b>`).

## Bước 2: Đưa Web App lên Vercel (HTTPS miễn phí)

1. Push thư mục `AppCaNhan` lên một repository riêng tư trên GitHub.
2. Đăng nhập [vercel.com](https://vercel.com) → **Add New Project** → chọn repo `AppCaNhan`.
3. Trong mục **Environment Variables**, thêm:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL ở Bước 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key ở Bước 1
   - *(Tùy chọn)* `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` nếu muốn đăng nhập lấy danh sách playlist Spotify cá nhân.
4. Bấm **Deploy** → nhận link HTTPS riêng của bạn (ví dụ `https://catyboard.vercel.app`).

## Bước 3: Cài lên iPhone & Mời người thứ 2

1. **Trên iPhone:** Mở link Vercel trong **Safari** → bấm nút **Chia sẻ (Share)** → **Thêm vào Màn hình chính (Add to Home Screen)**.
2. Mở app từ màn hình chính → bấm biểu tượng **⚙️ (Cài đặt)** → đăng ký tài khoản bằng email của bạn → bật **Thông báo nhắc nhở**.
3. Bấm nút **Mời người thứ 2** trên thanh tiêu đề → nhập email của người ấy → gửi đường link mời (`/?invite=CATY-...`) cho người ấy đăng nhập bằng đúng email đó. Từ lúc đó cả hai dùng chung 1 bảng và đồng bộ ảnh Polaroid, ghi chú, nhắc nhở, tài chính & nhạc lofi theo thời gian thực!

---

## Checklist Bảo Mật Trước Khi Launch (20/20)

* **Đã khóa sẵn trong code & SQL (`next.config.ts`, `src/lib/security.ts`, `supabase/schema.sql`):**
  * Chỉ dùng public `anon` key (chặn dán nhầm `service_role` key), `.gitignore` chặn `.env*` / `*.key` / `*.pem`.
  * Bật **RLS** trên toàn bộ 10 bảng + bucket riêng tư `daily-photos`, tâm thư riêng tư khóa theo `author_id = auth.uid()`.
  * **Chặn sửa trái phép (Anti-Tampering Triggers):** thành viên không thể tự nâng `role` thành `owner`, đổi `owner_id`, hay chuyển `board_id`/`author_id`.
  * **Băm mã PIN Tâm Thư** bằng salted `SHA-256` (Web Crypto API) — không lưu chữ thường; mật khẩu đăng nhập do Supabase Auth băm bằng `bcrypt` + luồng `PKCE`.
  * **Giới hạn Upload & Validate Input:** chỉ nhận ảnh `JPEG/PNG/WebP` tối đa 5MB trên Supabase Storage (chặn SVG/script), kiểm tra kích thước & cấu trúc file Backup JSON, lọc URL `https://` hợp lệ, tự động escape XSS qua React.
  * **Trim API Responses:** chỉ truy vấn đúng cột cần thiết thay vì `select('*')`.
  * **Security Headers & Force HTTPS:** bật `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` trong [`next.config.ts`](next.config.ts).
  * **Rate Limit phía client:** khóa tạm thời sau 5 lần nhập sai PIN hoặc sai mật khẩu liên tiếp.
* **2 mục bật thêm trên Supabase Dashboard (mất 1 phút) khi chạy online:**
  1. **Rate Limit Login (mục 11):** Vào *Supabase Dashboard → Authentication → Rate Limits* để giữ giới hạn đăng nhập/tạo tài khoản mặc định ở server.
  2. **Bot Protection (mục 12):** Vào *Authentication → Attack Protection → Enable Captcha (Cloudflare Turnstile)* nếu bạn muốn chia sẻ link public rộng rãi.

