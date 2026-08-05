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
    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 items-start animate-slideUp">
      <h1
        className="text-2xl sm:text-3xl font-bold min-w-0 truncate"
        title={titleTooltip}
      >
        {title}
      </h1>
      <div className="flex flex-row justify-start sm:justify-end flex-wrap w-full sm:w-auto join" data-tour={tour ?? 'action-buttons'}>
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
              className={`btn flex-1 sm:flex-none ${variantClass} btn-sm join-item focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none${action.loading ? ' btn-disabled' : ''}${action.disabled ? ' btn-disabled' : ''}`}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              data-tour={action.tour}
              title={action.label}
              aria-label={action.label}
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
