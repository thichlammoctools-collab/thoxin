import { Hono } from 'hono';
import { genId, hashPassword, verifyPassword, signToken, verifyToken } from './auth';
import { getUserByPhone, getUserById, getWorkerProfile, getService, getBooking, getJob, getOrder, getWallet, rows, row } from './db';
import { COMMISSION_RATE } from './constants';

const app = new Hono<{ Bindings: any }>();

async function getAuthUser(c: any) {
  const auth = c.req.header('Authorization');
  if (!auth) return null;
  const payload = await verifyToken(auth.replace('Bearer ', ''), c.env.JWT_SECRET);
  if (!payload) return null;
  const user = await getUserById(c.env.DB, payload.sub as string);
  return user || null;
}

function now() {
  return new Date().toISOString();
}

// ==================== AUTH ====================

app.post('/register', async (c) => {
  const body = await c.req.json<{ phone: string; name: string; password: string; role?: string }>();
  const { phone, name, password, role = 'customer' } = body;
  if (!phone || !name || !password) return c.json({ error: 'Missing fields' }, 400);
  const existing = await getUserByPhone(c.env.DB, phone);
  if (existing) return c.json({ error: 'Phone already registered' }, 409);
  const id = genId('usr');
  const hash = await hashPassword(password);
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO users (id, phone, name, role) VALUES (?, ?, ?, ?)').bind(id, phone, name, role),
    c.env.DB.prepare('INSERT INTO passwords (user_id, hash) VALUES (?, ?)').bind(id, hash)
  ]);
  const token = await signToken({ sub: id, phone, role }, c.env.JWT_SECRET);
  return c.json({ token, user: { id, phone, name, role } });
});

app.post('/login', async (c) => {
  const body = await c.req.json<{ phone: string; password: string }>();
  const { phone, password } = body;
  const user = await getUserByPhone(c.env.DB, phone);
  if (!user) return c.json({ error: 'Invalid credentials' }, 401);
  const pw = await c.env.DB.prepare('SELECT hash FROM passwords WHERE user_id = ?').bind(user.id).first();
  if (!pw) return c.json({ error: 'Invalid credentials' }, 401);
  const ok = await verifyPassword(password, pw.hash as string, c.env.JWT_SECRET.startsWith('dev-'));
  if (!ok) return c.json({ error: 'Invalid credentials' }, 401);
  const token = await signToken({ sub: user.id, phone: user.phone, role: user.role }, c.env.JWT_SECRET);
  return c.json({ token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role, avatar_url: user.avatar_url } });
});

app.get('/me', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ id: user.id, phone: user.phone, name: user.name, role: user.role, avatar_url: user.avatar_url, status: user.status, created_at: user.created_at });
});

app.patch('/me', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json<{ name?: string; avatar_url?: string }>();
  const updates: string[] = [];
  const args: any[] = [];
  if (body.name !== undefined) { updates.push('name = ?'); args.push(body.name); }
  if (body.avatar_url !== undefined) { updates.push('avatar_url = ?'); args.push(body.avatar_url); }
  if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400);
  args.push(user.id);
  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...args).run();
  const updated = await getUserById(c.env.DB, user.id);
  return c.json({ id: updated!.id, phone: updated!.phone, name: updated!.name, role: updated!.role, avatar_url: updated!.avatar_url });
});

// ==================== USERS / WORKERS ====================

app.get('/workers', async (c) => {
  const skill = c.req.query('skill');
  const district = c.req.query('district');
  const sort = c.req.query('sort') || 'rating';
  let q = 'SELECT u.*, wp.bio, wp.skills, wp.districts, wp.years_exp, wp.rating_avg, wp.rating_count, wp.jobs_done FROM users u JOIN worker_profiles wp ON wp.user_id = u.id WHERE u.role = "worker" AND u.status = "active"';
  const args: any[] = [];
  if (skill) { q += ' AND wp.skills LIKE ?'; args.push(`%"${skill}"%`); }
  if (district) { q += ' AND wp.districts LIKE ?'; args.push(`%"${district}"%`); }
  q += sort === 'rating' ? ' ORDER BY wp.rating_avg DESC, wp.jobs_done DESC' : ' ORDER BY wp.jobs_done DESC';
  const stmt = c.env.DB.prepare(q);
  const res = args.length ? await stmt.bind(...args).all() : await stmt.all();
  return c.json(rows(res));
});

app.get('/worker/profile', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const profile = await getWorkerProfile(c.env.DB, user.id);
  if (!profile) return c.json({ error: 'Not found' }, 404);
  return c.json(profile);
});

