'use client';

import { useState, forwardRef, useImperativeHandle, useCallback, memo } from 'react';
import { PhotoCell } from '@/app/components/ui/photo-cell';
import { EmptyState } from '@/app/components/feedback/empty-state';
import { getProxiedImageUrl } from '@/utils/helpers/imageHelper';
import { buildWhatsAppUrl, buildMailtoUrl } from '@/utils/helpers/contactLinks';
import { Icon, type IconName } from '@/app/components/ui/icons';
import { useTranslations } from 'next-intl';
import { isSafeHref } from '@/lib/utils/inputSanitizer';
import { StatusBadge } from '@/app/components/ui/status-badge';
import type { SipsUser } from '@/types/domain';

interface UsersGalleryViewProps {
  items: SipsUser[];
  onClearSearch?: () => void;
}

export type UsersGalleryHandle = {
  expandAll: () => void;
  collapseAll: () => void;
};

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
            target={href.startsWith('mailto:') ? undefined : '_blank'}
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

const UserCard = memo(function UserCard({
  item,
  index,
  isExpanded,
  onToggle,
}: {
  item: SipsUser;
  index: number;
  isExpanded: boolean;
  onToggle: (id: string | number) => void;
}) {
  const t = useTranslations('Users');

  const title = item.fullname || item.username || '-';
  const subtitle = item.position && item.level ? `${item.position} · ${item.level}` : (item.position || item.level || '-');

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
        aria-label={title}
        title={title}
      >
        <div className="p-3 flex gap-3 items-start">
          <div className="shrink-0 w-5 pt-1">
            <span className="text-xs font-mono text-base-content/40">{index + 1}</span>
          </div>
          <div className="shrink-0">
            <PhotoCell
              imageUrl={item.photo}
              href={item.photo ? getProxiedImageUrl(item.photo) : undefined}
              size={72}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate" title={title}>
              {title}
            </div>
            <div className="text-xs text-base-content/60 truncate">
              {item.username || '-'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-xs badge-ghost">{subtitle}</span>
              <StatusBadge
                status={item.status}
                label={item.status === 'Y' ? t('active') : t('inactive')}
              />
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
            <ItemRow label={t('username')} value={item.username} />
            <ItemRow
              label={t('email')}
              value={item.email}
              href={item.email && isSafeHref(buildMailtoUrl(item.email)) ? buildMailtoUrl(item.email) : undefined}
            />
            <ItemRow
              label={t('phone')}
              value={item.phone}
              href={item.phone ? buildWhatsAppUrl(item.phone) : undefined}
            />
            <ItemRow label="FCBA" value={item.fcba} />
            <ItemRow label={t('afdeling')} value={item.afdeling} />
            <ItemRow label={t('gangcode')} value={item.gangcode} />
            <ItemRow label={t('level')} value={item.level} />
            <ItemRow label={t('position')} value={item.position} />
            <ItemRow label={t('idkaryawan')} value={item.idkaryawan} />
          </div>
        </div>
      )}
    </div>
  );
});

export const UsersGalleryView = forwardRef<UsersGalleryHandle, UsersGalleryViewProps>(
  function UsersGalleryView({ items, onClearSearch }, ref) {
    const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());

    useImperativeHandle(ref, () => ({
      expandAll: () => setExpandedIds(new Set(items.map(item => item.id))),
      collapseAll: () => setExpandedIds(new Set()),
    }), [items]);

    const toggleExpand = useCallback((id: string | number) => {
      setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    if (items.length === 0) {
      return <EmptyState namespace="Users" onClearSearch={onClearSearch} />;
    }

    return (
      <div>
        <div className="text-sm text-base-content/60 mb-3 px-1">
          Menampilkan <span className="font-semibold">{items.length}</span> data
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
          {items.map((item, index) => (
            <UserCard
              key={item.id}
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
