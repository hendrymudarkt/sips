import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import HarvestJsonUploadModal from './harvest-json-upload-modal';
import { cookieStore } from '@/utils/auth/cookieStore';

vi.mock('@/utils/auth/cookieStore', () => ({
  cookieStore: {
    getFcba: vi.fn(),
    getLevel: vi.fn(),
  },
}));

describe('HarvestJsonUploadModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(cookieStore.getLevel).mockReturnValue('ADM');
    vi.mocked(cookieStore.getFcba).mockReturnValue('MY_FCBA');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders standard dialog and ARIA attributes correctly when user is admin', () => {
    render(<HarvestJsonUploadModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('harvest-json-upload-title');

    expect(screen.getByText('Upload JSON Harvesting')).toBeDefined();
    expect(screen.getByText('Pilih file JSON')).toBeDefined();
    expect(screen.getByText('File harus berformat .json dengan data harvesting')).toBeDefined();
  });

  it('does not render if not allowed or not open', () => {
    vi.mocked(cookieStore.getLevel).mockReturnValue('USR');
    const { container } = render(<HarvestJsonUploadModal {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('shifts focus to the close button programmatically after modal renders open', () => {
    render(<HarvestJsonUploadModal {...defaultProps} />);

    // Fast-forward timers for the setTimeout focus shift
    vi.runAllTimers();

    const closeButton = screen.getByRole('button', { name: 'Tutup upload JSON' });
    expect(document.activeElement).toBe(closeButton);
  });

  it('dismisses modal when Escape key is pressed and phase is not importing', () => {
    render(<HarvestJsonUploadModal {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to previous active element on close', async () => {
    const triggerBtn = document.createElement('button');
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const { unmount } = render(<HarvestJsonUploadModal {...defaultProps} />);
    vi.runAllTimers();

    const closeButton = screen.getByRole('button', { name: 'Tutup upload JSON' });
    expect(document.activeElement).toBe(closeButton);

    unmount();
    vi.runAllTimers();

    expect(document.activeElement).toBe(triggerBtn);
    document.body.removeChild(triggerBtn);
  });

  it('associates file input with labels and descriptions correctly', () => {
    render(<HarvestJsonUploadModal {...defaultProps} />);

    const fileInput = screen.getByLabelText('Pilih file JSON');
    expect(fileInput).toBeDefined();
    expect(fileInput.getAttribute('id')).toBe('harvest-json-file');

    const describedBy = fileInput.getAttribute('aria-describedby');
    expect(describedBy).toBe('json-upload-hint');

    const hintText = screen.getByText('File harus berformat .json dengan data harvesting');
    expect(hintText.getAttribute('id')).toBe('json-upload-hint');
  });
});
