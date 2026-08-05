import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LanguageSwitcher } from './language-switcher';
import { cookieStore } from '@/utils/auth/cookieStore';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock cookieStore
vi.mock('@/utils/auth/cookieStore', () => ({
  cookieStore: {
    getLocale: vi.fn(() => 'id'),
    setCookie: vi.fn(),
  },
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true,
      configurable: true,
    });
  });

  it('renders correctly with the initial locale and icons', () => {
    vi.mocked(cookieStore.getLocale).mockReturnValue('id');
    render(<LanguageSwitcher />);

    const button = screen.getByRole('button', { name: 'languageMenu' });
    expect(button).toBeDefined();
    expect(screen.getByText('id')).toBeDefined();
  });

  it('changes language and reloads window when clicking a language option', () => {
    vi.mocked(cookieStore.getLocale).mockReturnValue('id');
    render(<LanguageSwitcher />);

    // Click trigger to open dropdown in jsdom context (optional since we fire click directly on the dropdown options)
    const enOption = screen.getByText('English (EN)');
    fireEvent.click(enOption);

    expect(cookieStore.setCookie).toHaveBeenCalledWith('NEXT_LOCALE', 'en');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('closes dropdown and returns focus to trigger button when pressing Escape', () => {
    vi.mocked(cookieStore.getLocale).mockReturnValue('id');
    render(<LanguageSwitcher />);

    const trigger = screen.getByRole('button', { name: 'languageMenu' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Focus on an item inside dropdown
    const enOption = screen.getByText('English (EN)').closest('button');
    expect(enOption).not.toBeNull();
    enOption?.focus();
    expect(document.activeElement).toBe(enOption);

    // Spy on blur for activeElement
    const blurSpy = vi.spyOn(document.activeElement as HTMLElement, 'blur');

    // Fire Escape key event
    fireEvent.keyDown(enOption!, { key: 'Escape', code: 'Escape' });

    // Verify blur was called to close CSS-only dropdown
    expect(blurSpy).toHaveBeenCalled();
    // Verify focus returned to trigger button
    expect(document.activeElement).toBe(trigger);
  });
});
