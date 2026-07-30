import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FormModal } from './form-modal';

vi.mock('./icons', () => ({
  Icon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

describe('FormModal', () => {
  const defaultProps = {
    open: true,
    title: 'Detail Form',
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    loading: false,
    cancelText: 'Batal',
    confirmText: 'Simpan',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders standard dialog attributes and title correctly', () => {
    render(
      <FormModal {...defaultProps}>
        <div>Modal Content</div>
      </FormModal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Detail Form');

    expect(screen.getByText('Detail Form')).toBeDefined();
    expect(screen.getByText('Modal Content')).toBeDefined();
  });

  it('shifts focus to the cancel button programmatically after modal renders open', () => {
    render(
      <FormModal {...defaultProps}>
        <div>Content</div>
      </FormModal>
    );

    // Fast-forward timers for the setTimeout focus shift
    vi.runAllTimers();

    const cancelButton = screen.getByRole('button', { name: 'Batal' });
    expect(document.activeElement).toBe(cancelButton);
  });

  it('dismisses modal when Escape key is pressed and loading is false', () => {
    render(
      <FormModal {...defaultProps}>
        <div>Content</div>
      </FormModal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT dismiss modal when Escape key is pressed and loading is true', () => {
    render(
      <FormModal {...defaultProps} loading={true}>
        <div>Content</div>
      </FormModal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('restores focus to the previously active element when the modal is closed', () => {
    // Create a dummy button that was active before modal opened
    const triggerBtn = document.createElement('button');
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const { rerender } = render(
      <FormModal {...defaultProps}>
        <div>Content</div>
      </FormModal>
    );

    // Modal renders, trigger focus transition
    vi.runAllTimers();
    const cancelButton = screen.getByRole('button', { name: 'Batal' });
    expect(document.activeElement).toBe(cancelButton);

    // Close the modal
    rerender(
      <FormModal {...defaultProps} open={false}>
        <div>Content</div>
      </FormModal>
    );

    // Focus should be returned to the trigger button
    expect(document.activeElement).toBe(triggerBtn);

    // Cleanup body
    document.body.removeChild(triggerBtn);
  });
});
