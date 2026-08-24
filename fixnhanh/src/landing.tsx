import { Hono } from 'hono';
import { jsx } from 'hono/jsx';
import type { Env } from './types';

/** @jsx jsx */
/** @jsxImportSource hono/jsx */

export const landing = new Hono<{ Bindings: Env }>();
landing.get('/', async (c) => {
  const services = await c.env.DB.prepare('SELECT * FROM services WHERE active = 1').all();
  const workers = await c.env.DB.prepare('SELECT * FROM worker_profiles ORDER BY rating_avg DESC LIMIT 6').all();
  return c.html(
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>FixNhanh — Thợ sửa chữa tận nhà TP.HCM</title>
        <meta name="description" content="Tìm thợ điện, nước, mộc, sơn... tận nhà tại TP.HCM. Đặt lịch nhanh, giá rõ ràng, thanh toán an toàn." />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/icon.svg" />
        <script dangerouslySetInnerHTML={{ __html: `self.CSS_SUPPORT=true;` }} />
      </head>
      <body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#F5F8FC;color:#0B2438">
        <header style="background:linear-gradient(135deg,#0B6CFF,#00C2FF);color:#fff;padding:24px 16px 48px;border-radius:0 0 24px 24px">
          <div style="max-width:1200px;margin:0 auto">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 2L4 14h6v8l10 6 10-6v-8h6L16 2z" fill="#FF7A00"/></svg>
              <span style="font-size:20px;font-weight:800">FixNhanh</span>
            </div>
            <h1 style="font-size:28px;margin:0 0 8px;line-height:1.2">Sửa chữa tận nhà<br/>chỉ trong vài giây</h1>
            <p style="margin:0;opacity:0.95;font-size:16px">Điện · Nước · Mộc · Điện lạnh · Sơn · Vệ sinh</p>
            <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
              <a href="/app" style="background:#FF7A00;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px">Mở app FixNhanh</a>
              <a href="/app" style="background:rgba(255,255,255,0.2);color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;backdrop-filter:blur(6px)">Tìm thợ ngay</a>
            </div>
          </div>
        </header>
        <main style="max-width:1200px;margin:0 auto;padding:24px 16px">
          <section style="margin-bottom:32px">
            <h2 style="font-size:22px;margin:0 0 16px">Dịch vụ phổ biến</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
              {(services.results || []).map((s: any) => (
                <div key={s.id} style="background:#fff;padding:16px;border-radius:16px;box-shadow:0 2px 8px rgba(11,108,255,0.06);text-align:center">
                  <div style="font-size:28px;margin-bottom:8px">{s.icon}</div>
                  <div style="font-weight:700;color:#0B2438">{s.name}</div>
                  <div style="font-size:13px;color:#64748B;margin-top:4px">Từ {new Intl.NumberFormat('vi-VN').format(s.base_price)}đ/{s.unit}</div>
                </div>
              ))}
            </div>
          </section>
          <section style="margin-bottom:32px">
            <h2 style="font-size:22px;margin:0 0 16px">Thợ hàng đầu</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
              {(workers.results || []).map((w: any) => (
                <div key={w.user_id} style="background:#fff;padding:16px;border-radius:16px;box-shadow:0 2px 8px rgba(11,108,255,0.06)">
                  <div style="display:flex;align-items:center;gap:12px">
                    <div style="width:48px;height:48px;border-radius:50%;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-weight:700;color:#0B6CFF">{w.user_id?.slice(-2)}</div>
                    <div>
                      <div style="font-weight:700;color:#0B2438">Thợ #{w.user_id?.slice(-4)}</div>
                      <div style="font-size:12px;color:#64748B">{w.skills?.replace(/[\[\]"]/g,'').split(',')[0]} · ⭐ {w.rating_avg}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section style="text-align:center;padding:24px 0">
            <h2 style="font-size:22px;margin:0 0 8px">Sẵn sàng sửa chữa tận nhà?</h2>
            <p style="color:#64748B;margin:0 0 16px">Đặt lịch trên FixNhanh, thợ xác nhận trong vài phút.</p>
            <a href="/app" style="background:#0B6CFF;color:#fff;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">Bắt đầu ngay</a>
          </section>
        </main>
        <footer style="text-align:center;padding:24px;color:#94A3B8;font-size:12px">
          © 2026 FixNhanh. Đặt lịch thợ sửa chữa tận nhà TP.HCM.
        </footer>
      </body>
    </html>
  );
});

landing.get('/app', (c) => c.html('<script>location.href="/app/";</script>'));
landing.get('/app/*', (c) => c.html('<script>location.href="/app/";</script>'));
