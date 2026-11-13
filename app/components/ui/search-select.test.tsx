import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SearchSelect, getFixedDropdownStyle } from '../ui/search-select';

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

  it('renders fixed dropdown in a body portal so modal overflow cannot clip it', () => {
    const onChange = vi.fn();
    const { container } = render(
      <SearchSelect {...defaultProps} onChange={onChange} useFixedPositioning />
    );

    fireEvent.click(screen.getByRole('button'));

    const listbox = screen.getByRole('listbox');
    expect(container.contains(listbox)).toBe(false);
    expect(listbox.parentElement?.className).toContain('fixed');

    fireEvent.click(screen.getByText('Option 1'));
    expect(onChange).toHaveBeenCalledWith('opt1');
  });
});

describe('getFixedDropdownStyle', () => {
  it('widens narrow fields and keeps the panel inside the viewport', () => {
    const style = getFixedDropdownStyle(
      { left: 900, top: 120, bottom: 150, width: 128 },
      { width: 1024, height: 768 }
    );
    expect(style.width).toBe(288);
    expect(style.left).toBe(728);
    expect(style.top).toBe(154);
  });

  it('opens above the field when there is no room below', () => {
    const style = getFixedDropdownStyle(
      { left: 100, top: 620, bottom: 650, width: 320 },
      { width: 1024, height: 768 }
    );
    expect(style.top).toBeUndefined();
    expect(style.bottom).toBe(152);
  });
});
