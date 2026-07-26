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
    const seen = new Set<string>();
    return businessUnits
      .filter(b => {
        const bc = b as Record<string, string>;
        const code = bc.fcba || bc.fccode;
        if (!code || seen.has(code)) return false;
        seen.add(code);
        return true;
      })
      .map(b => {
        const bc = b as Record<string, string>;
        const code = bc.fcba || bc.fccode;
        return { value: code, label: code };
      });
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
    const seen = new Set<string>();
    return gangs
      .filter(g => (g as Record<string, string>).kemandoran?.startsWith('MD'))
      .filter(g => {
        const k = (g as Record<string, string>).kemandoran;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map(g => ({ value: (g as Record<string, string>).kemandoran, label: (g as Record<string, string>).kemandoran }));
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
