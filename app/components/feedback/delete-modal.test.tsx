import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('renders nothing when open is false', () => {
    render(<DeleteModal {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders correctly with all accessibility roles and aria attributes', () => {
    render(<DeleteModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('delete-modal-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('delete-modal-desc');

    expect(screen.getByText('Konfirmasi Hapus')).toBeDefined();
    expect(screen.getByText('Lampirkan file BA (Berita Acara) untuk menghapus data ini.')).toBeDefined();
  });

  it('shifts focus to the cancel button on open', async () => {
    render(<DeleteModal {...defaultProps} />);

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: 'Batal' });
      expect(document.activeElement).toBe(cancelButton);
    });
  });

  it('calls onClose when close button or cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<DeleteModal {...defaultProps} onClose={onClose} />);

    const closeIconBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeIconBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const cancelButton = screen.getByRole('button', { name: 'Batal' });
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<DeleteModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when Escape key is pressed if isLoading is true', () => {
    const onClose = vi.fn();
    render(<DeleteModal {...defaultProps} onClose={onClose} isLoading={true} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('handles file selection and size validation', () => {
    const { container } = render(<DeleteModal {...defaultProps} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();
    expect(fileInput).not.toBeNull();

    // Large file error validation
    const largeFile = new File(['a'.repeat(3 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(screen.getByText('File maksimal 2 MB')).toBeDefined();
    const confirmButton = screen.getByRole('button', { name: 'Hapus' });
    expect(confirmButton.hasAttribute('disabled')).toBe(true);

    // Valid file selection
    const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(screen.queryByText('File maksimal 2 MB')).toBeNull();
    expect(confirmButton.hasAttribute('disabled')).toBe(false);
  });

  it('calls onConfirm with the selected file when confirmation is triggered', () => {
    const onConfirm = vi.fn();
    const { container } = render(<DeleteModal {...defaultProps} onConfirm={onConfirm} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput!, { target: { files: [validFile] } });

    const confirmButton = screen.getByRole('button', { name: 'Hapus' });
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith(validFile);
  });
});
