# Kế hoạch: Hiển thị công việc trên bản đồ (#/jobs)

## Mục tiêu
Thêm chế độ xem bản đồ cho danh sách công việc mở trong PWA (`#/jobs`): marker theo địa chỉ thực, popup liên kết tới chi tiết việc. Không ảnh hưởng trang danh sách hiện tại và các luồng khác.

## Quyết định đã chốt (với user)
| Hạng mục | Quyết định |
|---|---|
| Cách định vị | Geocode **địa chỉ** lúc tạo việc, lưu tọa độ vào DB |
| Dịch vụ geocode | **Nominatim OSM (đã xác nhận bởi user)** — free, không API key, gọi từ Worker 1 lần/tạo việc, `viewbox` TP.HCM + `accept-language=vi`; fail thì fallback tâm quận |
| Thư viện bản đồ | **Leaflet vendor cục bộ** vào `public/app/vendor/leaflet/` (không CDN) |
| Vị trí UI | Toggle segment "Danh sách | Bản đồ" ngay trên trang `#/jobs`, dùng lại bộ lọc quận/sort hiện có |
| Out of scope | Map cho bookings/workers/admin, bản đồ cluster lớn, chỉ đường, geolocation tự động của người dùng |

## Hiện trạng quan trọng
- Bảng `jobs` (fixnhanh/schema.sql:51) **không có** `address`, `lat`, `lng`.
- Form đăng việc (`routes['/jobs/new']` trong public/app/js/app.js) chưa có ô địa chỉ; `POST /api/jobs` (src/api.ts:254) cũng chưa nhận address.
- Jobs list vừa polish ở commit gần nhất có skeleton/filter/sort — giữ nguyên khi thêm map.
- Service worker (public/sw.js) cache-first mọi GET trừ `/api/` và `/admin*` → asset vendor sẽ được cache tự động (OK vì là static lib).
- PWA không build step; app.js dùng template literal + event delegation qua `$('#app').onclick`.

## Công việc

### 1. Backend
1. **schema.sql**: thêm cột `address TEXT NOT NULL DEFAULT ''`, `lat REAL`, `lng REAL` vào CREATE TABLE jobs. Ghi chú migration cho DB có sẵn: `ALTER TABLE jobs ADD COLUMN address TEXT NOT NULL DEFAULT ''; ALTER TABLE jobs ADD COLUMN lat REAL; ALTER TABLE jobs ADD COLUMN lng REAL;`
2. **src/geocode.ts (mới)**: export `geocodeAddress(db-less, address, district)` → `{ lat, lng } | null`. Gọi Nominatim `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&viewbox=106.62,10.40,107.08,11.15&bounded=1&accept-language=vi&q=<address>, <tên quận>, Hồ Chí Minh` với header `User-Agent: FixNhanh/1.0`. Timeout ngắn (~3s), bắt mọi lỗi trả null. Export thêm `DISTRICT_CENTROIDS` (18 cặp lat/lng tâm quận, khớp key `DISTRICTS` trong app.js).
3. **POST /jobs (src/api.ts)**: nhận thêm `address?: string`; INSERT cột address; sau khi insert thành công, thử geocode (best-effort, không fail request nếu Nominatim lỗi/chậm) rồi `UPDATE jobs SET lat=?, lng=? WHERE id=?`. Trả về `{ id }` như cũ.
4. **GET /jobs và GET /jobs/:id**: SELECT bổ sung `address, lat, lng` (hiện dùng `SELECT j.*` nên chỉ cần đảm bảo không strip).

