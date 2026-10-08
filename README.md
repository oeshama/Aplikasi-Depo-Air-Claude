# Aplikasi Depo Air

Aplikasi kasir dan manajemen depo air isi ulang (Next.js, Supabase, Vercel).

## Pengaturan environment

| Nama | Wajib | Fungsi |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ya | Alamat proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (atau `..._ANON_KEY`) | ya | Kunci publik Supabase (memang terlihat di browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | untuk keamanan | Kunci RAHASIA, hanya dipakai server untuk halaman pesan pelanggan. Jangan pernah diawali `NEXT_PUBLIC_`, jangan dibagikan |
| `NEXT_PUBLIC_LOGIN_AKUN` | untuk keamanan | Isi `1` untuk memakai login akun Supabase (email + password). Kosong = login lama |

## Mengamankan data (login akun)

Urutan aman, jangan dilompati:

1. Buat akun setiap orang di Supabase: Authentication, Users, Add user (centang Auto Confirm User).
2. Di aplikasi: Pengaturan Toko, "Akun login dan keamanan", salin SQL, jalankan di SQL Editor Supabase (memberi peran tiap akun).
3. Di Vercel isi `SUPABASE_SERVICE_ROLE_KEY` dan `NEXT_PUBLIC_LOGIN_AKUN=1`, lalu deploy ulang. Uji masuk untuk setiap peran.
4. SEGERA jalankan `supabase/kunci-akses.sql`. Berkas ini memberi izin kepada akun login dan mengunci tabel dari kunci publik. Selama belum dijalankan, akun login tidak bisa membaca maupun menulis data ke server.
5. Kalau ada masalah: jalankan `supabase/buka-kunci-darurat.sql`.

Berkas SQL diuji pada Postgres tiruan: kunci publik ditolak, akun tanpa peran ditolak, kasir/owner/admin/pengantar diterima, penghapusan ditolak, dan pembuka darurat mengembalikan akses.
