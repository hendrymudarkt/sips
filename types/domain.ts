export type Absensi = {
  _rowKey?: string;
  _displayDate?: string;
  _dateOnly?: string;
  _searchContent?: string;
  _mandorLabel?: string;
  _mandorCode?: string;
  _mandorName?: string;
  _karyawanLabel?: string;
  _karyawanCode?: string;
  _karyawanName?: string;
  _timeInDisplay?: string;
  _timeOutDisplay?: string;
  id: string;
  tanggal: string;
  kemandoran: string;
  kode_karyawan_mandor?: string | null;
  kode_karyawan: string;
  time_in?: string | null;
  time_out?: string | null;
  location_in?: string | null;
  location_out?: string | null;
  pengancakan?: string | null;
  total_late_time?: string | null;
  go_home_early?: string | null;
  attendance_type: 'REGULAR' | 'ASSISTENSI';
  attendance: 'KJ' | 'WH' | 'WS' | 'MK' | 'ML' | 'P1' | 'KB' | 'OT';
  exception_case?: string | null;
  no_ba_exca?: string | null;
  fcba?: string | null;
  section?: string | null;
  gang?: string | null;
  fcba_destination?: string | null;
  section_destination?: string | null;
  id_device?: string | null;
  mac_address?: string | null;
  images?: string | null;
  status_attendance?: string | null;
  mandays?: number | string | null;
  namakaryawan?: string | null;
};

export type FormState = {
  id?: string;
  tanggal: string;
  kemandoran: string;
  kode_karyawan_mandor: string;
  kode_karyawan: string;
  time_in: string;
  time_out: string;
  location_in: string;
  location_out: string;
  pengancakan: string;
  total_late_time: string;
  go_home_early: string;
  attendance_type: 'REGULAR' | 'ASSISTENSI';
  attendance: 'KJ' | 'WH' | 'WS' | 'MK' | 'ML' | 'P1' | 'KB' | 'OT';
  exception_case: string;
  no_ba_exca: string;
  no_ba_exca_file?: File | undefined;
  fcba: string;
  section: string;
  gang: string;
  fcba_destination: string;
  section_destination: string;
  id_device: string;
  mac_address: string;
  images: File | undefined;
  mandays: string;
};

export const initialForm: FormState = {
  id: undefined,
  tanggal: '',
  kemandoran: '',
  kode_karyawan_mandor: '',
  kode_karyawan: '',
  time_in: '',
  time_out: '',
  location_in: '',
  location_out: '',
  pengancakan: '',
  total_late_time: '',
  go_home_early: '',
  attendance_type: 'REGULAR',
  attendance: 'KJ',
  exception_case: '',
  no_ba_exca: '',
  no_ba_exca_file: undefined,
  fcba: '',
  section: '',
  gang: '',
  fcba_destination: '',
  section_destination: '',
  id_device: '',
  mac_address: '',
  images: undefined,
  mandays: '0',
};

export type Filters = Partial<{
  tanggal: string;
  tanggal_end: string;
  kemandoran: string;
  kode_karyawan_mandor: string;
  kode_karyawan: string;
  fcba: string;
  afdeling: string;
  gang: string;
  attendance: string;
  status_attendance: string;
  attendance_type: string;
  fcba_destination: string;
  section_destination: string;
}>;

export type Triplet = { fcba: string; sectionname: string; gangcode: string };

export type Employee = {
  fccode: string;
  fullname?: string;
  fcba?: string;
  sectionname?: string;
  gangcode?: string;
  noancak?: string;
};

export type EmployeesApiRow = {
  [key: string]: unknown;
  fccode?: unknown;
  fcname?: unknown;
  fcba?: unknown;
  sectionname?: unknown;
  gangcode?: unknown;
};

