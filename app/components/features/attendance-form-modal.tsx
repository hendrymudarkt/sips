'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { SearchSelect, type Option } from '@/app/components/ui/search-select';
import type { FormState } from '@/types/domain';
import { buildMapUrl } from '@/utils/services/mapHelper';
import { isSafeHref } from '@/lib/utils/inputSanitizer';

interface AttendanceFormModalProps {
  open: boolean;
  isEditing: boolean;
  detailLoading: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  preview: string;
  imgRef: React.RefObject<HTMLInputElement | null>;
  pdfRef: React.RefObject<HTMLInputElement | null>;
  mutation: { isPending: boolean };
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setOpen: (v: boolean) => void;
  onChangeImage: (f?: File) => void;
  disableUnlessAllowed: (allowed: boolean) => boolean;
  destOptions: Option[];
  destFcba: string;
  destSection: string;
  isLoadingBU: boolean;
  isLoadingDestSections: boolean;
  destSectionOptions: Option[];
  userLevel: string;
  selFcba: string;
  setSelFcba: (v: string) => void;
  setSelSection: (v: string) => void;
  setSelGang: (v: string) => void;
  homeFcba: string;
  homeSection: string;
  fcbaOptions: Option[];
  sectionOptions: Option[];
  selSection: string;
  gangOptions: Option[];
  selGang: string;
  mandorOptions: Option[];
  selectedMandorGang: string;
  employeeOptions: Option[];
  onChangeSection: (v: string) => void;
  onChangeGang: (v: string) => void;
  onChangeEmployee: (v: string) => void;
  onChangeMandor: (v: string) => void;
  onChangeDestFcba: (v: string) => void;
  onChangeDestSection: (v: string) => void;
  isLoadingSections: boolean;
  isLoadingGangs: boolean;
  isLoadingSmp: boolean;
  t: (key: string) => string;
}

