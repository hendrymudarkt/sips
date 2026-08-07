import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSections, fetchGangs } from '@/utils/services/masterDataService';
import { fetchBusinessUnits } from '@/utils/services/businessUnitService';

export function useCascadingPicker(selFcba?: string, selSection?: string) {
  const { data: businessUnits, isLoading: isLoadingBU } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => fetchBusinessUnits(),
    staleTime: 30 * 60 * 1000,
  });

  const fcbaOptions = useMemo(() => {
    if (!businessUnits) return [];
    const result: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();
    for (const b of businessUnits) {
      const bc = b as Record<string, string>;
      const code = bc.fcba || bc.fccode;
      if (code && !seen.has(code)) {
        seen.add(code);
        result.push({ value: code, label: code });
      }
    }
    return result;
  }, [businessUnits]);

  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: ['sections', selFcba],
    queryFn: () => fetchSections({ fcba: selFcba }),
    enabled: !!selFcba,
    staleTime: 30 * 60 * 1000,
  });

  const sectionOptions = useMemo(() => {
    if (!sections) return [];
    return sections.map(s => ({
      value: s.fccode,
      label: s.fcname && s.fcname !== s.fccode ? `${s.fccode} - ${s.fcname}` : s.fccode,
    }));
  }, [sections]);

  const { data: gangs, isLoading: isLoadingGangs } = useQuery({
    queryKey: ['gangs', selFcba, selSection],
    queryFn: () => fetchGangs({ fcba: selFcba, afdeling: selSection }),
    enabled: !!selFcba && !!selSection,
    staleTime: 30 * 60 * 1000,
  });

  const gangOptions = useMemo(() => {
    if (!gangs) return [];
    return gangs.map(g => ({
      value: g.fccode,
      label: g.fcname && g.fcname !== g.fccode ? `${g.fccode} - ${g.fcname}` : g.fccode,
    }));
  }, [gangs]);

  const kemandoranOptions = useMemo(() => {
    if (!gangs) return [];
    const result: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();
    for (const g of gangs) {
      const k = (g as Record<string, string>).kemandoran;
      if (k && k.startsWith('MD') && !seen.has(k)) {
        seen.add(k);
        result.push({ value: k, label: k });
      }
    }
    return result;
  }, [gangs]);

  return {
    isLoadingBU,
    fcbaOptions,
    isLoadingSections,
    sectionOptions,
    isLoadingGangs,
    gangOptions,
    kemandoranOptions,
    businessUnits,
  };
}
