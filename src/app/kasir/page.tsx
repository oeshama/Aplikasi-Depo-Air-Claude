'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Produk, Kontak, ZoneOngkir, Pesanan, PesananItem, 
  TipeTransaksi, MetodePembayaran, PembayaranDetail, TipeKontak, Pengeluaran, Karyawan, HutangToko, TipePihakHutang, PengaturanDepo 
} from '@/lib/types';
import { AppStore } from '@/lib/store';
import { calculateOrderDuration, alarmSound, formatThresholdText } from '@/lib/audioAndTimer';
import ReceiptModal from '@/components/ReceiptModal';
import { cetakStrukPenjualan } from '@/lib/cetak';
import ExpenseReceiptModal from '@/components/ExpenseReceiptModal';
import BukaShiftModal from '@/components/BukaShiftModal';
import ZonaSelect from '@/components/ZonaSelect';
import KonfirmasiTerkirimSheet from '@/components/KonfirmasiTerkirimSheet';
import SetoranKurirSheet from '@/components/SetoranKurirSheet';
import SerahOwnerSheet from '@/components/SerahOwnerSheet';
import {
  ShoppingCart, Plus, Minus, User, Truck, Receipt,
  CreditCard, DollarSign, QrCode, Building, Clock, AlertTriangle, Check,
  BellOff, Volume2, Package, UserPlus, X, TrendingDown, FileText, Banknote, UserCheck, BookOpen,
  Bell, MoreHorizontal, ChevronDown, ChevronUp, HandCoins, type LucideIcon
} from 'lucide-react';

const TIPE_LABEL: Record<TipeTransaksi, string> = {
  tukar_galon: 'Tukar Galon',
  isi_langsung: 'Isi Langsung',
  titip_galon: 'Titip Galon',
  pinjam_galon: 'Pinjam Galon',
  pelunasan_hutang: 'Pelunasan Hutang'
};

const METODE_OPTIONS: { value: MetodePembayaran; label: string; Icon: LucideIcon }[] = [
  { value: 'tunai', label: 'Tunai', Icon: Banknote },
  { value: 'qris', label: 'QRIS', Icon: QrCode },
  { value: 'transfer', label: 'Transfer', Icon: Building },
  { value: 'edc', label: 'EDC Debit', Icon: CreditCard },
  { value: 'hutang', label: 'Hutang', Icon: BookOpen }
];

