import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DeleteModal } from './delete-modal';

vi.mock('../ui/icons', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe('DeleteModal', () => {
  const defaultProps = {
    open: true,
    title: 'Konfirmasi Hapus',
    description: 'Lampirkan file BA (Berita Acara) untuk menghapus data ini.',
    label: 'File BA (PDF)',
    hint: 'Maks 2MB, format PDF',
    cancelText: 'Batal',
    confirmText: 'Hapus',
    isLoading: false,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders standard dialog attributes correctly', () => {
    render(<DeleteModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('delete-modal-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('delete-modal-desc');

    expect(screen.getByText('Konfirmasi Hapus')).toBeDefined();
    expect(screen.getByText('Lampirkan file BA (Berita Acara) untuk menghapus data ini.')).toBeDefined();
  });

  it('shifts focus to the cancel button programmatically after modal renders open', () => {
    render(<DeleteModal {...defaultProps} />);

    // Fast-forward timers for the setTimeout focus shift
    vi.runAllTimers();

    const cancelButton = screen.getByRole('button', { name: 'Batal' });
    expect(document.activeElement).toBe(cancelButton);
  });

  it('dismisses modal when Escape key is pressed and isLoading is false', () => {
    render(<DeleteModal {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT dismiss modal when Escape key is pressed and isLoading is true', () => {
    render(<DeleteModal {...defaultProps} isLoading={true} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('associates file input with labels and descriptions correctly', () => {
    render(<DeleteModal {...defaultProps} />);

    const fileInput = screen.getByLabelText('File BA (PDF)');
    expect(fileInput).toBeDefined();
    expect(fileInput.getAttribute('id')).toBe('delete-file-input');

    // Should describe the default hint
    const describedBy = fileInput.getAttribute('aria-describedby');
    expect(describedBy).toContain('delete-file-hint');
    expect(describedBy).not.toContain('delete-file-error');

    const hintText = screen.getByText('Maks 2MB, format PDF');
    expect(hintText.getAttribute('id')).toBe('delete-file-hint');
  });

  it('shows error feedback with role="alert" and updates aria-describedby when file is too large', () => {
    render(<DeleteModal {...defaultProps} />);

    const fileInput = screen.getByLabelText('File BA (PDF)');
    const largeFile = new File(['a'.repeat(3 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    // File is cleared and error shown
    expect(screen.getByText('File maksimal 2 MB')).toBeDefined();
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert.getAttribute('id')).toBe('delete-file-error');

    // Input aria-describedby now points to both hint and error
    const describedBy = fileInput.getAttribute('aria-describedby');
    expect(describedBy).toContain('delete-file-hint');
    expect(describedBy).toContain('delete-file-error');
  });

  it('calls onConfirm with selected file when Confirm button is clicked', () => {
    render(<DeleteModal {...defaultProps} />);

    const fileInput = screen.getByLabelText('File BA (PDF)');
    const validFile = new File(['a'.repeat(1024)], 'valid.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const confirmButton = screen.getByRole('button', { name: 'Hapus' });
    expect(confirmButton.hasAttribute('disabled')).toBe(false);

    fireEvent.click(confirmButton);
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(validFile);
  });
});
