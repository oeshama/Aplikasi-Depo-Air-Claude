import { PengaturanDepo } from './types';

// Target penjualan dashboard owner: omzet (Rp), volume galon (galon), dan volume liter, per periode.
export type JenisTarget = 'omzet' | 'galon' | 'liter';
export type PeriodeTarget = 'harian' | 'mingguan' | 'bulanan' | 'tahunan';

export const PERIODE_TARGET: { id: PeriodeTarget; label: string }[] = [
  { id: 'harian', label: 'Harian' },
  { id: 'mingguan', label: 'Mingguan (7 hari terakhir)' },
  { id: 'bulanan', label: 'Bulanan' },
  { id: 'tahunan', label: 'Tahunan' },
];

export const LITER_PER_GALON = 19;

const BAWAAN: Record<'omzet' | 'galon', Record<PeriodeTarget, number>> = {
  omzet: { harian: 500000, mingguan: 3500000, bulanan: 15000000, tahunan: 180000000 },
  galon: { harian: 50, mingguan: 350, bulanan: 1500, tahunan: 18000 },
};

function kunci(jenis: JenisTarget, periode: PeriodeTarget): keyof PengaturanDepo {
  return `target_${jenis}_${periode}` as keyof PengaturanDepo;
}

// Target yang berlaku. Target liter yang belum diisi dihitung dari target galon x 19 liter.
export function ambilTarget(p: PengaturanDepo, jenis: JenisTarget, periode: PeriodeTarget): number {
  const tersimpan = p[kunci(jenis, periode)] as number | undefined;
  if (typeof tersimpan === 'number' && tersimpan >= 0) return tersimpan;
  if (jenis === 'liter') return ambilTarget(p, 'galon', periode) * LITER_PER_GALON;
  return BAWAAN[jenis][periode];
}

export function aturTarget(p: PengaturanDepo, jenis: JenisTarget, periode: PeriodeTarget, nilai: number): PengaturanDepo {
  return { ...p, [kunci(jenis, periode)]: Math.max(0, Number(nilai) || 0) };
}

// Persen capaian apa adanya (boleh lebih dari 100); 0 bila target belum diisi
export function persenCapaian(total: number, target: number): number {
  return target > 0 ? Math.round((total / target) * 100) : 0;
}
