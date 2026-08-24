# FixNhanh — Nền tảng sửa chữa tận nhà (Landing quảng cáo + PWA marketplace)

## Mục tiêu
MVP nền tảng kết nối khách hàng bận rộn tại TP.HCM với thợ điện/nước/mộc/điện lạnh/sơn..., gồm:
1. **Landing SSR quảng cáo SEO** (hiện dịch vụ, giá, thợ nổi bật).
2. **PWA mobile** cho khách hàng & thợ: đặt lịch tức thì, đăng việc/thợ báo giá kiểu Upwork, chat realtime, escrow giữ tiền, ví nội bộ, đánh giá.
3. Chạy được local bằng `wrangler dev`, kèm README hướng dẫn deploy Cloudflare.

## Quyết định đã chốt với người dùng
| Hạng mục | Quyết định |
|---|---|
| Tên thương hiệu | **FixNhanh** |
| Mô hình ghép nối | **Kết hợp**: đặt lịch tức thì giá cố định theo dịch vụ + đăng việc để nhiều thợ báo giá |
| Doanh thu | **Escrow giữ tiền + hoa hồng 15%**, cổng thanh toán **giả lập trước** (mock MoMo sandbox) |
| Stack | **Cloudflare Workers + Hono + D1 + R2 + Durable Objects** — một Worker duy nhất |
| PWA | **Trọn bộ**: đặt/nhận việc, chat realtime, thông báo, ví/tài chính, đánh giá |
| Xác minh thợ | **KYC cơ bản**: nhập CCCD + ảnh selfie/portfolio upload, **tự động verified** |
| Phạm vi | TP.HCM (danh sách quận/huyện hardcode), tiếng Việt, VND |
| UI | Sáng tươi hiện đại: xanh dương `#0B6CFF` + cam `#FF7A00`, bo tròn, mobile-first bottom-tab |

## Kiến trúc
Một Worker duy nhất (Hono):
- `GET /` → SSR landing bằng Hono JSX: hero, quy trình 4 bước, grid dịch vụ + giá đọc từ D1, thợ top-rating từ D1, meta SEO + JSON-LD LocalBusiness, CTA cài PWA.
- `/app/*`, `/manifest.webmanifest`, `/sw.js` → static qua binding `ASSETS` (thư mục `public/`), `run_worker_first: ["/", "/api/*"]`.
- `/api/*` → REST JSON.
- Chat realtime: `GET /api/ws/chat/:conversationId` → **ChatDO** (Durable Object, WebSocket broadcast tin nhắn trong phòng, persist xuống D1).
- Ảnh: `POST /api/uploads` (multipart) → R2 `PHOTOS`; đọc qua `GET /api/photos/:key`.

Cấu trúc thư mục `fixnhanh/`:
```
fixnhanh/
├── wrangler.jsonc      # assets, D1, R2, DO migration new_sqlite_classes ChatDO
├── package.json        # hono; devDep wrangler; scripts: dev / db:local / deploy / tail
├── .dev.vars           # JWT_SECRET local
├── tsconfig.json
├── schema.sql          # DDL toàn bộ bảng
├── seed.sql            # 6 dịch vụ, ~12 thợ mẫu + reviews, khách demo, vài job mở
├── public/
│   ├── manifest.webmanifest, icons/*.svg
│   ├── sw.js           # cache shell, SWR css/js, network-only /api, offline fallback
│   └── app/
│       ├── index.html  # SPA shell
│       ├── css/app.css # design system
│       └── js/         # vanilla ES modules (router, store, views/*) — KHÔNG build step
└── src/
    ├── index.tsx       # entry, mount routes, export ChatDO
    ├── auth.ts         # PBKDF2 hash, JWT HS256, middleware Bearer
    ├── constants.ts    # SKILLS, DISTRICTS_HCM, COMMISSION_RATE=0.15, status enums
    ├── db.ts           # types + helpers
    ├── chat.ts         # class ChatDO extends DurableObject
    ├── api.ts          # toàn bộ REST
    └── landing.tsx     # SSR JSX
```

