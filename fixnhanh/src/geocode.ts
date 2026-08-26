// Geocode địa chỉ TP.HCM qua Nominatim (OpenStreetMap) — free, không API key.
// Usage policy: ~1 req/s, cần User-Agent mô tả app. Chỉ gọi 1 lần khi tạo việc.
const VIEWBOX_HCMC = '106.62,11.15,107.08,10.40'; // left,top,right,bottom
const DISTRICT_NAMES: Record<string, string> = {
  'quan-1': 'Quận 1', 'quan-2': 'Quận 2', 'quan-3': 'Quận 3', 'quan-4': 'Quận 4',
  'quan-5': 'Quận 5', 'quan-6': 'Quận 6', 'quan-7': 'Quận 7', 'quan-8': 'Quận 8',
  'quan-9': 'Quận 9', 'quan-10': 'Quận 10', 'quan-11': 'Quận 11', 'quan-12': 'Quận 12',
  'binh-thanh': 'Bình Thạnh', 'go-vap': 'Gò Vấp', 'tan-binh': 'Tân Bình',
  'tan-phu': 'Tân Phú', 'phu-nhuan': 'Phú Nhuận', 'thu-duc': 'Thủ Đức'
};

// Tâm quận — fallback khi geocode thất bại hoặc job cũ không có tọa độ.
export const DISTRICT_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  'quan-1': { lat: 10.7769, lng: 106.7009 },
  'quan-2': { lat: 10.7890, lng: 106.7620 },
  'quan-3': { lat: 10.7830, lng: 106.6930 },
  'quan-4': { lat: 10.7560, lng: 106.7040 },
  'quan-5': { lat: 10.7540, lng: 106.6670 },
  'quan-6': { lat: 10.7440, lng: 106.6340 },
  'quan-7': { lat: 10.7340, lng: 106.7220 },
  'quan-8': { lat: 10.7280, lng: 106.6260 },
  'quan-9': { lat: 10.8320, lng: 106.8330 },
  'quan-10': { lat: 10.7750, lng: 106.6670 },
  'quan-11': { lat: 10.7630, lng: 106.6290 },
  'quan-12': { lat: 10.8620, lng: 106.6560 },
  'binh-thanh': { lat: 10.8000, lng: 106.6900 },
  'go-vap': { lat: 10.8300, lng: 106.6600 },
  'tan-binh': { lat: 10.8020, lng: 106.6400 },
  'tan-phu': { lat: 10.7940, lng: 106.6120 },
  'phu-nhuan': { lat: 10.8000, lng: 106.6790 },
  'thu-duc': { lat: 10.8560, lng: 106.7580 }
};

export function districtCentroid(district?: string | null): { lat: number; lng: number } {
  if (district && DISTRICT_CENTROIDS[district]) return DISTRICT_CENTROIDS[district];
  return { lat: 10.7750, lng: 106.7000 }; // trung tâm TP.HCM
}

export async function geocodeAddress(address: string, district?: string | null): Promise<{ lat: number; lng: number } | null> {
  const trimmed = address.trim();
  if (!trimmed || trimmed.length < 4) return null;
  const districtName = district ? DISTRICT_NAMES[district] : undefined;
  const q = encodeURIComponent(`${trimmed}${districtName ? ', ' + districtName : ''}, Hồ Chí Minh`);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&bounded=1&viewbox=${VIEWBOX_HCMC}&accept-language=vi&q=${q}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FixNhanh/1.0 (job location lookup)' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    const hit = data?.[0];
    if (!hit) return null;
    const lat = Number(hit.lat), lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
