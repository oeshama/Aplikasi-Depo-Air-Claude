-- =====================================================================
-- KUNCI AKSES: hanya pengguna yang sudah login (punya peran) yang boleh
-- membaca dan menulis data. Kunci publik di browser tidak lagi cukup.
--
-- JANGAN jalankan sebelum:
--   1. Semua akun sudah dibuat di Authentication > Users.
--   2. SQL peran (dari Pengaturan Toko > Akun login dan keamanan) sudah dijalankan.
--   3. Aplikasi dengan NEXT_PUBLIC_LOGIN_AKUN=1 sudah dicoba dan semua orang bisa masuk.
--   4. SUPABASE_SERVICE_ROLE_KEY sudah dipasang di Vercel (untuk halaman pesan pelanggan).
--
-- Kalau ada masalah setelah dijalankan: jalankan supabase/buka-kunci-darurat.sql
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
-- =====================================================================

-- Peran pengguna diambil dari akunnya (app_metadata.role), yang hanya bisa diubah lewat dashboard/SQL ini.
create or replace function public.peran_app()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

-- Cabut izin lama yang terbuka untuk siapa pun yang memegang kunci publik
drop policy if exists "depo app read" on public.depo_records;
drop policy if exists "depo app insert" on public.depo_records;
drop policy if exists "depo app update" on public.depo_records;
revoke select, insert, update on public.depo_records from anon;

-- Izin baru: hanya akun login dengan peran yang dikenal
grant usage on schema public to authenticated;
grant select, insert, update on public.depo_records to authenticated;

drop policy if exists "staf baca" on public.depo_records;
drop policy if exists "staf tambah" on public.depo_records;
drop policy if exists "staf ubah" on public.depo_records;

create policy "staf baca" on public.depo_records
  for select to authenticated
  using (public.peran_app() in ('owner', 'admin', 'kasir', 'pengantar'));

create policy "staf tambah" on public.depo_records
  for insert to authenticated
  with check (public.peran_app() in ('owner', 'admin', 'kasir', 'pengantar'));

create policy "staf ubah" on public.depo_records
  for update to authenticated
  using (public.peran_app() in ('owner', 'admin', 'kasir', 'pengantar'))
  with check (public.peran_app() in ('owner', 'admin', 'kasir', 'pengantar'));

-- Tidak ada izin DELETE: data dihapus dengan menandai deleted = true, seperti sebelumnya.
-- Halaman pesan pelanggan memakai SUPABASE_SERVICE_ROLE_KEY di server, yang tidak terkena aturan ini.

-- Pemeriksaan: tabel harus aktif RLS dan hanya ada tiga aturan "staf ...".
select polname as aturan, polcmd as jenis from pg_policy where polrelid = 'public.depo_records'::regclass order by polname;
