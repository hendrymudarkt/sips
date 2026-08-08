'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { cookieStore } from '@/utils/auth/cookieStore';

interface JsonRecord {
  nodokumen?: string;
  tanggal?: string;
  kode_karyawan?: string;
  nama_karyawan?: string;
  output?: string | number;
  busuk?: string | number;
  busuk2?: string | number;
  parteno50plus?: string | number;
  brondol?: string | number;
  tph?: string;
  fieldcode?: string;
  afdeling?: string;
  fcba?: string;
  noancak?: string;
  status_harvesting?: string;
  [key: string]: unknown;
}

interface Progress {
  percent: number;
  processed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  currentRecord: string;
  successCount: number;
  failCount: number;
}

interface ImportResultItem {
  nodokumen: string;
  success: boolean;
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = 'idle' | 'preview' | 'importing' | 'done';

/**
 * 🎨 Palette Micro-UX Enhancement: HarvestJsonUploadModal
 * - Standardized dialog attributes (role="dialog", aria-modal="true", aria-labelledby="harvest-json-upload-title")
 * - Focus capture and restoration (saves document.activeElement and returns focus to it on close)
 * - Automatic close button focusing upon modal render
 * - Escape key dismissal support (guarded against active loaders/importing state)
 * - Accessible label/hint linkages on file inputs
 * - Explicit focus rings for visible keyboard navigation
 */
export default function HarvestJsonUploadModal({ open, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [records, setRecords] = useState<JsonRecord[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fcbaError, setFcbaError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<{ success: ImportResultItem[]; failed: ImportResultItem[] } | null>(null);

  const userFcba = useMemo(() => cookieStore.getFcba(), []);
  const userLevel = useMemo(() => cookieStore.getLevel(), []);
  const isAdmin = userLevel === 'ADM';
  const allowed = userLevel === 'ADM';

  const handleClose = useCallback(() => {
    setPhase('idle');
    setRecords([]);
    setParseError(null);
    setFcbaError(null);
    setProgress(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  }, [onClose]);

  // Capture previous active element and auto-focus on close button
  useEffect(() => {
    if (open && allowed) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
        // Delay slightly to prevent focus racing
        setTimeout(() => {
          previousActiveElementRef.current?.focus();
        }, 0);
      };
    }
  }, [open, allowed]);

  // Escape key handler
  useEffect(() => {
    if (!open || !allowed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'importing') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, allowed, phase, handleClose]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setFcbaError(null);
    setResult(null);
    setPhase('idle');

    if (!file.name.endsWith('.json')) {
      setParseError('Hanya file dengan ekstensi .json yang diizinkan.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const data = Array.isArray(parsed) ? parsed : parsed.data ?? parsed.records ?? [];

      if (!Array.isArray(data) || data.length === 0) {
        setParseError('File JSON tidak mengandung data array yang valid.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (!isAdmin && userFcba) {
        const invalid = data.filter(
          (r: JsonRecord) => r.fcba && String(r.fcba) !== userFcba
        );
        if (invalid.length > 0) {
          setFcbaError(
            `Terdapat ${invalid.length} record dengan FCBA berbeda. Akun Anda memiliki FCBA "${userFcba}". Semua data harus memiliki FCBA yang sama.`
          );
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      setRecords(data as JsonRecord[]);
      setPhase('preview');
    } catch {
      setParseError('File tidak valid. Pastikan file berformat JSON yang benar.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isAdmin, userFcba]);

  const handleImport = useCallback(async () => {
    if (records.length === 0) return;

    setPhase('importing');
    setResult(null);

    const total = records.length;
    const batchSize = total > 10000 ? 500 : 200;
    const totalBatches = Math.ceil(total / batchSize);
    let accSuccess = 0;
    let accFail = 0;
    const allSuccess: ImportResultItem[] = [];
    const allFailed: ImportResultItem[] = [];

    for (let i = 0; i < total; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;

      setProgress({
        percent: Math.round((i / total) * 100),
        processed: i,
        total,
        currentBatch,
        totalBatches,
        currentRecord: String(batch[0]?.nodokumen || batch[0]?.kode_karyawan || '...'),
        successCount: accSuccess,
        failCount: accFail,
      });

      try {
        const res = await fetch('/api/harvest/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ data: batch }),
        });

        const json = await res.json();

        if (json.success && json.data) {
          const d = json.data as { successCount: number; failCount: number; success: ImportResultItem[]; failed: ImportResultItem[] };
          accSuccess += d.successCount;
          accFail += d.failCount;
          allSuccess.push(...(d.success || []));
          allFailed.push(...(d.failed || []));
        } else {
          for (const record of batch) {
            allFailed.push({
              nodokumen: String(record.nodokumen || record.kode_karyawan || 'unknown'),
              success: false,
              error: json.message || 'Gagal memproses batch',
            });
            accFail++;
          }
        }
      } catch (err) {
        for (const record of batch) {
          allFailed.push({
            nodokumen: String(record.nodokumen || record.kode_karyawan || 'unknown'),
            success: false,
            error: err instanceof Error ? err.message : 'Kesalahan jaringan',
          });
          accFail++;
        }
      }
    }

    setProgress({
      percent: 100,
      processed: total,
      total,
      currentBatch: totalBatches,
      totalBatches,
      currentRecord: '',
      successCount: accSuccess,
      failCount: accFail,
    });

    setResult({ success: allSuccess, failed: allFailed });
    setPhase('done');
  }, [records]);

  if (!open || !allowed) return null;

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="harvest-json-upload-title"
    >
      <div className="modal-box max-w-[calc(100vw-1rem)] sm:max-w-5xl mx-2 sm:mx-0 p-2 sm:p-6">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-base-100 pb-2 -mx-2 sm:-mx-6 px-2 sm:px-6 border-b border-base-300">
          <div className="flex items-start justify-between">
            <h3 id="harvest-json-upload-title" className="font-bold text-lg">Upload JSON Harvesting</h3>
            <button
              ref={closeButtonRef}
              type="button"
              className="btn btn-sm btn-circle btn-ghost focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              onClick={handleClose}
              disabled={phase === 'importing'}
              aria-label="Tutup upload JSON"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Phase: IDLE — File Picker */}
          {phase === 'idle' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="text-base-content/60 text-center">
                <p id="json-upload-label" className="text-lg font-medium mb-2">Pilih file JSON</p>
                <p id="json-upload-hint" className="text-sm">File harus berformat .json dengan data harvesting</p>
              </div>
              <input
                ref={fileInputRef}
                id="harvest-json-file"
                type="file"
                accept=".json"
                className="file-input file-input-bordered w-full max-w-md focus:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                onChange={handleFileSelect}
                aria-labelledby="json-upload-label"
                aria-describedby="json-upload-hint"
              />
              {parseError && (
                <div className="alert alert-error shadow-sm max-w-md" role="alert">
                  <p>{parseError}</p>
                </div>
              )}
              {fcbaError && (
                <div className="alert alert-error shadow-sm max-w-md" role="alert">
                  <p>{fcbaError}</p>
                </div>
              )}
            </div>
          )}

          {/* Phase: PREVIEW — Show table */}
          {phase === 'preview' && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="badge badge-lg gap-2">
                    <span>{records.length} records</span>
                  </div>
                  {records.length > 10000 ? (
                    <span className="badge badge-error gap-1">🔴 Sangat Besar</span>
                  ) : records.length > 5000 ? (
                    <span className="badge badge-warning gap-1">⚠️ File Besar</span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    onClick={() => {
                      setPhase('idle');
                      setRecords([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Pilih file lain
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    onClick={handleImport}
                  >
                    Import {records.length} Data
                  </button>
                </div>
              </div>

              {records.length > 10000 && (
                <div className="alert alert-error shadow-sm text-sm" role="alert">
                  🔴 File sangat besar ({records.length} records). Preview tidak ditampilkan.
                  Import akan diproses dalam {Math.ceil(records.length / 500)} batch.
                  <br />Pastikan koneksi stabil dan jangan tutup halaman sampai selesai.
                </div>
              )}

              {records.length > 5000 && records.length <= 10000 && (
                <div className="alert alert-warning shadow-sm text-sm">
                  ⚠️ File berisi {records.length} records. Proses akan berjalan di background.
                  Estimasi: ~{Math.ceil(records.length / 200)} batch.
                </div>
              )}

              {/* Table preview — skip for > 10000 */}
              {records.length <= 10000 && (
                <div className="overflow-x-auto">
                  <table className="table table-zebra table-xs">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>No Dokumen</th>
                        <th>Tanggal</th>
                        <th>Kode Karyawan</th>
                        <th>Nama Karyawan</th>
                        <th>Output</th>
                        <th>Busuk</th>
                        <th>Busuk2</th>
                        <th>Parteno50+</th>
                        <th>Brondol</th>
                        <th>TPH</th>
                        <th>Fieldcode</th>
                        <th>Afdeling</th>
                        <th>FCBA</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.slice(0, 50).map((r, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td className="font-mono text-xs">{r.nodokumen || '-'}</td>
                          <td>{r.tanggal || '-'}</td>
                          <td>{r.kode_karyawan || '-'}</td>
                          <td>{r.nama_karyawan || '-'}</td>
                          <td className="text-right">{String(r.output ?? '-')}</td>
                          <td className="text-right">{String(r.busuk ?? '-')}</td>
                          <td className="text-right">{String(r.busuk2 ?? '-')}</td>
                          <td className="text-right">{String(r.parteno50plus ?? '-')}</td>
                          <td className="text-right">{String(r.brondol ?? '-')}</td>
                          <td>{r.tph || '-'}</td>
                          <td>{r.fieldcode || '-'}</td>
                          <td>{r.afdeling || '-'}</td>
                          <td>{r.fcba || '-'}</td>
                          <td>{r.status_harvesting || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {records.length > 50 && (
                    <p className="text-xs text-base-content/50 text-center mt-2">
                      Menampilkan 50 dari {records.length} records
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Phase: IMPORTING — Progress */}
          {phase === 'importing' && progress && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{progress.percent}%</span>
                  <span className="text-base-content/60">
                    {progress.processed} / {progress.total} records
                  </span>
                </div>
                <progress
                  className="progress progress-primary w-full"
                  value={progress.percent}
                  max={100}
                />
              </div>
              <div className="text-sm text-base-content/60 space-y-1">
                <p>Batch {progress.currentBatch} of {progress.totalBatches}</p>
                <p>
                  <span className="loading loading-spinner loading-xs" />
                  {' '}{progress.currentRecord}
                </p>
              </div>
              <div className="flex gap-4 text-sm font-medium">
                <span className="text-success">
                  ✅ {progress.successCount} Berhasil
                </span>
                <span className="text-error">
                  ❌ {progress.failCount} Gagal
                </span>
              </div>
            </div>
          )}

          {/* Phase: DONE — Result */}
          {phase === 'done' && result && (
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                {result.failed.length === 0 ? (
                  <div className="alert alert-success shadow-sm flex-1" role="alert">
                    <p className="font-semibold">
                      ✅ Semua {result.success.length} data berhasil diimport!
                    </p>
                  </div>
                ) : result.success.length === 0 ? (
                  <div className="alert alert-error shadow-sm flex-1" role="alert">
                    <p className="font-semibold">
                      ❌ Semua {result.failed.length} data gagal diimport.
                    </p>
                  </div>
                ) : (
                  <div className="alert alert-warning shadow-sm flex-1" role="alert">
                    <p className="font-semibold">
                      ⚠️  {result.success.length} berhasil, {result.failed.length} gagal.
                    </p>
                  </div>
                )}
              </div>

              {/* Success list */}
              {result.success.length > 0 && (
                <details className="collapse collapse-arrow bg-base-200 rounded-lg">
                  <summary className="collapse-title text-sm font-medium text-success">
                    ✅ {result.success.length} Berhasil
                  </summary>
                  <div className="collapse-content">
                    <div className="max-h-40 overflow-y-auto">
                      {result.success.slice(0, 100).map((item, i) => (
                        <p key={i} className="text-xs font-mono py-0.5">{item.nodokumen}</p>
                      ))}
                      {result.success.length > 100 && (
                        <p className="text-xs text-base-content/50 mt-1">
                          ...dan {result.success.length - 100} lainnya
                        </p>
                      )}
                    </div>
                  </div>
                </details>
              )}

              {/* Failed list */}
              {result.failed.length > 0 && (
                <details className="collapse collapse-arrow bg-base-200 rounded-lg" open>
                  <summary className="collapse-title text-sm font-medium text-error">
                    ❌ {result.failed.length} Gagal
                  </summary>
                  <div className="collapse-content">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {result.failed.slice(0, 100).map((item, i) => (
                        <div key={i} className="text-xs bg-base-100 rounded p-2">
                          <span className="font-mono font-medium">{item.nodokumen}</span>
                          <br />
                          <span className="text-error">{item.error}</span>
                        </div>
                      ))}
                      {result.failed.length > 100 && (
                        <p className="text-xs text-base-content/50 mt-1">
                          ...dan {result.failed.length - 100} lainnya
                        </p>
                      )}
                    </div>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-base-100 pt-2 -mx-2 sm:-mx-6 px-2 sm:px-6 border-t border-base-300">
          <div className="flex flex-wrap gap-2 justify-end">
            {phase === 'preview' && (
              <button
                type="button"
                className="btn btn-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                onClick={() => {
                  setPhase('idle');
                  setRecords([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Batal
              </button>
            )}
            {(phase === 'done' || phase === 'idle') && (
              <button
                type="button"
                className="btn btn-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                onClick={handleClose}
              >
                Tutup
              </button>
            )}
            {phase === 'importing' && (
              <button
                type="button"
                className="btn btn-sm btn-disabled focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                disabled
              >
                <span className="loading loading-spinner loading-xs" />
                Importing...
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40 backdrop-blur-[2px]" onClick={phase !== 'importing' ? handleClose : undefined} />
    </div>
  );
}
