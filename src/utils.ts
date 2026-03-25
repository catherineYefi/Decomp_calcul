export function formatRub(n: number, compact = false): string {
  if (isNaN(n) || !isFinite(n)) return '—';
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' млн ₽';
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + ' тыс ₽';
    return n.toFixed(0) + ' ₽';
  }
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

export function formatNum(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '—';
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}

export function formatRoi(roi: number): string {
  if (isNaN(roi) || !isFinite(roi)) return '—';
  return (roi * 100).toFixed(0) + '%';
}

export function roiClass(roi: number): string {
  if (roi >= 1) return 'roi-positive';
  if (roi >= 0) return 'roi-neutral';
  return 'roi-negative';
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function urlEncode(state: object): string {
  return btoa(encodeURIComponent(JSON.stringify(state)));
}

export function urlDecode<T>(str: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(atob(str))) as T;
  } catch {
    return null;
  }
}