app.get('/workers/:id', async (c) => {
  const id = c.req.param('id');
  const user = await getUserById(c.env.DB, id);
  if (!user || user.role !== 'worker') return c.json({ error: 'Not found' }, 404);
  const profile = await getWorkerProfile(c.env.DB, id);
  const reviews = await c.env.DB.prepare('SELECT * FROM reviews WHERE target_user_id = ? ORDER BY created_at DESC LIMIT 10').bind(id).all();
  return c.json({ ...user, profile: profile || null, reviews: rows(reviews) });
});

app.post('/worker/profile', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json<{ bio?: string; skills?: string[]; districts?: string[]; years_exp?: number; cccd_last4?: string; portfolio?: string[] }>();
  const skills = JSON.stringify(body.skills || []);
  const districts = JSON.stringify(body.districts || []);
  const portfolio = JSON.stringify(body.portfolio || []);
  const existing = await getWorkerProfile(c.env.DB, user.id);
  if (existing) {
    await c.env.DB.prepare('UPDATE worker_profiles SET bio = ?, skills = ?, districts = ?, years_exp = ?, cccd_last4 = ?, cccd_verified = 1, portfolio = ? WHERE user_id = ?')
      .bind(body.bio || '', skills, districts, body.years_exp || 0, body.cccd_last4 || '', portfolio, user.id).run();
  } else {
    await c.env.DB.prepare('INSERT INTO worker_profiles (user_id, bio, skills, districts, years_exp, cccd_last4, cccd_verified, portfolio) VALUES (?, ?, ?, ?, ?, ?, 1, ?)')
      .bind(user.id, body.bio || '', skills, districts, body.years_exp || 0, body.cccd_last4 || '', portfolio).run();
  }
  const profile = await getWorkerProfile(c.env.DB, user.id);
  return c.json(profile);
});

app.post('/become-worker', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json<{ bio?: string; skills?: string[]; districts?: string[]; years_exp?: number; cccd_last4?: string }>();
  const skills = JSON.stringify(body.skills || []);
  const districts = JSON.stringify(body.districts || []);
  const existing = await getWorkerProfile(c.env.DB, user.id);
  if (existing) {
    await c.env.DB.prepare('UPDATE worker_profiles SET bio = ?, skills = ?, districts = ?, years_exp = ?, cccd_last4 = ?, cccd_verified = 1 WHERE user_id = ?')
      .bind(body.bio || '', skills, districts, body.years_exp || 0, body.cccd_last4 || '', user.id).run();
  } else {
    await c.env.DB.prepare('INSERT INTO worker_profiles (user_id, bio, skills, districts, years_exp, cccd_last4, cccd_verified) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .bind(user.id, body.bio || '', skills, districts, body.years_exp || 0, body.cccd_last4 || '').run();
  }
  await c.env.DB.prepare('UPDATE users SET role = "worker" WHERE id = ?').bind(user.id).run();
  const profile = await getWorkerProfile(c.env.DB, user.id);
  return c.json(profile);
});

// ==================== SERVICES ====================

app.get('/services', async (c) => {
  const services = await c.env.DB.prepare('SELECT * FROM services WHERE active = 1 ORDER BY base_price').all();
  return c.json(rows(services));
});

// ==================== BOOKINGS ====================

app.post('/bookings', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json<{ service_id: string; address: string; district: string; scheduled_at?: string; note?: string; photos?: string[]; worker_id?: string }>();
  if (!body.service_id || !body.address || !body.district) return c.json({ error: 'Missing fields' }, 400);
  const id = genId('bk');
  const photos = JSON.stringify(body.photos || []);
  const status = body.worker_id ? 'offered' : 'finding';
  await c.env.DB.prepare('INSERT INTO bookings (id, customer_id, worker_id, service_id, address, district, scheduled_at, note, photos, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, body.worker_id || null, body.service_id, body.address, body.district, body.scheduled_at || null, body.note || '', photos, status).run();
  return c.json({ id }, 201);
});

app.get('/bookings', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const mine = c.req.query('mine') === '1';
  let q = 'SELECT * FROM bookings WHERE 1=1';
  const args: any[] = [];
  if (mine) {
    if (user.role === 'worker') {
      q += ' AND (worker_id = ? OR status = "finding")';
      args.push(user.id);
    } else {
      q += ' AND customer_id = ?';
      args.push(user.id);
    }
  }
  q += ' ORDER BY created_at DESC';
  const stmt = c.env.DB.prepare(q);
  const res = args.length ? await stmt.bind(...args).all() : await stmt.all();
  return c.json(rows(res));
});

