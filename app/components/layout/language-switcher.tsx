'use client';

import { Icon } from '@/app/components/ui/icons';
import { useState, useEffect, useRef } from 'react';
import { cookieStore } from '@/utils/auth/cookieStore';
import { useTranslations } from 'next-intl';

export const LanguageSwitcher = () => {
  const t = useTranslations('Navbar');
  const [locale, setLocale] = useState('id');
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setLocale(cookieStore.getLocale());
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    cookieStore.setCookie('NEXT_LOCALE', newLocale);
    setLocale(newLocale);
    // 🎨 Palette Improvement: Close the dropdown immediately
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.location.reload();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Close dropdown by blurring active elements
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Return focus to trigger button
      triggerRef.current?.focus();
    }
  };

  return (
    <div className="dropdown dropdown-end" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="flex items-center gap-1.5 px-2 py-1 btn btn-ghost btn-xs focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={t('languageMenu')}
        title={t('languageMenu')}
      >
        <Icon name="globe" className="h-4 w-4" />
        <span className="uppercase font-bold text-[10px] tracking-wider">{locale}</span>
        <Icon name="chevron-down" className="h-3 w-3 opacity-60" />
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu menu-sm bg-base-300 rounded-box z-[1] w-40 p-2 shadow-2xl mt-1"
      >
        <li>
          <button
            className={`flex items-center justify-between px-3 py-2 font-medium focus-visible:ring-2 focus-visible:ring-primary ${locale === 'en' ? 'active text-primary' : ''}`}
            onClick={() => handleLanguageChange('en')}
            aria-current={locale === 'en' ? 'true' : undefined}
          >
            <span className="text-sm">English (EN)</span>
            {locale === 'en' && (
              <Icon name="check" className="h-4 w-4" />
            )}
          </button>
        </li>
        <li>
          <button
            className={`flex items-center justify-between px-3 py-2 font-medium focus-visible:ring-2 focus-visible:ring-primary ${locale === 'id' ? 'active text-primary' : ''}`}
            onClick={() => handleLanguageChange('id')}
            aria-current={locale === 'id' ? 'true' : undefined}
          >
            <span className="text-sm">Indonesia (ID)</span>
            {locale === 'id' && (
              <Icon name="check" className="h-4 w-4" />
            )}
          </button>
        </li>
      </ul>
    </div>
  );
};


