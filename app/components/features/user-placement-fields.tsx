'use client';

import { useTranslations } from 'next-intl';
import { SearchSelect, type Option } from '@/app/components/ui/search-select';
import { SectionHeader } from '@/app/components/ui/section-header';
import { useUserPlacementOptions } from '@/hooks/useUserPlacementOptions';
import {
  POSITION_TO_LEVEL,
  getEmployeePlacementPatch,
  getPositionChangePatch,
} from '@/utils/users/placementRules';
import type { UserFormState } from '@/types/domain';

type PlacementValue = Pick<
  UserFormState,
  'position' | 'level' | 'idkaryawan' | 'fcba' | 'afdeling' | 'gangcode'
>;

type UserPlacementFieldsProps = {
  value: PlacementValue;
  onChange: (patch: Partial<UserFormState>) => void;
  positionOptions: Option[];
  fcbaDisabled?: boolean;
  fcbaHint?: string;
};

/** Jabatan + ID Karyawan dulu, lalu penempatan FCBA/Afdeling/Gang. */
export function UserPlacementFields({
  value,
  onChange,
  positionOptions,
  fcbaDisabled,
  fcbaHint,
}: UserPlacementFieldsProps) {
  const t = useTranslations('Users');
  const { rules, fcbaOptions, sectionOptions, gangOptions, idOptions, employeeMap } =
    useUserPlacementOptions(value.position, value.fcba, value.afdeling, t('allOption'));

  const onPositionChange = (position: string) => {
    onChange({
      ...getPositionChangePatch(value, position),
      position,
      level: POSITION_TO_LEVEL[position] || '',
    });
  };

  const onEmployeeChange = (code: string) => {
    const employee = employeeMap.get(code);
    if (!employee) {
      onChange({ idkaryawan: code });
      return;
    }
    onChange(
      getEmployeePlacementPatch(employee, value.position, gangOptions, {
        fcbaLocked: fcbaDisabled,
      })
    );
  };

  const requiredStar = (required: boolean) => (required ? ' *' : '');

  return (
    <>
      <SectionHeader title={t('positionIdentity')} />
      <fieldset className="fieldset col-span-12 md:col-span-6">
        <legend className="fieldset-legend">{t('position')}</legend>
        <select
          className="select select-bordered w-full"
          value={value.position}
          onChange={e => onPositionChange(e.target.value)}
        >
          <option value="">{t('select')}</option>
          {positionOptions.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </fieldset>
      <fieldset className="fieldset col-span-12 md:col-span-6">
        <legend className="fieldset-legend">
          {t('idkaryawan')}
          {requiredStar(rules.idRequired)}
        </legend>
        <SearchSelect
          options={idOptions}
          value={value.idkaryawan}
          onChange={onEmployeeChange}
          placeholder={t('select')}
          translationNamespace="Users"
          useFixedPositioning
        />
        {rules.idRequired && !value.idkaryawan && (
          <span className="text-[0.6rem] text-warning mt-0.5 block leading-tight">
            {t('idKaryawanRequiredForPosition')}
          </span>
        )}
      </fieldset>

      <SectionHeader title={t('assignment')} />
      <fieldset className="fieldset col-span-12 md:col-span-4">
        <legend className="fieldset-legend">FCBA</legend>
        <SearchSelect
          options={fcbaOptions}
          value={value.fcba}
          onChange={v => onChange({ fcba: v, afdeling: '', gangcode: '', idkaryawan: '' })}
          placeholder={t('select')}
          translationNamespace="Users"
          disabled={fcbaDisabled}
          useFixedPositioning
        />
        {fcbaHint && (
          <span className="text-[0.6rem] text-base-content/40 mt-0.5 block leading-tight">
            {fcbaHint}
          </span>
        )}
      </fieldset>
      <fieldset className="fieldset col-span-12 md:col-span-4">
        <legend className="fieldset-legend">{t('afdeling')}</legend>
        <SearchSelect
          options={sectionOptions}
          value={value.afdeling}
          onChange={v => onChange({ afdeling: v, gangcode: '', idkaryawan: '' })}
          placeholder={!value.fcba ? t('selectFcbaFirst') : t('select')}
          disabled={!value.fcba}
          translationNamespace="Users"
          useFixedPositioning
        />
      </fieldset>
      <fieldset className="fieldset col-span-12 md:col-span-4">
        <legend className="fieldset-legend">
          {t('gangcode')}
          {requiredStar(rules.gangRequired)}
        </legend>
        <SearchSelect
          options={gangOptions}
          value={value.gangcode}
          onChange={v => onChange({ gangcode: v })}
          placeholder={!value.afdeling ? t('selectAfdelingFirst') : t('select')}
          disabled={!value.afdeling}
          translationNamespace="Users"
          useFixedPositioning
        />
        {rules.gangRequired && !value.gangcode && (
          <span className="text-[0.6rem] text-warning mt-0.5 block leading-tight">
            {t('gangRequiredForPosition')}
          </span>
        )}
      </fieldset>
    </>
  );
}

type CompactSelectProps = {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  disabled?: boolean;
  widthClass: string;
};

function CompactSelect({ value, options, onChange, disabled, widthClass }: CompactSelectProps) {
  const hasValue = options.some(o => o.value === value);
  return (
    <select
      className={`select select-bordered select-xs ${widthClass}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">-</option>
      {value && !hasValue && (
        <option value={value} disabled>
          {value}
        </option>
      )}
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.value}
        </option>
      ))}
    </select>
  );
}

type BulkUserPlacementCellsProps = {
  row: PlacementValue;
  positionOptions: Option[];
  onChange: (patch: Partial<UserFormState>) => void;
  fcbaDisabled?: boolean;
};

/** Sel tabel Bulk Add: urutan Jabatan, ID Karyawan, FCBA, Afdeling, Gang. */
export function BulkUserPlacementCells({
  row,
  positionOptions,
  onChange,
  fcbaDisabled,
}: BulkUserPlacementCellsProps) {
  const t = useTranslations('Users');
  const { fcbaOptions, sectionOptions, gangOptions, idOptions, employeeMap } =
    useUserPlacementOptions(row.position, row.fcba, row.afdeling, t('allOption'));

  const onPositionChange = (position: string) => {
    onChange({
      ...getPositionChangePatch(row, position),
      position,
      level: POSITION_TO_LEVEL[position] || '',
    });
  };

  const onEmployeeChange = (code: string) => {
    const employee = employeeMap.get(code);
    if (!employee) {
      onChange({ idkaryawan: code });
      return;
    }
    onChange(
      getEmployeePlacementPatch(employee, row.position, gangOptions, { fcbaLocked: fcbaDisabled })
    );
  };

  return (
    <>
      <td>
        <CompactSelect
          value={row.position}
          options={positionOptions}
          onChange={onPositionChange}
          widthClass="w-28"
        />
      </td>
      <td>
        <div className="w-44">
          <SearchSelect
            options={idOptions}
            value={row.idkaryawan}
            onChange={onEmployeeChange}
            placeholder={t('select')}
            small
            translationNamespace="Users"
            useFixedPositioning
          />
        </div>
      </td>
      <td>
        <CompactSelect
          value={row.fcba}
          options={fcbaOptions}
          onChange={v => onChange({ fcba: v, afdeling: '', gangcode: '', idkaryawan: '' })}
          disabled={fcbaDisabled}
          widthClass="w-20"
        />
      </td>
      <td>
        <CompactSelect
          value={row.afdeling}
          options={sectionOptions}
          onChange={v => onChange({ afdeling: v, gangcode: '', idkaryawan: '' })}
          disabled={!row.fcba}
          widthClass="w-20"
        />
      </td>
      <td>
        <CompactSelect
          value={row.gangcode}
          options={gangOptions}
          onChange={v => onChange({ gangcode: v })}
          disabled={!row.afdeling}
          widthClass="w-20"
        />
      </td>
    </>
  );
}
