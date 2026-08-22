'use client';

import { useState } from 'react';
import { Icon } from '@/app/components/ui/icons';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'search-select';
  options?: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}

export interface FilterBarProps {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
  t?: (key: string) => string;
  className?: string;
  showApply?: boolean;
  showReset?: boolean;
}

export function FilterBar({
  fields,
  values,
  onChange,
  onApply,
  onReset,
  loading,
  t,
  className,
  showApply = true,
  showReset = true,
}: FilterBarProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className={`bg-base-100 p-4 rounded-xl shadow-sm mb-4 border border-base-200${className ? ` ${className}` : ''}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {fields.map(field => {
          if (field.type === 'date') {
            return (
              <input
                key={field.key}
                type="date"
                className="input input-bordered w-full focus-visible:ring-2 focus-visible:ring-primary"
                placeholder={field.placeholder}
                aria-label={field.label || field.placeholder}
                title={field.label || field.placeholder}
                value={values[field.key] ?? ''}
                onChange={e => onChange(field.key, e.target.value)}
                disabled={field.disabled}
              />
            );
          }
          if (field.type === 'select') {
            return (
              <select
                key={field.key}
                className="select select-bordered w-full focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={field.label || field.placeholder}
                title={field.label || field.placeholder}
                value={values[field.key] ?? ''}
                onChange={e => onChange(field.key, e.target.value)}
                disabled={field.disabled}
              >
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            );
          }
          if (field.type === 'search-select') {
            const query = (values[`__q_${field.key}`] ?? '').toLowerCase();
            const filtered = (field.options ?? []).filter(o =>
              o.label.toLowerCase().includes(query) || o.value.toLowerCase().includes(query)
            );
            const selected = field.options?.find(o => o.value === values[field.key]);
            return (
              <div key={field.key} className="relative">
                <input
                  type="text"
                  className="input input-bordered w-full focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder={field.placeholder}
                  aria-label={field.label || field.placeholder}
                  title={field.label || field.placeholder}
                  value={openKey === field.key ? (values[`__q_${field.key}`] ?? selected?.label ?? '') : (selected?.label ?? '')}
                  onChange={e => {
                    onChange(`__q_${field.key}`, e.target.value);
                    setOpenKey(field.key);
                  }}
                  onFocus={() => setOpenKey(field.key)}
                  disabled={field.disabled}
                />
                {openKey === field.key && !field.disabled && (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-base-300 bg-base-100 shadow-lg">
                    {filtered.length === 0 ? (
                      <li className="px-3 py-2 text-sm opacity-60">No match</li>
                    ) : (
                      filtered.map(opt => (
                        <li key={opt.value}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-base-200"
                            onClick={() => {
                              onChange(field.key, opt.value);
                              onChange(`__q_${field.key}`, opt.label);
                              setOpenKey(null);
                            }}
                          >
                            {opt.label}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            );
          }
          return (
            <input
              key={field.key}
              type="text"
              className="input input-bordered w-full focus-visible:ring-2 focus-visible:ring-primary"
              placeholder={field.placeholder}
              aria-label={field.label || field.placeholder}
              title={field.label || field.placeholder}
              value={values[field.key] ?? ''}
              onChange={e => onChange(field.key, e.target.value)}
              disabled={field.disabled}
            />
          );
        })}
      </div>

      {(showApply || showReset) && (
        <div className="flex justify-start gap-2 pt-3 border-t border-base-200">
          {showApply && (
            <button
              className={`btn btn-outline btn-primary focus-visible:ring-2 focus-visible:ring-primary ${loading ? 'btn-disabled' : ''}`}
              onClick={onApply}
              disabled={loading}
              aria-label={t?.('filterApply') ?? 'Apply'}
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Icon name="filter" className="h-4 w-4" />
              )}
              {loading ? (t?.('loading') ?? 'Loading...') : (t?.('filterApply') ?? 'Apply')}
            </button>
          )}
          {showReset && (
            <button
              className={`btn btn-ghost focus-visible:ring-2 focus-visible:ring-primary ${loading ? 'btn-disabled' : ''}`}
              onClick={onReset}
              disabled={loading}
              aria-label={t?.('filterReset') ?? 'Reset'}
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Icon name="reset" className="h-4 w-4" />
              )}
              {loading ? (t?.('loading') ?? 'Loading...') : (t?.('filterReset') ?? 'Reset')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

