'use client';

/**
 * Change Password Page ? Client Component
 *
 * Prinsip yang diterapkan (Software Design & Architecture Roadmap):
 *
 * Clean Code:
 *   - Meaningful names over comments
 *   - Keep classes/files small ? UI dipecah ke sub-komponen
 *   - Pure functions untuk helper/validator
 *   - Command-query separation: submit handler hanya memberi perintah,
 *     state query dikelola hook
 *
 * Design Principles:
 *   - SRP (Single Responsibility): tiap komponen/hook punya satu alasan berubah
 *   - DRY: UserProfile type dari shared `app/types`, PROFILE_FIELDS cukup di satu tempat
 *   - YAGNI: tidak ada fitur yang belum dibutuhkan
 *   - Program to abstractions: komponen menerima data via props, bukan fetch sendiri
 *
 * Functional Programming:
 *   - Enkapsulasi state & side-effect ke custom hook `useChangePassword`
 *   - Validator sebagai pure function terpisah
 */

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { toTitleCase } from '@/utils/helpers/textManipulation';
import { getProxiedImageUrl } from '@/utils/helpers/imageHelper';
import { cookieStore } from '@/utils/auth/cookieStore';
import type { UserProfile } from '@/app/types';
import AppTour from '@/app/components/feedback/app-tour';
import type { TourStep } from '@/app/components/feedback/app-tour';
import { Icon } from '@/app/components/ui/icons';
import toast from 'react-hot-toast';
import { FormModal } from '@/app/components/ui/form-modal';
import { PhotoUpload } from '@/app/components/ui/photo-upload';

// --- Types --------------------------------------------------------------------

interface ChangePasswordPageProps {
  /** Profile di-fetch di server (SSR) dan diteruskan sebagai prop. */
  profile: UserProfile | null;
}

interface ChangePasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// --- Constants ----------------------------------------------------------------

const PROFILE_FIELDS: { label: string; key: keyof UserProfile }[] = [
  { label: 'Username', key: 'username' },
  { label: 'Fullname', key: 'fullname' },
  { label: 'Email', key: 'email' },
  { label: 'Phone', key: 'phone' },
  { label: 'ID Karyawan', key: 'idkaryawan' },
  { label: 'Level', key: 'level' },
  { label: 'Position', key: 'position' },
  { label: 'FCBA', key: 'fcba' },
  { label: 'Afdeling', key: 'afdeling' },
  { label: 'Gang Code', key: 'gangcode' },
];

const FALLBACK_AVATAR =
  'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp';

// --- Pure Validators (Clean Code: pure functions) -----------------------------

function validatePasswordMatch(
  newPassword: string,
  confirmPassword: string,
  message: string
): string | null {
  if (newPassword !== confirmPassword) return message;
  return null;
}

function validatePasswordLength(password: string, message: string, minLength = 8): string | null {
  if (password.length < minLength) return message;
  return null;
}

function extractProfileData(d: unknown): Record<string, unknown> {
  if (!d || typeof d !== 'object') return {};
  const obj = d as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object') return obj.data as Record<string, unknown>;
  return obj;
}

function extractPhotoUrl(d: unknown): string {
  if (typeof d === 'string') return d;
  if (!d || typeof d !== 'object') return '';
  const obj = d as Record<string, unknown>;
  if (typeof obj.photo === 'string') return obj.photo;
  if (typeof obj.data === 'string') return obj.data;
  if (obj.data && typeof obj.data === 'object') {
    const inner = obj.data as Record<string, unknown>;
    if (typeof inner.photo === 'string') return inner.photo;
    if (typeof inner.data === 'string') return inner.data;
  }
  return '';
}

// --- Custom Hook (SRP: enkapsulasi form logic) --------------------------------

