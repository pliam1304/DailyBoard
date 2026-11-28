[← Mục lục Docs](../index.md)

# 04. Kiến Trúc Bảo Mật & Quyền Riêng Tư

## 1. Mô Hình Phân Quyền & Cách Ly Dữ Liệu (RLS)

Toàn bộ 10 bảng dữ liệu trong PostgreSQL đều bật **Row Level Security (`ENABLE ROW LEVEL SECURITY`)**. Quyền truy cập được tách rạch ròi theo 3 mức vai trò:

| Tài nguyên / Thao tác | `anon` (Chưa đăng nhập) | `owner` (Chủ bảng) | `partner` (Thành viên thứ 2) |
|---|:---:|:---:|:---:|
| Đọc/ghi trực tiếp 10 bảng `public.*` | Bị thu hồi (`REVOKE ALL`) | Chỉ bảng mình tham gia | Chỉ bảng mình tham gia |
| Gọi `preview_board_invitation(code)` | Chỉ metadata xem trước | Cho phép | Cho phép |
| Tạo / Thu hồi lời mời (`board_invitations`) | Không | Cho phép | Không |
| Đọc / Sửa / Xóa dữ liệu chung (ảnh, nhắc việc, chi tiêu, nhạc, ghi chú chung) | Không | Cho phép | Cho phép |
| Đọc / Sửa / Xóa **Tâm thư riêng tư (`is_private = true`)** | Không | Chỉ khi `author_id = auth.uid()` | Chỉ khi `author_id = auth.uid()` |
| Đổi biệt danh & màu trái tim (`board_members`) | Không | Cho phép (cả 2 người) | Cho phép (cả 2 người) |
| Ngắt kết nối / Rời bảng chung | Không | Gỡ `partner` khỏi bảng | Tự rời về bảng cá nhân |
| Upload / Xem / Xóa ảnh trong `daily-photos` | Không | Chỉ thư mục `<board_id>/*` | Chỉ thư mục `<board_id>/*` |

> [!NOTE]
> **Nguyên tắc Phòng Thủ Nhiều Lớp (Defense in Depth):** Ngay cả khi có lỗi ở tầng giao diện, tầng PostgreSQL vẫn chặn mọi truy vấn chéo bảng qua RLS và chặn mọi hành vi leo thang quyền (`partner` → `owner`, đổi `owner_id`, đổi `author_id`) bằng 3 `BEFORE UPDATE` triggers.

---

## 2. Mã Hóa Đầu Cuối Phía Client (E2EE — `src/lib/security.ts`)

### 2.1. Băm Mã PIN Tâm Thư (`Salted SHA-256`)
- Mã PIN bảo vệ Tâm thư & Màn hình riêng tư **không bao giờ lưu dạng chữ thường**.
- Sử dụng Web Crypto API (`crypto.subtle.digest('SHA-256', ...)`) kết hợp salt ngẫu nhiên 16 byte, lưu dưới định dạng chuẩn `v2$<salt_hex>$<hash_hex>`.
- Tích hợp **Client Rate Limiter** (`checkRateLimit` / `recordRateLimitFailure`): khóa tạm thời 30 giây sau 5 lần nhập sai PIN hoặc sai mật khẩu liên tiếp.

### 2.2. Mã Hóa Nội Dung Riêng Tư (`AES-GCM 256-bit`)
- Mọi Tâm thư hoặc Viên nang đánh dấu `isPrivate: true` khi có mã PIN đều được mã hóa ngay trên trình duyệt trước khi lưu xuống IndexedDB hoặc đẩy lên Supabase:
  1. Dẫn xuất khóa 256-bit từ mã PIN bằng **PBKDF2** (`SHA-256`, salt ngẫu nhiên mỗi lần mã hóa).
  2. Mã hóa nội dung bằng **AES-GCM** với IV ngẫu nhiên 12 byte.
  3. Chuỗi đầu ra có tiền tố nhận diện chuẩn (`enc:v1:...`), bảo đảm 2 lần mã hóa cùng 1 nội dung tạo ra 2 bản mã hoàn toàn khác nhau.

### 2.3. Xoay Vòng & Gỡ Mã PIN Nguyên Tử (`rotateNotesPinEncryption`)
- Để tránh tình trạng đổi PIN rồi không mở lại được các ghi chú đã mã hóa bằng PIN cũ, hàm `rotateNotesPinEncryption` ép buộc:
  - Phải xác thực đúng **PIN hiện tại** trước khi đổi hoặc gỡ PIN.
  - Tự động giải mã toàn bộ ghi chú/viên nang thuộc quyền sở hữu của người thao tác, sau đó mã hóa lại bằng PIN mới (hoặc đưa về plaintext khi gỡ PIN) trong cùng một lượt cập nhật rồi đồng bộ lại lên Outbox.

---

## 3. Phòng Thủ Ứng Dụng & HTTP Security Headers

### Bảo vệ tầng Client (`src/lib/security.ts`)
- **Chặn rò rỉ khóa bí mật:** `isLikelyServiceRoleKey` tự động phát hiện và từ chối chạy nếu ai đó dán nhầm JWT `service_role` hoặc khóa `sb_secret_*` vào cấu hình trình duyệt.
- **Chống XSS qua URL & Backup:** `validateSafeHttpUrl` chỉ chấp nhận `https://` (và `http://localhost` khi dev), chặn `javascript:`/`data:`. `validateBackupPayload` kiểm duyệt kích thước, cấu trúc JSON và lọc sạch URL độc hại trước khi khôi phục.
- **Kiểm duyệt file upload:** `validateImageFile` chấp nhận ảnh di động kể cả `HEIC/HEIF` (không có MIME trên một số phiên bản iOS), nhưng chặn tuyệt đối `.svg` / `image/svg+xml` và file vượt giới hạn kích thước.
- **Privacy Shield 1 chạm (`Cmd + Shift + L`):** Phủ lớp kính mờ che toàn bộ bảng khi đang ở nơi công cộng; yêu cầu nhập PIN để mở nếu người dùng đã đặt mã PIN.

### HTTP Security Headers (`next.config.ts`)
Tất cả route của ứng dụng đều đi kèm bộ header bảo mật chuẩn sản xuất (`poweredByHeader: false`):

| Header | Giá trị áp dụng | Mục đích |
|---|---|---|
| `Content-Security-Policy` | Khóa chặt `default-src 'self'`, chỉ mở `connect-src` tới `*.supabase.co`, `youtube.com`, `api.spotify.com` và `frame-src` tới YouTube/Spotify Embed | Ngăn XSS, chèn script và iframe độc hại |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (Production) | Ép buộc kết nối HTTPS |
| `X-Content-Type-Options` | `nosniff` | Chống MIME-sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Chống Clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Hạn chế rò rỉ tham số URL (như `?invite=`) sang tên miền ngoài |
| `Permissions-Policy` | `camera=(self), microphone=(self), geolocation=(), payment=(), usb=()` | Chỉ cấp quyền Camera/Micro cho chính ứng dụng |

---

[← Trước: 03. Cơ sở dữ liệu & ERD](./03-co-so-du-lieu-erd.md) | [Tiếp theo: 05. Design System & UI/UX →](./05-design-system-ui-ux.md)
