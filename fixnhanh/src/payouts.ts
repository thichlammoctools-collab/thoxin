import { genId } from './auth';

export type PayoutConfig = { min_payout: number; payout_days: number[]; instant_fee_percent: number };

export const DEFAULT_PAYOUT_CONFIG: PayoutConfig = { min_payout: 500000, payout_days: [15], instant_fee_percent: 2 };

export async function getPayoutConfig(db: any): Promise<PayoutConfig> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind('payout_config').first() as any;
  if (!row) return DEFAULT_PAYOUT_CONFIG;
  try {
    const v = JSON.parse(row.value);
    const rawDays: number[] = Array.isArray(v.payout_days) ? v.payout_days.map((n: any) => Math.floor(Number(n))) : [];
    const days = [...new Set(rawDays.filter(n => Number.isInteger(n) && n >= 1 && n <= 28))].sort((a, b) => a - b);
    return {
      min_payout: Math.max(0, Number(v.min_payout) || 0),
      payout_days: days.length ? days : DEFAULT_PAYOUT_CONFIG.payout_days,
      instant_fee_percent: Math.min(50, Math.max(0, Number(v.instant_fee_percent ?? DEFAULT_PAYOUT_CONFIG.instant_fee_percent)))
    };
  } catch {
    return DEFAULT_PAYOUT_CONFIG;
  }
}

export async function savePayoutConfig(db: any, config: PayoutConfig): Promise<void> {
  await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind('payout_config', JSON.stringify(config)).run();
}

// Ngày hiện tại theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD
export function vnToday(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function isPayoutDay(config: PayoutConfig, dateStr: string): boolean {
  const day = Number(dateStr.slice(8, 10));
  // Ngày 28 trở đi coi như "cuối tháng" khi cấu hình chứa 28 (tháng có ít ngày hơn vẫn chạy)
  if (day >= 28 && config.payout_days.includes(28)) return true;
  return config.payout_days.includes(day);
}

/**
 * Rút nhanh (instant): trừ available ngay, payout được đánh dấu 'paid' tức thì.
 * Thợ nhận amount - phí; phí về nền tảng. Trả về số tiền thợ thực nhận và phí.
 */
export async function processInstantPayout(db: any, workerId: string, amount: number, feePercent: number, note = ''): Promise<{ received: number; fee: number; payout_id: string }> {
  const fee = Math.floor(amount * feePercent / 100);
  const received = amount - fee;
  const payoutId = genId('pay');
  const ts = new Date().toISOString();
  await db.batch([
    db.prepare('UPDATE wallets SET available = MAX(0, available - ?) WHERE user_id = ?').bind(amount, workerId),
    db.prepare("INSERT INTO payouts (id, worker_id, amount, status, note, paid_at) VALUES (?, ?, ?, 'paid', ?, ?)")
      .bind(payoutId, workerId, amount, `Instant${note ? ': ' + note.slice(0, 150) : ''}`, ts),
    db.prepare("INSERT INTO transactions (id, user_id, kind, amount, note) VALUES (?, ?, 'withdraw', ?, ?)")
      .bind(genId('tx'), workerId, -received, `Rút nhanh (phí ${feePercent}% = ${fee}đ)`)
  ]);
  return { received, fee, payout_id: payoutId };
}

/**
 * Xử lý batch payout cho một ngày nhất định:
 * chuyển mọi payout 'pending' thành 'paid' nếu hôm nay là ngày thanh toán cấu hình.
 * Trả về số lượng và tổng tiền đã chi trả.
 */
export async function runPayoutBatch(db: any, dateStr: string): Promise<{ is_payout_day: boolean; paid_count: number; total_paid: number }> {
  const config = await getPayoutConfig(db);
  if (!isPayoutDay(config, dateStr)) return { is_payout_day: false, paid_count: 0, total_paid: 0 };
  const pending = await db.prepare("SELECT id, worker_id, amount FROM payouts WHERE status = 'pending'").all();
  let paidCount = 0, totalPaid = 0;
  for (const p of (pending.results || []) as any[]) {
    await db.batch([
      db.prepare("UPDATE payouts SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'pending'").bind(dateStr + 'T00:00:00.000Z', p.id),
      db.prepare('UPDATE wallets SET pending = MAX(0, pending - ?) WHERE user_id = ?').bind(p.amount, p.worker_id),
      db.prepare("INSERT INTO transactions (id, user_id, kind, amount, note) VALUES (?, ?, 'withdraw', ?, ?)")
        .bind(genId('tx'), p.worker_id, -p.amount, `Payout ${dateStr}`)
    ]);
    paidCount++;
    totalPaid += Number(p.amount) || 0;
  }
  return { is_payout_day: true, paid_count: paidCount, total_paid: totalPaid };
}
