'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

interface PageErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 🎨 Palette Enhancement: Upgraded localized, beautiful, and accessible PageError component.
 * Features:
 * - Full next-intl localization using the "Errors" namespace
 * - Entrance and pulsing warning animations (fadeIn, ping)
 * - Modern, responsive card layout aligned with the rest of the app's views
 * - High-contrast keyboard navigation rings (focus-visible)
 */
export function PageError({ error, reset }: PageErrorProps) {
  const t = useTranslations('Errors');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-base-200 animate-fadeIn">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-error/20">
        <div className="card-body items-center text-center gap-4">
          {/* Pulsing warning icon container */}
          <div className="relative mb-2">
            <div className="absolute inset-0 bg-error/20 rounded-full animate-ping [animation-duration:3s]" />
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center relative ring-4 ring-base-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          <h2 className="card-title text-2xl font-bold text-base-content">
            {t('somethingWentWrong')}
          </h2>

          <p className="text-sm text-base-content/60 leading-relaxed mb-2">
            {error.message || t('unexpectedErrorDesc')}
          </p>

          <button
            type="button"
            onClick={reset}
            className="btn btn-primary btn-block rounded-full shadow-md transition-all hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t('tryAgain')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 mr-2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            {t('tryAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}
