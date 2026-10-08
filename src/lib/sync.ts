import { supabase, isSupabaseConfigured } from './supabase';
import { AUTH_AKTIF } from './auth';
import {
  INITIAL_PENGATURAN, INITIAL_PRODUK, INITIAL_ZONA, INITIAL_KONTAK, INITIAL_PESANAN
} from './mockData';

// Sinkronisasi data antar perangkat lewat Supabase (tabel depo_records, lihat supabase/schema.sql).
//
// Cara kerja:
// - localStorage tetap dipakai sebagai cache lokal, jadi AppStore tetap sinkron & cepat
//   dan aplikasi tetap jalan saat internet putus.
// - Setiap kali AppStore menyimpan data, record yang berubah saja (per id) masuk antrean
//   lalu dikirim ke Supabase. Dua kasir yang input pesanan bersamaan tidak saling menimpa.
// - Perubahan dari perangkat lain masuk lewat Realtime (+ polling cadangan), ditulis ke
//   localStorage, lalu event 'depo_*_updated' dikirim supaya halaman memuat ulang datanya.

type Kind = 'list' | 'object';

interface CollectionDef {
  key: string;            // key di localStorage
  collection: string;     // nilai kolom `collection` di Supabase
  event: string;          // event yang didengarkan halaman
  kind: Kind;
  newestFirst?: boolean;  // list yang item barunya ditaruh paling depan (unshift)
  initial: () => any;     // nilai awal jika belum pernah ada data
}

const OBJECT_ID = 'main';

const SYNC_COLLECTIONS: CollectionDef[] = [
  { key: 'depo_pengaturan', collection: 'pengaturan', event: 'depo_pengaturan_updated', kind: 'object', initial: () => INITIAL_PENGATURAN },
  { key: 'depo_produk', collection: 'produk', event: 'depo_produk_updated', kind: 'list', initial: () => INITIAL_PRODUK },
  { key: 'depo_zona', collection: 'zona', event: 'depo_zona_updated', kind: 'list', initial: () => INITIAL_ZONA },
  { key: 'depo_kontak', collection: 'kontak', event: 'depo_kontak_updated', kind: 'list', initial: () => INITIAL_KONTAK },
  { key: 'depo_pesanan', collection: 'pesanan', event: 'depo_pesanan_updated', kind: 'list', newestFirst: true, initial: () => INITIAL_PESANAN },
  { key: 'depo_pengeluaran', collection: 'pengeluaran', event: 'depo_pengeluaran_updated', kind: 'list', newestFirst: true, initial: () => [] },
  { key: 'depo_hutang_toko', collection: 'hutang_toko', event: 'depo_hutang_toko_updated', kind: 'list', newestFirst: true, initial: () => [] },
  { key: 'depo_shift', collection: 'shift', event: 'depo_shift_updated', kind: 'list', newestFirst: true, initial: () => [] },
  { key: 'depo_setoran_kurir', collection: 'setoran_kurir', event: 'depo_setoran_kurir_updated', kind: 'list', newestFirst: true, initial: () => [] },
  { key: 'depo_setoran_owner', collection: 'setoran_owner', event: 'depo_setoran_owner_updated', kind: 'list', newestFirst: true, initial: () => [] },
  { key: 'depo_foto_meter', collection: 'foto_meter', event: 'depo_foto_meter_updated', kind: 'list', newestFirst: true, initial: () => [] },
  { key: 'depo_rekening', collection: 'rekening', event: 'depo_rekening_updated', kind: 'list', initial: () => [] },
  { key: 'depo_pesanan_masuk', collection: 'pesanan_masuk', event: 'depo_pesanan_masuk_updated', kind: 'list', newestFirst: true, initial: () => [] },
  { key: 'depo_tautan', collection: 'tautan', event: 'depo_tautan_updated', kind: 'list', initial: () => [] },
  { key: 'depo_etalase', collection: 'etalase', event: 'depo_etalase_updated', kind: 'object', initial: () => ({ aktif: false, nama: '', wa: '', produk: [] }) },
  { key: 'depo_uang_pegangan', collection: 'uang_pegangan', event: 'depo_uang_pegangan_updated', kind: 'list', newestFirst: true, initial: () => [] },
  { key: 'depo_mutasi_keuangan', collection: 'mutasi_keuangan', event: 'depo_mutasi_keuangan_updated', kind: 'list', newestFirst: true, initial: () => [] },
  { key: 'depo_notifikasi', collection: 'notifikasi', event: 'depo_notifikasi_updated', kind: 'list', newestFirst: true, initial: () => [] },
];

