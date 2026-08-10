import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ConfirmModal } from './confirm-modal';

describe('ConfirmModal', () => {
  const defaultProps = {
    open: true,
    title: 'Konfirmasi Tindakan',
    message: 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
    confirmText: 'Ya',
    cancelText: 'Batal',
    loading: false,
    danger: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<ConfirmModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders standard dialog attributes correctly', () => {
    render(<ConfirmModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-modal-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('confirm-modal-message');

    expect(screen.getByText('Konfirmasi Tindakan')).toBeDefined();
    expect(screen.getByText('Apakah Anda yakin ingin melanjutkan tindakan ini?')).toBeDefined();
  });

  it('shifts focus to the cancel button programmatically after modal renders open', () => {
    render(<ConfirmModal {...defaultProps} />);

    // Fast-forward timers for the setTimeout focus shift
    vi.runAllTimers();

    const cancelButton = screen.getByRole('button', { name: 'Batal' });
    expect(document.activeElement).toBe(cancelButton);
  });

  it('restores focus to the previously active element on unmount', () => {
    // Create a temporary element to focus before rendering the modal
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    expect(document.activeElement).toBe(button);

    const { unmount } = render(<ConfirmModal {...defaultProps} />);
    vi.runAllTimers();

    const cancelButton = screen.getByRole('button', { name: 'Batal' });
    expect(document.activeElement).toBe(cancelButton);

    // Unmount modal to trigger cleanup and focus restoration
    unmount();
    expect(document.activeElement).toBe(button);

    // Cleanup DOM
    document.body.removeChild(button);
  });

  it('dismisses modal when Escape key is pressed and loading is false', () => {
    render(<ConfirmModal {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('does NOT dismiss modal when Escape key is pressed and loading is true', () => {
    render(<ConfirmModal {...defaultProps} loading={true} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: 'Ya' });
    fireEvent.click(confirmButton);
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button or backdrop is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'Batal' });
    fireEvent.click(cancelButton);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when loading is true', () => {
    render(<ConfirmModal {...defaultProps} loading={true} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);

    const cancelButton = buttons[0];
    const confirmButton = buttons[1];

    expect(cancelButton.hasAttribute('disabled')).toBe(true);
    expect(confirmButton.hasAttribute('disabled')).toBe(true);
  });

  it('renders correct styles when danger is true', () => {
    render(<ConfirmModal {...defaultProps} danger={true} />);

    const confirmButton = screen.getByRole('button', { name: 'Ya' });
    expect(confirmButton.className).toContain('btn-error');
  });
});
