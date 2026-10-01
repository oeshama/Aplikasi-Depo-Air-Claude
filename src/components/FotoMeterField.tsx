'use client';

import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, Trash2 } from 'lucide-react';
import { kompresFoto } from '@/lib/foto';

interface FotoMeterFieldProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  wajib?: boolean;
}

// Isian foto meteran: membuka kamera belakang di HP, lalu menampilkan pratinjau kecil.
export default function FotoMeterField({ id, label, value, onChange, wajib }: FotoMeterFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [memproses, setMemproses] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setMemproses(true);
    try {
      onChange(await kompresFoto(file));
    } catch (err: any) {
      setError(err.message || 'Foto gagal diproses.');
    } finally {
      setMemproses(false);
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: '16px' }}>
      <label className="form-label" htmlFor={id} style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Camera size={16} color="#38bdf8" aria-hidden="true" /> {label}
        {wajib ? <span style={{ color: 'var(--c-red)' }}> *</span> : <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}> (opsional)</span>}
      </label>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
      />
      {value ? (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <img src={value} alt="Foto meteran yang diambil" style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--glass-border)' }} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={memproses}>
              <RefreshCw size={14} aria-hidden="true" /> Ganti foto
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(null)}>
              <Trash2 size={14} aria-hidden="true" /> Hapus
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()} disabled={memproses} style={{ width: '100%', minHeight: '48px' }}>
          <Camera size={18} aria-hidden="true" /> {memproses ? 'Memproses foto...' : 'Foto meteran sekarang'}
        </button>
      )}
      {error && <div role="alert" style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--c-red)' }}>{error}</div>}
    </div>
  );
}
