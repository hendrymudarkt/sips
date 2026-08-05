import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ExportButton } from './export-button';

describe('ExportButton', () => {
  const defaultProps = {
    onClick: vi.fn(),
    label: 'Export Data',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with the correct label, title, and aria-label', () => {
    render(<ExportButton {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toBeDefined();
    expect(screen.getByText('Export Data')).toBeDefined();

    // Verify accessibility and title attributes
    expect(button.getAttribute('title')).toBe('Export Data');
    expect(button.getAttribute('aria-label')).toBe('Export Data');
  });

  it('contains the focus-visible keyboard navigation styles', () => {
    render(<ExportButton {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('focus-visible:ring-primary');
  });

  it('handles click events successfully', () => {
    render(<ExportButton {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a loading spinner and disables the button when loading is true', () => {
    render(<ExportButton {...defaultProps} loading={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.className).toContain('btn-disabled');

    const spinner = button.querySelector('.loading-spinner');
    expect(spinner).toBeDefined();
  });

  it('disables the button when disabled prop is true', () => {
    render(<ExportButton {...defaultProps} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
