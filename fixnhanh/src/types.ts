import type { ChatDO } from './chat';

export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  CHAT: DurableObjectNamespace<ChatDO>;
  JWT_SECRET: string;
  ADMIN_SEED_PHONE: string;
}
