'use client';

import React, { useState, useEffect } from 'react';
import { Pesanan, PengaturanDepo } from '@/lib/types';
import { AppStore } from '@/lib/store';
import { calculateOrderDuration, alarmSound, formatThresholdText } from '@/lib/audioAndTimer';
import { Truck, MapPin, Phone, CheckCircle, Navigation, Clock, BellOff, AlertTriangle, Volume2, Package } from 'lucide-react';

export default function PengantarPage() {
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanDepo>(AppStore.getPengaturan());
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const [snoozedUntilMap, setSnoozedUntilMap] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState<number>(Date.now());

  const loadData = () => {
    setPesananList(AppStore.getPesanan());
    setPengaturan(AppStore.getPengaturan());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('depo_pesanan_updated', loadData);
    window.addEventListener('depo_pengaturan_updated', loadData);
    
    // Refresh timer every 10 seconds to update duration
    const interval = setInterval(() => setNowTick(Date.now()), 10000);
    return () => {
      window.removeEventListener('depo_pesanan_updated', loadData);
      window.removeEventListener('depo_pengaturan_updated', loadData);
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

  const handleKonfirmasiTerkirim = (id: string) => {
    AppStore.updatePesananStatus(id, 'terkirim', 'lunas');
    setSnoozedUntilMap(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    alert('Pengiriman berhasil dikonfirmasi! Status pesanan berubah menjadi Terkirim (pesanan hutang tetap tercatat sebagai hutang).');
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
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={22} color="#ec4899" /> Antaran Lapangan Pengantar
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '2px' }}>
              Petugas: Pengantar Doni (Komisi Ongkir per Galon)
            </p>
          </div>
          <span className="badge badge-warning">{deliveryJobs.length} Antaran</span>
        </div>
      </div>

      {/* Alarm Sound Alert Banner if Delayed */}
      {delayedJobs.length > 0 && (
        <div className="glass-card animate-fade-in" style={{
          padding: '16px 20px',
          background: hasActiveAlarm 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(185, 28, 28, 0.45) 100%)' 
            : 'rgba(239, 68, 68, 0.15)',
          border: '2px solid #ef4444',
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
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={18} color="#ef4444" /> {delayedJobs.length} Pesanan Terlambat (&gt; {formatThresholdText(thresholdMins)})!
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '2px' }}>
                  {hasActiveAlarm 
                    ? '🔔 Alarm berbunyi! Pilih aksi di bawah:' 
                    : delayedJobs.every(job => isOrderMuted(job.id))
                      ? '🔕 Alarm telah dimatikan (tidak akan bunyi lagi).'
                      : `🔕 Suara alarm di-Snooze (${snoozeMins} Menit).`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleMuteAll}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.25)', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px 14px' }}
              >
                <BellOff size={16} /> 🔕 Matikan Alarm (Permanen)
              </button>
              <button 
                onClick={handleSnoozeAll}
                className="btn btn-warning btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: '#f59e0b', color: '#0f172a', border: 'none', padding: '8px 14px' }}
              >
                <Clock size={16} /> ⏰ Snooze Tunda ({snoozeMins}m)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL PENGIRIMAN PENDING (BELUM TERKIRIM) TABLE VIEW */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px', borderTop: '4px solid #fbbf24' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={24} color="#fbbf24" /> Detail Pengiriman Pending (Belum Terkirim)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {delayedJobs.length > 0 && (
              <span className="badge badge-danger animate-pulse">
                🚨 {delayedJobs.length} Terlambat (&gt; {formatThresholdText(thresholdMins)})
              </span>
            )}
            <span className="badge badge-warning">{deliveryJobs.length} Antaran Menunggu</span>
          </div>
        </div>

        {deliveryJobs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <CheckCircle size={20} /> Tidak ada pengiriman pending saat ini. Semua pesanan antar sudah terkirim lunas!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.6)' }}>
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
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        background: durInfo.isTerlambat ? 'rgba(239, 68, 68, 0.08)' : undefined
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: 600, color: '#fbbf24', whiteSpace: 'nowrap' }}>
                        <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        {durInfo.jamOrder}
                      </td>
                      <td style={{ padding: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {durInfo.jamTerkirim}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        <span style={{ color: durInfo.isTerlambat ? '#f87171' : '#38bdf8' }}>
                          {durInfo.formattedDurasi}
                        </span>
                        {durInfo.isTerlambat && (
                          <span className="badge badge-danger" style={{ display: 'block', fontSize: '0.65rem', marginTop: '3px' }}>
                            🚨 &gt; {formatThresholdText(thresholdMins)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#38bdf8' }}>{psn.no_nota}</div>
                        <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: '2px' }}>{psn.nama_pelanggan}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#cbd5e1' }}>
                        <div style={{ fontWeight: 600 }}>{formatProdukRingkas(psn.items)}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
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
                                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
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
                                  style={{ background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 700, fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
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

      {/* Delivery Cards List (Detailed View) */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginTop: '10px' }}>
        Kartu Tugas Pengiriman Lapangan
      </h3>

      {deliveryJobs.length === 0 ? (
        <div className="glass-card" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
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
                borderLeft: durInfo.isTerlambat ? '4px solid #ef4444' : '1px solid var(--glass-border)',
                background: durInfo.isTerlambat ? 'rgba(239, 68, 68, 0.06)' : undefined
              }}
            >
              {/* Header Card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span className="badge badge-primary">{job.no_nota}</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
                    {job.nama_pelanggan}
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`badge ${job.status_pesanan === 'terkirim' ? 'badge-success' : 'badge-warning'}`}>
                    {job.status_pesanan.toUpperCase().replace('_', ' ')}
                  </span>
                  {durInfo.isTerlambat && (
                    <span className="badge badge-danger animate-pulse" style={{ fontSize: '0.7rem' }}>
                      🚨 TERLAMBAT (&gt; {formatThresholdText(thresholdMins)})
                    </span>
                  )}
                </div>
              </div>

              {/* TIMESTAMPS & DURATION INFO BOX */}
              <div style={{ 
                background: durInfo.isTerlambat ? 'rgba(239, 68, 68, 0.15)' : 'rgba(15, 23, 42, 0.7)', 
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
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>JAM ORDER</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', marginTop: '2px', display: 'block' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    {durInfo.jamOrder}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>JAM TERKIRIM</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: job.status_pesanan === 'terkirim' ? '#34d399' : '#94a3b8', marginTop: '2px', display: 'block' }}>
                    {durInfo.jamTerkirim}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>DURASI MENUNGGU</span>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 800, 
                    color: durInfo.isTerlambat ? '#f87171' : '#38bdf8', 
                    marginTop: '2px', 
                    display: 'block' 
                  }}>
                    {durInfo.formattedDurasi}
                  </span>
                </div>
              </div>

              {/* Address & Navigation */}
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  <MapPin size={16} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong>Alamat Rumah:</strong>
                    <p style={{ marginTop: '2px', color: '#94a3b8' }}>Jl. Merpati No. 12, RT 02/05, Perum Merpati</p>
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
                <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>Barang yang harus diantar:</div>
                {job.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginTop: '2px' }}>
                    <span>• {item.nama_produk}</span>
                    <span style={{ fontWeight: 700, color: '#38bdf8' }}>{item.jumlah} Unit</span>
                  </div>
                ))}
              </div>

              {/* Payment Collection Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--glass-border)', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Tagihan Di Lapangan:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                  {AppStore.formatRupiah(job.total_akhir)}
                </span>
              </div>

              {/* Card Level Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                {durInfo.isTerlambat && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {isMuted ? (
                      <div style={{ padding: '8px', background: 'rgba(148, 163, 184, 0.1)', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <BellOff size={14} /> Alarm Dimatikan
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleMuteJob(job.id)}
                        className="btn btn-secondary"
                        style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <BellOff size={16} /> Matikan (Permanen)
                      </button>
                    )}

                    {isSnoozed ? (
                      <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', textAlign: 'center', color: '#fbbf24', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Clock size={14} /> Snooze ({remainingSnoozeMins}m)
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleSnoozeJob(job.id)}
                        className="btn btn-warning"
                        style={{ padding: '10px', background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
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