function useChangePassword() {
  const t = useTranslations('Profile');
  const [form, setForm] = useState<ChangePasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /** Query: apakah konfirmasi password cocok (untuk live validation). */
  const isConfirmMismatch =
    !!form.newPassword && !!form.confirmPassword && form.newPassword !== form.confirmPassword;

  /** Command: update salah satu field form. */
  function updateField(field: keyof ChangePasswordFormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  /** Command: reset seluruh form ke initial state. */
  function resetForm() {
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  }

  /** Command: submit form ? satu-satunya fungsi yang menyentuh API. */
  async function submitChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const matchError = validatePasswordMatch(
      form.newPassword,
      form.confirmPassword,
      t('mismatchError')
    );
    if (matchError) {
      setError(matchError);
      return;
    }

    const lengthError = validatePasswordLength(form.newPassword, t('lengthError', { min: 8 }));
    if (lengthError) {
      setError(lengthError);
      return;
    }

    setLoading(true);
    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({
          current_password: form.currentPassword,
          new_password: form.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message || t('success'));
        resetForm();
      } else {
        setError(data.message || t('unexpectedError'));
      }
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  }

  return {
    form,
    loading,
    error,
    success,
    isConfirmMismatch,
    updateField,
    submitChangePassword,
  };
}

// --- Sub-Components (SRP: satu komponen, satu tanggung jawab) -----------------

