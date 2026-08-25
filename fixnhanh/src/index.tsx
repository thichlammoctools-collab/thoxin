import { Hono } from 'hono';
import { landing } from './landing';
import { api } from './api';
import { admin } from './admin';
import { ChatDO } from './chat';
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

export default app;
export { ChatDO };