app.post('/bookings/:id/respond', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const booking = await getBooking(c.env.DB, id);
  if (!booking) return c.json({ error: 'Not found' }, 404);
  if (booking.status === 'finding') {
    const service = await getService(c.env.DB, booking.service_id);
    const amount = booking.quoted_price || service?.base_price || 0;
    const orderId = genId('ord');
    const convoId = genId('convo');
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE bookings SET worker_id = ?, status = "accepted" WHERE id = ?').bind(user.id, id),
      c.env.DB.prepare('INSERT INTO orders (id, type, ref_id, customer_id, worker_id, amount, escrow, status) VALUES (?, "instant", ?, ?, ?, ?, "none", "awaiting_payment")').bind(orderId, id, booking.customer_id, user.id, amount),
      c.env.DB.prepare('INSERT INTO conversations (id, customer_id, worker_id, order_id) VALUES (?, ?, ?, ?)').bind(convoId, booking.customer_id, user.id, orderId)
    ]);
    await c.env.DB.prepare('INSERT INTO notifications (id, user_id, type, title, body, payload) VALUES (?, ?, "booking", "Lịch đặt được nhận", "Thợ đã nhận lịch đặt của bạn", ?)')
      .bind(genId('notif'), booking.customer_id, JSON.stringify({ booking_id: id, order_id: orderId })).run();
    return c.json({ order_id: orderId, conversation_id: convoId });
  }
  if (booking.worker_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  const body = await c.req.json<{ action: 'accept' | 'decline' }>();
  if (body.action === 'accept') {
    const service = await getService(c.env.DB, booking.service_id);
    const amount = booking.quoted_price || service?.base_price || 0;
    const orderId = genId('ord');
    const convoId = genId('convo');
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE bookings SET status = "accepted" WHERE id = ?').bind(id),
      c.env.DB.prepare('INSERT INTO orders (id, type, ref_id, customer_id, worker_id, amount, escrow, status) VALUES (?, "instant", ?, ?, ?, ?, "none", "awaiting_payment")').bind(orderId, id, booking.customer_id, user.id, amount),
      c.env.DB.prepare('INSERT INTO conversations (id, customer_id, worker_id, order_id) VALUES (?, ?, ?, ?)').bind(convoId, booking.customer_id, user.id, orderId)
    ]);
    await c.env.DB.prepare('INSERT INTO notifications (id, user_id, type, title, body, payload) VALUES (?, ?, "booking", "Lịch đặt được nhận", "Thợ đã nhận lịch đặt của bạn", ?)')
      .bind(genId('notif'), booking.customer_id, JSON.stringify({ booking_id: id, order_id: orderId })).run();
    return c.json({ order_id: orderId, conversation_id: convoId });
  } else {
    await c.env.DB.prepare('UPDATE bookings SET status = "finding", worker_id = NULL WHERE id = ?').bind(id).run();
    return c.json({ ok: true });
  }
});

app.post('/bookings/:id/status', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const booking = await getBooking(c.env.DB, id);
  if (!booking) return c.json({ error: 'Not found' }, 404);
  if (booking.worker_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  const body = await c.req.json<{ status: string }>();
  // Phải khớp CHECK(status IN ...) trong schema.sql
  const valid = ['finding', 'offered', 'accepted', 'in_progress', 'done', 'paid', 'cancelled'];
  if (!valid.includes(body.status)) return c.json({ error: 'Invalid status' }, 400);
  await c.env.DB.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(body.status, id).run();
  return c.json({ ok: true });
});

// ==================== JOBS & BIDS ====================

app.post('/jobs', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json<{ title: string; description: string; category_slug: string; district: string; budget_min?: number; budget_max?: number; deadline?: string; photos?: string[] }>();
  if (!body.title || !body.district) return c.json({ error: 'Missing fields' }, 400);
  const id = genId('job');
  const photos = JSON.stringify(body.photos || []);
  await c.env.DB.prepare('INSERT INTO jobs (id, customer_id, title, description, category_slug, district, budget_min, budget_max, deadline, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, body.title, body.description || '', body.category_slug, body.district, body.budget_min || 0, body.budget_max || 0, body.deadline || null, photos).run();
  return c.json({ id }, 201);
});

app.get('/jobs', async (c) => {
  const status = c.req.query('status') || 'open';
  const res = await c.env.DB.prepare('SELECT j.*, u.name as customer_name FROM jobs j JOIN users u ON u.id = j.customer_id WHERE j.status = ? ORDER BY j.created_at DESC').bind(status).all();
  return c.json(rows(res));
});

app.get('/jobs/:id', async (c) => {
  const id = c.req.param('id');
  const job = await getJob(c.env.DB, id);
  if (!job) return c.json({ error: 'Not found' }, 404);
  const bids = await c.env.DB.prepare('SELECT b.*, u.name as worker_name FROM bids b JOIN users u ON u.id = b.worker_id WHERE b.job_id = ? ORDER BY b.created_at DESC').bind(id).all();
  return c.json({ ...job, bids: rows(bids) });
});

