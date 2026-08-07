import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PageError } from './page-error';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('PageError', () => {
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard localized titles and alert attributes correctly', () => {
    const error = new Error('Database connection failed');
    render(<PageError error={error} reset={mockReset} />);

    // Verify container alert and live regions for screen readers
    const alertContainer = screen.getByRole('alert');
    expect(alertContainer).toBeDefined();
    expect(alertContainer.getAttribute('aria-live')).toBe('assertive');

    // Verify title is rendered
    expect(screen.getByText('somethingWentWrong')).toBeDefined();

    // Verify custom error message is rendered
    expect(screen.getByText('Database connection failed')).toBeDefined();
  });

  it('handles fallback message correctly when error message is empty', () => {
    const error = { name: 'Error', message: '' };
    render(<PageError error={error as Error} reset={mockReset} />);

    // Verify unexpected error description fallback key is shown
    expect(screen.getByText('unexpectedErrorDesc')).toBeDefined();
  });

  it('calls reset callback on button click', () => {
    const error = new Error('Something failed');
    render(<PageError error={error} reset={mockReset} />);

    const button = screen.getByRole('button', { name: 'tryAgain' });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
