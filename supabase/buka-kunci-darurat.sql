-- =====================================================================
-- BUKA KUNCI DARURAT: mengembalikan akses seperti sebelum dikunci.
-- Dipakai kalau setelah menjalankan kunci-akses.sql ada yang tidak bisa masuk atau data tidak muncul.
-- Aturan ini mengizinkan siapa pun yang memegang kunci publik DAN akun yang sudah login.
-- Setelah masalah selesai, jalankan kunci-akses.sql lagi.
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
-- =====================================================================

drop policy if exists "staf baca" on public.depo_records;
drop policy if exists "staf tambah" on public.depo_records;
drop policy if exists "staf ubah" on public.depo_records;
drop policy if exists "depo app read" on public.depo_records;
drop policy if exists "depo app insert" on public.depo_records;
drop policy if exists "depo app update" on public.depo_records;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.depo_records to anon, authenticated;

create policy "depo app read" on public.depo_records for select to anon, authenticated using (true);
create policy "depo app insert" on public.depo_records for insert to anon, authenticated with check (true);
create policy "depo app update" on public.depo_records for update to anon, authenticated using (true) with check (true);

select polname as aturan, polcmd as jenis from pg_policy where polrelid = 'public.depo_records'::regclass order by polname;