app.post('/jobs/:id/bids', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const job = await getJob(c.env.DB, id);
  if (!job) return c.json({ error: 'Not found' }, 404);
  if (job.status !== 'open') return c.json({ error: 'Job not open' }, 400);
  const body = await c.req.json<{ price: number; message?: string; duration_days?: number }>();
  if (!body.price) return c.json({ error: 'Missing price' }, 400);
  const bidId = genId('bid');
  await c.env.DB.prepare('INSERT INTO bids (id, job_id, worker_id, price, message, duration_days) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(bidId, id, user.id, body.price, body.message || '', body.duration_days || 1).run();
  await c.env.DB.prepare('INSERT INTO notifications (id, user_id, type, title, body, payload) VALUES (?, ?, "job", "Có báo giá mới", "Có thợ gửi báo giá cho công việc của bạn", ?)')
    .bind(genId('notif'), job.customer_id, JSON.stringify({ job_id: id, bid_id: bidId })).run();
  return c.json({ id: bidId }, 201);
});

app.post('/bids/:id/accept', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const bidId = c.req.param('id');
  const bid = await c.env.DB.prepare('SELECT * FROM bids WHERE id = ?').bind(bidId).first();
  if (!bid) return c.json({ error: 'Not found' }, 404);
  const job = await getJob(c.env.DB, bid.job_id as string);
  if (!job || job.customer_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  const orderId = genId('ord');
  const convoId = genId('convo');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE bids SET status = "accepted" WHERE id = ?').bind(bidId),
    c.env.DB.prepare('UPDATE bids SET status = "rejected" WHERE job_id = ? AND id != ?').bind(bid.job_id, bidId),
    c.env.DB.prepare('UPDATE jobs SET status = "assigned" WHERE id = ?').bind(bid.job_id),
    c.env.DB.prepare('INSERT INTO orders (id, type, ref_id, customer_id, worker_id, amount, escrow, status) VALUES (?, "job", ?, ?, ?, ?, "none", "awaiting_payment")').bind(orderId, bid.job_id, user.id, bid.worker_id, bid.price),
    c.env.DB.prepare('INSERT INTO conversations (id, customer_id, worker_id, order_id, job_id) VALUES (?, ?, ?, ?, ?)').bind(convoId, user.id, bid.worker_id, orderId, bid.job_id)
  ]);
  await c.env.DB.prepare('INSERT INTO notifications (id, user_id, type, title, body, payload) VALUES (?, ?, "bid", "Báo giá được chấp nhận", "Báo giá của bạn đã được chấp nhận", ?)')
    .bind(genId('notif'), bid.worker_id, JSON.stringify({ job_id: bid.job_id, order_id: orderId })).run();
  return c.json({ order_id: orderId, conversation_id: convoId });
});

// ==================== ORDERS / ESCROW ====================

app.get('/orders', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const mine = c.req.query('mine') === '1';
  let q = 'SELECT * FROM orders WHERE 1=1';
  const args: any[] = [];
  if (mine) { q += ' AND (customer_id = ? OR worker_id = ?)'; args.push(user.id, user.id); }
  q += ' ORDER BY created_at DESC';
  const stmt = c.env.DB.prepare(q);
  const res = args.length ? await stmt.bind(...args).all() : await stmt.all();
  return c.json(rows(res));
});

app.get('/orders/:id', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const order = await getOrder(c.env.DB, id);
  if (!order) return c.json({ error: 'Not found' }, 404);
  if (order.customer_id !== user.id && order.worker_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  let related = null;
  if (order.type === 'instant') {
    related = await getBooking(c.env.DB, order.ref_id);
  } else {
    related = await getJob(c.env.DB, order.ref_id);
  }
  return c.json({ ...order, related });
});

app.post('/orders/:id/pay', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const order = await getOrder(c.env.DB, id);
  if (!order) return c.json({ error: 'Not found' }, 404);
  if (order.customer_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  if (order.status !== 'awaiting_payment') return c.json({ error: 'Invalid order status' }, 400);
  let wallet = await getWallet(c.env.DB, user.id);
  if (!wallet) {
    await c.env.DB.prepare('INSERT INTO wallets (user_id) VALUES (?)').bind(user.id).run();
    wallet = { user_id: user.id, available: 0, pending: 0 };
  }
  if (wallet.available < order.amount) return c.json({ error: 'Insufficient funds' }, 402);
  const txId = genId('tx');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE wallets SET available = available - ? WHERE user_id = ?').bind(order.amount, user.id),
    c.env.DB.prepare('UPDATE orders SET status = "in_progress", escrow = "held", updated_at = ? WHERE id = ?').bind(now(), id),
    c.env.DB.prepare('INSERT INTO transactions (id, user_id, order_id, kind, amount, note) VALUES (?, ?, ?, "hold", ?, ?)').bind(txId, user.id, id, order.amount, 'Hold payment')
  ]);
  return c.json({ ok: true });
});

