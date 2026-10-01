'use client';

import React, { useState, useEffect } from 'react';
import { AppStore } from '@/lib/store';
import { Pesanan, Pengeluaran, HutangToko, ShiftKasir, UserApp } from '@/lib/types';
import BukaShiftModal from '@/components/BukaShiftModal';
import TutupShiftModal from '@/components/TutupShiftModal';
import { cetakRekapBaris, susunRekapShift } from '@/lib/cetak';
import { 
  Receipt, DollarSign, CreditCard, Lock, CheckCircle, 
  TrendingDown, Trash2, ArrowDownCircle, Banknote, AlertCircle, BookOpen, Check, Droplets,
  Printer, Share2
} from 'lucide-react';

export default function ShiftKasirPage() {
  const [pesananHariIni, setPesananHariIni] = useState<Pesanan[]>([]);
  const [pengeluaranHariIni, setPengeluaranHariIni] = useState<Pengeluaran[]>([]);
  const [hutangTokoList, setHutangTokoList] = useState<HutangToko[]>([]);
  const [shiftAktif, setShiftAktif] = useState<ShiftKasir | null>(null);
  const [showBukaModal, setShowBukaModal] = useState<boolean>(false);
  const [showTutupModal, setShowTutupModal] = useState<boolean>(false);
  const [shiftDitutup, setShiftDitutup] = useState<ShiftKasir | null>(null);
  const [saldoAwal, setSaldoAwal] = useState<number>(0);
  const [saldoAktual, setSaldoAktual] = useState<number>(0);
  const [isShiftTutup, setIsShiftTutup] = useState<boolean>(false);

  const loadData = () => {
    const allPesanan = AppStore.getPesanan();
    const allPengeluaran = AppStore.getPengeluaran();
    setHutangTokoList(AppStore.getHutangToko());

    const active = AppStore.getShiftAktif();
    setShiftAktif(active);

    if (active) {
      setSaldoAwal(active.saldo_awal);
      setIsShiftTutup(false);
      setShowBukaModal(false);

      const shiftBukaTime = new Date(active.waktu_buka).getTime();
      const shiftPesanan = allPesanan.filter(p => new Date(p.created_at).getTime() >= shiftBukaTime);
      const shiftPengeluaran = allPengeluaran.filter(p => new Date(p.tanggal).getTime() >= shiftBukaTime);

      setPesananHariIni(shiftPesanan);
      setPengeluaranHariIni(shiftPengeluaran);
    } else {
      setIsShiftTutup(true);
      const today = new Date().toDateString();
      setPesananHariIni(allPesanan.filter(p => new Date(p.created_at).toDateString() === today));
      setPengeluaranHariIni(allPengeluaran.filter(p => new Date(p.tanggal).toDateString() === today));
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('depo_pesanan_updated', handleUpdate);
    window.addEventListener('depo_pengeluaran_updated', handleUpdate);
    window.addEventListener('depo_hutang_toko_updated', handleUpdate);
    window.addEventListener('depo_shift_updated', handleUpdate);
    window.addEventListener('depo_setoran_kurir_updated', handleUpdate);
    window.addEventListener('depo_setoran_owner_updated', handleUpdate);

    return () => {
      window.removeEventListener('depo_setoran_owner_updated', handleUpdate);
      window.removeEventListener('depo_pesanan_updated', handleUpdate);
      window.removeEventListener('depo_pengeluaran_updated', handleUpdate);
      window.removeEventListener('depo_hutang_toko_updated', handleUpdate);
      window.removeEventListener('depo_shift_updated', handleUpdate);
      window.removeEventListener('depo_setoran_kurir_updated', handleUpdate);
    };
  }, []);

  // Tunai langsung + setoran kurir hari ini (pesanan antar tunai baru masuk laci saat kurir menyetor)
  const awalHariIni = new Date(); awalHariIni.setHours(0, 0, 0, 0);
  const kasLaci = AppStore.hitungKasLaci(saldoAwal, shiftAktif ? new Date(shiftAktif.waktu_buka).getTime() : awalHariIni.getTime());
  const totalSetoranHariIni = kasLaci.setoranKurir;
  const totalTunai = kasLaci.tunaiMasuk;
  const totalDiserahkanOwner = kasLaci.diserahkanOwner;
  const uangDiKurir = AppStore.getTotalUangDiKurir();

  const totalNonTunai = pesananHariIni
    .filter(p => p.pembayaran_details.some(d => d.metode !== 'tunai' && d.metode !== 'hutang'))
    .reduce((acc, p) => acc + p.total_akhir, 0);

  const totalHutang = pesananHariIni
    .filter(p => p.status_pembayaran === 'hutang')
    .reduce((acc, p) => acc + p.total_akhir, 0);

  const totalOmzet = pesananHariIni.reduce((acc, p) => acc + p.total_akhir, 0);
  
  // Total Pengeluaran Kasir Hari Ini (Kas Keluar vs Kas Masuk Pengembalian Kasbon)
  // Hanya pengeluaran bersumber laci yang dihitung (pembayaran owner dari kas besar tidak mengurangi laci)
  const totalPengeluaranKeluar = kasLaci.keluar;
  const totalPengembalianKasbon = kasLaci.kasbonKembali;

  // Saldo laci = modal awal + tunai masuk + pelunasan kasbon - pengeluaran laci - uang yang sudah diserahkan ke owner
  const saldoEkspektasiKas = kasLaci.ekspektasi;
  const saldoKasirDisetorOwner = Math.max(0, saldoEkspektasiKas);
  const selisih = saldoAktual ? saldoAktual - saldoEkspektasiKas : 0;

  const handleDeletePengeluaran = (id: string, peruntukan: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus catatan pengeluaran "${peruntukan}"?`)) {
      AppStore.deletePengeluaran(id);
    }
  };

  const handleTutupKasir = () => {
    setShiftDitutup(shiftAktif); // ditahan supaya struk tutup shift tetap tampil setelah shift tidak lagi aktif
    setShowTutupModal(true);
  };

  const handlePrintRekap = () => {
    const pengCetak = AppStore.getPengaturan();
    const perProduk = new Map<string, number>();
    pesananHariIni.forEach(ps => (ps.items || []).forEach(it => perProduk.set(it.nama_produk, (perProduk.get(it.nama_produk) || 0) + (it.jumlah || 0))));
    const meterAwal = shiftAktif?.meter_awal ?? pengCetak.meteran_air_awal_liter ?? 0;
    cetakRekapBaris(susunRekapShift({
      kasir: shiftAktif?.kasir_nama || AppStore.getCurrentUser().nama,
      waktu: shiftAktif?.waktu_buka || new Date().toISOString(),
      status: isShiftTutup ? 'SUDAH DITUTUP' : 'SHIFT AKTIF',
      jumlahTransaksi: pesananHariIni.length,
      omzet: totalOmzet,
      tunaiLangsung: kasLaci.tunaiLangsung,
      setoranKurir: kasLaci.setoranKurir,
      nonTunai: totalNonTunai,
      hutang: totalHutang,
      produk: Array.from(perProduk.entries()).map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah),
      modalAwal: saldoAwal,
      kasbonMasuk: totalPengembalianKasbon,
      pengeluaran: totalPengeluaranKeluar,
      diserahkanOwner: totalDiserahkanOwner,
      ekspektasi: saldoEkspektasiKas,
      uangDiKurir,
      fisik: saldoAktual > 0 ? saldoAktual : undefined,
      selisih: saldoAktual > 0 ? selisih : undefined,
      meterAwal,
      meterAkhir: shiftAktif?.meter_akhir,
      daftarPengeluaran: pengeluaranHariIni
        .filter(x => x.tipe_arus_kas !== 'masuk' && x.kategori !== 'pengembalian_kasbon' && (!x.sumber_kas || x.sumber_kas === 'laci'))
        .map(x => ({ peruntukan: x.peruntukan, nominal: x.nominal }))
    }, pengCetak));
  };

  const handleSendWAOwner = () => {
    const pengaturan = AppStore.getPengaturan();
    const users = AppStore.getUsers();
    const ownerUser = users.find((u: UserApp) => u.role === 'owner');
    const rawPhone = ownerUser?.no_hp || pengaturan.no_wa || '';
    
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const currentKasir = AppStore.getCurrentUser();
    const meterAwal = shiftAktif?.meter_awal ?? pengaturan.meteran_air_awal_liter ?? 0;
    const meterAkhir = shiftAktif?.meter_akhir || meterAwal;
    const pemakaianAir = Math.max(0, meterAkhir - meterAwal);

    let msg = `*📊 REKAP SHIFT & SETORAN KAS KASIR*\n`;
    msg += `--------------------------------\n`;
    msg += `*Depo:* ${pengaturan.nama_depo}\n`;
    msg += `*Kasir:* ${currentKasir.nama}\n`;
    msg += `*Tanggal:* ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    msg += `*Status Shift:* ${isShiftTutup ? '🔒 SUDAH DITUTUP' : '🟢 SHIFT AKTIF'}\n`;
    msg += `--------------------------------\n`;
    msg += `*Rincian Arus Uang Kas Laci:*\n`;
    msg += `• Modal Kas Awal: ${AppStore.formatRupiah(saldoAwal)}\n`;
    msg += `• Penjualan Tunai Masuk: +${AppStore.formatRupiah(totalTunai)}\n`;
    if (totalPengembalianKasbon > 0) {
      msg += `• Pelunasan Kasbon Masuk: +${AppStore.formatRupiah(totalPengembalianKasbon)}\n`;
    }
    msg += `• Pengeluaran Kas Keluar: -${AppStore.formatRupiah(totalPengeluaranKeluar)}\n`;
    if (totalDiserahkanOwner > 0) {
      msg += `• Sudah diserahkan ke Owner: -${AppStore.formatRupiah(totalDiserahkanOwner)}\n`;
    }
    msg += `--------------------------------\n`;
    msg += `*💰 KAS FISIK DISETOR KE OWNER: ${AppStore.formatRupiah(saldoKasirDisetorOwner)}*\n`;
    if (saldoAktual > 0) {
      msg += `*⚖️ SELISIH KAS: ${selisih === 0 ? 'PAS (Rp 0)' : AppStore.formatRupiah(selisih)}*\n`;
    }
    msg += `--------------------------------\n`;
    msg += `*💧 Meteran Air Baku Depo:*\n`;
    msg += `• Meteran Air Awal: ${meterAwal.toLocaleString('id-ID')} Liter\n`;
    if (shiftAktif?.meter_akhir) {
      msg += `• Meteran Air Akhir: ${meterAkhir.toLocaleString('id-ID')} Liter\n`;
      msg += `• *Total Air Terpakai: ${pemakaianAir.toLocaleString('id-ID')} Liter*\n`;
    } else {
      msg += `• Status Meteran: Masih berjalan (Shift aktif)\n`;
    }
    msg += `--------------------------------\n`;
    msg += `_Laporan otomatis dari Kasir ${pengaturan.nama_depo}_`;

    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    
    window.open(url, '_blank');
  };

  const pengaturan = AppStore.getPengaturan();
  const stokAirBakuShift = pengaturan.stok_air_baku_saat_ini ?? 5000;
  const minStokAirBakuShift = pengaturan.min_stok_air_baku_liter || 2000;
  const isWaterStockCriticalShift = (pengaturan.notifikasi_air_baku_aktif !== false) && (stokAirBakuShift <= minStokAirBakuShift);

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto' }}>
      {/* BANNER ALARM PERINGATAN STOK AIR BAKU MENIPIS */}
      {isWaterStockCriticalShift && (
        <div className="glass-card animate-fade-in no-print" style={{
          padding: '16px 20px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(185, 28, 28, 0.35) 100%)',
          border: '2px solid var(--c-red-strong)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Droplets size={26} color="#ef4444" className="animate-pulse" />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-strong)' }}>
                  ALARM: STOK AIR BAKU TANGKI DEPO MENIPIS! ({stokAirBakuShift.toLocaleString('id-ID')} Liter)
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--c-red-soft)', marginTop: '2px' }}>
                  Stok saat ini ({stokAirBakuShift.toLocaleString('id-ID')} L) telah mencapai / di bawah batas minimum pengingat (Min: {minStokAirBakuShift.toLocaleString('id-ID')} L). Segera infokan ke Owner / Admin atau pesan pasokan air baku tangki!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card animate-fade-in" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={24} color="#0284c7" /> Rekap Shift &amp; Kas Setoran Owner
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
              Tanggal: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={handlePrintRekap} className="btn btn-secondary btn-sm no-print" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={15} /> Cetak Struk
            </button>
            <button onClick={handleSendWAOwner} className="btn btn-success btn-sm no-print" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Share2 size={15} /> Kirim WA ke Owner
            </button>
            <span className={`badge ${isShiftTutup ? 'badge-danger' : 'badge-success'}`}>
              {isShiftTutup ? 'SHIFT DITUTUP' : 'SHIFT AKTIF'}
            </span>
          </div>
        </div>

        {/* Highlight Card: Kas Fisik Bersih Disetor Ke Owner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)',
          border: '2px solid var(--c-green)', borderRadius: '16px', padding: '20px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--c-blue-soft)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Banknote size={18} color="#34d399" /> ESTIMASI KAS FISIK KASIR DISETOR KE OWNER
            </span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--c-green)', marginTop: '4px' }}>
              {AppStore.formatRupiah(saldoKasirDisetorOwner)}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '2px' }}>
              Formula: (Modal Awal + Tunai Masuk + Pelunasan Kasbon) - Total Pengeluaran Keluar
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'right', background: 'var(--inset-60)', padding: '10px 16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kas Penjualan Tunai: <strong style={{ color: 'var(--c-sky)' }}>+{AppStore.formatRupiah(totalTunai)}</strong></div>
              {(uangDiKurir > 0 || totalSetoranHariIni > 0) && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Termasuk setoran kurir {AppStore.formatRupiah(totalSetoranHariIni)} - masih di kurir: <strong style={{ color: 'var(--c-amber)' }}>{AppStore.formatRupiah(uangDiKurir)}</strong>
                </div>
              )}
              {totalPengembalianKasbon > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Pengembalian Kasbon: <strong style={{ color: 'var(--c-green)' }}>+{AppStore.formatRupiah(totalPengembalianKasbon)}</strong></div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Total Pengeluaran Kas: <strong style={{ color: 'var(--c-red)' }}>-{AppStore.formatRupiah(totalPengeluaranKeluar)}</strong></div>
              {totalDiserahkanOwner > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Diserahkan ke Owner: <strong style={{ color: 'var(--c-red)' }}>-{AppStore.formatRupiah(totalDiserahkanOwner)}</strong></div>
              )}
            </div>
            <div className="no-print" style={{ display: 'flex', gap: '6px' }}>
              <button onClick={handlePrintRekap} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Printer size={13} /> Cetak
              </button>
              <button onClick={handleSendWAOwner} className="btn btn-success btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Share2 size={13} /> Kirim WA
              </button>
            </div>
          </div>
        </div>

        {/* Ringkasan Kas Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div className="glass-card" style={{ padding: '16px', background: 'var(--inset-60)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Penjualan Omzet</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-sky)', marginTop: '4px' }}>
              {AppStore.formatRupiah(totalOmzet)}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pesananHariIni.length} Transaksi Hari Ini</span>
          </div>

          <div className="glass-card" style={{ padding: '16px', background: 'var(--inset-60)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kas Tunai Masuk</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-green)', marginTop: '4px' }}>
              {AppStore.formatRupiah(totalTunai)}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Terima Uang Tunai</span>
          </div>

          <div className="glass-card" style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--c-red-soft)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingDown size={14} color="#f87171" /> Pengeluaran Kasir
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-red)', marginTop: '4px' }}>
              -{AppStore.formatRupiah(totalPengeluaranKeluar)}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--c-red-soft)' }}>Ongkir, Gaji, Kasbon, dll</span>
          </div>

          <div className="glass-card" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--c-green-soft)' }}>Pengembalian Kasbon</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-green)', marginTop: '4px' }}>
              +{AppStore.formatRupiah(totalPengembalianKasbon)}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--c-green-soft)' }}>Masuk Laci Kasir</span>
          </div>

          <div className="glass-card" style={{ padding: '16px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--c-blue-soft)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Droplets size={14} color="#38bdf8" /> Meteran Air Depo
            </span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--c-sky)', marginTop: '4px' }}>
              Awal: {(shiftAktif?.meter_awal ?? AppStore.getPengaturan().meteran_air_awal_liter ?? 0).toLocaleString('id-ID')} L
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
              {shiftAktif?.meter_akhir ? `Akhir: ${shiftAktif.meter_akhir.toLocaleString('id-ID')} L (Pakai: ${(shiftAktif.total_pemakaian_air_liter || 0).toLocaleString('id-ID')} L)` : 'Shift sedang berlangsung'}
            </span>
          </div>
        </div>

        {/* Section: Daftar Entry Transaksi Kas & Peruntukan Hari Ini */}
        <div style={{ background: 'var(--inset-70)', padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingDown size={18} color="#f87171" /> Daftar Transaksi Kas &amp; Peruntukan Karyawan Hari Ini
            </h4>
            <span className="badge badge-warning">{pengeluaranHariIni.length} Transaksi Kas</span>
          </div>

          {pengeluaranHariIni.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', background: 'var(--inset-40)', borderRadius: '10px' }}>
              Belum ada entry transaksi pengeluaran/kasbon kasir hari ini.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', textAlign: 'left', background: 'var(--inset-60)' }}>
                    <th style={{ padding: '10px' }}>Waktu</th>
                    <th style={{ padding: '10px' }}>Isian Peruntukan / Keperluan</th>
                    <th style={{ padding: '10px' }}>Karyawan Terkait</th>
                    <th style={{ padding: '10px' }}>Kategori</th>
                    <th style={{ padding: '10px' }}>Kasir</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Nominal (Rp)</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pengeluaranHariIni.map(item => {
                    const isMasuk = item.tipe_arus_kas === 'masuk' || item.kategori === 'pengembalian_kasbon';

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--w-6)' }}>
                        <td style={{ padding: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(item.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {item.peruntukan}
                          {item.kategori === 'pembelian_air_baku' && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--c-sky)', marginTop: '2px', fontWeight: 500 }}>
                              Vendor: {item.nama_vendor_pengirim || '-'} | Vol: {item.volume_air_masuk_liter || 0} Liter | Harga Air: {AppStore.formatRupiah(item.harga_perolehan_air || 0)} | Tips Sopir: {AppStore.formatRupiah(item.tips_sopir_pengirim || 0)}
                            </div>
                          )}
                          {item.catatan && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{item.catatan}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--c-sky)', fontWeight: 600 }}>
                          {item.karyawan_nama ? (
                            <span>{item.karyawan_nama}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span className={`badge ${isMasuk ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                            {(item.kategori || 'lain_lain').replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-2)' }}>{item.kasir_nama}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: isMasuk ? 'var(--c-green)' : 'var(--c-red)' }}>
                          {isMasuk ? `+${AppStore.formatRupiah(item.nominal)}` : `-${AppStore.formatRupiah(item.nominal)}`}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button 
                            onClick={() => handleDeletePengeluaran(item.id, item.peruntukan)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Hapus Pengeluaran"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section: Daftar Catatan Hutang Toko (Karyawan & Orang Ketiga) */}
        <div style={{ background: 'var(--inset-70)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(251, 191, 36, 0.3)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} color="#fbbf24" /> Catatan Hutang Toko (Ke Karyawan &amp; Orang Ketiga)
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                Pelunasan hutang toko menggunakan uang kasir akan dicatat otomatis sebagai pengeluaran kas.
              </p>
            </div>
            <span className="badge badge-warning">{hutangTokoList.filter(h => h.status === 'belum_lunas').length} Belum Lunas</span>
          </div>

          {hutangTokoList.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', background: 'var(--inset-40)', borderRadius: '10px' }}>
              Tidak ada catatan hutang toko.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', textAlign: 'left', background: 'var(--inset-60)' }}>
                    <th style={{ padding: '10px' }}>Tanggal</th>
                    <th style={{ padding: '10px' }}>Nama Pihak (Kreditur)</th>
                    <th style={{ padding: '10px' }}>Tipe</th>
                    <th style={{ padding: '10px' }}>Peruntukan</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total Hutang</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Sisa Hutang</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {hutangTokoList.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--w-6)' }}>
                      <td style={{ padding: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {item.nama_pihak}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span className={`badge ${item.tipe_pihak === 'karyawan' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '0.68rem' }}>
                          {item.tipe_pihak === 'karyawan' ? 'KARYAWAN' : 'ORANG KE-3'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-2)' }}>
                        {item.peruntukan}
                        {item.catatan && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.catatan}</div>}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: 'var(--text-2)' }}>
                        {AppStore.formatRupiah(item.nominal_hutang)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: item.sisa_hutang > 0 ? 'var(--c-red)' : 'var(--c-green)' }}>
                        {AppStore.formatRupiah(item.sisa_hutang)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span className={`badge ${item.status === 'lunas' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem' }}>
                          {item.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          {item.sisa_hutang > 0 && (
                            <button 
                              onClick={() => {
                                const inputNominal = prompt(`Masukkan nominal pelunasan hutang toko untuk "${item.nama_pihak}":`, String(item.sisa_hutang));
                                if (inputNominal) {
                                  const num = Number(inputNominal);
                                  if (num > 0) {
                                    try {
                                      AppStore.bayarHutangToko(item.id, num);
                                      alert(`Pelunasan hutang toko sebesar ${AppStore.formatRupiah(num)} ke ${item.nama_pihak} berhasil diproses dan dicatat ke pengeluaran kas!`);
                                    } catch (err: any) {
                                      alert(err.message || 'Gagal memproses pelunasan');
                                    }
                                  }
                                }
                              }}
                              className="btn btn-success btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              Bayar Kas
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              if (confirm(`Hapus catatan hutang toko "${item.nama_pihak} - ${item.peruntukan}"?`)) {
                                AppStore.deleteHutangToko(item.id);
                              }
                            }}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 6px', fontSize: '0.72rem' }}
                            title="Hapus Catatan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Input Penghitungan Kas Fisik & Penutupan */}
        <div style={{ background: 'var(--inset-70)', padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>
            Penghitungan Uang Fisik Di Laci Kasir
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Modal Kas Awal (Rp)</label>
              <input 
                type="number" 
                className="form-input" 
                value={saldoAwal} 
                onChange={(e) => setSaldoAwal(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hitung Hasil Uang Fisik Laci (Rp)</label>
              <input 
                type="number" 
                className="form-input" 
                value={saldoAktual || ''} 
                onChange={(e) => setSaldoAktual(Number(e.target.value))}
                placeholder="Hasil hitung uang kertas di laci"
              />
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span>Ekspektasi Uang Di Laci (Awal + Tunai - Pengeluaran):</span>
              <span style={{ fontWeight: 700, color: 'var(--c-green)' }}>{AppStore.formatRupiah(saldoEkspektasiKas)}</span>
            </div>

            {saldoAktual > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, marginTop: '6px', color: selisih === 0 ? 'var(--c-green)' : selisih > 0 ? 'var(--c-sky)' : 'var(--c-red)' }}>
                <span>Selisih Kas Fisik:</span>
                <span>{selisih === 0 ? 'PAS (Rp 0)' : AppStore.formatRupiah(selisih)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {!isShiftTutup && shiftAktif ? (
          <button onClick={handleTutupKasir} className="btn btn-danger btn-lg" style={{ width: '100%', fontWeight: 800 }}>
            <Lock size={20} /> Tutup Shift &amp; Serahkan Kas Ke Owner
          </button>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px', color: 'var(--c-green)', fontWeight: 700 }}>
            <CheckCircle size={24} style={{ marginBottom: '6px' }} /><br />
            {shiftAktif ? (
              <span>Shift Kasir Berhasil Ditutup! Uang Kas Sebesar <strong>{AppStore.formatRupiah(saldoKasirDisetorOwner)}</strong> Siap Diserahkan Ke Owner.</span>
            ) : (
              <div>
                <p style={{ margin: '0 0 10px 0', color: 'var(--text-2)' }}>Tidak ada shift kasir yang sedang aktif saat ini.</p>
                <button onClick={() => setShowBukaModal(true)} className="btn btn-primary" style={{ fontWeight: 700 }}>
                  Entri Buka Shift Kasir Baru
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Shift Modals */}
      <BukaShiftModal 
        isOpen={showBukaModal} 
        onShiftOpened={() => {
          setShowBukaModal(false);
          loadData();
        }} 
      />

      <TutupShiftModal
        isOpen={showTutupModal}
        shiftAktif={shiftDitutup}
        onClose={() => { setShowTutupModal(false); setShiftDitutup(null); }}
        onShiftClosed={() => {
          setShowTutupModal(false);
          setShiftDitutup(null);
          loadData();
        }}
      />
    </div>
  );
}
