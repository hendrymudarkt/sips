import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Navbar from './navbar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock cookieStore
vi.mock('@/utils/auth/cookieStore', () => ({
  cookieStore: {
    getAllUserInfo: vi.fn(() => ({
      photo: 'my-photo.jpg',
      fullName: 'John Doe',
      fcba: 'FCBA1',
    })),
    getLocale: vi.fn(() => 'id'),
  },
}));

// Mock Drawer, Theme, LanguageSwitcher to avoid deeply nested complexities in layout test
vi.mock('../layout/drawer', () => ({
  Drawer: () => <div data-testid="drawer">Drawer</div>,
}));

vi.mock('../theme/theme', () => ({
  Theme: () => <div data-testid="theme">Theme</div>,
}));

vi.mock('../layout/language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">LanguageSwitcher</div>,
}));

// Mock getProxiedImageUrl and text manipulation helpers
vi.mock('@/utils/helpers/imageHelper', () => ({
  getProxiedImageUrl: (url: string) => url,
}));

vi.mock('@/utils/helpers/textManipulation', () => ({
  toTitleCase: (str: string) => str,
}));

// Mock @/lib/auth/fetchWithCsrf
vi.mock('@/lib/auth/fetchWithCsrf', () => ({
  getCsrfToken: vi.fn(() => 'csrf-mock'),
}));

// Mock @/lib/env
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: 'http://example.com',
  },
}));

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navbar elements correctly including user menu and avatar', () => {
    render(<Navbar />);

    expect(screen.getByTestId('drawer')).toBeDefined();
    expect(screen.getByTestId('language-switcher')).toBeDefined();
    expect(screen.getByRole('button', { name: 'userMenu' })).toBeDefined();
    expect(screen.getByAltText('userAvatar')).toBeDefined();
  });

  it('closes dropdown and returns focus to trigger button when pressing Escape', () => {
    render(<Navbar />);

    const trigger = screen.getByRole('button', { name: 'userMenu' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Press keydown Escape on the dropdown
    const dropdownContainer = trigger.closest('.dropdown');
    expect(dropdownContainer).not.toBeNull();

    // Focus on an item inside the dropdown list
    const changePasswordBtn = screen.getByText('changePassword');
    changePasswordBtn.focus();
    expect(document.activeElement).toBe(changePasswordBtn);

    // Spy on blur
    const blurSpy = vi.spyOn(document.activeElement as HTMLElement, 'blur');

    // Fire Escape key event
    fireEvent.keyDown(dropdownContainer!, { key: 'Escape', code: 'Escape' });

    // Verify blur was called to close CSS dropdown
    expect(blurSpy).toHaveBeenCalled();
    // Verify focus returned to trigger button
    expect(document.activeElement).toBe(trigger);
  });

  it('blurs active element when clicking dropdown buttons or links', () => {
    render(<Navbar />);

    const changePasswordBtn = screen.getByText('changePassword');
    changePasswordBtn.focus();
    expect(document.activeElement).toBe(changePasswordBtn);

    const blurSpy = vi.spyOn(document.activeElement as HTMLElement, 'blur');

    fireEvent.click(changePasswordBtn);

    expect(blurSpy).toHaveBeenCalled();
  });
});
