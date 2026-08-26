CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','worker','admin')),
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE passwords (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hash TEXT NOT NULL
);
CREATE TABLE worker_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT DEFAULT '',
  skills TEXT NOT NULL DEFAULT '[]',
  districts TEXT NOT NULL DEFAULT '[]',
  years_exp INTEGER DEFAULT 0,
  cccd_last4 TEXT DEFAULT '',
  cccd_verified INTEGER DEFAULT 0,
  rating_avg REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  jobs_done INTEGER DEFAULT 0,
  portfolio TEXT DEFAULT '[]'
);
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  base_price INTEGER NOT NULL,
  unit TEXT NOT NULL,
  description TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  worker_id TEXT REFERENCES users(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  scheduled_at TEXT,
  note TEXT DEFAULT '',
  photos TEXT NOT NULL DEFAULT '[]',
  quoted_price INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'finding' CHECK(status IN ('finding','offered','accepted','in_progress','done','paid','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_slug TEXT NOT NULL,
  photos TEXT NOT NULL DEFAULT '[]',
  budget_min INTEGER DEFAULT 0,
  budget_max INTEGER DEFAULT 0,
  district TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','assigned','in_progress','completed','paid','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Migration cho DB đã tạo trước khi có cột địa chỉ (chạy thủ công):
--   ALTER TABLE jobs ADD COLUMN address TEXT NOT NULL DEFAULT '';
--   ALTER TABLE jobs ADD COLUMN lat REAL;
--   ALTER TABLE jobs ADD COLUMN lng REAL;
CREATE TABLE bids (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES users(id),
  price INTEGER NOT NULL,
  message TEXT DEFAULT '',
  duration_days INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('instant','job')),
  ref_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES users(id),
  worker_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  escrow TEXT NOT NULL DEFAULT 'none' CHECK(escrow IN ('none','held','released','refunded')),
  status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created','awaiting_payment','in_progress','delivered','completed','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  available INTEGER NOT NULL DEFAULT 0,
  pending INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  order_id TEXT REFERENCES orders(id),
  kind TEXT NOT NULL CHECK(kind IN ('topup','hold','release','commission','refund','withdraw')),
  amount INTEGER NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  worker_id TEXT NOT NULL REFERENCES users(id),
  order_id TEXT REFERENCES orders(id),
  job_id TEXT REFERENCES jobs(id),
  last_message_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  attachment_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  payload TEXT DEFAULT '{}',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL REFERENCES orders(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  target_user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sub_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_worker_profiles ON worker_profiles(rating_avg DESC, jobs_done DESC);

-- Cấu hình hệ thống (JSON trong settings.value), ví dụ payout_config:
--   {"min_payout":500000,"payout_days":[15]}
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Yêu cầu rút tiền của thợ. Tiền bị chuyển available -> pending ngay khi tạo yêu cầu,
-- chỉ thực chuyển (mock) vào ngày thanh toán cố định trong tháng.
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL CHECK(amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','rejected')),
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX idx_bookings_customer ON bookings(customer_id, created_at DESC);
CREATE INDEX idx_bookings_worker ON bookings(worker_id, created_at DESC);
CREATE INDEX idx_jobs_status ON jobs(status, created_at DESC);
CREATE INDEX idx_bids_job ON bids(job_id, status);
CREATE INDEX idx_messages_convo ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX idx_reviews_target ON reviews(target_user_id, created_at DESC);
