import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PageError } from './page-error';

// Mock next-intl translations
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      somethingWentWrong: 'Something went wrong!',
      tryAgain: 'Try again',
      unexpectedErrorDesc: 'An unexpected error occurred. We have been notified and are working to fix it.',
    };
    return translations[key] || key;
  },
}));

describe('PageError Component', () => {
  const mockError = new Error('Database connection failed');
  const mockReset = vi.fn();
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should render the error title, message, and fallback description correctly', () => {
    render(<PageError error={mockError} reset={mockReset} />);

    // Title localized text
    expect(screen.getByText('Something went wrong!')).toBeDefined();

    // Custom error message
    expect(screen.getByText('Database connection failed')).toBeDefined();

    // Trigger button
    const button = screen.getByRole('button', { name: 'Try again' });
    expect(button).toBeDefined();

    // Verify console.error was called with the error object
    expect(consoleErrorSpy).toHaveBeenCalledWith(mockError);
  });

  it('should fallback to default localized description when error message is empty', () => {
    const emptyError = new Error('');
    render(<PageError error={emptyError} reset={mockReset} />);

    expect(screen.getByText('An unexpected error occurred. We have been notified and are working to fix it.')).toBeDefined();
  });

  it('should call the reset handler when the trigger button is clicked', () => {
    render(<PageError error={mockError} reset={mockReset} />);

    const button = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(button);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
