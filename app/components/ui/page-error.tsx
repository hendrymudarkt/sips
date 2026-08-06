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
      <div className="card w-full max-w-sm bg-base-100 shadow-md border border-error/15 p-6 text-center">
        <h2 className="text-xl font-bold text-error mb-2">{t('somethingWentWrong')}</h2>
        <p className="text-sm text-base-content/60 mb-4">{t('unexpectedErrorDesc')}</p>
        {error?.message && (
          <p className="bg-base-200/50 p-2 rounded text-xs font-mono break-all text-error mb-4 border border-error/5 max-h-24 overflow-y-auto">
            {error.message}
          </p>
        )}
        <button
          onClick={reset}
          className="btn btn-primary btn-sm rounded-full w-full max-w-xs mx-auto focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {t('tryAgain')}
        </button>
      </div>
    </div>
  );
}
