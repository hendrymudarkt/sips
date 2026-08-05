/**
 * ⚡ Bolt: Centralized store for reading user info from cookies.
 *
 * Optimized to use a single-pass parser for document.cookie to avoid repeated
 * expensive regex scans when reading multiple user info fields.
 */

export interface UserInfo {
  fullName: string;
  level: string;
  fcba: string;
  section: string;
  gang: string;
  photo: string;
}

/* ⚡ Bolt: Define cookie name variants in constants to avoid duplication and improve maintenance */
const FULL_NAME_VARIANTS = ['user_FullName', 'user_fullname', 'user_Name', 'user_name'];
const LEVEL_VARIANTS = ['user_Level', 'user_LEVEL', 'user_level'];
const FCBA_VARIANTS = ['user_Fcba', 'user_FCBA', 'user_fcba'];
const SECTION_VARIANTS = [
  'user_Section',
  'user_SECTION',
  'user_section',
  'user_Afdeling',
  'user_afdeling',
];
const GANG_VARIANTS = [
  'user_Gang',
  'user_gang',
  'user_GANG',
  'user_GangCode',
  'user_GANGCODE',
  'user_gangcode',
  'user_GANG_CODE',
  'user_gang_code',
];
const PHOTO_VARIANTS = ['user_Photo', 'user_photo'];

/* ⚡ Bolt: Module-level cache to avoid redundant split/parse of unchanged cookie strings */
let lastCookieString = '';
let cachedCookies: Record<string, string> = {};

/**
 * ⚡ Bolt Optimization: Parses all cookies into a plain object in a single pass.
 * Caches the parsed result based on document.cookie string identity to avoid split, trim,
 * and decode overhead on subsequent calls during the same render cycle/tick.
 */
const getCookiesMap = (): Record<string, string> => {
  if (typeof document === 'undefined') return {};

  const currentCookieString = document.cookie;
  if (currentCookieString === lastCookieString) {
    return cachedCookies;
  }

  const cookies: Record<string, string> = {};
  const pairs = currentCookieString.split(';');
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].trim();
    if (!pair) continue;
    const splitIndex = pair.indexOf('=');
    if (splitIndex === -1) continue;

    const key = pair.substring(0, splitIndex).trim();
    const value = pair.substring(splitIndex + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  lastCookieString = currentCookieString;
  cachedCookies = cookies;
  return cookies;
};

const getFromMap = (map: Record<string, string>, variants: string[]): string => {
  for (let i = 0; i < variants.length; i++) {
    const val = map[variants[i]];
    if (val) return val;
  }
  return '';
};

const normalizeLevel = (level: string): string => {
  const upperLevel = level.toUpperCase();
  return upperLevel === 'ADMIN' ? 'ADM' : upperLevel;
};

export const cookieStore = {
  /** Individual lookup (still faster than regex if only 1 check, but best for multiple) */
  getCookie: (name: string): string => getCookiesMap()[name] || '',

  getFullName: () => getFromMap(getCookiesMap(), FULL_NAME_VARIANTS),

  getLevel: () => normalizeLevel(getFromMap(getCookiesMap(), LEVEL_VARIANTS)),

  getFcba: () => getFromMap(getCookiesMap(), FCBA_VARIANTS),

  getSection: () => getFromMap(getCookiesMap(), SECTION_VARIANTS),

  getGang: () => getFromMap(getCookiesMap(), GANG_VARIANTS),

  getPhoto: () => getFromMap(getCookiesMap(), PHOTO_VARIANTS),

  getLocale: () => getCookiesMap()['NEXT_LOCALE'] || 'id',

  /** Returns BCP 47 locale tag for use with toLocaleString / toLocaleDateString */
  getLocaleTag: (): string => {
    const locale = getCookiesMap()['NEXT_LOCALE'] || 'id';
    const map: Record<string, string> = { id: 'id-ID', en: 'en-US' };
    return map[locale] ?? 'id-ID';
  },

  setCookie: (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') return;
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  },

  /**
   * ⚡ Bolt Optimization: Retrieves all user info with a single parse of document.cookie.
   * This is O(N) instead of the previous O(N * 26) complexity.
   */
  getAllUserInfo: (): UserInfo => {
    const map = getCookiesMap();
    return {
      fullName: getFromMap(map, FULL_NAME_VARIANTS),
      level: normalizeLevel(getFromMap(map, LEVEL_VARIANTS)),
      fcba: getFromMap(map, FCBA_VARIANTS),
      section: getFromMap(map, SECTION_VARIANTS),
      gang: getFromMap(map, GANG_VARIANTS),
      photo: getFromMap(map, PHOTO_VARIANTS),
    };
  },
};
