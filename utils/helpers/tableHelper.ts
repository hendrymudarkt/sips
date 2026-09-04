import { TableStyles } from 'react-data-table-component';

/**
 * Sort-safe numeric selector: returns a finite number for numeric input so
 * columns sort by value ('9' < '10'), or '-' when missing so display and
 * null-handling stay unchanged.
 */
export const numOrDash = (value: string | number | null | undefined): number | string => {
  if (value == null) return '-';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '-';
  const s = value.trim();
  if (!s) return '-';
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : '-';
};

export const centerHeaderStyle: TableStyles = {
  headCells: {
    style: {
      justifyContent: 'center',
      textAlign: 'center',
    },
  },
};
