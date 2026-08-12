'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon } from '@/app/components/ui/icons';

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tAuth = useTranslations('Auth');

  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const hasValidParams = Boolean(email && token);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError(tAuth('passwordMismatch'));
      setIsLoading(false);
      return;
    }

    try {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({
          email,
          token,
          password,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || tAuth('invalidLink'));
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      router.push('/');
    } catch {
      setError(tAuth('resetError'));
      setIsLoading(false);
    }
  };

  return (
    <div className="relative font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-base-200 overflow-hidden">
      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 row-start-2 flex w-full items-center justify-center focus:outline-none"
      >
        <div className="card bg-base-100 card-border border-base-300 w-full max-w-sm overflow-hidden shadow-lg shadow-base-300/40 animate-fadeIn [animation-duration:600ms]">
          <div className="border-base-300 border-b border-dashed">
            <div className="flex items-center gap-2 p-4">
              <div className="grow flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold tracking-[0.22em] text-primary/80">
                    {tAuth('resetTitle').toUpperCase()}
                  </span>
                  <span className="text-sm font-medium">SIPS MOBILE WEB</span>
                </div>
              </div>
            </div>
          </div>

          {!hasValidParams ? (
            <div className="card-body gap-4">
              <div className="flex items-center gap-3 rounded-2xl bg-warning/10 border border-warning/20 px-4 py-3 animate-fadeIn [animation-duration:300ms]">
                <Icon name="warning" className="h-5 w-5 text-warning shrink-0" />
                <p className="text-sm text-base-content" role="alert">
                  {tAuth('invalidLink')}
                </p>
              </div>
              <a
                href="/forgot-password"
                className="btn btn-ghost w-full transition-transform duration-200 hover:-translate-y-[1px] active:scale-95"
              >
                <Icon name="back-arrow" className="h-4 w-4" />
                {tAuth('forgotPassword')}
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card-body gap-4">
              <p className="text-xs opacity-60">{tAuth('resetSubtitle')}</p>

              <div className="flex flex-col gap-1">
                <label className="input input-border flex w-full max-w-none items-center gap-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/70">
                  <Icon name="key" className="h-4 w-4 opacity-70" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="grow bg-transparent outline-none"
                    placeholder={tAuth('newPassword')}
                    aria-label={tAuth('newPassword')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    minLength={8}
                    autoFocus
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
              </div>

              <div className="flex flex-col gap-1">
                <label className="input input-border flex w-full max-w-none items-center gap-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/70">
                  <Icon name="key" className="h-4 w-4 opacity-70" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="grow bg-transparent outline-none"
                    placeholder={tAuth('confirmPassword')}
                    aria-label={tAuth('confirmPassword')}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    minLength={8}
                  />
                </label>
              </div>

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

              <button
                type="submit"
                className="btn btn-primary w-full transition-transform duration-200 hover:-translate-y-[1px] active:scale-95"
                disabled={isLoading}
                aria-label={isLoading ? tAuth('resetting') : tAuth('resetPassword')}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    {tAuth('resetting')}
                  </>
                ) : (
                  tAuth('resetPassword')
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
