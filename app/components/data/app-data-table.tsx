'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { TableColumn, TableProps } from 'react-data-table-component';
import { SkeletonTable } from '../ui/skeletons';
import { EmptyState } from '../feedback/empty-state';

type DataTableComponent = <T>(props: TableProps<T>) => ReactElement;

const DataTable = dynamic(() => import('react-data-table-component').then(mod => mod.default), {
  ssr: false,
  loading: () => <SkeletonTable rows={5} />,
}) as unknown as DataTableComponent;

const CHAR_W = 8;
const PAD = 36;
const MIN_W = 70;
const MAX_W = 320;

function textWidth(value: unknown): number {
  let units = 0;
  for (const ch of String(value ?? '')) {
    units += ch.charCodeAt(0) > 0xff ? 1.35 : 1;
  }
  return Math.ceil(units * CHAR_W) + PAD;
}

function nodeText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (node && typeof node === 'object' && 'props' in node) {
    const children = (node as { props?: { children?: unknown } }).props?.children;
    return Array.isArray(children) ? children.map(nodeText).join('') : nodeText(children);
  }
  return '';
}

const SCAN_LIMIT = 500;

function fitWidth<T>(col: TableColumn<T>, data: T[]): number {
  const headerW = textWidth(nodeText(col.name));
  let dataW = 0;
  for (const row of data.slice(0, SCAN_LIMIT)) {
    const w = textWidth(col.selector?.(row));
    if (w > dataW) dataW = w;
  }
  const sortBuffer = col.sortable ? 20 : 0;
  return Math.min(MAX_W, Math.max(MIN_W, Math.max(dataW, headerW) + sortBuffer));
}

interface AppDataTableProps<T> extends Partial<TableProps<T>> {
  columns: TableProps<T>['columns'];
  data: T[];
  loading?: boolean;
  namespace?: string;
  onClearSearch?: () => void;
  keyField?: keyof T & string;
  /** Size columns to their longest visible cell value and header title */
  autoFitColumns?: boolean;
  /** Allow dragging column header borders to resize, double-click a border to re-fit */
  resizable?: boolean;
  /** Render the sort arrow before the column title instead of after it */
  sortIconFirst?: boolean;
  /** Multi-column sort: Ctrl/Cmd+click on desktop, tap another header on touch */
  sortMulti?: boolean;
}

