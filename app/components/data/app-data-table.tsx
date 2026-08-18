'use client';

import dynamic from 'next/dynamic';
import type { ReactElement } from 'react';
import type { TableProps } from 'react-data-table-component';
import { SkeletonTable } from '../ui/skeletons';
import { EmptyState } from '../feedback/empty-state';

type DataTableComponent = <T>(props: TableProps<T>) => ReactElement;

const DataTable = dynamic(() => import('react-data-table-component').then(mod => mod.default), {
  ssr: false,
  loading: () => <SkeletonTable rows={5} />,
}) as unknown as DataTableComponent;

interface AppDataTableProps<T> extends Partial<TableProps<T>> {
  columns: TableProps<T>['columns'];
  data: T[];
  loading?: boolean;
  namespace?: string;
  onClearSearch?: () => void;
  keyField?: keyof T & string;
}

export function AppDataTable<T>({
  columns,
  data,
  loading,
  namespace,
  onClearSearch,
  keyField = '_rowKey' as keyof T & string,
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
  return (
    <div className="rounded-lg border border-base-200 shadow-sm overflow-x-auto bg-base-100 animate-slideUp [animation-delay:200ms]" data-tour="data-table">
      <div className="min-w-[900px] md:min-w-0">
        {loading ? (
          <div className="p-8">
            <SkeletonTable rows={10} />
          </div>
        ) : (
          <DataTable
            keyField={keyField}
            columns={columns}
            data={data}
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
    </div>
  );
}
