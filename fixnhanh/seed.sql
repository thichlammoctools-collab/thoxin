-- Idempotent demo seed: remove demo rows first, then reinsert them.
DELETE FROM messages WHERE conversation_id IN (
  SELECT id FROM conversations WHERE customer_id = 'usr_002'
);
DELETE FROM notifications WHERE user_id IN ('usr_001','usr_002','usr_003','usr_004','usr_005','usr_006');
DELETE FROM conversations WHERE customer_id = 'usr_002';
DELETE FROM transactions WHERE user_id IN ('usr_002','usr_003','usr_004','usr_005','usr_006');
DELETE FROM reviews WHERE author_id IN ('usr_002','usr_003','usr_004','usr_005','usr_006');
DELETE FROM bids WHERE id IN ('bid_001','bid_002');
DELETE FROM orders WHERE id IN ('ord_001','ord_002');
DELETE FROM jobs WHERE id IN ('job_001','job_002');
DELETE FROM bookings WHERE id IN ('bk_001','bk_002');
DELETE FROM services;
DELETE FROM worker_profiles WHERE user_id IN ('usr_003','usr_004','usr_005','usr_006');
DELETE FROM passwords WHERE user_id IN ('usr_001','usr_002','usr_003','usr_004','usr_005','usr_006');
DELETE FROM wallets WHERE user_id IN ('usr_003','usr_004','usr_005','usr_006');
DELETE FROM users WHERE id IN ('usr_001','usr_002','usr_003','usr_004','usr_005','usr_006');

-- 6 services
INSERT INTO services (id, slug, name, icon, base_price, unit, description) VALUES
  ('svc_1','dien','Điện','zap',150000,'lượt','Kiểm tra & sửa chữa điện dân dụng, thay ổ cắm, dây điện...'),
  ('svc_2','nuoc','Nước','droplet',180000,'lượt','Sửa ống nước, van, bồn rửa, toilet...'),
  ('svc_3','moc','Mộc','hammer',200000,'lượt','Sửa tủ, lắp đặt nội thất, đóng tủ...'),
  ('svc_4','dien-lanh','Điện lạnh','snowflake',250000,'lượt','Sửa máy lạnh, tủ lạnh, máy giặt...'),
  ('svc_5','son','Sơn','paint',350000,'m2','Sơn lại nội thất/ngoại thất, trét tường...'),
  ('svc_6','ve-sinh','Vệ sinh','broom',300000,'lượt','Vệ sinh nhà cửa, máy lạnh, kính cao cấp...');

-- 3 demo accounts
-- Password demo: fixnhanh123 — lưu dạng sentinel 'dev_fixnhanh123'.
-- auth.ts chỉ chấp nhận sentinel này khi JWT_SECRET bắt đầu bằng "dev-"
-- (local dev). Trên production hãy seed hash PBKDF2 thật:
--   node scripts/seed-hash.mjs
INSERT INTO users (id, phone, name, role, avatar_url, status) VALUES
  ('usr_001','0900999999','Admin FixNhanh','admin','https://api.dicebear.com/7.x/avataaars/svg?seed=admin','active'),
  ('usr_002','0900000001','Khách Hàng Demo','customer','https://api.dicebear.com/7.x/avataaars/svg?seed=customer','active'),
  ('usr_003','0901111101','Thợ Điện Nước','worker','https://api.dicebear.com/7.x/avataaars/svg?seed=worker1','active');

INSERT INTO passwords (user_id, hash) VALUES
  ('usr_001','dev_fixnhanh123'),
  ('usr_002','dev_fixnhanh123'),
  ('usr_003','dev_fixnhanh123');

INSERT INTO worker_profiles (user_id, bio, skills, districts, years_exp, cccd_last4, cccd_verified, rating_avg, rating_count, jobs_done, portfolio) VALUES
  ('usr_003','Thợ điện nước có 5 năm kinh nghiệm tại TP.HCM. Uy tín, làm việc nhanh gọn.','["dien","nuoc"]','["quan-1","thu-duc"]',5,'1234',1,4.8,12,45,'[]');

-- Additional workers
INSERT INTO users (id, phone, name, role, avatar_url, status) VALUES
  ('usr_004','0901111102','Thợ Mộc Nội Thất','worker','https://api.dicebear.com/7.x/avataaars/svg?seed=worker2','active'),
  ('usr_005','0901111103','Thợ Điện Lạnh','worker','https://api.dicebear.com/7.x/avataaars/svg?seed=worker3','active'),
  ('usr_006','0901111104','Thợ Sơn Nhà','worker','https://api.dicebear.com/7.x/avataaars/svg?seed=worker4','active');

