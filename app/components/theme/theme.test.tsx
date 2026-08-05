import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Theme } from './theme';
import { useTheme } from '@/hooks/useTheme';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useTheme
vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    changeTheme: vi.fn(),
  })),
}));

describe('Theme Switcher', () => {
  const changeThemeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      changeTheme: changeThemeMock,
    });
  });

  it('renders correctly with current theme', () => {
    render(<Theme />);

    const button = screen.getByRole('button', { name: 'theme' });
    expect(button).toBeDefined();
    expect(screen.getByText('theme')).toBeDefined();
  });

  it('changes theme when clicking an option', () => {
    render(<Theme />);

    const darkOption = screen.getByText('Dark').closest('button');
    expect(darkOption).not.toBeNull();
    fireEvent.click(darkOption!);

    expect(changeThemeMock).toHaveBeenCalledWith('dark');
  });

  it('closes dropdown and returns focus to trigger button when pressing Escape', () => {
    render(<Theme />);

    const trigger = screen.getByRole('button', { name: 'theme' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const darkOption = screen.getByText('Dark').closest('button');
    expect(darkOption).not.toBeNull();
    darkOption?.focus();
    expect(document.activeElement).toBe(darkOption);

    // Spy on blur for activeElement
    const blurSpy = vi.spyOn(document.activeElement as HTMLElement, 'blur');

    // Fire Escape key event
    fireEvent.keyDown(darkOption!, { key: 'Escape', code: 'Escape' });

    // Verify blur was called to close CSS-only dropdown
    expect(blurSpy).toHaveBeenCalled();
    // Verify focus returned to trigger button
    expect(document.activeElement).toBe(trigger);
  });
});
