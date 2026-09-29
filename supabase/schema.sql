-- =====================================================================
-- Skema sinkronisasi Depo Air Isi Ulang
-- Jalankan SEKALI di Supabase: Dashboard > SQL Editor > New query > Run
-- =====================================================================

-- Satu tabel menampung semua data aplikasi, satu baris per record.
--   collection : 'pesanan' | 'kontak' | 'produk' | 'zona' | 'pengeluaran'
--                | 'hutang_toko' | 'shift' | 'pengaturan'
--   id         : id record dari aplikasi (mis. 'psn-1712345678')
--   data       : isi record lengkap (JSON)
--   deleted    : true jika record dihapus (dipertahankan agar perangkat lain ikut menghapus)
create table if not exists public.depo_records (
  collection  text        not null,
  id          text        not null,
  data        jsonb       not null,
  deleted     boolean     not null default false,
  device_id   text,
  seq         bigint      generated always as identity,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists depo_records_updated_at_idx on public.depo_records (updated_at);

-- updated_at selalu memakai jam server (jam HP/laptop bisa beda-beda)
create or replace function public.depo_records_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists depo_records_touch on public.depo_records;
create trigger depo_records_touch
  before insert or update on public.depo_records
  for each row execute function public.depo_records_touch();

-- Akses dari aplikasi (anon key). Aplikasi ini tidak memakai Supabase Auth,
-- jadi siapa pun yang memegang URL + anon key bisa membaca/menulis data.
-- Jangan sebarkan file .env.local.
alter table public.depo_records enable row level security;

-- Izin tabel untuk aplikasi (diperlukan jika "Automatically expose new tables" dimatikan)
grant usage on schema public to anon;
grant select, insert, update on public.depo_records to anon;

drop policy if exists "depo app read" on public.depo_records;
drop policy if exists "depo app insert" on public.depo_records;
drop policy if exists "depo app update" on public.depo_records;

create policy "depo app read"   on public.depo_records for select to anon using (true);
create policy "depo app insert" on public.depo_records for insert to anon with check (true);
create policy "depo app update" on public.depo_records for update to anon using (true) with check (true);
-- Tidak ada policy DELETE: record dihapus dengan menandai deleted = true.

-- Aktifkan Realtime supaya perubahan langsung muncul di perangkat lain
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'depo_records'
  ) then
    alter publication supabase_realtime add table public.depo_records;
  end if;
end $$;
