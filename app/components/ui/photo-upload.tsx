'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { getProxiedImageUrl, PLACEHOLDER_IMAGE } from '@/utils/helpers/imageHelper';
import { Icon } from '@/app/components/ui/icons';

interface PhotoUploadProps {
  value: File | string | null;
  onChange: (file: File | null) => void;
  error?: string;
}

const MAX_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

export function PhotoUpload({ value, onChange, error }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>('');
  const [localError, setLocalError] = useState('');

  const currentError = error || localError;

  useEffect(() => {
    if (value instanceof File) return;
    const url = typeof value === 'string' ? value : '';
    setPreview(url ? getProxiedImageUrl(url) : '');
  }, [value]);

  const handleFile = useCallback((file: File | null) => {
    setLocalError('');
    if (!file) {
      setPreview('');
      onChange(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError('Format harus JPG atau PNG');
      return;
    }

    if (file.size > MAX_SIZE) {
      setLocalError('Maksimal 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    onChange(file);
  }, [onChange]);

  const handleRemove = useCallback(() => {
    setPreview('');
    setLocalError('');
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onChange]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="avatar">
        <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 shadow-lg relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview || PLACEHOLDER_IMAGE}
            alt="Preview foto"
            className="object-cover w-full h-full"
            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
          />
        </div>
      </div>

      <div className="flex gap-2 items-center">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => inputRef.current?.click()}
          >
            <Icon name="upload" className="h-4 w-4" />
            {value instanceof File ? 'Ganti' : 'Upload'} Foto
          </button>

        {(value instanceof File || preview) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm text-error"
            onClick={handleRemove}
          >
            <Icon name="close" className="h-4 w-4" />
            Hapus
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />

      {currentError && (
        <p className="text-xs text-error">{currentError}</p>
      )}
      <p className="text-xs text-base-content/50">JPG/PNG. Maks 2MB</p>
    </div>
  );
}
