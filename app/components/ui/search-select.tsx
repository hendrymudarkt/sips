'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/app/components/ui/icons';

export type Option = { value: string; label: string };

interface SearchSelectProps {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  small?: boolean;
  /** Optional: specific translation namespace to use. Defaults to 'Attendance' */
  translationNamespace?: string;
  /** Optional: style for fixed positioning (often used in dashboards or layouts where overflow is hidden) */
  useFixedPositioning?: boolean;
}

/**
 * ⚡ Bolt Optimization: SearchSelect component.
 * - Wrapped in React.memo to prevent unnecessary re-renders.
 * - Uses a pre-calculated Map for O(1) label lookups.
 * - Pre-calculates lowercase search content to optimize filtering performance.
 */
const SearchSelectInner: React.FC<SearchSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  name,
  small,
  translationNamespace = 'Attendance',
  useFixedPositioning = false,
}) => {
  const t = useTranslations(translationNamespace);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // ⚡ Bolt Optimization: Pre-calculate lookup map and search content
  const { optionsMap, enrichedOptions } = useMemo(() => {
    const map = new Map<string, string>();
    const enriched = options.map(o => {
      map.set(o.value, o.label);
      return {
        ...o,
        _search: `${o.label.toLowerCase()} ${o.value.toLowerCase()}`,
      };
    });
    return { optionsMap: map, enrichedOptions: enriched };
  }, [options]);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const s = q.toLowerCase();
    // ⚡ Bolt Optimization: Use pre-calculated lowercase content
    return enrichedOptions.filter(o => o._search.includes(s));
  }, [q, options, enrichedOptions]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return;
      const target = e.target as Node | null;
      if (target && !boxRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextBtn = listRef.current?.children[index + 1]?.querySelector('button');
      if (nextBtn instanceof HTMLElement) nextBtn.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevBtn = listRef.current?.children[index - 1]?.querySelector('button');
      if (prevBtn instanceof HTMLElement) {
        prevBtn.focus();
      } else {
        // Return to search input
        boxRef.current?.querySelector('input')?.focus();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      boxRef.current?.querySelector('button')?.focus();
    }
  };

  // ⚡ Bolt Optimization: O(1) lookup via Map
  const currentLabel = optionsMap.get(value) || value || '';

  const dropdownStyle = useMemo(() => {
    if (!open || !boxRef.current || !useFixedPositioning) return undefined;
    const rect = boxRef.current.getBoundingClientRect();
    return {
      width: rect.width,
      left: rect.left,
      top: rect.bottom + 4,
    };
  }, [open, useFixedPositioning]);

  return (
    <div className="relative min-w-0" ref={boxRef}>
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <button
        type="button"
        className={`input input-bordered w-full flex items-center justify-between whitespace-nowrap overflow-hidden cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/70 focus-visible:outline-none ${
          small ? 'input-sm' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setOpen(s => !s)}
        onKeyDown={e => {
          if (disabled) return;
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={currentLabel || placeholder}
        disabled={disabled}
      >
        <span className={`truncate ${!value ? 'text-base-content/50' : ''}`}>
          {currentLabel || placeholder || t('select')}
        </span>
        <Icon
          name="chevron-down"
          className="ml-2 h-4 w-4 opacity-60 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {required && !value && (
        <span className="sr-only" aria-live="polite">
          required
        </span>
      )}

      {open && !disabled && (
        <div
          className={`${
            useFixedPositioning ? 'fixed' : 'absolute'
          } z-[1000] mt-1 w-full rounded-xl border border-base-300 bg-base-100 shadow-xl animate-fadeIn`}
          style={dropdownStyle}
        >
          <div className="p-2 border-b border-base-200">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon
                  name="search"
                  className="h-4 w-4 opacity-60 group-focus-within:text-primary group-focus-within:opacity-100 transition-all"
                />
              </div>
              <input
                autoFocus
                className="input input-bordered w-full pl-9 pr-10 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder={t('typeToSearch')}
                aria-label={t('typeToSearch')}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    // Return focus to the trigger button
                    boxRef.current?.querySelector('button')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    // Move focus to the first item in the list
                    const firstBtn = listRef.current?.querySelector('button');
                    if (firstBtn instanceof HTMLElement) firstBtn.focus();
                  } else if (e.key === 'Enter' && filtered.length > 0) {
                    e.preventDefault();
                    // Quick select the first result
                    onChange(filtered[0].value);
                    setOpen(false);
                    setQ('');
                  }
                }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/50 hover:text-error transition-colors"
                  aria-label={t('clearSearch')}
                  title={t('clearSearch')}
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 && (
              <li role="none" className="p-3 text-base-content/60 text-sm text-center">
                {t('noData')}
              </li>
            )}
            {filtered.map((opt, idx) => (
              <li key={`ss-${opt.value}`} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={`w-full text-left px-3 py-2 hover:bg-base-200 transition-colors flex items-center justify-between gap-2 ${
                    opt.value === value ? 'bg-base-200 font-semibold text-primary' : ''
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQ('');
                    // 🎨 Palette Improvement: Return focus to trigger button
                    boxRef.current?.querySelector('button')?.focus();
                  }}
                  onKeyDown={e => handleOptionKeyDown(e, idx)}
                  title={opt.label}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-sm">{opt.label}</div>
                    {opt.label !== opt.value && (
                      <div className="text-[10px] opacity-70 truncate uppercase tracking-wider">
                        {opt.value}
                      </div>
                    )}
                  </div>
                  {opt.value === value && (
                    <Icon name="check" className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const SearchSelect = React.memo(SearchSelectInner);
SearchSelect.displayName = 'SearchSelect';
