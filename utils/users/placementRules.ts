/**
 * Aturan penempatan user berdasarkan jabatan (dipakai form Add, Edit, dan Bulk Add).
 * `ALL` disimpan apa adanya sebagai nilai field; scoping di web menormalkannya jadi tanpa batas.
 */

export const PLACEMENT_ALL = 'ALL';
/** Opsi ID Karyawan untuk jabatan yang tidak wajib punya ID; tidak dikirim ke backend. */
export const PLACEMENT_STAFF = 'STAFF';

type ValueOption = { value: string; label: string };

export type PlacementRules = {
  /** FCBA boleh berisi ALL */
  fcbaAll: boolean;
  /** Afdeling boleh berisi ALL */
  afdelingAll: boolean;
  /** Gang boleh berisi ALL */
  gangAll: boolean;
  /** Gang wajib diisi */
  gangRequired: boolean;
  /** ID Karyawan wajib diisi */
  idRequired: boolean;
  /** ID Karyawan boleh dipilih STAFF (artinya tanpa ID) */
  staffIdAllowed?: boolean;
  /** Bila ada, gang hanya boleh berawalan salah satu prefix ini */
  gangPrefixes?: string[];
};

const NO_RULES: PlacementRules = {
  fcbaAll: false,
  afdelingAll: false,
  gangAll: false,
  gangRequired: false,
  idRequired: false,
};

const RULES: Record<string, PlacementRules> = {
  BOD: {
    fcbaAll: true,
    afdelingAll: true,
    gangAll: true,
    gangRequired: false,
    idRequired: false,
    staffIdAllowed: true,
  },
  ADMIN: {
    fcbaAll: true,
    afdelingAll: true,
    gangAll: true,
    gangRequired: false,
    idRequired: false,
    staffIdAllowed: true,
  },
  EM: {
    fcbaAll: false,
    afdelingAll: true,
    gangAll: true,
    gangRequired: false,
    idRequired: false,
    staffIdAllowed: true,
  },
  KASIE: {
    fcbaAll: false,
    afdelingAll: true,
    gangAll: true,
    gangRequired: false,
    idRequired: false,
    staffIdAllowed: true,
  },
  ASISTEN: {
    fcbaAll: false,
    afdelingAll: false,
    gangAll: true,
    gangRequired: false,
    idRequired: false,
    staffIdAllowed: true,
  },
  MANDOR1: {
    fcbaAll: false,
    afdelingAll: false,
    gangAll: true,
    gangRequired: true,
    idRequired: true,
  },
  'KR.AFDELING': {
    fcbaAll: false,
    afdelingAll: false,
    gangAll: true,
    gangRequired: true,
    idRequired: true,
  },
  'KR.TRANS': {
    fcbaAll: false,
    afdelingAll: false,
    gangAll: false,
    gangRequired: true,
    idRequired: true,
    gangPrefixes: ['MT', 'TM'],
  },
  'KR.PANEN': {
    fcbaAll: false,
    afdelingAll: false,
    gangAll: false,
    gangRequired: true,
    idRequired: true,
    gangPrefixes: ['MD'],
  },
  'MD.PANEN': {
    fcbaAll: false,
    afdelingAll: false,
    gangAll: false,
    gangRequired: true,
    idRequired: true,
    gangPrefixes: ['MD'],
  },
};

/** Jabatan -> level user yang dikirim ke backend. */
export const POSITION_TO_LEVEL: Record<string, string> = {
  EM: 'MGR',
  KASIE: 'KSI',
  ASISTEN: 'AST',
  MANDOR1: 'MD1',
  'MD.PANEN': 'MDP',
  'KR.PANEN': 'KRP',
  'KR.TRANS': 'KRT',
  'KR.AFDELING': 'KRA',
  BOD: 'BOD',
  ADMIN: 'ADM',
};

export function getPlacementRules(position?: string): PlacementRules {
  return RULES[(position || '').trim().toUpperCase()] || NO_RULES;
}

export function isAllValue(value?: string | null): boolean {
  return (value || '').trim().toUpperCase() === PLACEMENT_ALL;
}

export function isStaffId(value?: string | null): boolean {
  return (value || '').trim().toUpperCase() === PLACEMENT_STAFF;
}

/** STAFF berarti tanpa ID karyawan; kosongkan sebelum dikirim ke backend. */
export function normalizeEmployeeId(value?: string | null): string {
  const id = (value || '').trim();
  return isStaffId(id) ? '' : id;
}

export function gangMatchesPosition(gangcode: string, rules: PlacementRules): boolean {
  if (!rules.gangPrefixes?.length) return true;
  const code = gangcode.trim().toUpperCase();
  return rules.gangPrefixes.some(prefix => code.startsWith(prefix));
}