export type Harvest = {
  _rowKey?: string;
  _index?: number;
  _searchContent?: string;
  _outputNum?: number;
  _mentahNum?: number;
  _overNum?: number;
  _busukNum?: number;
  _busuk2Num?: number;
  _kecilNum?: number;
  _partenoNum?: number;
  _parteno50Num?: number;
  _brondolNum?: number;
  _panjangNum?: number;

  id: string;
  nodokumen: string;
  tanggal: string;
  kode_karyawan_mandor1?: string | null;
  nama_karyawan_mandor1?: string | null;
  kode_karyawan_mandor_panen?: string | null;
  nama_karyawan_mandor_panen?: string | null;
  kode_karyawan_kerani?: string | null;
  nama_karyawan_kerani?: string | null;
  kode_karyawan: string;
  nama_karyawan: string;
  noancak: string;
  tph: string;
  fieldcode: string;
  fcba: string;
  afdeling: string;
  output: string;
  mentah: string;
  overripe: string;
  busuk: string;
  busuk2: string;
  buahkecil: string;
  brondol: string;
  alasbrondol: string;
  tangkaipanjang: string;
  parteno: string;
  parteno50plus: string;
  status_assistensi?: string | null;
  status_harvesting: string;
  kemandoran?: string | null;
  images?: string | null;
  no_ba_exca?: string | null;
  exception_case?: string | null;
  id_device?: string | null;
  location?: string | null;
  card_id?: string | null;
  created_at?: string | null;
  created_by?: string | null;
};

export type HarvestFormState = {
  id?: string;
  nodokumen: string;
  tanggal: string;
  kode_karyawan_mandor1: string;
  kode_karyawan_mandor_panen: string;
  kode_karyawan_kerani: string;
  kode_karyawan: string;
  noancak: string;
  tph: string;
  fieldcode: string;
  fcba: string;
  afdeling: string;
  output: string;
  mentah: string;
  overripe: string;
  busuk: string;
  busuk2: string;
  buahkecil: string;
  brondol: string;
  alasbrondol: string;
  tangkaipanjang: string;
  parteno: string;
  parteno50plus: string;
  status_assistensi: string;
  status_harvesting: string;
  kemandoran: string;
  exception_case: string;
  location: string;
  id_device: string;
  card_id: string;
  images: File | null;
  no_ba_exca: File | string | null;
};

export const initialHarvestForm: HarvestFormState = {
  nodokumen: '',
  tanggal: '',
  kode_karyawan_mandor1: '',
  kode_karyawan_mandor_panen: '',
  kode_karyawan_kerani: '',
  kode_karyawan: '',
  noancak: '',
  tph: '',
  fieldcode: '',
  fcba: '',
  afdeling: '',
  output: '',
  mentah: '0',
  overripe: '0',
  busuk: '0',
  busuk2: '0',
  buahkecil: '0',
  brondol: '0',
  alasbrondol: '',
  tangkaipanjang: '0',
  parteno: '0',
  parteno50plus: '0',
  status_assistensi: '',
  status_harvesting: 'Planned',
  kemandoran: '',
  exception_case: '',
  location: '',
  id_device: '',
  card_id: '',
  images: null,
  no_ba_exca: null,
};

export type HarvestFilters = Partial<{
  tanggal: string;
  tanggal_end: string;
  nodokumen: string;
  kode_karyawan: string;
  fcba: string;
  afdeling: string;
  tph: string;
  fieldcode: string;
  kemandoran: string;
}>;

export type Transport = {
  _rowKey?: string;
  _displayDate?: string;
  _searchContent?: string;
  _outputNum?: number;
  _janjangnormalNum?: number;
  _mentahNum?: number;
  _abnormalNum?: number;
  _totaljanjangNum?: number;
  _brondolanNum?: number;
  _typeLabel?: string;
  id: string;
  nopengangkutan: string;
  nospb?: string | null;
  nodokumen?: string | null;
  tanggal?: string | null;
  kode_karyawan_kerani?: string | null;
  nama_karyawan_kerani?: string | null;
  kode_karyawan_driver?: string | null;
  nama_karyawan_driver?: string | null;
  tkbm1?: string | null;
  nama_tkbm1?: string | null;
  tkbm2?: string | null;
  nama_tkbm2?: string | null;
  tkbm3?: string | null;
  nama_tkbm3?: string | null;
  tkbm4?: string | null;
  nama_tkbm4?: string | null;
  tkbm5?: string | null;
  nama_tkbm5?: string | null;
  type_pengangkutan?: number | string | null;
  kode_kendaraan?: string | null;
  nama_kendaraan?: string | null;
  fcba?: string | null;
  pabrik_tujuan?: string | null;
  afdeling?: string | null;
  tph?: string | null;
  fieldcode?: string | null;
  fcba_destination?: string | null;
  afdeling_destination?: string | null;
  etd?: string | null;
  eta?: string | null;
  totaljanjang?: string | null;
  output?: string | null;
  janjangnormal?: string | null;
  brondolan?: string | null;
  mentah?: string | null;
  abnormal?: string | null;
  status_pengangkutan?: string | null;
  card_id?: string | null;
  flag?: string | null;
  exception_case?: string | null;
  images?: string | null;
  no_ba_exca?: string | null;
  registrationno?: string | null;
};

