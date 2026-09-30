'use client';

import React, { useState, useEffect } from 'react';
import { Pesanan, PengaturanDepo, SaldoKurir, UserApp, Kontak } from '@/lib/types';
import { AppStore } from '@/lib/store';
import KonfirmasiTerkirimSheet from '@/components/KonfirmasiTerkirimSheet';
import RuteAntaran from '@/components/RuteAntaran';
import { ambilLokasiSaatIni, koordinatValid, urlNavigasiGoogleMaps } from '@/lib/geo';
import { calculateOrderDuration, alarmSound, formatThresholdText } from '@/lib/audioAndTimer';
import { Truck, MapPin, Phone, CheckCircle, Navigation, Clock, BellOff, AlertTriangle, Volume2, Package } from 'lucide-react';

export default function PengantarPage() {
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanDepo>(AppStore.getPengaturan());
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const [snoozedUntilMap, setSnoozedUntilMap] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [konfirmasiPesanan, setKonfirmasiPesanan] = useState<Pesanan | null>(null);
  const [saldoKurirList, setSaldoKurirList] = useState<SaldoKurir[]>([]);
  const [pengguna, setPengguna] = useState<UserApp | null>(null);
  const [kontakList, setKontakList] = useState<Kontak[]>([]);
  const [lokasiJobId, setLokasiJobId] = useState<string | null>(null);

  const loadData = () => {
    setPesananList(AppStore.getPesanan());
    setPengaturan(AppStore.getPengaturan());
    setSaldoKurirList(AppStore.getSaldoKurirList());
    setPengguna(AppStore.getCurrentUser());
    setKontakList(AppStore.getKontak());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('depo_pesanan_updated', loadData);
    window.addEventListener('depo_pengaturan_updated', loadData);
    window.addEventListener('depo_setoran_kurir_updated', loadData);
    window.addEventListener('depo_kontak_updated', loadData);

    // Refresh timer every 10 seconds to update duration
    const interval = setInterval(() => setNowTick(Date.now()), 10000);
    return () => {
      window.removeEventListener('depo_pesanan_updated', loadData);
      window.removeEventListener('depo_pengaturan_updated', loadData);
      window.removeEventListener('depo_setoran_kurir_updated', loadData);
      window.removeEventListener('depo_kontak_updated', loadData);
      clearInterval(interval);
    };
  }, []);

  const deliveryJobs = pesananList.filter(p => 
    p.status_pesanan === 'pending' || 
    p.status_pesanan === 'dijadwalkan' || 
    p.status_pesanan === 'dalam_perjalanan'
  );

  // Dynamic Settings Notifikasi Alarm
  const thresholdMins = pengaturan.batas_keterlambatan_menit || 90;
  const snoozeMins = pengaturan.durasi_snooze_menit || 15;
  const isAlarmEnabled = (pengaturan.notifikasi_alarm_aktif !== false) && (pengaturan.mode_suara_alarm !== 'silent');

  // Delayed Pending Orders based on dynamic threshold
  const delayedJobs = deliveryJobs.filter(job => {
    const durInfo = calculateOrderDuration(job.created_at, job.terkirim_at, job.status_pesanan, thresholdMins);
    return durInfo.isTerlambat;
  });

  const isOrderMuted = (id: string) => mutedIds.includes(id);

  const isOrderSnoozed = (id: string) => {
    const until = snoozedUntilMap[id];
    return until ? nowTick < until : false;
  };

  const getSnoozeRemainingMinutes = (id: string) => {
    const until = snoozedUntilMap[id];
    if (!until || nowTick >= until) return 0;
    return Math.max(1, Math.ceil((until - nowTick) / (1000 * 60)));
  };

  const hasActiveAlarm = isAlarmEnabled && delayedJobs.some(job => !isOrderMuted(job.id) && !isOrderSnoozed(job.id));

  useEffect(() => {
    if (hasActiveAlarm) {
      alarmSound.startAlarm();
    } else {
      alarmSound.stopAlarm();
    }
    return () => {
      alarmSound.stopAlarm();
    };
  }, [hasActiveAlarm]);

  const handleMuteJob = (id: string) => {
    setMutedIds(prev => Array.from(new Set([...prev, id])));
  };

  const handleMuteAll = () => {
    const allDelayedIds = delayedJobs.map(j => j.id);
    setMutedIds(prev => Array.from(new Set([...prev, ...allDelayedIds])));
  };

  const handleSnoozeJob = (id: string) => {
    const until = Date.now() + snoozeMins * 60 * 1000;
    setSnoozedUntilMap(prev => ({ ...prev, [id]: until }));
    setMutedIds(prev => prev.filter(mId => mId !== id));
  };

  const handleSnoozeAll = () => {
    const until = Date.now() + snoozeMins * 60 * 1000;
    const newMap = { ...snoozedUntilMap };
    delayedJobs.forEach(job => {
      newMap[job.id] = until;
    });
    setSnoozedUntilMap(newMap);
    const allDelayedIds = delayedJobs.map(j => j.id);
    setMutedIds(prev => prev.filter(mId => !allDelayedIds.includes(mId)));
  };

  // Kurir di depan rumah pelanggan: simpan lokasi GPS-nya ke data pelanggan
  const simpanLokasiPelanggan = async (job: Pesanan) => {
    const kontak = AppStore.getKontak().find(k => k.id === job.kontak_id);
    if (!kontak || kontak.id === 'kt-1') {
      alert('Pesanan ini tidak terhubung ke pelanggan terdaftar, jadi lokasinya tidak bisa disimpan.');
      return;
    }
    if (koordinatValid(kontak.lat, kontak.lng) && !confirm('Lokasi ' + kontak.nama + ' sudah tersimpan. Ganti dengan lokasimu sekarang?')) return;

    setLokasiJobId(job.id);
    try {
      const pos = await ambilLokasiSaatIni();
      if (pos.akurasiM > 100 && !confirm('Akurasi lokasi kurang baik (sekitar ' + pos.akurasiM + ' meter). Tetap simpan?')) return;
      const list = AppStore.getKontak().map(k => (k.id === kontak.id ? { ...k, lat: pos.lat, lng: pos.lng } : k));
      AppStore.saveKontak(list);
      alert('Lokasi ' + kontak.nama + ' tersimpan (akurasi sekitar ' + pos.akurasiM + ' meter).');
    } catch (err: any) {
      alert(err.message || 'Gagal mengambil lokasi.');
    } finally {
      setLokasiJobId(null);
    }
  };

  // Buka lembar konfirmasi: kurir mencatat cara bayar dari pelanggan
  const handleKonfirmasiTerkirim = (id: string) => {
    setKonfirmasiPesanan(pesananList.find(p => p.id === id) || null);
  };

  const selesaiKonfirmasiTerkirim = (hasil: Pesanan) => {
    setSnoozedUntilMap(prev => {
      const copy = { ...prev };
      delete copy[hasil.id];
      return copy;
    });
    setKonfirmasiPesanan(null);
    alert(hasil.kurir_diterima_at
      ? 'Pengiriman dikonfirmasi. Uang tunai tercatat kamu bawa, setorkan ke kasir ya.'
      : 'Pengiriman berhasil dikonfirmasi.');
  };

  const formatProdukRingkas = (items: Pesanan['items']) => {
    if (!items || items.length === 0) return '-';
    return items.map(item => `${item.nama_produk} (x${item.jumlah})`).join(', ');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '950px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div className="glass-card animate-fade-in" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(2, 132, 199, 0.2) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={22} color="#ec4899" /> Antaran Lapangan Pengantar
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
              Petugas: Pengantar Doni (Komisi Ongkir per Galon)
            </p>
          </div>
          <span className="badge badge-warning">{deliveryJobs.length} Antaran</span>
        </div>
      </div>

      {/* Uang tunai yang sedang dibawa (belum disetor ke kasir) */}
      {(() => {
        const dibawa = pengguna?.role === 'pengantar'
          ? saldoKurirList.filter(k => k.kurir_id === pengguna.id)
          : saldoKurirList.filter(k => k.saldo > 0);
        const total = dibawa.reduce((acc, k) => acc + Math.max(0, k.saldo), 0);
        return (
          <div className="glass-card animate-fade-in" style={{
            padding: '14px 18px', borderLeft: `4px solid ${total > 0 ? 'var(--c-amber)' : 'var(--c-green)'}`
          }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {pengguna?.role === 'pengantar' ? 'Uang tunai yang kamu bawa' : 'Uang tunai di kurir (belum disetor)'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: total > 0 ? 'var(--c-amber)' : 'var(--c-green)' }}>
              {AppStore.formatRupiah(total)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {total > 0
                ? (pengguna?.role === 'pengantar' ? 'Setorkan ke kasir kapan saja. Kasir akan mencatat setorannya.' : dibawa.map(k => `${k.kurir_nama} ${AppStore.formatRupiah(k.saldo)}`).join(' - '))
                : 'Tidak ada uang yang perlu disetor.'}
            </div>
          </div>
        );
      })()}

      <KonfirmasiTerkirimSheet
        pesanan={konfirmasiPesanan}
        defaultKurirId={pengguna?.role === 'pengantar' ? pengguna.id : undefined}
        kurirOptions={pengguna?.role === 'pengantar' ? undefined : AppStore.getUsers().filter(u => u.role === 'pengantar').map(u => ({ id: u.id, nama: u.nama }))}
        onClose={() => setKonfirmasiPesanan(null)}
        onDone={selesaiKonfirmasiTerkirim}
      />

      {/* Alarm Sound Alert Banner if Delayed */}
      {delayedJobs.length > 0 && (
        <div className="glass-card animate-fade-in" style={{
          padding: '16px 20px',
          background: hasActiveAlarm 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(185, 28, 28, 0.45) 100%)' 
            : 'rgba(239, 68, 68, 0.15)',
          border: '2px solid var(--c-red-strong)',
          boxShadow: hasActiveAlarm ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {hasActiveAlarm ? (
                <Volume2 size={28} color="#ef4444" className="animate-pulse" />
              ) : (
                <BellOff size={24} color="#94a3b8" />
              )}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={18} color="#ef4444" /> {delayedJobs.length} Pesanan Terlambat (&gt; {formatThresholdText(thresholdMins)})!
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--c-red-soft)', marginTop: '2px' }}>
                  {hasActiveAlarm 
                    ? 'Alarm berbunyi! Pilih aksi di bawah:' 
                    : delayedJobs.every(job => isOrderMuted(job.id))
                      ? 'Alarm telah dimatikan (tidak akan bunyi lagi).'
                      : `Suara alarm di-Snooze (${snoozeMins} Menit).`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleMuteAll}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.25)', border: '1px solid var(--c-red-strong)', color: 'var(--c-red-soft)', padding: '8px 14px' }}
              >
                <BellOff size={16} /> Matikan Alarm (Permanen)
              </button>
              <button 
                onClick={handleSnoozeAll}
                className="btn btn-warning btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'var(--c-amber-strong)', color: 'var(--on-accent)', border: 'none', padding: '8px 14px' }}
              >
                <Clock size={16} /> ⏰ Snooze Tunda ({snoozeMins}m)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL PENGIRIMAN PENDING (BELUM TERKIRIM) TABLE VIEW */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px', borderTop: '4px solid var(--c-amber)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={24} color="#fbbf24" /> Detail Pengiriman Pending (Belum Terkirim)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {delayedJobs.length > 0 && (
              <span className="badge badge-danger animate-pulse">
                {delayedJobs.length} Terlambat (&gt; {formatThresholdText(thresholdMins)})
              </span>
            )}
            <span className="badge badge-warning">{deliveryJobs.length} Antaran Menunggu</span>
          </div>
        </div>

        {deliveryJobs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', background: 'var(--inset-50)', borderRadius: '12px', color: 'var(--c-green)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <CheckCircle size={20} /> Tidak ada pengiriman pending saat ini. Semua pesanan antar sudah terkirim lunas!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', background: 'var(--inset-60)' }}>
                  <th style={{ padding: '12px' }}>Jam Order</th>
                  <th style={{ padding: '12px' }}>Jam Terkirim</th>
                  <th style={{ padding: '12px' }}>Durasi Menunggu</th>
                  <th style={{ padding: '12px' }}>No Nota &amp; Pelanggan</th>
                  <th style={{ padding: '12px' }}>Produk &amp; Tagihan</th>
                  <th style={{ padding: '12px' }}>Status Kirim</th>
                  <th style={{ padding: '12px' }}>Aksi / Alarm</th>
                </tr>
              </thead>
              <tbody>
                {deliveryJobs.map(psn => {
                  const durInfo = calculateOrderDuration(psn.created_at, psn.terkirim_at, psn.status_pesanan, thresholdMins);
                  const isMuted = isOrderMuted(psn.id);
                  const isSnoozed = isOrderSnoozed(psn.id);
                  const remainingSnoozeMins = getSnoozeRemainingMinutes(psn.id);

                  return (
                    <tr 
                      key={psn.id} 
                      style={{ 
                        borderBottom: '1px solid var(--w-6)',
                        background: durInfo.isTerlambat ? 'rgba(239, 68, 68, 0.08)' : undefined
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--c-amber)', whiteSpace: 'nowrap' }}>
                        <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        {durInfo.jamOrder}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {durInfo.jamTerkirim}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        <span style={{ color: durInfo.isTerlambat ? 'var(--c-red)' : 'var(--c-sky)' }}>
                          {durInfo.formattedDurasi}
                        </span>
                        {durInfo.isTerlambat && (
                          <span className="badge badge-danger" style={{ display: 'block', fontSize: '0.65rem', marginTop: '3px' }}>
                            &gt; {formatThresholdText(thresholdMins)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--c-sky)' }}>{psn.no_nota}</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>{psn.nama_pelanggan}</div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-2)' }}>
                        <div style={{ fontWeight: 600 }}>{formatProdukRingkas(psn.items)}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--c-green)', marginTop: '2px' }}>
                          {AppStore.formatRupiah(psn.total_akhir)}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className="badge badge-warning">
                          {psn.status_pesanan.toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {durInfo.isTerlambat && (
                            <>
                              {isMuted ? (
                                <span className="badge badge-secondary" style={{ fontSize: '0.7rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <BellOff size={12} /> Dimatikan
                                </span>
                              ) : (
                                <button 
                                  onClick={() => handleMuteJob(psn.id)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--c-red-strong)', color: 'var(--c-red-soft)', fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="Mematikan alarm agar tidak bunyi lagi"
                                >
                                  <BellOff size={13} /> Matikan
                                </button>
                              )}

                              {isSnoozed ? (
                                <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={12} /> Snooze ({remainingSnoozeMins}m)
                                </span>
                              ) : (
                                <button 
                                  onClick={() => handleSnoozeJob(psn.id)}
                                  className="btn btn-warning btn-sm"
                                  style={{ background: 'var(--c-amber-strong)', color: 'var(--on-accent)', border: 'none', fontWeight: 700, fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="Menunda alarm sementara"
                                >
                                  <Clock size={13} /> Snooze ({snoozeMins}m)
                                </button>
                              )}
                            </>
                          )}
                          <button 
                            onClick={() => handleKonfirmasiTerkirim(psn.id)} 
                            className="btn btn-success btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <CheckCircle size={13} /> Terkirim
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RuteAntaran
        antaran={deliveryJobs}
        kontakList={kontakList}
        depoLat={pengaturan.lokasi_depo_lat}
        depoLng={pengaturan.lokasi_depo_lng}
      />

      {/* Delivery Cards List (Detailed View) */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '10px' }}>
        Kartu Tugas Pengiriman Lapangan
      </h3>

      {deliveryJobs.length === 0 ? (
        <div className="glass-card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada tugas antaran pending saat ini. Semua pesanan sudah terkirim!
        </div>
      ) : (
        deliveryJobs.map(job => {
          const durInfo = calculateOrderDuration(job.created_at, job.terkirim_at, job.status_pesanan, thresholdMins);
          const isMuted = isOrderMuted(job.id);
          const isSnoozed = isOrderSnoozed(job.id);
          const remainingSnoozeMins = getSnoozeRemainingMinutes(job.id);

          return (
            <div 
              key={job.id} 
              className="glass-card animate-fade-in" 
              style={{ 
                padding: '20px',
                borderLeft: durInfo.isTerlambat ? '4px solid var(--c-red-strong)' : '1px solid var(--glass-border)',
                background: durInfo.isTerlambat ? 'rgba(239, 68, 68, 0.06)' : undefined
              }}
            >
              {/* Header Card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span className="badge badge-primary">{job.no_nota}</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '6px' }}>
                    {job.nama_pelanggan}
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`badge ${job.status_pesanan === 'terkirim' ? 'badge-success' : 'badge-warning'}`}>
                    {job.status_pesanan.toUpperCase().replace('_', ' ')}
                  </span>
                  {durInfo.isTerlambat && (
                    <span className="badge badge-danger animate-pulse" style={{ fontSize: '0.7rem' }}>
                      TERLAMBAT (&gt; {formatThresholdText(thresholdMins)})
                    </span>
                  )}
                </div>
              </div>

              {/* TIMESTAMPS & DURATION INFO BOX */}
              <div style={{ 
                background: durInfo.isTerlambat ? 'rgba(239, 68, 68, 0.15)' : 'var(--inset-70)', 
                border: durInfo.isTerlambat ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--glass-border)',
                padding: '12px', 
                borderRadius: '12px', 
                marginBottom: '14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                textAlign: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>JAM ORDER</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-amber)', marginTop: '2px', display: 'block' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    {durInfo.jamOrder}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>JAM TERKIRIM</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: job.status_pesanan === 'terkirim' ? 'var(--c-green)' : 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    {durInfo.jamTerkirim}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>DURASI MENUNGGU</span>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 800, 
                    color: durInfo.isTerlambat ? 'var(--c-red)' : 'var(--c-sky)', 
                    marginTop: '2px', 
                    display: 'block' 
                  }}>
                    {durInfo.formattedDurasi}
                  </span>
                </div>
              </div>

              {/* Address & Navigation */}
              <div style={{ background: 'var(--inset-70)', padding: '12px', borderRadius: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: 'var(--text-2)' }}>
                  <MapPin size={16} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong>Alamat Rumah:</strong>
                    <p style={{ marginTop: '2px', color: 'var(--text-muted)' }}>Jl. Merpati No. 12, RT 02/05, Perum Merpati</p>
                  </div>
                </div>

                <a 
                  href="https://maps.google.com/?q=-6.200000,106.816666" 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Navigation size={14} color="#38bdf8" /> Buka Lokasi Google Maps HP
                </a>
              </div>

              {/* Items Summary */}
              <div style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Barang yang harus diantar:</div>
                {job.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span>• {item.nama_produk}</span>
                    <span style={{ fontWeight: 700, color: 'var(--c-sky)' }}>{item.jumlah} Unit</span>
                  </div>
                ))}
              </div>

              {/* Payment Collection Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--glass-border)', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.85rem', color: job.bayar_ke_kurir ? 'var(--c-amber)' : 'var(--text-muted)', fontWeight: job.bayar_ke_kurir ? 700 : 400 }}>
                  {job.bayar_ke_kurir ? 'Tagih tunai ke pelanggan:' : job.status_pembayaran === 'lunas' ? 'Sudah dibayar:' : 'Tagihan Di Lapangan:'}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: job.bayar_ke_kurir ? 'var(--c-amber)' : 'var(--c-green)' }}>
                  {AppStore.formatRupiah(job.total_akhir)}
                </span>
              </div>

              {/* Lokasi pelanggan: navigasi dan simpan lokasi (tombol terpisah) */}
              {(() => {
                const kontak = kontakList.find(k => k.id === job.kontak_id);
                if (!kontak || kontak.id === 'kt-1') return null;
                const adaLokasi = koordinatValid(kontak.lat, kontak.lng);
                return (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {adaLokasi && (
                      <a className="btn btn-secondary btn-sm" href={urlNavigasiGoogleMaps(kontak.lat as number, kontak.lng as number)} target="_blank" rel="noopener noreferrer">
                        <Navigation size={14} aria-hidden="true" /> Navigasi ke lokasi
                      </a>
                    )}
                    <button type="button" className="btn btn-secondary btn-sm" disabled={lokasiJobId === job.id} onClick={() => simpanLokasiPelanggan(job)}>
                      <MapPin size={14} aria-hidden="true" /> {lokasiJobId === job.id ? 'Mencari lokasi...' : adaLokasi ? 'Perbarui lokasi pelanggan' : 'Simpan lokasi pelanggan'}
                    </button>
                  </div>
                );
              })()}

              {/* Card Level Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                {durInfo.isTerlambat && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {isMuted ? (
                      <div style={{ padding: '8px', background: 'rgba(148, 163, 184, 0.1)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <BellOff size={14} /> Alarm Dimatikan
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleMuteJob(job.id)}
                        className="btn btn-secondary"
                        style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--c-red-strong)', color: 'var(--c-red-soft)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <BellOff size={16} /> Matikan (Permanen)
                      </button>
                    )}

                    {isSnoozed ? (
                      <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', textAlign: 'center', color: 'var(--c-amber)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Clock size={14} /> Snooze ({remainingSnoozeMins}m)
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleSnoozeJob(job.id)}
                        className="btn btn-warning"
                        style={{ padding: '10px', background: 'var(--c-amber-strong)', color: 'var(--on-accent)', border: 'none', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Clock size={16} /> Snooze ({snoozeMins}m)
                      </button>
                    )}
                  </div>
                )}

                {job.status_pesanan !== 'terkirim' && (
                  <button 
                    onClick={() => handleKonfirmasiTerkirim(job.id)} 
                    className="btn btn-success" 
                    style={{ width: '100%', padding: '12px' }}
                  >
                    <CheckCircle size={18} /> Konfirmasi Terkirim & Terima Bayar
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

    </div>
  );
}