export default function KasirPage() {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [kontakList, setKontakList] = useState<Kontak[]>([]);
  const [zonaList, setZonaList] = useState<ZoneOngkir[]>([]);
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanDepo>(AppStore.getPengaturan());

  // Tampilan ringkas: lembar/menu hanya muncul saat dibutuhkan
  const [showCheckout, setShowCheckout] = useState<boolean>(false);
  const [showOpsi, setShowOpsi] = useState<boolean>(false);
  const [showAlertPanel, setShowAlertPanel] = useState<boolean>(false);
  const [showMenuLainnya, setShowMenuLainnya] = useState<boolean>(false);
  const [showKasDetail, setShowKasDetail] = useState<boolean>(false);
  const [konfirmasiPesanan, setKonfirmasiPesanan] = useState<Pesanan | null>(null);
  const [showSetoranKurir, setShowSetoranKurir] = useState<boolean>(false);
  const [showSerahOwner, setShowSerahOwner] = useState<boolean>(false);

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
  const [newZonaId, setNewZonaId] = useState<string>('');

  const handleSaveNewKontak = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) {
      alert('Nama pelanggan / toko tidak boleh kosong!');
      return;
    }
    if (!newZonaId || !zonaList.some(z => z.id === newZonaId)) {
      alert('Pilih zona ongkir pelanggan dulu.');
      return;
    }

    const newKontak: Kontak = {
      id: `kt-${Date.now()}`,
      nama: newNama.trim(),
      tipe: newTipe,
      no_hp: newNoHp.trim() || '-',
      alamat: newAlamat.trim() || '-',
      limit_hutang: Number.isFinite(newLimitHutang) ? newLimitHutang : 100000, // 0 = tidak boleh berhutang
      zona_id: newZonaId || undefined,
      hutang_saat_ini: 0,
      aktif: true
    };

    const currentKontak = AppStore.getKontak();
    const updated = [newKontak, ...currentKontak];
    AppStore.saveKontak(updated);

    // Refresh kontak list & auto-select new customer
    setKontakList(updated.filter(k => k.aktif));
    setSelectedKontakId(newKontak.id);
    if (newZonaId) setSelectedZonaId(newZonaId);

    // Reset form & close modal
    setNewNama('');
    setNewTipe('pelanggan');
    setNewNoHp('');
    setNewAlamat('');
    setNewLimitHutang(100000);
    setNewZonaId('');
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
      tanggal_masuk: AppStore.tanggalHariIni(),
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
        alert(`Pembayaran gaji untuk "${kary.nama}" belum dapat diproses karena belum melewati tanggal jatuh tempo (Jatuh Tempo: Tanggal ${dueDay}).`);
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
      sumber_kas: 'laci', // dari layar kasir, uangnya selalu dari laci
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
  // Kasir belum punya shift aktif (popup boleh ditutup, tapi pembayaran diblokir)
  const [needsShift, setNeedsShift] = useState<boolean>(false);
  const shiftDismissedRef = useRef<boolean>(false);   // popup sudah ditutup kasir pada kunjungan ini
  const holdShiftModalRef = useRef<boolean>(false);   // jangan tutup popup selagi struk buka shift tampil

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
        setNeedsShift(true);
        if (!shiftDismissedRef.current) setShowBukaShiftModal(true);
      } else {
        setNeedsShift(false);
        if (!holdShiftModalRef.current) setShowBukaShiftModal(false);
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
    window.addEventListener('depo_shift_updated', loadData);
    window.addEventListener('depo_pengeluaran_updated', loadData);
    window.addEventListener('depo_setoran_kurir_updated', loadData);
    window.addEventListener('depo_setoran_owner_updated', loadData);

    const interval = setInterval(() => setNowTick(Date.now()), 10000);

    return () => {
      window.removeEventListener('depo_produk_updated', loadData);
      window.removeEventListener('depo_zona_updated', loadData);
      window.removeEventListener('depo_kontak_updated', loadData);
      window.removeEventListener('depo_pesanan_updated', loadData);
      window.removeEventListener('depo_pengaturan_updated', loadData);
      window.removeEventListener('depo_shift_updated', loadData);
      window.removeEventListener('depo_pengeluaran_updated', loadData);
      window.removeEventListener('depo_setoran_kurir_updated', loadData);
      window.removeEventListener('depo_setoran_owner_updated', loadData);
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
  const minStokAirBakuCalc = pengaturan.min_stok_air_baku_liter ?? 2000;
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

  // Buka lembar konfirmasi: kasir memilih kurir dan mencatat cara bayar pelanggan
  const handleKonfirmasiTerkirim = (id: string) => {
    const target = pesananList.find(p => p.id === id) || AppStore.getPesanan().find(p => p.id === id) || null;
    setKonfirmasiPesanan(target);
  };

  const selesaiKonfirmasiTerkirim = (hasil: Pesanan) => {
    setSnoozedUntilMap(prev => {
      const copy = { ...prev };
      delete copy[hasil.id];
      return copy;
    });
    setKonfirmasiPesanan(null);
    alert(hasil.kurir_diterima_at
      ? 'Pengiriman dikonfirmasi. Uang tunai tercatat dibawa kurir sampai kurir menyetor ke kasir.'
      : 'Pengiriman berhasil dikonfirmasi.');
  };

  const formatProdukRingkas = (items: Pesanan['items']) => {
    if (!items || items.length === 0) return '-';
    return items.map(item => `${item.nama_produk} (x${item.jumlah})`).join(', ');
  };

  const selectedKontak = kontakList.find(k => k.id === selectedKontakId) || kontakList[0];
  const selectedZona = zonaList.find(z => z.id === selectedZonaId) || zonaList[0];

  const handleSelectCustomer = (id: string) => {
    setSelectedKontakId(id);
    // Pelanggan punya zona langganan: ongkir antar terisi otomatis
    const zonaPelanggan = kontakList.find(k => k.id === id)?.zona_id;
    if (zonaPelanggan && zonaList.some(z => z.id === zonaPelanggan)) setSelectedZonaId(zonaPelanggan);
    if (isDelivery && (id === 'kt-1' || id === 'walk-in')) {
      alert('Transaksi Layanan Kirim Antar (Delivery) Memerlukan Nama & Alamat Pelanggan!\n\nWalk-in Pelanggan Biasa tidak memiliki alamat pengantaran. Silakan daftarkan atau pilih Pelanggan Baru terlebih dahulu.');
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
      // Harga khusus pelanggan terpilih (diatur owner/admin di data pelanggan); selain itu harga umum
      const hargaKhusus = selectedKontak?.harga_khusus?.[produkId];
      const adaHargaKhusus = typeof hargaKhusus === 'number' && hargaKhusus > 0 && hargaKhusus !== prod.harga_tempat;
      const hargaSatuan = adaHargaKhusus ? (hargaKhusus as number) : prod.harga_tempat;
      return {
        harga_khusus: adaHargaKhusus || undefined,
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
    if (needsShift) {
      setShowCheckout(false);
      setShowBukaShiftModal(true);
      alert('Buka shift dulu sebelum menerima pembayaran.');
      return;
    }

    if (cartItems.length === 0) {
      alert('Pilih minimal 1 produk terlebih dahulu!');
      return;
    }

    if (isDelivery) {
      if (!selectedKontak || selectedKontak.id === 'kt-1' || selectedKontakId === 'kt-1') {
        alert('Transaksi Layanan Kirim Antar (Delivery) Memerlukan Nama & Alamat Pelanggan!\n\nWalk-in Pelanggan Biasa tidak memiliki alamat pengantaran. Harap mendaftarkan atau memilih Pelanggan Baru terlebih dahulu agar driver tahu lokasi pengiriman!');
        setShowAddKontakModal(true);
        return;
      }
    }

    if (tipeTransaksi === 'pinjam_galon') {
      if (!selectedKontak || selectedKontak.id === 'kt-1' || selectedKontakId === 'kt-1') {
        alert('Transaksi Pinjam Galon Memerlukan Data Pelanggan Terdaftar!\n\nWalk-in Pelanggan Biasa tidak dapat meminjam galon depo. Harap mendaftarkan atau memilih Pelanggan Baru terlebih dahulu agar jelas siapa yang meminjam galon!');
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

    // Pesanan antar bayar tunai: uangnya diterima kurir dulu, baru masuk laci saat kurir menyetor
    const bayarKeKurir = isDelivery && metodePembayaran === 'tunai';
    if (bayarKeKurir) {
      statusBayar = 'belum_bayar';
      totalDibayar = 0;
    }

    const currentUser = AppStore.getCurrentUser();
    // Tanggal nota memakai waktu setempat (bukan UTC), dan nomor acaknya dicek supaya tidak kembar
    const sekarangNota = new Date();
    const tglNota = `${sekarangNota.getFullYear()}${String(sekarangNota.getMonth() + 1).padStart(2, '0')}${String(sekarangNota.getDate()).padStart(2, '0')}`;
    const notaSudahAda = new Set(AppStore.getPesanan().map(p => p.no_nota));
    let newNotaNo = '';
    do {
      newNotaNo = `INV-${tglNota}-${Math.floor(100 + Math.random() * 900)}`;
    } while (notaSudahAda.has(newNotaNo));

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
      bayar_ke_kurir: bayarKeKurir || undefined,
      created_at: new Date().toISOString()
    };

    AppStore.addPesanan(newPesanan);

    if (metodePembayaran === 'hutang') {
      AppStore.tambahHutangPelanggan(selectedKontak.id, totalAkhir);
    }

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
          updatedPinjaman[existingIdx].tanggal_pinjam = AppStore.tanggalHariIni();
        } else {
          updatedPinjaman.unshift({
            id: `pinjam-${Date.now()}`,
            kontak_id: selectedKontak.id,
            nama_pelanggan: selectedKontak.nama,
            jumlah_galon: totalGalonDipinjam,
            catatan: catatan || `Pinjam galon POS Nota ${newNotaNo}`,
            tanggal_pinjam: AppStore.tanggalHariIni()
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
    // Cetak otomatis hanya untuk printer lewat RawBT (dialog cetak browser tidak bisa otomatis)
    const pengCetak = AppStore.getPengaturan();
    if (pengCetak.printer_metode === 'rawbt' && pengCetak.printer_cetak_otomatis) {
      cetakStrukPenjualan(newPesanan, { otomatis: true });
    }
    clearCart();
    setShowCheckout(false);
    setShowOpsi(false);
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

  // Tunai langsung (pesanan antar tunai tidak dihitung, uangnya lewat kurir) + setoran kurir yang diterima
  const awalHariIniKasir = new Date(); awalHariIniKasir.setHours(0, 0, 0, 0);
  const kasLaciKasir = AppStore.hitungKasLaci(modalAwalKasir, activeShiftInfo ? shiftBukaTime : awalHariIniKasir.getTime());
  const totalTunaiShift = kasLaciKasir.tunaiLangsung;
  const totalSetoranShift = kasLaciKasir.setoranKurir;
  const uangDiKurir = AppStore.getTotalUangDiKurir();

  const totalPengeluaranShiftKeluar = kasLaciKasir.keluar;
  const totalPengembalianKasbonShift = kasLaciKasir.kasbonKembali;
  const totalDiserahkanOwnerShift = kasLaciKasir.diserahkanOwner;

  const saldoKasDiTangan = Math.max(0, kasLaciKasir.ekspektasi);

  const alertCount = (isWaterStockCriticalCalc ? 1 : 0) + pendingDelivery.length;
  const alertUrgent = isWaterStockCriticalCalc || delayedPending.length > 0;

  // Pelanggan lama belum punya zona: kasir bisa menyimpan zona yang dipilih ke data pelanggan
  const simpanZonaKePelanggan = () => {
    if (!selectedKontak) return;
    const list = AppStore.getKontak().map(k => (k.id === selectedKontak.id ? { ...k, zona_id: selectedZonaId } : k));
    AppStore.saveKontak(list);
    setKontakList(list.filter(k => k.aktif));
    alert(`Zona disimpan ke data pelanggan ${selectedKontak.nama}. Berikutnya ongkirnya terisi otomatis.`);
  };

  // Bayar: shift harus sudah dibuka, kalau belum popup buka shift muncul lagi
  const openCheckout = () => {
    if (needsShift) {
      setShowBukaShiftModal(true);
      return;
    }
    setShowCheckout(true);
  };

  // Buka menu lain dari "Lainnya": tutup lembar menu dulu
  const openFromMenu = (fn: () => void) => () => {
    setShowMenuLainnya(false);
    fn();
  };

  // Esc menutup lembar yang sedang terbuka
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCheckout(false);
        setShowAlertPanel(false);
        setShowMenuLainnya(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Keranjang kosong: lembar pembayaran menutup sendiri
  useEffect(() => {
    if (showCheckout && cartItems.length === 0) setShowCheckout(false);
  }, [showCheckout, cartItems.length]);

  return (
    <div className={`page-stack${cartItems.length > 0 ? ' has-sticky' : ''}`}>
      {/* Modals */}
      <ReceiptModal pesanan={activeReceipt} onClose={() => setActiveReceipt(null)} />
      <ExpenseReceiptModal pengeluaran={activeExpenseReceipt} onClose={() => setActiveExpenseReceipt(null)} />
      <BukaShiftModal
        isOpen={showBukaShiftModal}
        onSubmitted={() => { holdShiftModalRef.current = true; }}
        onShiftOpened={() => {
          holdShiftModalRef.current = false;
          setNeedsShift(false);
          setShowBukaShiftModal(false);
        }}
        onClose={() => {
          shiftDismissedRef.current = true;
          setShowBukaShiftModal(false);
        }}
      />

      <KonfirmasiTerkirimSheet
        pesanan={konfirmasiPesanan}
        kurirOptions={AppStore.getUsers().filter(u => u.role === 'pengantar').map(u => ({ id: u.id, nama: u.nama }))}
        onClose={() => setKonfirmasiPesanan(null)}
        onDone={selesaiKonfirmasiTerkirim}
      />
      <SetoranKurirSheet isOpen={showSetoranKurir} onClose={() => setShowSetoranKurir(false)} />
      <SerahOwnerSheet isOpen={showSerahOwner} onClose={() => setShowSerahOwner(false)} />

      {/* Popup buka shift ditutup: ingatkan, dan bisa dibuka lagi kapan saja */}
      {needsShift && !showBukaShiftModal && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
          padding: '12px 14px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.14)', border: '1px solid rgba(180, 83, 9, 0.45)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--c-amber)', fontWeight: 600 }}>
            <AlertTriangle size={20} aria-hidden="true" /> Shift belum dibuka. Buka shift dulu sebelum menerima pembayaran.
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowBukaShiftModal(true)}>
            Buka shift
          </button>
        </div>
      )}

      {/* RINGKAS: kas laci, antaran/peringatan, dan menu tugas jarang */}
      <div className="glass-card" style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowKasDetail(v => !v)}
            aria-expanded={showKasDetail}
            className="strip-main"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
              background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(52, 211, 153, 0.4)',
              borderRadius: '12px', padding: '6px 10px', color: 'inherit', cursor: 'pointer'
            }}
          >
            <Banknote size={22} color="#34d399" aria-hidden="true" />
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kas laci saat ini</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--c-green)' }}>{AppStore.formatRupiah(saldoKasDiTangan)}</strong>
            </span>
            {showKasDetail ? <ChevronUp size={18} color="#94a3b8" aria-hidden="true" /> : <ChevronDown size={18} color="#94a3b8" aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={() => setShowAlertPanel(true)}
            className="btn btn-secondary strip-btn"
            aria-label={`Antaran dan peringatan, ${alertCount} item${alertUrgent ? ', ada yang mendesak' : ''}`}
            style={{ position: 'relative', padding: '10px 12px', borderColor: alertUrgent ? 'var(--c-red)' : undefined, color: alertUrgent ? 'var(--c-red-soft)' : undefined }}
          >
            <Bell size={18} aria-hidden="true" className={hasActiveAlarm || hasWaterStockAlarmAudio ? 'animate-pulse' : undefined} />
            Antaran
            {alertCount > 0 && (
              <span aria-hidden="true" style={{
                minWidth: '22px', height: '22px', padding: '0 6px', borderRadius: '11px', fontSize: '0.75rem', fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: alertUrgent ? '#dc2626' : '#b45309', color: '#ffffff'
              }}>
                {alertCount}
              </span>
            )}
          </button>

          <button type="button" onClick={() => setShowMenuLainnya(true)} className="btn btn-secondary strip-btn" aria-haspopup="dialog" style={{ padding: '10px 12px' }}>
            <MoreHorizontal size={18} aria-hidden="true" /> Lainnya
          </button>
        </div>

        {showKasDetail && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginTop: '10px', fontSize: '0.85rem' }}>
            <div style={{ background: 'var(--inset-70)', padding: '8px 12px', borderRadius: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Modal awal: </span>
              <strong>{AppStore.formatRupiah(modalAwalKasir)}</strong>
            </div>
            <div style={{ background: 'var(--inset-70)', padding: '8px 12px', borderRadius: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tunai masuk: </span>
              <strong style={{ color: 'var(--c-sky)' }}>+{AppStore.formatRupiah(totalTunaiShift + totalSetoranShift + totalPengembalianKasbonShift)}</strong>
            </div>
            <div style={{ background: 'var(--inset-70)', padding: '8px 12px', borderRadius: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pengeluaran: </span>
              <strong style={{ color: 'var(--c-red)' }}>-{AppStore.formatRupiah(totalPengeluaranShiftKeluar)}</strong>
            </div>
            {totalDiserahkanOwnerShift > 0 && (
              <div style={{ background: 'var(--inset-70)', padding: '8px 12px', borderRadius: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Diserahkan ke owner: </span>
                <strong style={{ color: 'var(--c-red)' }}>-{AppStore.formatRupiah(totalDiserahkanOwnerShift)}</strong>
              </div>
            )}
            {(uangDiKurir > 0 || totalSetoranShift > 0) && (
              <div style={{ background: 'var(--inset-70)', padding: '8px 12px', borderRadius: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Uang di kurir: </span>
                <strong style={{ color: uangDiKurir > 0 ? 'var(--c-amber)' : 'var(--c-green)' }}>{AppStore.formatRupiah(uangDiKurir)}</strong>
                {totalSetoranShift > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}> (setoran shift ini {AppStore.formatRupiah(totalSetoranShift)})</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PILIH PRODUK */}
      <section aria-labelledby="judul-produk">
        <h1 id="judul-produk" className="page-title" style={{ margin: '4px 0 10px' }}>Pilih Produk</h1>

        {produkList.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Belum ada produk aktif. Tambahkan produk lewat menu Produk dan Harga (Owner).</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
            {produkList.map(prod => {
              const qty = cart[prod.id] || 0;
              return (
                <div key={prod.id} className="glass-card" style={{
                  padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px',
                  background: qty > 0 ? 'var(--selected-bg)' : 'var(--bg-card)',
                  borderColor: qty > 0 ? 'var(--c-sky)' : 'var(--glass-border)'
                }}>
                  <div>
                    {prod.gambar_url && (
                      <div style={{ width: '100%', height: '70px', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px', background: 'var(--inset-50)' }}>
                        <img src={prod.gambar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{prod.nama_produk}</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{prod.volume_liter} Liter</p>
                    <div style={{ marginTop: '6px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--c-green)' }}>
                      {AppStore.formatRupiah(prod.harga_tempat)}
                    </div>
                    {prod.kena_ongkir && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--c-amber)', display: 'block', marginTop: '2px' }}>+ ongkir per unit</span>
                    )}
                  </div>

                  <div className="stepper" role="group" aria-label={`Jumlah ${prod.nama_produk}`}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(prod.id, -1)}
                      aria-label={`Kurangi ${prod.nama_produk}`}
                      disabled={qty === 0}
                      style={{ opacity: qty === 0 ? 0.4 : 1 }}
                    >
                      <Minus size={18} aria-hidden="true" />
                    </button>
                    <span className="qty" aria-live="polite">{qty}</span>
                    <button type="button" className="plus" onClick={() => updateQuantity(prod.id, 1)} aria-label={`Tambah ${prod.nama_produk}`}>
                      <Plus size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* BILAH TOTAL TETAP DI BAWAH LAYAR */}
      {cartItems.length > 0 && !showCheckout && (
        <div className="sticky-checkout no-print">
          <div className="sticky-checkout-inner">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {cartItems.reduce((acc, item) => acc + item.jumlah, 0)} item{isDelivery ? ' - diantar' : ''}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-green)' }}>{AppStore.formatRupiah(totalAkhir)}</div>
            </div>
            <button type="button" className="btn btn-success btn-lg" onClick={openCheckout} style={{ minWidth: '150px' }}>
              <ShoppingCart size={20} aria-hidden="true" /> Bayar
            </button>
          </div>
        </div>
      )}

      {/* LEMBAR PEMBAYARAN */}
      {showCheckout && (
        <div className="sheet-overlay" onClick={() => setShowCheckout(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-bayar" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 id="judul-bayar" className="sheet-title">Pembayaran</h2>
              <button type="button" className="icon-btn" aria-label="Tutup pembayaran" onClick={() => setShowCheckout(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Daftar pesanan dengan pengubah jumlah */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cartItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{item.nama_produk}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {AppStore.formatRupiah(item.harga_satuan)} x {item.jumlah} = <strong style={{ color: 'var(--c-sky)' }}>{AppStore.formatRupiah(item.subtotal)}</strong>
                      {item.harga_khusus && <span className="badge badge-primary" style={{ marginLeft: '6px' }}>harga khusus</span>}
                    </div>
                  </div>
                  <div className="stepper" role="group" aria-label={`Jumlah ${item.nama_produk}`} style={{ flexShrink: 0 }}>
                    <button type="button" onClick={() => updateQuantity(item.produk_id, -1)} aria-label={`Kurangi ${item.nama_produk}`}>
                      <Minus size={18} aria-hidden="true" />
                    </button>
                    <span className="qty">{item.jumlah}</span>
                    <button type="button" className="plus" onClick={() => updateQuantity(item.produk_id, 1)} aria-label={`Tambah ${item.nama_produk}`}>
                      <Plus size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pelanggan dan jenis transaksi: ringkas dulu, dibuka hanya jika perlu diubah */}
            <div style={{ marginTop: '14px', background: 'var(--inset-60)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
              <button
                type="button"
                onClick={() => setShowOpsi(v => !v)}
                aria-expanded={showOpsi}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                  padding: '12px 14px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left'
                }}
              >
                <span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pelanggan dan jenis transaksi</span>
                  <span style={{ fontWeight: 600 }}>
                    {selectedKontak?.nama || 'Walk-in'} - {TIPE_LABEL[tipeTransaksi]} - {isDelivery ? 'Diantar' : 'Ambil di depo'}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--c-sky)', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                  Ubah {showOpsi ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                </span>
              </button>

              {showOpsi && (
                <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pilih-pelanggan">Pelanggan / Reseller</label>
                    <select
                      id="pilih-pelanggan"
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
                    <button type="button" onClick={() => setShowAddKontakModal(true)} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
                      <UserPlus size={16} aria-hidden="true" /> Pelanggan baru
                    </button>

                    {(selectedKontak?.hutang_saat_ini || 0) > 0 && (
                      <div style={{
                        marginTop: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px'
                      }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--c-red-soft)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={16} aria-hidden="true" />
                          Utang: <strong style={{ color: 'var(--text-strong)' }}>{AppStore.formatRupiah(selectedKontak.hutang_saat_ini || 0)}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => { setShowCheckout(false); openBayarHutangModal(selectedKontak.id); }}
                          className="btn btn-sm btn-warning"
                        >
                          Bayar utang
                        </button>
                      </div>
                    )}

                    {(isDelivery || tipeTransaksi === 'pinjam_galon') && selectedKontak?.id === 'kt-1' && (
                      <p role="alert" style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--c-amber)' }}>
                        Transaksi ini butuh pelanggan terdaftar. Pilih pelanggan atau tambah pelanggan baru.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="form-label" id="label-jenis" style={{ marginBottom: '6px' }}>Jenis transaksi</div>
                    <div className="seg-grid" role="radiogroup" aria-labelledby="label-jenis">
                      {(['tukar_galon', 'isi_langsung', 'titip_galon', 'pinjam_galon'] as TipeTransaksi[]).map(t => (
                        <button
                          key={t}
                          type="button"
                          role="radio"
                          aria-checked={tipeTransaksi === t}
                          className="seg-btn"
                          onClick={() => {
                            setTipeTransaksi(t);
                            if (t === 'pinjam_galon' && (selectedKontakId === 'kt-1' || selectedKontak?.id === 'kt-1')) {
                              alert('Pinjam Galon butuh identitas pelanggan terdaftar. Walk-in tidak bisa meminjam galon. Pilih pelanggan atau buat pelanggan baru.');
                              setShowAddKontakModal(true);
                            }
                          }}
                        >
                          {TIPE_LABEL[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, minHeight: '44px' }}>
                      <input
                        type="checkbox"
                        checked={isDelivery}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsDelivery(checked);
                          if (checked && selectedKontak?.zona_id && zonaList.some(z => z.id === selectedKontak.zona_id)) setSelectedZonaId(selectedKontak.zona_id);
                          if (checked && (selectedKontakId === 'kt-1' || selectedKontak?.id === 'kt-1')) {
                            alert('Kirim antar butuh nama dan alamat pelanggan. Walk-in tidak punya alamat. Pilih atau daftarkan pelanggan dulu.');
                            setShowAddKontakModal(true);
                          }
                        }}
                        style={{ width: '22px', height: '22px', accentColor: '#0369a1' }}
                      />
                      <Truck size={18} color="#38bdf8" aria-hidden="true" /> Kirim antar ke rumah
                    </label>

                    {isDelivery && (
                      <div className="form-group" style={{ marginTop: '8px', marginBottom: 0 }}>
                        <label className="form-label" htmlFor="pilih-zona">Zona ongkir tujuan{selectedKontak?.zona_id && selectedKontak.zona_id === selectedZonaId ? ' (sesuai data pelanggan)' : ''}</label>
                        <select id="pilih-zona" value={selectedZonaId} onChange={(e) => setSelectedZonaId(e.target.value)} className="form-select">
                          {zonaList.map(z => (
                            <option key={z.id} value={z.id}>
                              {z.nama_zona} - {AppStore.formatRupiah(z.tarif_per_galon)}/unit
                            </option>
                          ))}
                        </select>
                        {selectedKontak && selectedKontak.id !== 'kt-1' && !selectedKontak.zona_id && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={simpanZonaKePelanggan} style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
                            Simpan zona ini ke data pelanggan
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Total */}
            <div style={{ marginTop: '14px', background: 'var(--inset-80)', padding: '14px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>Subtotal produk</span>
                <span>{AppStore.formatRupiah(subtotalProduk)}</span>
              </div>
              {isDelivery && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--c-amber)', marginTop: '4px' }}>
                  <span>Ongkir ({totalUnitOngkir} unit x {AppStore.formatRupiah(tarifOngkirPerUnit)})</span>
                  <span>+{AppStore.formatRupiah(totalOngkir)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-green)', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--glass-border)' }}>
                <span>TOTAL</span>
                <span>{AppStore.formatRupiah(totalAkhir)}</span>
              </div>
            </div>

            {/* Metode pembayaran: satu ketukan, tanpa dropdown */}
            <div style={{ marginTop: '14px' }}>
              <div className="form-label" id="label-metode" style={{ marginBottom: '6px' }}>Metode pembayaran</div>
              <div className="seg-grid" role="radiogroup" aria-labelledby="label-metode">
                {METODE_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={metodePembayaran === value}
                    className="seg-btn"
                    onClick={() => setMetodePembayaran(value)}
                  >
                    <Icon size={18} aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {metodePembayaran === 'tunai' && (
              <div className="form-group" style={{ marginTop: '14px', marginBottom: 0 }}>
                <label className="form-label" htmlFor="uang-diterima">Uang diterima</label>
                <input
                  id="uang-diterima"
                  type="number"
                  inputMode="numeric"
                  className="form-input"
                  value={jumlahBayarTunai || ''}
                  onChange={(e) => setJumlahBayarTunai(Number(e.target.value))}
                  placeholder="0"
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setJumlahBayarTunai(totalAkhir)}>Uang pas</button>
                  {[5000, 10000, 20000, 50000, 100000].map(n => (
                    <button key={n} type="button" className="btn btn-secondary btn-sm" onClick={() => setJumlahBayarTunai(n)}>
                      {n / 1000}rb
                    </button>
                  ))}
                </div>
                {jumlahBayarTunai > 0 && (
                  <div role="status" style={{ fontSize: '1rem', fontWeight: 700, marginTop: '8px', color: jumlahBayarTunai >= totalAkhir ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {jumlahBayarTunai >= totalAkhir
                      ? `Kembalian: ${AppStore.formatRupiah(kembalian)}`
                      : `Kurang: ${AppStore.formatRupiah(totalAkhir - jumlahBayarTunai)}`}
                  </div>
                )}
              </div>
            )}

            <button type="button" onClick={handleProcessOrder} className="btn btn-success btn-lg" style={{ width: '100%', marginTop: '16px' }}>
              <Check size={20} aria-hidden="true" /> Proses dan cetak struk
            </button>
            <button
              type="button"
              onClick={() => { clearCart(); setShowCheckout(false); setShowOpsi(false); }}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '8px' }}
            >
              Kosongkan keranjang
            </button>
          </div>
        </div>
      )}

      {/* MENU LAINNYA: tugas yang jarang dipakai */}
      {showMenuLainnya && (
        <div className="sheet-overlay" onClick={() => setShowMenuLainnya(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-lainnya" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 id="judul-lainnya" className="sheet-title">Menu Lainnya</h2>
              <button type="button" className="icon-btn" aria-label="Tutup menu lainnya" onClick={() => setShowMenuLainnya(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { Icon: Truck, title: 'Setoran kurir', desc: uangDiKurir > 0 ? ('Uang di kurir saat ini ' + AppStore.formatRupiah(uangDiKurir)) : 'Terima uang tunai dari kurir', action: () => { if (needsShift) { setShowBukaShiftModal(true); } else { setShowSetoranKurir(true); } } },
                { Icon: HandCoins, title: 'Serahkan uang ke owner', desc: 'Setor uang laci kapan saja, tidak harus saat tutup shift', action: () => { if (needsShift) { setShowBukaShiftModal(true); } else { setShowSerahOwner(true); } } },
                { Icon: CreditCard, title: 'Bayar utang pelanggan', desc: 'Catat pelunasan utang pelanggan', action: () => openBayarHutangModal() },
                { Icon: TrendingDown, title: 'Catat pengeluaran kas', desc: 'Bensin, gaji, beli air baku, dan lainnya', action: () => setShowAddPengeluaranModal(true) },
                { Icon: FileText, title: 'Catat hutang toko', desc: 'Utang toko ke karyawan atau pihak ketiga', action: () => setShowAddHutangTokoModal(true) },
                { Icon: UserPlus, title: 'Tambah pelanggan baru', desc: 'Daftarkan pelanggan atau reseller', action: () => setShowAddKontakModal(true) },
              ].map(({ Icon, title, desc, action }) => (
                <button
                  key={title}
                  type="button"
                  onClick={openFromMenu(action)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', minHeight: '60px',
                    padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                    background: 'var(--w-5)', color: 'inherit', cursor: 'pointer'
                  }}
                >
                  <Icon size={22} color="#38bdf8" aria-hidden="true" />
                  <span>
                    <span style={{ display: 'block', fontWeight: 700 }}>{title}</span>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANTARAN DAN PERINGATAN: satu tempat untuk semua notifikasi */}
      {showAlertPanel && (
        <div className="sheet-overlay" onClick={() => setShowAlertPanel(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-antaran" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 id="judul-antaran" className="sheet-title">Antaran dan Peringatan</h2>
              <button type="button" className="icon-btn" aria-label="Tutup antaran dan peringatan" onClick={() => setShowAlertPanel(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {isWaterStockCriticalCalc && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--c-red-strong)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: 'var(--text-strong)' }}>
                  <AlertTriangle size={20} color="#f87171" aria-hidden="true" /> Stok air baku menipis
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--c-red-soft)', margin: '4px 0 10px' }}>
                  Sisa {currentStokAirBakuCalc.toLocaleString('id-ID')} L (batas minimum {minStokAirBakuCalc.toLocaleString('id-ID')} L). Segera pesan tangki air baku.
                  {isWaterAlarmMuted && ' Suara dimatikan.'}
                  {isWaterAlarmSnoozed && ` Suara ditunda ${Math.max(1, Math.ceil((waterAlarmSnoozedUntil - nowTick) / (1000 * 60)))} menit.`}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => { setKategoriPengeluaran('pembelian_air_baku'); setShowAlertPanel(false); setShowAddPengeluaranModal(true); }}
                  >
                    <Truck size={16} aria-hidden="true" /> Catat pembelian air baku
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setWaterAlarmSnoozedUntil(Date.now() + (pengaturan.durasi_snooze_menit || 15) * 60 * 1000); setIsWaterAlarmMuted(false); }}
                  >
                    <Clock size={16} aria-hidden="true" /> Tunda suara
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsWaterAlarmMuted(!isWaterAlarmMuted)}>
                    {isWaterAlarmMuted ? <Volume2 size={16} aria-hidden="true" /> : <BellOff size={16} aria-hidden="true" />}
                    {isWaterAlarmMuted ? 'Nyalakan suara' : 'Matikan suara'}
                  </button>
                </div>
              </div>
            )}

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="#fbbf24" aria-hidden="true" /> Antaran belum terkirim ({pendingDelivery.length})
            </h3>

            {delayedPending.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--c-red-soft)', marginBottom: '8px' }}>
                  {delayedPending.length} pesanan terlambat (lebih dari {formatThresholdText(thresholdMins)}).
                  {hasActiveAlarm ? ' Alarm sedang berbunyi.' : ' Alarm sedang diam.'}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleSnoozeAll}>
                    <Clock size={16} aria-hidden="true" /> Tunda semua ({snoozeMins} menit)
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleMuteAll}>
                    <BellOff size={16} aria-hidden="true" /> Matikan semua alarm
                  </button>
                </div>
              </div>
            )}

            {pendingDelivery.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', background: 'var(--inset-50)', borderRadius: '12px', color: 'var(--c-green)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Check size={20} aria-hidden="true" /> Semua antaran sudah terkirim
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingDelivery.map(psn => {
                  const durInfo = calculateOrderDuration(psn.created_at, psn.terkirim_at, psn.status_pesanan, thresholdMins);
                  const isMuted = isOrderMuted(psn.id);
                  const isSnoozed = isOrderSnoozed(psn.id);
                  const remainingSnoozeMins = getSnoozeRemainingMinutes(psn.id);

                  return (
                    <div key={psn.id} style={{
                      padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                      borderLeft: durInfo.isTerlambat ? '4px solid var(--c-red-strong)' : '4px solid var(--c-amber)',
                      background: durInfo.isTerlambat ? 'rgba(239, 68, 68, 0.08)' : 'var(--inset-50)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <strong>{psn.nama_pelanggan}</strong>
                        <span className="badge badge-warning">{psn.status_pesanan.replace('_', ' ')}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{psn.no_nota} - order {durInfo.jamOrder}</div>
                      <div style={{ fontSize: '0.9rem', marginTop: '6px', color: 'var(--text-2)' }}>{formatProdukRingkas(psn.items)}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ color: 'var(--c-green)' }}>{AppStore.formatRupiah(psn.total_akhir)}</strong>
                        <span style={{ fontWeight: 700, color: durInfo.isTerlambat ? 'var(--c-red)' : 'var(--c-sky)' }}>
                          <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} aria-hidden="true" />
                          Menunggu {durInfo.formattedDurasi}{durInfo.isTerlambat ? ' - TERLAMBAT' : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                        <button type="button" className="btn btn-success btn-sm" style={{ flex: '1 1 130px' }} onClick={() => handleKonfirmasiTerkirim(psn.id)}>
                          <Check size={16} aria-hidden="true" /> Sudah terkirim
                        </button>
                        {durInfo.isTerlambat && (isSnoozed ? (
                          <span className="badge badge-warning">Ditunda {remainingSnoozeMins} menit</span>
                        ) : (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleSnoozeJob(psn.id)}>
                            <Clock size={16} aria-hidden="true" /> Tunda
                          </button>
                        ))}
                        {durInfo.isTerlambat && (isMuted ? (
                          <span className="badge badge-secondary">Alarm dimatikan</span>
                        ) : (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleMuteJob(psn.id)}>
                            <BellOff size={16} aria-hidden="true" /> Matikan alarm
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Form Entry Pembayaran / Pelunasan Utang */}
      {showBayarHutangModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '520px', padding: '24px', background: 'var(--surface-solid)',
            border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={22} color="#f59e0b" /> Entry Pembayaran Utang Pelanggan
              </h3>
              <button aria-label="Tutup" type="button" onClick={() => setShowBayarHutangModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
                      {k.nama} ({k.tipe.toUpperCase()}) { (k.hutang_saat_ini || 0) > 0 ? `Utang: ${AppStore.formatRupiah(k.hutang_saat_ini || 0)}` : 'Lunas (0)' }
                    </option>
                  ))}
                </select>
              </div>

              {/* Debt Info Badge */}
              {(() => {
                const k = kontakList.find(item => item.id === selectedHutangKontakId);
                const hutang = k?.hutang_saat_ini || 0;
                return (
                  <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>Sisa Utang Saat Ini:</span>
                      <strong style={{ fontSize: '1.05rem', color: hutang > 0 ? 'var(--c-red-strong)' : 'var(--c-green)' }}>{AppStore.formatRupiah(hutang)}</strong>
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
                  <option value="tunai">Tunai</option>
                  <option value="qris">QRIS Depo</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="edc">EDC Kartu Debit</option>
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
                    <span style={{ fontSize: '0.8rem', color: 'var(--c-green)', display: 'block', marginTop: '4px', fontWeight: 700 }}>
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '480px', padding: '26px', background: 'var(--surface-solid)',
            border: '2px solid var(--c-red-strong)', boxShadow: '0 0 35px rgba(239, 68, 68, 0.4)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px'
              }}>
                <AlertTriangle size={32} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Peringatan: Ada Tunggakan Utang!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Pelanggan ini masih memiliki sisa hutang dari transaksi sebelumnya.
              </p>
            </div>

            {/* Customer & Debt Box */}
            <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nama Pelanggan:</span>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{notifKontak.nama}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status / Tipe:</span>
                <span className="badge badge-primary">{notifKontak.tipe.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed var(--glass-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>Total Utang Belum Lunas:</span>
                <strong style={{ color: 'var(--c-red-strong)', fontSize: '1.15rem' }}>{AppStore.formatRupiah(notifKontak.hutang_saat_ini || 0)}</strong>
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
                Bayar / Lunasi Utang Dulu
              </button>
              <button 
                type="button" 
                onClick={() => setShowHutangNotifModal(false)} 
                className="btn btn-secondary" 
                style={{ width: '100%' }}
              >
                Lanjutkan Transaksi Pembelian Baru
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '500px', padding: '26px', background: 'var(--surface-solid)',
            border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={22} color="#0284c7" /> Tambah Kontak Pelanggan / Reseller
              </h3>
              <button aria-label="Tutup" type="button" onClick={() => setShowAddKontakModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
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

              <ZonaSelect value={newZonaId} onChange={setNewZonaId} id="zona-pelanggan-baru" wajib />

              <div className="form-group">
                <label className="form-label">Limit Maksimum Hutang (Rp)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={newLimitHutang}
                  min="0"
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '520px', padding: '26px', background: 'var(--surface-solid)',
            border: '2px solid var(--c-red-strong)', boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingDown size={22} color="#f87171" /> Entry Pengeluaran Kasir (Lain-Lain)
              </h3>
              <button aria-label="Tutup" type="button" onClick={() => setShowAddPengeluaranModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Warning Info */}
            <div style={{
              background: kategoriPengeluaran === 'pengembalian_kasbon' 
                ? 'rgba(16, 185, 129, 0.15)' 
                : 'rgba(239, 68, 68, 0.12)', 
              border: kategoriPengeluaran === 'pengembalian_kasbon'
                ? '1px solid var(--c-green)'
                : '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.82rem',
              color: kategoriPengeluaran === 'pengembalian_kasbon' ? 'var(--c-green)' : 'var(--c-red-soft)'
            }}>
              {kategoriPengeluaran === 'pengembalian_kasbon' ? (
                <><strong>KAS MASUK (+):</strong> Uang pengembalian kasbon diterima dari karyawan dan masuk ke laci kasir (<strong>Menambah Saldo Kas Setoran</strong>).</>
              ) : (
                <>ℹ<strong>KAS KELUAR (-):</strong> Transaksi ini akan mengurangkan total <strong>Saldo Kas Fisik Kasir</strong> yang wajib disetor ke Owner.</>
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
                  <option value="operasional">Operasional Depo / Toko</option>
                  <option value="pembelian_air_baku">Pembelian Air Baku (Truk Tangki)</option>
                  <option value="ongkir">Ongkir / Transportasi Delivery</option>
                  <option value="gaji">Pembayaran Gaji Karyawan</option>
                  <option value="kasbon">Pemberian Kasbon Karyawan</option>
                  <option value="pengembalian_kasbon">Pengembalian / Pelunasan Kasbon Karyawan</option>
                  <option value="bensin">Bensin &amp; BBM Operasional</option>
                  <option value="konsumsi">Konsumsi / Uang Makan</option>
                  <option value="lain_lain">Pengeluaran Lain-Lain</option>
                </select>
              </div>

              {/* Seksi Khusus Detail Pembelian Air Baku Truk Tangki */}
              {kategoriPengeluaran === 'pembelian_air_baku' && (
                <div style={{
                  background: 'rgba(2, 132, 199, 0.15)', border: '1px solid var(--c-sky)',
                  borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--c-sky)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Rincian Pasokan Air Baku Truk Tangki
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>
                      Nama Vendor / Sopir Pengirim <span style={{ color: 'var(--c-red-strong)' }}>*</span>
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
                        Volume Air Masuk (Liter) <span style={{ color: 'var(--c-red-strong)' }}>*</span>
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
                        Harga Perolehan Air (Rp) <span style={{ color: 'var(--c-red-strong)' }}>*</span>
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
                        Meteran Waktu Diisi (Liter) <span style={{ color: 'var(--c-red-strong)' }}>*</span>
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

                  <div style={{ background: 'var(--inset-80)', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--w-10)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Nominal Kas Keluar:</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--c-green)' }}>
                      {AppStore.formatRupiah(Number(hargaPerolehanAir) + Number(tipsSopirAir))}
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--c-sky)' }}>
                    Stok Air Baku di Tangki Depo akan otomatis bertambah <strong>+{volumeAirBaku} Liter</strong> &amp; Posisi Meteran Air diperbarui ke <strong>{meteranWaktuDiisi.toLocaleString('id-ID')} Liter</strong> setelah disimpan.
                  </span>
                </div>
              )}

              {/* Dropdown Karyawan / Staf / Penerima Selection */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Pilih Nama Karyawan / Staf / Penerima {['gaji', 'kasbon', 'pengembalian_kasbon', 'ongkir'].includes(kategoriPengeluaran) && <span style={{ color: 'var(--c-red-strong)' }}>*</span>}
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowAddPenerimaInput(!showAddPenerimaInput)}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', color: 'var(--c-sky)', borderColor: 'rgba(56, 189, 248, 0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={13} /> {showAddPenerimaInput ? 'Tutup Form' : '+ Penerima Baru'}
                  </button>
                </div>

                {/* Form Inline Tambah Penerima Baru */}
                {showAddPenerimaInput && (
                  <div style={{ background: 'rgba(2, 132, 199, 0.12)', padding: '12px', borderRadius: '10px', border: '1px solid var(--c-primary)', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-sky)' }}>Tambah Nama Penerima Baru / Vendor / Pihak Ketiga</span>
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
                      {k.nama} ({k.jabatan})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Isian Peruntukan / Keperluan <span style={{ color: 'var(--c-red-strong)' }}>*</span>
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
                  Nominal Transaksi (Rp) <span style={{ color: 'var(--c-red-strong)' }}>*</span>
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10003, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '530px', padding: '26px', background: 'var(--surface-solid)',
            border: '2px solid var(--c-amber)', boxShadow: '0 25px 50px -12px rgba(251, 191, 36, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={22} color="#fbbf24" /> Entry Catatan Hutang Toko / Pinjaman
              </h3>
              <button aria-label="Tutup" type="button" onClick={() => setShowAddHutangTokoModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Info Banner */}
            <div style={{
              background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.82rem', color: 'var(--c-yellow-soft)'
            }}>
              <strong>Catatan Kewajiban Toko:</strong> Pencatatan hutang toko (pinjaman/talangan dari Karyawan atau Orang Ketiga/Vendor) yang wajib dilunasi oleh Depo.
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
                    Karyawan / Staf Depo
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
                    Orang Ketiga / Vendor
                  </button>
                </div>
              </div>

              {/* Input for Karyawan vs Orang Ketiga */}
              {tipePihakHutang === 'karyawan' ? (
                <div className="form-group">
                  <label className="form-label">
                    Pilih Nama Karyawan Pemberi Pinjaman / Talangan <span style={{ color: 'var(--c-red-strong)' }}>*</span>
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
                        {k.nama} ({k.jabatan})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">
                    Isikan Nama Orang Ketiga / Perusahaan / Vendor <span style={{ color: 'var(--c-red-strong)' }}>*</span>
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
                  Isian Peruntukan / Keperluan Hutang Toko <span style={{ color: 'var(--c-red-strong)' }}>*</span>
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
                  Nominal Hutang Toko (Rp) <span style={{ color: 'var(--c-red-strong)' }}>*</span>
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
