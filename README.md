# Nhật Kí (Diary) — Scrapbook Lofi & Mèo

Ứng dụng nhật ký cá nhân đa nền tảng (**iPhone PWA, MacBook & PC**) kết hợp không gian **Bảng Ghim Scrapbook Cozy**, **chú mèo Lofi đồng hành**, **nhạc YouTube/Spotify**, **tâm thư**, **nhắc nhở & lời nhắc đã làm**, **tài chính theo cảm xúc** và **xuất ảnh báo cáo cuối ngày (PNG)**. Bảng mặc định khi khởi tạo mang tên **`Name`**.

## Chạy ứng dụng trên máy

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000` (giao diện đầy đủ) hoặc `http://localhost:3000/widget` (chế độ **Mini-Widget** gọn nhẹ ghim góc màn hình trên MacBook & PC).

## Chế độ 1 người & Bảng chung 2 người (Him & Her)

- **Mặc định là bảng cá nhân 1 người** gọn gàng với 1 chú mèo bên cửa sổ.
- Bấm nút **Mời người thứ 2** trên thanh tiêu đề để nhập **email người ấy** — bảng tự động chuyển sang **chế độ 2 người** (biệt danh mặc định **`Him`** 💙 và **`Her`** 💚, cả hai có thể tự do đổi biệt danh cho nhau và đặt tên 2 chú mèo).
- Khi kết nối **Supabase**, mọi ảnh Polaroid, ghi chú chung, nhắc nhở, tài chính, nhạc lofi, trạng thái đang online cùng nhau và nút gửi tim **♡** đều đồng bộ liên tục qua Supabase Realtime (riêng **Tâm thư riêng tư** vẫn chỉ người viết mới xem được).

## Dùng như App trên iPhone & đồng bộ MacBook/PC

1. **Chế độ Local-First (mặc định):** Toàn bộ ảnh Polaroid, ghi chú, nhắc nhở, tài chính được lưu ngay trên thiết bị (IndexedDB + LocalStorage) — dùng được ngay không cần cấu hình.
2. **Đồng bộ Cloud đa thiết bị (Supabase):**
   - Tạo project miễn phí trên [Supabase](https://supabase.com) và chạy nội dung file [`supabase/schema.sql`](supabase/schema.sql) trong **SQL Editor**.
   - Điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` vào `.env.local` (xem `.env.example`) hoặc nhập trực tiếp trong mục **Cài đặt (⚙️)** của app.
   - Đăng nhập cùng một tài khoản trên iPhone, MacBook và PC để đồng bộ dữ liệu & ảnh realtime.
3. **Cài trên iPhone như App thật (PWA):** Mở địa chỉ web trong Safari trên iPhone → bấm **Chia sẻ (Share)** → **Thêm vào Màn hình chính (Add to Home Screen)**.

## Nguồn nhạc hỗ trợ

- **YouTube Auto-Play:** Dán bất kỳ link video, livestream hoặc playlist YouTube nào vào ô nhập nhạc — app tự lấy tiêu đề và phát ngay không cần API key.
- **Spotify (Free & Premium):** Dán link bài hát, album hoặc playlist Spotify để nghe trực tiếp qua Spotify Embed; hoặc thêm `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` để đăng nhập và chọn trực tiếp playlist cá nhân.
- **Âm thanh Lofi nền:** Bộ trộn tiếng mưa rơi, tiếng mèo gừ (*purr*) và lửa ấm tích hợp sẵn bằng Web Audio API.