INSERT INTO passwords (user_id, hash) VALUES
  ('usr_004','dev_fixnhanh123'),
  ('usr_005','dev_fixnhanh123'),
  ('usr_006','dev_fixnhanh123');

INSERT INTO worker_profiles (user_id, bio, skills, districts, years_exp, cccd_last4, cccd_verified, rating_avg, rating_count, jobs_done, portfolio) VALUES
  ('usr_004','Chuyên sửa chữa, lắp đặt nội thất gỗ. Làm tủ bếp, cửa gỗ, trang trí nhà.','["moc"]','["quan-2","quan-3","binh-thanh"]',8,'5678',1,4.6,8,32,'[]'),
  ('usr_005','Kỹ thuật viên điện lạnh 6 năm kinh nghiệm. Sửa máy lạnh, tủ lạnh, máy giặt các hãng.','["dien-lanh"]','["quan-1","quan-5","go-vap"]',6,'9012',1,4.9,15,60,'[]'),
  ('usr_006','Thợ sơn nhà chuyên nghiệp. Sơn nội thất, ngoại thất, trét tường, bả matit.','["son"]','["quan-7","quan-8","tan-binh"]',4,'3456',1,4.5,6,22,'[]');

-- 2 bookings (instant)
INSERT INTO bookings (id, customer_id, worker_id, service_id, address, district, scheduled_at, note, photos, quoted_price, status) VALUES
  ('bk_001','usr_002','usr_003','svc_1','123 Nguyễn Văn Linh, quận 7','quan-7','2026-08-25T09:00:00','Sửa ổ cắm phòng khách','[]',150000,'accepted'),
  ('bk_002','usr_002','usr_004','svc_3','456 Lê Lợi, quận 1','quan-1','2026-08-26T14:00:00','Lắp tủ bếp','[]',200000,'in_progress');

-- 2 jobs with bids
INSERT INTO jobs (id, customer_id, title, description, category_slug, photos, budget_min, budget_max, district, deadline, status) VALUES
  ('job_001','usr_002','Sửa chữa nhà vệ sinh','Thay bồn cầu, sửa ống nước bị rò rỉ ở tầng 2','nuoc','[]',500000,800000,'quan-1','2026-08-30','open'),
  ('job_002','usr_002','Lắp đặt hệ thống camera','Lắp 4 camera an ninh ngoài trời cho nhà phố','dien','[]',2000000,3500000,'thu-duc','2026-09-05','open');

INSERT INTO bids (id, job_id, worker_id, price, message, duration_days, status) VALUES
  ('bid_001','job_001','usr_003',600000,'Em có kinh nghiệm sửa ống nước, có thể làm trong 1 ngày',1,'pending'),
  ('bid_002','job_001','usr_004',550000,'Em nhận sửa chữa nhà vệ sinh, đảm bảo chất lượng',1,'pending');

-- 2 orders
INSERT INTO orders (id, type, ref_id, customer_id, worker_id, amount, escrow, status) VALUES
  ('ord_001','instant','bk_001','usr_002','usr_003',150000,'held','in_progress'),
  ('ord_002','job','job_001','usr_002','usr_003',600000,'none','awaiting_payment');

-- Wallet for worker
INSERT INTO wallets (user_id, available, pending) VALUES
  ('usr_003',250000,0);

-- Transactions
INSERT INTO transactions (id, user_id, order_id, kind, amount, note) VALUES
  ('tx_001','usr_002','ord_001','hold',150000,'Giữ tiền đặt lịch điện'),
  ('tx_002','usr_003','ord_001','commission',22500,'Hoa hồng 15%'),
  ('tx_003','usr_003','ord_001','release',127500,'Nhận tiền hoàn thành');

-- Conversation
INSERT INTO conversations (id, customer_id, worker_id, order_id, last_message_at) VALUES
  ('convo_001','usr_002','usr_003','ord_001','2026-08-24T10:00:00');

-- Messages
INSERT INTO messages (id, conversation_id, sender_id, body, attachment_url) VALUES
  ('msg_001','convo_001','usr_002','Chào anh, em đặt lịch sửa ổ cắm lúc 9h ngày mai được không ạ?',NULL),
  ('msg_002','convo_001','usr_003','Dạ được anh, em sẽ đến đúng giờ ạ',NULL);

-- Notifications
INSERT INTO notifications (id, user_id, type, title, body, payload) VALUES
  ('notif_001','usr_002','booking','Đặt lịch thành công','Thợ Điện Nước đã nhận lịch sửa ổ cắm của bạn','{}');

-- Review
INSERT INTO reviews (id, order_id, author_id, target_user_id, rating, comment) VALUES
  ('rev_001','ord_001','usr_002','usr_003',5,'Thợ làm việc rất chuyên nghiệp, nhanh gọn!');
