import { NextResponse } from 'next/server';
import { dbPublik } from '@/lib/apiPublik';
import { ambilPenanya, endpointDiizinkan, simpanLangganan, hapusLangganan, pushSiap } from '@/lib/pushServer';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const tolak = (pesan: string, status: number) => NextResponse.json({ ok: false, pesan }, { status });

// HP mendaftar untuk menerima notifikasi. Hanya akun login (kasir, owner, admin, pengantar) yang boleh.
export async function POST(req: Request) {
  const db = dbPublik();
  if (!db || !pushSiap()) return tolak('Notifikasi belum disiapkan di server.', 503);
  const penanya = await ambilPenanya(db, req);
  if (!penanya) return tolak('Harus masuk dengan akun dulu.', 401);

  let b: any;
  try { b = await req.json(); } catch { return tolak('Data tidak terbaca.', 400); }
  const s = b?.subscription;
  if (!s || !endpointDiizinkan(s.endpoint) || typeof s.keys?.p256dh !== 'string' || typeof s.keys?.auth !== 'string' || s.keys.p256dh.length > 200 || s.keys.auth.length > 100) {
    return tolak('Data langganan tidak valid.', 400);
  }
  const ok = await simpanLangganan(db, { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, penanya);
  return ok ? NextResponse.json({ ok: true, peran: penanya.peran }) : tolak('Gagal menyimpan. Coba lagi.', 502);
}

// HP berhenti menerima notifikasi (mis. saat keluar dari akun)
export async function DELETE(req: Request) {
  const db = dbPublik();
  if (!db) return tolak('Server belum siap.', 503);
  const penanya = await ambilPenanya(db, req);
  if (!penanya) return tolak('Harus masuk dengan akun dulu.', 401);
  let b: any;
  try { b = await req.json(); } catch { return tolak('Data tidak terbaca.', 400); }
  if (!endpointDiizinkan(b?.endpoint)) return tolak('Data langganan tidak valid.', 400);
  await hapusLangganan(db, b.endpoint);
  return NextResponse.json({ ok: true });
}
