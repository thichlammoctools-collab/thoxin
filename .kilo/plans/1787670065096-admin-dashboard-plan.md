# Kế hoạch xây dựng trang quản trị Admin FixNhanh

## 1. Mục tiêu và phạm vi

Xây dựng route `/admin` cho tài khoản có `role === "admin"`, dùng HTML/CSS/JavaScript thuần và tái sử dụng hệ thống xác thực/API hiện tại. Trang phải:

- Hiển thị thống kê tổng quan.
- Liệt kê, lọc và quản lý người dùng.
- Cho phép khóa/mở khóa tài khoản với xác nhận.
- Có loading, empty, error và success states.
- Đăng xuất an toàn và xử lý token hết hạn.
- Responsive trên desktop, tablet và mobile.
- Không ảnh hưởng landing page, PWA và các route hiện có.

## 2. Các quyết định triển khai

| Hạng mục | Quyết định |
|---|---|
| Kiến trúc UI | Trang SSR/static được phục vụ từ Hono, logic tương tác bằng JavaScript vanilla |
| Xác thực frontend | Tái sử dụng `localStorage.token` và `localStorage.user` như PWA hiện tại |
| Xác thực backend | Mọi endpoint vẫn kiểm tra Bearer token, user tồn tại, `status = active`, `role = admin` |
| API users | Hỗ trợ lọc `role`, đồng thời bổ sung phân trang `limit`/`offset` với giới hạn an toàn |
| Doanh thu | Hiển thị doanh thu hoa hồng từ transaction `kind = commission`; nếu cần tổng giá trị đơn thì đặt tên riêng |
| Mobile table | Dùng card/list responsive thay vì ép bảng nhiều cột trên màn hình hẹp |
| Service Worker | Loại trừ `/admin` khỏi cache hoặc bắt buộc network-first để tránh giao diện stale |
| UI library | Không thêm thư viện UI mới |
| Out of scope | Quản lý orders, dịch vụ, KYC, phân quyền admin nhiều cấp và biểu đồ nâng cao |

## 3. Hiện trạng cần tận dụng

- Các API admin đã có trong `fixnhanh/src/api.ts:657-696`:
  - `GET /api/admin/stats`
  - `GET /api/admin/users`
  - `POST /api/admin/users/:id/block`
  - `POST /api/admin/users/:id/unblock`
- Middleware dùng chung `getAuthUser` kiểm tra token và trạng thái active tại `fixnhanh/src/api.ts:8-15`.
- JWT có thời hạn 7 ngày và được kiểm tra expiry tại `fixnhanh/src/auth.ts:63-77`.
- PWA lưu token/user tại `fixnhanh/public/app/js/app.js:5-6,41-42`.
- `fixnhanh/public/sw.js:30-53` hiện cache-first các request GET ngoài `/api/`, cần xử lý riêng cho `/admin`.

## 4. Công việc backend

### 4.1. Bổ sung middleware/guard admin dùng chung

Tạo helper nội bộ, ví dụ `requireAdmin(c)`, hoặc tối thiểu gom logic lặp lại để mọi route admin thống nhất:

1. Đọc `Authorization: Bearer <token>`.
2. Verify JWT.
3. Tải user từ D1.
4. Từ chối nếu user không tồn tại, không active hoặc không có role admin.
5. Trả 401 cho token thiếu/không hợp lệ nếu muốn phân biệt xác thực; trả 403 cho user hợp lệ nhưng không đủ quyền. Frontend xử lý cả hai như phiên hết hạn/không được phép.

Không thay đổi quyền truy cập các route ngoài admin.

### 4.2. Sửa stats

Điều chỉnh `GET /api/admin/stats`:

- `users`: tổng số users.
- `workers`: tổng users có role worker.
- `orders`: tổng orders.
- `revenue`: tổng `transactions.amount` với `kind = 'commission'`.
- Có thể trả thêm `order_value` là tổng amount của orders completed nếu UI cần phân biệt doanh thu nền tảng và giá trị giao dịch.
- Dùng query parameterized và `COALESCE` để dữ liệu rỗng trả về 0.
- Ưu tiên gom query thống kê thành một batch hoặc query tổng hợp, nhưng không đánh đổi tính dễ đọc.

### 4.3. Phân trang danh sách users

Mở rộng `GET /api/admin/users`:

