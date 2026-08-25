import { DurableObject } from 'cloudflare:workers';
import { genId } from './auth';
import type { Env } from './types';

interface ChatAttachment {
  userId: string;
}

// Một instance ChatDO cho mỗi conversation (đặt tên theo conversation id).
// Client kết nối qua WebSocket; tin nhắn đến từ 2 đường:
//  1. Gửi trực tiếp qua socket -> webSocketMessage()
//  2. Gửi qua REST POST /conversations/:id/messages -> broadcastMessage() (RPC)
export class ChatDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if ((request.headers.get('upgrade') || '').toLowerCase() !== 'websocket') {
      return new Response('expected websocket upgrade', { status: 426 });
    }
    const userId = request.headers.get('X-Chat-User') || '';
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    // Hibernation API: socket sống sót qua eviction, tự quản lý bởi runtime
    this.ctx.acceptWebSocket(server, [userId]);
    server.serializeAttachment({ userId } satisfies ChatAttachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  // Tin nhắn gửi thẳng qua socket (PWA hiện gửi qua REST, nhưng giữ cho WS
  // là transport đầy đủ: persist xuống D1 rồi fan-out)
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    try {
      const parsed = JSON.parse(message) as { body?: string };
      if (!parsed.body) return;
      const conversationId = this.ctx.id.name || '';
      const att = ws.deserializeAttachment() as ChatAttachment | null;
      const userId = att?.userId || '';
      const msgId = genId('msg');
      const createdAt = new Date().toISOString();
      await this.env.DB.batch([
        this.env.DB.prepare('INSERT INTO messages (id, conversation_id, sender_id, body, attachment_url) VALUES (?, ?, ?, ?, ?)')
          .bind(msgId, conversationId, userId, parsed.body, null),
        this.env.DB.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?').bind(createdAt, conversationId)
      ]);
      await this.broadcastMessage({
        id: msgId,
        conversationId,
        senderId: userId,
        body: parsed.body,
        attachmentUrl: null,
        created_at: createdAt
      });
    } catch (err) {
      console.error('chat ws message error', err);
    }
  }

  // Gọi qua RPC từ REST endpoint sau khi message đã được persist vào D1
  async broadcastMessage(payload: Record<string, unknown>): Promise<void> {
    const data = JSON.stringify(payload);
    for (const sock of this.ctx.getWebSockets()) {
      try {
        sock.send(data);
      } catch {
        // socket chết — hibernation API sẽ dọn qua webSocketClose
      }
    }
  }
}
