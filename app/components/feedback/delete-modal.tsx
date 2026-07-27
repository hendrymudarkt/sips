'use client';

import { useRef, useEffect, useState } from 'react';
import { Icon } from '../ui/icons';

interface DeleteModalProps {
  open: boolean;
  title?: string;
  description?: string;
  label?: string;
  hint?: string;
  cancelText?: string;
  confirmText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
}

/**
 * 🎨 Palette Enhancement: DeleteModal component.
 * - Improved accessibility with ARIA roles and focus management.
 * - Better visual feedback with icons and immediate state updates.
 * - Standardized UX for destructive actions requiring documentation.
 */
export function DeleteModal({
  open,
  title = 'Konfirmasi Hapus',
  description = 'Lampirkan file BA (Berita Acara) untuk menghapus data ini.',
  label = 'File BA (PDF)',
  hint = 'Maks 2MB, format PDF',
  cancelText = 'Batal',
  confirmText = 'Hapus',
  isLoading = false,
  disabled,
  onClose,
  onConfirm,
}: DeleteModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus management, Escape key listener, and cleanup
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setFileError('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isLoading) {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      // Small delay to ensure the modal is rendered before focusing
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open, isLoading, onClose]);

  const [fileError, setFileError] = useState('');
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 2 * 1024 * 1024) {
      setFileError('File maksimal 2 MB');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    setFileError('');
    setSelectedFile(file);
  };

  const handleConfirm = () => {
    if (!selectedFile) return;
    onConfirm(selectedFile);
  };

  if (!open) return null;

  const isConfirmDisabled = disabled || isLoading || !selectedFile;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title" aria-describedby="delete-modal-desc">
      <div className="modal-box max-w-lg relative">
        <button
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
          aria-label="Close"
          disabled={isLoading}
        >
          <Icon name="close" className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="bg-error/10 p-3 rounded-full text-error shrink-0" aria-hidden="true">
            <Icon name="warning" className="w-6 h-6" />
          </div>
          <div>
            <h3 id="delete-modal-title" className="font-bold text-lg leading-tight">{title}</h3>
            <p id="delete-modal-desc" className="mt-2 text-sm text-base-content/70 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="divider my-4 opacity-50" />

        <fieldset className="fieldset">
          <legend className="fieldset-legend font-semibold">{label}</legend>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="file-input file-input-bordered w-full focus:border-primary transition-all"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <p className="text-[0.7rem] opacity-60 mt-1 flex items-center gap-1">
            <Icon name="info" className="h-3 w-3" />
            {hint}
          </p>
          {fileError && <p className="text-error text-sm mt-1">{fileError}</p>}
        </fieldset>

        <div className="modal-action">
          <button
            ref={cancelButtonRef}
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn-error shadow-sm ${isLoading ? 'btn-disabled' : ''}`}
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                <span className="animate-pulse">{confirmText}...</span>
              </>
            ) : (
              <>
                <Icon name="close" className="w-4 h-4" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40 backdrop-blur-[2px]" onClick={isLoading ? undefined : onClose} />
    </div>
  );
}