app.post('/orders/:id/start', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const order = await getOrder(c.env.DB, id);
  if (!order) return c.json({ error: 'Not found' }, 404);
  if (order.worker_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB.prepare('UPDATE orders SET status = "in_progress", updated_at = ? WHERE id = ?').bind(now(), id).run();
  return c.json({ ok: true });
});

app.post('/orders/:id/deliver', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const order = await getOrder(c.env.DB, id);
  if (!order) return c.json({ error: 'Not found' }, 404);
  if (order.worker_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB.prepare('UPDATE orders SET status = "delivered", updated_at = ? WHERE id = ?').bind(now(), id).run();
  await c.env.DB.prepare('INSERT INTO notifications (id, user_id, type, title, body, payload) VALUES (?, ?, "order", "Công việc đã hoàn thành", "Thợ đã đánh dấu hoàn thành, vui lòng xác nhận", ?)')
    .bind(genId('notif'), order.customer_id, JSON.stringify({ order_id: id })).run();
  return c.json({ ok: true });
});

app.post('/orders/:id/confirm', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const order = await getOrder(c.env.DB, id);
  if (!order) return c.json({ error: 'Not found' }, 404);
  if (order.customer_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  if (order.status !== 'delivered' && order.status !== 'in_progress') return c.json({ error: 'Invalid order status' }, 400);
  if (order.escrow !== 'held') return c.json({ error: 'Payment not held' }, 400);
  const commission = Math.floor(order.amount * COMMISSION_RATE);
  const workerAmount = order.amount - commission;
  const txReleaseId = genId('tx');
  const txCommissionId = genId('tx');
  let workerWallet = await getWallet(c.env.DB, order.worker_id);
  if (!workerWallet) {
    await c.env.DB.prepare('INSERT INTO wallets (user_id) VALUES (?)').bind(order.worker_id).run();
  }
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE orders SET status = "completed", escrow = "released", updated_at = ? WHERE id = ?').bind(now(), id),
    c.env.DB.prepare('UPDATE wallets SET available = available + ? WHERE user_id = ?').bind(workerAmount, order.worker_id),
    c.env.DB.prepare('INSERT INTO transactions (id, user_id, order_id, kind, amount, note) VALUES (?, ?, ?, "release", ?, ?)').bind(txReleaseId, order.worker_id, id, workerAmount, 'Payment released'),
    c.env.DB.prepare('INSERT INTO transactions (id, user_id, order_id, kind, amount, note) VALUES (?, ?, ?, "commission", ?, ?)').bind(txCommissionId, order.worker_id, id, commission, 'Platform commission')
  ]);
  await c.env.DB.prepare('INSERT INTO notifications (id, user_id, type, title, body, payload) VALUES (?, ?, "order", "Đã nhận tiền", "Bạn đã nhận được thanh toán", ?)')
    .bind(genId('notif'), order.worker_id, JSON.stringify({ order_id: id, amount: workerAmount })).run();
  return c.json({ ok: true, commission, worker_amount: workerAmount });
});

app.post('/orders/:id/cancel', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const order = await getOrder(c.env.DB, id);
  if (!order) return c.json({ error: 'Not found' }, 404);
  if (order.customer_id !== user.id && order.worker_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  if (order.status === 'created' || order.status === 'awaiting_payment') {
    await c.env.DB.prepare('UPDATE orders SET status = "cancelled", updated_at = ? WHERE id = ?').bind(now(), id).run();
    return c.json({ ok: true });
  }
  if (order.escrow === 'held') {
    const txId = genId('tx');
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE orders SET status = "cancelled", escrow = "refunded", updated_at = ? WHERE id = ?').bind(now(), id),
      c.env.DB.prepare('UPDATE wallets SET available = available + ? WHERE user_id = ?').bind(order.amount, order.customer_id),
      c.env.DB.prepare('INSERT INTO transactions (id, user_id, order_id, kind, amount, note) VALUES (?, ?, ?, "refund", ?, ?)').bind(txId, order.customer_id, id, order.amount, 'Refund on cancel')
    ]);
    const otherParty = user.id === order.customer_id ? order.worker_id : order.customer_id;
    await c.env.DB.prepare('INSERT INTO notifications (id, user_id, type, title, body, payload) VALUES (?, ?, "order", "Đơn hàng đã hủy", "Đơn hàng đã bị hủy", ?)')
      .bind(genId('notif'), otherParty, JSON.stringify({ order_id: id })).run();
    return c.json({ ok: true, refunded: order.amount });
  }
  return c.json({ error: 'Cannot cancel this order' }, 400);
});