const byKey = new Map(SYNC_COLLECTIONS.map(d => [d.key, d]));
const byCollection = new Map(SYNC_COLLECTIONS.map(d => [d.collection, d]));

interface RemoteRow {
  collection: string;
  id: string;
  data: any;
  deleted: boolean;
  device_id?: string | null;
  seq?: number;
  updated_at: string;
}

interface PendingChange {
  collection: string;
  id: string;
  data: any;
  deleted: boolean;
}

export interface SyncStatus {
  mode: 'local' | 'online' | 'offline';
  pending: number;
}

const TABLE = 'depo_records';
const QUEUE_KEY = 'depo_sync_queue';
const LAST_PULL_KEY = 'depo_sync_last_pull';
const DEVICE_KEY = 'depo_sync_device';
const PAGE_SIZE = 1000;
const PUSH_CHUNK = 500;
const PULL_OVERLAP_MS = 15000;   // tarik ulang sedikit ke belakang supaya tidak ada perubahan yang terlewat
const POLL_INTERVAL_MS = 30000;
const INIT_TIMEOUT_MS = 15000;
const VERIFIED_KEY = 'depo_sync_verified';

// Mode akun: sebuah perangkat dianggap "terverifikasi" setelah pernah benar-benar membaca data toko dari server
// (ada baris pengaturan). Sebelum itu, server yang tampak kosong bisa berarti "akun ini belum diberi izin baca",
// sehingga perangkat tidak boleh mengunggah apa pun. Ini mencegah data contoh menimpa data asli.
export function perangkatTerverifikasi(): boolean {
  if (!AUTH_AKTIF) return true;
  try { return localStorage.getItem(VERIFIED_KEY) === '1'; } catch { return false; }
}

// Antrean unggahan yang berisi data berisiko dari perangkat yang belum terverifikasi: pengaturan, etalase, dan pesanan contoh
const ID_PESANAN_CONTOH = /^psn-(demo-|10[1-3]$)/;
function bersihkanAntreanBerisiko() {
  if (perangkatTerverifikasi()) return;
  const queue = loadQueue();
  let berubah = false;
  for (const k of Object.keys(queue)) {
    const q = queue[k];
    if (q.collection === 'pengaturan' || q.collection === 'etalase' || (q.collection === 'pesanan' && ID_PESANAN_CONTOH.test(q.id))) {
      delete queue[k];
      berubah = true;
    }
  }
  if (berubah) saveQueue(queue);
}

let initPromise: Promise<void> | null = null;
let ready = false;
let online = false;
let flushing = false;
let pulling = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// ---------- helper ----------

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const queueKey = (collection: string, id: string) => `${collection}|${id}`;

function loadQueue(): Record<string, PendingChange> {
  return readJSON<Record<string, PendingChange>>(QUEUE_KEY, {});
}

function saveQueue(queue: Record<string, PendingChange>) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Ubah isi satu key localStorage menjadi Map id -> record, urut dari yang paling lama
function toRecords(def: CollectionDef, value: any): Map<string, any> {
  const records = new Map<string, any>();
  if (value == null) return records;
  if (def.kind === 'object') {
    records.set(OBJECT_ID, value);
    return records;
  }
  if (Array.isArray(value)) {
    const items = def.newestFirst ? [...value].reverse() : value;
    for (const item of items) {
      if (item && item.id != null) records.set(String(item.id), item);
    }
  }
  return records;
}