export function withAllOption(
  options: ValueOption[],
  allowed: boolean,
  allLabel = PLACEMENT_ALL
): ValueOption[] {
  return allowed ? [{ value: PLACEMENT_ALL, label: allLabel }, ...options] : options;
}

export function filterGangsByPosition(
  options: ValueOption[],
  rules: PlacementRules
): ValueOption[] {
  if (!rules.gangPrefixes?.length) return options;
  return options.filter(o => gangMatchesPosition(o.value, rules));
}

/**
 * Saat jabatan berganti: buang nilai ALL yang tidak lagi diizinkan, gang yang
 * tidak cocok prefix jabatan baru, dan STAFF bila jabatan baru wajib ID.
 * Mengembalikan empat field sekaligus agar reset berantai (FCBA -> Afdeling ->
 * Gang) tetap konsisten.
 */
export function getPositionChangePatch(
  current: { fcba?: string; afdeling?: string; gangcode?: string; idkaryawan?: string },
  nextPosition: string
): { fcba: string; afdeling: string; gangcode: string; idkaryawan: string } {
  const rules = getPlacementRules(nextPosition);
  const next = {
    fcba: current.fcba || '',
    afdeling: current.afdeling || '',
    gangcode: current.gangcode || '',
    idkaryawan: current.idkaryawan || '',
  };

  if (isAllValue(next.fcba) && !rules.fcbaAll) {
    next.fcba = '';
    next.afdeling = '';
    next.gangcode = '';
  }
  if (isAllValue(next.afdeling) && !rules.afdelingAll) {
    next.afdeling = '';
    next.gangcode = '';
  }
  if (next.gangcode) {
    if (isAllValue(next.gangcode)) {
      if (!rules.gangAll) next.gangcode = '';
    } else if (!gangMatchesPosition(next.gangcode, rules)) {
      next.gangcode = '';
    }
  }
  if (isStaffId(next.idkaryawan) && !rules.staffIdAllowed) next.idkaryawan = '';

  return next;
}

/**
 * Isi FCBA/Afdeling/Gang dari karyawan terpilih. Gang hanya diisi bila cocok
 * dengan jabatan; khusus KR.TRANS, kode karyawan `TMxxx` dipetakan ke gang
 * master `MTxxx` bila ada supaya opsi MT tetap terpakai.
 */
export function getEmployeePlacementPatch(
  employee: {
    fccode?: unknown;
    fcba?: unknown;
    sectionname?: unknown;
    gangcode?: unknown;
  },
  position: string,
  gangOptions: ValueOption[],
  options: { fcbaLocked?: boolean } = {}
): { idkaryawan: string; fcba?: string; afdeling?: string; gangcode: string } {
  const rules = getPlacementRules(position);
  const code = String(employee.fccode ?? '').trim();
  const empFcba = String(employee.fcba ?? '').trim();
  const empSection = String(employee.sectionname ?? '').trim();
  const empGang = String(employee.gangcode ?? '')
    .trim()
    .toUpperCase();

  const patch: { idkaryawan: string; fcba?: string; afdeling?: string; gangcode: string } = {
    idkaryawan: code,
    gangcode: '',
  };

  if (empFcba && !options.fcbaLocked) patch.fcba = empFcba;
  if (empSection) patch.afdeling = empSection;

  if (empGang) {
    if (!rules.gangPrefixes?.length) {
      patch.gangcode = empGang;
    } else if (rules.gangPrefixes[0] === 'MT') {
      // Karyawan transport tercatat dengan gang TMxxx; master gang memakai MTxxx.
      const mtCode = `MT${empGang.slice(2)}`;
      if (
        empGang.startsWith('TM') &&
        (gangOptions.length === 0 || gangOptions.some(o => o.value === mtCode))
      ) {
        patch.gangcode = mtCode;
      } else if (gangMatchesPosition(empGang, rules)) {
        patch.gangcode = empGang;
      }
    } else if (gangMatchesPosition(empGang, rules)) {
      patch.gangcode = empGang;
    }
  }

  return patch;
}

/** Field penempatan yang wajib belum terisi, atau null bila valid. */
export function getPlacementError(value: {
  position?: string;
  gangcode?: string;
  idkaryawan?: string;
}): 'gang' | 'id' | null {
  const rules = getPlacementRules(value.position);
  if (rules.gangRequired && !(value.gangcode || '').trim()) return 'gang';
  if (rules.idRequired && !normalizeEmployeeId(value.idkaryawan)) return 'id';
  return null;
}
