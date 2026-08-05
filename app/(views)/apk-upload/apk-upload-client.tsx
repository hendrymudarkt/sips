'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { backendApiUrl } from '@/utils/auth/backendConfig';
import { Icon } from '@/app/components/ui/icons';
import { UploadLayout } from '@/app/components/ui/upload-layout';

interface UploadFormData {
  platform: string;
  version: string;
  force_update: boolean;
  min_version: string;
  changelog: string;
}

interface UploadResult {
  id: number;
  platform: string;
  version: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_extension: string;
  force_update: boolean;
  changelog: string | null;
  created_at: string;
}

export default function ApkUploadPage() {
  const [formData, setFormData] = useState<UploadFormData>({
    platform: 'android',
    version: '',
    force_update: false,
    min_version: '',
    changelog: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>(
    'idle'
  );
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const [uploadEta, setUploadEta] = useState<string>('');
  const [isMgr, setIsMgr] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initCheck, setInitCheck] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const startTimeRef = useRef<number>(0);
  const lastLoadedRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Check user level from cookie
  useEffect(() => {
    const readCookie = (name: string) => {
      if (typeof document === 'undefined') return '';
      const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
      return m ? decodeURIComponent(m.pop() as string) : '';
    };

    const levelRaw =
      readCookie('user_Level') || readCookie('user_LEVEL') || readCookie('user_level') || '';
    const levelUpper = String(levelRaw).toUpperCase();
    const level = levelUpper === 'ADMIN' ? 'ADM' : levelUpper;
    setIsMgr(level === 'MGR');
    setIsAdmin(level === 'ADM');
    setInitCheck(true);
  }, []);

  const handleParamChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const validateAndSetFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['apk', 'ipa'].includes(extension)) {
      setUploadMessage(
        '❌ Ekstensi file tidak diizinkan. Hanya file .apk atau .ipa yang diterima.'
      );
      setUploadStatus('error');
      return false;
    }
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadMessage(
        `❌ Ukuran file terlalu besar. Maksimum 200MB. File Anda: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
      );
      setUploadStatus('error');
      return false;
    }
    setSelectedFile(file);
    setUploadStatus('idle');
    setUploadMessage('');
    setUploadResult(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleCancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setUploading(false);
    setUploadProgress(0);
    setUploadStatus('error');
    setUploadMessage('❌ Upload dibatalkan.');
    setUploadSpeed('');
    setUploadEta('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setUploadMessage('❌ Pilih file terlebih dahulu sebelum upload');
      setUploadStatus('error');
      return;
    }

    if (!formData.version.trim()) {
      setUploadMessage('❌ Versi wajib diisi');
      setUploadStatus('error');
      return;
    }

    // Auto-validate platform vs extension
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (formData.platform === 'android' && ext !== 'apk') {
      setUploadMessage('❌ Platform Android membutuhkan file .apk, bukan .' + ext);
      setUploadStatus('error');
      return;
    }
    if (formData.platform === 'ios' && ext !== 'ipa') {
      setUploadMessage('❌ Platform iOS membutuhkan file .ipa, bukan .' + ext);
      setUploadStatus('error');
      return;
    }

    setUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadMessage('⏳ Mengambil token...');
    setUploadResult(null);
    setUploadSpeed('');
    setUploadEta('');

    // Step 1: Get token from server first
    let token: string;
    try {
      const tokenRes = await fetch('/api/auth/token');
      const tokenData = await tokenRes.json();
      if (!tokenData.success) {
        throw new Error('Token tidak ditemukan');
      }
      token = tokenData.token;
    } catch {
      setUploading(false);
      setUploadStatus('error');
      setUploadMessage('❌ Gagal mengambil token autentikasi. Silakan login ulang.');
      return;
    }

    setUploadMessage('⏳ Mempersiapkan upload...');

    startTimeRef.current = Date.now();
    lastLoadedRef.current = 0;
    lastTimeRef.current = Date.now();

    const uploadFormData = new FormData();
    uploadFormData.append('platform', formData.platform);
    uploadFormData.append('version', formData.version);
    uploadFormData.append('file', selectedFile);
    // Send force_update as "1" for true, empty string for false (backend expects this)
    uploadFormData.append('force_update', formData.force_update ? '1' : '');
    uploadFormData.append('min_version', formData.min_version.trim());
    uploadFormData.append('changelog', formData.changelog.trim());

    // Use XMLHttpRequest for real-time progress tracking
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) {
        const now = Date.now();
        const percentComplete = (event.loaded / event.total) * 100;
        const pct = Math.round(percentComplete);

        // Calculate speed every 500ms
        const timeDelta = (now - lastTimeRef.current) / 1000; // seconds
        const bytesDelta = event.loaded - lastLoadedRef.current;
        let speedStr = '';
        let etaStr = '';

        if (timeDelta > 0.5 && bytesDelta > 0) {
          const speedBps = bytesDelta / timeDelta;
          speedStr = formatBytes(speedBps) + '/s';
          const remaining = event.total - event.loaded;
          const etaSec = remaining / speedBps;
          etaStr = formatEta(etaSec);
          lastLoadedRef.current = event.loaded;
          lastTimeRef.current = now;
        }

        setUploadProgress(pct);
        setUploadSpeed(speedStr);
        setUploadEta(etaStr);
        setUploadMessage(
          `⏳ Mengupload... ${pct}% — ${formatBytes(event.loaded)} / ${formatBytes(event.total)}`
        );
      }
    });

    xhr.addEventListener('load', () => {
      xhrRef.current = null;
      setUploading(false);
      setUploadSpeed('');
      setUploadEta('');

      const rawText = xhr.responseText || '';
      type ErrorResponse = {
        success?: boolean;
        message?: string;
        error?: string;
        details?: string;
        data?: Record<string, unknown> | null;
      };

      let response: ErrorResponse | null = null;
      let parseError = false;

      if (rawText.trim()) {
        try {
          response = JSON.parse(rawText) as ErrorResponse;
        } catch {
          parseError = true;
          console.warn('❗ Response parsing bukan JSON', rawText.slice(0, 600));
        }
      }

      if (xhr.status >= 200 && xhr.status < 300 && response?.success) {
        setUploadStatus('success');
        setUploadProgress(100);
        setUploadResult((response.data as unknown as UploadResult) || null);
        setUploadMessage(
          `✓ Upload berhasil! ${(response.data as unknown as UploadResult)?.file_name || 'APK berhasil diupload'}`
        );
        // Reset form
        setSelectedFile(null);
        setFormData({
          platform: 'android',
          version: '',
          force_update: false,
          min_version: '',
          changelog: '',
        });
        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setUploadStatus('error');
        setUploadProgress(0);

        if (parseError) {
          setUploadMessage(`❌ Upload gagal: Response server bukan JSON, status ${xhr.status}`);
          console.error('❌ Non-JSON response:', rawText.slice(0, 1000));
          return;
        }

        const errMsg = response?.message || response?.error || `HTTP ${xhr.status}: Upload gagal`;

        const details = response?.details;
        if (typeof details === 'string' && details.trim().startsWith('<!DOCTYPE')) {
          const snippet = details.replace(/\s+/g, ' ').slice(0, 360);
          console.warn('❗ Backend HTML error delivered in details:', snippet);
          setUploadMessage(`❌ Upload gagal: ${errMsg}. (Laravel 500)`);
        } else {
          setUploadMessage(`❌ Upload gagal: ${errMsg}`);
        }

        console.error('❌ Upload error details:', response || {});
        if (details) {
          console.error('❌ Backend details:', details);
        }
      }
    });

    xhr.addEventListener('error', () => {
      xhrRef.current = null;
      setUploading(false);
      setUploadStatus('error');
      setUploadProgress(0);
      setUploadSpeed('');
      setUploadEta('');
      console.error('❌ XHR network error');
      console.error('Status:', xhr.status);
      console.error('StatusText:', xhr.statusText);
      console.error('Response:', xhr.responseText);
      setUploadMessage('❌ Terjadi kesalahan jaringan. Periksa koneksi Anda dan coba lagi.');
    });

    xhr.addEventListener('abort', () => {
      xhrRef.current = null;
    });

    // Upload directly to Laravel API (bypass Vercel 4.5MB limit)
    const LARAVEL_API_URL = backendApiUrl('/app/apk');

    xhr.open('POST', LARAVEL_API_URL);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // Do NOT set Content-Type — browser sets it with correct multipart boundary
    xhr.withCredentials = false; // CORS direct to Laravel
    xhr.send(uploadFormData);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0) + ' ' + sizes[i];
  };

  const formatEta = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '';
    if (seconds < 60) return `${Math.round(seconds)}d`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}d`;
  };

  if (initCheck && !isMgr && !isAdmin) {
    return (
      <div className="min-h-screen bg-base-100 p-6 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <h1 className="text-3xl font-bold text-error mb-4">Akses Ditolak</h1>
          <p className="text-base-content/70 mb-6">
            Halaman ini hanya dapat diakses oleh user dengan level <b>MGR</b> atau <b>ADM</b>.
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!initCheck) {
    return <UploadLayout maxWidth="max-w-3xl" />;
  }

  return (
    <UploadLayout maxWidth="max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-base-content">Upload APK / IPA</h1>
          <p className="text-sm text-base-content/60 mt-1">
            Upload aplikasi mobile untuk sistem update otomatis
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform & Version row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Platform */}
              <div className="form-group">
                <label className="block text-sm font-medium text-base-content mb-2">
                  Platform <span className="text-error">*</span>
                </label>
                <select
                  name="platform"
                  value={formData.platform}
                  onChange={handleParamChange}
                  className="select select-bordered w-full"
                  disabled={uploading}
                >
                  <option value="android">Android (.apk)</option>
                  <option value="ios">iOS (.ipa)</option>
                </select>
              </div>

              {/* Version */}
              <div className="form-group">
                <label className="block text-sm font-medium text-base-content mb-2">
                  Versi <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  name="version"
                  placeholder="contoh: 1.0.0"
                  value={formData.version}
                  onChange={handleParamChange}
                  className="input input-bordered w-full"
                  disabled={uploading}
                  required
                />
              </div>
            </div>

            {/* File Upload — Drag & Drop Zone */}
            <div className="form-group">
              <label className="block text-sm font-medium text-base-content mb-2">
                File Aplikasi <span className="text-error">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? 'border-primary bg-primary/5'
                    : selectedFile
                      ? 'border-success bg-success/5'
                      : 'border-base-300 hover:border-primary/50'
                } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !uploading && document.getElementById('file')?.click()}
              >
                <input
                  id="file"
                  type="file"
                  accept=".apk,.ipa"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-1">
                    {/* File Icon */}
                    <Icon name="document" className="w-5 h-5 text-primary" />
                    <p className="font-semibold text-success text-sm mt-1">{selectedFile.name}</p>
                    <p className="text-xs text-base-content/50">{formatBytes(selectedFile.size)}</p>
                    {!uploading && (
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-error mt-1"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setUploadStatus('idle');
                          setUploadMessage('');
                          const fi = document.getElementById('file') as HTMLInputElement;
                          if (fi) fi.value = '';
                        }}
                      >
                        Hapus file
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Icon name="cloud-upload" className="w-8 h-8 text-primary opacity-60" strokeWidth={1.5} />
                    <p className="text-sm text-base-content/60">
                      Drag &amp; drop file di sini, atau{' '}
                      <span className="text-primary font-medium">pilih file</span>
                    </p>
                    <p className="text-xs text-base-content/40">
                      Mendukung .apk dan .ipa · Maksimum 200MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Force Update */}
            <div className="form-group">
              <label className="flex items-center gap-3 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  name="force_update"
                  checked={formData.force_update}
                  onChange={handleParamChange}
                  className="checkbox checkbox-sm checkbox-primary"
                  disabled={uploading}
                />
                <span className="text-sm text-base-content">
                  Force Update{' '}
                  <span className="text-base-content/50 font-normal">
                    (user wajib update ke versi ini)
                  </span>
                </span>
              </label>
            </div>

            {/* Minimum Version */}
            <div className="form-group">
              <label className="block text-sm font-medium text-base-content mb-2">
                Versi Minimum{' '}
                <span className="text-base-content/40 font-normal text-xs">(opsional)</span>
              </label>
              <input
                type="text"
                name="min_version"
                placeholder="contoh: 0.9.0"
                value={formData.min_version}
                onChange={handleParamChange}
                className="input input-bordered w-full"
                disabled={uploading}
              />
              <p className="text-xs text-base-content/50 mt-1">
                Versi minimum yang harus ada di device user sebelum update
              </p>
            </div>

            {/* Changelog */}
            <div className="form-group">
              <label className="block text-sm font-medium text-base-content mb-2">
                Changelog{' '}
                <span className="text-base-content/40 font-normal text-xs">(opsional)</span>
              </label>
              <textarea
                name="changelog"
                placeholder="Tulis catatan perubahan versi ini..."
                value={formData.changelog}
                onChange={handleParamChange}
                className="textarea textarea-bordered w-full"
                rows={3}
                disabled={uploading}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className={`btn flex-1 ${uploading ? 'btn-disabled' : 'btn-primary'}`}
              >
                {uploading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Icon name="upload" className="w-4 h-4" />
                    Upload Aplikasi
                  </>
                )}
              </button>

              {uploading && (
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="btn btn-error btn-outline"
                  title="Batalkan upload"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          {/* ─── Progress Bar ─── */}
          {(uploading || uploadStatus === 'success') && uploadProgress > 0 && (
            <div className="mt-5 space-y-2">
              {/* Bar */}
              <div className="relative w-full bg-base-200 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                    uploadStatus === 'success' ? 'bg-success' : 'bg-primary'
                  } ${uploading && uploadProgress < 100 ? 'animate-pulse' : ''}`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {/* Progress details row */}
              <div className="flex items-center justify-between text-xs text-base-content/60">
                <span className="font-mono font-semibold text-base-content">{uploadProgress}%</span>

                <div className="flex gap-4">
                  {uploadSpeed && (
                    <span>
                      🚀 <b>{uploadSpeed}</b>
                    </span>
                  )}
                  {uploadEta && (
                    <span>
                      ⏱ ETA <b>{uploadEta}</b>
                    </span>
                  )}
                  {selectedFile && uploading && (
                    <span>
                      {formatBytes((uploadProgress / 100) * selectedFile.size)} /{' '}
                      {formatBytes(selectedFile.size)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Status Alert ─── */}
          {uploadMessage && (
            <div
              className={`alert mt-4 shadow-sm ${
                uploadStatus === 'success'
                  ? 'alert-success'
                  : uploadStatus === 'error'
                    ? 'alert-error'
                    : 'alert-info'
              }`}
            >
              <div className="w-full">
                <p className="font-medium">{uploadMessage}</p>
              </div>
            </div>
          )}

          {/* ─── Success Result Card ─── */}
          {uploadStatus === 'success' && uploadResult && (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/5 p-4 space-y-3">
              <h3 className="font-semibold text-success text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  />
                </svg>
                File berhasil diupload
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-base-content/50">ID</div>
                <div className="font-mono font-medium">{uploadResult.id}</div>

                <div className="text-base-content/50">Platform</div>
                <div className="font-medium capitalize">{uploadResult.platform}</div>

                <div className="text-base-content/50">Versi</div>
                <div className="font-mono font-medium">{uploadResult.version}</div>

                <div className="text-base-content/50">Nama File</div>
                <div className="font-mono break-all">{uploadResult.file_name}</div>

                <div className="text-base-content/50">Ukuran</div>
                <div>{formatBytes(uploadResult.file_size)}</div>

                <div className="text-base-content/50">Tanggal Upload</div>
                <div>{uploadResult.created_at}</div>

                <div className="text-base-content/50">Force Update</div>
                <div>
                  {uploadResult.force_update ? (
                    <span className="badge badge-warning badge-sm">Ya</span>
                  ) : (
                    <span className="badge badge-ghost badge-sm">Tidak</span>
                  )}
                </div>

                {uploadResult.changelog && (
                  <>
                    <div className="text-base-content/50">Changelog</div>
                    <div className="whitespace-pre-wrap">{uploadResult.changelog}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-info/10 rounded-lg p-4 border border-info/20">
          <h3 className="font-semibold text-info mb-2">ℹ️ Informasi Upload</h3>
          <ul className="text-sm text-base-content/70 space-y-1 list-disc list-inside">
            <li>File akan disimpan di server dan digunakan untuk automatic update</li>
            <li>Format file yang didukung: .apk (Android) dan .ipa (iOS)</li>
            <li>Ukuran maksimum file: 200MB</li>
            <li>Pastikan platform sesuai dengan ekstensi file yang dipilih</li>
            <li>Force Update akan membuat user wajib mengupdate aplikasi</li>
            <li>Minimum version membatasi update hanya untuk versi tertentu</li>
          </ul>
        </div>
      </UploadLayout>
  );
}


