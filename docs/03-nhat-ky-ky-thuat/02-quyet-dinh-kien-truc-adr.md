[← Mục lục Docs](../index.md)

# 02. Nhật Ký Quyết Định Kiến Trúc (ADR — Architectural Decision Records)

Tài liệu ghi nhận các quyết định kỹ thuật quan trọng, bối cảnh phát sinh và phân tích đánh đổi trong quá trình phát triển **Nhật Kí (`DailyBoard`)**.

---

## ADR-01: Chọn Kiến Trúc Local-First (IndexedDB + Slim LocalStorage + Outbox) Kết Hợp Supabase Realtime
- **Bối cảnh:** Ứng dụng nhật ký thường được mở nhanh trên điện thoại lúc đi ngoài đường hoặc ban đêm khi mạng chập chờn. Gọi API trực tiếp mỗi thao tác sẽ gây độ trễ rõ rệt và mất dữ liệu nếu rớt mạng.
- **Quyết định:** Lưu mọi thay đổi tức thì vào bộ nhớ cục bộ (ảnh/audio trong IndexedDB, metadata nhẹ trong LocalStorage), xếp từng thao tác nhỏ vào hàng đợi `OutboxOp` theo tài khoản, và đồng bộ lên Supabase khi trực tuyến kết hợp vá Realtime Delta dưới 20ms.
- **Đánh đổi:** Phức tạp hơn CRUD thuần ở khâu hợp nhất dữ liệu (`mergeStoresPreservingMedia`) và quản lý Outbox, nhưng đổi lại trải nghiệm phản hồi tức thì `0ms` và không mất dữ liệu khi ngoại tuyến.

---

## ADR-02: Giữ Hệ Sinh Thái Next.js 16 + React 19 Thay Vì Viết Lại Sang SvelteKit / Nuxt
- **Bối cảnh:** Có ý kiến đánh giá SvelteKit/Nuxt nhẹ JS phía trình duyệt hơn Next.js.
- **Quyết định:** Tiếp tục tối ưu trên nền Next.js + React hiện tại (dùng `next/dynamic` tách 9 modal nặng, build `--webpack` ổn định) thay vì viết lại toàn bộ sang framework khác.
- **Lý do:** Toàn bộ 25+ component tương tác phức tạp (vật lý 2D Hũ Viên Nang, Polaroid 3D Flip, Lofi Player, Snapshot Export, Outbox/Realtime) đã ổn định và vượt qua kiểm thử. Chi phí viết lại 100% UI sẽ cao và rủi ro phát sinh lỗi hồi quy lớn hơn nhiều so với lợi ích giảm vài chục KB JS ở quy mô ứng dụng cá nhân.

---

## ADR-03: Dùng Takumi (`@takumi-rs/image-response`) Kèm Font `BeVietnamPro` Cục Bộ Cho Dynamic OG Image
- **Bối cảnh:** Khi gửi link ứng dụng hoặc link mời 2 người qua Zalo/Messenger/Discord, cần ảnh xem trước `1200×630` sắc nét và hiển thị chuẩn dấu tiếng Việt.
- **Quyết định:** Triển khai Route Handler `/api/og` bằng Takumi (Rust native image renderer), khai báo `serverExternalPackages` trong `next.config.ts` và nhúng trực tiếp 2 tệp font `BeVietnamPro-SemiBold.ttf` & `BeVietnamPro-ExtraBold.ttf` tại `src/assets/fonts/`.
- **Lý do:** Nhanh hơn giải pháp chạy headless browser, không phụ thuộc tải font từ CDN ngoài lúc runtime và giải quyết triệt để lỗi thiếu glyph tiếng Việt của font mặc định.

---

## ADR-04: Mã Hóa Đầu Cuối `AES-GCM 256-bit` Phía Client & Xoay Vòng PIN Nguyên Tử
- **Bối cảnh:** Dù PostgreSQL RLS đã chặn người khác đọc `is_private = true`, dữ liệu riêng tư nhạy cảm vẫn nên được mã hóa trước khi rời khỏi trình duyệt.
- **Quyết định:** Mã hóa nội dung Tâm thư & Viên nang riêng tư bằng `PBKDF2 + AES-GCM 256-bit` dẫn xuất từ mã PIN; khi đổi hoặc gỡ PIN, hàm `rotateNotesPinEncryption` bắt buộc xác thực PIN cũ rồi giải mã và mã hóa lại toàn bộ ghi chú riêng tư trong một lượt nguyên tử.
- **Lý do:** Bảo vệ quyền riêng tư tối đa ngay cả ở tầng lưu trữ DB mà không sợ kẹt dữ liệu cũ khi người dùng đổi mã PIN.

