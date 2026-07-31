import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Navbar from './navbar';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock cookieStore
vi.mock('@/utils/auth/cookieStore', () => ({
  cookieStore: {
    getAllUserInfo: vi.fn(() => ({
      photo: 'some-photo.png',
      fullName: 'Jules Smith',
      fcba: 'SKJ',
    })),
  },
}));

// Mock Drawer, Theme, LanguageSwitcher, Icon
vi.mock('../layout/drawer', () => ({
  Drawer: () => <div data-testid="drawer-mock" />,
}));
vi.mock('../theme/theme', () => ({
  Theme: () => <div data-testid="theme-mock" />,
}));
vi.mock('../layout/language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher-mock" />,
}));
vi.mock('@/app/components/ui/icons', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with user avatar and userMenu label', () => {
    render(<Navbar />);

    const button = screen.getByRole('button', { name: 'userMenu' });
    expect(button).toBeDefined();

    const avatar = screen.getByAltText('userAvatar');
    expect(avatar).toBeDefined();
    expect(screen.getByText('Jules Smith (SKJ)')).toBeDefined();
  });

  it('closes dropdown and returns focus to trigger button when pressing Escape', () => {
    render(<Navbar />);

    const trigger = screen.getByRole('button', { name: 'userMenu' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Simulate focus on Change Password button inside the dropdown
    const changePasswordBtn = screen.getByRole('button', { name: 'changePassword' });
    changePasswordBtn.focus();
    expect(document.activeElement).toBe(changePasswordBtn);

    // Spy on blur for activeElement
    const blurSpy = vi.spyOn(document.activeElement as HTMLElement, 'blur');

    // Fire Escape keydown event
    fireEvent.keyDown(changePasswordBtn, { key: 'Escape', code: 'Escape' });

    // Verify activeElement blur was called to close DaisyUI CSS dropdown
    expect(blurSpy).toHaveBeenCalled();
    // Verify focus returned to the trigger button
    expect(document.activeElement).toBe(trigger);
  });

  it('blurs active element to close dropdown when Change Password option is clicked', () => {
    render(<Navbar />);

    const changePasswordBtn = screen.getByRole('button', { name: 'changePassword' });
    changePasswordBtn.focus();
    expect(document.activeElement).toBe(changePasswordBtn);

    const blurSpy = vi.spyOn(changePasswordBtn, 'blur');

    fireEvent.click(changePasswordBtn);

    expect(blurSpy).toHaveBeenCalled();
  });
});