## Data model (D1 SQLite)
- `users(id, phone UNIQUE, name, role customer|worker|admin, avatar_url, status active|blocked, created_at)`
- `passwords(user_id PK, hash)` — format `pbkdf2$<iter>$<salt_b64>$<hash_b64>` (WebCrypto SHA-256)
- `worker_profiles(user_id PK, bio, skills JSON, districts JSON, years_exp, cccd_last4, cccd_verified, rating_avg, rating_count, jobs_done, portfolio JSON)`
- `services(id, slug, name, icon, base_price, unit, description, active)` — Điện/Nước/Mộc/Điện lạnh/Sơn/Vệ sinh
- `bookings(id, customer_id, worker_id NULL, service_id, address, district, scheduled_at, note, photos JSON, quoted_price, status finding→offered→accepted→in_progress→done→paid|cancelled)`
- `jobs(id, customer_id, title, description, category_slug, photos JSON, budget_min, budget_max, district, deadline, status open|assigned|in_progress|completed|paid|cancelled)`
- `bids(id, job_id, worker_id, price, message, duration_days, status pending|accepted|rejected)`
- `orders(id, type instant|job, ref_id, customer_id, worker_id, amount, escrow none|held|released|refunded, status created|awaiting_payment|in_progress|delivered|completed|cancelled)`
- `wallets(user_id PK, available, pending)` — VND nguyên
- `transactions(id, user_id, order_id NULL, kind topup|hold|release|commission|refund|withdraw, amount, note)`
- `conversations(id, customer_id, worker_id, order_id NULL, job_id NULL, last_message_at)` — mở khi có order HOẶC từ card bid
- `messages(id, conversation_id, sender_id, body, attachment_url NULL, created_at)`
- `notifications(id, user_id, type, title, body, payload JSON, read_at NULL)`
- `reviews(id, order_id UNIQUE, author_id, target_user_id, rating 1..5, comment)` — cập nhật rating_avg/count của thợ
- `push_subscriptions(id, user_id, sub_json)` — chỉ lưu, chưa gửi thật

## Luồng escrow (giả lập thanh toán)
1. Khách nạp ví: `POST /api/wallet/topup {amount, method:"momo_sandbox"}` → màn hình mô phỏng QR/xác nhận → cộng `available`.
2. Chốt việc (thợ accept offer / khách accept bid) → tạo `order` trạng thái `awaiting_payment` + conversation.
3. Khách trả: trừ `available` → escrow `held` (transaction `hold`).
4. Thợ `start` → `in_progress`; thợ `deliver` → `delivered`.
5. Khách `confirm` → release: thợ nhận `amount × 0.85`, 15% là `commission`; mở khóa review.
6. `cancel` trước khi start → refund toàn bộ.
7. Thợ rút: `POST /api/wallet/withdraw` (mock, trừ `available`).

## API REST (/api)
- auth: `register`, `login`, `me` GET/PATCH
- workers: `GET /workers?skill=&district=&sort=rating`, `GET /workers/:id` (+reviews), `POST /worker/profile` (KYC auto-verified)
- services: `GET`
- bookings: `POST` (chọn worker cụ thể hoặc auto = top-rating cùng skill+quận), `GET ?mine`; worker: `GET /offers`, `POST /bookings/:id/respond`, `POST /bookings/:id/status`
- jobs: `POST`, `GET ?status=open`, `GET /jobs/:id` (+bids; owner thấy bids, thợ thấy bid của mình), `POST /jobs/:id/bids`, `POST /bids/:id/accept` → order
- orders: `GET ?mine`, `GET /:id`, `POST /:id/{pay|start|deliver|confirm|cancel}`, `POST /:id/review`
- wallet: `GET` (balance + transactions), `topup`, `withdraw`
- chat: `GET /conversations`, `GET /:id/messages`, `POST /:id/messages`, WS `/ws/chat/:id?token=`
- notifications: `GET`, `read-all`; `push/subscribe`
- uploads: `POST` multipart; admin (role=admin): `stats`, `users`, `users/:id/block|unblock`