- Giữ `role` tùy chọn với các giá trị `customer`, `worker`, `admin`.
- Thêm `limit`, mặc định hợp lý và giới hạn tối đa để tránh truy vấn quá lớn.
- Thêm `offset` hoặc `page` nhất quán với frontend.
- Trả metadata: `items`, `total`, `limit`, `offset`.
- Chỉ chọn các trường cần hiển thị (`id`, `phone`, `name`, `role`, `avatar_url`, `status`, `created_at`), không trả password/hash hay dữ liệu nhạy cảm.
- Thêm index cho `users(role, created_at)` nếu kiểm tra thực tế cho thấy cần thiết.

### 4.4. Bảo vệ thao tác block/unblock

Với `POST /api/admin/users/:id/block`:

- Từ chối nếu target không tồn tại.
- Từ chối admin tự khóa chính mình.
- Từ chối khóa admin khác ở MVP để tránh mất quyền quản trị ngoài ý muốn.
- Cho phép thao tác idempotent hoặc trả lỗi rõ ràng khi trạng thái đã đúng.

Với `unblock`:

- Kiểm tra target tồn tại.
- Cập nhật về `active`.
- Trả object user tối thiểu hoặc `{ ok: true, id, status }` để frontend cập nhật chính xác.

Backend là lớp bảo vệ chính; không chỉ dựa vào việc ẩn nút trên frontend.

## 5. Công việc frontend

### 5.1. Route và shell

- Thêm route `/admin` trong `fixnhanh/src/index.tsx`.
- Tạo `fixnhanh/src/admin.tsx` chứa markup, style cần thiết và script bootstrap, hoặc tổ chức thành asset riêng nếu phù hợp convention hiện tại.
- Không làm thay đổi output của landing `/` và static PWA `/app`.
- Nếu route yêu cầu JavaScript asset riêng, bảo đảm asset được phục vụ đúng trong Cloudflare Workers.

### 5.2. Header

Hiển thị:

- Tên/logo FixNhanh.
- Tên và vai trò admin.
- Trạng thái phiên hiện tại.
- Nút đăng xuất.

Đăng xuất phải xóa cả `token` và `user`, xóa state tạm trong bộ nhớ, sau đó chuyển về route đăng nhập hiện tại (`#/login` nếu dùng PWA hash router hoặc URL login tương ứng).

### 5.3. Stats cards

Hiển thị các card:

- Tổng người dùng.
- Tổng thợ sửa chữa.
- Tổng đơn hàng.
- Doanh thu hoa hồng.

Mỗi card có label, giá trị đã format VND khi phù hợp, icon/ký hiệu không phụ thuộc thư viện ngoài, màu phân biệt nhưng vẫn đạt contrast. Trên mobile dùng lưới 2 cột hoặc 1 cột tùy chiều rộng.

### 5.4. User management

- Bộ lọc role: Tất cả, Khách hàng, Thợ sửa chữa, Quản trị viên.
- Hiển thị tổng số kết quả và phân trang.
- Desktop: bảng gồm tên, liên hệ, role, status, ngày tạo, thao tác.
- Mobile: card/list, không yêu cầu người dùng cuộn ngang để thực hiện thao tác.
- Badge role/status có text rõ ràng, không chỉ dùng màu.
- Không render dữ liệu người dùng bằng HTML chưa escape. Tạo helper escape text trước khi đưa vào `innerHTML`, hoặc ưu tiên `textContent`/DOM API.
- Không hiển thị password, password hash, CCCD đầy đủ hoặc dữ liệu nhạy cảm.
- Không hiển thị nút khóa cho chính admin hiện tại; backend vẫn bắt buộc chặn.

### 5.5. Loading/error/empty states

Triển khai độc lập cho stats và users:

- Loading skeleton hoặc trạng thái đang tải.
- Empty state khi không có users sau lọc.
- Error state có nút thử lại.
- Auth error 401/403: xóa session và chuyển login, tránh vòng lặp redirect.
- Mutation state: disable đúng nút của user đang xử lý, tránh double-submit.
- Toast/banner success và error có nội dung rõ ràng, tự escape dữ liệu lỗi nếu hiển thị.

### 5.6. Khóa/mở khóa

Luồng chung:

1. Kiểm tra không phải user hiện tại.
2. Hiển thị confirm dialog với tên user và hậu quả thao tác.
3. Gọi endpoint tương ứng với Bearer token.
4. Disable thao tác hiện tại trong lúc chờ.
5. Thành công: cập nhật row/card tại chỗ, cập nhật badge, hiển thị thông báo.
6. Thất bại: giữ nguyên dữ liệu, hiển thị lỗi, mở lại nút.
7. Nếu nhận 401/403: xóa session và điều hướng login.

