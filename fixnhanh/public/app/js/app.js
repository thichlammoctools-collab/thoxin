export const API_BASE = '/api';
export const APP_VERSION = '0.1.0';

export async function api(path, opts = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    location.hash = '#/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast show';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 200); }, 2500);
}
