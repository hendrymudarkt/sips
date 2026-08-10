'use client';

import { useEffect, useRef } from 'react';

/**
 * 🎨 Palette Enhancement: ConfirmModal component.
 * - Added keyboard support (Escape key dismissal).
 * - Implemented robust focus management (focusing cancel on open, restoring focus on close).
 * - Enhanced ARIA accessibility attributes (aria-labelledby and aria-describedby).
 * - Added keyboard-visible focus rings to primary/secondary button triggers.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Ya',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  loading,
  danger,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Focus management: shift focus to cancel button on open, and restore focus on close/cleanup
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;

      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
        previouslyFocusedRef.current?.focus();
      };
    }
  }, [open]);

  // Escape key handler for accessible keyboard dismissal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <div className="modal-box max-w-md mx-2 sm:mx-0 p-6">
        <h3 id="confirm-modal-title" className="font-bold text-lg mb-4">
          {title}
        </h3>
        <p id="confirm-modal-message" className="text-sm text-base-content/80 whitespace-pre-line">
          {message}
        </p>

        <div className="modal-action flex flex-wrap gap-2 justify-end mt-6">
          <button
            ref={cancelButtonRef}
            type="button"
            className="btn focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${
              danger ? 'btn-error' : 'btn-primary'
            } focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner" /> : confirmText}
          </button>
        </div>
      </div>
      <div
        className="modal-backdrop bg-black/40 backdrop-blur-[2px]"
        onClick={loading ? undefined : onCancel}
      />
    </div>
  );
}
