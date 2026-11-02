import { CookieName, UserLevel } from '@/lib/constants';
import type { NextRequest } from 'next/server';

export function normalizeUserLevel(level: string | undefined): string {
  const normalized = level?.trim().toUpperCase() ?? '';
  return normalized === 'ADMIN' ? UserLevel.ADMIN : normalized;
}

export function isAdminLevel(level: string | undefined): boolean {
  return normalizeUserLevel(level) === UserLevel.ADMIN;
}

export function isAdminRequest(request: NextRequest): boolean {
  return isAdminLevel(request.cookies.get(CookieName.SECURE_USER_LEVEL)?.value);
}
