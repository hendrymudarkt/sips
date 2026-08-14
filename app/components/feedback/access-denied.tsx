'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * 🎨 Palette Enhancement: AccessDenied component.
 * Provides a localized, accessible, and visually polished screen for unauthorized access.
 */
export function AccessDenied({ message }: { message?: string }) {
  const t = useTranslations('Common');

  return (
    <div className="min-h-screen bg-base-200 p-6 flex items-center justify-center animate-fadeIn">
      <div className="card bg-base-100 shadow-xl max-w-md w-full border border-base-300">
        <div className="card-body items-center text-center py-12">
          {/* Icon with pulsing background */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-error/20 rounded-full animate-ping [animation-duration:3s]" />
            <div className="bg-error/10 p-6 rounded-full relative ring-8 ring-base-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12 text-error"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-base-content mb-2">
            {t('accessDenied')}
          </h1>

          <p className="text-base text-base-content/60 leading-relaxed mb-10">
            {message ?? t('accessDeniedDesc')}
          </p>

          <div className="card-actions w-full">
            <Link
              href="/dashboard"
              className="btn btn-primary btn-block rounded-full shadow-md transition-all hover:scale-[1.02] active:scale-95"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              {t('backToDashboard')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
