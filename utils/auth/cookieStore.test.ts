import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cookieStore } from './cookieStore';

describe('cookieStore', () => {
  beforeEach(() => {
    // Clear cookies before each test
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
  });

  afterEach(() => {
    // Restore original cookie state if needed, though we should probably leave it clean
  });

  it('should read a simple cookie', () => {
    document.cookie = 'test_cookie=hello;path=/';
    expect(cookieStore.getCookie('test_cookie')).toBe('hello');
  });

  it('should handle URI encoded values', () => {
    document.cookie = 'test_cookie=' + encodeURIComponent('hello world') + ';path=/';
    expect(cookieStore.getCookie('test_cookie')).toBe('hello world');
  });

  it('should return empty string for non-existent cookie', () => {
    expect(cookieStore.getCookie('missing')).toBe('');
  });

  it('should handle inconsistent naming for Full Name', () => {
    document.cookie = 'user_fullname=John Doe;path=/';
    expect(cookieStore.getFullName()).toBe('John Doe');

    document.cookie = 'user_fullname=;expires=' + new Date(0).toUTCString() + ';path=/';
    document.cookie = 'user_FullName=Jane Doe;path=/';
    expect(cookieStore.getFullName()).toBe('Jane Doe');
  });

  it('should normalize level to ADM if ADMIN', () => {
    document.cookie = 'user_level=admin;path=/';
    expect(cookieStore.getLevel()).toBe('ADM');

    document.cookie = 'user_level=mgr;path=/';
    expect(cookieStore.getLevel()).toBe('MGR');
  });

  it('should handle multiple variants for Section/Afdeling', () => {
    document.cookie = 'user_afdeling=Estate A;path=/';
    expect(cookieStore.getSection()).toBe('Estate A');

    document.cookie = 'user_afdeling=;expires=' + new Date(0).toUTCString() + ';path=/';
    document.cookie = 'user_Section=Estate B;path=/';
    expect(cookieStore.getSection()).toBe('Estate B');
  });

  it('should handle many variants for Gang/Kemandoran', () => {
    document.cookie = 'user_gangcode=G01;path=/';
    expect(cookieStore.getGang()).toBe('G01');

    document.cookie = 'user_gangcode=;expires=' + new Date(0).toUTCString() + ';path=/';
    document.cookie = 'user_GANG_CODE=G02;path=/';
    expect(cookieStore.getGang()).toBe('G02');
  });

  it('should get locale and locale tag', () => {
    document.cookie = 'NEXT_LOCALE=id;path=/';
    expect(cookieStore.getLocale()).toBe('id');
    expect(cookieStore.getLocaleTag()).toBe('id-ID');

    document.cookie = 'NEXT_LOCALE=en;path=/';
    expect(cookieStore.getLocale()).toBe('en');
    expect(cookieStore.getLocaleTag()).toBe('en-US');
  });

  it('should return default locale if missing', () => {
    expect(cookieStore.getLocale()).toBe('id');
    expect(cookieStore.getLocaleTag()).toBe('id-ID');
  });

  it('should get all user info at once', () => {
    document.cookie = 'user_fullname=John;path=/';
    document.cookie = 'user_level=ast;path=/';
    document.cookie = 'user_fcba=FC01;path=/';
    document.cookie = 'user_section=SEC01;path=/';
    document.cookie = 'user_gang=G01;path=/';
    document.cookie = 'user_photo=img.jpg;path=/';

    const info = cookieStore.getAllUserInfo();
    expect(info).toEqual({
      fullName: 'John',
      level: 'AST',
      fcba: 'FC01',
      section: 'SEC01',
      gang: 'G01',
      photo: 'img.jpg'
    });
  });

  it('should set a cookie correctly', () => {
    cookieStore.setCookie('new_cookie', 'new_value', 1);
    expect(cookieStore.getCookie('new_cookie')).toBe('new_value');
  });

  it('should optimize cookie parsing by caching results of unchanged document.cookie', () => {
    document.cookie = 'user_level=adm;path=/';
    const firstLevel = cookieStore.getLevel();
    expect(firstLevel).toBe('ADM');

    // Modifying a different unrelated key to ensure we don't return stale when cookie actually changes
    document.cookie = 'user_fullname=Alice;path=/';
    const secondLevel = cookieStore.getLevel();
    const secondName = cookieStore.getFullName();
    expect(secondLevel).toBe('ADM');
    expect(secondName).toBe('Alice');

    // Modifying user_level, verifying cache invalidates and reflects the new value
    document.cookie = 'user_level=mgr;path=/';
    const thirdLevel = cookieStore.getLevel();
    expect(thirdLevel).toBe('MGR');
  });
});
