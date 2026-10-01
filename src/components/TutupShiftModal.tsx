'use client';

import React, { useState, useEffect } from 'react';
import { AppStore } from '@/lib/store';
import { ShiftKasir, UserApp } from '@/lib/types';
import FotoMeterField from '@/components/FotoMeterField';
import KepalaStruk from '@/components/KepalaStruk';
import { cetakStrukBaris, namaCetak, susunStrukTutupShift } from '@/lib/cetak';
import { Lock, Droplets, Banknote, AlertTriangle, CheckCircle2, X, Printer, Share2 } from 'lucide-react';

interface TutupShiftModalProps {
  isOpen: boolean;
  shiftAktif: ShiftKasir | null;
  onClose: () => void;
  onShiftClosed: (closedShift: ShiftKasir) => void;
}

export default function TutupShiftModal({ isOpen, shiftAktif, onClose, onShiftClosed }: TutupShiftModalProps) {
  const [kasAkhir, setKasAkhir] = useState<number | ''>('');
  const [meterAkhir, setMeterAkhir] = useState<number | ''>('');
  const [fotoMeter, setFotoMeter] = useState<string | null>(null);
  const [serah, setSerah] = useState<number | ''>(''); // '' = seluruh uang laci

  const [closedShiftResult, setClosedShiftResult] = useState<{
    shift: ShiftKasir;
    kasFisik: number;
    meterAkhir: number;
    saldoEkspektasiKas: number;
    selisihKas: number;
    pemakaianAir: number;
    totalTunai: number;
    totalKeluar: number;
    totalPengembalian: number;
    totalSetoranKurir: number;
    uangDiKurir: number;
    diserahkanSebelumnya: number;
    serahOwner: number;
    sisaLaci: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen && shiftAktif) {
      setKasAkhir('');
      setSerah('');
      setFotoMeter(null);
      setMeterAkhir(shiftAktif.meter_awal || 0);
      setClosedShiftResult(null);
    }
  }, [isOpen, shiftAktif]);

  if (!isOpen || !shiftAktif) return null;

  const shiftBukaTime = new Date(shiftAktif.waktu_buka).getTime();
  const allPesanan = AppStore.getPesanan().filter(p => new Date(p.created_at).getTime() >= shiftBukaTime);
  // Tunai langsung (pesanan antar tunai tidak dihitung, uangnya lewat kurir) + setoran kurir yang diterima
  const totalTunaiLangsung = AppStore.totalTunaiLangsung(allPesanan);
  const totalSetoranKurir = AppStore.totalSetoranSejak(shiftBukaTime);
  const totalTunai = totalTunaiLangsung + totalSetoranKurir;
  const kurirMembawaUang = AppStore.getSaldoKurirList().filter(k => k.saldo > 0);
  const uangDiKurir = kurirMembawaUang.reduce((acc, k) => acc + k.saldo, 0);

  const kasLaci = AppStore.hitungKasLaci(shiftAktif.saldo_awal, shiftBukaTime);
  const totalKeluar = kasLaci.keluar;
  const totalPengembalian = kasLaci.kasbonKembali;
  const diserahkanSebelumnya = kasLaci.diserahkanOwner;

  const saldoEkspektasiKas = kasLaci.ekspektasi;
  const numericKasAkhir = Number(kasAkhir) || 0;
  // Bawaan: seluruh uang di laci diserahkan ke owner
  const serahOwner = serah === '' ? numericKasAkhir : Math.min(Math.max(0, Number(serah) || 0), numericKasAkhir);
  const sisaLaci = numericKasAkhir - serahOwner;
  const numericMeterAkhir = Number(meterAkhir) || 0;
  const selisihKas = numericKasAkhir - saldoEkspektasiKas;
  const pemakaianAir = Math.max(0, numericMeterAkhir - (shiftAktif.meter_awal || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kasAkhir === '' || isNaN(numericKasAkhir) || numericKasAkhir < 0) {
      alert('Uang Kas Akhir di Tangan WAJIB diisi!');
      return;
    }
    if (meterAkhir === '' || isNaN(numericMeterAkhir) || numericMeterAkhir < 0) {
      alert('Meteran Air Akhir WAJIB diisi!');
      return;
    }
    if (numericMeterAkhir < (shiftAktif.meter_awal || 0)) {
      alert(`Meteran Air Akhir (${numericMeterAkhir}) tidak boleh lebih kecil dari Meteran Air Awal (${shiftAktif.meter_awal})!`);
      return;
    }

    const modeFoto = AppStore.getModeFotoMeter();
    if (modeFoto === 'wajib' && !fotoMeter) {
      alert('Foto meteran air akhir wajib diambil dulu.');
      return;
    }

    try {
      const closedShift = AppStore.tutupShift(shiftAktif.id, numericKasAkhir, numericMeterAkhir, serahOwner);
      if (fotoMeter && modeFoto !== 'nonaktif' && !AppStore.simpanFotoMeter(shiftAktif.id, 'akhir', fotoMeter)) {
        alert('Shift sudah ditutup, tapi foto meteran tidak tersimpan (penyimpanan perangkat penuh).');
      }

      setClosedShiftResult({
        shift: closedShift,
        kasFisik: numericKasAkhir,
        meterAkhir: numericMeterAkhir,
        saldoEkspektasiKas,
        selisihKas,
        pemakaianAir,
        totalTunai,
        totalKeluar,
        totalPengembalian,
        totalSetoranKurir,
        uangDiKurir,
        diserahkanSebelumnya,
        serahOwner,
        sisaLaci
      });
    } catch (err: any) {
      alert(err.message || 'Gagal menutup shift!');
    }
  };

  const handlePrint = () => {
    if (!closedShiftResult) {
      window.print();
      return;
    }
    const r = closedShiftResult;
    const owner = AppStore.getUsers().find((u: UserApp) => u.role === 'owner');
    cetakStrukBaris(susunStrukTutupShift({
      kasir: r.shift.kasir_nama || AppStore.getCurrentUser().nama,
      waktuBuka: r.shift.waktu_buka,
      waktuTutup: r.shift.waktu_tutup || new Date().toISOString(),
      modalAwal: r.shift.saldo_awal,
      penjualanTunai: r.totalTunai - r.totalSetoranKurir,
      setoranKurir: r.totalSetoranKurir,
      pelunasanKasbon: r.totalPengembalian,
      pengeluaran: r.totalKeluar,
      diserahkanSebelumnya: r.diserahkanSebelumnya,
      ekspektasi: r.saldoEkspektasiKas,
      uangDiKurir: r.uangDiKurir,
      serahOwner: r.serahOwner,
      kasFisik: r.kasFisik,
      sisaLaci: r.sisaLaci,
      selisih: r.selisihKas,
      meterAwal: r.shift.meter_awal || 0,
      meterAkhir: r.meterAkhir,
      pemakaianAir: r.pemakaianAir,
      ownerNama: owner?.nama || ''
    }, AppStore.getPengaturan()));
  };

  const handleSendWAOwner = () => {
    if (!closedShiftResult) return;
    const { shift, kasFisik, meterAkhir, saldoEkspektasiKas, selisihKas, pemakaianAir, totalTunai, totalKeluar, totalPengembalian, totalSetoranKurir, uangDiKurir, diserahkanSebelumnya, serahOwner, sisaLaci } = closedShiftResult;
    const pengaturan = AppStore.getPengaturan();
    const users = AppStore.getUsers();
    const ownerUser = users.find((u: UserApp) => u.role === 'owner');
    const rawPhone = ownerUser?.no_hp || pengaturan.no_wa || '';
    
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    let msg = `*🔒 LAPORAN PENUTUPAN SHIFT & SETORAN KAS OWNER*\n`;
    msg += `--------------------------------\n`;
    msg += `*Depo:* ${namaCetak(pengaturan)}\n`;
    msg += `*Kasir Bertugas:* ${shift.kasir_nama || AppStore.getCurrentUser().nama}\n`;
    msg += `*Waktu Buka:* ${new Date(shift.waktu_buka).toLocaleString('id-ID')}\n`;
    msg += `*Waktu Tutup:* ${new Date().toLocaleString('id-ID')}\n`;
    msg += `--------------------------------\n`;
    msg += `*Rincian Arus Uang Kas Laci:*\n`;
    msg += `• Modal Kas Awal: ${AppStore.formatRupiah(shift.saldo_awal)}\n`;
    msg += `• Penjualan Tunai Masuk: +${AppStore.formatRupiah(totalTunai - totalSetoranKurir)}\n`;
    if (totalSetoranKurir > 0) {
      msg += `• Setoran Kurir Masuk: +${AppStore.formatRupiah(totalSetoranKurir)}\n`;
    }
    if (totalPengembalian > 0) {
      msg += `• Pelunasan Kasbon Masuk: +${AppStore.formatRupiah(totalPengembalian)}\n`;
    }
    msg += `• Pengeluaran Kas Keluar: -${AppStore.formatRupiah(totalKeluar)}\n`;
    if (diserahkanSebelumnya > 0) {
      msg += `• Sudah diserahkan ke Owner selama shift: -${AppStore.formatRupiah(diserahkanSebelumnya)}\n`;
    }
    msg += `• Ekspektasi Uang Laci: ${AppStore.formatRupiah(saldoEkspektasiKas)}\n`;
    msg += `--------------------------------\n`;
    msg += `*💵 UANG LACI SAAT TUTUP: ${AppStore.formatRupiah(kasFisik)}*\n`;
    msg += `*💰 DISERAHKAN KE OWNER: ${AppStore.formatRupiah(serahOwner)}*\n`;
    if (sisaLaci > 0) msg += `*🗄️ TETAP DI LACI: ${AppStore.formatRupiah(sisaLaci)}*\n`;
    msg += `*⚖️ SELISIH KAS: ${selisihKas === 0 ? 'PAS (Rp 0)' : AppStore.formatRupiah(selisihKas)}*\n`;
    msg += `--------------------------------\n`;
    msg += `*💧 Control Air Baku & Meteran Depo:*\n`;
    msg += `• Meteran Air Awal: ${(shift.meter_awal || 0).toLocaleString('id-ID')} Liter\n`;
    msg += `• Meteran Air Akhir: ${meterAkhir.toLocaleString('id-ID')} Liter\n`;
    msg += `• *Total Air Terpakai: ${pemakaianAir.toLocaleString('id-ID')} Liter*\n`;
    msg += `--------------------------------\n`;
    msg += `_Laporan penutupan shift otomatis dari Kasir ${namaCetak(pengaturan)}_`;

    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    
    window.open(url, '_blank');
  };

  const handleFinishAndLogout = () => {
    if (closedShiftResult) {
      onShiftClosed(closedShiftResult.shift);
    } else {
      onClose();
    }
  };

  const pengaturan = AppStore.getPengaturan();
  const users = AppStore.getUsers();
  const ownerUser = users.find((u: UserApp) => u.role === 'owner');
  const rawPhone = ownerUser?.no_hp || pengaturan.no_wa || '';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px', overflowY: 'auto'
    }}>
      <div className="glass-card animate-fade-in" style={{ margin: 'auto',
        width: '100%', maxWidth: closedShiftResult ? '480px' : '480px', backgroundColor: 'var(--surface-solid)', border: '2px solid var(--c-red-strong)',
        borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div className="no-print" style={{
          padding: '20px 24px', background: closedShiftResult ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(2, 132, 199, 0.2) 100%)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(245, 158, 11, 0.2) 100%)',
          borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', background: closedShiftResult ? 'linear-gradient(135deg, var(--c-green-strong), var(--c-green-deep))' : 'linear-gradient(135deg, var(--c-red-strong), var(--c-red))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}>
              {closedShiftResult ? <CheckCircle2 size={24} color="#ffffff" /> : <Lock size={24} color="#ffffff" />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {closedShiftResult ? 'SHIFT BERHASIL DITUTUP!' : 'ENTRI TUTUP SHIFT KASIR'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', margin: '2px 0 0 0' }}>
                {closedShiftResult ? 'Ringkasan Setoran Kas & Meteran Air Baku' : 'Wajib Isi Hasil Kas di Tangan & Meteran Akhir'}
              </p>
            </div>
          </div>
          <button aria-label="Tutup" onClick={closedShiftResult ? handleFinishAndLogout : onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        {!closedShiftResult ? (
          /* Form View */
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {/* Quick Summary Shift Awal */}
            <div style={{
              background: 'var(--inset-70)', borderRadius: '12px', padding: '14px', border: '1px solid var(--glass-border)',
              marginBottom: '18px', fontSize: '0.83rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Kasir Bertugas:</span>
                <span style={{ fontWeight: 700, color: 'var(--c-sky)' }}>{shiftAktif.kasir_nama || AppStore.getCurrentUser().nama}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Modal Kas Awal:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{AppStore.formatRupiah(shiftAktif.saldo_awal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Meteran Air Awal:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{(shiftAktif.meter_awal || 0).toLocaleString('id-ID')} Liter</span>
              </div>
              {totalSetoranKurir > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Setoran kurir diterima:</span>
                  <span style={{ fontWeight: 700, color: 'var(--c-green)' }}>+{AppStore.formatRupiah(totalSetoranKurir)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed var(--w-30)' }}>
                <span style={{ color: 'var(--c-blue-soft)', fontWeight: 600 }}>Ekspektasi Kas Laci:</span>
                <span style={{ fontWeight: 800, color: 'var(--c-green)' }}>{AppStore.formatRupiah(saldoEkspektasiKas)}</span>
              </div>
            </div>

            {uangDiKurir > 0 && (
              <div role="status" style={{
                marginBottom: '18px', padding: '12px 14px', borderRadius: '12px', fontSize: '0.85rem',
                background: 'rgba(245, 158, 11, 0.14)', border: '1px solid rgba(180, 83, 9, 0.45)', color: 'var(--text-main)'
              }}>
                <strong style={{ color: 'var(--c-amber)' }}>Masih ada uang di kurir: {AppStore.formatRupiah(uangDiKurir)}</strong>
                <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                  {kurirMembawaUang.map(k => k.kurir_nama + ' ' + AppStore.formatRupiah(k.saldo)).join(' - ')}. Uang ini belum masuk laci, jadi tidak dihitung dalam ekspektasi kas. Kalau kurirnya ada di depo, catat setorannya dulu lewat menu Lainnya. Kalau tidak, tutup shift tetap bisa dan saldo kurir dibawa ke shift berikutnya.
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Banknote size={16} color="#34d399" /> Hasil Hitung Kas Akhir Di Tangan (Rp) <span style={{ color: 'var(--c-red)' }}>*</span>
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={kasAkhir} 
                onChange={(e) => setKasAkhir(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Hitung seluruh uang kertas/koin di laci kasir"
                required 
                min="0"
                style={{ fontSize: '1.1rem', fontWeight: 700, padding: '12px 14px' }}
              />
            </div>

            {kasAkhir !== '' && numericKasAkhir > 0 && (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="serah-owner" style={{ fontWeight: 700 }}>
                  Uang yang diserahkan ke owner (Rp)
                </label>
                <input
                  id="serah-owner"
                  type="number"
                  className="form-input"
                  value={serah === '' ? numericKasAkhir : serah}
                  onChange={(e) => setSerah(e.target.value === '' ? 0 : Number(e.target.value))}
                  min="0"
                  max={numericKasAkhir}
                  style={{ fontSize: '1.1rem', fontWeight: 700, padding: '12px 14px' }}
                />
                <div style={{ marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Bawaannya semua uang laci. Yang tetap di laci: <strong>{AppStore.formatRupiah(sisaLaci)}</strong>
                  {' '}(terbawa ke shift berikutnya). Owner akan menerima dan memeriksa jumlahnya.
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Droplets size={16} color="#38bdf8" /> Meteran Air Akhir Depo (Liter) <span style={{ color: 'var(--c-red)' }}>*</span>
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={meterAkhir} 
                onChange={(e) => setMeterAkhir(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={`Minimal ${(shiftAktif.meter_awal || 0)} Liter`}
                required 
                min={shiftAktif.meter_awal || 0}
                style={{ fontSize: '1.1rem', fontWeight: 700, padding: '12px 14px' }}
              />
            </div>

            {AppStore.getModeFotoMeter() !== 'nonaktif' && (
              <FotoMeterField id="foto-meter-akhir" label="Foto meteran air akhir" value={fotoMeter} onChange={setFotoMeter} wajib={AppStore.getModeFotoMeter() === 'wajib'} />
            )}

            {/* Live Math Calculation Preview */}
            {kasAkhir !== '' && (
              <div style={{
                background: 'var(--inset-80)', padding: '12px 16px', borderRadius: '12px',
                border: '1px solid var(--glass-border)', marginBottom: '20px', fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Total Air Baku Terpakai:</span>
                  <strong style={{ color: 'var(--c-sky)' }}>{pemakaianAir.toLocaleString('id-ID')} Liter</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Selisih Kas Fisik:</span>
                  <strong style={{ color: selisihKas === 0 ? 'var(--c-green)' : selisihKas > 0 ? 'var(--c-sky)' : 'var(--c-red)' }}>
                    {selisihKas === 0 ? 'PAS (Rp 0)' : AppStore.formatRupiah(selisihKas)}
                  </strong>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-danger btn-lg" 
              style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              TUTUP SHIFT, SETOR KAS &amp; CEK STRUK
            </button>
          </form>
        ) : (
          /* Result Printable Receipt & WA View */
          <div>
            {/* Printable Thermal Receipt */}
            <div style={{
              padding: '24px', background: '#ffffff', color: '#000000', fontFamily: 'monospace', fontSize: '0.85rem',
              lineHeight: '1.4', maxHeight: '65vh', overflowY: 'auto'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                {pengaturan.logo_url && (
                  <img src={pengaturan.logo_url} alt={pengaturan.nama_depo} style={{ maxHeight: '45px', maxWidth: '120px', objectFit: 'contain', marginBottom: '6px' }} />
                )}
                <KepalaStruk pengaturan={pengaturan} rapat />
                <p style={{ fontSize: '0.75rem', color: '#555', margin: '2px 0' }}>Telp/WA Owner: {rawPhone || '-'}</p>
                <p style={{ marginTop: '8px', marginBottom: '4px' }}>================================</p>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', margin: '4px 0' }}>
                  STRUK LAPORAN SHIFT &amp; SETORAN KAS
                </h4>
                <p style={{ margin: 0 }}>================================</p>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <div>Kasir    : {closedShiftResult.shift.kasir_nama || AppStore.getCurrentUser().nama}</div>
                <div>Buka     : {new Date(closedShiftResult.shift.waktu_buka).toLocaleString('id-ID')}</div>
                <div>Tutup    : {new Date().toLocaleString('id-ID')}</div>
                <p style={{ margin: '6px 0 4px 0' }}>--------------------------------</p>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>RINCIAN KAS LACI:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Modal Awal Kas</span>
                  <span>{AppStore.formatRupiah(closedShiftResult.shift.saldo_awal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Penjualan Tunai (+)</span>
                  <span>{AppStore.formatRupiah(closedShiftResult.totalTunai - closedShiftResult.totalSetoranKurir)}</span>
                </div>
                {closedShiftResult.totalSetoranKurir > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Setoran Kurir (+)</span>
                    <span>{AppStore.formatRupiah(closedShiftResult.totalSetoranKurir)}</span>
                  </div>
                )}
                {closedShiftResult.totalPengembalian > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pelunasan Kasbon (+)</span>
                    <span>{AppStore.formatRupiah(closedShiftResult.totalPengembalian)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pengeluaran Kas (-)</span>
                  <span>-{AppStore.formatRupiah(closedShiftResult.totalKeluar)}</span>
                </div>
                {closedShiftResult.diserahkanSebelumnya > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Diserahkan ke Owner (-)</span>
                    <span>-{AppStore.formatRupiah(closedShiftResult.diserahkanSebelumnya)}</span>
                  </div>
                )}
                <p style={{ margin: '4px 0' }}>--------------------------------</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Ekspektasi Uang Kas</span>
                  <span>{AppStore.formatRupiah(closedShiftResult.saldoEkspektasiKas)}</span>
                </div>
                {closedShiftResult.uangDiKurir > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span>Uang di kurir (belum disetor)</span>
                    <span>{AppStore.formatRupiah(closedShiftResult.uangDiKurir)}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '6px 0', margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem' }}>
                  <span>KAS DISETOR OWNER</span>
                  <span>{AppStore.formatRupiah(closedShiftResult.serahOwner)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '2px' }}>
                  <span>Uang laci saat tutup</span>
                  <span>{AppStore.formatRupiah(closedShiftResult.kasFisik)}</span>
                </div>
                {closedShiftResult.sisaLaci > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '2px' }}>
                    <span>Tetap di laci</span>
                    <span>{AppStore.formatRupiah(closedShiftResult.sisaLaci)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '2px' }}>
                  <span>Status Selisih Kas</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {closedShiftResult.selisihKas === 0 ? 'PAS (Rp 0)' : AppStore.formatRupiah(closedShiftResult.selisihKas)}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '12px', marginTop: '10px' }}>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>AIR BAKU &amp; METERAN:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Meteran Air Awal</span>
                  <span>{(closedShiftResult.shift.meter_awal || 0).toLocaleString('id-ID')} Liter</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Meteran Air Akhir</span>
                  <span>{closedShiftResult.meterAkhir.toLocaleString('id-ID')} Liter</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '2px' }}>
                  <span>Total Pemakaian Air</span>
                  <span>{closedShiftResult.pemakaianAir.toLocaleString('id-ID')} Liter</span>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center', marginTop: '18px', fontSize: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0 }}>Diserahkan Oleh</p>
                  <div style={{ height: '35px' }}></div>
                  <p style={{ fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '2px', margin: 0 }}>
                    ( {closedShiftResult.shift.kasir_nama || AppStore.getCurrentUser().nama} )
                  </p>
                  <span style={{ fontSize: '0.65rem', color: '#666' }}>Kasir Bertugas</span>
                </div>
                <div>
                  <p style={{ margin: 0 }}>Diterima Oleh</p>
                  <div style={{ height: '35px' }}></div>
                  <p style={{ fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '2px', margin: 0 }}>
                    ( {ownerUser?.nama || 'Owner / Pengelola'} )
                  </p>
                  <span style={{ fontSize: '0.65rem', color: '#666' }}>Owner Depo</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.7rem', color: '#666' }}>
                <p style={{ margin: '4px 0' }}>================================</p>
                <p style={{ margin: 0 }}>{pengaturan.footer_struk || 'Struk Laporan Shift Sah Depo Air'}</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="no-print" style={{
              padding: '16px 20px', borderTop: '1px solid var(--glass-border)',
              display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--inset-90)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={handlePrint} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}>
                  <Printer size={16} /> Cetak Struk Shift
                </button>
                <button onClick={handleSendWAOwner} className="btn btn-success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}>
                  <Share2 size={16} /> Kirim WA ke Owner
                </button>
              </div>
              <button onClick={handleFinishAndLogout} className="btn btn-primary btn-lg" style={{ width: '100%', fontWeight: 800 }}>
                Selesai &amp; Logout Kasir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

