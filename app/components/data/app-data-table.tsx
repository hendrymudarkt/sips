'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
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

  const pinWidth = useCallback(
    (col: TableColumn<T>, w: number): TableColumn<T> => ({
      ...col,
      width: `${w}px`,
      grow: 0,
      style: { ...col.style, flexGrow: 0, minWidth: `${w}px`, maxWidth: `${w}px` },
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

  return (
    <div
      ref={wrapRef}
      className="rounded-lg border border-base-200 shadow-sm overflow-x-auto bg-base-100 animate-slideUp [animation-delay:200ms]"
      data-tour="data-table"
    >
      <div className="min-w-[900px] md:min-w-0">
        {loading ? (
          <div className="p-8">
            <SkeletonTable rows={10} />
          </div>
        ) : (
          <DataTable
            keyField={keyField}
            columns={fittedColumns}
            data={data}
            resizable={resizable}
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
        .rdt_TableHead .rdt_columnText {
          white-space: normal;
          overflow-wrap: break-word;
          text-overflow: clip;
        }
      `}</style>
    </div>
  );
}