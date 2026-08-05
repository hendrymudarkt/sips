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
  if (!open) return null;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-box max-w-md mx-2 sm:mx-0 p-6">
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <p className="text-sm text-base-content/80 whitespace-pre-line">{message}</p>

        <div className="modal-action flex flex-wrap gap-2 justify-end mt-6">
          <button type="button" className="btn" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-error' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner" /> : confirmText}
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40 backdrop-blur-[2px]" onClick={loading ? undefined : onCancel} />
    </div>
  );
}