/** Menampilkan satu field input password. */
function PasswordField({
  label,
  placeholder,
  value,
  hasError = false,
  errorText,
  ariaDescribedBy,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  hasError?: boolean;
  errorText?: string;
  ariaDescribedBy?: string;
  onChange: (value: string) => void;
}) {
  const tAuth = useTranslations('Auth');
  const [show, setShow] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);
  const inputId = `password-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const errorId = `${inputId}-error`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    setIsCapsLock(e.getModifierState('CapsLock'));
  };

  const describedBy = [ariaDescribedBy, hasError && errorText ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-control gap-1">
      <label htmlFor={inputId} className="label py-1">
        <span className="label-text font-medium">{label}</span>
      </label>
      <label
        className={`input input-bordered flex max-w-none items-center gap-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/70 ${hasError ? 'border-error' : ''}`}
      >
        <Icon name="lock" className="h-4 w-4 opacity-70" />
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className="grow bg-transparent outline-none"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyDown}
          required
          minLength={8}
          aria-describedby={describedBy || undefined}
          aria-invalid={hasError ? 'true' : 'false'}
        />
        <button
          type="button"
          onClick={() => setShow(prev => !prev)}
          className="btn btn-ghost btn-square btn-xs opacity-70 hover:text-primary"
          aria-label={show ? tAuth('hidePassword') : tAuth('showPassword')}
          title={show ? tAuth('hidePassword') : tAuth('showPassword')}
        >
          {show ? (
            <Icon name="eye-off" className="h-4 w-4" />
          ) : (
            <Icon name="eye" className="h-4 w-4" />
          )}
        </button>
      </label>
      {hasError && errorText && (
        <span
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-error flex items-center gap-2 px-1 text-[0.6875rem] animate-fadeIn"
        >
          <span className="status status-error inline-block" aria-hidden="true" />
          {errorText}
        </span>
      )}
      {isCapsLock && (
        <span
          className="text-warning flex items-center gap-2 px-1 text-[0.6875rem] animate-fadeIn"
          role="alert"
          aria-live="polite"
        >
          <span className="status status-warning inline-block" aria-hidden="true" />
          {tAuth('capsLock')}
        </span>
      )}
    </div>
  );
}

/** Menampilkan pesan alert (error atau success). */
function FormAlert({ type, message }: { type: 'error' | 'success'; message: string }) {
  const isError = type === 'error';
  return (
    <div
      className={`alert ${isError ? 'alert-error' : 'alert-success'} shadow-sm text-sm animate-fadeIn`}
      role="alert"
      aria-live="polite"
    >
      {isError ? (
        <Icon name="close" className="stroke-current shrink-0 h-5 w-5" />
      ) : (
        <Icon name="check" className="stroke-current shrink-0 h-5 w-5" />
      )}
      <span>{message}</span>
    </div>
  );
}

/** Menampilkan kartu profil pengguna di sisi kiri. */
function UserProfileCard({ profile, onEditProfile }: { profile: UserProfile | null; onEditProfile: () => void }) {
  const t = useTranslations('Profile');

  if (!profile) {
    return (
      <div className="card bg-base-100 shadow-xl border border-base-300 h-full">
        <div className="card-body items-center justify-center">
          <p className="text-base-content/60">{t('failedLoadProfile')}</p>
        </div>
      </div>
    );
  }

  const avatarSrc = getProxiedImageUrl(profile.photo ?? '') || FALLBACK_AVATAR;
  const displayName = profile.fullname ? toTitleCase(profile.fullname) : 'User';
  const displayRole = profile.position || profile.level || 'Staff';

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300 h-full">
      <div className="card-body items-center text-center">
        <div className="avatar mb-2">
          <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 shadow-lg">
            <Image
              src={avatarSrc}
              alt={`Avatar ${displayName}`}
              width={96}
              height={96}
              className="object-cover"
              unoptimized
            />
          </div>
        </div>

        <h2 className="card-title text-xl font-bold">{displayName}</h2>
        <div className="badge badge-secondary badge-outline mt-1 mb-4">{displayRole}</div>

        <button className="btn btn-outline btn-sm w-full mb-3" onClick={onEditProfile}>
          <Icon name="edit" className="h-4 w-4" />
          {t('editProfile')}
        </button>

        <dl className="w-full flex flex-col gap-3 text-left mt-2 text-sm">
          {PROFILE_FIELDS.map(({ label, key }) => (
            <div key={key} className="flex justify-between border-b border-base-200 pb-2">
              <dt className="text-base-content/60">{label}</dt>
              <dd className="font-medium">{String(profile[key] ?? '-')}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** Form ganti password. */
function ChangePasswordForm() {
  const t = useTranslations('Profile');
  const tourSteps: TourStep[] = useMemo(() => [
    {
      icon: '??',
      title: t('tourWelcomeTitle'),
      content: t('tourWelcomeDesc'),
    },
    {
      icon: '??',
      title: t('tourFormTitle'),
      content: t('tourFormDesc'),
    },
  ], [t]);
  const {
    form,
    loading,
    error,
    success,
    isConfirmMismatch,
    updateField,
    submitChangePassword,
  } = useChangePassword();

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300">
      <div className="card-body">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary" aria-hidden="true">
            <Icon name="lock" className="w-6 h-6" />
          </div>
          <div>
            <h2 className="card-title text-xl">{t('changePassword')}</h2>
            <p className="text-xs text-base-content/60">{t('changePasswordSubtitle')}</p>
          </div>
        </div>

        <AppTour
          steps={tourSteps}
          storageKey="tour-change-password"
        />
        <form onSubmit={submitChangePassword} className="flex flex-col gap-5" noValidate>
          <PasswordField
            label={t('currentPassword')}
            placeholder={t('currentPasswordPlaceholder')}
            value={form.currentPassword}
            onChange={value => updateField('currentPassword', value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <PasswordField
                label={t('newPassword')}
                placeholder={t('newPasswordPlaceholder')}
                value={form.newPassword}
                ariaDescribedBy="new-password-hint"
                onChange={value => updateField('newPassword', value)}
              />
              <span id="new-password-hint" className="text-[0.7rem] text-base-content/60 px-1">
                {t('passwordHint')}
              </span>
            </div>
            <PasswordField
              label={t('confirmPassword')}
              placeholder={t('confirmPasswordPlaceholder')}
              value={form.confirmPassword}
              hasError={isConfirmMismatch}
              errorText={isConfirmMismatch ? t('mismatchError') : undefined}
              onChange={value => updateField('confirmPassword', value)}
            />
          </div>

          {error && <FormAlert type="error" message={error} />}
          {success && <FormAlert type="success" message={success} />}

          <div className="form-control mt-4">
            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto sm:self-end min-w-[150px]"
              disabled={loading}
              aria-label={loading ? t('saving') : t('saveChanges')}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  {t('saving')}
                </>
              ) : (
                t('saveChanges')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Page Component (Composition Root) ---------------------------------------

export default function ChangePasswordPage({ profile }: ChangePasswordPageProps) {
  const t = useTranslations('Profile');
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ fullname: '', email: '', phone: '' });
  const [editProfilePhoto, setEditProfilePhoto] = useState<File | null>(null);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(profile);

  const handleEditProfile = useCallback(() => {
    if (!profile) return;
    setEditProfileForm({
      fullname: profile.fullname ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
    });
    setEditProfilePhoto(null);
    setEditProfileOpen(true);
  }, [profile]);

  const handleEditProfileSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditProfileLoading(true);

    try {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      const data: Record<string, string> = {};
      if (editProfileForm.fullname) data.fullname = editProfileForm.fullname;
      if (editProfileForm.email) data.email = editProfileForm.email;
      if (editProfileForm.phone) data.phone = editProfileForm.phone;

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify(data),
      });
      const json: Record<string, unknown> = await res.json();
      if (!res.ok || !json.ok) throw new Error(String(json.message ?? json.error ?? 'Failed to update profile'));

      const profileData = extractProfileData(json.data);
      const newFullname = (profileData.fullname as string) || editProfileForm.fullname;
      cookieStore.setCookie('user_FullName', newFullname);

      let photoUrl = '';
      if (editProfilePhoto) {
        const fd = new FormData();
        fd.append('photo', editProfilePhoto);
        const photoRes = await fetch('/api/auth/photo', {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
        const photoJson: Record<string, unknown> = await photoRes.json();
        if (!photoRes.ok || !photoJson.ok) throw new Error(String(photoJson.message ?? 'Photo upload failed'));

        photoUrl = extractPhotoUrl(photoJson.data);
        if (photoUrl) {
          cookieStore.setCookie('user_Photo', photoUrl);
        }
      } else if (profileData.photo) {
        cookieStore.setCookie('user_Photo', String(profileData.photo));
      }

      setEditProfileOpen(false);
      toast.success(t('profileUpdated'));
      setLocalProfile(prev => prev
        ? {
            ...prev,
            ...data,
            ...profileData,
            photo: photoUrl || String(profileData.photo ?? prev.photo ?? ''),
          }
        : prev);
      window.dispatchEvent(new CustomEvent('sips:profile-updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('profileUpdateFailed'));
    } finally {
      setEditProfileLoading(false);
    }
  }, [editProfileForm, editProfilePhoto, t]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4 md:p-8 flex justify-center items-start pt-10 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl opacity-40 animate-pulse [animation-delay:1s]" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 relative z-0">
        <div className="md:col-span-1">
          <UserProfileCard profile={localProfile} onEditProfile={handleEditProfile} />
        </div>
        <div className="md:col-span-2">
          <ChangePasswordForm />
        </div>
      </div>

      {/* Edit Profile Modal */}
      <FormModal
        open={editProfileOpen}
        title={t('editProfileTitle')}
        onClose={() => { setEditProfileOpen(false); setEditProfilePhoto(null); }}
        onSubmit={handleEditProfileSubmit}
        loading={editProfileLoading}
        confirmText={t('save')}
      >
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">{t('fullname')} *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={editProfileForm.fullname}
            onChange={e => setEditProfileForm(s => ({ ...s, fullname: e.target.value }))}
            required
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">Email</legend>
          <input
            type="email"
            className="input input-bordered w-full"
            value={editProfileForm.email}
            onChange={e => setEditProfileForm(s => ({ ...s, email: e.target.value }))}
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">{t('phone')}</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={editProfileForm.phone}
            onChange={e => setEditProfileForm(s => ({ ...s, phone: e.target.value }))}
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 flex justify-center">
          <PhotoUpload
            value={editProfilePhoto || (profile?.photo ?? null)}
            onChange={f => setEditProfilePhoto(f)}
          />
        </fieldset>
      </FormModal>
    </div>
  );
}



