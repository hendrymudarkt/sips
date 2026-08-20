export const QueryKeys = {
  ATTENDANCE: (filters?: Record<string, string>) =>
    ['attendance', filters].filter(Boolean) as unknown as string[],
  ATTENDANCE_DETAIL: (id: string) => ['attendance', id],
  HARVEST: (filters?: Record<string, string>) =>
    ['harvest', filters].filter(Boolean) as unknown as string[],
  HARVEST_DOCUMENT_NO: (
    tanggal?: string,
    fcba?: string,
    afdeling?: string,
    fieldcode?: string,
    noancak?: string,
    kemandoran?: string
  ) =>
    ['harvest-document-no', tanggal, fcba, afdeling, fieldcode, noancak, kemandoran].filter(
      Boolean
    ) as unknown as string[],
  TRANSPORT: (filters?: Record<string, string>) =>
    ['pengangkutan', filters].filter(Boolean) as unknown as string[],
  VEHICLE_RENTS: (filters?: Record<string, string>) =>
    ['vehicle-rents', filters].filter(Boolean) as unknown as string[],
  CONTRACTS: (tanggal?: string, fcba?: string) =>
    ['contracts', tanggal, fcba].filter(Boolean) as unknown as string[],
  USERS: (filters?: Record<string, string>) =>
    ['sips-users', filters].filter(Boolean) as unknown as string[],
  BUSINESS_UNITS: () => ['businessUnits'],
  MASTER_SECTIONS: (fcbaCode?: string) =>
    ['masterSections', fcbaCode].filter(Boolean) as unknown as string[],
  MASTER_GANGS: (fcba?: string, section?: string) =>
    ['masterGangs', fcba, section].filter(Boolean) as unknown as string[],
  EMPLOYEES: (userLevel?: string, fcba?: string, section?: string) =>
    ['employees', userLevel, fcba, section].filter(Boolean) as unknown as string[],
  TRIPLETS: () => ['triplets'],
  USER_PROFILE: () => ['userProfile'],
  HARVESTING: (filters?: Record<string, string>) =>
    ['harvesting', filters].filter(Boolean) as unknown as string[],
  PENGANGKUTANS: (filters?: Record<string, string>) =>
    ['pengangkutans', filters].filter(Boolean) as unknown as string[],
  KERANI_OPTIONS: (fcba?: string) =>
    ['kerani-options', fcba].filter(Boolean) as unknown as string[],
  SIPS_KENDARAAN: () => ['sips-kendaraan'],
  TPH_FIELDCODES: (fcba?: string, section?: string) =>
    ['tph-fieldcodes', fcba, section].filter(Boolean) as unknown as string[],
  TPH_DETAIL: (fcba?: string, section?: string, fieldCode?: string) =>
    ['tph-detail', fcba, section, fieldCode].filter(Boolean) as unknown as string[],
  EMPLOYEES_ABSENSI: (tanggal?: string) =>
    ['employees-absensi', tanggal].filter(Boolean) as unknown as string[],
};