export function AppDataTable<T>({
  columns,
  data,
  loading,
  namespace,
  onClearSearch,
  keyField = '_rowKey' as keyof T & string,
  autoFitColumns = true,
  resizable = true,
  sortIconFirst = true,
  sortMulti = true,
  onSort,
  pagination = true,
  paginationPerPage = 100,
  paginationRowsPerPageOptions = [100, 500, 1000, 5000],
  dense = true,
  highlightOnHover = true,
  fixedHeader = true,
  fixedHeaderScrollHeight = '520px',
  persistTableHead = true,
  responsive = true,
  noDataComponent,
  progressPending,
  ...rest
}: AppDataTableProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [userWidths, setUserWidths] = useState<Record<number, number>>({});
  const dragRef = useRef<{ col: number; startX: number; startW: number } | null>(null);
  const [sortCols, setSortCols] = useState<{ name: ReactNode; dir: string }[]>([]);
  const [sortKey, setSortKey] = useState(0);

  const handleSort = useCallback(
    (...args: Parameters<NonNullable<TableProps<T>['onSort']>>) => {
      setSortCols((args[3] ?? []).map(s => ({ name: s.column.name, dir: String(s.sortDirection) })));
      onSort?.(...args);
    },
    [onSort]
  );

  const resetSort = useCallback(() => {
    setSortKey(k => k + 1);
    setSortCols([]);
  }, []);

  const pinWidth = useCallback(
    (col: TableColumn<T>, w: number): TableColumn<T> => ({
      ...col,
      width: `${w}px`,
      grow: 0,
      style: { ...col.style, flexGrow: 0, flexShrink: 0, minWidth: `${w}px`, maxWidth: `${w}px` },
    }),
    []
  );

  const fittedColumns = useMemo(() => {
    return columns.map((col, i) => {
      if (userWidths[i] != null) {
        return pinWidth(col, userWidths[i]);
      }
      if (!autoFitColumns) return col;
      if (col.cell || !col.selector) {
        const existing = parseFloat(String(col.width ?? col.style?.minWidth ?? '').replace(/px$/, '')) || MIN_W;
        return pinWidth(col, existing);
      }
      return pinWidth(col, fitWidth(col, data));
    });
  }, [columns, data, autoFitColumns, userWidths, pinWidth]);

  const colIndexFromTarget = useCallback((target: EventTarget | null): number | null => {
    const cell = (target as HTMLElement | null)?.closest?.('.rdt_TableCol') as HTMLElement | null;
    if (!cell?.parentElement) return null;
    const isBuiltIn = (el: HTMLElement) =>
      el.matches('.rdt_columnCheckbox, .rdt_columnExpander') ||
      el.querySelector('.rdt_columnCheckbox, .rdt_columnExpander');
    if (isBuiltIn(cell)) return null;
    const siblings = Array.from(cell.parentElement.children) as HTMLElement[];
    const raw = siblings.indexOf(cell);
    if (raw < 0) return null;
    const builtIn = siblings.slice(0, raw).filter(isBuiltIn).length;
    return raw - builtIn;
  }, []);

  /* Custom column resize: intercept rdtc's handle so widths flow through userWidths */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !resizable) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest?.('.rdt_resizeHandle')) return;
      e.preventDefault();
      e.stopPropagation();
      const col = colIndexFromTarget(target);
      const cell = target.closest('.rdt_TableCol') as HTMLElement | null;
      if (col == null || !cell) return;
      dragRef.current = { col, startX: e.clientX, startW: cell.getBoundingClientRect().width };

      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const w = Math.round(d.startW + (ev.clientX - d.startX));
        setUserWidths(prev => ({ ...prev, [d.col]: Math.max(MIN_W, w) }));
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    const onDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest?.('.rdt_resizeHandle')) return;
      const col = colIndexFromTarget(target);
      if (col == null) return;
      setUserWidths(prev => {
        const next = { ...prev };
        delete next[col];
        return next;
      });
    };

    wrap.addEventListener('pointerdown', onPointerDown, true);
    wrap.addEventListener('dblclick', onDoubleClick);
    return () => {
      wrap.removeEventListener('pointerdown', onPointerDown, true);
      wrap.removeEventListener('dblclick', onDoubleClick);
    };
  }, [resizable, colIndexFromTarget]);

  /* Touch multi-sort: Ctrl+tap is impossible on touch screens, so tapping
     another sortable header while a sort is active appends instead of replacing */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !sortMulti) return;
    if (!window.matchMedia?.('(pointer: coarse)').matches) return;
    let lastPointer = '';
    let skipSynthetic = false;
    const onPointerDown = (e: PointerEvent) => {
      lastPointer = e.pointerType;
    };
    const onClick = (e: MouseEvent) => {
      if (skipSynthetic || e.ctrlKey || e.metaKey) return;
      if (lastPointer !== 'touch') return;
      const target = e.target as HTMLElement;
      const header = target.closest?.('.rdt_columnSortableEnabled') as HTMLElement | null;
      if (!header || header.matches('.rdt_columnSortableActive')) return;
      if (!wrap.querySelector('.rdt_columnSortableActive')) return;
      e.preventDefault();
      e.stopPropagation();
      skipSynthetic = true;
      header.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
      window.setTimeout(() => {
        skipSynthetic = false;
      }, 0);
    };
    wrap.addEventListener('pointerdown', onPointerDown, true);
    wrap.addEventListener('click', onClick, true);
    return () => {
      wrap.removeEventListener('pointerdown', onPointerDown, true);
      wrap.removeEventListener('click', onClick, true);
    };
  }, [sortMulti]);

  return (
    <div
      ref={wrapRef}
      className={`rounded-lg border border-base-200 shadow-sm overflow-x-clip max-w-full bg-base-100 animate-slideUp [animation-delay:200ms]${sortIconFirst ? ' sort-icon-first' : ''}`}
      data-tour="data-table"
    >
      {sortCols.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 px-3 pt-2 text-xs" data-tour="sort-bar">
          <span className="opacity-60">Sort:</span>
          {sortCols.map((s, i) => (
            <span key={i} className="badge badge-sm badge-outline gap-1">
              {i + 1}. {s.name} {s.dir === 'asc' ? '↑' : '↓'}
            </span>
          ))}
          <button type="button" className="btn btn-xs btn-ghost" title="Reset sort" onClick={resetSort}>
            ✕
          </button>
        </div>
      )}
      <div className="min-w-0 max-w-full">
        {loading ? (
          <div className="p-8">
            <SkeletonTable rows={10} />
          </div>
        ) : (
          <DataTable
            key={`${sortKey}`}
            keyField={keyField}
            columns={fittedColumns}
            data={data}
            resizable={resizable}
            sortMulti={sortMulti}
            onSort={handleSort}
            pagination={pagination}
            paginationPerPage={paginationPerPage}
            paginationRowsPerPageOptions={paginationRowsPerPageOptions}
            dense={dense}
            highlightOnHover={highlightOnHover}
            fixedHeader={fixedHeader}
            fixedHeaderScrollHeight={fixedHeaderScrollHeight}
            persistTableHead={persistTableHead}
            responsive={responsive}
            noDataComponent={
              noDataComponent ?? (
                <EmptyState namespace={namespace ?? 'Attendance'} onClearSearch={onClearSearch} />
              )
            }
            progressPending={progressPending ?? loading}
            {...rest}
          />
        )}
      </div>
      <style jsx global>{`
        /* Single-scroller fix (mobile Android): the ONLY horizontal
           scroller must be RDTC's own .rdt_responsiveWrapperFixed viewport.
           The outer card never scrolls (overflow-x-clip above). Do NOT cap
           .rdt_table/.rdt_wrapper — they need the lib's min-width:fit-content
           so the table body stays wider than the viewport; capping them
           squeezes columns and blanks out the right side. */
        .rdt_responsiveWrapperFixed,
        .rdt_responsiveWrapperScroll {
          max-width: 100%;
        }
        .rdt_TableHead .rdt_columnText {
          white-space: normal;
          overflow-wrap: break-word;
          text-overflow: clip;
        }
        /* sort arrow hidden until the column is actively sorted, so it never reserves space */
        .sort-icon-first .rdt_columnSortable > span[aria-hidden='true']:not([class]),
        .sort-icon-first .rdt_columnSortable > .rdt_sortIcon {
          display: none;
        }
        .sort-icon-first .rdt_columnSortableActive > span[aria-hidden='true']:not([class]),
        .sort-icon-first .rdt_columnSortableActive > .rdt_sortIcon {
          display: inline-flex;
          order: -1;
          margin-left: 0 !important;
          margin-inline-end: 4px;
        }
      `}</style>
    </div>
  );
}