import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PageError } from './page-error';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('PageError', () => {
  const defaultProps = {
    error: { name: 'Error', message: 'Test error message' } as Error,
    reset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and propagates interactions', () => {
    render(<PageError {...defaultProps} />);

    expect(screen.getByText('somethingWentWrong')).toBeDefined();
    expect(screen.getByText('unexpectedErrorDesc')).toBeDefined();
    expect(screen.getByText('Test error message')).toBeDefined();

    const button = screen.getByRole('button', { name: 'tryAgain' });
    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('focus-visible:ring-primary');

    fireEvent.click(button);
    expect(defaultProps.reset).toHaveBeenCalledTimes(1);
  });

  it('handles empty error message safely', () => {
    render(<PageError error={{} as Error} reset={vi.fn()} />);
    expect(screen.getByText('somethingWentWrong')).toBeDefined();
  });
});
