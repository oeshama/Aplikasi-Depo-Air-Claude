import { supabase } from './supabase';
import { AUTH_AKTIF } from './auth';

// Notifikasi push (sisi HP/browser). Hanya tersedia di mode login akun dan bila kunci publik VAPID sudah dipasang.
export const VAPID_PUBLIK = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
export const KUNCI_ENDPOINT = 'depo_push_endpoint';

export type StatusPush = 'tidak_didukung' | 'diblokir' | 'belum' | 'aktif';

export function pushDidukung(): boolean {
  return typeof window !== 'undefined' && AUTH_AKTIF && !!VAPID_PUBLIK
    && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function kunciKeBiner(b64: string): Uint8Array {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const baris = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(Array.from(baris).map(c => c.charCodeAt(0)));
}

async function tokenAkun(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function ambilRegistrasi(): Promise<ServiceWorkerRegistration> {
  const reg = (await navigator.serviceWorker.getRegistration('/')) || (await navigator.serviceWorker.register('/sw.js', { scope: '/' }));
  await navigator.serviceWorker.ready;
  return reg;
}

export async function statusPush(): Promise<StatusPush> {
  if (!pushDidukung()) return 'tidak_didukung';
  if (Notification.permission === 'denied') return 'diblokir';
  if (Notification.permission !== 'granted') return 'belum';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    return sub ? 'aktif' : 'belum';
  } catch { return 'belum'; }
}

async function daftarkan(sub: PushSubscription): Promise<boolean> {
  const token = await tokenAkun();
  if (!token) return false;
  const r = await fetch('/api/push/daftar', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: sub.toJSON() })
  }).catch(() => null);
  if (r && r.ok) { try { localStorage.setItem(KUNCI_ENDPOINT, sub.endpoint); } catch { /* abaikan */ } }
  return !!(r && r.ok);
}

// Dipanggil dari tombol (butuh ketukan pengguna untuk meminta izin)
export async function aktifkanPush(): Promise<{ ok: boolean; pesan: string }> {
  if (!pushDidukung()) return { ok: false, pesan: 'Perangkat atau peramban ini belum mendukung notifikasi.' };
  try {
    const izin = await Notification.requestPermission();
    if (izin !== 'granted') return { ok: false, pesan: 'Izin notifikasi tidak diberikan. Anda bisa mengizinkannya di pengaturan situs pada peramban.' };
    const reg = await ambilRegistrasi();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kunciKeBiner(VAPID_PUBLIK) as unknown as BufferSource });
    const ok = await daftarkan(sub);
    return ok ? { ok: true, pesan: 'Notifikasi aktif di HP ini.' } : { ok: false, pesan: 'Gagal mendaftarkan HP ke server. Pastikan ada internet, lalu coba lagi.' };
  } catch {
    return { ok: false, pesan: 'Gagal mengaktifkan notifikasi. Coba lagi.' };
  }
}

// Diam-diam memperbarui pendaftaran HP (mis. setelah ganti akun atau peran), hanya bila izin sudah diberikan
export async function segarkanPush(): Promise<void> {
  try {
    if (!pushDidukung() || Notification.permission !== 'granted') return;
    const reg = await ambilRegistrasi();
    const sub = await reg.pushManager.getSubscription();
    if (sub) await daftarkan(sub);
  } catch { /* abaikan */ }
}

export async function matikanPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const token = await tokenAkun();
    if (token) await fetch('/api/push/daftar', { method: 'DELETE', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
    await sub.unsubscribe();
    localStorage.removeItem(KUNCI_ENDPOINT);
  } catch { /* abaikan */ }
}

export async function kirimNotifikasiUji(): Promise<{ ok: boolean; pesan: string }> {
  try {
    const endpoint = localStorage.getItem(KUNCI_ENDPOINT);
    const token = await tokenAkun();
    if (!endpoint || !token) return { ok: false, pesan: 'HP ini belum terdaftar. Aktifkan notifikasi dulu.' };
    const r = await fetch('/api/push/kirim', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ jenis: 'uji', endpoint }) });
    const d = await r.json().catch(() => null);
    if (r.ok && d?.ok) return { ok: true, pesan: 'Notifikasi percobaan dikirim. Kalau tidak muncul dalam beberapa detik, periksa izin notifikasi dan penghemat baterai.' };
    return { ok: false, pesan: d?.pesan || 'Notifikasi percobaan gagal dikirim.' };
  } catch { return { ok: false, pesan: 'Tidak ada sambungan internet.' }; }
}

// Kasir sudah mengonfirmasi pesanan online: beri tahu HP pengantar. Tidak menunggu hasil dan tidak mengganggu alur kasir.
export function picuPushDikonfirmasi(pm: { no: string; items: { jumlah: number; nama_produk: string }[]; alamat: string }): void {
  if (!pushDidukung()) return;
  (async () => {
    const token = await tokenAkun();
    if (!token) return;
    await fetch('/api/push/kirim', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ jenis: 'dikonfirmasi', no: pm.no, ringkas: pm.items.map(i => `${i.jumlah} ${i.nama_produk}`).join(', '), alamat: pm.alamat })
    }).catch(() => undefined);
  })();
}
