import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SearchSelect } from '../ui/search-select';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('SearchSelect', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
    { value: 'opt3', label: 'Option 3' },
  ];

  const defaultProps = {
    options,
    value: '',
    onChange: vi.fn(),
    placeholder: 'Select an option',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders placeholder when no value', () => {
    render(<SearchSelect {...defaultProps} />);
    expect(screen.getByText('Select an option')).toBeDefined();
  });

  it('renders selected value label', () => {
    render(<SearchSelect {...defaultProps} value="opt2" />);
    expect(screen.getByText('Option 2')).toBeDefined();
  });

  it('opens dropdown on click', () => {
    render(<SearchSelect {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeDefined();
  });

  it('opens dropdown on ArrowDown key press on trigger', () => {
    render(<SearchSelect {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'ArrowDown' });

    expect(screen.getByRole('listbox')).toBeDefined();
  });

  it('opens dropdown on ArrowUp key press on trigger', () => {
    render(<SearchSelect {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'ArrowUp' });

    expect(screen.getByRole('listbox')).toBeDefined();
  });

  it('opens dropdown on Enter key press on trigger', () => {
    render(<SearchSelect {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(screen.getByRole('listbox')).toBeDefined();
  });

  it('opens dropdown on Space key press on trigger', () => {
    render(<SearchSelect {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ' });

    expect(screen.getByRole('listbox')).toBeDefined();
  });

  it('filters options on search input', () => {
    render(<SearchSelect {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText('typeToSearch');
    fireEvent.change(searchInput, { target: { value: 'Option 1' } });

    expect(screen.getByText('Option 1')).toBeDefined();
    expect(screen.queryByText('Option 2')).toBeNull();
    expect(screen.queryByText('Option 3')).toBeNull();
  });

  it('calls onChange when option selected', () => {
    const onChange = vi.fn();
    render(<SearchSelect {...defaultProps} onChange={onChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const option = screen.getByText('Option 1');
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('opt1');
  });
});
