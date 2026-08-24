# FixNhanh — Nền tảng sửa chữa tận nhà

> 🔧 Đặt lịch thợ điện, nước, mộc, sơn, điện lạnh, vệ sinh tận nhà tại TP.HCM. Mô hình Upwork: đặt lịch tức thì + đăng việc/thợ báo giá. Escrow giữ tiền + hoa hồng 15%.

## Stack

- **Cloudflare Workers + Hono** — API & SSR landing
- **D1 (SQLite)** — database
- **R2** — lưu ảnh
- **Durable Objects** — chat realtime qua WebSocket
- **Vanilla JS SPA** — PWA mobile-first (không build step)

## Cấu trúc

```
fixnhanh/
├── src/
│   ├── index.tsx      # Worker entry, routes, WS, R2
│   ├── api.ts         # REST API đầy đủ
│   ├── auth.ts        # JWT, PBKDF2
│   ├── chat.ts        # Durable Object chat
│   ├── constants.ts   # skills, districts, commission
│   ├── db.ts          # query helpers + types
│   ├── landing.tsx    # SSR marketing page
│   └── types.ts       # Env interface
├── public/            # static assets (PWA)
│   ├── app/
│   │   ├── index.html
│   │   ├── css/app.css
│   │   └── js/app.js  # SPA đầy đủ
│   ├── icons/         # SVG icons
│   ├── sw.js          # service worker
│   └── manifest.webmanifest
├── schema.sql         # DDL
├── seed.sql           # dữ liệu mẫu
├── wrangler.jsonc
├── package.json
└── tsconfig.json
```

## Chạy local

Yêu cầu: Node.js 18+, npm.

```bash
# 1. Cài dependencies
npm install

# 2. Tạo D1 local + seed data
npm run db:local

# 3. Chạy dev server
npm run dev
```

Mở:
- Landing page: http://localhost:8787/
- PWA app: http://localhost:8787/app

### Tài khoản demo (password: `fixnhanh123`)

| Vaiò | Số điện thoại |
|------|---------------|
| Khách hàng | 0900000001 |
| Thợ | 0901111101 |
| Admin | 0900999999 |

## API chính

| Method | Path | Mô tả |
|--------|------|-------|
| POST | /register, /login | Auth |
| GET | /services | Danh mục dịch vụ |
| GET | /workers?skill=&district= | Tìm thợ |
| POST | /bookings | Đặt lịch tức thì |
| POST | /bookings/:id/respond | Thợ nhạn/từ chối |
| POST | /jobs | Đăng việc |
| POST | /jobs/:id/bids | Thợ báo giá |
| POST | /bids/:id/accept | Chấp nhận báo giá |
| POST | /orders/:id/pay | Thanh toán (escrow hold) |
| POST | /orders/:id/confirm | Xác nhận hoàn thành (release) |
| POST | /orders/:id/review | Đánh giá |
| GET/POST | /conversations/:id/messages | Chat |
| WS | /api/ws/chat/:id?token= | Chat realtime |
| GET/POST | /wallet, /wallet/topup, /wallet/withdraw | Ví |
| GET | /admin/stats, /admin/users | Quản trị |

## Deploy lên Cloudflare

```bash
# 1. Login Cloudflare
npx wrangler login

# 2. Tạo D1 database remote
npx wrangler d1 create fixnhanh
# Copy database_id vào wrangler.jsonc > d1_databases > database_id

# 3. Tạo R2 bucket
npx wrangler r2 bucket create fixnhanh-photos

# 4. Set JWT secret
npx wrangler secret put JWT_SECRET

# 5. Deploy
npm run deploy
```

## Lưu ý

- Cổng thanh toán đang **giả lập** (mock MoMo). Tích hồn thật cần PayOS/VietQR.
- Push notification chưa gửi thật (chỉ lưu subscription).
- PBKDF2 dùng 25000 iterations (phù hợp Workers free plan).

## License

MIT