export type TransportFormState = {
  id: string;
  nopengangkutan: string;
  nospb: string;
  nodokumen: string;
  tanggal: string;
  kode_karyawan_kerani: string;
  kode_karyawan_driver: string;
  tkbm1: string;
  tkbm2: string;
  tkbm3: string;
  tkbm4: string;
  tkbm5: string;
  type_pengangkutan: string;
  kode_kendaraan: string;
  tph: string;
  fieldcode: string;
  fcba: string;
  afdeling: string;
  fcba_destination: string;
  afdeling_destination: string;
  pabrik_tujuan: string;
  totaljanjang: string;
  output: string;
  janjangnormal: string;
  brondolan: string;
  mentah: string;
  abnormal: string;
  etd: string;
  card_id: string;
  flag: string;
  exception_case: string;
};

export const initialTransportForm: TransportFormState = {
  id: '',
  nopengangkutan: '',
  nospb: '',
  nodokumen: '',
  tanggal: '',
  kode_karyawan_kerani: '',
  kode_karyawan_driver: '',
  tkbm1: '',
  tkbm2: '',
  tkbm3: '',
  tkbm4: '',
  tkbm5: '',
  type_pengangkutan: '',
  kode_kendaraan: '',
  tph: '',
  fieldcode: '',
  fcba: '',
  afdeling: '',
  fcba_destination: '',
  afdeling_destination: '',
  pabrik_tujuan: '',
  totaljanjang: '0',
  output: '0',
  janjangnormal: '0',
  brondolan: '0',
  mentah: '0',
  abnormal: '0',
  etd: '',
  card_id: '',
  flag: '',
  exception_case: '',
};

export type TransportFilters = Partial<{
  tanggal: string;
  tanggal_end: string;
  nopengangkutan: string;
  nospb: string;
  nodokumen: string;
  kode_karyawan_kerani: string;
  kode_karyawan_driver: string;
  type_pengangkutan: string;
  kode_kendaraan: string;
  fcba: string;
  pabrik_tujuan: string;
  afdeling: string;
  tph: string;
  fieldcode: string;
  status_pengangkutan: string;
  kemandoran: string;
  flag: string;
}>;

export type DeleteTarget = {
  id: string;
  nopengangkutan: string;
};

export type UserStatus = 'Y' | 'N';

export type SipsUser = {
  id: number;
  username?: string;
  fullname?: string;
  email?: string;
  phone?: string;
  fcba?: string;
  afdeling?: string;
  gangcode?: string;
  level?: string;
  position?: string;
  idkaryawan?: string;
  photo?: string;
  status?: UserStatus;
  _search?: string;
};

export type UserFormState = {
  username: string;
  fullname: string;
  email: string;
  phone: string;
  password: string;
  fcba: string;
  afdeling: string;
  gangcode: string;
  level: string;
  position: string;
  idkaryawan: string;
};

export const initialUserForm: UserFormState = {
  username: '',
  fullname: '',
  email: '',
  phone: '',
  password: '',
  fcba: '',
  afdeling: '',
  gangcode: '',
  level: '',
  position: '',
  idkaryawan: '',
};

export type UserFilters = Partial<{
  fcba: string;
  afdeling: string;
  gangcode: string;
  level: string;
  position: string;
}>;
