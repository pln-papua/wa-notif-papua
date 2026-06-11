export interface Aset {
  id: number;
  apktcode: string;      // 42.KOTA1.F01.Z01
  up3: string;           // NABIRE
  ulp: string;           // NABIRE KOTA
  aset: string;          // FEEDER / ZONA / SECTION
  nama: string;          // FEEDER MERBAU
  feeder: string;        // MERBAU
  zona: string | null;   // 1, 2
  section: string | null; // 1, MNV1
  beban: string | null;  // kW
  pelanggan: string | null;
}
