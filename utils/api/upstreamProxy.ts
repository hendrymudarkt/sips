import { cookies } from 'next/headers';
export { ABSENSI_BASE, BACKEND_URL } from '@/utils/auth/backendConfig';

export async function getTokenFromCookie() {
  const jar = await cookies();
  return jar.get('auth_token')?.value;
}

export async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function buildFilteredUrl(base: string, searchParams: URLSearchParams) {
  const url = new URL(base);
  const validParams = [
    'tanggal',
    'tanggal_end',
    'kode_karyawan_mandor',
    'kode_karyawan',
    'fcba',
    'afdeling',
    'gang',
    'gangcode',
    'kemandoran',
    'attendance',
    'status_attendance',
    'attendance_type',
    'fcba_destination',
    'sourcetime',
    'nodokumen',
    'tph',
    'fieldcode',
  ];
  validParams.forEach(key => {
    const v = searchParams.get(key);
    if (v) url.searchParams.append(key, v);
  });
  return url;
}

