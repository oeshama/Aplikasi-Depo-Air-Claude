// Nomor HP Indonesia: 0812-3456-7890, +62 812 3456 7890, dan 62812... disamakan menjadi 62812...
// Mengembalikan null kalau bentuknya tidak masuk akal.
export function normalisasiHp(mentah: string): string | null {
  let d = (mentah || '').replace(/\D/g, '');
  if (d.startsWith('620')) d = '62' + d.slice(3);
  else if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^62\d{8,13}$/.test(d) ? d : null;
}

// Tampilan lokal: 62812... menjadi 0812...
export function hpLokal(hp: string): string {
  return hp.startsWith('62') ? '0' + hp.slice(2) : hp;
}

export function linkWa(hp: string, teks: string): string {
  return `https://wa.me/${hp}?text=${encodeURIComponent(teks)}`;
}
