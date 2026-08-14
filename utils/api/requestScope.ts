import type { NextRequest } from 'next/server';
import { UserLevel, CookieName } from '@/lib/constants';

type GangParam = 'gang' | 'gangcode' | 'kemandoran';

type ApplyUserDataScopeOptions = {
  gangParam?: GangParam;
};

const ADMIN_LEVELS = new Set<string>([UserLevel.ADMIN]);
const FCBA_LEVELS = new Set<string>([UserLevel.MANAGER, UserLevel.KSI]);
const AFDELING_LEVELS = new Set<string>([
  UserLevel.MD1,
  UserLevel.ASISTEN,
  UserLevel.KRT,
  UserLevel.KRA,
]);
const GANG_LEVELS = new Set<string>([UserLevel.KEPALA_REGU_PANEN, UserLevel.MANDOR]);

function getCookieValue(req: NextRequest, name: string) {
  return req.cookies.get(name)?.value || '';
}

function normalizeLevel(level: string) {
  const upperLevel = level.toUpperCase();
  return upperLevel === 'ADMIN' ? UserLevel.ADMIN : upperLevel;
}

export function applyUserDataScope(
  req: NextRequest,
  searchParams: URLSearchParams,
  options: ApplyUserDataScopeOptions = {}
) {
  // SECURITY: Authorization uses ONLY httpOnly SECURE_* cookies set server-side
  // on login. The client-readable user_* cookies are tamperable and must never
  // be trusted for data scoping (CWE-807) — a forged user_Level=ADMIN cookie
  // previously bypassed scoping and exposed every FCBA's data.
  const level = normalizeLevel(getCookieValue(req, CookieName.SECURE_USER_LEVEL));

  if (!level || ADMIN_LEVELS.has(level)) return searchParams;

  const fcba = getCookieValue(req, CookieName.SECURE_USER_FCBA);
  const afdeling = getCookieValue(req, CookieName.SECURE_USER_AFDELING);
  const gang = getCookieValue(req, CookieName.SECURE_USER_GANG);

  if (FCBA_LEVELS.has(level) || AFDELING_LEVELS.has(level) || GANG_LEVELS.has(level)) {
    if (fcba) searchParams.set('fcba', fcba);
  }

  if (AFDELING_LEVELS.has(level) || GANG_LEVELS.has(level)) {
    if (afdeling) searchParams.set('afdeling', afdeling);
  }

  if (GANG_LEVELS.has(level)) {
    const gangParam = options.gangParam || 'kemandoran';
    if (gang) searchParams.set(gangParam, gang);
  }

  return searchParams;
}
