'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Option } from '@/app/components/ui/search-select';
import { useCascadingPicker } from '@/hooks/useCascadingPicker';
import { fetchEmployees, type EmployeeMaster } from '@/utils/services/masterDataService';
import {
  PLACEMENT_ALL,
  PLACEMENT_STAFF,
  filterGangsByPosition,
  getPlacementRules,
  isAllValue,
  withAllOption,
} from '@/utils/users/placementRules';

/**
 * Opsi FCBA/Afdeling/Gang/ID Karyawan untuk satu jabatan.
 * `ALL` hanya muncul pada field yang diizinkan jabatan tersebut.
 */
export function useUserPlacementOptions(
  position: string,
  fcba: string,
  afdeling: string,
  allLabel: string = PLACEMENT_ALL
) {
  const rules = useMemo(() => getPlacementRules(position), [position]);
  const realFcba = isAllValue(fcba) ? '' : fcba;
  const realAfdeling = isAllValue(afdeling) ? '' : afdeling;

  const { fcbaOptions, sectionOptions, gangOptions } = useCascadingPicker(realFcba, realAfdeling);

  // Karyawan diambil sesuai scope user (bukan scope FCBA/Afdeling) supaya ID bisa
  // dipilih lebih dulu, lalu FCBA/Afdeling/Gang terisi otomatis dari data karyawan.
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'placement'],
    queryFn: () => fetchEmployees(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { employeeMap, idOptions } = useMemo(() => {
    const map = new Map<string, EmployeeMaster>();
    for (const employee of employees) {
      const code = String(employee.fccode ?? '').trim();
      if (code && !map.has(code)) map.set(code, employee);
    }
    const options: Option[] = Array.from(map.values())
      .map(employee => {
        const code = String(employee.fccode).trim();
        const name = String(employee.fcname ?? '').trim();
        // Nama jadi label utama; kode tampil sebagai baris kedua di dropdown.
        return { value: code, label: name || code };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
    // Jabatan yang tidak wajib ID boleh memilih STAFF (tanpa ID karyawan).
    const withStaff: Option[] = rules.staffIdAllowed
      ? [{ value: PLACEMENT_STAFF, label: PLACEMENT_STAFF }, ...options]
      : options;
    return { employeeMap: map, idOptions: withStaff };
  }, [employees, rules.staffIdAllowed]);

  const filteredSectionOptions = useMemo(() => {
    if (rules.afdelingAll) return withAllOption(sectionOptions, true, allLabel);
    return realFcba ? sectionOptions : [];
  }, [allLabel, realFcba, rules.afdelingAll, sectionOptions]);

  const filteredGangOptions = useMemo(() => {
    const base = realAfdeling ? filterGangsByPosition(gangOptions, rules) : [];
    return withAllOption(base, rules.gangAll, allLabel);
  }, [allLabel, gangOptions, realAfdeling, rules]);

  return {
    rules,
    fcbaOptions: withAllOption(fcbaOptions, rules.fcbaAll, allLabel),
    sectionOptions: filteredSectionOptions,
    gangOptions: filteredGangOptions,
    idOptions,
    employeeMap,
  };
}
