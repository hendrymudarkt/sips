'use client';

import { useState, forwardRef, useImperativeHandle, useCallback, memo } from 'react';
import { PhotoCell } from '@/app/components/ui/photo-cell';
import { EmptyState } from '@/app/components/feedback/empty-state';
import { getProxiedImageUrl } from '@/utils/helpers/imageHelper';
import { buildMapUrl } from '@/utils/services/mapHelper';
import { Icon, type IconName } from '@/app/components/ui/icons';
import { useTranslations } from 'next-intl';
import { isSafeHref } from '@/lib/utils/inputSanitizer';


type HarvestItem = {
  _rowKey?: string;
  _displayDate?: string;
  _outputNum?: number;
  _brondolNum?: number;
  _outputPgknNum?: number;
  _sisaPgknNum?: number;
  _tinggalNum?: number;

  id: string;
  nodokumen: string;
  tanggal: string;
  kode_karyawan: string;
  nama_karyawan: string;
  noancak: string;
  tph: string;
  fieldcode: string;
  fcba: string;
  afdeling: string;
  output: string;
  mentah: string;
  overripe: string;
  busuk: string;
  busuk2: string;
  buahkecil: string;
  brondol: string;
  alasbrondol: string;
  tangkaipanjang: string;
  parteno: string;
  parteno50plus: string;
  status_harvesting: string;
  kemandoran?: string | null;
  images?: string | null;
  no_ba_exca?: string | null;
  exception_case?: string | null;
  id_device?: string | null;
  location?: string | null;
  card_id?: string | null;
  status_assistensi?: string | null;
  kode_karyawan_mandor1?: string | null;
  nama_karyawan_mandor1?: string | null;
  kode_karyawan_mandor_panen?: string | null;
  nama_karyawan_mandor_panen?: string | null;
  kode_karyawan_kerani?: string | null;
  nama_karyawan_kerani?: string | null;
  status_pengangkutan?: string | null;
  info_status_pengangkutan?: string | null;
  sisa_pgkn?: string | null;
  output_pgkn?: string | null;
  tinggal?: string | null;
};

interface HarvestGalleryViewProps {
  items: HarvestItem[];
  onClearSearch?: () => void;
}

export type HarvestGalleryHandle = {
  expandAll: () => void;
  collapseAll: () => void;
};

/**
 * ⚡ Bolt Optimization: ItemRow component.
 * Wrapped in React.memo and uses primitive props to avoid redundant re-renders.
 */
const ItemRow = memo(function ItemRow({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value?: string | number | null;
  href?: string;
  icon?: IconName;
}) {
  if (!href && (!value || value === '-' || value === '')) return null;
  const displayValue = value ?? '-';

  return (
    <div className="flex justify-between gap-2 text-sm py-1 border-b border-base-200 last:border-0">
      <span className="text-base-content/60 shrink-0">{label}</span>
      <span className="text-right font-medium break-all">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary text-xs flex items-center gap-1 justify-end"
          >
            {icon && <Icon name={icon} className="h-4 w-4 inline" />}
            {displayValue}
          </a>
        ) : (
          displayValue
        )}
      </span>
    </div>
  );
});

/**
 * ⚡ Bolt Optimization: HarvestCard component.
 * 1. Wrapped in React.memo to prevent unnecessary re-renders of all list items
 *    when the expansion state of a single item changes.
 * 2. Uses primitive props and pre-calculated fields where possible.
 */
