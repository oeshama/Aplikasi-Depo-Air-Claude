'use client';

import React, { useState, useEffect } from 'react';
import { Pesanan, Kontak, Produk, PengaturanDepo, KomponenServis, Pengeluaran, HutangToko, UserApp, ShiftKasir, SetoranKurir, SetoranOwner, NotifikasiOwner, SaldoKurir, FotoMeter } from '@/lib/types';
import { AppStore } from '@/lib/store';
import ExpenseReceiptModal from '@/components/ExpenseReceiptModal';
import KartuTarget from '@/components/KartuTarget';
import { PERIODE_TARGET, ambilTarget, aturTarget, persenCapaian, PeriodeTarget, JenisTarget } from '@/lib/target';
import { calculateOrderDuration, alarmSound, formatThresholdText } from '@/lib/audioAndTimer';
import { 
  LayoutDashboard, TrendingUp, ShoppingBag, AlertTriangle, 
  Users, Droplets, ArrowUpRight, DollarSign, Clock, Wrench, 
  Truck, Package, CheckCircle, RotateCcw, Calendar, Target, 
  PieChart, FileText, Lightbulb, AlertCircle, ArrowDownRight,
  BellOff, Volume2, TrendingDown, Banknote, Trash2, Coffee, Eye, ChevronRight, UserCheck, BookOpen, Check, X,
  Search, History as HistoryIcon, Receipt
} from 'lucide-react';

type PeriodeFilter = 'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'semua';

const JENIS_TARGET: { id: JenisTarget; label: string; satuan: string }[] = [
  { id: 'omzet', label: 'Omzet', satuan: 'Rp' },
  { id: 'galon', label: 'Volume galon', satuan: 'galon' },
  { id: 'liter', label: 'Volume liter', satuan: 'liter' },
];

