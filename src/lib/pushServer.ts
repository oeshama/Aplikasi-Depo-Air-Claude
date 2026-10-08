import webpush from 'web-push';
import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// Notifikasi push (sisi server). Kunci rahasia VAPID hanya ada di server (env VAPID_PRIVATE_KEY).
// Langganan disimpan di tabel depo_records, koleksi 'push_langganan' (tidak ikut disinkronkan ke HP mana pun).

export const KOLEKSI_LANGGANAN = 'push_langganan';
export const KOLEKSI_LOG = 'push_log';
export type PeranPush = 'owner' | 'admin' | 'kasir' | 'pengantar';
const PERAN_VALID: PeranPush[] = ['owner', 'admin', 'kasir', 'pengantar'];

export interface PayloadPush { title: string; body: string; url: string; tag?: string }
export interface Penanya { peran: PeranPush; id: string; nama: string }
export interface Langganan {
  id: string; endpoint: string; keys: { p256dh: string; auth: string };
  peran: PeranPush; karyawan_id: string; nama: string; dibuat: string;
}

export function pushSiap(): boolean {
  return !!(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

let sudahAtur = false;
function aturVapid() {
  if (sudahAtur) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  sudahAtur = true;
}

// Server hanya boleh mengirim ke layanan push resmi (mencegah server dipakai menembak alamat sembarang)
const HOST_RESMI = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];
export function endpointDiizinkan(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return false;
  try {
    const u = new URL(endpoint);
    const tambahan = (process.env.PUSH_HOST_TAMBAHAN || '').split(',').map(s => s.trim()).filter(Boolean); // hanya untuk uji lokal
    if (u.protocol !== 'https:') return false;
    return HOST_RESMI.some(r => r.test(u.hostname)) || tambahan.includes(u.hostname + (u.port ? ':' + u.port : ''));
  } catch { return false; }
}

export const idLangganan = (endpoint: string) => createHash('sha1').update(endpoint).digest('hex');

// Siapa yang meminta, dari token akun Supabase. Peran diambil dari app_metadata (tidak bisa diubah pengguna).
export async function ambilPenanya(db: SupabaseClient, req: Request): Promise<Penanya | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const meta = (data.user.app_metadata || {}) as Record<string, unknown>;
  const peran = meta.role as PeranPush;
  if (!PERAN_VALID.includes(peran)) return null;
  return {
    peran,
    id: typeof meta.karyawan_id === 'string' && meta.karyawan_id ? meta.karyawan_id : data.user.id,
    nama: typeof meta.nama === 'string' ? meta.nama : (data.user.email || 'Pengguna').split('@')[0]
  };
}

export async function simpanLangganan(db: SupabaseClient, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, p: Penanya) {
  const rec: Langganan = {
    id: idLangganan(sub.endpoint), endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    peran: p.peran, karyawan_id: p.id, nama: p.nama, dibuat: new Date().toISOString()
  };
  const { error } = await db.from('depo_records').upsert({ collection: KOLEKSI_LANGGANAN, id: rec.id, data: rec, deleted: false, device_id: 'push' }, { onConflict: 'collection,id' });
  return !error;
}

export async function hapusLangganan(db: SupabaseClient, endpoint: string) {
  const { error } = await db.from('depo_records').upsert({ collection: KOLEKSI_LANGGANAN, id: idLangganan(endpoint), data: { id: idLangganan(endpoint) }, deleted: true, device_id: 'push' }, { onConflict: 'collection,id' });
  return !error;
}

async function ambilLangganan(db: SupabaseClient, peran: PeranPush[]): Promise<Langganan[]> {
  const { data } = await db.from('depo_records').select('data, deleted').eq('collection', KOLEKSI_LANGGANAN).in('data->>peran', peran);
  return (data || []).filter(r => !r.deleted).map(r => r.data as Langganan).filter(l => l && endpointDiizinkan(l.endpoint));
}

// Mengirim ke semua HP dengan peran tertentu. Langganan yang sudah tidak berlaku (404/410) dihapus otomatis.
export async function kirimKePeran(db: SupabaseClient, peran: PeranPush[], payload: PayloadPush, batasMs = 5000): Promise<{ terkirim: number; gagal: number }> {
  if (!pushSiap()) return { terkirim: 0, gagal: 0 };
  aturVapid();
  const daftar = await ambilLangganan(db, peran);
  return kirimKeDaftar(db, daftar, payload, batasMs);
}

export async function kirimKeDaftar(db: SupabaseClient, daftar: Langganan[], payload: PayloadPush, batasMs = 5000): Promise<{ terkirim: number; gagal: number }> {
  if (!pushSiap() || daftar.length === 0) return { terkirim: 0, gagal: 0 };
  aturVapid();
  const isi = JSON.stringify({ title: payload.title.slice(0, 80), body: payload.body.slice(0, 200), url: payload.url, tag: payload.tag });
  let terkirim = 0, gagal = 0;
  const kerja = daftar.map(async l => {
    try {
      await webpush.sendNotification({ endpoint: l.endpoint, keys: l.keys }, isi, { TTL: 3600, urgency: 'high', timeout: batasMs });
      terkirim++;
    } catch (e: any) {
      gagal++;
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await hapusLangganan(db, l.endpoint).catch(() => undefined);
    }
  });
  await Promise.race([Promise.allSettled(kerja), new Promise(r => setTimeout(r, batasMs + 500))]);
  return { terkirim, gagal };
}

// Penanda "sudah pernah dikirim" supaya satu kejadian tidak membunyikan HP dua kali
export async function tandaiSekali(db: SupabaseClient, kunci: string): Promise<boolean> {
  const { error } = await db.from('depo_records').insert({ collection: KOLEKSI_LOG, id: kunci, data: { id: kunci, waktu: new Date().toISOString() }, device_id: 'push' });
  return !error; // gagal karena sudah ada = kejadian ini sudah pernah dikirim
}

export const bersih = (v: unknown, maks: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maks) : '');
