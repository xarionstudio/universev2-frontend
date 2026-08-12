/* Data karyawan (master) + kompetensi alat berat per operator — dari API */

export type Komp = { cls: string; simper: string; exp: string };

export type Employee = {
  name: string;
  nik: string;
  dept: string;
  pos: string;
  simper: string;
  simperExp: string;
  status: "aktif" | "cuti" | "nonaktif";
  company: string;
  equip: string;
  join: string;
  exp: string;
  license: string;
  mcu: string;
  medis: string;
  blood: string;
  bpjs: string;
  mess: string;
  kamar: string;
  hp: string;
  emg: string;
  komp?: Komp[];
  /* URL foto karyawan (mis. "/foto/503264133.jpg"). Belum ada aset foto di
     repo ini, jadi nilainya kosong dan UI otomatis jatuh ke avatar inisial —
     begitu foto asli tersedia, cukup isi field ini tanpa ubah komponen. */
  foto?: string;
  /* Field tambahan dari API backend */
  mcuExp?: string;
  ind?: string;
  birth?: string;
  religion?: string;
  marital?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyName?: string;
  emergencyRel?: string;
  emergencyPhone?: string;
};
