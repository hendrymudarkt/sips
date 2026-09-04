'use client';

import { Icon, type IconName } from '@/app/components/ui/icons';

export interface ToolbarAction {
  key: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  tour?: string;
  variant?: 'primary' | 'outline' | 'ghost';
}

export interface ToolbarProps {
  title: string;
  titleTooltip?: string;
  actions: ToolbarAction[];
  tour?: string;
  children?: React.ReactNode;
}

export function Toolbar({ title, titleTooltip, actions, tour, children }: ToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between animate-slideUp">
      <h1
        className="text-2xl sm:text-3xl font-bold min-w-0 truncate"
        title={titleTooltip}
      >
        {title}
      </h1>
      <div className="flex flex-row flex-wrap w-full lg:w-auto justify-start lg:justify-end join" data-tour={tour ?? 'action-buttons'}>
        {children}
        {actions.map(action => {
          const variantClass = action.variant === 'primary'
            ? 'btn-primary'
            : action.variant === 'ghost'
              ? 'btn-ghost'
              : 'btn-outline';
          return (
            <button
              key={action.key}
              className={`btn flex-1 lg:flex-none min-w-0 whitespace-nowrap ${variantClass} btn-sm join-item${action.loading ? ' btn-disabled' : ''}${action.disabled ? ' btn-disabled' : ''}`}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              data-tour={action.tour}
              title={action.label}
              aria-label={action.icon ? action.label : undefined}
            >
              {action.loading ? (
                <><span className="loading loading-spinner loading-xs" /><span className="hidden sm:inline">{action.label}</span></>
              ) : (
                <>
                  {action.icon && <Icon name={action.icon as IconName} className="h-4 w-4" />}
                  <span className="hidden sm:inline">{action.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
