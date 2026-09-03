export function toBackendDateTime(v?: string | null): string {
  const s = String(v ?? '')
    .trim()
    .replace('T', ' ')
    .replace(/Z$/, '')
    .split('.')[0] as string;
  const [date, time] = s.split(' ');
  if (!date) return '';
  if (!time) return date;
  return `${date} ${time.length <= 5 ? `${time}:00` : time.slice(0, 8)}`;
}

export function getTodayISO(): string {
  const now = new Date();
  return formatDateISO(now);
}

export function getYesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function formatDateISO(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateDMY(raw: string | null | undefined): string {
  if (!raw) return '-';
  const trimmed = raw.trim();
  if (!trimmed) return '-';
  const onlyDate = trimmed.split(' ')[0];
  const parts = onlyDate?.split('-');
  if (!parts || parts.length !== 3) return trimmed;
  const [y, m, d] = parts;
  if (!y || !m || !d) return trimmed;
  return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
}
