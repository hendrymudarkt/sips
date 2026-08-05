'use client';

import { Icon } from './icons';

interface ExportButtonProps {
  onClick: () => void;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
}

export function ExportButton({ onClick, label = 'Export', loading, disabled }: ExportButtonProps) {
  return (
    <button
      className={`btn btn-outline btn-sm flex-1 sm:flex-none join-item focus-visible:ring-2 focus-visible:ring-primary ${loading ? 'btn-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      aria-label={label}
    >
      {loading ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <Icon name="export" className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