---

## ADR-05: Thiết Kế Open Invite Link (`open@invite.local`) Qua `SECURITY DEFINER` RPC
- **Bối cảnh:** Cơ chế mời ban đầu bắt buộc Người 1 nhập chính xác email Người 2 trước khi tạo link, gây bất tiện khi gửi nhanh qua tin nhắn và dễ lỗi nếu Người 2 đăng ký bằng email khác.
- **Quyết định:** Hỗ trợ **Link mời mở** (dùng email chuẩn `open@invite.local` khi bỏ trống ô email), xử lý kiểm tra & gia nhập qua hàm SQL `accept_board_invitation` (`SECURITY DEFINER`) và xem trước qua `preview_board_invitation`.
- **Lý do:** Cho phép người thứ 2 chỉ cần bấm 1 đường link, đăng nhập hoặc tạo tài khoản mới bằng bất kỳ email nào là vào thẳng bảng chung, vẫn giữ ràng buộc tối đa 2 người và chặn tự mời chính mình ở tầng DB.

---

## ADR-06: Dùng Node.js Native Test Runner (`node:test`) Cho Tầng Domain `src/lib/`
- **Bối cảnh:** Cần kiểm thử tự động các quy tắc bảo mật, ngày tháng, đồng bộ, viên nang và mời link mà không làm nặng `node_modules`.
- **Quyết định:** Tách sạch logic thuần vào `src/lib/` và viết bộ test chạy trực tiếp bằng `node --test tests/core.test.ts`.
- **Lý do:** Không thêm bất kỳ devDependency test nào, chạy trọn vẹn 11 suites trong ~240ms.

---

## Định Hướng Mở Rộng Tương Lai (Open Design Notes — Chưa Triển Khai)

> [!NOTE]
> Mục dưới đây ghi lại các ý tưởng kiến trúc & tính năng cho các phiên bản tiếp theo, **chưa triển khai trong mã nguồn hiện tại**:
>
> 1. **Tái thiết kế vai trò bình đẳng & Phạm vi chia sẻ khi ghép 2 người:**
>    - **Vai trò ngang hàng (Co-Owners):** Xem xét bỏ sự phân biệt cứng giữa `owner` và `partner` sau khi 2 người đã cùng tham gia bảng chung, để cả hai có quyền hạn bình đẳng như nhau trên không gian chung.
>    - **Tùy chọn mốc thời gian & phạm vi đồng bộ khi mời:** Khi gửi lời mời ghép bảng, cho phép người mời chọn giữa *chỉ đồng bộ dữ liệu mới từ thời điểm ghép bảng trở đi* (giữ kín lịch sử cũ) hoặc *chia sẻ toàn bộ dữ liệu trước đó*.
>    - **Kiểm soát hiển thị linh hoạt hơn (Visibility Controls):** Cho phép chọn mức độ hiển thị (chung / chỉ mình tôi) trực quan hơn theo từng hạng mục dữ liệu thay vì chỉ giới hạn ở ghi chú riêng tư.
> 2. **Bổ sung lớp ORM trung gian giữa Supabase PostgreSQL & Ứng dụng (đề xuất: Drizzle ORM):**
>    - Thêm lớp truy vấn type-safe (Drizzle ORM + schema TypeScript + migration chuẩn hóa) ở tầng Server/API Route Handlers thay vì gọi query trực tiếp kiểu string từ client, giúp kiểm soát schema chặt chẽ và giảm phụ thuộc vào SDK PostgREST.
> 3. **Đánh giá nâng cấp xác thực với Better Auth:**
>    - Nghiên cứu tích hợp **Better Auth** (hỗ trợ sẵn Passkey/WebAuthn, OAuth đa nhà cung cấp, 2FA TOTP, quản lý session/thiết bị chi tiết, plugin Drizzle adapter) kết hợp với lớp ORM ở mục (2), đồng thời thiết kế phương án tương thích với bảo mật bảng (chuyển phân quyền sang tầng Server/API hoặc cấp custom JWT cho Supabase Realtime/Storage).

---

[← Trước: 01. Lịch sử phiên bản (Changelog)](./01-lich-su-phien-ban-changelog.md) | [Tiếp theo: 03. Nhật ký xử lý sự cố →](./03-xu-ly-su-co-troubleshooting.md)
