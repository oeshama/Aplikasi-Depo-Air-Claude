'use client';

import React, { useState, useEffect } from 'react';
import { 
  Produk, Kontak, ZoneOngkir, Pesanan, PesananItem, 
  TipeTransaksi, MetodePembayaran, PembayaranDetail, TipeKontak, Pengeluaran, Karyawan, HutangToko, TipePihakHutang, PengaturanDepo 
} from '@/lib/types';
import { AppStore } from '@/lib/store';
import { calculateOrderDuration, alarmSound, formatThresholdText } from '@/lib/audioAndTimer';
import ReceiptModal from '@/components/ReceiptModal';
import ExpenseReceiptModal from '@/components/ExpenseReceiptModal';
import BukaShiftModal from '@/components/BukaShiftModal';
import { 
  ShoppingCart, Plus, Minus, User, Truck, Receipt, 
  CreditCard, DollarSign, QrCode, Building, Clock, AlertTriangle, Check,
  BellOff, Volume2, Package, UserPlus, X, TrendingDown, FileText, Banknote, UserCheck, BookOpen
} from 'lucide-react';

export default function KasirPage() {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [kontakList, setKontakList] = useState<Kontak[]>([]);
  const [zonaList, setZonaList] = useState<ZoneOngkir[]>([]);
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanDepo>(AppStore.getPengaturan());

  // Alarm & Snooze State
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const [snoozedUntilMap, setSnoozedUntilMap] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [isWaterAlarmMuted, setIsWaterAlarmMuted] = useState<boolean>(false);
  const [waterAlarmSnoozedUntil, setWaterAlarmSnoozedUntil] = useState<number>(0);

  // Cart & State
  const [cart, setCart] = useState<{ [produkId: string]: number }>({});
  const [selectedKontakId, setSelectedKontakId] = useState<string>('kt-1');
  const [tipeTransaksi, setTipeTransaksi] = useState<TipeTransaksi>('tukar_galon');
  const [isDelivery, setIsDelivery] = useState<boolean>(false);
  const [selectedZonaId, setSelectedZonaId] = useState<string>('zn-1');
  const [diskon, setDiskon] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>('');

  // Payment State
  const [metodePembayaran, setMetodePembayaran] = useState<MetodePembayaran>('tunai');
  const [jumlahBayarTunai, setJumlahBayarTunai] = useState<number>(0);
  const [activeReceipt, setActiveReceipt] = useState<Pesanan | null>(null);
  const [activeExpenseReceipt, setActiveExpenseReceipt] = useState<Pengeluaran | null>(null);

  // Bayar Hutang Modal State
  const [showBayarHutangModal, setShowBayarHutangModal] = useState<boolean>(false);
  const [selectedHutangKontakId, setSelectedHutangKontakId] = useState<string>('');
  const [nominalBayarHutang, setNominalBayarHutang] = useState<number>(0);
  const [metodeBayarHutang, setMetodeBayarHutang] = useState<MetodePembayaran>('tunai');
  const [uangDiterimaHutang, setUangDiterimaHutang] = useState<number>(0);
  const [catatanHutang, setCatatanHutang] = useState<string>('');

  // Hutang Warning Popup Notification State
  const [showHutangNotifModal, setShowHutangNotifModal] = useState<boolean>(false);
  const [notifKontak, setNotifKontak] = useState<Kontak | null>(null);

  // Quick Tambah Kontak Baru Modal State
  const [showAddKontakModal, setShowAddKontakModal] = useState<boolean>(false);
  const [newNama, setNewNama] = useState<string>('');
  const [newTipe, setNewTipe] = useState<TipeKontak>('pelanggan');
  const [newNoHp, setNewNoHp] = useState<string>('');
  const [newAlamat, setNewAlamat] = useState<string>('');
  const [newLimitHutang, setNewLimitHutang] = useState<number>(100000);

  const handleSaveNewKontak = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) {
      alert('Nama pelanggan / toko tidak boleh kosong!');
      return;
    }

    const newKontak: Kontak = {
      id: `kt-${Date.now()}`,
      nama: newNama.trim(),
      tipe: newTipe,
      no_hp: newNoHp.trim() || '-',
      alamat: newAlamat.trim() || '-',
      limit_hutang: newLimitHutang || 100000,
      hutang_saat_ini: 0,
      aktif: true
    };

    const currentKontak = AppStore.getKontak();
    const updated = [newKontak, ...currentKontak];
    AppStore.saveKontak(updated);

    // Refresh kontak list & auto-select new customer
    setKontakList(updated.filter(k => k.aktif));
    setSelectedKontakId(newKontak.id);

    // Reset form & close modal
    setNewNama('');
    setNewTipe('pelanggan');
    setNewNoHp('');
    setNewAlamat('');
    setNewLimitHutang(100000);
    setShowAddKontakModal(false);

    alert(`Pelanggan baru "${newKontak.nama}" berhasil ditambahkan dan dipilih!`);
  };

  // Quick Entry Pengeluaran Kasir State
  const [showAddPengeluaranModal, setShowAddPengeluaranModal] = useState<boolean>(false);
  const [nominalPengeluaran, setNominalPengeluaran] = useState<number>(0);
  const [peruntukanPengeluaran, setPeruntukanPengeluaran] = useState<string>('');
  const [kategoriPengeluaran, setKategoriPengeluaran] = useState<string>('operasional');
  const [selectedKaryawanId, setSelectedKaryawanId] = useState<string>('');
  const [catatanPengeluaran, setCatatanPengeluaran] = useState<string>('');

  // Additional state for Pembelian Air Baku Tangki
  const [vendorAirBaku, setVendorAirBaku] = useState<string>('Truk Tangki Tirta Jaya');
  const [volumeAirBaku, setVolumeAirBaku] = useState<number>(5000);
  const [hargaPerolehanAir, setHargaPerolehanAir] = useState<number>(350000);
  const [tipsSopirAir, setTipsSopirAir] = useState<number>(20000);
  const [meteranWaktuDiisi, setMeteranWaktuDiisi] = useState<number>(10000);

  // New Recipient / Penerima Baru State
  const [showAddPenerimaInput, setShowAddPenerimaInput] = useState<boolean>(false);
  const [namaPenerimaInput, setNamaPenerimaInput] = useState<string>('');
  const [jabatanPenerimaInput, setJabatanPenerimaInput] = useState<string>('');

  const handleSaveNewPenerima = () => {
    if (!namaPenerimaInput.trim()) {
      alert('Nama penerima baru tidak boleh kosong!');
      return;
    }

    const newPenerima: Karyawan = {
      id: `penerima-${Date.now()}`,
      nama: namaPenerimaInput.trim(),
      jabatan: jabatanPenerimaInput.trim() || 'Penerima / Pihak Ketiga',
      no_hp: '-',
      tanggal_masuk: new Date().toISOString().slice(0, 10),
      gaji_basic: 0,
      uang_makan_per_hari: 0,
      aktif: true
    };

    const updatedKaryawanList = [...karyawanList, newPenerima];
    setKaryawanList(updatedKaryawanList);

    const p = AppStore.getPengaturan();
    const updatedPengaturan = { ...p, karyawan_list: [...(p.karyawan_list || []), newPenerima] };
    AppStore.savePengaturan(updatedPengaturan);
    window.dispatchEvent(new Event('depo_pengaturan_updated'));

    setSelectedKaryawanId(newPenerima.id);
    handleKaryawanChange(newPenerima.id);
    setShowAddPenerimaInput(false);
    setNamaPenerimaInput('');
    setJabatanPenerimaInput('');
    alert(`Penerima baru "${newPenerima.nama}" berhasil ditambahkan dan dipilih!`);
  };

  const handleKategoriChange = (newKat: string) => {
    setKategoriPengeluaran(newKat);
    const kary = karyawanList.find(k => k.id === selectedKaryawanId);
    const karyNama = kary ? kary.nama : '';

    if (newKat === 'pembelian_air_baku') {
      const vNama = vendorAirBaku.trim() || 'Truk Tangki';
      setPeruntukanPengeluaran(`Pembelian Air Baku Tangki ${volumeAirBaku} Liter - ${vNama}`);
      setNominalPengeluaran(hargaPerolehanAir + tipsSopirAir);
    } else if (newKat === 'gaji') {
      const tglGaji = kary?.tanggal_jatuh_tempo_gaji || 25;
      setPeruntukanPengeluaran(karyNama ? `Pembayaran Gaji (Tgl ${tglGaji}) - ${karyNama}` : 'Pembayaran Gaji Karyawan');
      if (kary && kary.gaji_basic) setNominalPengeluaran(kary.gaji_basic);
    } else if (newKat === 'kasbon') {
      setPeruntukanPengeluaran(karyNama ? `Kasbon Karyawan - ${karyNama}` : 'Pinjaman / Kasbon Karyawan');
    } else if (newKat === 'pengembalian_kasbon') {
      setPeruntukanPengeluaran(karyNama ? `Pengembalian Kasbon - ${karyNama}` : 'Pengembalian Kasbon Karyawan');
    } else if (newKat === 'ongkir') {
      setPeruntukanPengeluaran(karyNama ? `Ongkir / Transport - ${karyNama}` : 'Biaya Ongkir / Transportasi Delivery');
      if (kary) {
        const pesananList = AppStore.getPesanan();
        const pengeluaranList = AppStore.getPengeluaran();
        const pesananDiantar = pesananList.filter(p => 
          p.pengantar_id === kary.id || 
          (p.pengantar_id === 'usr-4' && (kary.id === 'kary-1' || kary.nama.toLowerCase().includes('doni'))) ||
          (p.catatan && p.catatan.toLowerCase().includes(kary.nama.split(' ')[0].toLowerCase())) ||
          kary.jabatan.toLowerCase().includes('pengantar') || kary.jabatan.toLowerCase().includes('driver')
        );
        const totalOngkirTerjadi = pesananDiantar.reduce((acc, p) => acc + (p.total_ongkir || 0), 0);
        const totalOngkirKasKeluar = pengeluaranList
          .filter(p => (p.karyawan_id === kary.id || p.karyawan_nama?.toLowerCase().includes(kary.nama.toLowerCase())) && (p.kategori === 'ongkir' || p.kategori === 'bensin'))
          .reduce((acc, p) => acc + p.nominal, 0);
        const sisaOngkir = Math.max(0, totalOngkirTerjadi - totalOngkirKasKeluar);
        if (sisaOngkir > 0) setNominalPengeluaran(sisaOngkir);
      }
    }
  };

  const handleKaryawanChange = (karyId: string) => {
    setSelectedKaryawanId(karyId);
    const kary = karyawanList.find(k => k.id === karyId);
    if (!kary) return;

    if (kategoriPengeluaran === 'gaji') {
      const tglGaji = kary.tanggal_jatuh_tempo_gaji || 25;
      setPeruntukanPengeluaran(`Pembayaran Gaji (Tgl ${tglGaji}) - ${kary.nama}`);
      if (kary.gaji_basic) setNominalPengeluaran(kary.gaji_basic);
    } else if (kategoriPengeluaran === 'kasbon') {
      setPeruntukanPengeluaran(`Kasbon Karyawan - ${kary.nama}`);
    } else if (kategoriPengeluaran === 'pengembalian_kasbon') {
      setPeruntukanPengeluaran(`Pengembalian Kasbon - ${kary.nama}`);
    } else if (kategoriPengeluaran === 'ongkir') {
      setPeruntukanPengeluaran(`Ongkir / Transport - ${kary.nama}`);
      const pesananList = AppStore.getPesanan();
      const pengeluaranList = AppStore.getPengeluaran();
      const pesananDiantar = pesananList.filter(p => 
        p.pengantar_id === kary.id || 
        (p.pengantar_id === 'usr-4' && (kary.id === 'kary-1' || kary.nama.toLowerCase().includes('doni'))) ||
        (p.catatan && p.catatan.toLowerCase().includes(kary.nama.split(' ')[0].toLowerCase())) ||
        kary.jabatan.toLowerCase().includes('pengantar') || kary.jabatan.toLowerCase().includes('driver')
      );
      const totalOngkirTerjadi = pesananDiantar.reduce((acc, p) => acc + (p.total_ongkir || 0), 0);
      const totalOngkirKasKeluar = pengeluaranList
        .filter(p => (p.karyawan_id === kary.id || p.karyawan_nama?.toLowerCase().includes(kary.nama.toLowerCase())) && (p.kategori === 'ongkir' || p.kategori === 'bensin'))
        .reduce((acc, p) => acc + p.nominal, 0);
      const sisaOngkir = Math.max(0, totalOngkirTerjadi - totalOngkirKasKeluar);
      if (sisaOngkir > 0) setNominalPengeluaran(sisaOngkir);
    }
  };

  const handleSavePengeluaran = (e: React.FormEvent) => {
    e.preventDefault();

    let finalNominal = nominalPengeluaran;
    if (kategoriPengeluaran === 'pembelian_air_baku') {
      finalNominal = Number(hargaPerolehanAir) + Number(tipsSopirAir);
      if (!vendorAirBaku.trim()) {
        alert('Nama vendor/sopir pengirim wajib diisi!');
        return;
      }
      if (volumeAirBaku <= 0) {
        alert('Volume air masuk harus lebih besar dari 0 Liter!');
        return;
      }
    }

    if (finalNominal <= 0) {
      alert('Nominal pengeluaran harus lebih besar dari Rp 0!');
      return;
    }

    const peruntukanText = peruntukanPengeluaran.trim() || 
      (kategoriPengeluaran === 'pembelian_air_baku' 
        ? `Pembelian Air Baku Tangki ${volumeAirBaku}L - ${vendorAirBaku}` 
        : 'Pengeluaran Kas');

    const isKaryawanRequired = ['gaji', 'kasbon', 'pengembalian_kasbon', 'ongkir'].includes(kategoriPengeluaran);
    if (isKaryawanRequired && !selectedKaryawanId) {
      alert('Pilih nama karyawan / driver pengantar terlebih dahulu untuk memproses pembayaran ongkir!');
      return;
    }

    const kary = karyawanList.find(k => k.id === selectedKaryawanId);

    if (kategoriPengeluaran === 'gaji' && kary) {
      const dueDay = kary.tanggal_jatuh_tempo_gaji || 25;
      const todayDate = new Date().getDate();
      if (todayDate < dueDay) {
        alert(`🔒 Pembayaran gaji untuk "${kary.nama}" belum dapat diproses karena belum melewati tanggal jatuh tempo (Jatuh Tempo: Tanggal ${dueDay}).`);
        return;
      }
    }

    const currentUser = AppStore.getCurrentUser();

    // pengembalian_kasbon adds money back into cash drawer (kas masuk)
    const isKasMasuk = kategoriPengeluaran === 'pengembalian_kasbon';

    const newPengeluaran: Pengeluaran = {
      id: `exp-${Date.now()}`,
      tanggal: new Date().toISOString(),
      nominal: finalNominal,
      peruntukan: peruntukanText,
      kategori: kategoriPengeluaran,
      karyawan_id: kary ? kary.id : undefined,
      karyawan_nama: kary ? kary.nama : undefined,
      tipe_arus_kas: isKasMasuk ? 'masuk' : 'keluar',
      kasir_id: currentUser.id,
      kasir_nama: currentUser.nama,
      catatan: catatanPengeluaran.trim() || undefined,
      // Pembelian Air Baku Fields
      nama_vendor_pengirim: kategoriPengeluaran === 'pembelian_air_baku' ? vendorAirBaku.trim() : undefined,
      volume_air_masuk_liter: kategoriPengeluaran === 'pembelian_air_baku' ? Number(volumeAirBaku) : undefined,
      harga_perolehan_air: kategoriPengeluaran === 'pembelian_air_baku' ? Number(hargaPerolehanAir) : undefined,
      tips_sopir_pengirim: kategoriPengeluaran === 'pembelian_air_baku' ? Number(tipsSopirAir) : undefined,
      meteran_waktu_diisi_liter: kategoriPengeluaran === 'pembelian_air_baku' ? Number(meteranWaktuDiisi) : undefined,
    };

    AppStore.addPengeluaran(newPengeluaran);

    // Update stok air baku & meteran air saat ini if pembelian_air_baku
    if (kategoriPengeluaran === 'pembelian_air_baku' && volumeAirBaku > 0) {
      const p = AppStore.getPengaturan();
      const updatedStok = (p.stok_air_baku_saat_ini || 0) + Number(volumeAirBaku);
      const updatedPengaturan = { 
        ...p, 
        stok_air_baku_saat_ini: updatedStok,
        meteran_air_awal_liter: Number(meteranWaktuDiisi) || ((p.meteran_air_awal_liter ?? 0) + Number(volumeAirBaku))
      };
      AppStore.savePengaturan(updatedPengaturan);
      window.dispatchEvent(new Event('depo_pengaturan_updated'));
    }

    // Reset form & close modal
    setNominalPengeluaran(0);
    setPeruntukanPengeluaran('');
    setKategoriPengeluaran('operasional');
    setSelectedKaryawanId('');
    setCatatanPengeluaran('');
    setShowAddPengeluaranModal(false);

    // Open Expense Receipt modal for printable receipt and WhatsApp reporting to owner
    setActiveExpenseReceipt(newPengeluaran);
  };

  // Quick Entry Hutang Toko State
  const [showAddHutangTokoModal, setShowAddHutangTokoModal] = useState<boolean>(false);
  const [tipePihakHutang, setTipePihakHutang] = useState<TipePihakHutang>('karyawan');
  const [selectedHutangKaryawanId, setSelectedHutangKaryawanId] = useState<string>('');
  const [namaOrangKetiga, setNamaOrangKetiga] = useState<string>('');
  const [peruntukanHutangToko, setPeruntukanHutangToko] = useState<string>('');
  const [nominalHutangToko, setNominalHutangToko] = useState<number>(0);
  const [catatanHutangToko, setCatatanHutangToko] = useState<string>('');

  const handleSaveHutangToko = (e: React.FormEvent) => {
    e.preventDefault();
    if (nominalHutangToko <= 0) {
      alert('Nominal hutang toko harus lebih besar dari Rp 0!');
      return;
    }
    if (!peruntukanHutangToko.trim()) {
      alert('Isian peruntukan hutang toko wajib diisi!');
      return;
    }

    let namaPihakFinal = '';
    let karyId: string | undefined = undefined;

    if (tipePihakHutang === 'karyawan') {
      if (!selectedHutangKaryawanId) {
        alert('Pilih nama karyawan terlebih dahulu!');
        return;
      }
      const kary = karyawanList.find(k => k.id === selectedHutangKaryawanId);
      if (!kary) {
        alert('Karyawan tidak ditemukan!');
        return;
      }
      namaPihakFinal = `${kary.nama} (${kary.jabatan})`;
      karyId = kary.id;
    } else {
      if (!namaOrangKetiga.trim()) {
        alert('Isikan nama orang ketiga / vendor / supplier!');
        return;
      }
      namaPihakFinal = namaOrangKetiga.trim();
    }

    const currentUser = AppStore.getCurrentUser();
    const newHutangToko: HutangToko = {
      id: `htg-toko-${Date.now()}`,
      tanggal: new Date().toISOString(),
      tipe_pihak: tipePihakHutang,
      karyawan_id: karyId,
      nama_pihak: namaPihakFinal,
      peruntukan: peruntukanHutangToko.trim(),
      nominal_hutang: nominalHutangToko,
      total_dibayar: 0,
      sisa_hutang: nominalHutangToko,
      status: 'belum_lunas',
      kasir_id: currentUser.id,
      kasir_nama: currentUser.nama,
      catatan: catatanHutangToko.trim() || undefined
    };

    AppStore.addHutangToko(newHutangToko);

    // Reset form & close modal
    setTipePihakHutang('karyawan');
    setSelectedHutangKaryawanId('');
    setNamaOrangKetiga('');
    setPeruntukanHutangToko('');
    setNominalHutangToko(0);
    setCatatanHutangToko('');
    setShowAddHutangTokoModal(false);

    alert(`Catatan Hutang Toko sebesar ${AppStore.formatRupiah(newHutangToko.nominal_hutang)} ke ${newHutangToko.nama_pihak} berhasil dicatat!`);
  };

  const [showBukaShiftModal, setShowBukaShiftModal] = useState<boolean>(false);

  const loadData = () => {
    setProdukList(AppStore.getProduk().filter(p => p.aktif));
    setKontakList(AppStore.getKontak().filter(k => k.aktif));
    setZonaList(AppStore.getZona().filter(z => z.aktif));
    setPesananList(AppStore.getPesanan());

    const p = AppStore.getPengaturan();
    if (p) {
      setPengaturan(p);
      if (p.karyawan_list) {
        setKaryawanList(p.karyawan_list.filter(k => k.aktif));
      }
    }

    const currentUser = AppStore.getCurrentUser();
    if (currentUser && currentUser.role === 'kasir') {
      const shiftAktif = AppStore.getShiftAktif(currentUser.id);
      if (!shiftAktif) {
        setShowBukaShiftModal(true);
      } else {
        setShowBukaShiftModal(false);
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('depo_produk_updated', loadData);
    window.addEventListener('depo_zona_updated', loadData);
    window.addEventListener('depo_kontak_updated', loadData);
    window.addEventListener('depo_pesanan_updated', loadData);
    window.addEventListener('depo_pengaturan_updated', loadData);

    const interval = setInterval(() => setNowTick(Date.now()), 10000);

    return () => {
      window.removeEventListener('depo_produk_updated', loadData);
      window.removeEventListener('depo_zona_updated', loadData);
      window.removeEventListener('depo_kontak_updated', loadData);
      window.removeEventListener('depo_pesanan_updated', loadData);
      window.removeEventListener('depo_pengaturan_updated', loadData);
      clearInterval(interval);
    };
  }, []);

  // Pending delivery (seluruh transaksi yang belum terkirim)
  const pendingDelivery = pesananList.filter(p => 
    p.status_pesanan === 'pending' || 
    p.status_pesanan === 'dijadwalkan' || 
    p.status_pesanan === 'dalam_perjalanan'
  );

  // Dynamic Settings Notifikasi Alarm
  const thresholdMins = pengaturan.batas_keterlambatan_menit || 90;
  const snoozeMins = pengaturan.durasi_snooze_menit || 15;
  const isAlarmEnabled = (pengaturan.notifikasi_alarm_aktif !== false) && (pengaturan.mode_suara_alarm !== 'silent');

  // Critical Low Water Stock Alarm
  const minStokAirBakuCalc = pengaturan.min_stok_air_baku_liter || 2000;
  const currentStokAirBakuCalc = pengaturan.stok_air_baku_saat_ini ?? 5000;
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
    setMutedIds(prev => Array.from(new Set([...prev, id])));
  };

  const handleMuteAll = () => {
    const allDelayedIds = delayedPending.map(p => p.id);
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
    delayedPending.forEach(p => {
      newMap[p.id] = until;
    });
    setSnoozedUntilMap(newMap);
    const allDelayedIds = delayedPending.map(p => p.id);
    setMutedIds(prev => prev.filter(mId => !allDelayedIds.includes(mId)));
  };

  const handleKonfirmasiTerkirim = (id: string) => {
    AppStore.updatePesananStatus(id, 'terkirim', 'lunas');
    setSnoozedUntilMap(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    alert('Pengiriman berhasil dikonfirmasi! Status pesanan berubah menjadi Terkirim & Lunas.');
  };

  const formatProdukRingkas = (items: Pesanan['items']) => {
    if (!items || items.length === 0) return '-';
    return items.map(item => `${item.nama_produk} (x${item.jumlah})`).join(', ');
  };

  const selectedKontak = kontakList.find(k => k.id === selectedKontakId) || kontakList[0];
  const selectedZona = zonaList.find(z => z.id === selectedZonaId) || zonaList[0];

  const handleSelectCustomer = (id: string) => {
    setSelectedKontakId(id);
    if (isDelivery && (id === 'kt-1' || id === 'walk-in')) {
      alert('🚚 Transaksi Layanan Kirim Antar (Delivery) Memerlukan Nama & Alamat Pelanggan!\n\nWalk-in Pelanggan Biasa tidak memiliki alamat pengantaran. Silakan daftarkan atau pilih Pelanggan Baru terlebih dahulu.');
      setShowAddKontakModal(true);
    }
    const target = kontakList.find(k => k.id === id);
    if (target && (target.hutang_saat_ini || 0) > 0) {
      setNotifKontak(target);
      setShowHutangNotifModal(true);
    }
  };

  // Helper open modal Bayar Hutang
  const openBayarHutangModal = (kontakIdTarget?: string) => {
    const listWithDebt = kontakList.filter(k => (k.hutang_saat_ini || 0) > 0);
    const targetId = kontakIdTarget || (listWithDebt.length > 0 ? listWithDebt[0].id : (kontakList[0]?.id || ''));
    setSelectedHutangKontakId(targetId);
    
    const targetKontak = kontakList.find(k => k.id === targetId);
    const hutang = targetKontak?.hutang_saat_ini || 0;
    setNominalBayarHutang(hutang);
    setUangDiterimaHutang(hutang);
    setMetodeBayarHutang('tunai');
    setCatatanHutang('');
    setShowBayarHutangModal(true);
  };

  const handleSelectHutangKontakChange = (id: string) => {
    setSelectedHutangKontakId(id);
    const k = kontakList.find(item => item.id === id);
    const hutang = k?.hutang_saat_ini || 0;
    setNominalBayarHutang(hutang);
    setUangDiterimaHutang(hutang);
  };

  const handleProcessBayarHutang = (e: React.FormEvent) => {
    e.preventDefault();
    const targetKontak = kontakList.find(k => k.id === selectedHutangKontakId);
    if (!targetKontak) {
      alert('Pilih pelanggan terlebih dahulu!');
      return;
    }
    const hutangSaatIni = targetKontak.hutang_saat_ini || 0;
    if (hutangSaatIni <= 0) {
      alert('Pelanggan ini tidak memiliki tunggakan hutang!');
      return;
    }
    if (nominalBayarHutang <= 0) {
      alert('Masukkan nominal pembayaran yang valid!');
      return;
    }
    if (nominalBayarHutang > hutangSaatIni) {
      alert(`Nominal pembayaran (${AppStore.formatRupiah(nominalBayarHutang)}) melebihi total hutang (${AppStore.formatRupiah(hutangSaatIni)})!`);
      return;
    }
    if (metodeBayarHutang === 'tunai' && uangDiterimaHutang < nominalBayarHutang) {
      alert('Uang diterima tunai kurang dari nominal bayar!');
      return;
    }

    try {
      const notaPesanan = AppStore.bayarHutangPelanggan(
        selectedHutangKontakId,
        nominalBayarHutang,
        metodeBayarHutang,
        catatanHutang || `Pelunasan hutang oleh ${targetKontak.nama}`
      );

      // Refresh list
      setKontakList(AppStore.getKontak().filter(k => k.aktif));
      setShowBayarHutangModal(false);
      setActiveReceipt(notaPesanan);
    } catch (err: any) {
      alert(err.message || 'Gagal memproses pelunasan hutang');
    }
  };

  // Quick Cart Modification
  const updateQuantity = (produkId: string, delta: number) => {
    setCart(prev => {
      const current = prev[produkId] || 0;
      const updated = Math.max(0, current + delta);
      if (updated === 0) {
        const copy = { ...prev };
        delete copy[produkId];
        return copy;
      }
      return { ...prev, [produkId]: updated };
    });
  };

  const clearCart = () => {
    setCart({});
    setJumlahBayarTunai(0);
    setCatatan('');
  };

  // Calculations
  const calculateCartItems = (): PesananItem[] => {
    return Object.entries(cart).map(([produkId, qty]) => {
      const prod = produkList.find(p => p.id === produkId)!;
      // Reseller check fallback to harga_tempat
      const hargaSatuan = prod.harga_tempat;
      return {
        id: `item-${produkId}`,
        produk_id: produkId,
        nama_produk: prod.nama_produk,
        jumlah: qty,
        harga_satuan: hargaSatuan,
        subtotal: hargaSatuan * qty,
        dihitung_ongkir: prod.kena_ongkir
      };
    });
  };

  const cartItems = calculateCartItems();
  const subtotalProduk = cartItems.reduce((acc, item) => acc + item.subtotal, 0);

  // Ongkir per unit ONLY for items with kena_ongkir === true
  const totalUnitOngkir = isDelivery 
    ? cartItems.filter(item => item.dihitung_ongkir).reduce((acc, item) => acc + item.jumlah, 0)
    : 0;
  const tarifOngkirPerUnit = selectedZona ? selectedZona.tarif_per_galon : 0;
  const totalOngkir = totalUnitOngkir * tarifOngkirPerUnit;

  const totalAkhir = Math.max(0, subtotalProduk + totalOngkir - diskon);
  const kembalian = Math.max(0, jumlahBayarTunai - totalAkhir);

  // Process Transaction
  const handleProcessOrder = () => {
    if (cartItems.length === 0) {
      alert('Pilih minimal 1 produk terlebih dahulu!');
      return;
    }

    if (isDelivery) {
      if (!selectedKontak || selectedKontak.id === 'kt-1' || selectedKontakId === 'kt-1') {
        alert('🚚 Transaksi Layanan Kirim Antar (Delivery) Memerlukan Nama & Alamat Pelanggan!\n\nWalk-in Pelanggan Biasa tidak memiliki alamat pengantaran. Harap mendaftarkan atau memilih Pelanggan Baru terlebih dahulu agar driver tahu lokasi pengiriman!');
        setShowAddKontakModal(true);
        return;
      }
    }

    if (tipeTransaksi === 'pinjam_galon') {
      if (!selectedKontak || selectedKontak.id === 'kt-1' || selectedKontakId === 'kt-1') {
        alert('⚠️ Transaksi Pinjam Galon Memerlukan Data Pelanggan Terdaftar!\n\nWalk-in Pelanggan Biasa tidak dapat meminjam galon depo. Harap mendaftarkan atau memilih Pelanggan Baru terlebih dahulu agar jelas siapa yang meminjam galon!');
        setShowAddKontakModal(true);
        return;
      }
    }

    if (metodePembayaran === 'hutang') {
      if (selectedKontak?.id === 'kt-1') {
        alert('Walk-in Pelanggan Biasa tidak bisa menggunakan metode Hutang! Pilih pelanggan terdaftar.');
        return;
      }
      const limit = selectedKontak?.limit_hutang || 0;
      const hutangSekarang = selectedKontak?.hutang_saat_ini || 0;
      if (hutangSekarang + totalAkhir > limit) {
        alert(`Transaksi melebihi Limit Hutang! Limit: ${AppStore.formatRupiah(limit)}, Hutang Sekarang: ${AppStore.formatRupiah(hutangSekarang)}`);
        return;
      }
    }

    let pembayaranDetails: PembayaranDetail[] = [];
    let totalDibayar = 0;
    let statusBayar: Pesanan['status_pembayaran'] = 'lunas';
    let sisaHutang = 0;

    if (metodePembayaran === 'tunai') {
      totalDibayar = totalAkhir;
      pembayaranDetails.push({ metode: 'tunai', jumlah: totalAkhir });
    } else if (metodePembayaran === 'hutang') {
      totalDibayar = 0;
      sisaHutang = totalAkhir;
      statusBayar = 'hutang';
      pembayaranDetails.push({ metode: 'hutang', jumlah: totalAkhir });
    } else {
      totalDibayar = totalAkhir;
      pembayaranDetails.push({ metode: metodePembayaran, jumlah: totalAkhir });
    }

    const currentUser = AppStore.getCurrentUser();
    const newNotaNo = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;

    const newPesanan: Pesanan = {
      id: `psn-${Date.now()}`,
      no_nota: newNotaNo,
      kontak_id: selectedKontak.id,
      nama_pelanggan: selectedKontak.nama,
      tipe_transaksi: tipeTransaksi,
      items: cartItems,
      subtotal_produk: subtotalProduk,
      zone_ongkir_id: isDelivery ? selectedZona.id : undefined,
      tarif_ongkir_per_unit: isDelivery ? tarifOngkirPerUnit : 0,
      total_unit_ongkir: totalUnitOngkir,
      total_ongkir: totalOngkir,
      diskon: diskon,
      total_akhir: totalAkhir,
      status_pesanan: isDelivery ? 'dijadwalkan' : 'selesai',
      status_pembayaran: statusBayar,
      pembayaran_details: pembayaranDetails,
      total_dibayar: totalDibayar,
      sisa_hutang: sisaHutang,
      kasir_id: currentUser.id,
      catatan: catatan,
      created_at: new Date().toISOString()
    };

    AppStore.addPesanan(newPesanan);

    // Auto update Pinjaman Galon Pelanggan di PengaturanDepo jika tipe_transaksi === 'pinjam_galon'
    if (tipeTransaksi === 'pinjam_galon' && selectedKontak && selectedKontak.id !== 'kt-1') {
      const totalGalonDipinjam = cartItems
        .filter(item => item.nama_produk.toLowerCase().includes('galon'))
        .reduce((acc, item) => acc + item.jumlah, 0);

      if (totalGalonDipinjam > 0) {
        const p = AppStore.getPengaturan();
        const existingList = p.galon_pinjaman_pelanggan || [];
        const existingIdx = existingList.findIndex(item => 
          (item.kontak_id && item.kontak_id === selectedKontak.id) || 
          item.nama_pelanggan.toLowerCase().includes(selectedKontak.nama.toLowerCase()) ||
          selectedKontak.nama.toLowerCase().includes(item.nama_pelanggan.toLowerCase())
        );

        let updatedPinjaman = [...existingList];
        if (existingIdx !== -1) {
          updatedPinjaman[existingIdx].jumlah_galon += totalGalonDipinjam;
          if (catatan) updatedPinjaman[existingIdx].catatan = catatan;
          updatedPinjaman[existingIdx].tanggal_pinjam = new Date().toISOString().slice(0, 10);
        } else {
          updatedPinjaman.unshift({
            id: `pinjam-${Date.now()}`,
            kontak_id: selectedKontak.id,
            nama_pelanggan: selectedKontak.nama,
            jumlah_galon: totalGalonDipinjam,
            catatan: catatan || `Pinjam galon POS Nota ${newNotaNo}`,
            tanggal_pinjam: new Date().toISOString().slice(0, 10)
          });
        }

        const newStokDiDepo = Math.max(0, (p.stok_galon_di_depo ?? 360) - totalGalonDipinjam);

        AppStore.savePengaturan({
          ...p,
          stok_galon_di_depo: newStokDiDepo,
          galon_pinjaman_pelanggan: updatedPinjaman
        });
        window.dispatchEvent(new Event('depo_pengaturan_updated'));
      }
    }

    // Automatic reduction of Stok Air Baku (Liter) when sales occur
    const totalLiterAirSold = cartItems.reduce((acc, item) => {
      const prod = produkList.find(pr => pr.id === item.produk_id);
      const vol = prod ? prod.volume_liter : item.nama_produk.includes('19L') ? 19 : item.nama_produk.includes('15L') ? 15 : 10;
      return acc + (vol * item.jumlah);
    }, 0);

    if (totalLiterAirSold > 0) {
      const p = AppStore.getPengaturan();
      const currentStok = p.stok_air_baku_saat_ini ?? 5000;
      const updatedStokAir = Math.max(0, currentStok - totalLiterAirSold);
      AppStore.savePengaturan({
        ...p,
        stok_air_baku_saat_ini: updatedStokAir
      });
      window.dispatchEvent(new Event('depo_pengaturan_updated'));
    }

    setActiveReceipt(newPesanan);
    clearCart();
  };

  // Active shift cash calculations for Kasir POS Header
  const activeShiftInfo = AppStore.getShiftAktif();
  const shiftBukaTime = activeShiftInfo ? new Date(activeShiftInfo.waktu_buka).getTime() : 0;
  const shiftPesananList = activeShiftInfo
    ? pesananList.filter(p => new Date(p.created_at).getTime() >= shiftBukaTime)
    : pesananList.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString());
  
  const allPengeluaranList = AppStore.getPengeluaran();
  const shiftPengeluaranList = activeShiftInfo
    ? allPengeluaranList.filter(p => new Date(p.tanggal).getTime() >= shiftBukaTime)
    : allPengeluaranList.filter(p => new Date(p.tanggal).toDateString() === new Date().toDateString());

  const modalAwalKasir = activeShiftInfo ? activeShiftInfo.saldo_awal : 0;

  const totalTunaiShift = shiftPesananList
    .filter(p => p.pembayaran_details.some(d => d.metode === 'tunai'))
    .reduce((acc, p) => acc + p.total_akhir, 0);

  const totalPengeluaranShiftKeluar = shiftPengeluaranList
    .filter(p => p.tipe_arus_kas !== 'masuk' && p.kategori !== 'pengembalian_kasbon')
    .reduce((acc, p) => acc + p.nominal, 0);

  const totalPengembalianKasbonShift = shiftPengeluaranList
    .filter(p => p.tipe_arus_kas === 'masuk' || p.kategori === 'pengembalian_kasbon')
    .reduce((acc, p) => acc + p.nominal, 0);

  const saldoKasDiTangan = Math.max(0, (modalAwalKasir + totalTunaiShift + totalPengembalianKasbonShift) - totalPengeluaranShiftKeluar);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
      {/* Modals */}
      <ReceiptModal pesanan={activeReceipt} onClose={() => setActiveReceipt(null)} />
      <ExpenseReceiptModal pengeluaran={activeExpenseReceipt} onClose={() => setActiveExpenseReceipt(null)} />
      <BukaShiftModal isOpen={showBukaShiftModal} onShiftOpened={() => setShowBukaShiftModal(false)} />

      {/* BANNER RINGKASAN SALDO KAS DI TANGAN KASIR (LACI KASIR) */}
      <div className="glass-card animate-fade-in" style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25) 0%, rgba(16, 185, 129, 0.2) 100%)',
        border: '2px solid #38bdf8',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.5)'
            }}>
              <Banknote size={26} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>
                💵 SALDO KAS DI TANGAN (KAS LACI KASIR SAAT INI)
              </span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>
                {AppStore.formatRupiah(saldoKasDiTangan)}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.82rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: '#94a3b8' }}>Modal Kas Awal: </span>
              <strong style={{ color: '#f8fafc', fontWeight: 800 }}>{AppStore.formatRupiah(modalAwalKasir)}</strong>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: '#94a3b8' }}>Tunai Masuk: </span>
              <strong style={{ color: '#38bdf8', fontWeight: 800 }}>+{AppStore.formatRupiah(totalTunaiShift + totalPengembalianKasbonShift)}</strong>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: '#94a3b8' }}>Pengeluaran: </span>
              <strong style={{ color: '#f87171', fontWeight: 800 }}>-{AppStore.formatRupiah(totalPengeluaranShiftKeluar)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER NOTIFIKASI ALARM CRITICAL STOK AIR BAKU */}
      {isWaterStockCriticalCalc && (
        <div className="glass-card animate-fade-in" style={{
          padding: '16px 20px',
          background: hasWaterStockAlarmAudio 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(185, 28, 28, 0.4) 100%)' 
            : 'rgba(239, 68, 68, 0.15)',
          border: '2px solid #ef4444'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {hasWaterStockAlarmAudio ? (
                <Volume2 size={28} color="#ef4444" className="animate-pulse" />
              ) : (
                <AlertTriangle size={28} color="#f87171" />
              )}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🚛 PERINGATAN: STOK AIR BAKU DEPO MENIPIS! ({currentStokAirBakuCalc.toLocaleString('id-ID')} Liter)
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#fca5a5', marginTop: '2px' }}>
                  Stok saat ini ({currentStokAirBakuCalc.toLocaleString('id-ID')} L) telah mencapai / di bawah batas minimum pengingat (Min: {minStokAirBakuCalc.toLocaleString('id-ID')} L). Segera lakukan pemesanan / pasokan tangki air baku!
                  {isWaterAlarmMuted && ' [🔕 Audio Muted]'}
                  {isWaterAlarmSnoozed && ` [⏰ Audio Snoozed: ${Math.max(1, Math.ceil((waterAlarmSnoozedUntil - nowTick) / (1000 * 60)))} menit]`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setKategoriPengeluaran('pembelian_air_baku');
                  setShowAddPengeluaranModal(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 700, padding: '8px 14px', border: 'none' }}
              >
                🚛 Input Pembelian Air Baku
              </button>

              <button
                onClick={() => {
                  setWaterAlarmSnoozedUntil(Date.now() + (pengaturan.durasi_snooze_menit || 15) * 60 * 1000);
                  setIsWaterAlarmMuted(false);
                }}
                className="btn btn-warning btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: '#f59e0b', color: '#0f172a', border: 'none', padding: '8px 14px' }}
              >
                <Clock size={16} /> ⏰ Snooze (15m)
              </button>

              <button
                onClick={() => setIsWaterAlarmMuted(!isWaterAlarmMuted)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.25)', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px 14px' }}
              >
                <BellOff size={16} /> {isWaterAlarmMuted ? '🔊 Unmute Suara' : '🔕 Mute Suara'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL PENGIRIMAN PENDING (BELUM TERKIRIM) SECTION */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px', borderTop: '4px solid #fbbf24' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={24} color="#fbbf24" /> Detail Pengiriman Pending (Belum Terkirim)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {delayedPending.length > 0 && (
              <span className="badge badge-danger animate-pulse">
                🚨 {delayedPending.length} Terlambat (&gt; {formatThresholdText(thresholdMins)})
              </span>
            )}
            <span className="badge badge-warning">{pendingDelivery.length} Antaran Menunggu</span>
          </div>
        </div>

        {/* Alarm Warning Banner */}
        {delayedPending.length > 0 && (
          <div className="glass-card animate-fade-in" style={{
            padding: '14px 18px',
            marginBottom: '16px',
            background: hasActiveAlarm 
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(185, 28, 28, 0.35) 100%)' 
              : 'rgba(239, 68, 68, 0.12)',
            border: '2px solid #ef4444'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {hasActiveAlarm ? (
                  <Volume2 size={24} color="#ef4444" className="animate-pulse" />
                ) : (
                  <BellOff size={22} color="#94a3b8" />
                )}
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                    🚨 Notifikasi Pesanan Belum Terkirim (&gt; {formatThresholdText(thresholdMins)})
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '2px' }}>
                    {hasActiveAlarm 
                      ? '🔔 Alarm pengingat berbunyi! Pilih aksi di bawah:' 
                      : delayedPending.every(p => isOrderMuted(p.id))
                        ? '🔕 Alarm telah dimatikan (tidak akan bunyi lagi).'
                        : `🔕 Suara alarm di-Snooze (${snoozeMins} Menit).`}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleMuteAll}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.25)', border: '1px solid #ef4444', color: '#fca5a5', padding: '6px 12px' }}
                >
                  <BellOff size={14} /> 🔕 Matikan Alarm (Permanen)
                </button>
                <button 
                  onClick={handleSnoozeAll}
                  className="btn btn-warning btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: '#f59e0b', color: '#0f172a', border: 'none', padding: '6px 12px' }}
                >
                  <Clock size={14} /> ⏰ Snooze Tunda ({snoozeMins}m)
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingDelivery.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Check size={20} /> Tidak ada pengiriman pending saat ini. Semua pesanan antar sudah terkirim lunas!
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
                {pendingDelivery.map(psn => {
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
                            <Check size={13} /> Terkirim
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

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Left Side: Quick Tap Product Selector */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={22} color="#0284c7" /> Quick POS Tap produk
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={() => openBayarHutangModal()}
                className="btn btn-sm btn-warning" 
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                💳 Entry Pembayaran Utang
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddPengeluaranModal(true)}
                className="btn btn-sm btn-danger" 
                style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
              >
                💸 Entry Pengeluaran Kas
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddHutangTokoModal(true)}
                className="btn btn-sm btn-secondary" 
                style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(251, 191, 36, 0.18)', border: '1px solid #fbbf24', color: '#fbbf24' }}
              >
                🧾 Entry Hutang Toko
              </button>
              <span className="badge badge-primary">{produkList.length} Wadah</span>
            </div>
          </div>

          {/* Product Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
            {produkList.map(prod => {
              const qty = cart[prod.id] || 0;
              return (
                <div key={prod.id} className="glass-card" style={{
                  padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  background: qty > 0 ? 'rgba(2, 132, 199, 0.25)' : 'rgba(18, 28, 54, 0.7)',
                  borderColor: qty > 0 ? '#38bdf8' : 'var(--glass-border)',
                  position: 'relative'
                }}>
                  {qty > 0 && (
                    <div style={{
                      position: 'absolute', top: '-8px', right: '-8px', background: '#38bdf8', color: '#0f172a',
                      fontWeight: 800, width: '26px', height: '26px', borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
                    }}>
                      {qty}
                    </div>
                  )}

                  <div>
                    {prod.gambar_url && (
                      <div style={{ width: '100%', height: '70px', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px', background: 'rgba(15, 23, 42, 0.5)' }}>
                        <img src={prod.gambar_url} alt={prod.nama_produk} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{prod.nama_produk}</h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>{prod.volume_liter} Liter</p>
                    <div style={{ marginTop: '8px', fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>
                      {AppStore.formatRupiah(prod.harga_tempat)}
                    </div>
                    {prod.kena_ongkir && (
                      <span style={{ fontSize: '0.65rem', color: '#fbbf24', display: 'block', marginTop: '2px' }}>+ Ongkir unit</span>
                    )}
                  </div>

                  {/* Quantity Counter Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px' }}>
                    <button onClick={() => updateQuantity(prod.id, -1)} className="btn btn-secondary btn-sm" style={{ flex: 1, padding: '8px' }}>
                      <Minus size={14} />
                    </button>
                    <button onClick={() => updateQuantity(prod.id, 1)} className="btn btn-primary btn-sm" style={{ flex: 1, padding: '8px' }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Order Summary & Transaction Panel */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Customer & Transaction Options */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', color: '#f8fafc' }}>
              Detail Pelanggan & Skenario
            </h3>

            {/* Customer Picker */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  <User size={14} style={{ display: 'inline', marginRight: '4px' }} /> Pelanggan / Reseller
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowAddKontakModal(true)}
                  className="btn btn-sm btn-primary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <UserPlus size={13} /> + Tambah Kontak Baru
                </button>
              </div>
              <select 
                value={selectedKontakId} 
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="form-select"
              >
                {kontakList.map(k => (
                  <option key={k.id} value={k.id}>
                    {k.nama} ({k.tipe.toUpperCase()}) {k.hutang_saat_ini ? `- Hutang: ${AppStore.formatRupiah(k.hutang_saat_ini)}` : ''}
                  </option>
                ))}
              </select>

              {/* Debt Alert Banner */}
              {(selectedKontak?.hutang_saat_ini || 0) > 0 && (
                <div style={{
                  marginTop: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: '8px'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} color="#ef4444" />
                    <span>Catatan Utang: <strong style={{ color: '#ffffff' }}>{AppStore.formatRupiah(selectedKontak.hutang_saat_ini || 0)}</strong></span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => openBayarHutangModal(selectedKontak.id)}
                    className="btn btn-sm btn-warning" 
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    💳 Bayar Utang Sekarang
                  </button>
                </div>
              )}

              {/* Pinjam Galon Warning Banner */}
              {tipeTransaksi === 'pinjam_galon' && (selectedKontakId === 'kt-1' || selectedKontak?.id === 'kt-1') && (
                <div style={{
                  marginTop: '10px', background: 'rgba(245, 158, 11, 0.18)', border: '2px solid #fbbf24',
                  borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: '8px'
                }}>
                  <div style={{ fontSize: '0.82rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={20} color="#fbbf24" />
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>Harap Mengisi / Memilih Pelanggan Baru!</strong>
                      <span style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>
                        Transaksi Pinjam Galon wajib mencatat identitas peminjam secara jelas. Walk-in Biasa tidak diizinkan.
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowAddKontakModal(true)}
                    className="btn btn-sm btn-primary" 
                    style={{ fontSize: '0.75rem', padding: '6px 12px', background: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <UserPlus size={14} /> + Isi Pelanggan Baru
                  </button>
                </div>
              )}

              {/* Delivery Warning Banner */}
              {isDelivery && (selectedKontakId === 'kt-1' || selectedKontak?.id === 'kt-1') && (
                <div style={{
                  marginTop: '10px', background: 'rgba(2, 132, 199, 0.18)', border: '2px solid #38bdf8',
                  borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: '8px'
                }}>
                  <div style={{ fontSize: '0.82rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={20} color="#38bdf8" />
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>Layanan Delivery Membutuhkan Data Pelanggan!</strong>
                      <span style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>
                        Walk-in Pelanggan Biasa tidak memiliki alamat pengantaran. Silakan daftarkan Pelanggan Baru terlebih dahulu.
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowAddKontakModal(true)}
                    className="btn btn-sm btn-primary" 
                    style={{ fontSize: '0.75rem', padding: '6px 12px', background: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <UserPlus size={14} /> + Isi Pelanggan Baru
                  </button>
                </div>
              )}
            </div>

            {/* Transaction Type */}
            <div className="form-group">
              <label className="form-label">Skenario Transaksi Lapangan</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setTipeTransaksi('tukar_galon')}
                  className={`btn btn-sm ${tipeTransaksi === 'tukar_galon' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Tukar Galon
                </button>
                <button 
                  type="button" 
                  onClick={() => setTipeTransaksi('isi_langsung')}
                  className={`btn btn-sm ${tipeTransaksi === 'isi_langsung' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Isi Langsung
                </button>
                <button 
                  type="button" 
                  onClick={() => setTipeTransaksi('titip_galon')}
                  className={`btn btn-sm ${tipeTransaksi === 'titip_galon' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Titip Galon
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setTipeTransaksi('pinjam_galon');
                    if (selectedKontakId === 'kt-1' || selectedKontak?.id === 'kt-1') {
                      alert('⚠️ Transaksi Pinjam Galon Memerlukan Identitas Pelanggan Terdaftar!\n\nWalk-in Pelanggan Biasa tidak dapat meminjam galon depo. Silakan pilih pelanggan terdaftar atau buat Kontak Pelanggan Baru!');
                      setShowAddKontakModal(true);
                    }
                  }}
                  className={`btn btn-sm ${tipeTransaksi === 'pinjam_galon' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Pinjam Galon
                </button>
              </div>
            </div>

            {/* Delivery Toggle & Zone */}
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '12px', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <input 
                  type="checkbox" 
                  checked={isDelivery} 
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsDelivery(checked);
                    if (checked && (selectedKontakId === 'kt-1' || selectedKontak?.id === 'kt-1')) {
                      alert('🚚 Transaksi Layanan Kirim Antar (Delivery) Memerlukan Nama & Alamat Pelanggan!\n\nWalk-in Pelanggan Biasa tidak memiliki alamat pengantaran. Silakan daftarkan atau pilih Pelanggan Baru terlebih dahulu.');
                      setShowAddKontakModal(true);
                    }
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#0284c7' }}
                />
                <Truck size={18} color="#38bdf8" /> Kirim Antar Ke Rumah (Delivery)
              </label>

              {isDelivery && (
                <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
                  <label className="form-label">Pilih Zona Ongkir Tujuan</label>
                  <select 
                    value={selectedZonaId} 
                    onChange={(e) => setSelectedZonaId(e.target.value)}
                    className="form-select"
                  >
                    {zonaList.map(z => (
                      <option key={z.id} value={z.id}>
                        {z.nama_zona} - {AppStore.formatRupiah(z.tarif_per_galon)}/unit
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Cart Table Summary */}
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
              Ringkasan Pesanan ({cartItems.length} Produk)
            </h4>

            {cartItems.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Keranjang masih kosong. Klik tombol + pada produk.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {cartItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{item.nama_produk}</span>
                      <span style={{ color: '#94a3b8', marginLeft: '6px' }}>x{item.jumlah}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#38bdf8' }}>{AppStore.formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & Payment Method */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#94a3b8' }}>
              <span>Subtotal Produk</span>
              <span>{AppStore.formatRupiah(subtotalProduk)}</span>
            </div>

            {isDelivery && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#fbbf24', marginTop: '4px' }}>
                <span>Ongkir ({totalUnitOngkir} unit x {AppStore.formatRupiah(tarifOngkirPerUnit)})</span>
                <span>+{AppStore.formatRupiah(totalOngkir)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--glass-border)' }}>
              <span>TOTAL AKHIR</span>
              <span>{AppStore.formatRupiah(totalAkhir)}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="form-group" style={{ marginTop: '14px', marginBottom: 0 }}>
              <label className="form-label">Metode Pembayaran (7 Pilih)</label>
              <select 
                value={metodePembayaran} 
                onChange={(e) => setMetodePembayaran(e.target.value as MetodePembayaran)}
                className="form-select"
              >
                <option value="tunai">💵 Tunai (Hitung Kembalian)</option>
                <option value="qris">📱 QRIS Depo</option>
                <option value="transfer">🏦 Transfer Bank</option>
                <option value="edc">💳 EDC Kartu Debit</option>
                <option value="hutang">⚠️ Hutang / Kredit Pelanggan</option>
              </select>
            </div>

            {/* Cash Input */}
            {metodePembayaran === 'tunai' && (
              <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
                <label className="form-label">Uang Diterima Tunai</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={jumlahBayarTunai || ''} 
                  onChange={(e) => setJumlahBayarTunai(Number(e.target.value))}
                  placeholder="0"
                />
                {jumlahBayarTunai >= totalAkhir && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>
                    Kembalian: {AppStore.formatRupiah(kembalian)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <button onClick={clearCart} className="btn btn-secondary">
              Reset
            </button>
            <button onClick={handleProcessOrder} className="btn btn-success btn-lg">
              <Check size={20} /> Process & Print Struk
            </button>
          </div>

        </div>

      </div>

      {/* Modal Form Entry Pembayaran / Pelunasan Utang */}
      {showBayarHutangModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '520px', padding: '24px', background: '#0f172a',
            border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={22} color="#f59e0b" /> Entry Pembayaran Utang Pelanggan
              </h3>
              <button type="button" onClick={() => setShowBayarHutangModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessBayarHutang} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Select Customer */}
              <div className="form-group">
                <label className="form-label">Pilih Pelanggan / Reseller</label>
                <select 
                  value={selectedHutangKontakId} 
                  onChange={(e) => handleSelectHutangKontakChange(e.target.value)}
                  className="form-select"
                >
                  {kontakList.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.nama} ({k.tipe.toUpperCase()}) { (k.hutang_saat_ini || 0) > 0 ? `⚠️ Utang: ${AppStore.formatRupiah(k.hutang_saat_ini || 0)}` : '✓ Lunas (0)' }
                    </option>
                  ))}
                </select>
              </div>

              {/* Debt Info Badge */}
              {(() => {
                const k = kontakList.find(item => item.id === selectedHutangKontakId);
                const hutang = k?.hutang_saat_ini || 0;
                return (
                  <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8' }}>
                      <span>Sisa Utang Saat Ini:</span>
                      <strong style={{ fontSize: '1.05rem', color: hutang > 0 ? '#ef4444' : '#34d399' }}>{AppStore.formatRupiah(hutang)}</strong>
                    </div>
                    {hutang > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button 
                          type="button" 
                          onClick={() => { setNominalBayarHutang(hutang); setUangDiterimaHutang(hutang); }}
                          className="btn btn-sm btn-secondary" 
                          style={{ flex: 1, fontSize: '0.75rem' }}
                        >
                          Lunasi 100% ({AppStore.formatRupiah(hutang)})
                        </button>
                        {hutang > 50000 && (
                          <button 
                            type="button" 
                            onClick={() => { setNominalBayarHutang(50000); setUangDiterimaHutang(50000); }}
                            className="btn btn-sm btn-secondary" 
                            style={{ flex: 1, fontSize: '0.75rem' }}
                          >
                            Bayar Rp 50rb
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Payment Amount Input */}
              <div className="form-group">
                <label className="form-label">Nominal Pembayaran Utang (Rp)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={nominalBayarHutang || ''} 
                  onChange={(e) => setNominalBayarHutang(Number(e.target.value))}
                  placeholder="0"
                  required 
                />
              </div>

              {/* Payment Method Selector */}
              <div className="form-group">
                <label className="form-label">Metode Pembayaran</label>
                <select 
                  value={metodeBayarHutang} 
                  onChange={(e) => setMetodeBayarHutang(e.target.value as MetodePembayaran)}
                  className="form-select"
                >
                  <option value="tunai">💵 Tunai</option>
                  <option value="qris">📱 QRIS Depo</option>
                  <option value="transfer">🏦 Transfer Bank</option>
                  <option value="edc">💳 EDC Kartu Debit</option>
                </select>
              </div>

              {/* Cash Input */}
              {metodeBayarHutang === 'tunai' && (
                <div className="form-group">
                  <label className="form-label">Uang Diterima Tunai (Rp)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={uangDiterimaHutang || ''} 
                    onChange={(e) => setUangDiterimaHutang(Number(e.target.value))}
                    placeholder="0"
                    required 
                  />
                  {uangDiterimaHutang >= nominalBayarHutang && (
                    <span style={{ fontSize: '0.8rem', color: '#34d399', display: 'block', marginTop: '4px', fontWeight: 700 }}>
                      Kembalian: {AppStore.formatRupiah(uangDiterimaHutang - nominalBayarHutang)}
                    </span>
                  )}
                </div>
              )}

              {/* Note / Catatan */}
              <div className="form-group">
                <label className="form-label">Catatan / Keterangan</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={catatanHutang} 
                  onChange={(e) => setCatatanHutang(e.target.value)}
                  placeholder="Catatan pelunasan..." 
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowBayarHutangModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  <Check size={18} /> Proses & Cetak Struk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup Notifikasi Tunggakan Utang Saat Transaksi Berikutnya */}
      {showHutangNotifModal && notifKontak && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '480px', padding: '26px', background: '#0f172a',
            border: '2px solid #ef4444', boxShadow: '0 0 35px rgba(239, 68, 68, 0.4)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px'
              }}>
                <AlertTriangle size={32} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                Peringatan: Ada Tunggakan Utang!
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
                Pelanggan ini masih memiliki sisa hutang dari transaksi sebelumnya.
              </p>
            </div>

            {/* Customer & Debt Box */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nama Pelanggan:</span>
                <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{notifKontak.nama}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Status / Tipe:</span>
                <span className="badge badge-primary">{notifKontak.tipe.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed var(--glass-border)' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 700 }}>Total Utang Belum Lunas:</span>
                <strong style={{ color: '#ef4444', fontSize: '1.15rem' }}>{AppStore.formatRupiah(notifKontak.hutang_saat_ini || 0)}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => {
                  setShowHutangNotifModal(false);
                  openBayarHutangModal(notifKontak.id);
                }} 
                className="btn btn-warning btn-lg" 
                style={{ width: '100%', fontWeight: 700 }}
              >
                💳 Bayar / Lunasi Utang Dulu
              </button>
              <button 
                type="button" 
                onClick={() => setShowHutangNotifModal(false)} 
                className="btn btn-secondary" 
                style={{ width: '100%' }}
              >
                🛒 Lanjutkan Transaksi Pembelian Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Modal Form Quick Tambah Kontak Baru */}
      {showAddKontakModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '500px', padding: '26px', background: '#0f172a',
            border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={22} color="#0284c7" /> Tambah Kontak Pelanggan / Reseller
              </h3>
              <button type="button" onClick={() => setShowAddKontakModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewKontak} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap / Nama Toko</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newNama} 
                  onChange={(e) => setNewNama(e.target.value)} 
                  placeholder="Contoh: Pak Hendra / Warteg Merdeka" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kategori Kontak</label>
                <select 
                  value={newTipe} 
                  onChange={(e) => setNewTipe(e.target.value as TipeKontak)} 
                  className="form-select"
                >
                  <option value="pelanggan">Pelanggan Rumah Tangga</option>
                  <option value="reseller">Reseller / Toko Mitra</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nomor WhatsApp / HP</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newNoHp} 
                  onChange={(e) => setNewNoHp(e.target.value)} 
                  placeholder="08..." 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Lengkap Pengiriman</label>
                <textarea 
                  className="form-textarea" 
                  rows={2} 
                  value={newAlamat} 
                  onChange={(e) => setNewAlamat(e.target.value)} 
                  placeholder="Jl. Merpati No..." 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Limit Maksimum Hutang (Rp)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={newLimitHutang || ''} 
                  onChange={(e) => setNewLimitHutang(Number(e.target.value))} 
                  placeholder="100000" 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddKontakModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  <Check size={18} /> Simpan &amp; Pilih Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup Modal Form Entry Pengeluaran Kasir / Lain-Lain */}
      {showAddPengeluaranModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '520px', padding: '26px', background: '#0f172a',
            border: '2px solid #ef4444', boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingDown size={22} color="#f87171" /> Entry Pengeluaran Kasir (Lain-Lain)
              </h3>
              <button type="button" onClick={() => setShowAddPengeluaranModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Warning Info */}
            <div style={{
              background: kategoriPengeluaran === 'pengembalian_kasbon' 
                ? 'rgba(16, 185, 129, 0.15)' 
                : 'rgba(239, 68, 68, 0.12)', 
              border: kategoriPengeluaran === 'pengembalian_kasbon'
                ? '1px solid #34d399'
                : '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.82rem',
              color: kategoriPengeluaran === 'pengembalian_kasbon' ? '#34d399' : '#fca5a5'
            }}>
              {kategoriPengeluaran === 'pengembalian_kasbon' ? (
                <>🟢 <strong>KAS MASUK (+):</strong> Uang pengembalian kasbon diterima dari karyawan dan masuk ke laci kasir (<strong>Menambah Saldo Kas Setoran</strong>).</>
              ) : (
                <>ℹ️ <strong>KAS KELUAR (-):</strong> Transaksi ini akan mengurangkan total <strong>Saldo Kas Fisik Kasir</strong> yang wajib disetor ke Owner.</>
              )}
            </div>

            <form onSubmit={handleSavePengeluaran} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Kategori Transaksi Kas</label>
                <select 
                  value={kategoriPengeluaran} 
                  onChange={(e) => handleKategoriChange(e.target.value)} 
                  className="form-select"
                >
                  <option value="operasional">🛠️ Operasional Depo / Toko</option>
                  <option value="pembelian_air_baku">💧 Pembelian Air Baku (Truk Tangki)</option>
                  <option value="ongkir">🚚 Ongkir / Transportasi Delivery</option>
                  <option value="gaji">💼 Pembayaran Gaji Karyawan</option>
                  <option value="kasbon">💸 Pemberian Kasbon Karyawan</option>
                  <option value="pengembalian_kasbon">💵 Pengembalian / Pelunasan Kasbon Karyawan</option>
                  <option value="bensin">⛽ Bensin &amp; BBM Operasional</option>
                  <option value="konsumsi">☕ Konsumsi / Uang Makan</option>
                  <option value="lain_lain">📦 Pengeluaran Lain-Lain</option>
                </select>
              </div>

              {/* Seksi Khusus Detail Pembelian Air Baku Truk Tangki */}
              {kategoriPengeluaran === 'pembelian_air_baku' && (
                <div style={{
                  background: 'rgba(2, 132, 199, 0.15)', border: '1px solid #38bdf8',
                  borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💧 Rincian Pasokan Air Baku Truk Tangki
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>
                      Nama Vendor / Sopir Pengirim <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={vendorAirBaku}
                      onChange={(e) => {
                        const v = e.target.value;
                        setVendorAirBaku(v);
                        setPeruntukanPengeluaran(`Pembelian Air Baku Tangki ${volumeAirBaku} Liter - ${v || 'Truk Tangki'}`);
                      }}
                      placeholder="Contoh: Truk Tangki Tirta Jaya (Pak Agus)"
                      required={kategoriPengeluaran === 'pembelian_air_baku'}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>
                        Volume Air Masuk (Liter) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={volumeAirBaku || ''}
                        onChange={(e) => {
                          const vol = Number(e.target.value);
                          setVolumeAirBaku(vol);
                          setPeruntukanPengeluaran(`Pembelian Air Baku Tangki ${vol} Liter - ${vendorAirBaku || 'Truk Tangki'}`);
                        }}
                        placeholder="5000"
                        required={kategoriPengeluaran === 'pembelian_air_baku'}
                        min={100}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>
                        Harga Perolehan Air (Rp) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={hargaPerolehanAir || ''}
                        onChange={(e) => {
                          const harga = Number(e.target.value);
                          setHargaPerolehanAir(harga);
                          setNominalPengeluaran(harga + Number(tipsSopirAir));
                        }}
                        placeholder="350000"
                        required={kategoriPengeluaran === 'pembelian_air_baku'}
                        min={0}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>
                        Tips / Uang Minum Sopir (Rp)
                      </label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={tipsSopirAir || ''}
                        onChange={(e) => {
                          const tips = Number(e.target.value);
                          setTipsSopirAir(tips);
                          setNominalPengeluaran(Number(hargaPerolehanAir) + tips);
                        }}
                        placeholder="20000"
                        min={0}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>
                        Meteran Waktu Diisi (Liter) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={meteranWaktuDiisi || ''}
                        onChange={(e) => setMeteranWaktuDiisi(Number(e.target.value))}
                        placeholder="10000"
                        required={kategoriPengeluaran === 'pembelian_air_baku'}
                        min={0}
                      />
                    </div>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Nominal Kas Keluar:</span>
                    <strong style={{ fontSize: '1.1rem', color: '#34d399' }}>
                      {AppStore.formatRupiah(Number(hargaPerolehanAir) + Number(tipsSopirAir))}
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                    ⚡ Stok Air Baku di Tangki Depo akan otomatis bertambah <strong>+{volumeAirBaku} Liter</strong> &amp; Posisi Meteran Air diperbarui ke <strong>{meteranWaktuDiisi.toLocaleString('id-ID')} Liter</strong> setelah disimpan.
                  </span>
                </div>
              )}

              {/* Dropdown Karyawan / Staf / Penerima Selection */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Pilih Nama Karyawan / Staf / Penerima {['gaji', 'kasbon', 'pengembalian_kasbon', 'ongkir'].includes(kategoriPengeluaran) && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowAddPenerimaInput(!showAddPenerimaInput)}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={13} /> {showAddPenerimaInput ? 'Tutup Form' : '+ Penerima Baru'}
                  </button>
                </div>

                {/* Form Inline Tambah Penerima Baru */}
                {showAddPenerimaInput && (
                  <div style={{ background: 'rgba(2, 132, 199, 0.12)', padding: '12px', borderRadius: '10px', border: '1px solid #0284c7', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>➕ Tambah Nama Penerima Baru / Vendor / Pihak Ketiga</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={namaPenerimaInput}
                        onChange={(e) => setNamaPenerimaInput(e.target.value)}
                        placeholder="Nama Penerima Baru..."
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      />
                      <input 
                        type="text" 
                        className="form-input" 
                        value={jabatanPenerimaInput}
                        onChange={(e) => setJabatanPenerimaInput(e.target.value)}
                        placeholder="Peran (opsional)..."
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={handleSaveNewPenerima} 
                      className="btn btn-primary btn-sm"
                      style={{ alignSelf: 'flex-end', fontSize: '0.75rem', padding: '4px 12px' }}
                    >
                      Simpan &amp; Pilih Penerima
                    </button>
                  </div>
                )}

                <select 
                  value={selectedKaryawanId} 
                  onChange={(e) => handleKaryawanChange(e.target.value)} 
                  className="form-select"
                  required={['gaji', 'kasbon', 'pengembalian_kasbon', 'ongkir'].includes(kategoriPengeluaran)}
                >
                  <option value="">-- {['gaji', 'kasbon', 'pengembalian_kasbon', 'ongkir'].includes(kategoriPengeluaran) ? 'Wajib Pilih Karyawan / Penerima' : 'Pilih Karyawan / Staf / Penerima (Opsional)'} --</option>
                  {karyawanList.map(k => (
                    <option key={k.id} value={k.id}>
                      👤 {k.nama} ({k.jabatan})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Isian Peruntukan / Keperluan <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={peruntukanPengeluaran} 
                  onChange={(e) => setPeruntukanPengeluaran(e.target.value)} 
                  placeholder="Contoh: Beli Plastik & Sedotan / Gaji Bulan Ini / Kasbon Doni" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Nominal Transaksi (Rp) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={nominalPengeluaran || ''} 
                  onChange={(e) => setNominalPengeluaran(Number(e.target.value))} 
                  placeholder="Contoh: 50000" 
                  required 
                  min={100}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Tambahan (Opsional)</label>
                <textarea 
                  className="form-textarea" 
                  rows={2} 
                  value={catatanPengeluaran} 
                  onChange={(e) => setCatatanPengeluaran(e.target.value)} 
                  placeholder="Catatan pendukung atau no bukti/keterangan..." 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddPengeluaranModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button 
                  type="submit" 
                  className={`btn ${kategoriPengeluaran === 'pengembalian_kasbon' ? 'btn-success' : 'btn-danger'}`} 
                  style={{ flex: 1, fontWeight: 700 }}
                >
                  <Check size={18} /> Simpan Transaksi Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Popup Modal Form Entry Hutang Toko */}
      {showAddHutangTokoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10003, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '530px', padding: '26px', background: '#0f172a',
            border: '2px solid #fbbf24', boxShadow: '0 25px 50px -12px rgba(251, 191, 36, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={22} color="#fbbf24" /> Entry Catatan Hutang Toko / Pinjaman
              </h3>
              <button type="button" onClick={() => setShowAddHutangTokoModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Info Banner */}
            <div style={{
              background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.82rem', color: '#fef08a'
            }}>
              📑 <strong>Catatan Kewajiban Toko:</strong> Pencatatan hutang toko (pinjaman/talangan dari Karyawan atau Orang Ketiga/Vendor) yang wajib dilunasi oleh Depo.
            </div>

            <form onSubmit={handleSaveHutangToko} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Tipe Pihak Selection */}
              <div className="form-group">
                <label className="form-label">Tipe Pihak Pemberi Hutang / Pinjaman</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      setTipePihakHutang('karyawan');
                      setNamaOrangKetiga('');
                    }}
                    className={`btn btn-sm ${tipePihakHutang === 'karyawan' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px', fontSize: '0.85rem' }}
                  >
                    👤 Karyawan / Staf Depo
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setTipePihakHutang('orang_ketiga');
                      setSelectedHutangKaryawanId('');
                    }}
                    className={`btn btn-sm ${tipePihakHutang === 'orang_ketiga' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px', fontSize: '0.85rem' }}
                  >
                    🏢 Orang Ketiga / Vendor
                  </button>
                </div>
              </div>

              {/* Input for Karyawan vs Orang Ketiga */}
              {tipePihakHutang === 'karyawan' ? (
                <div className="form-group">
                  <label className="form-label">
                    Pilih Nama Karyawan Pemberi Pinjaman / Talangan <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={selectedHutangKaryawanId} 
                    onChange={(e) => setSelectedHutangKaryawanId(e.target.value)} 
                    className="form-select"
                    required
                  >
                    <option value="">-- Pilih Nama Karyawan --</option>
                    {karyawanList.map(k => (
                      <option key={k.id} value={k.id}>
                        👤 {k.nama} ({k.jabatan})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">
                    Isikan Nama Orang Ketiga / Perusahaan / Vendor <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={namaOrangKetiga} 
                    onChange={(e) => setNamaOrangKetiga(e.target.value)} 
                    placeholder="Contoh: Toko Plastik Jaya / Pak Slamet / PT Air Mineral" 
                    required 
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Isian Peruntukan / Keperluan Hutang Toko <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={peruntukanHutangToko} 
                  onChange={(e) => setPeruntukanHutangToko(e.target.value)} 
                  placeholder="Contoh: Talangan Belanja Tutup Galon / DP Servis Mesin" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Nominal Hutang Toko (Rp) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={nominalHutangToko || ''} 
                  onChange={(e) => setNominalHutangToko(Number(e.target.value))} 
                  placeholder="Contoh: 150000" 
                  required 
                  min={100}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Tambahan (Opsional)</label>
                <textarea 
                  className="form-textarea" 
                  rows={2} 
                  value={catatanHutangToko} 
                  onChange={(e) => setCatatanHutangToko(e.target.value)} 
                  placeholder="Keterangan tenggat waktu pelunasan atau no nota..." 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddHutangTokoModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-warning" style={{ flex: 1, fontWeight: 700 }}>
                  <Check size={18} /> Simpan Catatan Hutang Toko
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
