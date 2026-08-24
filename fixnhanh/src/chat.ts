import { DurableObject } from 'cloudflare:workers';

export class ChatDO extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.env = env;
    this.sessions = new Set<WebSocket>();
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      server.serializeOptions = { maxDuration: 0 };
      this.sessions.add(server);
      this.handleSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('ok');
  }
  async handleSocket(ws) {
    ws.addEventListener('message', async (e) => {
      try {
        const msg = JSON.parse(e.data);
        const { conversationId, senderId, body, attachmentUrl } = msg;
        const id = crypto.randomUUID();
        const stmt = this.env.DB.prepare('INSERT INTO messages (id, conversation_id, sender_id, body, attachment_url) VALUES (?, ?, ?, ?, ?)');
        await stmt.bind(id, conversationId, senderId, body, attachmentUrl || null).run();
        await this.env.DB.prepare('UPDATE conversations SET last_message_at = datetime("now") WHERE id = ?').bind(conversationId).run();
        const payload = JSON.stringify({ id, conversationId, senderId, body, attachmentUrl: attachmentUrl || null, created_at: new Date().toISOString() });
        for (const socket of this.sessions) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(payload);
          }
        }
      } catch (err) {
        console.error('chat error', err);
      }
    });
    ws.addEventListener('close', () => {
      this.sessions.delete(ws);
    });
  }
}
