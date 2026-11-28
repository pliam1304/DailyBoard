[← Mục lục Docs](../index.md)

# 03. Nhật Ký Xử Lý Sự Cố Thực Chiến (Troubleshooting Log)

Tổng hợp các lỗi thực tế đã phát sinh trong quá trình xây dựng & vận hành **Nhật Kí (`DailyBoard`)**, kèm nguyên nhân gốc rễ và giải pháp triệt để.

---

## 1. Bảng Tổng Hợp Các Sự Cố Đã Xử Lý

| Mã | Phân Hệ | Triệu Chứng Chính | Mức Độ | Trạng Thái |
|:---:|---|---|:---:|:---:|
| **ERR-01** | Supabase / Chia sẻ | `permission denied for table board_invitations` khi bấm Tạo link mời | Cao | Đã xử lý |
| **ERR-02** | Auth & Link mời | Người thứ 2 vừa đăng ký/đăng nhập qua link mời nhưng bị rơi vào bảng cá nhân trống | Cao | Đã xử lý |
| **ERR-03** | UI Mời bạn | Hộp hiển thị link mời biến mất ngay sau khi tạo hoặc sau khi tải lại trang | Cao | Đã xử lý |
| **ERR-04** | Dynamic OG (Takumi) | Ảnh OG bị lỗi mất dấu tiếng Việt (`No font draws "ẬọảĐườộậ"`) | Trung bình | Đã xử lý |
| **ERR-05** | Xuất PNG (Safari) | Xuất thẻ tổng kết ngày trên Safari/iOS bị trắng ảnh hoặc thiếu ảnh Polaroid | Trung bình | Đã xử lý |
| **ERR-06** | Cấu hình Supabase | Lỗi kết nối khi người dùng dán Project URL có kèm hậu tố `/rest/v1/` | Thấp | Đã xử lý |

---

## 2. Phân Tích Chi Tiết & Giải Pháp

### ERR-01: `permission denied for table board_invitations`
- **Triệu chứng:** Khi người dùng đã đăng nhập bấm **Tạo link mời**, Supabase PostgREST trả về lỗi PostgreSQL `42501: permission denied for table board_invitations`.
- **Nguyên nhân gốc rễ:** Cơ sở dữ liệu live trên Supabase chưa được chạy khối `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tables> TO authenticated;` (chỉ mới cập nhật các hàm RPC nên role `authenticated` thiếu quyền thao tác mức bảng dù RLS policy đã hợp lệ).
- **Giải pháp:** Chạy khối `GRANT USAGE ON SCHEMA public` + `GRANT SELECT, INSERT, UPDATE, DELETE` cho toàn bộ 10 bảng tới `authenticated` (vẫn giữ `REVOKE ALL` với `anon` và bật RLS đầy đủ), kết thúc bằng `NOTIFY pgrst, 'reload schema';` để PostgREST làm mới cache quyền ngay lập tức.

---

### ERR-02: Người Thứ 2 Bị Tạo Nhầm Bảng Solo Khi Đăng Ký / Đăng Nhập Qua Link Mời
- **Triệu chứng:** Mở link `?invite=DIARY-...` rồi đăng ký tài khoản mới (vào ngay hoặc xác nhận link Gmail) nhưng không vào bảng chung.
- **Nguyên nhân gốc rễ:**
  1. Nhánh đăng ký có session ngay lập tức bỏ qua `acceptCloudInvitation`.
  2. `emailRedirectTo` không gắn `?invite=...` và mã mời không được lưu vào `localStorage`, làm mất mã sau khi chuyển từ Gmail về trình duyệt.
  3. Race condition: sự kiện `onAuthStateChange` kích hoạt `hydrateCloudUserBoard` trước khi `handleUserLogin`/`handleSignupRequestOtp` kịp truyền `inviteCode`.
- **Giải pháp:** Lưu mã mời kèm cờ `autoJoin = true` qua `savePendingInviteCode` **trước** khi gọi Auth API; đính `?invite=` vào `emailRedirectTo`; gom toàn bộ luồng gia nhập về một điểm duy nhất trong `hydrateCloudUserBoard` có khóa `inviteJoinInFlightRef`.

---

### ERR-03: Hộp Link Mời Tự Biến Mất Sau Khi Tạo
- **Triệu chứng:** Sau khi bấm tạo link mời, hộp chứa đường link hiện lên thoáng qua rồi biến mất khi đồng bộ với Supabase.
- **Nguyên nhân gốc rễ:** `handleInviteByEmail` đặt `activateDuoImmediately: true` (giả lập 2 thành viên ở local), sau đó `pullStoreFromSupabase` đọc `board_members` chỉ thấy 1 dòng nên đổi lại `isDuo = false`, trong khi hộp link mời trước đó bị đặt nhầm bên trong nhánh `{isDuo && ...}`.
- **Giải pháp:** Đặt `activateDuoImmediately: false` khi tạo lời mời trên cloud và đưa khối *Link mời đang mở* ra nhánh `{activeInvite && !isDuo}` trong `SharedBoardModal.tsx`.

---

### ERR-04: Font Mặc Định Của Takumi Thiếu Dấu Tiếng Việt
- **Triệu chứng:** Khi kiểm thử `/api/og` cục bộ, Takumi báo cảnh báo `No font draws "ẬọảĐườộậ"` và ký tự tiếng Việt hiển thị sai.
- **Nguyên nhân gốc rễ:** Font mặc định nhúng trong Takumi không bao phủ đầy đủ bảng mã Latin Extended (tiếng Việt có dấu).
- **Giải pháp:** Đóng gói sẵn `BeVietnamPro-SemiBold.ttf` và `BeVietnamPro-ExtraBold.ttf` trong `src/assets/fonts/` và truyền trực tiếp vào tùy chọn `fonts` của `ImageResponse` tại `src/app/api/og/route.tsx`.

---

### ERR-05: Xuất Thẻ PNG Bị Trắng Ảnh Trên Safari / WebKit
- **Triệu chứng:** Bấm tải ảnh PNG trong `DailySnapshotModal` hoạt động bình thường trên Chrome nhưng bị thiếu ảnh Polaroid hoặc ra khung trắng trên Safari iOS/macOS.
- **Nguyên nhân gốc rễ:** WebKit không hoàn tất tải/decode tài nguyên bên trong SVG `foreignObject` ở lần vẽ đầu tiên của `html-to-image`.
- **Giải pháp:** Xây dựng hàm `exportScrapbookNodeToPng` (`src/lib/snapshotExport.ts`) chờ `document.fonts.ready`, đảm bảo toàn bộ thẻ `<img>` đã decode xong và chạy bước warm-up trước khi xuất bản PNG cuối cùng.

---

### ERR-06: Lỗi Khởi Tạo Client Khi URL Supabase Có `/rest/v1/`
- **Triệu chứng:** Dán URL API dạng `https://<ref>.supabase.co/rest/v1/` khiến Supabase client gọi sai đường dẫn Auth/Storage.
- **Nguyên nhân gốc rễ:** `createClient` của `@supabase/supabase-js` yêu cầu origin gốc, không có `/rest/v1/`.
- **Giải pháp:** Chuẩn hóa URL trong `getSupabaseClient` (`src/lib/supabaseSync.ts`) tự động cắt hậu tố `/rest/v1/?$` và dấu `/` thừa ở cuối.

---

[← Trước: 02. Quyết định kiến trúc (ADR)](./02-quyet-dinh-kien-truc-adr.md) | [Về Trang chủ Docs ↑](../index.md)
