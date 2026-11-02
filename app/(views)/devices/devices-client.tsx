'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { TableColumn } from 'react-data-table-component';
import toast from 'react-hot-toast';
import { AppDataTable } from '@/app/components/data/app-data-table';
import AppTour, { type TourStep } from '@/app/components/feedback/app-tour';
import { Icon } from '@/app/components/ui/icons';
import { PageLayout } from '@/app/components/ui/page-layout';
import { QuickSearch } from '@/app/components/ui/quick-search';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { Toolbar } from '@/app/components/ui/toolbar';
import { getCsrfToken } from '@/lib/auth/fetchWithCsrf';
import { isUnauthenticatedJson, logoutAndRedirect } from '@/utils/auth/authHelper';
import { QueryKeys } from '@/utils/queryKeys';
import { exportJsonToCsv } from '@/utils/services/exportCsv';

type DeviceStatus = 'active' | 'inactive' | 'suspended';

interface Device {
  id: number;
  device_id: string;
  mac_address: string | null;
  imei: string | null;
  device_name: string | null;
  platform: string | null;
  os_version: string | null;
  app_version: string | null;
  assigned_to: string | null;
  status: string;
  registered_at: string | null;
  last_login_at: string | null;
}

interface DevicePage {
  devices: Device[];
  pagination: {
    currentPage: number;
    lastPage: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

type StatusFilter = 'all' | DeviceStatus;

function isPendingStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === 'pending' || normalized === 'inactive';
}

function isStatusFilter(value: string): value is StatusFilter {
  return value === 'all' || value === 'active' || value === 'inactive' || value === 'suspended';
}

function isDevice(value: unknown): value is Device {
  if (typeof value !== 'object' || value === null) return false;
  const device = value as Record<string, unknown>;
  const nullableString = (value: unknown) => value === null || typeof value === 'string';
  return (
    typeof device.id === 'number' &&
    typeof device.device_id === 'string' &&
    typeof device.status === 'string' &&
    nullableString(device.mac_address) &&
    nullableString(device.imei) &&
    nullableString(device.device_name) &&
    nullableString(device.platform) &&
    nullableString(device.os_version) &&
    nullableString(device.app_version) &&
    nullableString(device.assigned_to) &&
    nullableString(device.registered_at) &&
    nullableString(device.last_login_at)
  );
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback;
  const data = body as Record<string, unknown>;
  return typeof data.error === 'string'
    ? data.error
    : typeof data.message === 'string'
      ? data.message
      : fallback;
}

export default function DevicesClient() {
  const t = useTranslations('Devices');
  const locale = useLocale() === 'en' ? 'en-US' : 'id-ID';
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const queryKey = QueryKeys.DEVICES(page, debouncedQuery);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<DevicePage> => {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedQuery) params.set('q', debouncedQuery);

      const response = await fetch(`/api/settings/devices?${params}`, {
        credentials: 'include',
      });
      const body: unknown = await response.json();

      if (response.status === 401 || isUnauthenticatedJson(body)) {
        await logoutAndRedirect();
        throw new Error(t('unauthenticated'));
      }
      if (!response.ok || typeof body !== 'object' || body === null) {
        throw new Error(getErrorMessage(body, t('loadError')));
      }

      const result = body as Record<string, unknown>;
      if (
        result.ok !== true ||
        !Array.isArray(result.devices) ||
        !result.devices.every(isDevice) ||
        typeof result.pagination !== 'object' ||
        result.pagination === null
      ) {
        throw new Error(t('loadError'));
      }

      const pagination = result.pagination as Record<string, unknown>;
      if (
        typeof pagination.currentPage !== 'number' ||
        typeof pagination.lastPage !== 'number' ||
        typeof pagination.total !== 'number'
      ) {
        throw new Error(t('loadError'));
      }

      return {
        devices: result.devices,
        pagination: {
          currentPage: pagination.currentPage,
          lastPage: pagination.lastPage,
          total: pagination.total,
          from: typeof pagination.from === 'number' ? pagination.from : null,
          to: typeof pagination.to === 'number' ? pagination.to : null,
        },
      };
    },
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: DeviceStatus }) => {
      const csrfToken = getCsrfToken();
      const response = await fetch(`/api/settings/devices/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': csrfToken ?? '',
        },
        body: JSON.stringify({ status }),
      });
      const body: unknown = await response.json();

      if (response.status === 401 || isUnauthenticatedJson(body)) {
        await logoutAndRedirect();
        throw new Error(t('unauthenticated'));
      }
      if (
        !response.ok ||
        typeof body !== 'object' ||
        body === null ||
        !('ok' in body) ||
        body.ok !== true
      ) {
        throw new Error(getErrorMessage(body, t('updateError')));
      }
      return status;
    },
    onSuccess: status => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success(t(status === 'active' ? 'accessEnabled' : 'accessRestricted'));
    },
    onError: (mutationError: Error) => toast.error(mutationError.message || t('updateError')),
  });

  const counts = useMemo(() => {
    const devices = data?.devices ?? [];
    return {
      inactive: devices.filter(device => isPendingStatus(device.status)).length,
      active: devices.filter(device => device.status.toLowerCase() === 'active').length,
      suspended: devices.filter(device => device.status.toLowerCase() === 'suspended').length,
    };
  }, [data?.devices]);

  const visibleDevices = useMemo(() => {
    if (!data) return [];
    if (statusFilter === 'all') return data.devices;
    if (statusFilter === 'inactive') {
      return data.devices.filter(device => isPendingStatus(device.status));
    }
    return data.devices.filter(device => device.status.toLowerCase() === statusFilter);
  }, [data, statusFilter]);

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return t('notAvailable');
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? t('notAvailable')
        : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    },
    [locale, t]
  );

  const statusLabel = useCallback(
    (status: string) => {
      const normalized = status.toLowerCase();
      if (isPendingStatus(normalized)) return t('pending');
      if (normalized === 'active') return t('active');
      if (normalized === 'suspended') return t('suspended');
      return status;
    },
    [t]
  );

  const actionFor = useCallback(
    (
      device: Device
    ): { status: DeviceStatus; label: string; icon: 'check' | 'lock' | 'lock-open' } | null => {
      const normalized = device.status.toLowerCase();
      if (isPendingStatus(normalized))
        return { status: 'active', label: t('activate'), icon: 'check' };
      if (normalized === 'active')
        return { status: 'suspended', label: t('suspend'), icon: 'lock' };
      if (normalized === 'suspended')
        return { status: 'active', label: t('reactivate'), icon: 'lock-open' };
      return null;
    },
    [t]
  );

  const changeStatus = useCallback(
    (device: Device) => {
      const action = actionFor(device);
      if (!action || statusMutation.isPending) return;
      if (
        action.status === 'suspended' &&
        !window.confirm(t('suspendConfirm', { device: device.device_id }))
      ) {
        return;
      }
      statusMutation.mutate({ id: device.id, status: action.status });
    },
    [actionFor, statusMutation, t]
  );

  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        icon: '🔎',
        title: t('tourSearchTitle'),
        content: t('tourSearchDesc'),
        targetSelector: '[data-tour="quick-search"]',
      },
      {
        icon: '📋',
        title: t('tourFilterTitle'),
        content: t('tourFilterDesc'),
        targetSelector: '[data-tour="device-status-filter"]',
      },
      {
        icon: '🔐',
        title: t('tourActionsTitle'),
        content: t('tourActionsDesc'),
        targetSelector: '[data-tour="data-table"]',
        modalPosition: 'top',
      },
    ],
    [t]
  );

  const handleExport = useCallback(() => {
    if (visibleDevices.length === 0) {
      toast.error(t('noData'));
      return;
    }

    const dataToExport = visibleDevices.map(device => ({
      [t('device')]: device.device_name || device.device_id,
      [t('deviceId')]: device.device_id,
      [t('assignedTo')]: device.assigned_to || '-',
      [t('status')]: statusLabel(device.status),
      [t('platform')]: device.platform || '-',
      [t('osVersion')]: device.os_version || '-',
      [t('appVersion')]: device.app_version || '-',
      [t('macAddress')]: device.mac_address || '-',
      IMEI: device.imei || '-',
      [t('registeredAt')]: device.registered_at || '-',
      [t('lastLogin')]: device.last_login_at || '-',
    }));

    exportJsonToCsv(dataToExport, `Devices_${new Date().toISOString().slice(0, 10)}.csv`);
  }, [visibleDevices, statusLabel, t]);

  const filters: { value: StatusFilter; label: string; count?: number }[] = [
    { value: 'all', label: t('all'), count: data?.devices.length ?? 0 },
    { value: 'inactive', label: t('pending'), count: counts.inactive },
    { value: 'active', label: t('active'), count: counts.active },
    { value: 'suspended', label: t('suspended'), count: counts.suspended },
  ];

  const columns = useMemo<TableColumn<Device>[]>(
    () => [
      {
        name: t('actions'),
        width: '150px',
        cell: device => {
          const action = actionFor(device);
          if (!action) return <span className="text-base-content/50">-</span>;
          const isUpdating = statusMutation.isPending && statusMutation.variables?.id === device.id;

          return (
            <button
              type="button"
              className={`btn btn-xs ${action.status === 'active' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => changeStatus(device)}
              disabled={statusMutation.isPending}
              title={action.label}
              aria-label={`${action.label}: ${device.device_id}`}
            >
              {isUpdating ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Icon name={action.icon} className="h-4 w-4" />
              )}
              {action.label}
            </button>
          );
        },
        ignoreRowClick: true,
      },
      {
        name: t('device'),
        selector: device => device.device_name || device.device_id,
        sortable: true,
        width: '200px',
        cell: device => (
          <div className="min-w-0 py-1">
            <span
              className="block truncate font-medium"
              title={device.device_name || device.device_id}
            >
              {device.device_name || device.device_id}
            </span>
            <span className="block truncate text-xs text-base-content/60" title={device.device_id}>
              {device.device_id}
            </span>
          </div>
        ),
      },
      {
        name: t('assignedTo'),
        selector: device => device.assigned_to || '-',
        sortable: true,
        width: '160px',
      },
      {
        name: t('status'),
        selector: device => device.status,
        sortable: true,
        width: '150px',
        cell: device => (
          <StatusBadge
            status={device.status}
            label={statusLabel(device.status)}
            mapping={{
              active: 'success',
              inactive: 'warning',
              pending: 'warning',
              suspended: 'error',
            }}
          />
        ),
      },
      {
        name: t('platform'),
        selector: device => [device.platform, device.os_version].filter(Boolean).join(' · ') || '-',
        sortable: true,
        width: '150px',
      },
      {
        name: t('appVersion'),
        selector: device => device.app_version || '-',
        sortable: true,
        width: '120px',
      },
      {
        name: t('deviceIdentifiers'),
        selector: device => device.mac_address || device.imei || '-',
        width: '190px',
        cell: device => (
          <div className="py-1 text-sm">
            <span className="block truncate">{device.mac_address || '-'}</span>
            <span className="block truncate text-xs text-base-content/60">
              {device.imei || '-'}
            </span>
          </div>
        ),
      },
      {
        name: t('registeredAt'),
        selector: device => device.registered_at || '',
        sortable: true,
        width: '180px',
        cell: device => formatDate(device.registered_at),
      },
      {
        name: t('lastLogin'),
        selector: device => device.last_login_at || '',
        sortable: true,
        width: '180px',
        cell: device => formatDate(device.last_login_at),
      },
    ],
    [
      t,
      statusMutation.isPending,
      statusMutation.variables,
      actionFor,
      statusLabel,
      changeStatus,
      formatDate,
    ]
  );

  return (
    <PageLayout>
      <Toolbar
        title={t('title')}
        actions={[
          {
            key: 'filter',
            label: showFilters ? t('hideFilters') : t('showFilters'),
            icon: 'filter',
            onClick: () => setShowFilters(current => !current),
            variant: 'outline',
            tour: 'filter-button',
          },
          {
            key: 'refresh',
            label: isFetching ? t('refreshing') : t('refresh'),
            icon: 'refresh',
            onClick: () => void refetch(),
            disabled: isFetching,
            loading: isFetching,
            variant: 'outline',
          },
          {
            key: 'export',
            label: t('export'),
            icon: 'export',
            onClick: handleExport,
            disabled: visibleDevices.length === 0,
            variant: 'outline',
          },
        ]}
      >
        <AppTour
          steps={tourSteps}
          storageKey="tour-devices"
          onStepChange={stepIndex => {
            if (stepIndex === 1) setShowFilters(true);
          }}
          btnClassName="join-item flex-1 sm:flex-none"
        />
      </Toolbar>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        {showFilters && (
          <select
            className="select select-bordered w-full sm:w-auto"
            value={statusFilter}
            onChange={event => {
              const value = event.target.value;
              if (isStatusFilter(value)) setStatusFilter(value);
            }}
            aria-label={t('filterStatus')}
            data-tour="device-status-filter"
          >
            {filters.map(filter => (
              <option key={filter.value} value={filter.value}>
                {filter.label} ({filter.count ?? 0})
              </option>
            ))}
          </select>
        )}
        <QuickSearch
          value={query}
          onChange={setQuery}
          placeholder={t('searchPlaceholder')}
          className="w-full sm:ml-auto sm:w-72 sm:shrink-0"
        />
      </div>

      <div className="mb-2 flex flex-col gap-1 text-sm text-base-content/65 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {t('showing', {
            from: data?.pagination.from ?? 0,
            to: data?.pagination.to ?? 0,
            total: data?.pagination.total ?? 0,
          })}
        </p>
        <p>{t('pageCountNote')}</p>
      </div>

      {error ? (
        <div role="alert" className="alert alert-error mb-3">
          <span>{error.message || t('loadError')}</span>
          <button type="button" className="btn btn-sm" onClick={() => void refetch()}>
            {t('tryAgain')}
          </button>
        </div>
      ) : (
        <AppDataTable
          columns={columns}
          data={visibleDevices}
          loading={isLoading || isFetching}
          pagination={false}
          namespace="Devices"
          onClearSearch={query ? () => setQuery('') : undefined}
          pointerOnHover
          fixedHeaderScrollHeight="520px"
        />
      )}

      {data && data.pagination.lastPage > 1 && (
        <nav className="mt-3 flex justify-end" aria-label={t('pagination')}>
          <div className="join">
            <button
              type="button"
              className="btn btn-sm join-item"
              onClick={() => setPage(current => Math.max(1, current - 1))}
              disabled={page <= 1 || isFetching}
            >
              {t('previous')}
            </button>
            <span className="btn btn-sm join-item pointer-events-none">
              {t('page', {
                current: data.pagination.currentPage,
                total: data.pagination.lastPage,
              })}
            </span>
            <button
              type="button"
              className="btn btn-sm join-item"
              onClick={() => setPage(current => Math.min(data.pagination.lastPage, current + 1))}
              disabled={page >= data.pagination.lastPage || isFetching}
            >
              {t('next')}
            </button>
          </div>
        </nav>
      )}
    </PageLayout>
  );
}
