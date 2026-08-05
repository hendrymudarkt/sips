'use client';

type BadgeStyle = 'warning' | 'success' | 'error' | 'ghost' | 'neutral' | 'outline' | 'primary' | 'secondary' | 'info';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  status: string | null | undefined;
  label?: string;
  mapping?: Record<string, BadgeStyle>;
  defaultStyle?: BadgeStyle;
  size?: BadgeSize;
}

const defaultMapping: Record<string, BadgeStyle> = {
  planned: 'warning',
  approved: 'success',
  rejected: 'error',
  reject: 'error',
  Y: 'success',
  N: 'error',
};

const sizeMap: Record<BadgeSize, string> = {
  xs: 'badge-xs',
  sm: 'badge-sm',
  md: '',
  lg: 'badge-lg',
};

export function StatusBadge({
  status,
  label,
  mapping,
  defaultStyle = 'ghost',
  size = 'sm',
}: StatusBadgeProps) {
  const map = mapping ?? defaultMapping;
  const key = status ?? '';
  const style = map[key.toLowerCase()] ?? defaultStyle;
  const sizeClass = sizeMap[size];
  return <span className={`badge badge-${style}${sizeClass ? ` ${sizeClass}` : ''}`}>{label ?? key}</span>;
}
