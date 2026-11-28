[← Mục lục Docs](../index.md)

# 02. Các Giải Pháp Tối Ưu Hiệu Năng & Trải Nghiệm Mượt Mà

## 1. Mục Tiêu Hiệu Năng

Vì **Nhật Kí (`DailyBoard`)** chạy thường xuyên trên **điện thoại di động (iOS Safari PWA)** với bộ nhớ hạn chế và điều kiện mạng không ổn định, việc tối ưu tập trung vào 4 tiêu chí:
1. Tốc độ khởi động ban đầu nhanh (giảm JS bundle tải lần đầu).
2. Không bao giờ giật khung hình khi gõ chú thích/ghi chú hoặc tràn hạn mức lưu trữ 5MB của `localStorage`.
3. Tiết kiệm tối đa số lượt gọi HTTP và dung lượng ảnh khi đồng bộ qua Supabase.
4. Giữ dịch vụ gói miễn phí (Supabase Free Tier) luôn sẵn sàng, không bị ngủ đông.

---

## 2. Sáu Kỹ Thuật Tối Ưu Đã Triển Khai

| Kỹ thuật | Vấn đề gốc | Giải pháp trong mã nguồn | Kết quả đạt được |
|---|---|---|---|
| **1. Slim LocalStorage + IndexedDB** | Lưu ảnh base64 & audio trực tiếp vào `localStorage` làm tràn quota 5MB và đơ main thread khi `JSON.stringify` | `stripHeavyMediaForLocalStorage` tách ảnh/audio sang IndexedDB, chỉ giữ metadata nhẹ trong `localStorage`; `mergeStoresPreservingMedia` hợp nhất an toàn khi tải lại (`src/lib/storage.ts`) | Tránh hoàn toàn `QuotaExceededError`, dung lượng `localStorage` giảm xuống vài chục KB |
| **2. Debounced Persistence & Input** | Lưu toàn bộ store theo từng phím gõ gây khựng trên mobile | `scheduleSaveStore` gom nhóm thao tác lưu; `PolaroidCaptionInput` giữ state cục bộ và debounce trước khi đẩy lên parent | Gõ chữ liên tục mượt mà, giảm >90% số lần ghi đĩa thừa |
| **3. Nén Ảnh WebP Phía Client** | Ảnh chụp từ camera iPhone thường nặng 3MB–8MB, tải chậm và tốn dung lượng bucket | Nén & thu gọn kích thước ảnh ngay trên trình duyệt (`src/lib/media.ts`) trước khi lưu IndexedDB và upload lên `daily-photos` | Dung lượng mỗi tấm Polaroid giảm 5–10 lần, tải tức thì trên 4G |
| **4. Batch Signed URLs + Cache 20 giờ** | Ký từng ảnh Polaroid bằng N lời gọi `createSignedUrl` tuần tự làm chậm quá trình mở bảng | Gom toàn bộ đường dẫn chưa cache vào **1 lời gọi duy nhất** `createSignedUrls(...)` và lưu trong `signedUrlCache` với TTL **20 giờ** (`src/lib/supabaseSync.ts`) | Rút từ N lượt round-trip xuống còn **1 HTTP request** duy nhất |
| **5. Dynamic Code Splitting (`next/dynamic`)** | Nạp trước mã nguồn của Calendar, 3D Capsule Jar, Snapshot Export, Cozy Desk, Bonfire làm nặng trang đầu | Tách riêng 9 modal lớn qua `next/dynamic(..., { ssr: false })` trong `src/components/CatyBoardApp.tsx` | Giảm đáng kể kích thước JS tải ban đầu, trang *Hôm nay* hiện nhanh hơn |
| **6. Realtime Delta Patching & Keep-Alive Cron** | Kéo lại cả 10 bảng mỗi khi người thứ 2 tick 1 việc làm tốn băng thông; Supabase Free Tier tự tạm dừng sau 7 ngày không có truy vấn | `applyRealtimeDelta` vá trực tiếp bản ghi thay đổi trong **< 20ms**; cấu hình Vercel Cron (`vercel.json`) gọi `/api/keep-alive` mỗi 3 ngày (`0 3 */3 * *`) | Đồng bộ 2 người gần như tức thời và giữ database luôn hoạt động ổn định |

---

[← Trước: 01. Kiểm thử tự động](./01-kiem-thu-tu-dong.md) | [Tiếp theo: 03. Sản phẩm đầu ra & Ấn phẩm →](./03-san-pham-dau-ra-va-an-pham.md)