## 6. Service Worker và cache

Cập nhật `fixnhanh/public/sw.js` để `/admin` không bị phục vụ bản cũ:

- Không cache request có pathname bắt đầu `/admin`; hoặc
- Dùng network-first cho `/admin` và fallback phù hợp khi offline.

Không cache bất kỳ response admin nào chứa dữ liệu riêng tư. Tiếp tục giữ API là network-only như hiện tại.

Nếu admin page dùng asset riêng, cập nhật cache strategy/version theo đúng asset; không cache dữ liệu runtime admin.

## 7. README và tài khoản demo

Chỉ cập nhật `fixnhanh/README.md` nếu cần hướng dẫn:

- URL `/admin`.
- Cách đăng nhập local bằng tài khoản seed.
- Nhấn mạnh mật khẩu demo chỉ hợp lệ với dev secret (`JWT_SECRET` bắt đầu bằng `dev-`).
- Không đưa credential demo hoặc secret thật vào môi trường production.

## 8. Kiểm thử và xác nhận

### Backend/API

- Admin active nhận stats và users.
- Chưa đăng nhập bị từ chối.
- Token hết hạn/không hợp lệ bị từ chối.
- Customer/worker bị từ chối.
- Admin blocked bị từ chối.
- Lọc từng role hoạt động.
- Phân trang không trả quá limit và metadata đúng.
- Stats doanh thu không tính đơn cancelled/awaiting payment ngoài định nghĩa đã chốt.
- Admin không thể tự khóa.
- Admin không thể khóa admin khác.
- User không tồn tại trả lỗi rõ ràng.
- Block/unblock idempotent và cập nhật đúng status.

### Frontend/UI

- Dashboard tải được sau login.
- Loading/error/empty states của stats và users hoạt động độc lập.
- Refresh trang không làm mất phiên hợp lệ.
- 401/403 xóa session và chuyển login đúng một lần.
- Filter và pagination không tạo request cũ ghi đè dữ liệu mới.
- Tên dài, ký tự HTML, dữ liệu rỗng không gây XSS hoặc vỡ layout.
- Nút mutation không double-submit.
- Desktop, tablet, mobile; danh sách dài và mobile card.
- Logout xóa token/user.
- Không có lỗi JavaScript trong console.

### Regression/technical

- Chạy `npm run build` (`tsc --noEmit`).
- Chạy test hiện có nếu repository bổ sung test framework.
- Chạy `wrangler dev` và kiểm tra route thật qua local Cloudflare Workers.
- Kiểm tra `/`, `/app`, API hiện tại và WebSocket không bị ảnh hưởng.
- Kiểm tra service worker sau deploy/version update: `/admin` không nhận HTML/data stale từ cache.
- Kiểm tra diff chỉ gồm các file liên quan.

## 9. File dự kiến thay đổi

Bắt buộc hoặc có khả năng thay đổi:

- `fixnhanh/src/index.tsx` — mount route `/admin`.
- `fixnhanh/src/admin.tsx` — UI và logic admin nếu chọn SSR module.
- `fixnhanh/src/api.ts` — guard admin, stats, pagination, self-block protection, response fields.
- `fixnhanh/public/sw.js` — loại trừ/network-first `/admin`.
- `fixnhanh/public/app/css/app.css` — chỉ khi dùng chung design tokens/style.
- `fixnhanh/public/app/js/app.js` — chỉ khi cần tích hợp route vào PWA hiện tại.
- `fixnhanh/README.md` — chỉ bổ sung hướng dẫn local/admin nếu cần.

Không sửa `schema.sql` trừ khi profiling cho thấy cần index phân trang/lọc; nếu thêm index, phải cập nhật migration/seed/deploy path tương ứng.

## 10. Tiêu chí hoàn thành

- `/admin` hoạt động trên local và deployment target.
- Chỉ admin active truy cập được.
- Stats phản ánh đúng định nghĩa doanh thu đã chốt.
- Users có lọc role và pagination.
- Block/unblock được backend bảo vệ, không tự khóa/admin-to-admin ngoài MVP.
- Có đầy đủ loading, error, empty, mutation và auth states.
- Dữ liệu người dùng được escape/không lộ thông tin nhạy cảm.
- Responsive desktop/tablet/mobile.
- Service worker không phục vụ bản admin stale hoặc cache dữ liệu admin.
- `npm run build` đạt và các route/PWA hiện tại không regression.