### 2. Frontend (public/app)
1. **Vendor Leaflet**: tải `leaflet.js`, `leaflet.css`, thư mục marker mặc định nếu cần vào `public/app/vendor/leaflet/` (Leaflet 1.9.x). Tile từ `https://{s}.tile.openstreetmap.org/` (chỉ cần internet lúc xem bản đồ).
2. **index.html của app**: thêm `<link rel="stylesheet" href="/app/vendor/leaflet/leaflet.css">` và `<script defer src="/app/vendor/leaflet/leaflet.js">`. Kiểm tra đường dẫn static: assets directory là `./public` nên URL là `/app/vendor/...`.
3. **routes['/jobs'] (app.js)**:
   - Thêm seg toggle "Danh sách | Bản đồ" vào filter-bar (state qua hash param `view=map`, default list).
   - View map: container `<div id="jobMap">` cao ~60vh; fetch jobs như hiện tại; khởi tạo Leaflet map (center TP.HCM ~10.775, 106.70, zoom 11); mỗi job đặt marker tại `(lat,lng)` hoặc fallback tâm quận + jitter nhỏ (~±0.004°) để marker cùng quận không chồng nhau; `bindPopup` chứa tiêu đề, ngân sách, quận, link `#/jobs/{id}` (dùng nút đóng popup rồi set location.hash).
   - View list: giữ nguyên UI vừa polish.
   - Lưu ý vòng đời: hủy map khi rời route (`map.remove()`) tránh leak giữa các lần render; guard `if(!window.L)` hiển thị empty-state lỗi.
4. **routes['/jobs/new']: thêm ô nhập "Địa chỉ" (số nhà, tên đường) required**, đặt trên select quận; submit gửi kèm `address`.
5. **Chi tiết việc (`#/jobs/:id`)**: hiển thị dòng 📍 địa chỉ + quận dưới meta (không nhúng map nhỏ — out of scope).

### 3. Service worker
Không cần đổi: `/app/vendor/*` là static, nhánh cache-first hiện có phù hợp; tile OSM đi ra ngoài domain — request GET khác origin vẫn bị SW xử lý cache-first… **kiểm tra**: SW chỉ can thiệp request same-origin thông thường nhưng code hiện tại chạy với mọi url; tile OSM cross-origin sẽ được `fetch(request)` qua cache-first → chấp nhận được (cache tile giúp offline), không cần sửa.

## Rủi ro & lưu ý
- Nominatim rate-limit: chỉ gọi khi tạo việc; nếu 4xx/5xx → fallback tâm quận, việc vẫn hiển thị trên map ở mức quận.
- Job cũ (trước khi có cột mới): `address=''`, lat/lng NULL → map dùng fallback tâm quận.
- Địa chỉ tiếng Việt thiếu dấu: Nominatim vẫn thường tìm được; nếu không → fallback quận.
- DB local/remote có sẵn phải chạy ALTER TABLE trước khi deploy code mới (thứ tự: migrate DB → deploy).

## Validation
1. `node --check public/app/js/app.js`; `npm run build` (tsc).
2. `npm run db:local` (fresh) + test ALTER trên DB cũ.
3. `wrangler dev`: tạo việc mới có address → kiểm tra DB có lat/lng; tạo việc với address vô nghĩa → lat/lng NULL nhưng tạo OK.
4. GET `/app/js/app.js`, `/app/vendor/leaflet/leaflet.js`, `/app/vendor/leaflet/leaflet.css` trả 200.
5. UI: `#/jobs?view=map` hiển thị markers đúng số lượng jobs đang mở; popup mở được chi tiết việc; lọc quận áp dụng cả map; chuyển qua lại list/map không lỗi console; mobile 375px map không vỡ layout.
6. Regression: đăng việc không có address (curl) vẫn 201; các trang orders/chat/admin không đổi.

## File thay đổi dự kiến
- fixnhanh/schema.sql (columns + ghi chú migration)
- fixnhanh/src/geocode.ts (mới)
- fixnhanh/src/api.ts (POST /jobs, SELECT jobs)
- fixnhanh/public/app/js/app.js (routes jobs, jobs/new, chi tiết)
- fixnhanh/public/app/css/app.css (style #jobMap, toggle)
- fixnhanh/public/app/index.html (nạp leaflet css/js)
- fixnhanh/public/app/vendor/leaflet/* (mới, vendored)