function same(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function setOnline(value: boolean) {
  if (online !== value) {
    online = value;
    emitStatus();
  }
}

function emitStatus() {
  window.dispatchEvent(new CustomEvent('depo_sync_status', { detail: getSyncStatus() }));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); }
    );
  });
}

export function getSyncStatus(): SyncStatus {
  if (!isSupabaseConfigured) return { mode: 'local', pending: 0 };
  return { mode: online ? 'online' : 'offline', pending: Object.keys(loadQueue()).length };
}

// ---------- kirim perubahan lokal ----------

function queueDiff(def: CollectionDef, oldValue: any, newValue: any): boolean {
  const oldRecords = toRecords(def, oldValue);
  const newRecords = toRecords(def, newValue);
  const queue = loadQueue();
  let changed = false;

  newRecords.forEach((item, id) => {
    const prev = oldRecords.get(id);
    if (prev === undefined || !same(prev, item)) {
      queue[queueKey(def.collection, id)] = { collection: def.collection, id, data: item, deleted: false };
      changed = true;
    }
  });
  oldRecords.forEach((item, id) => {
    if (!newRecords.has(id)) {
      queue[queueKey(def.collection, id)] = { collection: def.collection, id, data: item, deleted: true };
      changed = true;
    }
  });

  if (changed) saveQueue(queue);
  return changed;
}

// Dipanggil AppStore setiap kali menyimpan data
export function recordLocalChange(key: string, oldRaw: string | null, newValue: any) {
  if (!isSupabaseConfigured || !ready) return;
  if (AUTH_AKTIF && !perangkatTerverifikasi()) return;
  const def = byKey.get(key);
  if (!def) return;

  let oldValue: any = null;
  try {
    oldValue = oldRaw ? JSON.parse(oldRaw) : null;
  } catch {
    oldValue = null;
  }

  if (queueDiff(def, oldValue, newValue)) {
    emitStatus();
    scheduleFlush(0);
  }
}

function scheduleFlush(delayMs: number) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, delayMs);
}

async function flush(): Promise<void> {
  if (!supabase || flushing) return;
  const entries = Object.values(loadQueue());
  if (entries.length === 0) return;

  flushing = true;
  let failed = false;
  try {
    const device = deviceId();
    for (let i = 0; i < entries.length; i += PUSH_CHUNK) {
      const chunk = entries.slice(i, i + PUSH_CHUNK);
      const { error } = await supabase.from(TABLE).upsert(
        chunk.map(c => ({ collection: c.collection, id: c.id, data: c.data, deleted: c.deleted, device_id: device })),
        { onConflict: 'collection,id' }
      );
      if (error) throw error;

      // Hapus dari antrean hanya jika record tidak berubah lagi selama dikirim
      const latest = loadQueue();
      for (const c of chunk) {
        const k = queueKey(c.collection, c.id);
        if (latest[k] && same(latest[k], c)) delete latest[k];
      }
      saveQueue(latest);
    }
    setOnline(true);
  } catch (err) {
    failed = true;
    console.warn('[sync] Gagal mengirim data ke Supabase, dicoba lagi nanti:', err);
    setOnline(false);
    scheduleFlush(10000);
  } finally {
    flushing = false;
    emitStatus();
  }

  if (!failed && Object.keys(loadQueue()).length > 0) scheduleFlush(0);
}

// ---------- terima perubahan dari perangkat lain ----------

function writeLocal(def: CollectionDef, value: any) {
  localStorage.setItem(def.key, JSON.stringify(value));
  window.dispatchEvent(new Event(def.event));
}