app.post('/orders/:id/review', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const order = await getOrder(c.env.DB, id);
  if (!order) return c.json({ error: 'Not found' }, 404);
  if (order.customer_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  if (order.status !== 'completed') return c.json({ error: 'Order not completed' }, 400);
  const existing = await c.env.DB.prepare('SELECT id FROM reviews WHERE order_id = ?').bind(id).first();
  if (existing) return c.json({ error: 'Already reviewed' }, 400);
  const body = await c.req.json<{ rating: number; comment?: string }>();
  if (!body.rating || body.rating < 1 || body.rating > 5) return c.json({ error: 'Invalid rating' }, 400);
  const reviewId = genId('rev');
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO reviews (id, order_id, author_id, target_user_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)').bind(reviewId, id, user.id, order.worker_id, body.rating, body.comment || ''),
    c.env.DB.prepare('UPDATE worker_profiles SET rating_avg = (rating_avg * rating_count + ?) / (rating_count + 1), rating_count = rating_count + 1 WHERE user_id = ?').bind(body.rating, order.worker_id)
  ]);
  await c.env.DB.prepare('INSERT INTO notifications (id, user_id, type, title, body, payload) VALUES (?, ?, "review", "Có đánh giá mới", "Bạn nhận được đánh giá mới", ?)')
    .bind(genId('notif'), order.worker_id, JSON.stringify({ order_id: id, rating: body.rating })).run();
  return c.json({ id: reviewId }, 201);
});

// ==================== WALLET ====================

app.get('/wallet', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  let wallet = await getWallet(c.env.DB, user.id);
  if (!wallet) {
    await c.env.DB.prepare('INSERT INTO wallets (user_id) VALUES (?)').bind(user.id).run();
    wallet = { user_id: user.id, available: 0, pending: 0 };
  }
  const txs = await c.env.DB.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all();
  return c.json({ available: wallet.available, pending: wallet.pending, transactions: rows(txs) });
});

app.post('/wallet/topup', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json<{ amount: number; method?: string }>();
  if (!body.amount || body.amount <= 0) return c.json({ error: 'Invalid amount' }, 400);
  let wallet = await getWallet(c.env.DB, user.id);
  if (!wallet) {
    await c.env.DB.prepare('INSERT INTO wallets (user_id) VALUES (?)').bind(user.id).run();
  }
  const txId = genId('tx');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE wallets SET available = available + ? WHERE user_id = ?').bind(body.amount, user.id),
    c.env.DB.prepare('INSERT INTO transactions (id, user_id, kind, amount, note) VALUES (?, ?, "topup", ?, ?)').bind(txId, user.id, body.amount, `Mock ${body.method || 'MoMo'} topup`)
  ]);
  return c.json({ ok: true });
});

app.post('/wallet/withdraw', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json<{ amount: number }>();
  if (!body.amount || body.amount <= 0) return c.json({ error: 'Invalid amount' }, 400);
  let wallet = await getWallet(c.env.DB, user.id);
  if (!wallet) {
    await c.env.DB.prepare('INSERT INTO wallets (user_id) VALUES (?)').bind(user.id).run();
    wallet = { user_id: user.id, available: 0, pending: 0 };
  }
  if (wallet.available < body.amount) return c.json({ error: 'Insufficient funds' }, 402);
  const txId = genId('tx');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE wallets SET available = available - ? WHERE user_id = ?').bind(body.amount, user.id),
    c.env.DB.prepare('INSERT INTO transactions (id, user_id, kind, amount, note) VALUES (?, ?, "withdraw", ?, ?)').bind(txId, user.id, body.amount, 'Mock withdraw')
  ]);
  return c.json({ ok: true });
});

// ==================== CHAT ====================

app.get('/conversations', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const convos = await c.env.DB.prepare('SELECT * FROM conversations WHERE customer_id = ? OR worker_id = ? ORDER BY last_message_at DESC').bind(user.id, user.id).all();
  const result = [];
  for (const convo of rows(convos) as any[]) {
    const lastMsg = await c.env.DB.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1').bind(convo.id).first();
    result.push({ ...convo, last_message: lastMsg || null });
  }
  return c.json(result);
});

app.get('/conversations/:id/messages', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const convo = await c.env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(id).first();
  if (!convo) return c.json({ error: 'Not found' }, 404);
  if ((convo as any).customer_id !== user.id && (convo as any).worker_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const before = c.req.query('before');
  let q = 'SELECT * FROM messages WHERE conversation_id = ?';
  const args: any[] = [id];
  if (before) { q += ' AND created_at < ?'; args.push(before); }
  q += ' ORDER BY created_at DESC LIMIT ?';
  args.push(limit);
  const msgs = await c.env.DB.prepare(q).bind(...args).all();
  return c.json(rows(msgs));
});

