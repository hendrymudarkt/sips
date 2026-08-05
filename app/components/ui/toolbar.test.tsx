import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Toolbar, type ToolbarAction } from '../ui/toolbar';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('Toolbar', () => {
  const actions: ToolbarAction[] = [
    { key: 'add', label: 'Add Item', onClick: vi.fn() },
    { key: 'delete', label: 'Delete Item', onClick: vi.fn() },
  ];

  const defaultProps = {
    title: 'Test Title',
    actions,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title', () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeDefined();
  });

  it('renders action buttons with labels, aria-labels, and focus-visible classes', () => {
    render(<Toolbar {...defaultProps} />);

    const addButton = screen.getByText('Add Item').closest('button');
    const deleteButton = screen.getByText('Delete Item').closest('button');

    expect(addButton).toBeDefined();
    expect(deleteButton).toBeDefined();

    // Verify focus rings are present
    expect(addButton?.className).toContain('focus-visible:ring-2');
    expect(addButton?.className).toContain('focus-visible:ring-primary');
    expect(deleteButton?.className).toContain('focus-visible:ring-2');
    expect(deleteButton?.className).toContain('focus-visible:ring-primary');

    // Verify aria-labels are present and correct
    expect(addButton?.getAttribute('aria-label')).toBe('Add Item');
    expect(deleteButton?.getAttribute('aria-label')).toBe('Delete Item');
  });

  it('handles click events on buttons', () => {
    render(<Toolbar {...defaultProps} />);

    fireEvent.click(screen.getByText('Add Item'));
    expect(actions[0].onClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Delete Item'));
    expect(actions[1].onClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when action is loading', () => {
    const loadingActions: ToolbarAction[] = [
      { key: 'add', label: 'Add Item', onClick: vi.fn(), loading: true },
    ];

    render(<Toolbar title="Test" actions={loadingActions} />);

    expect(screen.getByText('Add Item')).toBeDefined();
    const button = screen.getByText('Add Item').closest('button');
    expect(button).toBeDisabled();
  });

  it('disables buttons when disabled prop is true', () => {
    const disabledActions: ToolbarAction[] = [
      { key: 'add', label: 'Add Item', onClick: vi.fn(), disabled: true },
    ];

    render(<Toolbar title="Test" actions={disabledActions} />);

    const button = screen.getByText('Add Item').closest('button');
    expect(button).toBeDisabled();
  });
});
