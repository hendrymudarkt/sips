'use client';

import { useEffect, useState, memo, useCallback } from 'react';
import Image from 'next/image';
import { getCsrfToken } from '@/lib/auth/fetchWithCsrf';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Drawer } from '../layout/drawer';
import { Theme } from '../theme/theme';
import { LanguageSwitcher } from '../layout/language-switcher';
import { toTitleCase } from '@/utils/helpers/textManipulation';
import { getProxiedImageUrl } from '@/utils/helpers/imageHelper';
import { useTranslations } from 'next-intl';
import { cookieStore } from '@/utils/auth/cookieStore';
import { Icon } from '@/app/components/ui/icons';
import { env } from '@/lib/env';

const FALLBACK_AVATAR =
  'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp';

// Memoize Navbar so it only re-renders when pathname-driven state changes.
export default memo(function Navbar() {
  const t = useTranslations('Navbar');
  const router = useRouter();
  const pathname = usePathname();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fullNameDisplay, setFullNameDisplay] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNavigating, setIsNavigating] = useState<string | null>(null);

  // Reset the progress bar when navigation completes.
  useEffect(() => {
    setIsNavigating(null);
  }, [pathname]);

  // Read cookies once on mount.
  useEffect(() => {
    const { photo, fullName, fcba } = cookieStore.getAllUserInfo();
    const cleanPhoto = photo?.trim();
    const name = fullName?.trim() ?? '';
    const unit = fcba?.trim() ?? '';

    const parts: string[] = [];
    if (name) parts.push(toTitleCase(name));
    if (unit) parts.push(`(${unit.toUpperCase()})`);

    setPhotoUrl(
      cleanPhoto && cleanPhoto !== 'null' && cleanPhoto !== 'undefined' ? cleanPhoto : null
    );
    setFullNameDisplay(parts.join(' ').trim() || null);
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken() || '',
        },
      });
      if (response.ok) {
        router.push('/');
      } else {
        setIsLoggingOut(false);
      }
    } catch {
      setIsLoggingOut(false);
    }
  }, [router]);

  const handleNavigate = useCallback(
    (href: string) => {
      if (pathname === href) return;
      setIsNavigating(href);
      router.push(href);
    },
    [pathname, router]
  );

  const avatarSrc = getProxiedImageUrl(photoUrl) || FALLBACK_AVATAR;

  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="navbar-start">
        <Drawer />
      </div>

      <div className="navbar-center">
        {/* The logo is the likely LCP element on this page. */}
        <Link
          href="/dashboard"
          aria-label={t('dashboard')}
          className="hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-primary rounded-lg outline-none"
        >
          <Image src="/logo.svg" alt="SIPS" width={50} height={50} priority />
        </Link>
      </div>

      <div className="navbar-end gap-2">
        <LanguageSwitcher />

        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={t('userMenu')}
          >
            <div className="w-10 rounded-full">
              <Image
                alt={t('userAvatar')}
                src={avatarSrc}
                width={40}
                height={40}
                className="rounded-full object-cover"
                unoptimized
              />
            </div>
          </div>

          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow"
          >
            <li>
              <span className="font-bold">{fullNameDisplay ?? t('pengguna')}</span>
            </li>
            <li>
              <Theme />
            </li>
            <li>
              {env.NEXT_PUBLIC_SITE_URL && (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`${env.NEXT_PUBLIC_SITE_URL}/app_archive.asp`}
                  className="w-full text-left justify-between flex items-center"
                >
                  <span className="flex items-center gap-1">
                    SIPS Apps
                    <Icon name="external-link" className="h-4 w-4" />
                  </span>
                  <span className="badge">{t('download')}</span>
                </a>
              )}
            </li>
            {env.NEXT_PUBLIC_SITE_URL && (
              <li>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={env.NEXT_PUBLIC_SITE_URL}
                  className="justify-between"
                >
                  <span className="flex items-center gap-1">
                    SIPS
                    <Icon name="external-link" className="h-4 w-4" />
                  </span>
                  <span className="badge">{t('visit')}</span>
                </a>
              </li>
            )}
            <li>
              <button
                onClick={() => handleNavigate('/change-password')}
                className="w-full text-left"
                disabled={!!isNavigating}
              >
                {t('profile')}
              </button>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className={`w-full text-left ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <span className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-xs" />
                    {t('logout')}
                  </span>
                ) : (
                  t('logout')
                )}
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Navigation progress bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
          <div className="h-1 bg-primary animate-pulse" />
        </div>
      )}

      {/* Logout overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-white font-medium">{t('signingOut')}</p>
          </div>
        </div>
      )}
    </div>
  );
});



