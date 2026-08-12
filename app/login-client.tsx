'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './components/layout/language-switcher';
import { Icon } from '@/app/components/ui/icons';

import { isValidRedirect } from '@/utils/helpers/sanitization';
import { env } from '@/lib/env';


type Firefly = {
  top: number;
  left: number;
  duration: number;
  delay: number;
  size: number;
};

export default function Home() {
  const router = useRouter();
  const tAuth = useTranslations('Auth');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const LOADING_TIPS = [tAuth('tip0'), tAuth('tip1'), tAuth('tip2'), tAuth('tip3')];
  const searchParams = useSearchParams();

  const rawRedirect = searchParams.get('redirect');
  const redirectTo = isValidRedirect(rawRedirect) ? (rawRedirect as string) : '/dashboard';

  // SECURITY: Hapus localStorage untuk mencegah XSS
  // useEffect(() => {
  //   const saved = window.localStorage.getItem('sips_saved_login');
  //   if (!saved) return;
  //   try {
  //     const parsed = JSON.parse(saved) as { username?: string };
  //     if (parsed.username) {
  //       setUsername(parsed.username);
  //       setSaveUsername(true);
  //     }
  //   } catch {
  //     window.localStorage.removeItem('sips_saved_login');
  //   }
  // }, []);

  // useEffect(() => {
  //   if (saveUsername) {
  //     window.localStorage.setItem('sips_saved_login', JSON.stringify({ username }));
  //   } else {
  //     window.localStorage.removeItem('sips_saved_login');
  //   }
  // }, [saveUsername, username]);

  // Generate fireflies sekali saja (random posisi/ukuran)
  const [fireflies, setFireflies] = useState<Firefly[]>([]);

  useEffect(() => {
    setFireflies(
      Array.from({ length: 24 }, () => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        duration: 10 + Math.random() * 10,
        delay: Math.random() * 8,
        size: 4 + Math.random() * 6,
      }))
    );
  }, []);

  // Rotasi tips saat loading
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => setTipIndex(prev => (prev + 1) % LOADING_TIPS.length), 2200);
    return () => clearInterval(interval);
  }, [isLoading, LOADING_TIPS.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    setIsCapsLock(e.getModifierState('CapsLock'));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({ username: username.toLowerCase(), password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsLoading(false);
        router.push(redirectTo);
      } else {
        setError(data.message || data.error || tAuth('loginError'));
        setIsLoading(false);
      }
    } catch {
      setError(tAuth('unexpectedError'));
      setIsLoading(false);
    }
  };

  return (
    <div className="relative font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-base-200 overflow-hidden">
      {/* ?? Palette Improvement: Language Switcher for accessibility on login page */}
      <div className="fixed top-4 right-4 z-50 animate-fadeIn">
        <div className="bg-base-100/50 backdrop-blur-sm rounded-full p-0.5 shadow-sm border border-base-300/50 hover:bg-base-100 transition-all duration-300">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Decorative animated background blobs + fireflies */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-32 top-10 h-64 w-64 bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -right-32 bottom-10 h-72 w-72 bg-secondary/20 blur-3xl animate-pulse [animation-delay:400ms]" />
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 bg-accent/10 blur-3xl opacity-70 animate-pulse [animation-duration:4s]" />

        {/* Fireflies */}
        {fireflies.map((f, idx) => (
          <span
            key={idx}
            aria-hidden="true"
            className="firefly"
            style={{
              top: `${f.top}%`,
              left: `${f.left}%`,
              width: `${f.size}px`,
              height: `${f.size}px`,
              animationDuration: `${f.duration}s, 2.4s`,
              animationDelay: `${f.delay}s, ${f.delay / 2}s`,
            }}
          />
        ))}
      </div>

      {/* Loading Overlay - Smooth fade effect + tips */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="flex flex-col items-center gap-4 px-6 py-4 rounded-2xl bg-base-100/90 shadow-lg">
            <span className="loading loading-spinner loading-lg text-primary" />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-base-content">{tAuth('verifying')}</p>
              <p className="text-xs text-base-content/70 animate-fadeIn">
                {LOADING_TIPS[tipIndex]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Konten utama */}
      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 flex flex-col sm:flex-row gap-6 sm:gap-10 lg:gap-16 row-start-2 items-center sm:items-start focus:outline-none"
      >
        {/* Left side text / highlight */}
        <section className="hidden sm:flex sm:flex-1 flex-col gap-3 max-w-md animate-fadeIn [animation-duration:700ms]">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary/80 uppercase">
            SIPS MOBILE WEB
          </p>
          <h1 className="text-2xl font-bold leading-snug">
            {tAuth('tagline1')}
            <span className="text-primary"> {tAuth('tagline2')}</span> {tAuth('tagline3')}
          </h1>
          <p className="text-sm text-base-content/70">
            {tAuth('description')}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-base-content/60">
            <span className="status status-success inline-block animate-pulse [animation-duration:2s]" />
            <span>{tAuth('features')}</span>
          </div>

          {env.NEXT_PUBLIC_SITE_URL && (
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`${env.NEXT_PUBLIC_SITE_URL}/app_archive.asp`}
              className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-base-100/80 px-3 py-2 shadow-md animate-bounce transition hover:bg-base-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="lock" className="h-5 w-5 text-primary" />
              </div>
              <div className="text-[0.7rem] leading-snug">
                <p className="font-semibold text-base-content">
                  {tAuth('downloadText')}
                </p>
              </div>
            </a>
          )}
        </section>

        {/* Login Card */}
        <div className="card bg-base-100 card-border border-base-300 sm:flex-1 sm:max-w-sm overflow-hidden shadow-lg shadow-base-300/40 animate-fadeIn [animation-duration:600ms] [animation-delay:150ms] transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">
          <div className="border-base-300 border-b border-dashed">
            <div className="flex items-center gap-2 p-4">
              <div className="grow flex items-center gap-2">
                <Image
                  src="/logo.svg"
                  alt="SIPS Logo"
                  width={32}
                  height={32}
                  className="opacity-90 animate-pulse [animation-duration:2.2s]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold tracking-[0.22em] text-primary/80">
                    {tAuth('login').toUpperCase()}
                  </span>
                  <span className="text-sm font-medium">SIPS MOBILE WEB</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="card-body gap-4">
            <p className="text-xs opacity-60">
              {tAuth('adminHint')}
            </p>

            {/* Username */}
            <div className="flex flex-col gap-1">
              <label className="input input-border flex w-full max-w-none items-center gap-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/70">
                <Icon name="user" className="h-4 w-4 opacity-70" />
                <input
                  type="text"
                  className="grow bg-transparent outline-none"
                  placeholder={tAuth('username')}
                  aria-label={tAuth('username')}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                  autoFocus
                />
              </label>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="input input-border flex w-full max-w-none items-center gap-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/70">
                <Icon name="key" className="h-4 w-4 opacity-70" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="grow bg-transparent outline-none"
                  placeholder={tAuth('password')}
                  aria-label={tAuth('password')}
                  aria-describedby="password-hint"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyDown}
                  disabled={isLoading}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="btn btn-ghost btn-square btn-xs opacity-70 hover:text-primary"
                  aria-label={showPassword ? tAuth('hidePassword') : tAuth('showPassword')}
                  title={showPassword ? tAuth('hidePassword') : tAuth('showPassword')}
                >
                  {showPassword ? (
                    <Icon name="eye-off" className="h-4 w-4" />
                  ) : (
                    <Icon name="eye" className="h-4 w-4" />
                  )}
                </button>
              </label>

              {error && (
                <span
                  role="alert"
                  aria-live="polite"
                  className="text-error flex items-center gap-2 px-1 text-[0.6875rem] animate-fadeIn [animation-duration:300ms]"
                >
                  <span className="status status-error inline-block" aria-hidden="true" />
                  {error}
                </span>
              )}
              {isCapsLock && (
                <span
                  className="text-warning flex items-center gap-2 px-1 text-[0.6875rem] animate-fadeIn"
                  role="alert"
                  aria-live="polite"
                >
                  <span className="status status-warning inline-block" aria-hidden="true" />
                  {tAuth('capsLock')}
                </span>
              )}
              {!error && (
                <span
                  id="password-hint"
                  className="text-base-content/60 flex items-center gap-2 px-1 text-[0.6875rem]"
                >
                  <span
                    className="status status-warning inline-block animate-pulse [animation-duration:2s]"
                    aria-hidden="true"
                  />
                  {tAuth('passwordHint')}
                </span>
              )}
              {/* SECURITY: Remember username disabled to prevent XSS via localStorage */}
            </div>

            {/* Actions */}
            <div className="card-actions items-center gap-6 mt-2">
              <button
                type="submit"
                className="btn btn-primary w-full transition-transform duration-200 hover:-translate-y-[1px] active:scale-95"
                disabled={isLoading}
                aria-label={isLoading ? tAuth('loggingIn') : tAuth('login')}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    {tAuth('loggingIn')}
                  </>
                ) : (
                  tAuth('login')
                )}
              </button>
            </div>

            <Link href="/forgot-password" className="link link-primary link-hover self-center text-xs">
              {tAuth('forgotPassword')}
            </Link>

            {env.NEXT_PUBLIC_SITE_URL && (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`${env.NEXT_PUBLIC_SITE_URL}/app_archive.asp`}
                className="sm:hidden mt-3 flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100/80 w-full px-4 py-3 shadow-sm transition-all duration-200 hover:bg-base-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-primary outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon name="lock" className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-base-content leading-tight">{tAuth('downloadText')}</p>
                  <p className="text-[0.6rem] text-base-content/50 leading-tight">{env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, '')}</p>
                </div>
                <Icon name="chevron-right" className="h-4 w-4 ml-auto text-base-content/30" />
              </a>
            )}
          </form>
        </div>

      </main>

      {/* Custom CSS for the firefly animation */}
      <style jsx global>{`
        .firefly {
          position: absolute;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(250, 250, 210, 1) 0%,
            rgba(250, 250, 210, 0.8) 30%,
            rgba(59, 130, 246, 0.3) 60%,
            rgba(59, 130, 246, 0) 100%
          );
          box-shadow: 0 0 18px rgba(250, 250, 210, 0.9);
          opacity: 0.8;
          animation-name: firefly-drift, firefly-flicker;
          animation-timing-function: ease-in-out, ease-in-out;
          animation-iteration-count: infinite, infinite;
          animation-direction: alternate, alternate;
        }

        @keyframes firefly-drift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          25% {
            transform: translate3d(10px, -16px, 0) scale(1.1);
          }
          50% {
            transform: translate3d(-12px, -8px, 0) scale(0.95);
          }
          75% {
            transform: translate3d(8px, 12px, 0) scale(1.05);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes firefly-flicker {
          0% {
            opacity: 0.2;
          }
          20% {
            opacity: 0.9;
          }
          40% {
            opacity: 0.4;
          }
          60% {
            opacity: 1;
          }
          80% {
            opacity: 0.3;
          }
          100% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}



