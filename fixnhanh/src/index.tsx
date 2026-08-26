import { Hono } from 'hono';
import { landing } from './landing';
import { api } from './api';
import { admin } from './admin';
import { ChatDO } from './chat';
import { runPayoutBatch, vnToday } from './payouts';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.route('/', landing);
app.route('/api', api);
app.route('/admin', admin);

app.get('/photos/*', async (c) => {
  const key = c.req.path.replace(/^\/photos\//, '');
  try {
    const obj = await c.env.PHOTOS.get(key);
    if (!obj) return c.notFound();
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    return new Response(obj.body, { headers });
  } catch (e) {
    return c.notFound();
  }
});

export default {
  fetch: app.fetch,
  // Cron hằng ngày 00:15 giờ VN: nếu hôm nay là ngày thanh toán cấu hình thì chi trả các payout 'pending'
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runPayoutBatch(env.DB, vnToday()));
  }
} as ExportedHandler<Env>;
export { ChatDO };
