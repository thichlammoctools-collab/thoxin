export function genId(prefix = 'id') {
  const uuid = crypto.randomUUID();
  return `${prefix}_${uuid.replace(/-/g, '').slice(0, 16)}`;
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 25000, hash: 'SHA-256' },
    key,
    256
  );
  const hashArr = new Uint8Array(bits);
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...hashArr));
  return `pbkdf2$25000$${saltB64}$${hashB64}`;
}

export async function verifyPassword(password: string, hash: string, allowDevFallback = false): Promise<boolean> {
  // Dev fallback cho tài khoản demo trong seed.sql — CHỈ bật khi JWT_SECRET là dev secret
  // (tránh việc ai cũng đăng nhập được tài khoản demo khi deploy production)
  if (hash === 'dev_fixnhanh123') return allowDevFallback && password === 'fixnhanh123';
  const [, iterStr, , storedHash] = hash.split('$');
  const iterations = parseInt(iterStr || '25000', 10);
  const enc = new TextEncoder().encode(password);
  const saltB64 = hash.split('$')[2];
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
  const hashArr = new Uint8Array(bits);
  const hashB64 = btoa(String.fromCharCode(...hashArr));
  return hashB64 === storedHash;
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64Url(str: string): string {
  const padding = str.length % 4;
  if (padding) str += '='.repeat(4 - padding);
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

export async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const sigB64 = toBase64Url(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

export async function verifyToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [headerB64, bodyB64, sigB64] = token.split('.');
    const data = `${headerB64}.${bodyB64}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sig = Uint8Array.from(fromBase64Url(sigB64), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data));
    if (!ok) return null;
    return JSON.parse(fromBase64Url(bodyB64));
  } catch {
    return null;
  }
}
