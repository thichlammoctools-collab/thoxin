export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  CHAT: DurableObjectNamespace;
  JWT_SECRET: string;
  ADMIN_SEED_PHONE: string;
}