app.post('/conversations/:id/messages', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const convo = await c.env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(id).first();
  if (!convo) return c.json({ error: 'Not found' }, 404);
  if ((convo as any).customer_id !== user.id && (convo as any).worker_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  const body = await c.req.json<{ body: string; attachment_url?: string }>();
  if (!body.body) return c.json({ error: 'Missing body' }, 400);
  const msgId = genId('msg');
  const ts = now();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO messages (id, conversation_id, sender_id, body, attachment_url) VALUES (?, ?, ?, ?, ?)').bind(msgId, id, user.id, body.body, body.attachment_url || null),
    c.env.DB.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?').bind(ts, id)
  ]);
  const otherParty = (convo as any).customer_id === user.id ? (convo as any).worker_id : (convo as any).customer_id;
  await c.env.DB.prepare('INSERT INTO notifications (id, user_id, type, title, body, payload) VALUES (?, ?, "message", "Tin nhắn mới", ?, ?)')
    .bind(genId('notif'), otherParty, body.body.slice(0, 100), JSON.stringify({ conversation_id: id })).run();
  // Fan-out realtime tới các socket đang mở trong phòng chat (nếu có)
  try {
    const doStub = c.env.CHAT.get(c.env.CHAT.idFromName(id));
    await doStub.broadcastMessage({ id: msgId, conversationId: id, senderId: user.id, body: body.body, attachmentUrl: body.attachment_url || null, created_at: ts });
  } catch (e) {
    console.error('chat broadcast failed', e);
  }
  return c.json({ id: msgId }, 201);
});

app.get('/ws/chat/:conversationId', async (c) => {
  const id = c.req.param('conversationId');
  const upgrade = (c.req.header('Upgrade') || '').toLowerCase();
  if (upgrade !== 'websocket') return c.json({ error: 'Expected websocket' }, 426);
  const url = new URL(c.req.url);
  const token = url.searchParams.get('token');
  if (!token) return c.json({ error: 'Missing token' }, 400);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload?.sub) return c.json({ error: 'Unauthorized' }, 401);
  // Chỉ thành viên của conversation mới được kết nối
  const convo = await c.env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(id).first() as any;
  if (!convo) return c.json({ error: 'Not found' }, 404);
  if (convo.customer_id !== payload.sub && convo.worker_id !== payload.sub) return c.json({ error: 'Forbidden' }, 403);
  const doId = c.env.CHAT.idFromName(id);
  const doStub = c.env.CHAT.get(doId);
  // Forward request gốc (kèm header định danh) tới DO — DO trả response 101
  const req = new Request(c.req.raw, { headers: new Headers([...c.req.raw.headers, ['X-Chat-User', String(payload.sub)]]) });
  return doStub.fetch(req);
});

// ==================== NOTIFICATIONS ====================

app.get('/notifications', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const notifs = await c.env.DB.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all();
  return c.json(rows(notifs));
});

app.post('/notifications/read-all', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  await c.env.DB.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').bind(now(), user.id).run();
  return c.json({ ok: true });
});

app.post('/push/subscribe', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json<{ sub_json: string }>();
  if (!body.sub_json) return c.json({ error: 'Missing sub_json' }, 400);
  const id = genId('sub');
  await c.env.DB.prepare('INSERT INTO push_subscriptions (id, user_id, sub_json) VALUES (?, ?, ?)').bind(id, user.id, body.sub_json).run();
  return c.json({ id }, 201);
});

// ==================== UPLOADS ====================

app.post('/uploads', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'No file' }, 400);
  const key = `uploads/${Date.now()}_${file.name}`;
  await c.env.PHOTOS.put(key, file.stream());
  return c.json({ key }, 201);
});

