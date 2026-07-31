'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './icons';

interface FormModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
  loadingText?: string;
  cancelText?: string;
  confirmText?: string;
  confirmDisabled?: boolean;
  formId?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * 🎨 Palette Enhancement: FormModal component.
 * - Improved accessibility with ARIA roles, labels, and focus management.
 * - Gated Escape key down handler for keyboard dismissal, guarded by loading state.
 * - Store the previously focused element and return focus to it on close/unmount.
 * - Uses <Icon name="close" /> for modern and consistent visual polish.
 * - Explicit focus-visible rings for high-standard accessibility.
 */
export function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  loading,
  loadingText = 'Memuat...',
  cancelText = 'Batal',
  confirmText = 'Simpan',
  confirmDisabled,
  formId = 'modal-form',
  children,
  size = 'lg',
}: FormModalProps) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus management: store previous active element and shift focus on open, restore on close/unmount
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
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const sizeClass =
    size === 'sm' ? 'max-w-md' :
    size === 'md' ? 'max-w-xl' :
    size === 'lg' ? 'max-w-[calc(100vw-1rem)] sm:max-w-5xl' :
    size === 'xl' ? 'max-w-[calc(100vw-1rem)] sm:max-w-7xl' :
    'max-w-[calc(100vw-1rem)]';

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal-box ${sizeClass} mx-2 sm:mx-0 p-2 sm:p-6`}>
        <div className="sticky top-0 z-10 bg-base-100 pb-2 -mx-2 sm:-mx-6 px-2 sm:px-6 border-b border-base-300">
          <div className="flex items-start justify-between">
            <h3 className="font-bold text-xl">{title}</h3>
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost focus-visible:ring-2 focus-visible:ring-primary"
              onClick={onClose}
              aria-label="Close"
              disabled={loading}
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-base-100/70 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
            <div className="flex items-center gap-3">
              <span className="loading loading-spinner loading-lg" />
              <span>{loadingText}</span>
            </div>
          </div>
        )}

        {onSubmit ? (
          <form id={formId} onSubmit={onSubmit} className="grid grid-cols-12 gap-2 max-h-[80vh] overflow-y-auto">
            {children}
          </form>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto">{children}</div>
        )}

        <div className="sticky bottom-0 z-10 bg-base-100 pt-2 -mx-2 sm:-mx-6 px-2 sm:px-6 border-t border-base-300">
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              ref={cancelButtonRef}
              type="button"
              className="btn focus-visible:ring-2 focus-visible:ring-primary"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </button>
            {onSubmit && (
              <button
                type="submit"
                form={formId}
                className={`btn btn-primary focus-visible:ring-2 focus-visible:ring-primary ${loading ? 'btn-disabled' : ''}`}
                disabled={loading || confirmDisabled}
              >
                {loading ? <span className="loading loading-spinner" /> : confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40 backdrop-blur-[2px]" onClick={loading ? undefined : onClose} />
    </div>
  );
}
