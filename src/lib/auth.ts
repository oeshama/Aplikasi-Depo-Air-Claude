import { supabase, isSupabaseConfigured } from './supabase';
import { UserApp, UserRole } from './types';

// Login akun Supabase (email + password). Hanya aktif kalau NEXT_PUBLIC_LOGIN_AKUN=1 (dan Supabase terhubung).
// Selama belum dinyalakan, aplikasi memakai cara login lama sehingga tidak ada yang terkunci saat peralihan.
export const AUTH_AKTIF: boolean = process.env.NEXT_PUBLIC_LOGIN_AKUN === '1' && isSupabaseConfigured;

// Karyawan tanpa email boleh login dengan nama pengguna saja; aplikasi menambahkan domain khusus ini.
// example.com dicadangkan secara internasional dan tidak bisa didaftarkan siapa pun, jadi aman.
export const DOMAIN_LOGIN = 'depo.example.com';

const PERAN_VALID: UserRole[] = ['owner', 'admin', 'kasir', 'pengantar'];

export function emailDariMasukan(masukan: string): string {
  const m = (masukan || '').trim().toLowerCase().replace(/\s+/g, '');
  return m.includes('@') ? m : `${m}@${DOMAIN_LOGIN}`;
}

// Apakah ada sesi akun yang tersimpan di perangkat ini (tanpa perlu internet)
export function adaSesiAkun(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.startsWith('sb-') && k.endsWith('-auth-token') && localStorage.getItem(k)) return true;
    }
  } catch { /* abaikan */ }
  return false;
}

export type HasilMasuk = { ok: true; user: UserApp } | { ok: false; pesan: string };

export async function masukDenganAkun(masukan: string, password: string): Promise<HasilMasuk> {
  if (!supabase) return { ok: false, pesan: 'Aplikasi belum terhubung ke server.' };
  if (!masukan.trim()) return { ok: false, pesan: 'Isi email atau nama pengguna.' };
  if (!password) return { ok: false, pesan: 'Isi password.' };

  const email = emailDariMasukan(masukan);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const jaringan = !!error && /fetch|network|failed/i.test(error.message || '');
    return { ok: false, pesan: jaringan ? 'Tidak ada sambungan internet. Masuk butuh internet.' : 'Email/nama pengguna atau password salah.' };
  }

  const meta = (data.user.app_metadata || {}) as Record<string, unknown>;
  const peran = meta.role as UserRole;
  if (!PERAN_VALID.includes(peran)) {
    await supabase.auth.signOut();
    return { ok: false, pesan: 'Akun ini belum diberi peran. Hubungi owner.' };
  }
  const nama = typeof meta.nama === 'string' && meta.nama ? meta.nama : (data.user.email || 'Pengguna').split('@')[0];
  const id = typeof meta.karyawan_id === 'string' && meta.karyawan_id ? meta.karyawan_id : data.user.id;
  return { ok: true, user: { id, nama, username: data.user.email || email, role: peran, aktif: true } };
}

// Keluar dari akun (dijalankan di latar belakang; tidak menunggu internet)
function tokenLokal(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) return JSON.parse(localStorage.getItem(k) || 'null')?.access_token || null;
    }
  } catch { /* abaikan */ }
  return null;
}

export function keluarAkun(): void {
  if (!AUTH_AKTIF || !supabase) return;
  // HP ini tidak lagi menerima notifikasi untuk akun yang keluar (keepalive: tetap terkirim walau halaman berpindah)
  try {
    const ep = localStorage.getItem('depo_push_endpoint');
    const tok = tokenLokal();
    if (ep && tok) {
      fetch('/api/push/daftar', { method: 'DELETE', keepalive: true, headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}` }, body: JSON.stringify({ endpoint: ep }) }).catch(() => undefined);
      localStorage.removeItem('depo_push_endpoint');
    }
  } catch { /* abaikan */ }
  supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
}

export async function gantiPasswordSaya(baru: string): Promise<{ ok: boolean; pesan: string }> {
  if (!supabase) return { ok: false, pesan: 'Aplikasi belum terhubung ke server.' };
  if (baru.length < 8) return { ok: false, pesan: 'Password minimal 8 karakter.' };
  const { error } = await supabase.auth.updateUser({ password: baru });
  if (error) {
    const sama = /same|different/i.test(error.message || '');
    return { ok: false, pesan: sama ? 'Password baru harus berbeda dari yang lama.' : 'Gagal mengganti password. Pastikan ada internet, lalu coba lagi.' };
  }
  return { ok: true, pesan: 'Password berhasil diganti.' };
}
