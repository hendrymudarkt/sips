import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { DeleteModal } from './delete-modal';

vi.mock('../ui/icons', () => ({
  Icon: () => <span data-testid="mock-icon" />,
}));

describe('DeleteModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders nothing when closed', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();
    render(<DeleteModal open={false} onClose={handleClose} onConfirm={handleConfirm} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders modal content and focuses cancel button on open', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    // Create a mock trigger button to simulate focus-return and initial focus
    const triggerBtn = document.createElement('button');
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    render(<DeleteModal open={true} onClose={handleClose} onConfirm={handleConfirm} />);

    // Verify dialog elements exist
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Konfirmasi Hapus')).toBeDefined();

    // Verify cancel button gets focus after a small delay
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const cancelButton = screen.getByRole('button', { name: 'Batal' });
    expect(document.activeElement).toBe(cancelButton);

    // Clean up
    document.body.removeChild(triggerBtn);
  });

  it('triggers onClose when pressing Escape and not loading', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <DeleteModal open={true} onClose={handleClose} onConfirm={handleConfirm} isLoading={false} />
    );

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClose when pressing Escape if loading', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <DeleteModal open={true} onClose={handleClose} onConfirm={handleConfirm} isLoading={true} />
    );

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('restores focus to the triggering element when closed', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    const triggerBtn = document.createElement('button');
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const { rerender } = render(
      <DeleteModal open={true} onClose={handleClose} onConfirm={handleConfirm} />
    );

    // Focus shifts to Batal button
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const cancelButton = screen.getByRole('button', { name: 'Batal' });
    expect(document.activeElement).toBe(cancelButton);

    // Close the modal
    rerender(<DeleteModal open={false} onClose={handleClose} onConfirm={handleConfirm} />);

    // Focus is returned to triggerBtn
    expect(document.activeElement).toBe(triggerBtn);

    // Clean up
    document.body.removeChild(triggerBtn);
  });
});