const HarvestCard = memo(function HarvestCard({
  item,
  index,
  isExpanded,
  onToggle,
}: {
  item: HarvestItem;
  index: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const t = useTranslations('Harvest');

  const statusColor =
    (item.status_harvesting || '').toLowerCase() === 'planned'
      ? 'badge-warning'
      : (item.status_harvesting || '').toLowerCase() === 'approved'
        ? 'badge-success'
        : (item.status_harvesting || '').toLowerCase() === 'reject'
          ? 'badge-error'
          : 'badge-ghost';

  const pengangkutanColor =
    (item.status_pengangkutan || '').toLowerCase() === 'selisih'
      ? 'badge-warning'
      : (item.status_pengangkutan || '').toLowerCase() === 'terangkut'
        ? 'badge-success'
        : (item.status_pengangkutan || '').toLowerCase() === 'belum'
          ? 'badge-error'
          : 'badge-ghost';
  const pengangkutanText = item.info_status_pengangkutan || item.status_pengangkutan || '-';

  const dateOnly = item._displayDate || (item.tanggal || '').split(' ')[0];
  const timeOnly = (item.tanggal || '').includes(' ')
    ? (item.tanggal.split(' ')[1] || '').slice(0, 8)
    : '';

  return (
    <div
      className={`card bg-base-100 border border-base-300 shadow-sm transition-all duration-200 ${
        isExpanded ? 'shadow-md' : 'hover:shadow-md'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        className="w-full text-left focus:outline-none"
        aria-expanded={isExpanded}
        aria-label={item.nama_karyawan || item.kode_karyawan}
        title={item.nama_karyawan || item.kode_karyawan}
      >
        <div className="p-3 flex gap-3 items-start">
          <div className="shrink-0 w-5 pt-1">
            <span className="text-xs font-mono text-base-content/40">{index + 1}</span>
          </div>
          <div className="shrink-0">
            <PhotoCell
              imageUrl={item.images}
              href={item.images ? getProxiedImageUrl(item.images) : undefined}
              size={72}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate" title={item.nama_karyawan}>
              {item.nama_karyawan}
            </div>
            <div className="text-xs text-base-content/60 truncate">{item.kode_karyawan}</div>
            <div className="text-xs text-base-content/70 mt-0.5">{dateOnly}{timeOnly ? ` · ${timeOnly}` : ''}</div>
            <div className="text-xs text-base-content/70 mt-0.5">
              Kemandoran: <strong>{item.kemandoran || '-'}</strong>
            </div>
            <div className="text-xs text-base-content/70">
              Field: <strong>{item.fieldcode || '-'}</strong> &middot; TPH:{' '}
              <strong>{item.tph || '-'}</strong>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge badge-xs ${statusColor}`}>
                {item.status_harvesting || '-'}
              </span>
              {(item.info_status_pengangkutan || item.status_pengangkutan) && (
                <span className={`badge badge-xs ${pengangkutanColor}`} title={pengangkutanText}>
                  {pengangkutanText || '-'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-base-content/70">
              <span>
                Output: <strong>{item.output || '-'}</strong>
              </span>
              <span>
                Tinggal: <strong>{item._tinggalNum != null ? item._tinggalNum : '-'}</strong>
              </span>
              <span>
                Terangkut: <strong>{item._outputPgknNum != null ? item._outputPgknNum : '-'}</strong>
              </span>
              <span>
                Sisa: <strong>{item._sisaPgknNum != null ? item._sisaPgknNum : '-'}</strong>
              </span>
              <span>
                Brondol: <strong>{item.brondol || '-'}</strong>
              </span>
            </div>
          </div>

          <div className="shrink-0 pt-1">
            <Icon
              name="chevron-down"
              className={`h-4 w-4 text-base-content/40 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-base-200 animate-fadeIn">
          <div className="grid grid-cols-2 gap-x-3 pt-2">
            <ItemRow label={t('colKemandoran')} value={item.kemandoran} />
            <ItemRow
              label="Kerani"
              value={item.nama_karyawan_kerani || item.kode_karyawan_kerani || '-'}
            />
            <ItemRow label={t('colFcba')} value={item.fcba} />
            <ItemRow label={t('colAfd')} value={item.afdeling} />
            <ItemRow label={t('colTph')} value={item.tph} />
            <ItemRow label={t('colField')} value={item.fieldcode} />
            <ItemRow label="No Ancak" value={item.noancak} />
            <ItemRow label={t('colOutput')} value={item.output} />
            <ItemRow label={t('colMentah')} value={item.mentah} />
            <ItemRow label={t('colOver')} value={item.overripe} />
            <ItemRow label={t('colBusuk')} value={item.busuk} />
            <ItemRow label={t('colBusuk2')} value={item.busuk2} />
            <ItemRow label={t('colBuahKecil')} value={item.buahkecil} />
            <ItemRow label={t('colParteNo')} value={item.parteno} />
            <ItemRow label={t('colParteNo50')} value={item.parteno50plus} />
            <ItemRow label={t('colBrondol')} value={item.brondol} />
            <ItemRow label={t('colAlBrondol')} value={item.alasbrondol} />
            <ItemRow label={t('colTPanjang')} value={item.tangkaipanjang} />
            <div className="flex justify-between gap-2 text-sm py-1 border-b border-base-200 last:border-0">
              <span className="text-base-content/60 shrink-0">{t('colLokasi')}</span>
              <span className="text-right font-medium break-all flex items-center gap-1 justify-end">
                {item.location ? (
                  <>
                    <a
                      href={buildMapUrl(item.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-xs flex items-center gap-1"
                    >
                      <Icon name="globe" className="h-4 w-4 inline" />
                      GMaps
                    </a>
                    <a
                      href={`/gis?${new URLSearchParams({ dateFrom: (item.tanggal || '').split(' ')[0], dateTo: (item.tanggal || '').split(' ')[0], nodokumen: item.nodokumen || '' }).toString()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-info text-xs flex items-center gap-1"
                    >
                      <Icon name="globe" className="h-4 w-4 inline" />
                      Geo
                    </a>
                  </>
                ) : '-'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3">
            <ItemRow
              label="Mandor 1"
              value={item.nama_karyawan_mandor1 || item.kode_karyawan_mandor1}
            />
            <ItemRow
              label="Mandor Panen"
              value={item.nama_karyawan_mandor_panen || item.kode_karyawan_mandor_panen}
            />
            <ItemRow label={t('colExceptionCase')} value={item.exception_case} />
            <ItemRow
              label={t('colLampiran')}
              value={item.no_ba_exca ? '' : '-'}
              href={item.no_ba_exca && isSafeHref(item.no_ba_exca) ? item.no_ba_exca : undefined}
              icon="document-attach"
            />
            <ItemRow label="Device" value={item.id_device} />
          </div>
        </div>
      )}
    </div>
  );
});

export const HarvestGalleryView = forwardRef<HarvestGalleryHandle, HarvestGalleryViewProps>(
  function HarvestGalleryView({ items, onClearSearch }, ref) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    useImperativeHandle(ref, () => ({
      expandAll: () => setExpandedIds(new Set(items.map(item => item.id))),
      collapseAll: () => setExpandedIds(new Set()),
    }), [items]);

    const toggleExpand = useCallback((id: string) => {
      setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    if (items.length === 0) {
      return (
        <EmptyState namespace="Harvest" onClearSearch={onClearSearch} />
      );
    }

    return (
      <div>
        <div className="text-sm text-base-content/60 mb-3 px-1">
          Menampilkan <span className="font-semibold">{items.length}</span> data
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
          {items.map((item, index) => (
            <HarvestCard
              key={item._rowKey || item.id}
              item={item}
              index={index}
              isExpanded={expandedIds.has(item.id)}
              onToggle={toggleExpand}
            />
          ))}
        </div>
      </div>
    );
  }
);