## PWA SPA (vanilla JS, mobile-first, không build)
Routes (`#/`): login/register (+nút tài khoản demo) · home khách (grid dịch vụ, ongoing strip) · đặt lịch theo bước (dịch vụ → địa chỉ/ngày giờ/ảnh → chọn gợi ý 3 thợ hoặc auto) · jobs board + form đăng việc · job detail + bids · orders list/detail (timeline trạng thái + panel escrow + nút chat + form review) · chat list/thread (WS live, badge) · notifications · wallet (thẻ số dư, sheet nạp mock MoMo, rút, lịch sử) · profile · become-worker (onboarding KYC CCCD + selfie) · admin (stats, block/unblock).
Shell: bottom tab 5 mục (Trang chủ, Công việc, Tin nhắn•badge, Thông báo•badge, Tôi), top-bar back ngữ cảnh, toast/modal-sheet/skeleton/star-rating. SW: precache shell, SWR css/js, network-only `/api`.

## Tasks (theo thứ tự thực hiện)
1. Init: `package.json`, `tsconfig.json`, `wrangler.jsonc`, `.dev.vars`; `npm i hono && npm i -D wrangler typescript @cloudflare/workers-types`
2. `schema.sql` + `seed.sql`; script `npm run db:local` (wrangler d1 execute --local)
3. `src/constants.ts`, `src/auth.ts`, `src/db.ts`
4. `src/chat.ts` (ChatDO WebSocket)
5. `src/api.ts` (toàn bộ REST + uploads + ws route)
6. `src/index.tsx` (entry, assets fallback, 404/error)
7. `public/`: manifest, SVG icons (logo + bolt/droplet/hammer/snowflake/paint/broom…), sw.js, shell `index.html`
8. `css/app.css` design system + `js/` core (store, fetch wrapper, router, ui components)
9. Views theo nhóm: auth → home/booking → jobs/bids → orders/escrow/review → chat/notifications → wallet/profile/KYC/admin
10. `src/landing.tsx` SSR marketing
11. Smoke test curl toàn luồng (mục Validation)
12. `README.md`: kiến trúc, chạy local, seed, deploy (tạo D1/R2 remote, `wrangler secret put JWT_SECRET`), tài khoản demo, roadmap

## Validation
1. `npm run dev` khởi động sạch, `GET /` HTML có meta SEO + tên dịch vụ từ D1; `/app` trả SPA shell; manifest/sw 200.
2. Flow tức thì bằng curl: register khách + thợ → login token → thợ set profile KYC → khách tạo booking → thợ accept → pay (escrow held) → start → deliver → confirm → kiểm tra ví thợ = 85%, commission 15% ghi nhận.
3. Flow Upwork: post job → bid → accept → pay → deliver → confirm → review cập nhật rating_avg thợ.
4. WS chat: script node nhỏ kết nối 2 token, gửi/nhận realtime, message persist D1; unread notifications tăng.
5. Upload multipart → `GET /api/photos/:key` trả ảnh từ R2 local.
6. `tsc --noEmit` không lỗi block.

## Rủi ro & biện pháp
- Sandbox có thể hạn chế mạng khi cài wrangler/chạy dev → nếu vậy vẫn giao code hoàn chỉnh + README chạy máy user; báo cáo phần chưa verify.
- Không có ImageMagick → manifest dùng SVG icons (Chrome/Android OK), ghi chú sinh PNG trước production.
- Free plan Workers giới hạn CPU → PBKDF2 dùng 25k iterations (đủ MVP, ghi chú nâng cấp).
- Push thật cần VAPID + key server → out of scope: lưu subscription + toast in-app qua WS/polling.
- Escrow thật cần đối tác giữ tiền (PayOS/VietQR) + pháp lý → mock gateway, roadmap.

## Out of scope (roadmap sau MVP)
Cổng thanh toán thật, web-push thật, multi-city + tiếng Anh, matching tự động nâng cao, mã giảm giá, app native, AI ước lượng giá từ ảnh.

## Demo accounts (seed)
Khách `0900000001` · Thợ `0901111101` · Admin `0900999999` — mật khẩu chung `fixnhanh123`.
