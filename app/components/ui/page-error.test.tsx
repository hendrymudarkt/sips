import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PageError } from './page-error';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('PageError', () => {
  it('renders localized title and error message', () => {
    const error = new Error('Database connection failed');
    const reset = vi.fn();

    render(<PageError error={error} reset={reset} />);

    expect(screen.getByText('somethingWentWrong')).toBeDefined();
    expect(screen.getByText('Database connection failed')).toBeDefined();
  });

  it('triggers the reset callback on button click', () => {
    const error = new Error('An error occurred');
    const reset = vi.fn();

    render(<PageError error={error} reset={reset} />);

    const button = screen.getByRole('button', { name: 'tryAgain' });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