function applyIncremental(rows: RemoteRow[]) {
  const myDevice = deviceId();
  const queue = loadQueue();
  const working = new Map<string, any>();
  const changed = new Set<string>();

  const sorted = [...rows].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  for (const row of sorted) {
    if (row.device_id === myDevice) continue;             // perubahan sendiri sudah ada di lokal
    if (queue[queueKey(row.collection, row.id)]) continue; // perubahan lokal yang belum terkirim menang
    const def = byCollection.get(row.collection);
    if (!def) continue;

    if (!working.has(def.key)) working.set(def.key, readJSON<any>(def.key, def.kind === 'list' ? [] : null));
    const current = working.get(def.key);

    if (def.kind === 'object') {
      if (!row.deleted && !same(current, row.data)) {
        working.set(def.key, row.data);
        changed.add(def.key);
      }
      continue;
    }

    const list: any[] = Array.isArray(current) ? current : [];
    const idx = list.findIndex(item => item && String(item.id) === row.id);
    if (row.deleted) {
      if (idx !== -1) {
        list.splice(idx, 1);
        changed.add(def.key);
      }
    } else if (idx !== -1) {
      if (!same(list[idx], row.data)) {
        list[idx] = row.data;
        changed.add(def.key);
      }
    } else {
      if (def.newestFirst) list.unshift(row.data);
      else list.push(row.data);
      changed.add(def.key);
    }
    working.set(def.key, list);
  }

  changed.forEach(key => writeLocal(byKey.get(key)!, working.get(key)));
}

function applyFull(rows: RemoteRow[], firstPull: boolean) {
  if (AUTH_AKTIF) {
    if (rows.some(r => r.collection === 'pengaturan' && !r.deleted)) {
      try { localStorage.setItem(VERIFIED_KEY, '1'); } catch { /* abaikan */ }
    } else {
      bersihkanAntreanBerisiko();
    }
  }
  const queue = loadQueue();
  const grouped = new Map<string, RemoteRow[]>();
  for (const row of [...rows].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))) {
    if (!grouped.has(row.collection)) grouped.set(row.collection, []);
    grouped.get(row.collection)!.push(row);
  }

  for (const def of SYNC_COLLECTIONS) {
    const remoteRows = grouped.get(def.collection) || [];
    const localValue = readJSON<any>(def.key, null);

    // Belum ada data sama sekali di Supabase: perangkat ini yang mengisi pertama kali
    if (remoteRows.length === 0) {
      const seed = localValue ?? def.initial();
      if (localValue == null) localStorage.setItem(def.key, JSON.stringify(seed));
      // Mode akun: server kosong bisa berarti "akun ini belum diberi izin baca". Perangkat baru (tanpa data lokal)
      // tidak boleh mengunggah data contoh, supaya data asli di server tidak tertimpa.
      if (!(AUTH_AKTIF && (localValue == null || !perangkatTerverifikasi()))) {
        // Mode akun: pesanan contoh tidak pernah diunggah ke server
        const diunggah = AUTH_AKTIF && def.collection === 'pesanan' && Array.isArray(seed) ? seed.filter((p: any) => !ID_PESANAN_CONTOH.test(String(p?.id))) : seed;
        queueDiff(def, null, diunggah);
      }
      continue;
    }

    const pending = Object.values(queue).filter(p => p.collection === def.collection);

    if (def.kind === 'object') {
      const live = [...remoteRows].reverse().find(r => !r.deleted);
      if (live && pending.length === 0 && !same(localValue, live.data)) writeLocal(def, live.data);
      continue;
    }

    // List disusun dari yang paling lama ke yang paling baru, lalu dibalik jika newestFirst
    const items = new Map<string, any>();
    for (const row of remoteRows) {
      if (!row.deleted) items.set(row.id, row.data);
    }
    for (const p of pending) {
      if (p.deleted) items.delete(p.id);
      else items.set(p.id, p.data);
    }

    // Sinkron pertama di perangkat yang sudah punya data sendiri:
    // record yang belum pernah ada di Supabase ikut dikirim, bukan dibuang
    if (firstPull && localValue != null) {
      const remoteIds = new Set(remoteRows.map(r => r.id));
      const extra: any[] = [];
      toRecords(def, localValue).forEach((item, id) => {
        if (!remoteIds.has(id) && !items.has(id)) {
          items.set(id, item);
          extra.push(item);
        }
      });
      if (extra.length > 0) queueDiff(def, [], def.newestFirst ? [...extra].reverse() : extra);
    }

    const list = Array.from(items.values());
    if (def.newestFirst) list.reverse();
    if (!same(localValue, list)) writeLocal(def, list);
  }
}

