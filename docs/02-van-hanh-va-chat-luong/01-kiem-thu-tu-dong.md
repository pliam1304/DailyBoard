[← Mục lục Docs](../index.md)

# 01. Báo Cáo Kiểm Thử Tự Động (Unit Testing)

## 1. Chiến Lược Kiểm Thử

Để giữ cho dự án cá nhân gọn nhẹ nhưng vẫn đảm bảo độ tin cậy cao mỗi lần thêm tính năng hoặc refactor, toàn bộ logic nghiệp vụ thuần tại `src/lib/` được kiểm thử bằng **Node.js Native Test Runner (`node:test` + `node:assert/strict`)** — không cần cài thêm các framework test nặng (Jest/Vitest):

- **Tệp kiểm thử:** [`tests/core.test.ts`](../../tests/core.test.ts)
- **Tổng số test suites:** **11 suites**
- **Tỷ lệ vượt qua:** **100% (`11/11` Passed)**
- **Thời gian chạy trung bình:** **~240ms**

---

## 2. Bảng Chi Tiết 11 Unit Test Suites

| STT | Tên Test Suite | Phạm Vi Kiểm Chứng | Trạng Thái |
|:---:|---|---|:---:|
| **1** | `parseMusicUrl` (YouTube) | Link xem video, link rút gọn `youtu.be`, livestream và playlist kèm `autoplay=1` | Passed |
| **2** | `parseMusicUrl` (Spotify) | Link track và playlist Spotify quốc tế (`/intl-vi/playlist/...`), từ chối URL rác | Passed |
| **3** | `date helpers` | Dịch ngày qua tháng (`shiftDateKey`), parse ngày cục bộ (`toLocalDateKey`), ma trận lịch tháng chia hết cho 7 và định dạng `45.000đ` | Passed |
| **4** | `sharing` (Solo → Duo) | Khởi tạo bảng 1 người (`Him`), mời người 2, tạo URL mời `?invite=DIARY-`, đổi biệt danh 2 chiều và quay về bảng 1 người | Passed |
| **5** | `normalizeStoreData` & `createUuid` | Nâng cấp an toàn dữ liệu cũ `v1 → v3`, mặc định tên bảng `Name`, kiểm tra định dạng UUID v4 | Passed |
| **6** | `prompts`, `streak` & `monthlyWrapped` | Tính ổn định của câu hỏi ngày, tem phim retro (`'26 11 20`), chuỗi check-in nhanh, thống kê Monthly Wrapped | Passed |
| **7** | `search`, `throwback`, `fishPoints` & `recurrence` | Tìm bình luận ảnh & thu âm, chặn rò rỉ nội dung ghi chú riêng tư, chọn ảnh Throwback, tính điểm cá, mở rộng nhắc việc `daily`/`weekly` | Passed |
| **8** | `security helpers` | Băm PIN Salted SHA-256, phát hiện `service_role` key, lọc URL an toàn, kiểm duyệt upload (HEIC/SVG/>25MB), rate limiter 5 lần sai, lọc backup JSON, mã hóa/giải mã **AES-GCM 256-bit** | Passed |
| **9** | `capsule metadata` & `streak shields` | Encode/decode 7 đoạn viên nang + tương thích ngược 4 đoạn, chặn lộ nội dung viên nang niêm phong qua search, kiểm chứng **Thẻ Ngủ Đông** cứu chuỗi 1 ngày nghỉ | Passed |
| **10** | `Group 1 upgrades` | Nhập dấu chấm VND trực tiếp (`formatVndInput`/`parseVndInput`), xoay vòng & gỡ mã PIN nguyên tử (`rotateNotesPinEncryption`), tách media `stripHeavyMediaForLocalStorage` & khôi phục `mergeStoresPreservingMedia` | Passed |
| **11** | `Open invite links` | Tách mã mời từ full URL, query string, mã chữ thường (`extractInviteCodeFromInput`), xác thực `open@invite.local` và giữ trạng thái chờ `activateDuoImmediately: false` | Passed |

---

## 3. Câu Lệnh Chạy Kiểm Thử & Kiểm Chứng Toàn Diện

```bash
# Chạy toàn bộ 11 unit test suites
npm test

# Kiểm tra kiểu TypeScript nghiêm ngặt
npm run typecheck

# Kiểm tra biên dịch bản production Next.js
npx next build --webpack
```

Kết quả mẫu khi chạy `npm test`:
```text
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ duration_ms 239.25
```

---

[← Trước: F09. PWA, Mini-Widget & Cozy Desk](../01-dac-ta-he-thong/chuc-nang/F09-pwa-widget-va-cozy-desk.md) | [Tiếp theo: 02. Tối ưu hiệu năng →](./02-toi-uu-hieu-nang.md)