export default function OwnerDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserApp | null>(null);
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [kontakList, setKontakList] = useState<Kontak[]>([]);
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>([]);
  const [hutangTokoList, setHutangTokoList] = useState<HutangToko[]>([]);
  const [shiftList, setShiftList] = useState<ShiftKasir[]>([]);
  const [setoranList, setSetoranList] = useState<SetoranKurir[]>([]);
  const [notifList, setNotifList] = useState<NotifikasiOwner[]>([]);
  const [saldoKurirList, setSaldoKurirList] = useState<SaldoKurir[]>([]);
  const [fotoMeterList, setFotoMeterList] = useState<FotoMeter[]>([]);
  const [setoranOwnerList, setSetoranOwnerList] = useState<SetoranOwner[]>([]);
  const [fotoLihat, setFotoLihat] = useState<{ judul: string; gambar: string; info: string } | null>(null);
  const [pengaturan, setPengaturan] = useState<PengaturanDepo>(AppStore.getPengaturan());
  const [activeExpenseReceipt, setActiveExpenseReceipt] = useState<Pengeluaran | null>(null);
  
  // Filter State, Karyawan Detail Modal & Timer Alarm State
  type TabType = 'overview' | 'keuangan' | 'karyawan_piutang' | 'pemeliharaan' | 'riwayat';
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const [periode, setPeriode] = useState<PeriodeFilter>('harian');
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const [snoozedUntilMap, setSnoozedUntilMap] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [selectedDetailKaryawan, setSelectedDetailKaryawan] = useState<any | null>(null);
  const [isWaterAlarmMuted, setIsWaterAlarmMuted] = useState<boolean>(false);
  const [waterAlarmSnoozedUntil, setWaterAlarmSnoozedUntil] = useState<number>(0);
  const [showMeteran, setShowMeteran] = useState<boolean>(false);

  // Pagination State for Tables
  const [pengeluaranPage, setPengeluaranPage] = useState<number>(1);
  const [riwayatPage, setRiwayatPage] = useState<number>(1);
  const [riwayatSearch, setRiwayatSearch] = useState<string>('');
  const ITEMS_PER_PAGE_EXPENSE = 8;
  const ITEMS_PER_PAGE_TRANSACTIONS = 10;

  // Modal Bayar Hak Staf / Ongkir State
  const [showBayarHakModal, setShowBayarHakModal] = useState<boolean>(false);
  const [targetKaryawanBayar, setTargetKaryawanBayar] = useState<any | null>(null);
  const [kategoriBayarStaf, setKategoriBayarStaf] = useState<string>('ongkir');
  const [nominalBayarStaf, setNominalBayarStaf] = useState<number>(0);
  const [peruntukanBayarStaf, setPeruntukanBayarStaf] = useState<string>('');
  const [catatanBayarStaf, setCatatanBayarStaf] = useState<string>('');
  const [sumberBayarStaf, setSumberBayarStaf] = useState<'kas_besar' | 'laci' | 'rekening'>('kas_besar');
  const [rekeningBayarStaf, setRekeningBayarStaf] = useState<string>('');

  // Owner Water Meter & Stock Adjust Modal State
  const [showOwnerMeterAdjustModal, setShowOwnerMeterAdjustModal] = useState<boolean>(false);
  const [newStokAirInput, setNewStokAirInput] = useState<number>(5000);
  const [newMeterAirInput, setNewMeterAirInput] = useState<number>(10000);

  // Modal Edit Target Penjualan State (kunci "jenis_periode", mis. omzet_harian)
  const [showEditTargetModal, setShowEditTargetModal] = useState<boolean>(false);
  const [targetInput, setTargetInput] = useState<Record<string, number>>({});

  const handleOpenEditTargetModal = () => {
    const awal: Record<string, number> = {};
    PERIODE_TARGET.forEach(per => JENIS_TARGET.forEach(j => { awal[`${j.id}_${per.id}`] = ambilTarget(pengaturan, j.id, per.id); }));
    setTargetInput(awal);
    setShowEditTargetModal(true);
  };

  const handleSaveTargetPenjualan = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedPengaturan: PengaturanDepo = { ...pengaturan };
    PERIODE_TARGET.forEach(per => JENIS_TARGET.forEach(j => {
      updatedPengaturan = aturTarget(updatedPengaturan, j.id, per.id, targetInput[`${j.id}_${per.id}`]);
    }));
    AppStore.savePengaturan(updatedPengaturan);
    setPengaturan(updatedPengaturan);
    setShowEditTargetModal(false);
    alert('Target penjualan berhasil diperbarui!');
  };

  const handleOpenBayarOngkirModal = (item: any, kat: string = 'ongkir') => {
    setTargetKaryawanBayar(item);
    setKategoriBayarStaf(kat);
    
    if (kat === 'ongkir') {
      const sisa = item.sisaOngkirBelumTerbayar || 0;
      setNominalBayarStaf(sisa > 0 ? sisa : item.totalOngkirOrderTerjadi || 0);
      setPeruntukanBayarStaf(`Pembayaran Ongkir Delivery - ${item.kary.nama}`);
    } else if (kat === 'gaji') {
      const tglGaji = item.kary.tanggal_jatuh_tempo_gaji || 25;
      const todayDate = new Date().getDate();
      if (todayDate < tglGaji) {
        if (!confirm(`Pembayaran gaji untuk ${item.kary.nama} belum jatuh tempo (Jatuh Tempo: Tanggal ${tglGaji}). Apakah Anda yakin ingin memproses pembayaran gaji lebih awal?`)) {
          return;
        }
      }
      setNominalBayarStaf(item.sisaGajiBelumDibayar > 0 ? item.sisaGajiBelumDibayar : item.kary.gaji_basic || 0);
      setPeruntukanBayarStaf(`Pembayaran Gaji Bulan Ini (Jatuh Tempo Tgl ${tglGaji}) - ${item.kary.nama}`);
    } else if (kat === 'kasbon') {
      setNominalBayarStaf(0);
      setPeruntukanBayarStaf(`Pinjaman Kasbon Karyawan - ${item.kary.nama}`);
    } else if (kat === 'pengembalian_kasbon') {
      setNominalBayarStaf(item.sisaKasbonAktif || 0);
      setPeruntukanBayarStaf(`Pengembalian Kasbon Karyawan - ${item.kary.nama}`);
    } else {
      setNominalBayarStaf(item.kary.uang_makan_per_hari || 25000);
      setPeruntukanBayarStaf(`Uang Makan / Konsumsi - ${item.kary.nama}`);
    }
    
    setCatatanBayarStaf('');
    setSumberBayarStaf('kas_besar');
    setShowBayarHakModal(true);
  };

  const handleSaveBayarHakStaf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetKaryawanBayar) return;

    if (nominalBayarStaf <= 0) {
      alert('Nominal pembayaran harus lebih besar dari Rp 0!');
      return;
    }

    if (sumberBayarStaf === 'rekening' && !rekeningBayarStaf) {
      alert('Pilih rekening yang dipakai membayar.');
      return;
    }

    const currentUser = AppStore.getCurrentUser();
    const isKasMasuk = kategoriBayarStaf === 'pengembalian_kasbon';

    const newPengeluaran: Pengeluaran = {
      id: `exp-${Date.now()}`,
      tanggal: new Date().toISOString(),
      nominal: nominalBayarStaf,
      peruntukan: peruntukanBayarStaf.trim() || `Pembayaran Hak ${kategoriBayarStaf} - ${targetKaryawanBayar.kary.nama}`,
      kategori: kategoriBayarStaf,
      karyawan_id: targetKaryawanBayar.kary.id,
      karyawan_nama: targetKaryawanBayar.kary.nama,
      tipe_arus_kas: isKasMasuk ? 'masuk' : 'keluar',
      sumber_kas: sumberBayarStaf,
      rekening_id: sumberBayarStaf === 'rekening' ? rekeningBayarStaf : undefined,
      kasir_id: currentUser.id,
      kasir_nama: currentUser.nama,
      catatan: catatanBayarStaf.trim() || undefined
    };

    AppStore.addPengeluaran(newPengeluaran);

    setShowBayarHakModal(false);
    setSelectedDetailKaryawan(null);
    setTargetKaryawanBayar(null);

    setActiveExpenseReceipt(newPengeluaran);
  };

  const loadData = () => {
    setCurrentUser(AppStore.getCurrentUser());
    setPesananList(AppStore.getPesanan());
    setKontakList(AppStore.getKontak());
    setProdukList(AppStore.getProduk());
    setPengeluaranList(AppStore.getPengeluaran());
    setHutangTokoList(AppStore.getHutangToko());
    setPengaturan(AppStore.getPengaturan());
    setShiftList(AppStore.getShiftList());
    setSetoranList(AppStore.getSetoranKurir());
    setNotifList(AppStore.getNotifikasi());
    setSaldoKurirList(AppStore.getSaldoKurirList());
    setFotoMeterList(AppStore.getFotoMeter());
    setSetoranOwnerList(AppStore.getSetoranOwner());
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('depo_pengaturan_updated', handleUpdate);
    window.addEventListener('depo_pesanan_updated', handleUpdate);
    window.addEventListener('depo_pengeluaran_updated', handleUpdate);
    window.addEventListener('depo_hutang_toko_updated', handleUpdate);
    window.addEventListener('depo_shift_updated', handleUpdate);
    window.addEventListener('depo_kontak_updated', handleUpdate);
    window.addEventListener('depo_produk_updated', handleUpdate);
    window.addEventListener('depo_setoran_kurir_updated', handleUpdate);
    window.addEventListener('depo_foto_meter_updated', handleUpdate);
    window.addEventListener('depo_setoran_owner_updated', handleUpdate);
    window.addEventListener('depo_notifikasi_updated', handleUpdate);

    // Interval for dynamic duration updates
    const interval = setInterval(() => setNowTick(Date.now()), 10000);

    return () => {
      window.removeEventListener('depo_pengaturan_updated', handleUpdate);
      window.removeEventListener('depo_pesanan_updated', handleUpdate);
      window.removeEventListener('depo_pengeluaran_updated', handleUpdate);
      window.removeEventListener('depo_hutang_toko_updated', handleUpdate);
      window.removeEventListener('depo_shift_updated', handleUpdate);
      window.removeEventListener('depo_kontak_updated', handleUpdate);
      window.removeEventListener('depo_produk_updated', handleUpdate);
      window.removeEventListener('depo_setoran_kurir_updated', handleUpdate);
      window.removeEventListener('depo_foto_meter_updated', handleUpdate);
      window.removeEventListener('depo_setoran_owner_updated', handleUpdate);
      window.removeEventListener('depo_notifikasi_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Calculation helper for Rekap Hutang Piutang & Keuangan Karyawan
  const getRekapKaryawanList = () => {
    const list = pengaturan.karyawan_list || [];

    return list.map(kary => {
      const matchesKary = (id?: string, nama?: string, peruntukan?: string) => {
        if (id && id === kary.id) return true;
        if (nama && (nama.toLowerCase().includes(kary.nama.toLowerCase()) || kary.nama.toLowerCase().includes(nama.toLowerCase()))) return true;
        const firstName = kary.nama.split(' ')[0].toLowerCase();
        if (peruntukan && firstName.length >= 3 && peruntukan.toLowerCase().includes(firstName)) return true;
        return false;
      };

      // 1. Kasbon Karyawan & Pengembalian Kasbon
      const pengeluaranKary = (pengeluaranList || []).filter(p => matchesKary(p.karyawan_id, p.karyawan_nama, p.peruntukan));
      
      const totalKasbon = pengeluaranKary
        .filter(p => p.kategori === 'kasbon')
        .reduce((acc, p) => acc + p.nominal, 0);

      const totalPengembalianKasbon = pengeluaranKary
        .filter(p => p.kategori === 'pengembalian_kasbon')
        .reduce((acc, p) => acc + p.nominal, 0);

      const sisaKasbonAktif = Math.max(0, totalKasbon - totalPengembalianKasbon);

      // 2. Hutang Toko ke Karyawan (Depo Berhutang / Talangan dari Karyawan)
      const hutangTokoKaryEntries = (hutangTokoList || []).filter(h => 
        h.tipe_pihak === 'karyawan' && (h.karyawan_id === kary.id || h.nama_pihak.toLowerCase().includes(kary.nama.toLowerCase()))
      );
      const sisaHutangTokoKeKary = hutangTokoKaryEntries
        .filter(h => h.status === 'belum_lunas')
        .reduce((acc, h) => acc + h.sisa_hutang, 0);

      // 3. Ongkir & Delivery Kurir (Terjadi vs Sudah Dibayar Kas Keluar vs Sisa Belum Terbayar)
      const allDrivers = list.filter(k => 
        k.jabatan.toLowerCase().includes('pengantar') || k.jabatan.toLowerCase().includes('driver')
      );
      const isKurirDriver = kary.jabatan.toLowerCase().includes('pengantar') || kary.jabatan.toLowerCase().includes('driver');

      const pesananDiantar = (pesananList || []).filter(p => {
        // Check if delivery order with ongkir
        const isDelivery = (p.total_ongkir && p.total_ongkir > 0) || !!p.zone_ongkir_id || p.tipe_transaksi === 'tukar_galon';
        if (!isDelivery) return false;

        // Direct ID match
        if (p.pengantar_id === kary.id) return true;
        // User ID match (e.g. usr-4 is Pengantar Doni, kary-1 is Doni Pengantar)
        if (p.pengantar_id === 'usr-4' && (kary.id === 'kary-1' || kary.nama.toLowerCase().includes('doni'))) return true;
        // Catatan match
        if (p.catatan && p.catatan.toLowerCase().includes(kary.nama.split(' ')[0].toLowerCase())) return true;
        
        // Fallback: If order is delivery and this is the main driver
        if (isKurirDriver && (allDrivers.length === 1 || !p.pengantar_id)) return true;

        return false;
      });

      // Total Ongkir Delivery yang TERJADI (Hak Kurir)
      const totalOngkirOrderTerjadi = pesananDiantar.reduce((acc, p) => acc + (p.total_ongkir || 0), 0);
      const totalGalonDiantar = pesananDiantar.reduce((acc, p) => acc + (p.total_unit_ongkir || 0), 0);

      // Total Ongkir yang SUDAH DIBAYARKAN dari Kasir (Pengeluaran Kategori 'ongkir' atau 'bensin')
      const totalOngkirKasKeluar = pengeluaranKary
        .filter(p => p.kategori === 'ongkir' || p.kategori === 'bensin')
        .reduce((acc, p) => acc + p.nominal, 0);

      // Sisa Ongkir Delivery Terjadi yang BELUM TERBAYAR oleh Depo
      const sisaOngkirBelumTerbayar = Math.max(0, totalOngkirOrderTerjadi - totalOngkirKasKeluar);

      // 4. Uang Makan & Konsumsi
      const totalKonsumsiKasKeluar = pengeluaranKary
        .filter(p => p.kategori === 'konsumsi')
        .reduce((acc, p) => acc + p.nominal, 0);

      // 5. Gaji Bulanan (Disesuaikan dengan Tanggal Jatuh Tempo)
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const currentDate = now.getDate();
      const dueDay = kary.tanggal_jatuh_tempo_gaji || 25;
      const isSudahJatuhTempo = currentDate >= dueDay;

      const pengeluaranGajiBulanIni = pengeluaranKary.filter(p => {
        if (p.kategori !== 'gaji') return false;
        const pDate = new Date(p.tanggal);
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
      });

      const totalGajiPaidBulanIni = pengeluaranGajiBulanIni.reduce((acc, p) => acc + p.nominal, 0);
      const sisaGajiBelumDibayar = Math.max(0, (kary.gaji_basic || 0) - totalGajiPaidBulanIni);
      const sisaGajiTerhitung = isSudahJatuhTempo ? sisaGajiBelumDibayar : 0;
      const isGajiLunasBulanIni = sisaGajiBelumDibayar === 0 && (kary.gaji_basic || 0) > 0;
      const canBayarGaji = sisaGajiBelumDibayar > 0;
      const totalInsentifGalon = 0;

      // Total Hak Keuangan Karyawan dari Depo (Hutang Toko + Sisa Ongkir Belum Terbayar + Sisa Gaji Terhitung + Konsumsi)
      const totalHakKeuangan = sisaHutangTokoKeKary + sisaOngkirBelumTerbayar + sisaGajiTerhitung + totalKonsumsiKasKeluar;
      
      // Total Piutang Depo ke Karyawan (Kasbon Aktif)
      const totalKewajibanKasbon = sisaKasbonAktif;

      // Net Balance Position (positif: Depo berhutang ke karyawan, negatif: Karyawan berhutang kasbon ke Depo)
      const netPosisi = totalHakKeuangan - totalKewajibanKasbon;

      return {
        kary,
        dueDay,
        isSudahJatuhTempo,
        canBayarGaji,
        totalKasbon,
        totalPengembalianKasbon,
        sisaKasbonAktif,
        sisaHutangTokoKeKary,
        totalOngkirOrderTerjadi,
        sisaOngkirBelumTerbayar,
        totalGalonDiantar,
        totalOngkirKasKeluar,
        totalKonsumsiKasKeluar,
        totalInsentifGalon,
        totalGajiPaid: totalGajiPaidBulanIni,
        sisaGajiBelumDibayar,
        sisaGajiTerhitung,
        isGajiLunasBulanIni,
        totalHakKeuangan,
        totalKewajibanKasbon,
        netPosisi,
        pengeluaranKary,
        hutangTokoKaryEntries,
        pesananDiantar
      };
    });
  };

  // Pending delivery (seluruh transaksi yang belum terkirim)
  const pendingDelivery = (pesananList || []).filter(p => 
    p && (
      p.status_pesanan === 'pending' || 
      p.status_pesanan === 'dijadwalkan' || 
      p.status_pesanan === 'dalam_perjalanan'
    )
  );

  // Settings Notifikasi Alarm
  const thresholdMins = pengaturan.batas_keterlambatan_menit || 90;
  const snoozeMins = pengaturan.durasi_snooze_menit || 15;
  const isAlarmEnabled = (pengaturan.notifikasi_alarm_aktif !== false) && (pengaturan.mode_suara_alarm !== 'silent');

  // Critical Low Water Stock Alarm
  const minStokAirBakuCalc = pengaturan.min_stok_air_baku_liter || 2000;
  const currentStokAirBakuCalc = pengaturan.stok_air_baku_saat_ini ?? 0;
  const isWaterStockCriticalCalc = currentStokAirBakuCalc <= minStokAirBakuCalc;
  const isWaterAlarmSnoozed = waterAlarmSnoozedUntil ? nowTick < waterAlarmSnoozedUntil : false;
  const hasWaterStockAlarmAudio = isAlarmEnabled && isWaterStockCriticalCalc && !isWaterAlarmMuted && !isWaterAlarmSnoozed;

  // Delayed Pending Orders (> thresholdMins)
  const delayedPending = pendingDelivery.filter(p => {
    const durInfo = calculateOrderDuration(p.created_at, p.terkirim_at, p.status_pesanan, thresholdMins);
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

  const hasActiveAlarm = isAlarmEnabled && (delayedPending.some(p => !isOrderMuted(p.id) && !isOrderSnoozed(p.id)) || hasWaterStockAlarmAudio);

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
    setMutedIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setSnoozedUntilMap(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleSnoozeJob = (id: string) => {
    const until = Date.now() + (pengaturan.durasi_snooze_menit || 15) * 60 * 1000;
    setSnoozedUntilMap(prev => ({ ...prev, [id]: until }));
    setMutedIds(prev => prev.filter(mId => mId !== id));
  };

  const handleMuteAll = () => {
    const allDelayedIds = delayedPending.map(p => p.id);
    setMutedIds(prev => Array.from(new Set([...prev, ...allDelayedIds])));
    setSnoozedUntilMap({});
  };

  const handleSnoozeAll = () => {
    const until = Date.now() + (pengaturan.durasi_snooze_menit || 15) * 60 * 1000;
    const newMap = { ...snoozedUntilMap };
    delayedPending.forEach(p => {
      newMap[p.id] = until;
    });
    setSnoozedUntilMap(newMap);
    const allDelayedIds = delayedPending.map(p => p.id);
    setMutedIds(prev => prev.filter(mId => !allDelayedIds.includes(mId)));
  };

  // Filter Pesanan based on selected Timeframe
  const getFilteredPesanan = () => {
    const now = new Date();
    return (pesananList || []).filter(p => {
      if (!p || !p.created_at) return false;
      const pDate = new Date(p.created_at);
      if (periode === 'harian') {
        return pDate.toDateString() === now.toDateString();
      } else if (periode === 'mingguan') {
        const diffTime = Math.abs(now.getTime() - pDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else if (periode === 'bulanan') {
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      } else if (periode === 'tahunan') {
        return pDate.getFullYear() === now.getFullYear();
      }
      return true; // 'semua'
    });
  };

  const getFilteredPengeluaran = () => {
    const now = new Date();
    return (pengeluaranList || []).filter(p => {
      if (!p || !p.tanggal) return false;
      const pDate = new Date(p.tanggal);
      if (periode === 'harian') {
        return pDate.toDateString() === now.toDateString();
      } else if (periode === 'mingguan') {
        const diffTime = Math.abs(now.getTime() - pDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else if (periode === 'bulanan') {
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      } else if (periode === 'tahunan') {
        return pDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  // Setoran kurir yang diterima kasir pada periode terpilih
  const getFilteredSetoran = () => {
    const now = new Date();
    return (setoranList || []).filter(s => {
      if (!s || !s.tanggal || s.dibatalkan) return false;
      const sDate = new Date(s.tanggal);
      if (periode === 'harian') return sDate.toDateString() === now.toDateString();
      if (periode === 'mingguan') return Math.ceil(Math.abs(now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) <= 7;
      if (periode === 'bulanan') return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
      if (periode === 'tahunan') return sDate.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const filteredPesanan = getFilteredPesanan();
  const filteredPengeluaran = getFilteredPengeluaran();
  const totalSetoranPeriode = getFilteredSetoran().reduce((acc, s) => acc + (s.nominal || 0), 0);
  const totalUangDiKurir = saldoKurirList.reduce((acc, k) => acc + Math.max(0, k.saldo), 0);
  const kurirMembawaUang = saldoKurirList.filter(k => k.saldo > 0);

  // Metrics Calculations
  const totalOmzet = filteredPesanan.reduce((acc, p) => acc + (p?.total_akhir || 0), 0);
  // Tunai langsung + setoran kurir (pesanan antar tunai baru dihitung saat kurir menyetor)
  const totalTunaiMasuk = AppStore.totalTunaiLangsung(filteredPesanan) + totalSetoranPeriode;

  const totalPengeluaranKeluar = filteredPengeluaran
    .filter(p => p && p.tipe_arus_kas !== 'masuk' && p.kategori !== 'pengembalian_kasbon')
    .reduce((acc, p) => acc + (p?.nominal || 0), 0);

  const totalPengembalianKasbon = filteredPengeluaran
    .filter(p => p && (p.tipe_arus_kas === 'masuk' || p.kategori === 'pengembalian_kasbon'))
    .reduce((acc, p) => acc + (p?.nominal || 0), 0);

  const kasBersihSetoranOwner = Math.max(0, (totalTunaiMasuk + totalPengembalianKasbon) - totalPengeluaranKeluar);

  // Shift Kasir Aggregation & Audit Calculations per Periode
  const getFilteredShiftList = () => {
    const now = new Date();
    return (shiftList || []).filter(s => {
      if (!s || !s.waktu_buka) return false;
      const sDate = new Date(s.waktu_buka);
      if (periode === 'harian') {
        return sDate.toDateString() === now.toDateString();
      } else if (periode === 'mingguan') {
        const diffTime = Math.abs(now.getTime() - sDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else if (periode === 'bulanan') {
        return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
      } else if (periode === 'tahunan') {
        return sDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const filteredShiftList = getFilteredShiftList();
  const closedShiftList = filteredShiftList.filter(s => s.status === 'tutup');

  const totalModalAwalShift = closedShiftList.reduce((acc, s) => acc + (s.saldo_awal || 0), 0);
  const totalKasFisikAktualShift = closedShiftList.reduce((acc, s) => acc + (s.saldo_akhir_aktual || 0), 0);
  const totalSelisihKasShift = closedShiftList.reduce((acc, s) => acc + (s.selisih || 0), 0);
  const hasClosedShift = closedShiftList.length > 0;

  const totalPiutangPelanggan = (pesananList || []).length === 0 ? 0 : (kontakList || []).reduce((acc, k) => acc + (k?.hutang_saat_ini || 0), 0);
  const pelangganBerhutang = (pesananList || []).length === 0 ? [] : (kontakList || []).filter(k => k && (k.hutang_saat_ini || 0) > 0);

  // Total Galon & Volume Air Terjual
  const totalGalonTerjual = filteredPesanan.reduce((acc, p) => {
    if (!p || !p.items || !Array.isArray(p.items)) return acc;
    const galonQty = p.items
      .filter(item => item && item.nama_produk && item.nama_produk.includes('Galon'))
      .reduce((sum, item) => sum + (item.jumlah || 0), 0);
    return acc + galonQty;
  }, 0);

  const totalLiterTerjual = filteredPesanan.reduce((acc, p) => {
    if (!p || !p.items || !Array.isArray(p.items)) return acc;
    const orderLiter = p.items.reduce((sum, item) => {
      if (!item) return sum;
      const prod = (produkList || []).find(pr => pr && pr.id === item.produk_id);
      const nama = item.nama_produk || '';
      const vol = prod ? (prod.volume_liter || 19) : nama.includes('19L') ? 19 : nama.includes('15L') ? 15 : 10;
      return sum + (vol * (item.jumlah || 0));
    }, 0);
    return acc + orderLiter;
  }, 0);

  // Meteran Air Depo Calculations (Hitung Otomatis POS vs Entry Kasir & Selisih)
  const activeShift = (shiftList || []).find(s => s.status === 'buka');
  const closedShifts = (shiftList || []).filter(s => s.status === 'tutup' && s.meter_akhir !== undefined);
  const latestClosedShift = closedShifts.length > 0 ? closedShifts[0] : null;

  const targetShift = activeShift || latestClosedShift;

  let meterAwalBasis = pengaturan.meteran_air_awal_liter ?? 0;
  let totalLiterShift = 0;
  let meterDepoEntryKasir: number | null = null;

  if (targetShift) {
    meterAwalBasis = targetShift.meter_awal || 0;
    const shiftBukaTime = new Date(targetShift.waktu_buka).getTime();
    const shiftTutupTime = targetShift.waktu_tutup ? new Date(targetShift.waktu_tutup).getTime() : Date.now() + 86400000;

    const pesananShift = pesananList.filter(p => {
      if (!p || !p.created_at) return false;
      const t = new Date(p.created_at).getTime();
      return t >= shiftBukaTime && t <= shiftTutupTime;
    });

    totalLiterShift = pesananShift.reduce((acc, p) => {
      if (!p || !p.items || !Array.isArray(p.items)) return acc;
      const orderLiter = p.items.reduce((sum, item) => {
        if (!item) return sum;
        const prod = (produkList || []).find(pr => pr && pr.id === item.produk_id);
        const nama = item.nama_produk || '';
        const vol = prod ? (prod.volume_liter || 19) : nama.includes('19L') ? 19 : nama.includes('15L') ? 15 : 10;
        return sum + (vol * (item.jumlah || 0));
      }, 0);
      return acc + orderLiter;
    }, 0);

    if (targetShift.status === 'tutup') {
      meterDepoEntryKasir = targetShift.meter_akhir ?? null;
    }
  }

  const meterDepoHitungOtomatis = meterAwalBasis + totalLiterShift;
  const hasMeterEntryKasir = meterDepoEntryKasir !== null && meterDepoEntryKasir !== undefined;
  const selisihMeterAirDepo = hasMeterEntryKasir ? (meterDepoEntryKasir! - meterDepoHitungOtomatis) : 0;


  // Target penjualan periode terpilih (periode "semua" tidak punya target)
  const periodeTarget: PeriodeTarget | null = periode === 'semua' ? null : periode;
  const targetOmzetCurrent = periodeTarget ? ambilTarget(pengaturan, 'omzet', periodeTarget) : 0;
  const targetGalonCurrent = periodeTarget ? ambilTarget(pengaturan, 'galon', periodeTarget) : 0;
  const targetLiterCurrent = periodeTarget ? ambilTarget(pengaturan, 'liter', periodeTarget) : 0;

  const persenCapaianOmzet = persenCapaian(totalOmzet, targetOmzetCurrent);
  const persenCapaianGalon = persenCapaian(totalGalonTerjual, targetGalonCurrent);
  const persenCapaianLiter = persenCapaian(totalLiterTerjual, targetLiterCurrent);

  // Laba Rugi & Dynamic HPP Calculations
  // HPP per Liter = (Total Kas Pembelian Air Baku / Total Volume Air Baku Terkirim)
  const pembelianAirBakuPeriode = (filteredPengeluaran || []).filter(p => p && p.kategori === 'pembelian_air_baku' && (p.volume_air_masuk_liter || 0) > 0);
  const totalBiayaAirBakuPeriode = pembelianAirBakuPeriode.reduce((sum, p) => sum + (p.nominal || 0), 0);
  const totalVolumeAirBakuPeriode = pembelianAirBakuPeriode.reduce((sum, p) => sum + (p.volume_air_masuk_liter || 0), 0);

  // Fallback ke riwayat pembelian air baku all-time jika di periode filter tidak ada pengiriman tangki
  const pembelianAirBakuAllTime = (pengeluaranList || []).filter(p => p && p.kategori === 'pembelian_air_baku' && (p.volume_air_masuk_liter || 0) > 0);
  const totalBiayaAirBakuAllTime = pembelianAirBakuAllTime.reduce((sum, p) => sum + (p.nominal || 0), 0);
  const totalVolumeAirBakuAllTime = pembelianAirBakuAllTime.reduce((sum, p) => sum + (p.volume_air_masuk_liter || 0), 0);

  let hppPerLiter = 0;
  let isHppEstimated = false;
  if (totalVolumeAirBakuPeriode > 0) {
    hppPerLiter = totalBiayaAirBakuPeriode / totalVolumeAirBakuPeriode;
  } else if (totalVolumeAirBakuAllTime > 0) {
    hppPerLiter = totalBiayaAirBakuAllTime / totalVolumeAirBakuAllTime;
  } else {
    hppPerLiter = 37.5; // Default standar depo (misal Rp 300.000 / 8000 liter = Rp 37.5 / Liter)
    isHppEstimated = true;
  }

  const hppPerLiterFormatted = Number(hppPerLiter.toFixed(1));
  const totalHppAirTerjual = Math.round(totalLiterTerjual * hppPerLiter);

  // Biaya operasional lain-lain (selain pembelian air baku)
  const totalBiayaOperasionalLainnya = (filteredPengeluaran || [])
    .filter(p => p && p.tipe_arus_kas !== 'masuk' && p.kategori !== 'pengembalian_kasbon' && p.kategori !== 'pembelian_air_baku')
    .reduce((acc, p) => acc + (p?.nominal || 0), 0);

  const labaKotor = totalOmzet - totalHppAirTerjual;
  const totalBebanUsaha = totalHppAirTerjual + totalBiayaOperasionalLainnya;
  const labaBersih = Math.max(0, totalOmzet - totalBebanUsaha);
  const profitMarginPercent = totalOmzet > 0 ? Math.round((labaBersih / totalOmzet) * 100) : 0;

  // Formatting Helpers
  const formatJamOrder = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch (e) {
      return dateStr;
    }
  };

  const formatTanggalJam = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatProdukRingkas = (items: Pesanan['items']) => {
    if (!items || items.length === 0) return '-';
    return items.map(item => `${item.nama_produk} (x${item.jumlah})`).join(', ');
  };

  // Reset/Reset Counter Komponen Terakhir Ganti
  const handleResetKomponenServis = (kompId: string) => {
    const updatedList = (pengaturan.komponen_servis_list || []).map(k => 
      k.id === kompId ? { ...k, liter_terakhir_ganti: totalLiterTerjual } : k
    );
    const updatedPengaturan = { ...pengaturan, komponen_servis_list: updatedList };
    AppStore.savePengaturan(updatedPengaturan);
    setPengaturan(updatedPengaturan);
    alert('Komponen berhasil ditandai sudah diganti/diservis! Counter liter telah di-reset.');
  };

  // Evaluate Alerts
  const minStokAirBaku = pengaturan.min_stok_air_baku_liter || 2000;
  const stokAirBakuSaatIni = pengaturan.stok_air_baku_saat_ini ?? 0;
  const isAirBakuMenipis = (pengaturan.notifikasi_air_baku_aktif !== false) && (stokAirBakuSaatIni <= minStokAirBaku);

  const activeKomponenList = (pengaturan.komponen_servis_list || []).filter(k => k.aktif);

  // Pagination Calculations
  const totalPengeluaranPages = Math.max(1, Math.ceil(filteredPengeluaran.length / ITEMS_PER_PAGE_EXPENSE));
  const currentPengeluaranPage = Math.min(pengeluaranPage, totalPengeluaranPages);
  const paginatedPengeluaran = filteredPengeluaran.slice(
    (currentPengeluaranPage - 1) * ITEMS_PER_PAGE_EXPENSE,
    currentPengeluaranPage * ITEMS_PER_PAGE_EXPENSE
  );

  const searchFilteredPesanan = filteredPesanan.filter(p => {
    if (!riwayatSearch.trim()) return true;
    const q = riwayatSearch.toLowerCase().trim();
    return (
      (p.no_nota && p.no_nota.toLowerCase().includes(q)) ||
      (p.nama_pelanggan && p.nama_pelanggan.toLowerCase().includes(q)) ||
      (p.status_pesanan && p.status_pesanan.toLowerCase().includes(q))
    );
  });
  const totalRiwayatPages = Math.max(1, Math.ceil(searchFilteredPesanan.length / ITEMS_PER_PAGE_TRANSACTIONS));
  const currentRiwayatPage = Math.min(riwayatPage, totalRiwayatPages);
  const paginatedRiwayatPesanan = searchFilteredPesanan.slice(
    (currentRiwayatPage - 1) * ITEMS_PER_PAGE_TRANSACTIONS,
    currentRiwayatPage * ITEMS_PER_PAGE_TRANSACTIONS
  );

  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (p: number) => void) => {
    if (totalPages <= 1) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Halaman <strong style={{ color: 'var(--c-sky)' }}>{currentPage}</strong> dari <strong>{totalPages}</strong>
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary btn-sm"
            style={{ opacity: currentPage === 1 ? 0.5 : 1, padding: '4px 12px', fontSize: '0.8rem' }}
          >
            Sebelumnya
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-secondary btn-sm"
            style={{ opacity: currentPage === totalPages ? 0.5 : 1, padding: '4px 12px', fontSize: '0.8rem' }}
          >
            Berikutnya
          </button>
        </div>
      </div>
    );
  };

  // Hitungan kas satu shift (dipakai tabel di layar lebar dan kartu di HP)
  const hitungBarisShift = (s: ShiftKasir) => {
      const isShiftBuka = s.status === 'buka';
      const shiftBukaTime = new Date(s.waktu_buka).getTime();
      const shiftTutupTime = s.waktu_tutup ? new Date(s.waktu_tutup).getTime() : Date.now();

      const pesananShift = pesananList.filter(p => {
        if (!p?.created_at) return false;
        const t = new Date(p.created_at).getTime();
        return t >= shiftBukaTime && t <= shiftTutupTime;
      });

      const pengeluaranShift = pengeluaranList.filter(p => {
        if (!p?.tanggal) return false;
        const t = new Date(p.tanggal).getTime();
        return t >= shiftBukaTime && t <= shiftTutupTime;
      });

      const tunaiMasukShift = s.total_tunai_masuk ?? (AppStore.totalTunaiLangsung(pesananShift)
        + (setoranList || []).filter(x => !x.dibatalkan && new Date(x.tanggal).getTime() >= shiftBukaTime && new Date(x.tanggal).getTime() <= shiftTutupTime).reduce((sum, x) => sum + (x.nominal || 0), 0));

      // Hanya pengeluaran bersumber laci; uang yang diserahkan ke owner selama shift juga mengurangi laci
      const kasShiftIni = AppStore.hitungKasLaci(s.saldo_awal, shiftBukaTime, shiftTutupTime);
      const kasKeluarShift = kasShiftIni.keluar;
      const kasbonKembaliShift = kasShiftIni.kasbonKembali;

      const ekspektasiKasShift = (s.saldo_awal + tunaiMasukShift + kasbonKembaliShift) - kasKeluarShift - kasShiftIni.diserahkanOwner;
      const kasFisikAktualShift = isShiftBuka ? ekspektasiKasShift : (s.saldo_akhir_aktual ?? ekspektasiKasShift);
      const selisihShift = isShiftBuka ? 0 : (s.selisih ?? (kasFisikAktualShift - ekspektasiKasShift));
    return { isShiftBuka, tunaiMasukShift, kasKeluarShift, ekspektasiKasShift, kasFisikAktualShift, selisihShift };
  };

  const renderRekapKasAndShiftAuditSection = () => {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '24px', borderTop: '4px solid var(--c-red-strong)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingDown size={22} color="#f87171" /> Setoran Kas dan Audit Shift ({periode.toUpperCase()})
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
              Rangkuman modal kas awal kasir, hasil setoran tunai, pengeluaran kas, serta audit selisih kas fisik.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-primary">{filteredShiftList.length} Shift Kasir</span>
            <span className="badge badge-danger">{filteredPengeluaran.length} Item Pengeluaran</span>
          </div>
        </div>

        {/* 5 Box Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Modal Kas Laci Awal</span>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-sky)', marginTop: '4px' }}>
              {AppStore.formatRupiah(totalModalAwalShift)}
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dari {closedShiftList.length} shift tutup</span>
          </div>

          <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Tunai Masuk</span>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-green)', marginTop: '4px' }}>
              +{AppStore.formatRupiah(totalTunaiMasuk + totalPengembalianKasbon)}
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Penjualan &amp; Kasbon Kembali</span>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--c-red-soft)' }}>Total Kas Keluar</span>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-red)', marginTop: '4px' }}>
              -{AppStore.formatRupiah(totalPengeluaranKeluar)}
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--c-red-soft)' }}>Ongkir, Gaji, Kasbon, Air</span>
          </div>

          <div style={{ background: 'rgba(2, 132, 199, 0.15)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--c-blue-soft)' }}>Kas Fisik di Tangan (Aktual)</span>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-sky)', marginTop: '4px' }}>
              {AppStore.formatRupiah(hasClosedShift ? totalKasFisikAktualShift : kasBersihSetoranOwner)}
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>Di-entry Kasir saat Tutup</span>
          </div>

          <div style={{ 
            background: hasClosedShift && totalSelisihKasShift < 0 ? 'rgba(239, 68, 68, 0.2)' : hasClosedShift && totalSelisihKasShift > 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.15)', 
            padding: '14px', 
            borderRadius: '12px', 
            border: `2px solid ${hasClosedShift && totalSelisihKasShift < 0 ? 'var(--c-red-strong)' : hasClosedShift && totalSelisihKasShift > 0 ? 'var(--c-sky)' : 'var(--c-green)'}` 
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 700 }}>AUDIT SELISIH KAS</span>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: hasClosedShift && totalSelisihKasShift < 0 ? 'var(--c-red)' : hasClosedShift && totalSelisihKasShift > 0 ? 'var(--c-sky)' : 'var(--c-green)', marginTop: '4px' }}>
              {!hasClosedShift ? 'Belum Ada Tutup' : totalSelisihKasShift === 0 ? 'PAS (Rp 0)' : totalSelisihKasShift < 0 ? `-${AppStore.formatRupiah(Math.abs(totalSelisihKasShift))}` : `+${AppStore.formatRupiah(totalSelisihKasShift)}`}
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>
              {!hasClosedShift ? 'Shift kasir masih aktif' : totalSelisihKasShift === 0 ? 'Kas fisik 100% cocok' : totalSelisihKasShift < 0 ? 'Kurang Setor (Tekor)' : 'Lebih Setor (Surplus)'}
            </span>
          </div>
        </div>

        {/* SUB-SECTION 1: Tabel Audit Shift Kasir */}
        <div style={{ marginBottom: '28px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} color="#38bdf8" /> Riwayat &amp; Audit Shift Kasir ({periode.toUpperCase()})
          </h4>
          {filteredShiftList.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', background: 'var(--inset-40)', borderRadius: '10px' }}>
              Belum ada riwayat pembukaan/penutupan shift kasir pada periode {periode}.
            </div>
          ) : (
            <>
            <div className="tabel-shift-lebar" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', textAlign: 'left', background: 'var(--inset-60)' }}>
                    <th style={{ padding: '10px' }}>Waktu Shift (Buka - Tutup)</th>
                    <th style={{ padding: '10px' }}>Kasir</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Modal Awal</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Tunai Masuk</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Kas Keluar</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Ekspektasi Kas</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Kas Fisik (Aktual)</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Audit Selisih</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Foto Meter</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShiftList.map(s => {
                    const { isShiftBuka, tunaiMasukShift, kasKeluarShift, ekspektasiKasShift, kasFisikAktualShift, selisihShift } = hitungBarisShift(s);

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--w-6)' }}>
                        <td style={{ padding: '10px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                          <div><b>Buka:</b> {formatTanggalJam(s.waktu_buka)}</div>
                          <div style={{ fontSize: '0.75rem', color: s.waktu_tutup ? 'var(--text-muted)' : 'var(--c-sky)' }}>
                            <b>Tutup:</b> {s.waktu_tutup ? formatTanggalJam(s.waktu_tutup) : 'Masih Aktif'}
                          </div>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {s.kasir_nama || 'Kasir'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: 'var(--c-sky)', fontWeight: 600 }}>
                          {AppStore.formatRupiah(s.saldo_awal)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: 'var(--c-green)', fontWeight: 600 }}>
                          +{AppStore.formatRupiah(tunaiMasukShift)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: 'var(--c-red)', fontWeight: 600 }}>
                          -{AppStore.formatRupiah(kasKeluarShift)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text-2)', fontWeight: 600 }}>
                          {AppStore.formatRupiah(ekspektasiKasShift)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: 'var(--c-sky)' }}>
                          {isShiftBuka ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Shift berjalan</span> : AppStore.formatRupiah(kasFisikAktualShift)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {isShiftBuka ? (
                            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>SHIFT AKTIF</span>
                          ) : selisihShift === 0 ? (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>PAS (Rp 0)</span>
                          ) : selisihShift < 0 ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Kurang {AppStore.formatRupiah(Math.abs(selisihShift))}</span>
                          ) : (
                            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Lebih +{AppStore.formatRupiah(selisihShift)}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {(['awal', 'akhir'] as const).map(jenis => {
                            const foto = fotoMeterList.find(f => f.shift_id === s.id && f.jenis === jenis);
                            const meter = jenis === 'awal' ? s.meter_awal : s.meter_akhir;
                            if (!foto) return null;
                            return (
                              <button
                                key={jenis}
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setFotoLihat({ judul: `Meteran ${jenis} - ${s.kasir_nama || 'Kasir'}`, gambar: foto.gambar, info: `${formatTanggalJam(foto.waktu)}${meter !== undefined ? ` - tercatat ${meter.toLocaleString('id-ID')} Liter` : ''}` })}
                                style={{ marginInline: '2px', fontSize: '0.72rem' }}
                              >
                                Foto {jenis}
                              </button>
                            );
                          })}
                          {!fotoMeterList.some(f => f.shift_id === s.id) && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="kartu-shift-sempit">
              {filteredShiftList.map(s => {
                const { isShiftBuka, tunaiMasukShift, kasKeluarShift, ekspektasiKasShift, kasFisikAktualShift, selisihShift } = hitungBarisShift(s);
                return (
                  <div key={s.id} className="glass-card" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong>{s.kasir_nama || 'Kasir'}</strong>
                      {isShiftBuka ? (
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>SHIFT AKTIF</span>
                      ) : selisihShift === 0 ? (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>PAS</span>
                      ) : selisihShift < 0 ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Kurang {AppStore.formatRupiah(Math.abs(selisihShift))}</span>
                      ) : (
                        <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Lebih +{AppStore.formatRupiah(selisihShift)}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {formatTanggalJam(s.waktu_buka)} sampai {s.waktu_tutup ? formatTanggalJam(s.waktu_tutup) : 'masih aktif'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Modal awal</span><strong style={{ textAlign: 'right' }}>{AppStore.formatRupiah(s.saldo_awal)}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>Tunai masuk</span><strong style={{ textAlign: 'right', color: 'var(--c-green)' }}>+{AppStore.formatRupiah(tunaiMasukShift)}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>Kas keluar</span><strong style={{ textAlign: 'right', color: 'var(--c-red)' }}>-{AppStore.formatRupiah(kasKeluarShift)}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>Ekspektasi</span><strong style={{ textAlign: 'right' }}>{AppStore.formatRupiah(ekspektasiKasShift)}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>Kas fisik</span><strong style={{ textAlign: 'right', color: 'var(--c-sky)' }}>{isShiftBuka ? 'berjalan' : AppStore.formatRupiah(kasFisikAktualShift)}</strong>
                    </div>
                    {(['awal', 'akhir'] as const).some(jenis => fotoMeterList.some(f => f.shift_id === s.id && f.jenis === jenis)) && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {(['awal', 'akhir'] as const).map(jenis => {
                          const foto = fotoMeterList.find(f => f.shift_id === s.id && f.jenis === jenis);
                          const meter = jenis === 'awal' ? s.meter_awal : s.meter_akhir;
                          if (!foto) return null;
                          return (
                            <button
                              key={jenis}
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setFotoLihat({ judul: `Meteran ${jenis} - ${s.kasir_nama || 'Kasir'}`, gambar: foto.gambar, info: `${formatTanggalJam(foto.waktu)}${meter !== undefined ? ` - tercatat ${meter.toLocaleString('id-ID')} Liter` : ''}` })}
                            >
                              Foto {jenis}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>

        {/* SUB-SECTION 2: Tabel Pengeluaran Operasional */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={18} color="#f87171" /> Rincian Pengeluaran Kasir ({periode.toUpperCase()})
          </h4>
          {filteredPengeluaran.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', background: 'var(--inset-40)', borderRadius: '10px' }}>
              Tidak ada catatan pengeluaran kasir pada periode {periode}.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', textAlign: 'left', background: 'var(--inset-60)' }}>
                    <th style={{ padding: '10px' }}>Tanggal &amp; Waktu</th>
                    <th style={{ padding: '10px' }}>Isian Peruntukan / Keperluan</th>
                    <th style={{ padding: '10px' }}>Karyawan Terkait</th>
                    <th style={{ padding: '10px' }}>Kategori</th>
                    <th style={{ padding: '10px' }}>Dicatat Oleh (Kasir)</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Nominal (Rp)</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPengeluaran.map(item => {
                    const isMasuk = item.tipe_arus_kas === 'masuk' || item.kategori === 'pengembalian_kasbon';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--w-6)' }}>
                        <td style={{ padding: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatTanggalJam(item.tanggal)}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {item.peruntukan}
                          {item.kategori === 'pembelian_air_baku' && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--c-sky)', marginTop: '2px', fontWeight: 500 }}>
                              Vendor: {item.nama_vendor_pengirim || '-'} | Vol: {item.volume_air_masuk_liter || 0} Liter | HPP Air: Rp {((item.nominal || 0) / (item.volume_air_masuk_liter || 1)).toFixed(1)}/L | Air: {AppStore.formatRupiah(item.harga_perolehan_air || 0)} | Tips Sopir: {AppStore.formatRupiah(item.tips_sopir_pengirim || 0)}
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
                            onClick={() => {
                              if (confirm(`Hapus catatan pengeluaran "${item.peruntukan}"?`)) {
                                AppStore.deletePengeluaran(item.id);
                              }
                            }}
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
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <ExpenseReceiptModal pengeluaran={activeExpenseReceipt} onClose={() => setActiveExpenseReceipt(null)} />
      
      {/* Kepala halaman dan pilihan periode */}
      <div className="glass-card animate-fade-in" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <LayoutDashboard size={26} color="#38bdf8" aria-hidden="true" /> Dashboard Owner
        </h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          <Calendar size={16} color="#38bdf8" aria-hidden="true" /> Periode
          <select className="form-select" aria-label="Periode laporan" value={periode} onChange={(e) => setPeriode(e.target.value as PeriodeFilter)} style={{ width: 'auto', minHeight: '44px' }}>
            <option value="harian">Harian</option>
            <option value="mingguan">Mingguan (7 hari terakhir)</option>
            <option value="bulanan">Bulanan (bulan ini)</option>
            <option value="tahunan">Tahunan</option>
            <option value="semua">Semua waktu</option>
          </select>
        </label>
      </div>

      {/* BANNER NOTIFIKASI ALARM CRITICAL STOK AIR BAKU */}
      {isWaterStockCriticalCalc && (
        <div className="glass-card animate-fade-in" style={{
          padding: '16px 20px',
          background: hasWaterStockAlarmAudio 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(185, 28, 28, 0.4) 100%)' 
            : 'rgba(239, 68, 68, 0.15)',
          border: '2px solid var(--c-red-strong)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {hasWaterStockAlarmAudio ? (
                <Volume2 size={28} color="#ef4444" className="animate-pulse" />
              ) : (
                <AlertTriangle size={28} color="#f87171" />
              )}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Stok air baku menipis ({currentStokAirBakuCalc.toLocaleString('id-ID')} Liter)
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--c-red-soft)', marginTop: '2px' }}>
                  Batas minimum {minStokAirBakuCalc.toLocaleString('id-ID')} L. Segera pesan tangki air baku.
                  {isWaterAlarmMuted && ' Suara dimatikan.'}
                  {isWaterAlarmSnoozed && ` Suara ditunda ${Math.max(1, Math.ceil((waterAlarmSnoozedUntil - nowTick) / (1000 * 60)))} menit.`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setNewStokAirInput(pengaturan.stok_air_baku_saat_ini ?? 0);
                  const defaultMeter = meterDepoHitungOtomatis > 0 ? meterDepoHitungOtomatis : (hasMeterEntryKasir ? meterDepoEntryKasir! : (pengaturan.meteran_air_awal_liter ?? 10000));
                  setNewMeterAirInput(defaultMeter);
                  setShowOwnerMeterAdjustModal(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ background: 'linear-gradient(135deg, var(--c-green-strong) 0%, var(--c-green-deep) 100%)', fontWeight: 700, padding: '8px 14px', border: 'none' }}
              >
                Pesan / tambah air baku
              </button>

              <button
                onClick={() => {
                  setWaterAlarmSnoozedUntil(Date.now() + (pengaturan.durasi_snooze_menit || 15) * 60 * 1000);
                  setIsWaterAlarmMuted(false);
                }}
                className="btn btn-warning btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'var(--c-amber-strong)', color: 'var(--on-accent)', border: 'none', padding: '8px 14px' }}
              >
                <Clock size={16} aria-hidden="true" /> Tunda suara
              </button>

              <button
                onClick={() => setIsWaterAlarmMuted(!isWaterAlarmMuted)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.25)', border: '1px solid var(--c-red-strong)', color: 'var(--c-red-soft)', padding: '8px 14px' }}
              >
                <BellOff size={16} aria-hidden="true" /> {isWaterAlarmMuted ? 'Nyalakan suara' : 'Matikan suara'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB NAVIGATION BAR */}
      <div className="glass-card animate-fade-in" style={{ padding: '8px 12px', background: 'var(--inset-80)', border: '1px solid var(--glass-border)' }}>
        <div role="tablist" aria-label="Bagian dashboard" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            role="tab" aria-selected={activeTab === 'overview'} onClick={() => setActiveTab('overview')}
            className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '0.88rem',
              background: activeTab === 'overview' ? 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-sky) 100%)' : undefined
            }}
          >
            <LayoutDashboard size={18} aria-hidden="true" /> Ringkasan
            {delayedPending.length > 0 && (
              <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{delayedPending.length}</span>
            )}
          </button>

          <button
            role="tab" aria-selected={activeTab === 'keuangan'} onClick={() => setActiveTab('keuangan')}
            className={`btn btn-sm ${activeTab === 'keuangan' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '0.88rem',
              background: activeTab === 'keuangan' ? 'linear-gradient(135deg, var(--c-green-strong) 0%, var(--c-green-deep) 100%)' : undefined
            }}
          >
            <DollarSign size={18} aria-hidden="true" /> Keuangan
          </button>

          <button
            role="tab" aria-selected={activeTab === 'karyawan_piutang'} onClick={() => setActiveTab('karyawan_piutang')}
            className={`btn btn-sm ${activeTab === 'karyawan_piutang' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '0.88rem',
              background: activeTab === 'karyawan_piutang' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : undefined
            }}
          >
            <Users size={18} aria-hidden="true" /> Staf dan Piutang
            {pelangganBerhutang.length > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{pelangganBerhutang.length}</span>
            )}
          </button>

          <button
            role="tab" aria-selected={activeTab === 'pemeliharaan'} onClick={() => setActiveTab('pemeliharaan')}
            className={`btn btn-sm ${activeTab === 'pemeliharaan' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '0.88rem',
              background: activeTab === 'pemeliharaan' ? 'linear-gradient(135deg, var(--c-amber-strong) 0%, #d97706 100%)' : undefined
            }}
          >
            <Wrench size={18} aria-hidden="true" /> Mesin dan servis
          </button>

          <button
            role="tab" aria-selected={activeTab === 'riwayat'} onClick={() => setActiveTab('riwayat')}
            className={`btn btn-sm ${activeTab === 'riwayat' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '0.88rem',
              background: activeTab === 'riwayat' ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : undefined
            }}
          >
            <FileText size={18} aria-hidden="true" /> Riwayat ({filteredPesanan.length})
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: RINGKASAN & METERAN (OVERVIEW) */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ANGKA UTAMA: omzet dan sisa air baku */}
          <section aria-label="Angka utama" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '12px' }}>
            <div className="glass-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Omzet {periode === 'semua' ? 'seluruh waktu' : periode}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--c-green)', marginTop: '4px' }}>{AppStore.formatRupiah(totalOmzet)}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {filteredPesanan.length} transaksi{targetOmzetCurrent > 0 ? ` - ${persenCapaianOmzet}% dari target ${AppStore.formatRupiah(targetOmzetCurrent)}` : ''}
              </div>
            </div>

            <button
              type="button"
              className="glass-card"
              onClick={() => setActiveTab('pemeliharaan')}
              aria-label={`Sisa air baku ${currentStokAirBakuCalc.toLocaleString('id-ID')} liter, buka meteran dan servis`}
              style={{ padding: '18px', textAlign: 'left', color: 'inherit', cursor: 'pointer', font: 'inherit', borderColor: isWaterStockCriticalCalc ? 'var(--c-red-strong)' : undefined }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sisa air baku</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isWaterStockCriticalCalc ? 'var(--c-red)' : 'var(--c-sky)', marginTop: '4px' }}>
                {currentStokAirBakuCalc.toLocaleString('id-ID')} Liter
              </div>
              <div style={{ fontSize: '0.82rem', color: isWaterStockCriticalCalc ? 'var(--c-red-soft)' : 'var(--text-muted)', marginTop: '2px' }}>
                Batas minimum {minStokAirBakuCalc.toLocaleString('id-ID')} L{isWaterStockCriticalCalc ? ' - segera pesan air baku' : ' - lihat meteran dan servis'}
              </div>
            </button>
          </section>

          {/* PERLU TINDAKAN: semua hal yang menunggu keputusan atau penanganan */}
          <section aria-labelledby="judul-tindakan">
            <h2 id="judul-tindakan" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>Perlu tindakan</h2>
            {(() => {
              const setoranMenunggu = setoranOwnerList.filter(s => s.status === 'menunggu');
              const totalMenunggu = setoranMenunggu.reduce((acc, s) => acc + s.nominal, 0);
              const butir: React.ReactNode[] = [];
              if (isWaterStockCriticalCalc) butir.push(<li key="air">Stok air baku menipis ({currentStokAirBakuCalc.toLocaleString('id-ID')} L, batas {minStokAirBakuCalc.toLocaleString('id-ID')} L)</li>);
              if (currentUser?.role === 'owner' && setoranMenunggu.length > 0) {
                butir.push(<li key="setoran">{setoranMenunggu.length} setoran kasir menunggu diterima ({AppStore.formatRupiah(totalMenunggu)}). <a href="/owner/keuangan" style={{ color: 'var(--c-sky)', fontWeight: 700 }}>Buka Keuangan Owner</a></li>);
              }
              if (delayedPending.length > 0) butir.push(<li key="antaran">{delayedPending.length} pesanan terlambat diantar (lebih dari {formatThresholdText(thresholdMins)})</li>);
              if (hasClosedShift && totalSelisihKasShift !== 0) butir.push(<li key="selisih">Selisih kas shift {AppStore.formatRupiah(totalSelisihKasShift)} pada periode ini</li>);
              const adaButir = butir.length > 0;
              return (
                <div
                  role="status"
                  style={{
                    padding: '10px 14px', borderRadius: '12px', fontSize: '0.9rem',
                    background: adaButir ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    border: `1px solid ${adaButir ? 'rgba(251, 191, 36, 0.5)' : 'rgba(52, 211, 153, 0.4)'}`
                  }}
                >
                  {adaButir ? (
                    <ul style={{ margin: '0 0 0 18px', color: 'var(--text-3)', lineHeight: 1.7 }}>{butir}</ul>
                  ) : (
                    <span style={{ color: 'var(--c-green)', fontWeight: 600 }}>Semua aman. Tidak ada yang perlu ditindaklanjuti.</span>
                  )}
                </div>
              );
            })()}
          </section>

          {/* PEMBERITAHUAN: mis. kasir mengoreksi setoran kurir */}
          {notifList.length > 0 && (
            <section aria-labelledby="judul-pemberitahuan" className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--c-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h2 id="judul-pemberitahuan" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Pemberitahuan {notifList.filter(n => !n.dibaca).length > 0 && <span className="badge badge-danger">{notifList.filter(n => !n.dibaca).length} baru</span>}
                </h2>
                {notifList.some(n => !n.dibaca) && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => AppStore.tandaiNotifikasiDibaca()}>Tandai semua dibaca</button>
                )}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notifList.slice(0, 5).map(n => (
                  <li key={n.id} style={{ padding: '10px 12px', borderRadius: '10px', background: n.dibaca ? 'var(--inset-50)' : 'rgba(245, 158, 11, 0.14)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ color: n.dibaca ? 'var(--text-main)' : 'var(--c-amber)' }}>{n.judul}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.waktu).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: '0.88rem', marginTop: '2px' }}>{n.pesan}</div>
                    {!n.dibaca && (
                      <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }} onClick={() => AppStore.tandaiNotifikasiDibaca(n.id)}>Tandai dibaca</button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* IKHTISAR: angka utama dan hal yang perlu perhatian */}
          <section aria-labelledby="judul-ikhtisar">
            <h2 id="judul-ikhtisar" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
              Uang dan antaran ({periode === 'semua' ? 'seluruh waktu' : periode})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Kas bersih</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-sky)', marginTop: '4px' }}>{AppStore.formatRupiah(kasBersihSetoranOwner)}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Uang tunai masuk dikurangi pengeluaran (belum tentu laba)</div>
              </div>

              {currentUser?.role !== 'admin' && (
                <div className="glass-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Laba bersih</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-green)', marginTop: '4px' }}>{AppStore.formatRupiah(labaBersih)}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Margin {profitMarginPercent}% (penjualan dikurangi HPP air dan biaya)</div>
                </div>
              )}

              <button
                type="button"
                className="glass-card"
                onClick={() => setActiveTab('karyawan_piutang')}
                style={{ padding: '14px', textAlign: 'left', color: 'inherit', cursor: 'pointer', font: 'inherit' }}
                aria-label={`Piutang pelanggan ${AppStore.formatRupiah(totalPiutangPelanggan)}, buka rincian`}
              >
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Piutang pelanggan</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: totalPiutangPelanggan > 0 ? 'var(--c-amber)' : 'var(--c-green)', marginTop: '4px' }}>
                  {AppStore.formatRupiah(totalPiutangPelanggan)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{pelangganBerhutang.length} pelanggan{pelangganBerhutang[0] ? `, tagih ${pelangganBerhutang[0].nama} dulu` : ''}</div>
              </button>

              <div className="glass-card" style={{ padding: '14px', borderColor: delayedPending.length > 0 ? 'var(--c-red-strong)' : undefined }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Antaran belum terkirim</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: delayedPending.length > 0 ? 'var(--c-red)' : 'var(--text-main)', marginTop: '4px' }}>
                  {pendingDelivery.length} pesanan
                </div>
                <div style={{ fontSize: '0.78rem', color: delayedPending.length > 0 ? 'var(--c-red-soft)' : 'var(--text-muted)', marginTop: '2px' }}>
                  {delayedPending.length > 0 ? `${delayedPending.length} terlambat` : 'Tidak ada yang terlambat'}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '14px', borderColor: totalUangDiKurir > 0 ? 'var(--c-amber)' : undefined }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Uang di kurir</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: totalUangDiKurir > 0 ? 'var(--c-amber)' : 'var(--c-green)', marginTop: '4px' }}>
                  {AppStore.formatRupiah(totalUangDiKurir)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {kurirMembawaUang.length > 0
                    ? kurirMembawaUang.map(k => k.kurir_nama + ' ' + AppStore.formatRupiah(k.saldo)).join(' - ')
                    : 'Belum disetor: tidak ada'}
                </div>
              </div>
            </div>

          </section>


      {/* SECTION 2: Target Penjualan & Capaiannya */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={22} color="#10b981" /> Target Penjualan & Capaian ({periode.toUpperCase()})
          </h3>
          <button
            onClick={handleOpenEditTargetModal}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', borderColor: 'rgba(16, 185, 129, 0.5)', color: 'var(--c-green)', background: 'rgba(16, 185, 129, 0.1)' }}
          >
            Edit Target Penjualan
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '16px' }}>
          
          {periode === 'semua' && (
            <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Target berlaku untuk periode Harian sampai Tahunan. Pilih salah satunya di bagian atas untuk melihat capaian.
            </p>
          )}

          <KartuTarget
            judul="Target Pendapatan / Omzet"
            capaianTeks={AppStore.formatRupiah(totalOmzet)}
            targetTeks={AppStore.formatRupiah(targetOmzetCurrent)}
            persen={persenCapaianOmzet}
            adaTarget={targetOmzetCurrent > 0}
            warna="linear-gradient(90deg, var(--c-green-strong) 0%, var(--c-green) 100%)"
          />

          <KartuTarget
            judul="Target Volume Penjualan Galon"
            capaianTeks={`${totalGalonTerjual.toLocaleString('id-ID')} Galon`}
            targetTeks={`${targetGalonCurrent.toLocaleString('id-ID')} Galon`}
            persen={persenCapaianGalon}
            adaTarget={targetGalonCurrent > 0}
            warna="linear-gradient(90deg, var(--c-primary) 0%, var(--c-sky) 100%)"
          />

          <KartuTarget
            judul="Target Volume Penjualan Liter"
            capaianTeks={`${totalLiterTerjual.toLocaleString('id-ID')} Liter`}
            targetTeks={`${targetLiterCurrent.toLocaleString('id-ID')} Liter`}
            persen={persenCapaianLiter}
            adaTarget={targetLiterCurrent > 0}
            warna="linear-gradient(90deg, var(--c-amber-strong) 0%, var(--c-amber) 100%)"
            keterangan="semua produk, dihitung dari volume tiap wadah"
          />

        </div>
      </div>

      {/* SECTION PALING ATAS: Detail Pengiriman Pending (Belum Terkirim) */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px', borderTop: '4px solid var(--c-amber)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={24} color="#fbbf24" /> Antaran Belum Terkirim
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {delayedPending.length > 0 && (
              <span className="badge badge-danger animate-pulse">
                {delayedPending.length} Terlambat (&gt; {formatThresholdText(thresholdMins)})
              </span>
            )}
            <span className="badge badge-warning">{pendingDelivery.length} Antaran Menunggu</span>
          </div>
        </div>

        {/* Alarm Warning Banner for Delayed Orders */}
        {delayedPending.length > 0 && (
          <div className="glass-card animate-fade-in" style={{
            padding: '14px 18px',
            marginBottom: '16px',
            background: hasActiveAlarm 
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(185, 28, 28, 0.35) 100%)' 
              : 'rgba(239, 68, 68, 0.12)',
            border: '2px solid var(--c-red-strong)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {hasActiveAlarm ? (
                  <Volume2 size={24} color="#ef4444" className="animate-pulse" />
                ) : (
                  <BellOff size={22} color="#94a3b8" />
                )}
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Notifikasi Pesanan Belum Terkirim (&gt; {formatThresholdText(thresholdMins)})
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--c-red-soft)', marginTop: '2px' }}>
                    {hasActiveAlarm 
                      ? 'Alarm pengingat berbunyi! Pilih aksi di bawah:' 
                      : delayedPending.every(p => isOrderMuted(p.id))
                        ? 'Alarm telah dimatikan (tidak akan bunyi lagi).'
                        : `Suara alarm di-Snooze (${snoozeMins} Menit).`}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleMuteAll}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.25)', border: '1px solid var(--c-red-strong)', color: 'var(--c-red-soft)', padding: '6px 12px' }}
                >
                  <BellOff size={14} /> Matikan Alarm (Permanen)
                </button>
                <button 
                  onClick={handleSnoozeAll}
                  className="btn btn-warning btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'var(--c-amber-strong)', color: 'var(--on-accent)', border: 'none', padding: '6px 12px' }}
                >
                  <Clock size={14} /> ⏰ Snooze Tunda ({snoozeMins}m)
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingDelivery.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: 'var(--inset-50)', borderRadius: '12px', color: 'var(--c-green)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
                {pendingDelivery.map(psn => {
                  const durInfo = calculateOrderDuration(psn.created_at, psn.terkirim_at, psn.status_pesanan, thresholdMins);
                  const isMuted = isOrderMuted(psn.id);
                  const isSnoozed = isOrderSnoozed(psn.id);
                  const remainingSnooze = getSnoozeRemainingMinutes(psn.id);

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
                        {durInfo.isTerlambat ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                                <Clock size={12} /> Snooze ({remainingSnooze}m)
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
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )}

  {/* TAB CONTENT 2: KEUANGAN & LABA RUGI */}
      {activeTab === 'keuangan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SECTION 3: Laporan Keuangan & Laba Rugi (Profit & Loss) */}
          {currentUser?.role !== 'admin' && (
            <div className="glass-card animate-fade-in" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={22} color="#38bdf8" /> Laporan Keuangan &amp; Laba Rugi ({periode.toUpperCase()})
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>1. Pendapatan Penjualan (Kotor)</span>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-sky)', marginTop: '4px' }}>
                    {AppStore.formatRupiah(totalOmzet)}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dari {filteredPesanan.length} transaksi</span>
                </div>

                <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>2. HPP Air Baku Terjual</span>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-amber)', marginTop: '4px' }}>
                    -{AppStore.formatRupiah(totalHppAirTerjual)}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {totalLiterTerjual} Liter x Rp {hppPerLiterFormatted}/L {isHppEstimated ? '(Standar Depo)' : '(Kas Vendor ÷ Liter)'}
                  </span>
                </div>

                <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>3. Biaya Operasional Lainnya</span>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-red)', marginTop: '4px' }}>
                    -{AppStore.formatRupiah(totalBiayaOperasionalLainnya)}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BBM, Gaji, Komisi &amp; Operasional Kas</span>
                </div>

                <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(2, 132, 199, 0.2) 100%)', padding: '16px', borderRadius: '12px', border: '2px solid var(--c-green)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--c-green-soft)', fontWeight: 700, display: 'block' }}>4. LABA BERSIH (PROFIT)</span>
                  <h4 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--c-green)', marginTop: '4px' }}>
                    {AppStore.formatRupiah(labaBersih)}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--c-green)' }}>
                    Margin: {profitMarginPercent}% | Laba Kotor: {AppStore.formatRupiah(labaKotor)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: Rekap Kas Setoran & Audit Shift Kasir */}
          {renderRekapKasAndShiftAuditSection()}
        </div>
      )}

      {/* TAB CONTENT 3: GAJI STAF & PIUTANG */}
      {activeTab === 'karyawan_piutang' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SECTION: Rekapitulasi Hak Keuangan & Piutang Karyawan / Driver */}
          <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={22} color="#8b5cf6" /> Hak Keuangan dan Kasbon Karyawan / Kurir
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                  Monitoring Kasbon Staf, Talangan Depo, Ongkir Delivery Kurir Terjadi, dan Pembayaran Gaji Bulanan.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Bersihkan seluruh catatan riwayat transaksi pesanan & pengeluaran ongkir staf menjadi Rp 0?')) {
                      AppStore.resetSelectedData({ pesanan: true, pengeluaran: true });
                      window.location.reload();
                    }
                  }}
                  className="btn btn-danger btn-sm"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Klik untuk mereset riwayat transaksi & ongkir staf menjadi Rp 0"
                >
                  <Trash2 size={13} /> Reset Ongkir Staf
                </button>
                <span className="badge badge-primary">{(pengaturan.karyawan_list || []).length} Staf Terdaftar</span>
              </div>
            </div>

            {/* Total Staf Financial Digest Header */}
            {(() => {
              const rekapList = getRekapKaryawanList();
              const totalKasbonAktifAll = rekapList.reduce((acc, r) => acc + r.sisaKasbonAktif, 0);
              const totalHutangTokoKeStaf = rekapList.reduce((acc, r) => acc + r.sisaHutangTokoKeKary, 0);
              const totalOngkirBelumTerbayarAll = rekapList.reduce((acc, r) => acc + r.sisaOngkirBelumTerbayar, 0);
              const totalOngkirTerjadiAll = rekapList.reduce((acc, r) => acc + r.totalOngkirOrderTerjadi, 0);
              const totalOngkirTerbayarAll = rekapList.reduce((acc, r) => acc + r.totalOngkirKasKeluar, 0);
              const totalGajiBelumDibayarAll = rekapList.reduce((acc, r) => acc + r.sisaGajiTerhitung, 0);
              const totalKonsumsiStaf = rekapList.reduce((acc, r) => acc + r.totalKonsumsiKasKeluar, 0);

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--c-red-soft)', fontWeight: 600 }}>Total Kasbon Staf Aktif</span>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-red)', marginTop: '4px' }}>
                      {AppStore.formatRupiah(totalKasbonAktifAll)}
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>Pinjaman/Kasbon belum lunas</span>
                  </div>

                  <div style={{ background: 'rgba(251, 191, 36, 0.12)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--c-yellow-soft)', fontWeight: 600 }}>Hutang Toko Ke Staf (Talangan)</span>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-amber)', marginTop: '4px' }}>
                      {AppStore.formatRupiah(totalHutangTokoKeStaf)}
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>Depo belum bayar ke staf</span>
                  </div>

                  <div style={{ background: 'rgba(56, 189, 248, 0.12)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--c-sky-soft)', fontWeight: 600 }}>Ongkir Belum Terbayar</span>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: totalOngkirBelumTerbayarAll > 0 ? 'var(--c-red)' : 'var(--c-sky)', marginTop: '4px' }}>
                      {AppStore.formatRupiah(totalOngkirBelumTerbayarAll)}
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>
                      Terjadi: {AppStore.formatRupiah(totalOngkirTerjadiAll)} | Dibayar: {AppStore.formatRupiah(totalOngkirTerbayarAll)}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(2, 132, 199, 0.12)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--c-sky-soft)', fontWeight: 600 }}>Gaji Belum Dibayar</span>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: totalGajiBelumDibayarAll > 0 ? 'var(--c-amber)' : 'var(--c-green)', marginTop: '4px' }}>
                      {AppStore.formatRupiah(totalGajiBelumDibayarAll)}
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>Jatuh tempo bulanan staf</span>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--c-green-soft)', fontWeight: 600 }}>Uang Makan / Konsumsi</span>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-green)', marginTop: '4px' }}>
                      {AppStore.formatRupiah(totalKonsumsiStaf)}
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>Total pengeluaran makan staf</span>
                  </div>
                </div>
              );
            })()}

            {/* Tabel Rekap Financial Karyawan */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', background: 'var(--inset-60)' }}>
                    <th style={{ padding: '10px' }}>Nama Staf &amp; Jabatan</th>
                    <th style={{ padding: '10px' }}>Kasbon Aktif</th>
                    <th style={{ padding: '10px' }}>Hutang Toko</th>
                    <th style={{ padding: '10px' }}>Ongkir Belum Terbayar</th>
                    <th style={{ padding: '10px' }}>Uang Makan</th>
                    <th style={{ padding: '10px' }}>Gaji Bulanan</th>
                    <th style={{ padding: '10px' }}>Net Financial</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Aksi Pembayaran</th>
                  </tr>
                </thead>
                <tbody>
                  {getRekapKaryawanList().map((item) => {
                    const {
                      kary, sisaKasbonAktif, sisaHutangTokoKeKary,
                      totalOngkirOrderTerjadi, sisaOngkirBelumTerbayar, totalOngkirKasKeluar,
                      totalGalonDiantar, totalKonsumsiKasKeluar,
                      sisaGajiBelumDibayar, netPosisi
                    } = item;

                    return (
                      <tr key={kary.id} style={{ borderBottom: '1px solid var(--w-6)' }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-main)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <UserCheck size={18} color="#38bdf8" aria-hidden="true" />
                            <div>
                              <div>{kary.nama}</div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--c-sky)', fontWeight: 400 }}>{kary.jabatan}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 800, color: sisaKasbonAktif > 0 ? 'var(--c-red)' : 'var(--text-muted)' }}>
                          {sisaKasbonAktif > 0 ? AppStore.formatRupiah(sisaKasbonAktif) : 'Rp 0'}
                          {sisaKasbonAktif > 0 && <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--c-red-soft)', fontWeight: 400 }}>Belum lunas</span>}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 800, color: sisaHutangTokoKeKary > 0 ? 'var(--c-amber)' : 'var(--text-muted)' }}>
                          {sisaHutangTokoKeKary > 0 ? AppStore.formatRupiah(sisaHutangTokoKeKary) : 'Rp 0'}
                          {sisaHutangTokoKeKary > 0 && <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--c-yellow-soft)', fontWeight: 400 }}>Talangan Depo</span>}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--c-sky)' }}>
                          <div style={{ fontWeight: 800, color: sisaOngkirBelumTerbayar > 0 ? 'var(--c-red)' : 'var(--c-green)' }}>
                            {AppStore.formatRupiah(sisaOngkirBelumTerbayar)} {sisaOngkirBelumTerbayar > 0 ? '(Belum Dibayar)' : '(Lunas)'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Terjadi: {AppStore.formatRupiah(totalOngkirOrderTerjadi)} ({totalGalonDiantar} Galon) | Dibayar: {AppStore.formatRupiah(totalOngkirKasKeluar)}
                          </div>
                        </td>
                        <td style={{ padding: '10px', color: 'var(--c-green)' }}>
                          <div style={{ fontWeight: 700 }}>{AppStore.formatRupiah(totalKonsumsiKasKeluar)}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{AppStore.formatRupiah(kary.uang_makan_per_hari || 0)}/hari</div>
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-2)' }}>
                          <div style={{ fontWeight: 700 }}>{AppStore.formatRupiah(kary.gaji_basic)}</div>
                          <div style={{ fontSize: '0.72rem', color: !item.isSudahJatuhTempo ? 'var(--c-amber)' : sisaGajiBelumDibayar > 0 ? (item.totalGajiPaid > 0 ? 'var(--c-amber-strong)' : 'var(--c-red)') : 'var(--c-green)', fontWeight: 600 }}>
                            {!item.isSudahJatuhTempo 
                              ? `Belum Jatuh Tempo (Tgl ${item.dueDay})` 
                              : sisaGajiBelumDibayar > 0 
                                ? (item.totalGajiPaid > 0 
                                    ? `Dibayar Sebagian (Sisa: ${AppStore.formatRupiah(sisaGajiBelumDibayar)})` 
                                    : `Belum Dibayar (Tgl ${item.dueDay})`) 
                                : `Gaji Lunas (Bulan Ini)`
                            }
                          </div>
                          {item.totalGajiPaid > 0 && sisaGajiBelumDibayar > 0 && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Terbayar: {AppStore.formatRupiah(item.totalGajiPaid)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px' }}>
                          {netPosisi > 0 ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                              Depo Bayar {AppStore.formatRupiah(netPosisi)}
                            </span>
                          ) : netPosisi < 0 ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                              Staf Hutang {AppStore.formatRupiah(Math.abs(netPosisi))}
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                              Impas / Lunas
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                              type="button" 
                              onClick={() => setSelectedDetailKaryawan(item)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 6px', fontSize: '0.72rem', gap: '3px' }}
                              title="Lihat Rincian Kartu Hutang Piutang Karyawan"
                            >
                              <Eye size={12} /> Rincian
                            </button>
                            <button 
                              type="button" 
                              disabled={sisaGajiBelumDibayar <= 0}
                              onClick={() => handleOpenBayarOngkirModal(item, 'gaji')}
                              className="btn btn-primary btn-sm"
                              style={{ 
                                padding: '4px 6px', 
                                fontSize: '0.72rem', 
                                gap: '3px',
                                opacity: sisaGajiBelumDibayar <= 0 ? 0.45 : 1,
                                cursor: sisaGajiBelumDibayar <= 0 ? 'not-allowed' : 'pointer',
                                background: sisaGajiBelumDibayar <= 0 ? 'rgba(2, 132, 199, 0.4)' : !item.isSudahJatuhTempo ? 'var(--c-amber-strong)' : 'var(--c-primary)'
                              }}
                              title={sisaGajiBelumDibayar <= 0 ? 'Gaji bulan ini sudah lunas' : !item.isSudahJatuhTempo ? `Bayar Gaji Awal (Jatuh tempo Tgl ${item.dueDay})` : `Proses Bayar Gaji Bulanan (Sisa: ${AppStore.formatRupiah(sisaGajiBelumDibayar)})`}
                            >
                              {sisaGajiBelumDibayar <= 0 
                                ? `Gaji Lunas` 
                                : !item.isSudahJatuhTempo 
                                  ? `Bayar Gaji (Awal)` 
                                  : (item.totalGajiPaid > 0 ? `Bayar Sisa Gaji` : `Bayar Gaji (Tgl ${item.dueDay})`)}
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleOpenBayarOngkirModal(item, 'ongkir')}
                              className="btn btn-success btn-sm"
                              style={{ padding: '4px 6px', fontSize: '0.72rem', gap: '3px' }}
                              title="Proses Bayar Ongkir / Komisi Kurir"
                            >
                              Bayar Ongkir
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleOpenBayarOngkirModal(item, 'konsumsi')}
                              className="btn btn-warning btn-sm"
                              style={{ padding: '4px 6px', fontSize: '0.72rem', gap: '3px' }}
                              title="Proses Bayar Uang Makan / Konsumsi Staf"
                            >
                              Uang Makan
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleOpenBayarOngkirModal(item, sisaKasbonAktif > 0 ? 'pengembalian_kasbon' : 'kasbon')}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '4px 6px', fontSize: '0.72rem', gap: '3px' }}
                              title={sisaKasbonAktif > 0 ? "Pelunasan Kasbon Staf" : "Beri Pinjaman Kasbon"}
                            >
                              {sisaKasbonAktif > 0 ? 'Pelunasan Kasbon' : 'Kasbon'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION: Rekapitulasi Piutang Pelanggan (Tagihan Menunggak) */}
          <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-red-strong)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={22} color="#f87171" /> Piutang Pelanggan (Tagihan Menunggak)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                  Daftar pelanggan / toko reseller yang memiliki tagihan belum terbayar.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="badge badge-danger" style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  Total Piutang: {AppStore.formatRupiah(totalPiutangPelanggan)}
                </span>
              </div>
            </div>

            {pelangganBerhutang.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', background: 'var(--inset-50)', borderRadius: '12px', color: 'var(--c-green)', fontSize: '0.9rem' }}>
                Tidak ada piutang pelanggan saat ini. Semua tagihan sudah lunas!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', background: 'var(--inset-60)' }}>
                      <th style={{ padding: '12px' }}>Nama Pelanggan / Toko</th>
                      <th style={{ padding: '12px' }}>Tipe</th>
                      <th style={{ padding: '12px' }}>No HP / WA</th>
                      <th style={{ padding: '12px' }}>Limit Hutang</th>
                      <th style={{ padding: '12px' }}>Hutang / Piutang Saat Ini</th>
                      <th style={{ padding: '12px' }}>Aksi Penagihan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pelangganBerhutang.map(k => {
                      const limit = k.limit_hutang || 0;
                      const hutang = k.hutang_saat_ini || 0;
                      const isOverLimit = limit > 0 && hutang > limit;
                      const phone = k.no_hp || '';

                      return (
                        <tr key={k.id} style={{ borderBottom: '1px solid var(--w-6)' }}>
                          <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {k.nama}
                            {k.alamat && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{k.alamat}</span>}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{k.tipe}</span>
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-2)' }}>{phone}</td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{AppStore.formatRupiah(limit)}</td>
                          <td style={{ padding: '12px', fontWeight: 800, color: isOverLimit ? 'var(--c-red-strong)' : 'var(--c-red)' }}>
                            {AppStore.formatRupiah(hutang)}
                            {isOverLimit && <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--c-red-strong)' }}>Melebihi Limit!</span>}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {phone && phone !== '-' ? (
                              <a 
                                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak ${k.nama}, mengingatkan tagihan air minum depo sebesar ${AppStore.formatRupiah(hutang)}. Terima kasih.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-success btn-sm"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                Tagih via WA
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION: Daftar Peminjam Galon Aktif */}
          <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-amber)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={22} color="#fbbf24" /> Daftar Peminjam Galon Aktif
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                  Rekapitulasi seluruh pelanggan &amp; reseller yang sedang membawa / meminjam galon milik depo.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="badge badge-warning" style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  Total Dipinjam: {((pesananList || []).length === 0 ? [] : (pengaturan.galon_pinjaman_pelanggan || [])).reduce((acc, p) => acc + p.jumlah_galon, 0)} Galon
                </span>
              </div>
            </div>

            {((pesananList || []).length === 0 ? [] : (pengaturan.galon_pinjaman_pelanggan || [])).length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', background: 'var(--inset-50)', borderRadius: '12px', color: 'var(--c-green)', fontSize: '0.9rem' }}>
                Tidak ada galon yang sedang dipinjamkan saat ini. Semua galon ada di lokasi depo!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', background: 'var(--inset-60)' }}>
                      <th style={{ padding: '12px' }}>Nama Pelanggan / Reseller</th>
                      <th style={{ padding: '12px' }}>Jumlah Galon Dipinjam</th>
                      <th style={{ padding: '12px' }}>Tanggal Pinjam</th>
                      <th style={{ padding: '12px' }}>Catatan / Keperluan</th>
                      <th style={{ padding: '12px' }}>Aksi Penagihan / Kontak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((pesananList || []).length === 0 ? [] : (pengaturan.galon_pinjaman_pelanggan || [])).map((item, idx) => {
                      const kontak = kontakList.find(k => k.id === item.kontak_id || k.nama.toLowerCase().includes(item.nama_pelanggan.toLowerCase()));
                      const phone = kontak?.no_hp || '';
                      return (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--w-6)' }}>
                          <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {item.nama_pelanggan}
                            {kontak && <span className="badge badge-primary" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>{kontak.tipe}</span>}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className="badge badge-warning" style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                              {item.jumlah_galon} Galon
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                            {item.tanggal_pinjam || '-'}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-2)' }}>
                            {item.catatan || 'Dipinjamkan'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {phone && phone !== '-' ? (
                              <a 
                                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${item.nama_pelanggan}, mengingatkan penataan/tukar kembali galon pinjaman depo sebanyak ${item.jumlah_galon} galon. Terima kasih.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-success btn-sm"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                WA Peminjam
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: PEMELIHARAAN FILTER */}
      {activeTab === 'pemeliharaan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SECTION KONTROL METERAN AIR & STOK AIR BAKU DEPO (KHUSUS LOGIN BY OWNER) */}
          {(currentUser?.role === 'owner' || !currentUser) && (
        <div className="glass-card animate-fade-in" style={{ padding: '20px', borderLeft: '4px solid var(--c-sky)', background: 'rgba(2, 132, 199, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Droplets size={22} color="#38bdf8" /> Meteran Air dan Stok Air Baku Depo
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                Otomatis bertambah dari Pengisian Tangki Air Baku (+Liter) &amp; Otomatis berkurang saat ada Penjualan POS Kasir (-Liter).
              </p>
            </div>

            <button 
              onClick={() => {
                setNewStokAirInput(pengaturan.stok_air_baku_saat_ini ?? 0);
                const defaultMeter = meterDepoHitungOtomatis > 0 ? meterDepoHitungOtomatis : (hasMeterEntryKasir ? meterDepoEntryKasir! : (pengaturan.meteran_air_awal_liter ?? 10000));
                setNewMeterAirInput(defaultMeter);
                setShowOwnerMeterAdjustModal(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-sky) 100%)', fontWeight: 700, padding: '8px 14px' }}
            >
              Koreksi meter dan stok air baku
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowMeteran(v => !v)}
            aria-expanded={showMeteran}
            style={{ marginTop: '12px' }}
          >
            {showMeteran ? 'Sembunyikan rincian meteran' : 'Lihat rincian meteran'}
          </button>

          {showMeteran && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
            {/* Card 1: Stok Air Baku */}
            <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STOK AIR BAKU TANGKI DEPO</span>
              <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: (pengaturan.stok_air_baku_saat_ini || 0) <= (pengaturan.min_stok_air_baku_liter || 2000) ? 'var(--c-red)' : 'var(--c-green)', marginTop: '4px' }}>
                {(pengaturan.stok_air_baku_saat_ini ?? 0).toLocaleString('id-ID')} Liter
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Min Target: {(pengaturan.min_stok_air_baku_liter || 2000).toLocaleString('id-ID')} Liter</span>
            </div>

            {/* Card 2: Meter Depo Hitung Otomatis */}
            <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--c-blue-soft)', fontWeight: 600 }}>METER DEPO HITUNG OTOMATIS</span>
              <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--c-sky)', marginTop: '4px' }}>
                {meterDepoHitungOtomatis.toLocaleString('id-ID')} Liter
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                Awal + Penjualan POS (+{totalLiterShift.toLocaleString('id-ID')} L)
              </span>
            </div>

            {/* Card 3: Meter Depo Entry Tutup Kasir */}
            <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--c-amber)', fontWeight: 600 }}>METER ENTRY TUTUP KASIR</span>
              <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--c-amber)', marginTop: '4px' }}>
                {hasMeterEntryKasir ? `${meterDepoEntryKasir!.toLocaleString('id-ID')} Liter` : '0 Liter'}
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                {latestClosedShift ? `Kasir: ${latestClosedShift.kasir_nama}` : (pesananList || []).length === 0 ? 'Data Direset (0 Liter)' : 'Belum Tutup Shift'}
              </span>
            </div>

            {/* Card 4: Selisih Meteran Air Depo */}
            <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SELISIH METERAN DEPO</span>
              <h4 style={{
                fontSize: '1.35rem', fontWeight: 800, marginTop: '4px',
                color: !hasMeterEntryKasir ? 'var(--text-muted)' : selisihMeterAirDepo === 0 ? 'var(--c-green)' : selisihMeterAirDepo > 0 ? 'var(--c-sky)' : 'var(--c-red)'
              }}>
                {!hasMeterEntryKasir 
                  ? 'PAS (0 Liter)' 
                  : selisihMeterAirDepo === 0 
                    ? 'PAS (0 Liter)' 
                    : `${selisihMeterAirDepo > 0 ? '+' : ''}${selisihMeterAirDepo.toLocaleString('id-ID')} Liter`
                }
              </h4>
              <span style={{ fontSize: '0.75rem', color: !hasMeterEntryKasir ? 'var(--text-muted)' : selisihMeterAirDepo === 0 ? 'var(--c-green)' : 'var(--c-red-soft)' }}>
                {!hasMeterEntryKasir 
                  ? 'Menunggu Laporan Kasir' 
                  : selisihMeterAirDepo === 0 
                    ? 'Sesuai Nota POS & Fisik' 
                    : selisihMeterAirDepo < 0 
                      ? 'Pemakaian Air Belum Tercatat POS' 
                      : 'Entry Kasir Lebih Tinggi'
                }
              </span>
            </div>

            {/* Card 5: Air Terkuras */}
            <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AIR TERKURAS ({periode.toUpperCase()})</span>
              <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {totalLiterTerjual.toLocaleString('id-ID')} Liter
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total produk air terisi</span>
            </div>
          </div>
          )}
        </div>
      )}


          {/* SECTION 5: Notifikasi Servis Mesin & Air Baku Depo */}
          <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: isAirBakuMenipis ? '4px solid var(--c-red-strong)' : '4px solid var(--c-amber)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color={isAirBakuMenipis ? '#ef4444' : '#fbbf24'} /> Servis Mesin dan Air Baku Depo
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Total Produksi Terhitung: <strong>{totalLiterTerjual} Liter</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* Card Air Baku */}
              <div style={{
                background: isAirBakuMenipis ? 'rgba(239, 68, 68, 0.15)' : 'var(--inset-70)',
                border: isAirBakuMenipis ? '1px solid var(--c-red-strong)' : '1px solid var(--glass-border)',
                padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Droplets size={24} color={isAirBakuMenipis ? '#ef4444' : '#34d399'} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Stok Air Baku Tangki</h4>
                      {isAirBakuMenipis && <span className="badge badge-danger">MENIPIS</span>}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: isAirBakuMenipis ? 'var(--c-red)' : 'var(--c-green)', fontWeight: 700, marginTop: '4px' }}>
                      {stokAirBakuSaatIni} Liter (Minimum: {minStokAirBaku} Liter)
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {isAirBakuMenipis ? 'Segera lakukan pemesanan Truk Tangki Air Baku!' : 'Stok air baku masih mencukupi.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards Dynamic Komponen Servis */}
              {activeKomponenList.map(komp => {
                const terpakaiLiter = Math.max(0, totalLiterTerjual - (komp.liter_terakhir_ganti || 0));
                const sisaLiter = komp.batas_liter - terpakaiLiter;
                const persen = Math.min(100, Math.round((terpakaiLiter / komp.batas_liter) * 100));
                const isPerluGanti = terpakaiLiter >= komp.batas_liter;
                const isHampirGanti = sisaLiter <= (komp.batas_liter * 0.2);

                return (
                  <div key={komp.id} style={{
                    background: isPerluGanti ? 'rgba(239, 68, 68, 0.15)' : isHampirGanti ? 'rgba(245, 158, 11, 0.15)' : 'var(--inset-70)',
                    border: isPerluGanti ? '1px solid var(--c-red-strong)' : isHampirGanti ? '1px solid var(--c-amber-strong)' : '1px solid var(--glass-border)',
                    padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{komp.nama_komponen}</h4>
                        <span className={`badge ${isPerluGanti ? 'badge-danger' : isHampirGanti ? 'badge-warning' : 'badge-primary'}`}>
                          {isPerluGanti ? 'WAJIB SERVIS' : isHampirGanti ? 'SERVIS DEKAT' : 'NORMAL'}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {komp.keterangan || 'Pemeliharaan berkala'}
                      </p>

                      <div style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: '4px' }}>
                          <span>Terpakai: {terpakaiLiter} / {komp.batas_liter} Liter</span>
                          <span style={{ fontWeight: 700 }}>{persen}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--w-10)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${persen}%`, height: '100%',
                            background: isPerluGanti ? 'var(--c-red-strong)' : isHampirGanti ? 'var(--c-amber-strong)' : 'var(--c-green)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => handleResetKomponenServis(komp.id)} 
                      className={`btn btn-sm ${isPerluGanti ? 'btn-danger' : 'btn-secondary'}`}
                      style={{ marginTop: '14px', width: '100%', justifyContent: 'center' }}
                    >
                      <RotateCcw size={14} /> Tandai Sudah Diganti / Servis
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: RIWAYAT TRANSAKSI POS */}
      {activeTab === 'riwayat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SECTION 7: Riwayat Transaksi Terkini Table */}
          <div className="glass-card animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HistoryIcon size={22} color="#38bdf8" /> Riwayat Transaksi POS Terakhir ({periode.toUpperCase()})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                  Daftar transaksi penjualan air &amp; galon dari mesin kasir POS.
                </p>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Cari nota / pelanggan..."
                  value={riwayatSearch}
                  onChange={(e) => {
                    setRiwayatSearch(e.target.value);
                    setRiwayatPage(1);
                  }}
                  className="form-input"
                  style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {paginatedRiwayatPesanan.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Tidak ada riwayat transaksi yang cocok.
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', background: 'var(--inset-60)' }}>
                        <th style={{ padding: '12px' }}>Jam Order</th>
                        <th style={{ padding: '12px' }}>Jam Terkirim</th>
                        <th style={{ padding: '12px' }}>Total Durasi</th>
                        <th style={{ padding: '12px' }}>No Nota</th>
                        <th style={{ padding: '12px' }}>Pengorder / Pelanggan</th>
                        <th style={{ padding: '12px' }}>Produk &amp; Jumlah</th>
                        <th style={{ padding: '12px' }}>Total</th>
                        <th style={{ padding: '12px' }}>Status Bayar</th>
                        <th style={{ padding: '12px' }}>Status Kirim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRiwayatPesanan.map((psn: Pesanan) => {
                        const durInfo = calculateOrderDuration(psn.created_at, psn.terkirim_at, psn.status_pesanan);

                        return (
                          <tr key={psn.id} style={{ borderBottom: '1px solid var(--w-4)' }}>
                            <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--c-amber)', whiteSpace: 'nowrap' }}>
                              <Clock size={13} style={{ display: 'inline', marginRight: '3px' }} />
                              {durInfo.jamOrder}
                            </td>
                            <td style={{ padding: '12px', fontSize: '0.85rem', color: psn.status_pesanan === 'terkirim' ? 'var(--c-green)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {durInfo.jamTerkirim}
                            </td>
                            <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-sky)', whiteSpace: 'nowrap' }}>
                              {durInfo.formattedDurasi}
                            </td>
                            <td style={{ padding: '12px', fontWeight: 700, color: 'var(--c-sky)' }}>{psn.no_nota}</td>
                            <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{psn.nama_pelanggan}</td>
                            <td style={{ padding: '12px', color: 'var(--text-2)', fontSize: '0.85rem' }}>
                              {formatProdukRingkas(psn.items)}
                            </td>
                            <td style={{ padding: '12px', fontWeight: 700, color: 'var(--c-green)' }}>{AppStore.formatRupiah(psn.total_akhir)}</td>
                            <td style={{ padding: '12px' }}>
                              <span className={`badge ${psn.status_pembayaran === 'lunas' ? 'badge-success' : 'badge-danger'}`}>
                                {psn.status_pembayaran}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span className={`badge ${psn.status_pesanan === 'terkirim' || psn.status_pesanan === 'selesai' ? 'badge-success' : 'badge-warning'}`}>
                                {psn.status_pesanan}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Riwayat Transaksi */}
                {renderPagination(currentRiwayatPage, totalRiwayatPages, setRiwayatPage)}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Detail Rekap Keuangan Staf */}
      {selectedDetailKaryawan && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10005, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: 'var(--surface-solid)',
            border: '2px solid var(--c-sky)', boxShadow: '0 25px 50px -12px rgba(56, 189, 248, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Kartu Rincian Hutang Piutang: {selectedDetailKaryawan.kary.nama}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--c-sky)', fontWeight: 600 }}>
                  Jabatan: {selectedDetailKaryawan.kary.jabatan} | Jatuh Tempo Gaji: Tgl {selectedDetailKaryawan.kary.tanggal_jatuh_tempo_gaji || 25} Setiap Bulan
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => window.print()}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                >
                  Cetak Slip
                </button>
                <button aria-label="Tutup" type="button" onClick={() => setSelectedDetailKaryawan(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Summary Cards Modal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '10px', border: '1px solid var(--c-red-strong)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--c-red-soft)' }}>Sisa Kasbon (Staf Hutang)</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-red)', marginTop: '2px' }}>
                  {AppStore.formatRupiah(selectedDetailKaryawan.sisaKasbonAktif)}
                </div>
              </div>
              <div style={{ background: 'rgba(251, 191, 36, 0.15)', padding: '12px', borderRadius: '10px', border: '1px solid var(--c-amber)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--c-yellow-soft)' }}>Hutang Depo (Talangan)</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-amber)', marginTop: '2px' }}>
                  {AppStore.formatRupiah(selectedDetailKaryawan.sisaHutangTokoKeKary)}
                </div>
              </div>
              <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '12px', borderRadius: '10px', border: '1px solid var(--c-sky)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--c-sky-soft)' }}>Ongkir Belum Dibayar</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: selectedDetailKaryawan.sisaOngkirBelumTerbayar > 0 ? 'var(--c-red)' : 'var(--c-green)', marginTop: '2px' }}>
                  {AppStore.formatRupiah(selectedDetailKaryawan.sisaOngkirBelumTerbayar)}
                </div>
              </div>
            </div>

            {/* Comprehensive Net Financial Statement Box */}
            <div style={{
              background: 'linear-gradient(135deg, var(--inset-90) 0%, var(--inset-90) 100%)',
              border: '2px dashed var(--c-sky)', borderRadius: '12px', padding: '16px', marginBottom: '16px'
            }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--c-sky)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>RINGKASAN LEGER HAK &amp; KEWAJIBAN</span>
                <span>{selectedDetailKaryawan.kary.nama}</span>
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>+ Gaji Basic Bulanan:</span>
                  <strong style={{ color: 'var(--c-green)' }}>{AppStore.formatRupiah(selectedDetailKaryawan.kary.gaji_basic || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>+ Sisa Ongkir Delivery Belum Dibayar:</span>
                  <strong style={{ color: 'var(--c-sky)' }}>{AppStore.formatRupiah(selectedDetailKaryawan.sisaOngkirBelumTerbayar)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>+ Total Uang Makan / Konsumsi:</span>
                  <strong style={{ color: 'var(--c-green)' }}>{AppStore.formatRupiah(selectedDetailKaryawan.totalKonsumsiKasKeluar)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>+ Talangan Hutang Depo ke Staf:</span>
                  <strong style={{ color: 'var(--c-yellow-soft)' }}>{AppStore.formatRupiah(selectedDetailKaryawan.sisaHutangTokoKeKary)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--w-10)', paddingTop: '4px' }}>
                  <span style={{ color: 'var(--c-red-soft)' }}>- Potongan Sisa Kasbon Aktif:</span>
                  <strong style={{ color: 'var(--c-red)' }}>-{AppStore.formatRupiah(selectedDetailKaryawan.sisaKasbonAktif)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--w-15)', paddingTop: '8px', marginTop: '4px' }}>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>NET REKAPITULASI KEUANGAN:</strong>
                  {selectedDetailKaryawan.netPosisi > 0 ? (
                    <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                      DEPO HARUS BAYAR {AppStore.formatRupiah(selectedDetailKaryawan.netPosisi)}
                    </span>
                  ) : selectedDetailKaryawan.netPosisi < 0 ? (
                    <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                      STAF MEMILIKI HUTANG KASBON {AppStore.formatRupiah(Math.abs(selectedDetailKaryawan.netPosisi))}
                    </span>
                  ) : (
                    <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                      POSISI KEUANGAN IMPAS / LUNAS
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-sections tabs/details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* 1. Kasbon Staf Detail */}
              <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Rincian Kasbon / Pinjaman Staf
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => handleOpenBayarOngkirModal(selectedDetailKaryawan, selectedDetailKaryawan.sisaKasbonAktif > 0 ? 'pengembalian_kasbon' : 'kasbon')} 
                    className="btn btn-danger btn-sm"
                    style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                  >
                    {selectedDetailKaryawan.sisaKasbonAktif > 0 ? 'Pelunasan Kasbon' : '+ Beri Kasbon'}
                  </button>
                </div>
                <div style={{ fontSize: '0.82rem', color: selectedDetailKaryawan.sisaKasbonAktif > 0 ? 'var(--c-red)' : 'var(--c-green)', fontWeight: 700 }}>
                  Sisa Kasbon Belum Lunas: {AppStore.formatRupiah(selectedDetailKaryawan.sisaKasbonAktif)}
                </div>
              </div>

              {/* 2. Ongkir Delivery */}
              <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Hak Ongkir Kurir / Delivery
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => handleOpenBayarOngkirModal(selectedDetailKaryawan, 'ongkir')} 
                    className="btn btn-success btn-sm"
                    style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                  >
                    + Bayar Ongkir Kurir
                  </button>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
                  Total Ongkir Hak Staf Dari Pesanan: <strong>{AppStore.formatRupiah(selectedDetailKaryawan.totalOngkirOrderTerjadi)} ({selectedDetailKaryawan.totalGalonDiantar} Galon)</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--c-green)', marginTop: '2px' }}>
                  Ongkir Sudah Dibayarkan Depo: <strong>{AppStore.formatRupiah(selectedDetailKaryawan.totalOngkirKasKeluar)}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: selectedDetailKaryawan.sisaOngkirBelumTerbayar > 0 ? 'var(--c-red)' : 'var(--c-green)', marginTop: '4px' }}>
                  Sisa Ongkir Belum Dibayar: {AppStore.formatRupiah(selectedDetailKaryawan.sisaOngkirBelumTerbayar)}
                </div>
              </div>

              {/* 3. Uang Makan / Konsumsi */}
              <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Uang Makan &amp; Konsumsi Harian
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => handleOpenBayarOngkirModal(selectedDetailKaryawan, 'konsumsi')} 
                    className="btn btn-warning btn-sm"
                    style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                  >
                    + Bayar Uang Makan
                  </button>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
                  Tarif Uang Makan Harian: <strong>{AppStore.formatRupiah(selectedDetailKaryawan.kary.uang_makan_per_hari || 0)} / hari</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--c-green)', fontWeight: 700, marginTop: '4px' }}>
                  Total Pengeluaran Makan Dicatat: {AppStore.formatRupiah(selectedDetailKaryawan.totalKonsumsiKasKeluar)}
                </div>
              </div>

              {/* 4. Gaji Pokok */}
              <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Gaji Pokok (Jatuh Tempo: Tgl {selectedDetailKaryawan.dueDay})
                  </h4>
                  <button 
                    type="button" 
                    disabled={!selectedDetailKaryawan.isSudahJatuhTempo || selectedDetailKaryawan.sisaGajiBelumDibayar <= 0}
                    onClick={() => handleOpenBayarOngkirModal(selectedDetailKaryawan, 'gaji')} 
                    className="btn btn-primary btn-sm"
                    style={{ 
                      fontSize: '0.7rem', 
                      padding: '3px 8px',
                      opacity: (!selectedDetailKaryawan.isSudahJatuhTempo || selectedDetailKaryawan.sisaGajiBelumDibayar <= 0) ? 0.45 : 1,
                      cursor: (!selectedDetailKaryawan.isSudahJatuhTempo || selectedDetailKaryawan.sisaGajiBelumDibayar <= 0) ? 'not-allowed' : 'pointer',
                      background: !selectedDetailKaryawan.isSudahJatuhTempo ? 'rgba(100, 116, 139, 0.4)' : undefined
                    }}
                    title={!selectedDetailKaryawan.isSudahJatuhTempo ? `Belum Jatuh Tempo (Baru bisa dibayar mulai Tgl ${selectedDetailKaryawan.dueDay})` : 'Proses Bayar Gaji'}
                  >
                    {!selectedDetailKaryawan.isSudahJatuhTempo ? `Belum Waktunya (Tgl ${selectedDetailKaryawan.dueDay})` : 'Bayar Gaji'}
                  </button>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '4px' }}>
                  Gaji Basic Bulanan: <strong>{AppStore.formatRupiah(selectedDetailKaryawan.kary.gaji_basic || 0)}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: !selectedDetailKaryawan.isSudahJatuhTempo ? 'var(--c-amber)' : selectedDetailKaryawan.sisaGajiBelumDibayar > 0 ? 'var(--c-red)' : 'var(--c-green)' }}>
                  {!selectedDetailKaryawan.isSudahJatuhTempo
                    ? `Belum Jatuh Tempo (Gaji baru keluar mulai tanggal ${selectedDetailKaryawan.dueDay} setiap bulannya)`
                    : selectedDetailKaryawan.sisaGajiBelumDibayar > 0 
                      ? `Sisa Gaji Belum Dibayar Bulan Ini: ${AppStore.formatRupiah(selectedDetailKaryawan.sisaGajiBelumDibayar)}` 
                      : `Gaji Bulan Ini Sudah Lunas`
                  }
                </div>
              </div>

            </div>

            <button 
              type="button" 
              onClick={() => setSelectedDetailKaryawan(null)}
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
            >
              Tutup Kartu Rincian
            </button>
          </div>
        </div>
      )}

      {/* Modal Popup Process Payment Hak Staf / Ongkir */}
      {showBayarHakModal && targetKaryawanBayar && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10006, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '500px', padding: '24px', background: 'var(--surface-solid)',
            border: '2px solid var(--c-green-strong)', boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Banknote size={22} color="#34d399" /> Entry Pembayaran Hak Staf / Kurir
              </h3>
              <button aria-label="Tutup" type="button" onClick={() => setShowBayarHakModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--c-green)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.82rem', color: 'var(--c-green-soft)'
            }}>
              <strong>KAS KELUAR (-):</strong> Transaksi ini mencatat pengeluaran kas depo untuk membayar hak ongkir / gaji ke <strong>{targetKaryawanBayar.kary.nama}</strong>. Tampilan saldo Ongkir Belum Terbayar akan langsung berkurang/lunas!
            </div>

            <form onSubmit={handleSaveBayarHakStaf} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Kategori Pembayaran</label>
                <select 
                  value={kategoriBayarStaf} 
                  onChange={(e) => {
                    const kat = e.target.value;
                    setKategoriBayarStaf(kat);
                    if (kat === 'ongkir') {
                      setNominalBayarStaf(targetKaryawanBayar.sisaOngkirBelumTerbayar || targetKaryawanBayar.totalOngkirOrderTerjadi || 0);
                      setPeruntukanBayarStaf(`Pembayaran Ongkir Delivery - ${targetKaryawanBayar.kary.nama}`);
                    } else if (kat === 'gaji') {
                      setNominalBayarStaf(targetKaryawanBayar.kary.gaji_basic || 0);
                      setPeruntukanBayarStaf(`Pembayaran Gaji Bulan Ini - ${targetKaryawanBayar.kary.nama}`);
                    } else {
                      setNominalBayarStaf(targetKaryawanBayar.totalKonsumsiKasKeluar || targetKaryawanBayar.kary.uang_makan_per_hari || 0);
                      setPeruntukanBayarStaf(`Uang Makan / Konsumsi - ${targetKaryawanBayar.kary.nama}`);
                    }
                  }} 
                  className="form-select"
                >
                  <option value="ongkir">Ongkir / Transportasi Delivery</option>
                  <option value="gaji">Pembayaran Gaji Karyawan</option>
                  <option value="konsumsi">Konsumsi / Uang Makan Staf</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Penerima (Nama Staf)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={`${targetKaryawanBayar.kary.nama} (${targetKaryawanBayar.kary.jabatan})`} 
                  disabled 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Isian Peruntukan / Keperluan <span style={{ color: 'var(--c-red-strong)' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={peruntukanBayarStaf} 
                  onChange={(e) => setPeruntukanBayarStaf(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nominal Uang Disetorkan (Rp) <span style={{ color: 'var(--c-red-strong)' }}>*</span></label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={nominalBayarStaf || ''} 
                  onChange={(e) => setNominalBayarStaf(Number(e.target.value))} 
                  required 
                  min={100} 
                />
                {kategoriBayarStaf === 'ongkir' && targetKaryawanBayar.sisaOngkirBelumTerbayar > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--c-amber)', marginTop: '4px', display: 'block' }}>
                    Saldo sisa ongkir belum dibayar: <strong>{AppStore.formatRupiah(targetKaryawanBayar.sisaOngkirBelumTerbayar)}</strong>
                  </span>
                )}
              </div>

              <div className="form-group">
                <div className="form-label" id="label-sumber-bayar-staf" style={{ marginBottom: '6px' }}>Dibayar dari</div>
                <div className="seg-grid" role="radiogroup" aria-labelledby="label-sumber-bayar-staf">
                  {([['kas_besar', 'Kas besar'], ['rekening', 'Rekening'], ['laci', 'Laci kasir']] as const)
                    .filter(([nilai]) => nilai !== 'rekening' || AppStore.getRekening().some(r => r.aktif))
                    .map(([nilai, label]) => (
                    <button
                      key={nilai}
                      type="button"
                      role="radio"
                      aria-checked={sumberBayarStaf === nilai}
                      className="seg-btn"
                      onClick={() => {
                        setSumberBayarStaf(nilai);
                        if (nilai === 'rekening' && !rekeningBayarStaf) setRekeningBayarStaf(AppStore.getRekening().find(r => r.aktif)?.id || '');
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {sumberBayarStaf === 'rekening' && (
                  <select aria-label="Pilih rekening" className="form-input" value={rekeningBayarStaf} onChange={(e) => setRekeningBayarStaf(e.target.value)} style={{ marginTop: '8px' }}>
                    {AppStore.getRekening().filter(r => r.aktif).map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                  </select>
                )}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  {sumberBayarStaf === 'laci'
                    ? 'Uang diambil dari laci kasir, jadi mengurangi uang laci.'
                    : sumberBayarStaf === 'rekening'
                      ? 'Ditransfer dari rekening, tidak mengurangi uang laci kasir.'
                      : 'Dibayar owner dari kas besar, tidak mengurangi uang laci kasir.'}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Tambahan (Opsional)</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={catatanBayarStaf}
                  onChange={(e) => setCatatanBayarStaf(e.target.value)} 
                  placeholder="Keterangan tanggal/no nota antaran..." 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowBayarHakModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1, fontWeight: 700 }}>
                  <Check size={18} /> Simpan Pembayaran Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {fotoLihat && (
        <div className="sheet-overlay" style={{ zIndex: 10001 }} onClick={() => setFotoLihat(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={fotoLihat.judul} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 className="sheet-title">{fotoLihat.judul}</h2>
              <button type="button" className="icon-btn" aria-label="Tutup foto" onClick={() => setFotoLihat(null)}><X size={20} aria-hidden="true" /></button>
            </div>
            <img src={fotoLihat.gambar} alt={fotoLihat.judul} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px', background: '#000' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '10px 0 0' }}>{fotoLihat.info}</p>
          </div>
        </div>
      )}

      {/* MODAL EDIT TARGET PENJUALAN */}
      {showEditTargetModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--overlay)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto', maxWidth: '550px', width: '100%', padding: '24px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={22} color="#10b981" /> Edit Target Penjualan
              </h3>
              <button aria-label="Tutup" onClick={() => setShowEditTargetModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTargetPenjualan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Atur target omzet (Rp), volume galon, dan volume liter untuk harian, mingguan, bulanan, dan tahunan. Isi 0 bila tidak mau memakai target tertentu.
              </p>

              {PERIODE_TARGET.map(per => (
                <div key={per.id} style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--c-sky)', marginBottom: '10px' }}>
                    Target {per.label}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: '12px' }}>
                    {JENIS_TARGET.map(j => (
                      <div key={j.id} className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor={`target-${j.id}-${per.id}`} style={{ fontSize: '0.8rem' }}>{j.label} ({j.satuan})</label>
                        <input
                          id={`target-${j.id}-${per.id}`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          className="form-input"
                          value={targetInput[`${j.id}_${per.id}`] ?? 0}
                          onChange={(e) => setTargetInput(prev => ({ ...prev, [`${j.id}_${per.id}`]: Number(e.target.value) }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowEditTargetModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1, fontWeight: 700 }}>
                  <Check size={18} /> Simpan Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adjust Meteran Air & Stok Air Baku Depo (Owner Only) */}
      {showOwnerMeterAdjustModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '480px', padding: '26px', background: 'var(--surface-solid)',
            border: '2px solid var(--c-sky)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Droplets size={22} color="#38bdf8" /> Adjust Meter &amp; Stok Air Baku (Owner Only)
              </h3>
              <button aria-label="Tutup" type="button" onClick={() => setShowOwnerMeterAdjustModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const { pengaturan: updatedP, shiftList: updatedShiftList } = AppStore.adjustMeterAndStokByOwner(
                Number(newStokAirInput) || 0,
                Number(newMeterAirInput) || 0
              );
              setPengaturan(updatedP);
              setShiftList(updatedShiftList);
              setShowOwnerMeterAdjustModal(false);
              alert('Adjust Meteran Air & Stok Air Baku Depo Berhasil Disimpan!\n\nCatatan meteran kasir & selisih telah dikalibrasi sesuai angka meteran terbaru.');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Stok Air Baku Tangki Depo Saat Ini (Liter)
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={newStokAirInput}
                  onChange={(e) => setNewStokAirInput(Number(e.target.value))}
                  required 
                  min={0}
                  style={{ fontSize: '1.1rem', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Jumlah total air baku fisik yang tersisa di dalam tangki depo.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Posisi Meteran Air Depo (Liter / Baseline Flowmeter)
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={newMeterAirInput}
                  onChange={(e) => setNewMeterAirInput(Number(e.target.value))}
                  required 
                  min={0}
                  style={{ fontSize: '1.1rem', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Posisi angka meteran air fisik depo saat ini (Setara {((Number(newMeterAirInput) || 0) / 1000).toFixed(1)} M³).
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowOwnerMeterAdjustModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, fontWeight: 700, background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-sky) 100%)' }}>
                  <Check size={18} /> Simpan Adjust Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