async function fetchAll(since?: string): Promise<RemoteRow[]> {
  if (!supabase) return [];
  const rows: RemoteRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(TABLE).select('collection,id,data,deleted,device_id,seq,updated_at');
    query = since ? query.gt('updated_at', since).order('updated_at') : query.order('seq');
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...((data || []) as RemoteRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function maxUpdatedAt(rows: RemoteRow[], fallback: string): string {
  return rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), fallback);
}

async function pullFull(): Promise<void> {
  const firstPull = !localStorage.getItem(LAST_PULL_KEY);
  const rows = await fetchAll();
  applyFull(rows, firstPull);
  localStorage.setItem(LAST_PULL_KEY, maxUpdatedAt(rows, '1970-01-01T00:00:00Z'));
  emitStatus();
  scheduleFlush(0);
}

async function pullIncremental(): Promise<void> {
  const last = localStorage.getItem(LAST_PULL_KEY);
  if (!last) return pullFull();
  // Mode akun: selama perangkat belum terverifikasi, tarik SEMUA data (bukan hanya yang baru). Perangkat yang tadinya
  // tidak diizinkan membaca tidak boleh menganggap dirinya mutakhir setelah izin dibuka.
  if (AUTH_AKTIF && !perangkatTerverifikasi()) return pullFull();
  const since = new Date(Date.parse(last) - PULL_OVERLAP_MS).toISOString();
  const rows = await fetchAll(since);
  applyIncremental(rows);
  localStorage.setItem(LAST_PULL_KEY, maxUpdatedAt(rows, last));
}

async function syncNow(): Promise<void> {
  if (!supabase || pulling) return;
  pulling = true;
  try {
    await flush();
    await pullIncremental();
    setOnline(true);
  } catch (err) {
    console.warn('[sync] Gagal mengambil data dari Supabase:', err);
    setOnline(false);
  } finally {
    pulling = false;
  }
}

function startBackgroundSync() {
  if (!supabase) return;

  supabase
    .channel('depo_records_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, payload => {
      const row = payload.new as RemoteRow;
      if (row && row.collection && row.id) applyIncremental([row]);
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        setOnline(true);
        syncNow(); // ambil perubahan yang terlewat selama terputus
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setOnline(false);
      }
    });

  setInterval(syncNow, POLL_INTERVAL_MS);
  window.addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
  });
}

// ---------- mulai ----------

// Dipanggil sekali saat aplikasi dibuka, sebelum halaman dirender
export function initSync(): Promise<void> {
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

async function doInit() {
  if (typeof window === 'undefined' || !isSupabaseConfigured || !supabase) {
    ready = true;
    return;
  }

  try {
    pulling = true;
    await withTimeout((async () => {
      await flush();           // kirim dulu perubahan yang tertunda saat offline
      await pullIncremental(); // pullFull otomatis jika perangkat ini belum pernah sinkron
    })(), INIT_TIMEOUT_MS);
    setOnline(true);
  } catch (err) {
    console.warn('[sync] Supabase tidak terjangkau, aplikasi berjalan offline dulu:', err);
    setOnline(false);
  } finally {
    pulling = false;
  }

  ready = true;
  emitStatus();
  startBackgroundSync();
}