export default function AttendanceFormModal({
  open,
  isEditing,
  detailLoading,
  form,
  setForm,
  preview,
  imgRef,
  pdfRef,
  mutation,
  handleSubmit,
  setOpen,
  onChangeImage,
  disableUnlessAllowed,
  destOptions,
  destFcba,
  destSection,
  isLoadingBU,
  isLoadingDestSections,
  destSectionOptions,
  userLevel,
  selFcba,
  setSelFcba,
  setSelSection,
  setSelGang,
  homeFcba,
  homeSection,
  fcbaOptions,
  sectionOptions,
  selSection,
  gangOptions,
  selGang,
  mandorOptions,
  selectedMandorGang,
  employeeOptions,
  onChangeSection,
  onChangeGang,
  onChangeEmployee,
  onChangeMandor,
  onChangeDestFcba,
  onChangeDestSection,
  isLoadingSections,
  isLoadingGangs,
  isLoadingSmp,
  t,
}: AttendanceFormModalProps) {
  const [fileError, setFileError] = useState('');
  useEffect(() => { if (open) setFileError(''); }, [open]);
  if (!open) return null;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label={isEditing ? t('modalEditTitle') : t('modalAddTitle')}>
      <div className="modal-box max-w-[calc(100vw-1rem)] sm:max-w-5xl mx-2 sm:mx-0 p-2 sm:p-6">
        <div className="sticky top-0 z-10 bg-base-100 pb-2 -mx-2 sm:-mx-6 px-2 sm:px-6 border-b border-base-300">
          <div className="flex items-start justify-between">
            <h3 className="font-bold text-xl">
              {isEditing ? t('modalEditTitle') : t('modalAddTitle')}
            </h3>
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => setOpen(false)}
              aria-label={t('close')}
              title={t('close')}
            >
              ✕
            </button>
          </div>
        </div>
        {detailLoading && (
          <div className="absolute inset-0 bg-base-100/70 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
            <div className="flex items-center gap-3">
              <span className="loading loading-spinner loading-lg" />
              <span>{t('modalLoadingDetail')}</span>
            </div>
          </div>
        )}
        <form
          id="attendance-form"
          onSubmit={handleSubmit}
          className="grid grid-cols-12 gap-2 max-h-[80vh] overflow-y-auto"
        >
          <div className="col-span-12">
            <h4 className="text-sm font-semibold text-base-content/80">{t('formInfoTitle')}</h4>
            <div className="mt-1 border-t border-base-300" />
          </div>

          <fieldset className="fieldset col-span-12 md:col-span-3">
            <legend className="fieldset-legend">{t('formTanggal')}</legend>
            <input type="date" className="input input-bordered w-full" value={form.tanggal ?? ''}
              onChange={e => setForm(s => ({ ...s, tanggal: e.target.value }))} required
              disabled={disableUnlessAllowed(false)} title={t('formTanggalTooltip')} />
          </fieldset>

          <fieldset className="fieldset col-span-12 md:col-span-2">
            <legend className="fieldset-legend">{t('formTimeIn')}</legend>
            <input type="time" className="input input-bordered w-full" value={form.time_in ?? ''}
              onChange={e => setForm(s => ({ ...s, time_in: e.target.value }))} required
              disabled={disableUnlessAllowed(true)} title={t('hintTimeIn')} />
          </fieldset>

          <fieldset className="fieldset col-span-12 md:col-span-2">
            <legend className="fieldset-legend">{t('formTimeOut')}</legend>
            <input type="time" className="input input-bordered w-full" value={form.time_out ?? ''}
              onChange={e => setForm(s => ({ ...s, time_out: e.target.value }))}
              disabled={disableUnlessAllowed(true)} title={t('hintTimeOut')} />
          </fieldset>

          <fieldset className="fieldset col-span-12 md:col-span-3">
            <legend className="fieldset-legend">{t('formAttendanceType')}</legend>
            <SearchSelect
              options={[{ value: 'REGULAR', label: 'REGULAR' }, { value: 'ASSISTENSI', label: 'ASSISTENSI' }]}
              value={form.attendance_type}
              onChange={v => setForm(s => ({ ...s, attendance_type: v as 'REGULAR' | 'ASSISTENSI' }))}
              disabled={disableUnlessAllowed(false)}
            />
          </fieldset>

          <fieldset className="fieldset col-span-12 md:col-span-2">
            <legend className="fieldset-legend">{t('formAttendance')}</legend>
            <SearchSelect
              options={['KJ', 'MK', 'WH', 'WS', 'ML', 'P1', 'KB', 'OT'].map(v => ({ value: v, label: v }))}
              value={form.attendance ?? 'KJ'}
              onChange={v => setForm(s => ({ ...s, attendance: v as FormState['attendance'] }))}
              disabled={disableUnlessAllowed(false)}
            />
          </fieldset>

          {form.attendance_type === 'ASSISTENSI' && (
            <>
              <div className="col-span-12 mt-1">
                <h4 className="text-sm font-semibold text-base-content/80">{t('formDestTitle')}</h4>
                <div className="mt-1 border-t border-base-300" />
              </div>
              <fieldset className="fieldset col-span-12 md:col-span-4">
                <legend className="fieldset-legend">{t('formFcbaDest')}</legend>
                <SearchSelect options={destOptions} value={destFcba ?? ''}
                  onChange={onChangeDestFcba}
                  placeholder={isLoadingBU ? 'Memuat...' : 'Pilih FCBA tujuan'}
                  disabled={disableUnlessAllowed(false) || isLoadingBU} />
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-4">
                <legend className="fieldset-legend">{t('formSectionDest')}</legend>
                <SearchSelect key={`section-dest-${destFcba}`} options={destSectionOptions}
                  value={destSection ?? ''} onChange={onChangeDestSection}
                  placeholder={isLoadingBU || isLoadingDestSections ? 'Memuat...'
                    : destFcba ? destSectionOptions.length > 0 ? 'Pilih Section tujuan' : 'Tidak ada Section tujuan'
                    : 'Pilih FCBA tujuan dulu'}
                  disabled={!destFcba || disableUnlessAllowed(false) || isLoadingBU || isLoadingDestSections} />
              </fieldset>
            </>
          )}

          <div className="col-span-12 mt-1">
            <h4 className="text-sm font-semibold text-base-content/80">{t('formOriginTitle')}</h4>
            <div className="mt-1 border-t border-base-300" />
          </div>

          <fieldset className="fieldset col-span-12 md:col-span-3">
            <legend className="fieldset-legend">{userLevel === 'ADM' ? t('formFcba') : t('formFcbaAccount')}</legend>
            {userLevel === 'ADM' ? (
              <SearchSelect options={fcbaOptions} value={selFcba}
                onChange={v => { setSelFcba(v); setSelSection(''); setSelGang(''); setForm(s => ({ ...s, fcba: v, section: '', gang: '', kode_karyawan: '', pengancakan: '' })); }}
                placeholder={isLoadingBU ? 'Memuat FCBA...' : 'Pilih FCBA'}
                disabled={disableUnlessAllowed(false) || isLoadingBU} />
            ) : (
              <input type="text" className="input input-bordered w-full" value={homeFcba ?? ''} readOnly disabled />
            )}
          </fieldset>

          <fieldset className="fieldset col-span-12 md:col-span-3">
            <legend className="fieldset-legend">{t('formAfdeling')}</legend>
            <SearchSelect options={sectionOptions} value={selSection ?? ''}
              onChange={onChangeSection}
              placeholder={isLoadingSections ? 'Memuat...' : selFcba ? userLevel === 'AST' ? homeSection || 'Afdeling terkunci' : 'Pilih Afdeling' : 'Pilih FCBA dulu'}
              disabled={!selFcba || disableUnlessAllowed(false) || userLevel === 'AST' || isLoadingSections} />
          </fieldset>

          <fieldset className="fieldset col-span-12 md:col-span-4">
            <legend className="fieldset-legend">{t('formGang')}</legend>
            <SearchSelect options={gangOptions} value={selGang ?? ''}
              onChange={onChangeGang}
              placeholder={isLoadingGangs ? 'Memuat...' : selSection ? 'Pilih Gang' : 'Pilih Afdeling dulu'}
              disabled={!selSection || disableUnlessAllowed(false) || isLoadingGangs} />
          </fieldset>

          <div className="col-span-12 mt-1">
            <h4 className="text-sm font-semibold text-base-content/80">{t('formPersonnelTitle')}</h4>
            <div className="mt-1 border-t border-base-300" />
          </div>

          <fieldset className="fieldset col-span-12 md:col-span-4">
            <legend className="fieldset-legend">{t('formMandor')}</legend>
            <SearchSelect options={mandorOptions} value={form.kode_karyawan_mandor ?? ''}
              onChange={onChangeMandor}
              placeholder={isLoadingSmp ? 'Memuat Mandor...' : 'Pilih Mandor'}
              disabled={disableUnlessAllowed(false) || isLoadingSmp} />
          </fieldset>

          <fieldset className="fieldset col-span-12 md:col-span-2">
            <legend className="fieldset-legend">{t('formKemandoran')}</legend>
            <input type="text" className="input input-bordered w-full" value={selectedMandorGang}
              readOnly disabled title={t('formKemandoranTooltip')} />
          </fieldset>

          <fieldset className="fieldset col-span-12 md:col-span-4">
            <legend className="fieldset-legend">{t('formKaryawan')}</legend>
            <SearchSelect options={employeeOptions} value={form.kode_karyawan ?? ''}
              onChange={onChangeEmployee}
              placeholder={isLoadingSmp ? 'Memuat Karyawan...' : selGang ? 'Pilih Karyawan' : 'Pilih Gang dulu'}
              disabled={!selGang || disableUnlessAllowed(false) || isLoadingSmp} />
          </fieldset>

          <fieldset className="fieldset col-span-12 md:col-span-2">
            <legend className="fieldset-legend">{t('formPengancakan')}</legend>
            <input type="text" className="input input-bordered w-full" value={form.pengancakan ?? ''}
              onChange={e => setForm(s => ({ ...s, pengancakan: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() }))}
              placeholder={selGang ? 'Masukkan No Ancak' : 'Pilih Gang/Karyawan dulu'}
              disabled={!selGang || disableUnlessAllowed(false) || isLoadingSmp} />
          </fieldset>

          <details className="col-span-12" open={false}>
            <summary className="text-sm font-semibold text-base-content/80 cursor-pointer select-none">{t('formCalcDeviceTitle')}</summary>
            <div className="mt-2 border-t border-base-300" />
            <div className="grid grid-cols-12 gap-2 mt-2">
              <fieldset className="fieldset col-span-6 md:col-span-2">
                <legend className="fieldset-legend">{t('formTotalLate')}</legend>
                <input type="text" className="input input-bordered w-full text-center pointer-events-none select-none" value={form.total_late_time ?? ''} readOnly tabIndex={-1} />
              </fieldset>
              <fieldset className="fieldset col-span-6 md:col-span-2">
                <legend className="fieldset-legend">{t('formHomeEarly')}</legend>
                <input type="text" className="input input-bordered w-full text-center pointer-events-none select-none" value={form.go_home_early ?? ''} readOnly tabIndex={-1} />
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-2">
                <legend className="fieldset-legend">{t('formHk')}</legend>
                <input type="text" className="input input-bordered w-full text-center" value={form.mandays} readOnly />
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-3">
                <legend className="fieldset-legend">{t('formLocIn')}</legend>
                <div className="join w-full">
                  <input type="text" className="join-item input input-bordered flex-1 pointer-events-none select-none" value={form.location_in ?? ''} readOnly tabIndex={-1} />
                  {form.location_in && (
                    <a className="join-item btn btn-square btn-outline" href={buildMapUrl(form.location_in)} target="_blank" rel="noopener noreferrer" title={t('gpsOpenMaps')}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </a>
                  )}
                </div>
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-3">
                <legend className="fieldset-legend">{t('formLocOut')}</legend>
                <div className="join w-full">
                  <input type="text" className="join-item input input-bordered flex-1 pointer-events-none select-none" value={form.location_out ?? ''} readOnly tabIndex={-1} />
                  {form.location_out && (
                    <a className="join-item btn btn-square btn-outline" href={buildMapUrl(form.location_out)} target="_blank" rel="noopener noreferrer" title={t('gpsOpenMaps')}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </a>
                  )}
                </div>
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-3">
                <legend className="fieldset-legend">{t('formMac')}</legend>
                <input type="text" className="input input-bordered w-full" value={form.mac_address ?? ''} readOnly />
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-3">
                <legend className="fieldset-legend">{t('formDeviceId')}</legend>
                <input type="text" className="input input-bordered w-full" value={form.id_device ?? ''} readOnly />
              </fieldset>
            </div>
          </details>

          <div className="col-span-12 mt-1">
            <h4 className="text-sm font-semibold text-base-content/80">{t('formDocNotesTitle')}</h4>
            <div className="mt-1 border-t border-base-300" />
          </div>

          <fieldset className="fieldset col-span-12 md:col-span-6">
            <legend className="fieldset-legend">{t('formExceptionCase')}{!isEditing ? ' *' : ''}</legend>
            <textarea className="textarea textarea-bordered min-h-24 w-full" value={form.exception_case ?? ''}
              onChange={e => setForm(s => ({ ...s, exception_case: e.target.value }))}
              required={!isEditing} />
          </fieldset>

          <fieldset className="fieldset col-span-12 md:col-span-6">
            <legend className="fieldset-legend">{t('formBaExca')}{!isEditing ? ' *' : ''}</legend>
            <input ref={pdfRef} type="file" accept="application/pdf" className="file-input file-input-bordered w-full"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file && file.size > 4 * 1024 * 1024) {
                  setFileError('File maksimal 4 MB');
                  e.target.value = '';
                  return;
                }
                setFileError('');
                setForm(s => ({ ...s, no_ba_exca_file: file }));
              }}
              required={!isEditing} />
            {fileError && <p className="text-error text-sm mt-1">{fileError}</p>}
            {form.no_ba_exca && (
              <div className="mt-1">
                <a className="link link-primary text-sm" href={isSafeHref(form.no_ba_exca) ? form.no_ba_exca : '#'} target="_blank" rel="noopener noreferrer">{t('hintLinkBaExca')}</a>
              </div>
            )}
          </fieldset>

          <div className="col-span-12">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">{t('formFoto')}</legend>
              <input ref={imgRef} type="file" accept="image/*" className="file-input file-input-bordered w-full"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f && f.size > 4 * 1024 * 1024) {
                    setFileError('File maksimal 4 MB');
                    e.target.value = '';
                    return;
                  }
                  setFileError('');
                  setForm(s => ({ ...s, images: f }));
                  onChangeImage(f);
                }}
                disabled={disableUnlessAllowed(false)} />
              {fileError && <p className="text-error text-sm mt-1">{fileError}</p>}
            </fieldset>
            {preview && (
              <div className="mt-3 relative w-full h-80 rounded-xl overflow-hidden border">
                <Image src={preview} alt="preview" fill className="object-contain bg-base-200" sizes="100vw" unoptimized />
              </div>
            )}
          </div>
        </form>
        <div className="sticky bottom-0 z-10 bg-base-100 pt-2 -mx-2 sm:-mx-6 px-2 sm:px-6 border-t border-base-300">
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" className="btn" onClick={() => setOpen(false)}>{t('modalCancel')}</button>
            <button type="submit" form="attendance-form"
              className={`btn btn-primary ${mutation.isPending ? 'btn-disabled' : ''}`}
              disabled={mutation.isPending}>
              {mutation.isPending ? <span className="loading loading-spinner" /> : isEditing ? t('modalUpdate') : t('modalSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
