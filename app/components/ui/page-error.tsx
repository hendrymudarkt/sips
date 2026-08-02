'use client';

import { useTranslations } from 'next-intl';

interface PageErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function PageError({ error, reset }: PageErrorProps) {
  const t = useTranslations('Errors');

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-base-200 p-4 animate-fadeIn">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-error/20">
        <div className="card-body items-center text-center p-6 gap-4">
          <div className="relative">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-base-content">{t('somethingWentWrong')}</h2>
          <p className="text-sm text-base-content/70 leading-relaxed break-words max-w-xs">{error.message || t('unexpectedErrorDesc')}</p>
          <button
            onClick={reset}
            className="btn btn-primary btn-sm rounded-full px-6 shadow-md transition-all hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label={t('tryAgain')}
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}
