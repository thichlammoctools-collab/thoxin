import type { D1Result, D1Database } from '@cloudflare/workers-types';

export type User = { id: string; phone: string; name: string; role: string; avatar_url?: string; status: string; created_at: string };
export type WorkerProfile = { user_id: string; bio: string; skills: string[]; districts: string[]; years_exp: number; rating_avg: number; rating_count: number; jobs_done: number };
export type Service = { id: string; slug: string; name: string; icon: string; base_price: number; unit: string; description: string; active: number };
export type Booking = { id: string; customer_id: string; worker_id?: string; service_id: string; address: string; district: string; scheduled_at?: string; note: string; photos: string[]; quoted_price: number; status: string; created_at: string };
export type Job = { id: string; customer_id: string; title: string; description: string; category_slug: string; photos: string[]; budget_min: number; budget_max: number; district: string; deadline?: string; status: string; created_at: string };
export type Bid = { id: string; job_id: string; worker_id: string; price: number; message: string; duration_days: number; status: string; created_at: string };
export type Order = { id: string; type: string; ref_id: string; customer_id: string; worker_id: string; amount: number; escrow: string; status: string; created_at: string; updated_at: string };
export type Wallet = { user_id: string; available: number; pending: number };
export type Transaction = { id: string; user_id: string; order_id?: string; kind: string; amount: number; note: string; created_at: string };
export type Conversation = { id: string; customer_id: string; worker_id: string; order_id?: string; job_id?: string; last_message_at?: string; created_at: string };
export type Message = { id: string; conversation_id: string; sender_id: string; body: string; attachment_url?: string; created_at: string };
export type Notification = { id: string; user_id: string; type: string; title: string; body: string; payload: string; read_at?: string; created_at: string };
export type Review = { id: string; order_id: string; author_id: string; target_user_id: string; rating: number; comment: string; created_at: string };

export function row<T>(r: D1Result<T> | null): T | undefined {
  return r?.results?.[0];
}

export function rows<T>(r: D1Result<T> | null): T[] {
  return r?.results || [];
}

export async function getUserByPhone(db: D1Database, phone: string): Promise<User | undefined> {
  return row(await db.prepare('SELECT * FROM users WHERE phone = ?').bind(phone).first());
}

export async function getUserById(db: D1Database, id: string): Promise<User | undefined> {
  return row(await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first());
}

export async function getWorkerProfile(db: D1Database, userId: string): Promise<WorkerProfile | undefined> {
  return row(await db.prepare('SELECT * FROM worker_profiles WHERE user_id = ?').bind(userId).first());
}

export async function getService(db: D1Database, id: string): Promise<Service | undefined> {
  return row(await db.prepare('SELECT * FROM services WHERE id = ?').bind(id).first());
}

export async function getBooking(db: D1Database, id: string): Promise<Booking | undefined> {
  return row(await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first());
}

export async function getJob(db: D1Database, id: string): Promise<Job | undefined> {
  return row(await db.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first());
}

export async function getOrder(db: D1Database, id: string): Promise<Order | undefined> {
  return row(await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first());
}

export async function getWallet(db: D1Database, userId: string): Promise<Wallet | undefined> {
  return row(await db.prepare('SELECT * FROM wallets WHERE user_id = ?').bind(userId).first());
}

export async function listWorkers(db: D1Database, skill?: string, district?: string, sort = 'rating'): Promise<WorkerProfile[]> {
  let q = 'SELECT u.*, wp.bio, wp.skills, wp.districts, wp.years_exp, wp.rating_avg, wp.rating_count, wp.jobs_done FROM users u JOIN worker_profiles wp ON wp.user_id = u.id WHERE u.role = "worker" AND u.status = "active"';
  const args: string[] = [];
  if (skill) { q += ' AND wp.skills LIKE ?'; args.push(`%"${skill}"%`); }
  if (district) { q += ' AND wp.districts LIKE ?'; args.push(`%"${district}"%`); }
  q += sort === 'rating' ? ' ORDER BY wp.rating_avg DESC, wp.jobs_done DESC' : ' ORDER BY wp.jobs_done DESC';
  return rows(await db.prepare(q).bind(...args).all());
}

export async function listServices(db: D1Database): Promise<Service[]> {
  return rows(await db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY base_price').all());
}

export async function listBookings(db: D1Database, customerId?: string, workerId?: string): Promise<Booking[]> {
  let q = 'SELECT * FROM bookings WHERE 1=1';
  const args: string[] = [];
  if (customerId) { q += ' AND customer_id = ?'; args.push(customerId); }
  if (workerId) { q += ' AND worker_id = ?'; args.push(workerId); }
  q += ' ORDER BY created_at DESC';
  return rows(await db.prepare(q).bind(...args).all());
}

export async function listJobs(db: D1Database, status?: string): Promise<Job[]> {
  let q = 'SELECT * FROM jobs WHERE 1=1';
  const args: string[] = [];
  if (status) { q += ' AND status = ?'; args.push(status); }
  q += ' ORDER BY created_at DESC';
  return rows(await db.prepare(q).bind(...args).all());
}

export async function listBids(db: D1Database, jobId: string): Promise<Bid[]> {
  return rows(await db.prepare('SELECT * FROM bids WHERE job_id = ? ORDER BY created_at DESC').bind(jobId).all());
}

export async function listOrders(db: D1Database, customerId?: string, workerId?: string): Promise<Order[]> {
  let q = 'SELECT * FROM orders WHERE 1=1';
  const args: string[] = [];
  if (customerId) { q += ' AND customer_id = ?'; args.push(customerId); }
  if (workerId) { q += ' AND worker_id = ?'; args.push(workerId); }
  q += ' ORDER BY created_at DESC';
  return rows(await db.prepare(q).bind(...args).all());
}

export async function listConversations(db: D1Database, userId: string): Promise<Conversation[]> {
  return rows(await db.prepare('SELECT * FROM conversations WHERE customer_id = ? OR worker_id = ? ORDER BY last_message_at DESC').bind(userId, userId).all());
}

export async function listMessages(db: D1Database, convoId: string, limit = 50): Promise<Message[]> {
  return rows(await db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?').bind(convoId, limit).all());
}

export async function listNotifications(db: D1Database, userId: string): Promise<Notification[]> {
  return rows(await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all());
}

export async function listReviews(db: D1Database, targetUserId: string): Promise<Review[]> {
  return rows(await db.prepare('SELECT * FROM reviews WHERE target_user_id = ? ORDER BY created_at DESC').bind(targetUserId).all());
}
