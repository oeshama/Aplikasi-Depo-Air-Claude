'use client';

import React, { useMemo, useState } from 'react';
import { AppStore } from '@/lib/store';
import { AUTH_AKTIF, DOMAIN_LOGIN, emailDariMasukan } from '@/lib/auth';
import { KeyRound, Copy, ShieldCheck, AlertTriangle } from 'lucide-react';

const sq = (s: string) => s.replace(/'/g, "''");

// Panel untuk owner: menyiapkan perintah SQL yang memberi peran pada akun login Supabase.
// Akun dibuat di dashboard Supabase (Authentication > Users); peran dan nomor karyawan disematkan lewat SQL ini.
export default function AkunLoginPanel() {
  const pengguna = useMemo(() => AppStore.getUsers().filter(u => u.id !== 'usr-kasir-default'), []);
  const [email, setEmail] = useState<Record<string, string>>({});
  const [disalin, setDisalin] = useState(false);

  const efektif = (id: string, username: string) => emailDariMasukan(email[id]?.trim() || username);
  const sqlPeran = useMemo(() => {
    const baris = pengguna.map(u =>
      `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', '${sq(u.role)}', 'karyawan_id', '${sq(u.id)}', 'nama', '${sq(u.nama)}') where lower(email) = '${sq(efektif(u.id, u.username))}';`
    );
    return [
      '-- Memberi peran pada akun login. Jalankan SETELAH semua akun dibuat di Authentication > Users.',
      ...baris,
      '',
      '-- Pemeriksaan: setiap akun harus punya peran.',
      "select email, raw_app_meta_data->>'role' as peran, raw_app_meta_data->>'karyawan_id' as id_karyawan from auth.users order by email;",
    ].join('\n');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pengguna, email]);

  const salin = async () => {
    try { await navigator.clipboard.writeText(sqlPeran); setDisalin(true); setTimeout(() => setDisalin(false), 2500); }
    catch { alert('Salin manual: blok teks di bawah, lalu salin.'); }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-amber)' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <KeyRound size={22} aria-hidden="true" /> Akun login dan keamanan
      </h3>

      <p role="status" style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 700, margin: '0 0 12px', color: AUTH_AKTIF ? 'var(--c-green)' : 'var(--c-amber)' }}>
        {AUTH_AKTIF ? <ShieldCheck size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
        {AUTH_AKTIF ? 'Login akun AKTIF. Password dikelola Supabase.' : 'Login akun BELUM aktif. Aplikasi masih memakai login lama (nama + password di data aplikasi).'}
      </p>

      <ol style={{ margin: '0 0 14px', paddingLeft: '20px', display: 'grid', gap: '6px', lineHeight: 1.5, fontSize: '0.92rem' }}>
        <li>Buka dashboard Supabase, menu <strong>Authentication</strong>, lalu <strong>Users</strong>, lalu <strong>Add user</strong>, lalu <strong>Create new user</strong>.</li>
        <li>Isi email dan password untuk setiap orang di tabel bawah. Centang <strong>Auto Confirm User</strong>. Untuk yang tidak punya email, pakai email yang tertulis di kolom &quot;Email login&quot; (domain @{DOMAIN_LOGIN}).</li>
        <li>Isi kolom &quot;Email&quot; di bawah bila orang itu memakai email aslinya, lalu tekan <strong>Salin SQL</strong>.</li>
        <li>Di Supabase buka <strong>SQL Editor</strong>, tempel SQL tadi, tekan <strong>Run</strong>. Hasilnya menampilkan setiap akun beserta perannya.</li>
      </ol>

      <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
        {pengguna.map(u => (
          <div key={u.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <strong>{u.nama}</strong>
              <span className="badge badge-primary">{u.role}</span>
            </div>
            <label className="form-label" htmlFor={`email-${u.id}`} style={{ marginTop: '8px', display: 'block' }}>Email (kosongkan kalau tidak punya)</label>
            <input id={`email-${u.id}`} type="email" className="form-input" value={email[u.id] || ''} onChange={(e) => setEmail(prev => ({ ...prev, [u.id]: e.target.value }))} placeholder="nama@email.com" autoCapitalize="none" />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Email login: <strong>{efektif(u.id, u.username)}</strong></div>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-primary" onClick={salin} style={{ width: '100%', marginBottom: '10px' }}>
        <Copy size={18} aria-hidden="true" /> {disalin ? 'SQL tersalin' : 'Salin SQL'}
      </button>
      <pre aria-label="SQL peran akun" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.72rem', background: 'var(--inset-50)', borderRadius: '10px', padding: '10px', margin: 0, maxHeight: '220px', overflow: 'auto' }}>{sqlPeran}</pre>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '12px 0 0' }}>
        Setiap orang bisa mengganti passwordnya sendiri lewat tombol &quot;Ganti password&quot; di menu. Untuk mengatur ulang password orang lain, ubah di Supabase: Authentication, Users, pilih orangnya.
      </p>
    </div>
  );
}