app.get('/photos/*', async (c) => {
  // Key dạng "uploads/..." — lấy toàn bộ phần sau /photos/
  const key = c.req.path.replace(/^\/photos\//, '');
  if (!key) return c.json({ error: 'Not found' }, 404);
  const obj = await c.env.PHOTOS.get(key);
  if (!obj) return c.json({ error: 'Not found' }, 404);
  return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream' } });
});

// ==================== ADMIN ====================

app.get('/admin/stats', async (c) => {
  const user = await getAuthUser(c);
  if (!user || user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const usersCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
  const workersCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = "worker"').first();
  const ordersCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM orders').first();
  const revenue = await c.env.DB.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM orders').first();
  return c.json({ users: (usersCount as any).count, workers: (workersCount as any).count, orders: (ordersCount as any).count, revenue: (revenue as any).total });
});

app.get('/admin/users', async (c) => {
  const user = await getAuthUser(c);
  if (!user || user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const role = c.req.query('role');
  let q = 'SELECT * FROM users WHERE 1=1';
  const args: any[] = [];
  if (role) { q += ' AND role = ?'; args.push(role); }
  q += ' ORDER BY created_at DESC';
  const stmt = c.env.DB.prepare(q);
  const res = args.length ? await stmt.bind(...args).all() : await stmt.all();
  return c.json(rows(res));
});

app.post('/admin/users/:id/block', async (c) => {
  const user = await getAuthUser(c);
  if (!user || user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE users SET status = "blocked" WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

app.post('/admin/users/:id/unblock', async (c) => {
  const user = await getAuthUser(c);
  if (!user || user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE users SET status = "active" WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// ==================== DEV SEED ====================

app.post('/_dev/seed', async (c) => {
  const secret = c.env.JWT_SECRET;
  if (!secret.startsWith('dev-')) return c.json({ error: 'Forbidden' }, 403);
  // Clear tables
  await c.env.DB.exec(`
    DELETE FROM push_subscriptions;
    DELETE FROM reviews;
    DELETE FROM messages;
    DELETE FROM notifications;
    DELETE FROM conversations;
    DELETE FROM transactions;
    DELETE FROM wallets;
    DELETE FROM orders;
    DELETE FROM bids;
    DELETE FROM jobs;
    DELETE FROM bookings;
    DELETE FROM worker_profiles;
    DELETE FROM passwords;
    DELETE FROM users;
    DELETE FROM services;
  `);
  const hash = await hashPassword('fixnhanh123');
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO services (id, slug, name, icon, base_price, unit, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind('svc_1','dien','Điện','zap',150000,'lượt','Kiểm tra & sửa chữa điện dân dụng'),
    c.env.DB.prepare('INSERT INTO services (id, slug, name, icon, base_price, unit, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind('svc_2','nuoc','Nước','droplet',180000,'lượt','Sửa ống nước, van, bồn rửa...'),
    c.env.DB.prepare('INSERT INTO services (id, slug, name, icon, base_price, unit, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind('svc_3','moc','Mộc','hammer',200000,'lượt','Sửa tủ, lắp đặt nội thất, đóng tủ...'),
    c.env.DB.prepare('INSERT INTO services (id, slug, name, icon, base_price, unit, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind('svc_4','dien-lanh','Điện lạnh','snowflake',250000,'lượt','Sửa máy lạnh, tủ lạnh, máy giặt...'),
    c.env.DB.prepare('INSERT INTO services (id, slug, name, icon, base_price, unit, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind('svc_5','son','Sơn','paint',350000,'m2','Sơn nội thất/ngoại thất, trét tường...'),
    c.env.DB.prepare('INSERT INTO services (id, slug, name, icon, base_price, unit, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind('svc_6','ve-sinh','Vệ sinh','broom',300000,'lượt','Vệ sinh nhà cửa, máy lạnh, kính cao cấp...'),
    c.env.DB.prepare('INSERT INTO users (id, phone, name, role, avatar_url, status) VALUES (?, ?, ?, ?, ?, ?)').bind('usr_001','0900999999','Admin FixNhanh','admin','https://api.dicebear.com/7.x/avataaars/svg?seed=admin','active'),
    c.env.DB.prepare('INSERT INTO users (id, phone, name, role, avatar_url, status) VALUES (?, ?, ?, ?, ?, ?)').bind('usr_002','0900000001','Khách Hàng Demo','customer','https://api.dicebear.com/7.x/avataaars/svg?seed=customer','active'),
    c.env.DB.prepare('INSERT INTO users (id, phone, name, role, avatar_url, status) VALUES (?, ?, ?, ?, ?, ?)').bind('usr_003','0901111101','Thợ Điện Nước','worker','https://api.dicebear.com/7.x/avataaars/svg?seed=worker1','active'),
    c.env.DB.prepare('INSERT INTO passwords (user_id, hash) VALUES (?, ?)').bind('usr_001', hash),
    c.env.DB.prepare('INSERT INTO passwords (user_id, hash) VALUES (?, ?)').bind('usr_002', hash),
    c.env.DB.prepare('INSERT INTO passwords (user_id, hash) VALUES (?, ?)').bind('usr_003', hash),
    c.env.DB.prepare('INSERT INTO worker_profiles (user_id, bio, skills, districts, years_exp, cccd_last4, cccd_verified, rating_avg, rating_count, jobs_done, portfolio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind('usr_003','Thợ điện nước có 5 năm kinh nghiệm tại TP.HCM.','["dien","nuoc"]','["quan-1","thu-duc"]',5,'1234',1,4.8,12,45,'[]'),
  ]);
  return c.json({ ok: true, message: 'Seed completed' });
});

export const api = app;