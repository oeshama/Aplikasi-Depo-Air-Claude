import {
  UserApp, Produk, ZoneOngkir, Kontak, Pesanan, TitipGalon,
  PengaturanDepo, ShiftKasir, UserRole, Pengeluaran, HutangToko, SumberKas,
  SetoranKurir, SetoranOwner, UangPegangan, PesananMasuk, Etalase, TautanPesan, PesananItem, FotoMeter, ModeFotoMeter, Rekening, MutasiKeuangan, JenisMutasi, NotifikasiOwner, SaldoKurir, MetodePembayaran
} from './types';
import { normalisasiHp, hpLokal } from './telepon';
import { 
  DEMO_USERS, INITIAL_PRODUK, INITIAL_ZONA, INITIAL_KONTAK, 
  INITIAL_PESANAN, INITIAL_PENGATURAN 
} from './mockData';
import { recordLocalChange } from './sync';

// Helper to interact with LocalStorage for offline-first speed
export class AppStore {
  // Simpan ke cache lokal lalu antrekan perubahan untuk dikirim ke Supabase
  private static persist(key: string, value: unknown) {
    const oldRaw = localStorage.getItem(key);
    localStorage.setItem(key, JSON.stringify(value));
    recordLocalChange(key, oldRaw, value);
  }

  static getPengaturan(): PengaturanDepo {
    if (typeof window === 'undefined') return INITIAL_PENGATURAN;
    const stored = localStorage.getItem('depo_pengaturan');
    return stored ? JSON.parse(stored) : INITIAL_PENGATURAN;
  }

  static savePengaturan(data: PengaturanDepo) {
    this.persist('depo_pengaturan', data);

    if (data.nama_owner && typeof window !== 'undefined') {
      const users = this.getUsers();
      const ownerIdx = users.findIndex(u => u.role === 'owner');
      if (ownerIdx !== -1) {
        users[ownerIdx].nama = data.nama_owner;
        this.saveUsers(users);
      }

      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.role === 'owner') {
        currentUser.nama = data.nama_owner;
        this.setCurrentUser(currentUser);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_pengaturan_updated'));
      this.perbaruiEtalase();
    }
  }

  static saveUsers(users: UserApp[]) {
    localStorage.setItem('depo_users', JSON.stringify(users));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_user_updated'));
    }
  }

  static getProduk(): Produk[] {
    if (typeof window === 'undefined') return INITIAL_PRODUK;
    const stored = localStorage.getItem('depo_produk');
    return stored ? JSON.parse(stored) : INITIAL_PRODUK;
  }

  static saveProduk(data: Produk[]) {
    this.persist('depo_produk', data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_produk_updated'));
      this.perbaruiEtalase();
    }
  }

  static getZona(): ZoneOngkir[] {
    if (typeof window === 'undefined') return INITIAL_ZONA;
    const stored = localStorage.getItem('depo_zona');
    return stored ? JSON.parse(stored) : INITIAL_ZONA;
  }

  static saveZona(data: ZoneOngkir[]) {
    this.persist('depo_zona', data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_zona_updated'));
    }
  }

  static getKontak(): Kontak[] {
    if (typeof window === 'undefined') return INITIAL_KONTAK;
    const stored = localStorage.getItem('depo_kontak');
    return stored ? JSON.parse(stored) : INITIAL_KONTAK;
  }

  static saveKontak(data: Kontak[]) {
    this.persist('depo_kontak', data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_kontak_updated'));
      this.sinkronTautan();
    }
  }

  static bayarHutangPelanggan(kontakId: string, jumlahBayar: number, metode: any, catatan?: string): Pesanan {
    const kontakList = this.getKontak();
    const idx = kontakList.findIndex(k => k.id === kontakId);
    if (idx === -1) {
      throw new Error('Pelanggan tidak ditemukan!');
    }

    const hutangAwal = kontakList[idx].hutang_saat_ini || 0;
    const sisaHutangBaru = Math.max(0, hutangAwal - jumlahBayar);
    kontakList[idx].hutang_saat_ini = sisaHutangBaru;
    this.saveKontak(kontakList);

    const currentUser = this.getCurrentUser();
    const newNotaNo = `PAY-HTG-${this.tanggalHariIni().replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;

    const newPesanan: Pesanan = {
      id: `psn-pay-${Date.now()}`,
      no_nota: newNotaNo,
      kontak_id: kontakId,
      nama_pelanggan: kontakList[idx].nama,
      tipe_transaksi: 'pelunasan_hutang',
      items: [{
        id: `item-pay-${Date.now()}`,
        produk_id: 'prod-pay',
        nama_produk: `Pelunasan Utang (Sisa: ${this.formatRupiah(sisaHutangBaru)})`,
        jumlah: 1,
        harga_satuan: jumlahBayar,
        subtotal: jumlahBayar,
        dihitung_ongkir: false
      }],
      subtotal_produk: jumlahBayar,
      tarif_ongkir_per_unit: 0,
      total_unit_ongkir: 0,
      total_ongkir: 0,
      diskon: 0,
      total_akhir: jumlahBayar,
      status_pesanan: 'selesai',
      status_pembayaran: 'lunas',
      pembayaran_details: [{ metode: metode, jumlah: jumlahBayar }],
      total_dibayar: jumlahBayar,
      sisa_hutang: sisaHutangBaru,
      kasir_id: currentUser.id,
      catatan: catatan || `Pelunasan hutang oleh ${kontakList[idx].nama}`,
      created_at: new Date().toISOString()
    };

    this.addPesanan(newPesanan);
    return newPesanan;
  }

  static getPesanan(): Pesanan[] {
    if (typeof window === 'undefined') return INITIAL_PESANAN;
    const stored = localStorage.getItem('depo_pesanan');
    if (stored === null) {
      localStorage.setItem('depo_pesanan', JSON.stringify(INITIAL_PESANAN));
      return INITIAL_PESANAN;
    }
    return JSON.parse(stored);
  }

  static savePesanan(data: Pesanan[]) {
    this.persist('depo_pesanan', data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_pesanan_updated'));
      this.sinkronStatusPesananMasuk();
      this.sinkronTautan();
    }
  }

  static addPesanan(pesanan: Pesanan) {
    const list = this.getPesanan();
    list.unshift(pesanan);
    this.savePesanan(list);
  }

  static updatePesananStatus(id: string, status: Pesanan['status_pesanan'], statusBayar?: Pesanan['status_pembayaran']) {
    const list = this.getPesanan();
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      list[idx].status_pesanan = status;
      // Pesanan hutang tetap berstatus hutang sampai dilunasi lewat menu Bayar Hutang
      if (statusBayar && list[idx].status_pembayaran !== 'hutang') list[idx].status_pembayaran = statusBayar;
      if (status === 'terkirim' || status === 'selesai') {
        if (!list[idx].terkirim_at) {
          list[idx].terkirim_at = new Date().toISOString();
        }
      } else {
        delete list[idx].terkirim_at;
      }
      this.savePesanan(list);
    }
  }

  // ---------------------------------------------------------------------
  // Uang antar (kurir) dan kas laci
  //
  // Pesanan antar bayar tunai: uangnya diterima KURIR dulu (bukan langsung masuk laci).
  // Uang baru masuk laci saat kasir mencatat SETORAN dari kurir, kapan saja dan berapa saja.
  //   saldo kurir = tunai yang diterima kurir - total setoran yang sudah diterima kasir
  // ---------------------------------------------------------------------

  // Tunai yang langsung masuk laci dari satu pesanan (pesanan antar tunai tidak dihitung: lewat kurir)
  static tunaiLangsung(p: Pesanan): number {
    if (!p || p.bayar_ke_kurir) return 0;
    const adaTunai = Array.isArray(p.pembayaran_details) && p.pembayaran_details.some(d => d && d.metode === 'tunai');
    return adaTunai ? (p.total_akhir || 0) : 0;
  }

  static totalTunaiLangsung(list: Pesanan[]): number {
    return (list || []).reduce((acc, p) => acc + this.tunaiLangsung(p), 0);
  }

  static getSetoranKurir(): SetoranKurir[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_setoran_kurir');
    return stored ? JSON.parse(stored) : [];
  }

  static saveSetoranKurir(data: SetoranKurir[]) {
    this.persist('depo_setoran_kurir', data);
    window.dispatchEvent(new Event('depo_setoran_kurir_updated'));
  }

  // Total setoran kurir yang diterima kasir sejak waktu tertentu (setoran yang dibatalkan tidak dihitung)
  static totalSetoranSejak(sinceMs: number): number {
    return this.getSetoranKurir()
      .filter(s => !s.dibatalkan && new Date(s.tanggal).getTime() >= sinceMs)
      .reduce((acc, s) => acc + (s.nominal || 0), 0);
  }

  static getSetoranOwner(): SetoranOwner[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_setoran_owner');
    return stored ? JSON.parse(stored) : [];
  }

  static saveSetoranOwner(data: SetoranOwner[]) {
    this.persist('depo_setoran_owner', data);
    window.dispatchEvent(new Event('depo_setoran_owner_updated'));
  }

  // Hitungan kas laci kasir di satu rentang waktu (satu-satunya rumus; dipakai semua halaman).
  // Hanya pengeluaran bersumber laci yang mengurangi laci; uang yang diserahkan/diambil owner juga keluar dari laci.
  static hitungKasLaci(saldoAwal: number, sinceMs: number, untilMs: number = Infinity) {
    const dalam = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= sinceMs && t <= untilMs;
    };
    const pesanan = this.getPesanan().filter(p => p && dalam(p.created_at));
    const tunaiLangsung = this.totalTunaiLangsung(pesanan);
    const setoranKurir = this.getSetoranKurir()
      .filter(s => !s.dibatalkan && dalam(s.tanggal))
      .reduce((acc, s) => acc + (s.nominal || 0), 0);
    const pengeluaranLaci = this.getPengeluaran().filter(p => dalam(p.tanggal) && (!p.sumber_kas || p.sumber_kas === 'laci'));
    const adaMasuk = (p: Pengeluaran) => p.tipe_arus_kas === 'masuk' || p.kategori === 'pengembalian_kasbon';
    const kasbonKembali = pengeluaranLaci.filter(adaMasuk).reduce((acc, p) => acc + (p.nominal || 0), 0);
    const keluar = pengeluaranLaci.filter(p => !adaMasuk(p)).reduce((acc, p) => acc + (p.nominal || 0), 0);
    const diserahkanOwner = this.getSetoranOwner()
      .filter(s => s.status !== 'dibatalkan' && !s.saat_tutup && dalam(s.waktu))
      .reduce((acc, s) => acc + (s.nominal || 0), 0);
    return {
      saldoAwal,
      tunaiLangsung,
      setoranKurir,
      tunaiMasuk: tunaiLangsung + setoranKurir,
      kasbonKembali,
      keluar,
      diserahkanOwner,
      ekspektasi: saldoAwal + tunaiLangsung + setoranKurir + kasbonKembali - keluar - diserahkanOwner
    };
  }

  // Kas laci shift yang sedang berjalan (null jika tidak ada shift aktif)
  static getKasLaciAktif(): ReturnType<typeof AppStore.hitungKasLaci> | null {
    const shift = this.getShiftAktif();
    return shift ? this.hitungKasLaci(shift.saldo_awal, new Date(shift.waktu_buka).getTime()) : null;
  }

  // Sisa uang di laci saat shift terakhir ditutup (petunjuk untuk modal awal shift berikutnya)
  static getSisaLaciShiftTerakhir(): number {
    const terakhir = this.getShiftList().find(s => s.status === 'tutup');
    if (!terakhir) return 0;
    if (terakhir.sisa_laci_saat_tutup !== undefined) return terakhir.sisa_laci_saat_tutup;
    return terakhir.saldo_akhir_aktual || 0;
  }

  // Kasir menyerahkan uang dari laci ke owner (owner menerima dan memeriksa jumlahnya belakangan)
  static serahkanKeOwner(nominal: number, catatan?: string): SetoranOwner {
    const shift = this.getShiftAktif();
    if (!shift) throw new Error('Belum ada shift yang dibuka.');
    const jumlah = Math.round(nominal);
    if (!(jumlah > 0)) throw new Error('Nominal harus lebih besar dari Rp 0!');
    const laci = this.getKasLaciAktif();
    if (laci && jumlah > laci.ekspektasi) {
      throw new Error(`Uang di laci hanya ${this.formatRupiah(laci.ekspektasi)}, tidak cukup untuk menyerahkan ${this.formatRupiah(jumlah)}.`);
    }
    const user = this.getCurrentUser();
    const s: SetoranOwner = {
      id: `sto-${Date.now()}`,
      waktu: new Date().toISOString(),
      jenis: 'serah_kasir',
      kasir_id: shift.kasir_id,
      kasir_nama: shift.kasir_nama || user.nama,
      shift_id: shift.id,
      nominal: jumlah,
      status: 'menunggu',
      catatan: catatan?.trim() || undefined
    };
    const list = this.getSetoranOwner();
    list.unshift(s);
    this.saveSetoranOwner(list);
    this.addNotifikasi({
      jenis: 'setoran_owner',
      judul: 'Setoran kasir menunggu diterima',
      pesan: `${s.kasir_nama} menyerahkan ${this.formatRupiah(jumlah)} dari laci. Buka Keuangan Owner untuk menerimanya.`,
      dibuat_oleh: user.nama
    });
    return s;
  }

  // Owner mengambil uang langsung dari laci (langsung sah, tanpa menunggu kasir)
  static ambilDariLaciOlehOwner(nominal: number, catatan?: string): SetoranOwner {
    const shift = this.getShiftAktif();
    if (!shift) throw new Error('Belum ada shift yang dibuka, jadi tidak ada laci yang bisa diambil.');
    const jumlah = Math.round(nominal);
    if (!(jumlah > 0)) throw new Error('Nominal harus lebih besar dari Rp 0!');
    const laci = this.getKasLaciAktif();
    if (laci && jumlah > laci.ekspektasi) {
      throw new Error(`Uang di laci hanya ${this.formatRupiah(laci.ekspektasi)}, tidak cukup untuk mengambil ${this.formatRupiah(jumlah)}.`);
    }
    const user = this.getCurrentUser();
    const s: SetoranOwner = {
      id: `sto-${Date.now()}`,
      waktu: new Date().toISOString(),
      jenis: 'ambil_owner',
      kasir_id: shift.kasir_id,
      kasir_nama: shift.kasir_nama || '',
      shift_id: shift.id,
      nominal: jumlah,
      status: 'diterima',
      nominal_diterima: jumlah,
      selisih: 0,
      diterima_oleh: user.nama,
      diterima_at: new Date().toISOString(),
      catatan: catatan?.trim() || undefined
    };
    const list = this.getSetoranOwner();
    list.unshift(s);
    this.saveSetoranOwner(list);
    return s;
  }

  // Owner menerima setoran kasir dan mengisi uang yang benar-benar diterima; kurangnya tercatat sebagai selisih kasir
  static terimaSetoranOwner(id: string, nominalDiterima: number): SetoranOwner {
    const list = this.getSetoranOwner();
    const s = list.find(x => x.id === id);
    if (!s) throw new Error('Data setoran tidak ditemukan!');
    if (s.status !== 'menunggu') throw new Error('Setoran ini sudah diproses.');
    const diterima = Math.round(nominalDiterima);
    if (!(diterima >= 0)) throw new Error('Nominal diterima tidak valid.');
    const user = this.getCurrentUser();
    s.status = 'diterima';
    s.nominal_diterima = diterima;
    s.selisih = diterima - s.nominal;
    s.diterima_oleh = user.nama;
    s.diterima_at = new Date().toISOString();
    this.saveSetoranOwner(list);
    return s;
  }

  // Setoran yang masih menunggu boleh dibatalkan (mis. salah ketik): uangnya kembali ke hitungan laci
  static batalkanSetoranOwner(id: string): SetoranOwner {
    const list = this.getSetoranOwner();
    const s = list.find(x => x.id === id);
    if (!s) throw new Error('Data setoran tidak ditemukan!');
    if (s.status !== 'menunggu') throw new Error('Hanya setoran yang masih menunggu yang bisa dibatalkan.');
    s.status = 'dibatalkan';
    this.saveSetoranOwner(list);
    return s;
  }

  // ===== Pesanan online dari halaman publik /pesan =====

  static getPesananMasuk(): PesananMasuk[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_pesanan_masuk');
    return stored ? JSON.parse(stored) : [];
  }

  static savePesananMasuk(data: PesananMasuk[]) {
    this.persist('depo_pesanan_masuk', data);
    window.dispatchEvent(new Event('depo_pesanan_masuk_updated'));
  }

  static jumlahPesananMasukBaru(): number {
    return this.getPesananMasuk().filter(p => p.status === 'baru').length;
  }

  static getEtalase(): Etalase | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('depo_etalase');
    return stored ? JSON.parse(stored) : null;
  }

  // Ringkasan toko untuk halaman publik. Hanya perangkat owner/admin yang menulis, dan hanya kalau isinya berubah.
  static perbaruiEtalase() {
    if (typeof window === 'undefined') return;
    const role = this.getCurrentUser().role;
    if (role !== 'owner' && role !== 'admin') return;
    const p = this.getPengaturan();
    const wa = normalisasiHp(p.wa_business || '');
    const baru: Etalase = {
      aktif: !!p.pesan_online_aktif && !!wa,
      nama: ((p.header_struk || '').split('\n').map(s => s.trim()).find(Boolean)) || p.nama_depo || 'Depo Air',
      wa: wa || '',
      produk: this.getProduk().filter(x => x && x.aktif).map(x => ({ id: x.id, nama: x.nama_produk, volume_liter: x.volume_liter, harga: x.harga_tempat }))
    };
    if (JSON.stringify(baru) === JSON.stringify(this.getEtalase())) return;
    this.persist('depo_etalase', baru);
    window.dispatchEvent(new Event('depo_etalase_updated'));
  }

  static cariKontakByHp(hp: string): Kontak | undefined {
    return this.getKontak().find(k => k.id !== 'kt-1' && normalisasiHp(k.no_hp || '') === hp);
  }

  // Saran estimasi antar (menit) dari rata-rata pesanan antar terakhir yang sudah terkirim
  static saranEstimasiMenit(): number {
    const lama = this.getPesanan()
      .filter(p => p && p.zone_ongkir_id && p.terkirim_at)
      .slice(0, 30)
      .map(p => (new Date(p.terkirim_at as string).getTime() - new Date(p.created_at).getTime()) / 60000)
      .filter(m => m >= 5 && m <= 360);
    if (lama.length < 3) return 45;
    const rata = lama.reduce((a, b) => a + b, 0) / lama.length;
    return Math.min(120, Math.max(20, Math.round(rata / 5) * 5));
  }

  // Rincian harga pesanan online: harga khusus pelanggan bila ada, selain itu harga umum; ongkir sesuai zona
  static hitungPesananMasuk(pm: PesananMasuk, kontak?: Kontak, zonaId?: string) {
    const produk = this.getProduk();
    const items: PesananItem[] = pm.items.map(it => {
      const prod = produk.find(x => x.id === it.produk_id);
      const hk = kontak?.harga_khusus?.[it.produk_id];
      const harga = prod ? (typeof hk === 'number' && hk > 0 ? hk : prod.harga_tempat) : 0;
      return {
        id: `item-${it.produk_id}`, produk_id: it.produk_id, nama_produk: prod?.nama_produk || it.nama_produk, jumlah: it.jumlah,
        harga_satuan: harga, subtotal: harga * it.jumlah, dihitung_ongkir: !!prod?.kena_ongkir,
        harga_khusus: prod && typeof hk === 'number' && hk > 0 && hk !== prod.harga_tempat ? true : undefined
      };
    });
    const zona = this.getZona().find(z => z.id === zonaId);
    const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
    const unit = items.filter(i => i.dihitung_ongkir).reduce((a, i) => a + i.jumlah, 0);
    const tarif = zona ? zona.tarif_per_galon : 0;
    return { items, subtotal, unitOngkir: unit, tarif, ongkir: unit * tarif, total: subtotal + unit * tarif };
  }

  // Kasir mengonfirmasi pesanan online: pelanggan dicocokkan/dibuat, lalu dibuatkan pesanan antar biasa
  // (uang diterima kurir, cara bayar dicatat kurir saat sampai).
  static konfirmasiPesananMasuk(id: string, opsi: { zonaId: string; estimasiMenit: number }): { pesanan: Pesanan; kontak: Kontak; pm: PesananMasuk } {
    const daftar = this.getPesananMasuk();
    const pm = daftar.find(x => x.id === id);
    if (!pm) throw new Error('Pesanan masuk tidak ditemukan!');
    if (pm.status !== 'baru') throw new Error('Pesanan ini sudah diproses.');
    if (!opsi.zonaId) throw new Error('Pilih zona ongkir dulu.');
    if (!(opsi.estimasiMenit > 0)) throw new Error('Isi estimasi waktu tiba.');

    const kontakList = this.getKontak();
    let kontak = kontakList.find(k => k.id !== 'kt-1' && normalisasiHp(k.no_hp || '') === pm.no_hp);
    if (!kontak) {
      kontak = {
        id: `kt-${Date.now()}`, nama: pm.nama, tipe: 'pelanggan', no_hp: hpLokal(pm.no_hp), alamat: pm.alamat,
        lat: pm.lat, lng: pm.lng, zona_id: opsi.zonaId, aktif: true, limit_hutang: 0, hutang_saat_ini: 0, galon_dipinjam: 0
      };
      kontakList.push(kontak);
    } else {
      const k = kontak;
      if (!k.zona_id) k.zona_id = opsi.zonaId;
      if (k.lat == null && pm.lat != null) { k.lat = pm.lat; k.lng = pm.lng; }
      if (!k.alamat) k.alamat = pm.alamat;
    }
    this.saveKontak(kontakList);

    const h = this.hitungPesananMasuk(pm, kontak, opsi.zonaId);
    const user = this.getCurrentUser();
    const sekarang = new Date();
    const tgl = `${sekarang.getFullYear()}${String(sekarang.getMonth() + 1).padStart(2, '0')}${String(sekarang.getDate()).padStart(2, '0')}`;
    const adaNota = new Set(this.getPesanan().map(p => p.no_nota));
    let nota = '';
    do { nota = `INV-${tgl}-${Math.floor(100 + Math.random() * 900)}`; } while (adaNota.has(nota));

    const catatan = [
      `Pesanan online ${pm.no}`, pm.waktu_antar && pm.waktu_antar !== 'secepatnya' ? `Antar: ${pm.waktu_antar}` : '',
      `Pelanggan memilih bayar ${pm.bayar}`, pm.alamat, pm.catatan || ''
    ].filter(Boolean).join(' | ');
    const pesanan: Pesanan = {
      id: `psn-${Date.now()}`, no_nota: nota, kontak_id: kontak.id, nama_pelanggan: kontak.nama, tipe_transaksi: 'isi_langsung',
      items: h.items, subtotal_produk: h.subtotal, zone_ongkir_id: opsi.zonaId, tarif_ongkir_per_unit: h.tarif,
      total_unit_ongkir: h.unitOngkir, total_ongkir: h.ongkir, diskon: 0, total_akhir: h.total,
      status_pesanan: 'dijadwalkan', status_pembayaran: 'belum_bayar',
      pembayaran_details: [{ metode: 'tunai', jumlah: h.total }], total_dibayar: 0, sisa_hutang: 0,
      kasir_id: user.id, catatan, bayar_ke_kurir: true, created_at: sekarang.toISOString()
    };
    this.addPesanan(pesanan);

    pm.status = 'dikonfirmasi';
    pm.diproses_at = sekarang.toISOString();
    pm.diproses_oleh = user.nama;
    pm.estimasi_tiba = new Date(sekarang.getTime() + opsi.estimasiMenit * 60000).toISOString();
    pm.pesanan_id = pesanan.id;
    pm.kontak_id = kontak.id;
    this.savePesananMasuk(daftar);
    return { pesanan, kontak, pm };
  }

  static tolakPesananMasuk(id: string, alasan: string): PesananMasuk {
    const daftar = this.getPesananMasuk();
    const pm = daftar.find(x => x.id === id);
    if (!pm) throw new Error('Pesanan masuk tidak ditemukan!');
    if (pm.status !== 'baru') throw new Error('Pesanan ini sudah diproses.');
    pm.status = 'ditolak';
    pm.diproses_at = new Date().toISOString();
    pm.diproses_oleh = this.getCurrentUser().nama;
    pm.alasan_tolak = alasan.trim() || undefined;
    this.savePesananMasuk(daftar);
    return pm;
  }

  // ===== Tautan pesan pribadi pelanggan langganan dan pelacakan pesanan online =====

  static getTautan(): TautanPesan[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_tautan');
    return stored ? JSON.parse(stored) : [];
  }

  // Menyamakan data tautan publik dengan data pelanggan terbaru (hanya menulis kalau ada yang berubah)
  static sinkronTautan() {
    if (typeof window === 'undefined') return;
    if (this.getCurrentUser().role === 'pengantar') return;
    const pesanan = this.getPesanan();
    const lama = this.getTautan();
    const baru: TautanPesan[] = this.getKontak().filter(k => k.token_pesan && k.id !== 'kt-1').map(k => {
      const hp = normalisasiHp(k.no_hp || '') || '';
      const terakhir = pesanan.find(p => p && p.kontak_id === k.id && p.status_pesanan !== 'batal' && (p.items || []).some(i => i && !(i.nama_produk || '').startsWith('Pelunasan')));
      const sebelumnya = lama.find(t => t.id === k.token_pesan);
      return {
        id: k.token_pesan as string, kontak_id: k.id, nama: k.nama, hp, alamat: k.alamat || '', lat: k.lat, lng: k.lng,
        items: terakhir ? terakhir.items.filter(i => i && !(i.nama_produk || '').startsWith('Pelunasan')).map(i => ({ produk_id: i.produk_id, jumlah: i.jumlah })) : (sebelumnya?.items || []),
        aktif: k.aktif !== false && (sebelumnya ? sebelumnya.aktif : true)
      };
    });
    // Tautan yang sudah ada tetapi pelanggannya tidak lagi punya token dibiarkan (dinonaktifkan lewat matikanTautan)
    const gabung = [...baru, ...lama.filter(t => !baru.some(b => b.id === t.id))];
    if (JSON.stringify(gabung) === JSON.stringify(lama)) return;
    this.persist('depo_tautan', gabung);
    window.dispatchEvent(new Event('depo_tautan_updated'));
  }

  static buatTokenPesan(kontakId: string): string {
    const list = this.getKontak();
    const k = list.find(x => x.id === kontakId);
    if (!k) throw new Error('Pelanggan tidak ditemukan!');
    if (k.token_pesan) return k.token_pesan;
    const huruf = 'abcdefghjkmnpqrstuvwxyz23456789';
    let t = '';
    for (let i = 0; i < 10; i++) t += huruf[Math.floor(Math.random() * huruf.length)];
    k.token_pesan = t;
    this.saveKontak(list);
    return t;
  }

  static matikanTautan(kontakId: string) {
    const k = this.getKontak().find(x => x.id === kontakId);
    if (!k || !k.token_pesan) return;
    const lama = this.getTautan();
    const t = lama.find(x => x.id === k.token_pesan);
    if (!t) return;
    t.aktif = false;
    this.persist('depo_tautan', lama);
    window.dispatchEvent(new Event('depo_tautan_updated'));
  }

  // Mengikuti perkembangan pesanan antar supaya pelanggan bisa melihat statusnya di halaman lacak
  static sinkronStatusPesananMasuk() {
    if (typeof window === 'undefined') return;
    const daftar = this.getPesananMasuk();
    const berjalan = daftar.filter(pm => pm.status === 'dikonfirmasi' && pm.pesanan_id && pm.tahap !== 'terkirim' && pm.tahap !== 'batal');
    if (berjalan.length === 0) return;
    const pesanan = this.getPesanan();
    let berubah = false;
    berjalan.forEach(pm => {
      const p = pesanan.find(x => x.id === pm.pesanan_id);
      if (!p) return;
      const tahap: NonNullable<PesananMasuk['tahap']> =
        p.status_pesanan === 'batal' ? 'batal'
          : (p.status_pesanan === 'terkirim' || p.status_pesanan === 'selesai') ? 'terkirim'
            : p.status_pesanan === 'dalam_perjalanan' ? 'diantar' : 'dikonfirmasi';
      if (tahap !== (pm.tahap || 'dikonfirmasi')) {
        pm.tahap = tahap;
        if (tahap === 'terkirim') pm.terkirim_at = p.terkirim_at || new Date().toISOString();
        berubah = true;
      }
    });
    if (berubah) this.savePesananMasuk(daftar);
  }

  // Pesanan masuk yang sudah dikonfirmasi tetapi melewati estimasi dan belum terkirim
  static pesananMasukTerlambat(): PesananMasuk[] {
    const sekarang = Date.now();
    return this.getPesananMasuk().filter(pm => pm.status === 'dikonfirmasi' && pm.estimasi_tiba && pm.tahap !== 'terkirim' && pm.tahap !== 'batal' && new Date(pm.estimasi_tiba).getTime() < sekarang);
  }

  // Kasir mengabari pelanggan bahwa pesanan terlambat dan menetapkan perkiraan tiba yang baru
  static perbaruiEstimasiPesananMasuk(id: string, menitDariSekarang: number, estimasiIso?: string): PesananMasuk {
    const daftar = this.getPesananMasuk();
    const pm = daftar.find(x => x.id === id);
    if (!pm) throw new Error('Pesanan masuk tidak ditemukan!');
    if (!(menitDariSekarang > 0)) throw new Error('Isi perkiraan waktu tiba yang baru.');
    pm.estimasi_tiba = estimasiIso || new Date(Date.now() + menitDariSekarang * 60000).toISOString();
    this.savePesananMasuk(daftar);
    return pm;
  }

  // ===== Uang pegangan kasir: uang dari kas besar yang dipegang kasir di luar laci =====

  static getUangPegangan(): UangPegangan[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_uang_pegangan');
    return stored ? JSON.parse(stored) : [];
  }

  static saveUangPegangan(data: UangPegangan[]) {
    this.persist('depo_uang_pegangan', data);
    window.dispatchEvent(new Event('depo_uang_pegangan_updated'));
  }

  // Saldo uang pegangan seorang kasir: yang sudah diterima, dikurangi yang dikembalikan dan yang sudah dibelanjakan
  static getSaldoPegangan(kasirId: string): number {
    const list = this.getUangPegangan().filter(x => x.kasir_id === kasirId && x.status !== 'dibatalkan');
    const diterima = list.filter(x => x.jenis === 'beri' && x.status === 'diterima').reduce((a, x) => a + x.nominal, 0);
    const kembali = list.filter(x => x.jenis === 'kembali').reduce((a, x) => a + x.nominal, 0);
    const dipakai = this.getPengeluaran()
      .filter(p => p.sumber_kas === 'pegangan' && p.kasir_id === kasirId && p.tipe_arus_kas !== 'masuk')
      .reduce((a, p) => a + (p.nominal || 0), 0);
    return diterima - kembali - dipakai;
  }

  // Owner memberi uang pegangan ke seorang kasir (boleh walau kasir belum buka shift). Kas besar langsung berkurang.
  static beriUangPegangan(kasir: { id: string; nama: string }, nominal: number, tujuan?: string): UangPegangan {
    if (!this.keuanganSudahMulai()) throw new Error('Mulai pencatatan Keuangan Owner dulu.');
    const n = this.cekNominal(nominal);
    this.cekSaldoCukup('kas_besar', n);
    const x: UangPegangan = {
      id: `pgg-${Date.now()}`, waktu: new Date().toISOString(), jenis: 'beri',
      kasir_id: kasir.id, kasir_nama: kasir.nama, nominal: n, tujuan: tujuan?.trim() || undefined,
      status: 'menunggu', oleh: this.getCurrentUser().nama
    };
    const list = this.getUangPegangan();
    list.unshift(x);
    this.saveUangPegangan(list);
    return x;
  }

  // Kasir menerima uang pegangan dari owner
  static terimaUangPegangan(id: string): UangPegangan {
    const list = this.getUangPegangan();
    const x = list.find(i => i.id === id);
    if (!x) throw new Error('Data uang pegangan tidak ditemukan!');
    if (x.jenis !== 'beri' || x.status !== 'menunggu') throw new Error('Uang pegangan ini sudah diproses.');
    const user = this.getCurrentUser();
    if (user.id !== x.kasir_id && user.role !== 'owner') throw new Error('Uang pegangan ini untuk kasir lain.');
    x.status = 'diterima';
    x.diterima_at = new Date().toISOString();
    this.saveUangPegangan(list);
    return x;
  }

  // Kasir mengembalikan sisa uang pegangan ke owner (menunggu diterima owner)
  static kembalikanUangPegangan(nominal: number, kasir?: { id: string; nama: string }): UangPegangan {
    const user = this.getCurrentUser();
    const pemegang = kasir || { id: user.id, nama: user.nama };
    const n = this.cekNominal(nominal);
    const saldo = this.getSaldoPegangan(pemegang.id);
    if (n > saldo) throw new Error(`Uang pegangan yang tersisa hanya ${this.formatRupiah(saldo)}.`);
    const x: UangPegangan = {
      id: `pgg-${Date.now()}`, waktu: new Date().toISOString(), jenis: 'kembali',
      kasir_id: pemegang.id, kasir_nama: pemegang.nama, nominal: n, status: 'menunggu', oleh: user.nama
    };
    const list = this.getUangPegangan();
    list.unshift(x);
    this.saveUangPegangan(list);
    this.addNotifikasi({
      jenis: 'setoran_owner', judul: 'Sisa uang pegangan menunggu diterima',
      pesan: `${pemegang.nama} mengembalikan sisa uang pegangan ${this.formatRupiah(n)}. Buka Keuangan Owner untuk menerimanya.`,
      dibuat_oleh: user.nama
    });
    return x;
  }

  // Owner menerima sisa uang pegangan: uangnya masuk kembali ke kas besar
  static terimaPengembalianPegangan(id: string): UangPegangan {
    const list = this.getUangPegangan();
    const x = list.find(i => i.id === id);
    if (!x) throw new Error('Data uang pegangan tidak ditemukan!');
    if (x.jenis !== 'kembali' || x.status !== 'menunggu') throw new Error('Pengembalian ini sudah diproses.');
    x.status = 'diterima';
    x.diterima_at = new Date().toISOString();
    this.saveUangPegangan(list);
    return x;
  }

  // Yang masih menunggu boleh dibatalkan (mis. salah ketik): uangnya kembali ke posisi semula
  static batalkanUangPegangan(id: string): UangPegangan {
    const list = this.getUangPegangan();
    const x = list.find(i => i.id === id);
    if (!x) throw new Error('Data uang pegangan tidak ditemukan!');
    if (x.status !== 'menunggu') throw new Error('Hanya yang masih menunggu yang bisa dibatalkan.');
    x.status = 'dibatalkan';
    this.saveUangPegangan(list);
    return x;
  }

  // ===== Keuangan Owner: kas besar (tunai) dan rekening =====

  static getRekening(): Rekening[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_rekening');
    return stored ? JSON.parse(stored) : [];
  }

  static saveRekening(data: Rekening[]) {
    this.persist('depo_rekening', data);
    window.dispatchEvent(new Event('depo_rekening_updated'));
  }

  static getMutasiKeuangan(): MutasiKeuangan[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_mutasi_keuangan');
    return stored ? JSON.parse(stored) : [];
  }

  static saveMutasiKeuangan(data: MutasiKeuangan[]) {
    this.persist('depo_mutasi_keuangan', data);
    window.dispatchEvent(new Event('depo_mutasi_keuangan_updated'));
  }

  static keuanganSudahMulai(): boolean {
    return !!this.getPengaturan().keuangan_mulai;
  }

  // Rekening tujuan uang dari metode non-tunai (bawaan: rekening aktif pertama)
  static getRekeningUntukMetode(metode: 'transfer' | 'qris' | 'edc'): string | undefined {
    const aktif = this.getRekening().filter(r => r.aktif);
    const dipilih = this.getPengaturan().rekening_metode?.[metode];
    if (dipilih && aktif.some(r => r.id === dipilih)) return dipilih;
    return aktif[0]?.id;
  }

  static namaAkun(akun: string): string {
    if (akun === 'kas_besar') return 'Kas besar (tunai)';
    return this.getRekening().find(r => r.id === akun)?.nama || 'Rekening';
  }

  // Buku kas satu akun ('kas_besar' atau id rekening), urut dari yang terlama, lengkap dengan saldo berjalan.
  // Uang yang masuk otomatis (setoran diterima, penjualan non-tunai, pengeluaran) dihitung langsung dari datanya.
  static getBukuKas(akun: string): { id: string; waktu: string; keterangan: string; masuk: number; keluar: number; saldo: number }[] {
    const mulaiIso = this.getPengaturan().keuangan_mulai;
    if (!mulaiIso) return [];
    const mulai = new Date(mulaiIso).getTime();
    const baris: { id: string; waktu: string; keterangan: string; masuk: number; keluar: number }[] = [];
    const label: Record<JenisMutasi, string> = {
      saldo_awal: 'Saldo awal', tambah_modal: 'Tambah modal', prive: 'Prive (diambil pribadi)', setor_bank: 'Setor tunai ke bank',
      tarik_bank: 'Tarik tunai dari bank', transfer_rekening: 'Transfer antar rekening', modal_laci: 'Modal untuk laci kasir', koreksi: 'Koreksi saldo'
    };

    this.getMutasiKeuangan().filter(m => m.akun === akun).forEach(m => {
      baris.push({
        id: m.id, waktu: m.waktu,
        keterangan: label[m.jenis] + (m.keterangan ? ` - ${m.keterangan}` : ''),
        masuk: m.arah === 'masuk' ? m.nominal : 0, keluar: m.arah === 'keluar' ? m.nominal : 0
      });
    });

    if (akun === 'kas_besar') {
      this.getUangPegangan().forEach(x => {
        if (x.status === 'dibatalkan') return;
        if (x.jenis === 'beri' && new Date(x.waktu).getTime() >= mulai) {
          baris.push({ id: x.id, waktu: x.waktu, keterangan: `Uang pegangan ke ${x.kasir_nama}` + (x.tujuan ? ` - ${x.tujuan}` : '') + (x.status === 'menunggu' ? ' (belum diterima kasir)' : ''), masuk: 0, keluar: x.nominal });
        } else if (x.jenis === 'kembali' && x.status === 'diterima' && x.diterima_at && new Date(x.diterima_at).getTime() >= mulai) {
          baris.push({ id: x.id, waktu: x.diterima_at, keterangan: `Sisa uang pegangan dari ${x.kasir_nama}`, masuk: x.nominal, keluar: 0 });
        }
      });
      this.getSetoranOwner().filter(s => s.status === 'diterima' && s.diterima_at && new Date(s.diterima_at).getTime() >= mulai).forEach(s => {
        baris.push({
          id: s.id, waktu: s.diterima_at as string,
          keterangan: s.jenis === 'ambil_owner' ? 'Diambil dari laci kasir' : `Setoran kasir ${s.kasir_nama}`,
          masuk: s.nominal_diterima ?? s.nominal, keluar: 0
        });
      });
    }

    this.getPengeluaran().filter(p => new Date(p.tanggal).getTime() >= mulai).forEach(p => {
      const dariAkun = p.sumber_kas === 'kas_besar' ? 'kas_besar' : p.sumber_kas === 'rekening' ? p.rekening_id : undefined;
      if (dariAkun !== akun) return;
      const masuk = p.tipe_arus_kas === 'masuk' || p.kategori === 'pengembalian_kasbon';
      baris.push({ id: p.id, waktu: p.tanggal, keterangan: p.peruntukan, masuk: masuk ? p.nominal : 0, keluar: masuk ? 0 : p.nominal });
    });

    if (akun !== 'kas_besar') {
      const metodeUntukAkun = (['transfer', 'qris', 'edc'] as const).filter(m => this.getRekeningUntukMetode(m) === akun);
      if (metodeUntukAkun.length > 0) {
        this.getPesanan().filter(p => p && p.status_pesanan !== 'batal' && new Date(p.created_at).getTime() >= mulai).forEach(p => {
          (p.pembayaran_details || []).forEach(d => {
            if (d && (metodeUntukAkun as string[]).includes(d.metode) && d.jumlah > 0) {
              baris.push({ id: `${p.id}-${d.metode}`, waktu: p.created_at, keterangan: `Penjualan ${String(d.metode).toUpperCase()} ${p.no_nota || ''}`.trim(), masuk: d.jumlah, keluar: 0 });
            }
          });
        });
      }
    }

    baris.sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime());
    let saldo = 0;
    return baris.map(b => { saldo += b.masuk - b.keluar; return { ...b, saldo }; });
  }

  static getSaldoAkun(akun: string): number {
    const buku = this.getBukuKas(akun);
    return buku.length ? buku[buku.length - 1].saldo : 0;
  }

  // Total uang usaha di kas besar dan semua rekening aktif
  static getTotalUangOwner(): number {
    return this.getSaldoAkun('kas_besar') + this.getRekening().filter(r => r.aktif).reduce((acc, r) => acc + this.getSaldoAkun(r.id), 0);
  }

  private static tambahMutasi(item: Omit<MutasiKeuangan, 'id' | 'waktu' | 'oleh'> & { waktu?: string }, idSuffix = ''): MutasiKeuangan {
    const user = this.getCurrentUser();
    const m: MutasiKeuangan = { ...item, id: `mut-${Date.now()}${idSuffix}`, waktu: item.waktu || new Date().toISOString(), oleh: user.nama };
    const list = this.getMutasiKeuangan();
    list.unshift(m);
    this.saveMutasiKeuangan(list);
    return m;
  }

  // Mulai pencatatan: isi saldo awal kas besar dan rekening. Riwayat sebelum saat ini tidak dihitung ulang.
  static mulaiKeuangan(saldoKasBesar: number, rekening: { nama: string; saldo: number }[]) {
    if (this.keuanganSudahMulai()) throw new Error('Pencatatan keuangan sudah dimulai.');
    const kasBesar = Math.max(0, Math.round(saldoKasBesar || 0));
    const daftar = rekening.filter(r => r.nama.trim());
    const p = this.getPengaturan();
    const mulai = new Date().toISOString();
    const rekeningBaru: Rekening[] = daftar.map((r, i) => ({ id: `rek-${Date.now()}-${i}`, nama: r.nama.trim(), aktif: true }));
    this.saveRekening(rekeningBaru);
    p.keuangan_mulai = mulai;
    this.savePengaturan(p);
    if (kasBesar > 0) this.tambahMutasi({ akun: 'kas_besar', arah: 'masuk', nominal: kasBesar, jenis: 'saldo_awal', waktu: mulai }, '-kb');
    rekeningBaru.forEach((r, i) => {
      const saldo = Math.max(0, Math.round(daftar[i].saldo || 0));
      if (saldo > 0) this.tambahMutasi({ akun: r.id, arah: 'masuk', nominal: saldo, jenis: 'saldo_awal', waktu: mulai }, `-r${i}`);
    });
  }

  static tambahRekening(nama: string, saldoAwal: number): Rekening {
    if (!nama.trim()) throw new Error('Nama rekening wajib diisi.');
    const r: Rekening = { id: `rek-${Date.now()}`, nama: nama.trim(), aktif: true };
    const list = this.getRekening();
    list.push(r);
    this.saveRekening(list);
    const saldo = Math.max(0, Math.round(saldoAwal || 0));
    if (saldo > 0) this.tambahMutasi({ akun: r.id, arah: 'masuk', nominal: saldo, jenis: 'saldo_awal' });
    return r;
  }

  static setRekeningMetode(metode: 'transfer' | 'qris' | 'edc', rekeningId: string) {
    const p = this.getPengaturan();
    p.rekening_metode = { ...(p.rekening_metode || {}), [metode]: rekeningId };
    this.savePengaturan(p);
  }

  private static cekNominal(nominal: number): number {
    const n = Math.round(nominal);
    if (!(n > 0)) throw new Error('Nominal harus lebih besar dari Rp 0!');
    return n;
  }

  private static cekSaldoCukup(akun: string, nominal: number) {
    const saldo = this.getSaldoAkun(akun);
    if (nominal > saldo) throw new Error(`Saldo ${this.namaAkun(akun)} hanya ${this.formatRupiah(saldo)}, tidak cukup untuk ${this.formatRupiah(nominal)}.`);
  }

  static tambahModal(akun: string, nominal: number, keterangan?: string) {
    const n = this.cekNominal(nominal);
    this.tambahMutasi({ akun, arah: 'masuk', nominal: n, jenis: 'tambah_modal', keterangan: keterangan?.trim() || undefined });
  }

  static catatPrive(akun: string, nominal: number, keterangan?: string) {
    const n = this.cekNominal(nominal);
    this.cekSaldoCukup(akun, n);
    this.tambahMutasi({ akun, arah: 'keluar', nominal: n, jenis: 'prive', keterangan: keterangan?.trim() || undefined });
  }

  // Pindah uang antar akun: setor tunai ke bank, tarik tunai, atau transfer antar rekening
  static pindahDana(dari: string, ke: string, nominal: number, keterangan?: string) {
    if (dari === ke) throw new Error('Akun asal dan tujuan tidak boleh sama.');
    const n = this.cekNominal(nominal);
    this.cekSaldoCukup(dari, n);
    const jenis: JenisMutasi = dari === 'kas_besar' ? 'setor_bank' : ke === 'kas_besar' ? 'tarik_bank' : 'transfer_rekening';
    const ket = keterangan?.trim() || undefined;
    const pasangan = `psg-${Date.now()}`;
    this.tambahMutasi({ akun: dari, arah: 'keluar', nominal: n, jenis, keterangan: ket, pasangan_id: pasangan }, '-a');
    this.tambahMutasi({ akun: ke, arah: 'masuk', nominal: n, jenis, keterangan: ket, pasangan_id: pasangan }, '-b');
  }

  // Modal untuk laci kasir: keluar dari kas besar, otomatis muncul sebagai modal awal shift berikutnya
  static modalUntukLaci(nominal: number, keterangan?: string) {
    const n = this.cekNominal(nominal);
    this.cekSaldoCukup('kas_besar', n);
    this.tambahMutasi({ akun: 'kas_besar', arah: 'keluar', nominal: n, jenis: 'modal_laci', keterangan: keterangan?.trim() || undefined, dipakai: false });
  }

  static getModalLaciTersedia(): number {
    return this.getMutasiKeuangan().filter(m => m.jenis === 'modal_laci' && !m.dipakai).reduce((acc, m) => acc + m.nominal, 0);
  }

  static tandaiModalLaciDipakai() {
    const list = this.getMutasiKeuangan();
    if (!list.some(m => m.jenis === 'modal_laci' && !m.dipakai)) return;
    this.saveMutasiKeuangan(list.map(m => (m.jenis === 'modal_laci' && !m.dipakai ? { ...m, dipakai: true } : m)));
  }

  // Samakan saldo di aplikasi dengan saldo sebenarnya (mis. mutasi bank); selisihnya dicatat dengan alasan
  static koreksiSaldo(akun: string, saldoSebenarnya: number, alasan: string) {
    if (!alasan.trim()) throw new Error('Alasan koreksi wajib diisi.');
    const target = Math.round(saldoSebenarnya);
    if (!(target >= 0)) throw new Error('Saldo sebenarnya tidak valid.');
    const selisih = target - this.getSaldoAkun(akun);
    if (selisih === 0) throw new Error('Saldonya sudah sama, tidak ada yang dikoreksi.');
    this.tambahMutasi({ akun, arah: selisih > 0 ? 'masuk' : 'keluar', nominal: Math.abs(selisih), jenis: 'koreksi', keterangan: alasan.trim() });
  }

  // Sisa kasbon aktif seorang karyawan (kasbon diberikan dikurangi pengembalian)
  static getSisaKasbon(karyawanId: string): number {
    const list = this.getPengeluaran().filter(p => p.karyawan_id === karyawanId);
    const kasbon = list.filter(p => p.kategori === 'kasbon').reduce((a, p) => a + (p.nominal || 0), 0);
    const kembali = list.filter(p => p.kategori === 'pengembalian_kasbon').reduce((a, p) => a + (p.nominal || 0), 0);
    return Math.max(0, kasbon - kembali);
  }

  // Gaji yang sudah dibayarkan ke karyawan pada bulan berjalan
  static getGajiDibayarBulanIni(karyawanId: string): number {
    const now = new Date();
    return this.getPengeluaran()
      .filter(p => p.karyawan_id === karyawanId && p.kategori === 'gaji')
      .filter(p => { const d = new Date(p.tanggal); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((a, p) => a + (p.nominal || 0), 0);
  }

  // Atur ulang Keuangan Owner: kosongkan rekening, mutasi, dan setoran ke owner, lalu minta isi saldo awal lagi.
  // Penjualan, shift, dan pengeluaran tidak disentuh.
  static resetKeuangan() {
    this.persist('depo_rekening', []);
    this.persist('depo_mutasi_keuangan', []);
    this.persist('depo_setoran_owner', []);
    const p = this.getPengaturan();
    delete p.keuangan_mulai;
    delete p.rekening_metode;
    this.savePengaturan(p);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_rekening_updated'));
      window.dispatchEvent(new Event('depo_mutasi_keuangan_updated'));
      window.dispatchEvent(new Event('depo_setoran_owner_updated'));
    }
  }

  // Laporan selisih per kasir sejak waktu tertentu: selisih hitung laci saat tutup shift + selisih setoran ke owner
  static laporanSelisihKasir(sinceMs: number) {
    type Baris = {
      kasir_id: string; kasir_nama: string;
      jumlah_shift: number; selisih_shift: number; shift_bermasalah: number;
      total_diserahkan: number; selisih_setoran: number; setoran_bermasalah: number;
    };
    const peta = new Map<string, Baris>();
    const ambil = (id: string, nama: string): Baris => {
      const kunci = (nama || id).trim().toLowerCase();
      let b = peta.get(kunci);
      if (!b) {
        b = { kasir_id: id, kasir_nama: nama || 'Kasir', jumlah_shift: 0, selisih_shift: 0, shift_bermasalah: 0, total_diserahkan: 0, selisih_setoran: 0, setoran_bermasalah: 0 };
        peta.set(kunci, b);
      }
      return b;
    };
    const rincian: { waktu: string; kasir_nama: string; jenis: 'shift' | 'setoran'; selisih: number; keterangan: string }[] = [];

    this.getShiftList().filter(s => s.status === 'tutup' && s.waktu_tutup && new Date(s.waktu_tutup).getTime() >= sinceMs).forEach(s => {
      const b = ambil(s.kasir_id, s.kasir_nama || '');
      const selisih = s.selisih || 0;
      b.jumlah_shift += 1;
      b.selisih_shift += selisih;
      if (selisih !== 0) {
        b.shift_bermasalah += 1;
        rincian.push({ waktu: s.waktu_tutup as string, kasir_nama: b.kasir_nama, jenis: 'shift', selisih, keterangan: 'Hitung uang laci saat tutup shift' });
      }
    });

    this.getSetoranOwner().filter(s => s.status === 'diterima' && s.jenis === 'serah_kasir' && s.diterima_at && new Date(s.diterima_at).getTime() >= sinceMs).forEach(s => {
      const b = ambil(s.kasir_id, s.kasir_nama);
      const selisih = s.selisih || 0;
      b.total_diserahkan += s.nominal;
      b.selisih_setoran += selisih;
      if (selisih !== 0) {
        b.setoran_bermasalah += 1;
        rincian.push({ waktu: s.diterima_at as string, kasir_nama: b.kasir_nama, jenis: 'setoran', selisih, keterangan: `Setoran ${this.formatRupiah(s.nominal)}, diterima ${this.formatRupiah(s.nominal_diterima ?? 0)}` });
      }
    });

    const baris = Array.from(peta.values()).sort((a, b) => Math.abs(b.selisih_shift + b.selisih_setoran) - Math.abs(a.selisih_shift + a.selisih_setoran));
    rincian.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
    return { baris, rincian };
  }

  // Saldo tunai yang sedang dibawa tiap kurir
  static getSaldoKurirList(): SaldoKurir[] {
    const map = new Map<string, SaldoKurir>();
    const ensure = (id: string, nama: string) => {
      if (!map.has(id)) map.set(id, { kurir_id: id, kurir_nama: nama, uang_diterima: 0, disetor: 0, saldo: 0 });
      return map.get(id)!;
    };

    this.getUsers().filter(u => u.role === 'pengantar').forEach(u => ensure(u.id, u.nama));

    this.getPesanan().forEach(p => {
      if (p.bayar_ke_kurir && p.pengantar_id && (p.kurir_uang_diterima || 0) > 0) {
        const nama = map.get(p.pengantar_id)?.kurir_nama || this.getUsers().find(u => u.id === p.pengantar_id)?.nama || 'Kurir';
        ensure(p.pengantar_id, nama).uang_diterima += p.kurir_uang_diterima || 0;
      }
    });

    this.getSetoranKurir().filter(s => !s.dibatalkan).forEach(s => {
      ensure(s.kurir_id, s.kurir_nama).disetor += s.nominal || 0;
    });

    map.forEach(k => { k.saldo = k.uang_diterima - k.disetor; });
    return Array.from(map.values());
  }

  static getSaldoKurir(kurirId: string): number {
    return this.getSaldoKurirList().find(k => k.kurir_id === kurirId)?.saldo || 0;
  }

  static getTotalUangDiKurir(): number {
    return this.getSaldoKurirList().reduce((acc, k) => acc + Math.max(0, k.saldo), 0);
  }

  // Pesanan antar tunai yang uangnya sudah diterima kurir (untuk rincian di layar setoran)
  static getPesananTunaiKurir(kurirId: string): Pesanan[] {
    return this.getPesanan()
      .filter(p => p.bayar_ke_kurir && p.pengantar_id === kurirId && (p.kurir_uang_diterima || 0) > 0)
      .sort((a, b) => (b.kurir_diterima_at || b.created_at).localeCompare(a.kurir_diterima_at || a.created_at));
  }

  // Kurir/kasir menandai pesanan antar sudah sampai, sekaligus mencatat cara bayar dari pelanggan
  static konfirmasiTerkirim(
    pesananId: string,
    opsi: { metode?: MetodePembayaran; jumlahDiterima?: number; kurirId?: string }
  ): Pesanan {
    const list = this.getPesanan();
    const idx = list.findIndex(p => p.id === pesananId);
    if (idx === -1) throw new Error('Pesanan tidak ditemukan!');
    const p = list[idx];

    if ((p.status_pesanan === 'terkirim' || p.status_pesanan === 'selesai') && p.kurir_diterima_at) {
      throw new Error('Pesanan ini sudah dikonfirmasi terkirim sebelumnya.');
    }

    if (opsi.kurirId) p.pengantar_id = opsi.kurirId;
    p.status_pesanan = 'terkirim';
    if (!p.terkirim_at) p.terkirim_at = new Date().toISOString();

    // Pesanan yang uangnya masih menunggu kurir: catat cara bayar yang sebenarnya
    if (p.bayar_ke_kurir) {
      const metode = opsi.metode || 'tunai';
      const total = p.total_akhir || 0;

      if (metode === 'tunai') {
        if (!p.pengantar_id) throw new Error('Pilih kurir yang mengantar dulu.');
        const diterima = Math.max(0, Math.round(opsi.jumlahDiterima ?? total));
        const sisa = Math.max(0, total - diterima);
        p.kurir_uang_diterima = diterima;
        p.kurir_diterima_at = new Date().toISOString();
        p.total_dibayar = diterima;
        p.sisa_hutang = sisa;
        p.status_pembayaran = sisa === 0 ? 'lunas' : (diterima > 0 ? 'dp' : 'hutang');
        p.pembayaran_details = [
          ...(diterima > 0 ? [{ metode: 'tunai' as MetodePembayaran, jumlah: diterima }] : []),
          ...(sisa > 0 ? [{ metode: 'hutang' as MetodePembayaran, jumlah: sisa }] : [])
        ];
        if (sisa > 0 && p.kontak_id) this.tambahHutangPelanggan(p.kontak_id, sisa);
      } else if (metode === 'hutang') {
        p.bayar_ke_kurir = false;
        p.total_dibayar = 0;
        p.sisa_hutang = total;
        p.status_pembayaran = 'hutang';
        p.pembayaran_details = [{ metode: 'hutang', jumlah: total }];
        if (p.kontak_id) this.tambahHutangPelanggan(p.kontak_id, total);
      } else {
        // Transfer / QRIS / EDC: uang tidak lewat kurir
        p.bayar_ke_kurir = false;
        p.total_dibayar = total;
        p.sisa_hutang = 0;
        p.status_pembayaran = 'lunas';
        p.pembayaran_details = [{ metode, jumlah: total }];
      }
    } else if (p.status_pembayaran === 'belum_bayar') {
      p.status_pembayaran = 'lunas';
    }

    this.savePesanan(list);
    return p;
  }

  // Kasir menerima setoran uang dari kurir
  static tambahSetoran(kurirId: string, nominal: number, catatan?: string): SetoranKurir {
    const kurir = this.getSaldoKurirList().find(k => k.kurir_id === kurirId);
    if (!kurir) throw new Error('Kurir tidak ditemukan!');
    const jumlah = Math.round(nominal);
    if (!(jumlah > 0)) throw new Error('Nominal setoran harus lebih besar dari Rp 0!');
    if (jumlah > kurir.saldo) {
      throw new Error(`Setoran (${this.formatRupiah(jumlah)}) melebihi uang yang dibawa kurir (${this.formatRupiah(kurir.saldo)}).`);
    }

    const user = this.getCurrentUser();
    const setoran: SetoranKurir = {
      id: `stor-${Date.now()}`,
      tanggal: new Date().toISOString(),
      kurir_id: kurir.kurir_id,
      kurir_nama: kurir.kurir_nama,
      nominal: jumlah,
      kasir_id: user.id,
      kasir_nama: user.nama,
      catatan: catatan?.trim() || undefined
    };
    const list = this.getSetoranKurir();
    list.unshift(setoran);
    this.saveSetoranKurir(list);
    return setoran;
  }

  // Koreksi setoran (nominal baru 0 = batalkan). Owner otomatis mendapat pemberitahuan.
  static koreksiSetoran(setoranId: string, nominalBaru: number, alasan: string): SetoranKurir {
    if (!alasan.trim()) throw new Error('Alasan koreksi wajib diisi supaya owner tahu sebabnya.');
    const list = this.getSetoranKurir();
    const idx = list.findIndex(s => s.id === setoranId);
    if (idx === -1) throw new Error('Data setoran tidak ditemukan!');
    const s = list[idx];
    if (s.dibatalkan) throw new Error('Setoran ini sudah dibatalkan.');

    const baru = Math.max(0, Math.round(nominalBaru));
    if (baru === s.nominal) throw new Error('Nominalnya sama dengan yang tercatat, tidak ada yang dikoreksi.');

    // Saldo kurir setelah koreksi tidak boleh minus
    const saldoSekarang = this.getSaldoKurir(s.kurir_id);
    if (saldoSekarang + s.nominal - baru < 0) {
      throw new Error('Nominal baru melebihi uang yang seharusnya dibawa kurir.');
    }

    const user = this.getCurrentUser();
    const dari = s.nominal;
    s.riwayat_koreksi = [...(s.riwayat_koreksi || []), {
      waktu: new Date().toISOString(), dari, ke: baru, oleh: user.nama, alasan: alasan.trim()
    }];
    if (baru === 0) {
      s.dibatalkan = true;
    } else {
      s.nominal = baru;
    }
    this.saveSetoranKurir(list);

    const batal = baru === 0;
    this.addNotifikasi({
      jenis: batal ? 'pembatalan_setoran' : 'koreksi_setoran',
      judul: batal ? 'Setoran kurir dibatalkan' : 'Setoran kurir dikoreksi',
      pesan: batal
        ? `${user.nama} membatalkan setoran ${s.kurir_nama} sebesar ${this.formatRupiah(dari)}. Alasan: ${alasan.trim()}`
        : `${user.nama} mengoreksi setoran ${s.kurir_nama} dari ${this.formatRupiah(dari)} menjadi ${this.formatRupiah(baru)}. Alasan: ${alasan.trim()}`,
      dibuat_oleh: user.nama
    });
    return s;
  }

  static getNotifikasi(): NotifikasiOwner[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_notifikasi');
    return stored ? JSON.parse(stored) : [];
  }

  static saveNotifikasi(data: NotifikasiOwner[]) {
    this.persist('depo_notifikasi', data);
    window.dispatchEvent(new Event('depo_notifikasi_updated'));
  }

  static addNotifikasi(n: Omit<NotifikasiOwner, 'id' | 'waktu' | 'dibaca'>) {
    const list = this.getNotifikasi();
    list.unshift({ ...n, id: `ntf-${Date.now()}`, waktu: new Date().toISOString(), dibaca: false });
    this.saveNotifikasi(list);
  }

  static tandaiNotifikasiDibaca(id?: string) {
    const list = this.getNotifikasi().map(n => (!id || n.id === id) ? { ...n, dibaca: true } : n);
    this.saveNotifikasi(list);
  }

  static jumlahNotifikasiBelumDibaca(): number {
    return this.getNotifikasi().filter(n => !n.dibaca).length;
  }

  static getCurrentUser(): UserApp {
    const users = this.getUsers();
    const defaultUser = users[0] || {
      id: 'usr-owner',
      nama: 'Owner Toko',
      username: 'owner',
      role: 'owner',
      aktif: true
    };

    if (typeof window === 'undefined') return defaultUser;
    const stored = localStorage.getItem('depo_current_user');
    if (!stored) return defaultUser;

    try {
      const parsed: UserApp = JSON.parse(stored);
      const found = users.find(u => u.id === parsed.id || u.username === parsed.username || u.nama.toLowerCase() === parsed.nama.toLowerCase());
      if (found) {
        return found;
      }
      return parsed;
    } catch {
      return defaultUser;
    }
  }

  // Login berlaku 12 jam sejak masuk, lalu harus login ulang
  static readonly SESSION_MS = 12 * 60 * 60 * 1000;

  // Catat waktu mulai login (dipanggil saat login dengan password berhasil)
  static startSession() {
    localStorage.setItem('depo_session_at', String(Date.now()));
    localStorage.removeItem('depo_session_expired');
  }

  // User yang benar-benar sudah login (null jika belum login, sudah logout, atau sesi berakhir)
  static getSessionUser(): UserApp | null {
    if (typeof window === 'undefined') return null;
    if (!localStorage.getItem('depo_current_user')) return null;

    const startedAt = Number(localStorage.getItem('depo_session_at'));
    if (!startedAt) {
      // Login lama (dari sebelum ada batas waktu): 12 jam dihitung mulai sekarang
      this.startSession();
    } else if (Date.now() - startedAt > this.SESSION_MS) {
      localStorage.removeItem('depo_current_user');
      localStorage.removeItem('depo_session_at');
      localStorage.setItem('depo_session_expired', '1'); // supaya halaman login menjelaskan alasannya
      return null;
    }

    return this.getCurrentUser();
  }

  static logout() {
    localStorage.removeItem('depo_current_user');
    localStorage.removeItem('depo_session_at');
    window.dispatchEvent(new Event('depo_user_updated'));
  }

  static tambahHutangPelanggan(kontakId: string, jumlah: number) {
    const kontakList = this.getKontak();
    const idx = kontakList.findIndex(k => k.id === kontakId);
    if (idx === -1) return;
    kontakList[idx].hutang_saat_ini = (kontakList[idx].hutang_saat_ini || 0) + jumlah;
    this.saveKontak(kontakList);
  }

  static setCurrentUser(user: UserApp) {
    localStorage.setItem('depo_current_user', JSON.stringify(user));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_user_updated'));
    }
  }

  // Tanggal hari ini menurut waktu setempat (YYYY-MM-DD). toISOString() memakai UTC sehingga di WIB
  // tanggalnya mundur sehari untuk jam 00.00-07.00.
  static tanggalHariIni(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  static formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  static getPengeluaran(): Pengeluaran[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_pengeluaran');
    return stored ? JSON.parse(stored) : [];
  }

  static savePengeluaran(data: Pengeluaran[]) {
    this.persist('depo_pengeluaran', data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_pengeluaran_updated'));
    }
  }

  static getUsers(): UserApp[] {
    const pengaturan = this.getPengaturan();
    const ownerName = pengaturan.nama_owner || 'Owner Toko';

    const ownerUser: UserApp = {
      id: 'usr-owner',
      nama: ownerName,
      username: 'owner',
      role: 'owner',
      no_hp: pengaturan.no_wa || '',
      password: pengaturan.password_owner || '123456',
      aktif: true
    };

    const list: UserApp[] = [ownerUser];

    const karyawanList = pengaturan.karyawan_list || [];
    karyawanList.forEach(k => {
      if (k.aktif !== false) {
        let role: UserRole = 'kasir';
        const jab = (k.jabatan || '').toLowerCase();
        if (jab.includes('admin') || jab.includes('pemilik') || jab.includes('owner')) {
          role = 'admin';
        } else if (jab.includes('pengantar') || jab.includes('driver') || jab.includes('kurir')) {
          role = 'pengantar';
        }

        if (k.nama.toLowerCase() !== ownerName.toLowerCase()) {
          list.push({
            id: k.id,
            nama: k.nama,
            username: k.nama.toLowerCase().replace(/[^a-z0-9]/g, '') || k.id,
            role: role,
            no_hp: k.no_hp || '',
            password: k.password || '123456',
            aktif: true
          });
        }
      }
    });

    const hasKasir = list.some(u => u.role === 'kasir');
    if (!hasKasir) {
      list.push({
        id: 'usr-kasir-default',
        nama: 'Kasir Depo (POS)',
        username: 'kasir',
        role: 'kasir',
        password: '123456',
        aktif: true
      });
    }

    return list;
  }

  static addPengeluaran(item: Pengeluaran) {
    const list = this.getPengeluaran();
    list.unshift(item);
    this.savePengeluaran(list);
  }

  static deletePengeluaran(id: string) {
    const list = this.getPengeluaran().filter(p => p.id !== id);
    this.savePengeluaran(list);
  }

  static getHutangToko(): HutangToko[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_hutang_toko');
    return stored ? JSON.parse(stored) : [];
  }

  static saveHutangToko(data: HutangToko[]) {
    this.persist('depo_hutang_toko', data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_hutang_toko_updated'));
    }
  }

  static addHutangToko(item: HutangToko) {
    const list = this.getHutangToko();
    list.unshift(item);
    this.saveHutangToko(list);
  }

  // sumber: bawaan laci (dari layar kasir); owner bisa membayar dari kas besar atau rekening
  static bayarHutangToko(id: string, jumlahBayar: number, catatan?: string, sumber?: { sumber_kas: SumberKas; rekening_id?: string }): Pengeluaran {
    const list = this.getHutangToko();
    const idx = list.findIndex(h => h.id === id);
    if (idx === -1) throw new Error('Catatan hutang toko tidak ditemukan!');

    const target = list[idx];
    const sisa = target.sisa_hutang || 0;
    if (sisa <= 0) throw new Error('Hutang toko ini sudah lunas!');

    const bayar = Math.min(sisa, jumlahBayar);
    if (sumber && (sumber.sumber_kas === 'kas_besar' || sumber.sumber_kas === 'rekening')) {
      const akun = sumber.sumber_kas === 'kas_besar' ? 'kas_besar' : (sumber.rekening_id || '');
      if (!akun) throw new Error('Pilih rekening yang dipakai membayar.');
      this.cekSaldoCukup(akun, bayar);
    }
    target.total_dibayar = (target.total_dibayar || 0) + bayar;
    target.sisa_hutang = Math.max(0, sisa - bayar);
    if (target.sisa_hutang === 0) {
      target.status = 'lunas';
    }

    this.saveHutangToko(list);

    // Record cash out expense for paying store debt
    const currentUser = this.getCurrentUser();
    const newExpense: Pengeluaran = {
      id: `exp-htg-${Date.now()}`,
      tanggal: new Date().toISOString(),
      nominal: bayar,
      peruntukan: `Pelunasan Hutang Toko - ${target.nama_pihak} (${target.peruntukan})`,
      kategori: 'bayar_hutang_toko',
      karyawan_id: target.karyawan_id,
      karyawan_nama: target.tipe_pihak === 'karyawan' ? target.nama_pihak : undefined,
      tipe_arus_kas: 'keluar',
      ...(sumber ? { sumber_kas: sumber.sumber_kas, rekening_id: sumber.sumber_kas === 'rekening' ? sumber.rekening_id : undefined } : {}),
      kasir_id: currentUser.id,
      kasir_nama: currentUser.nama,
      catatan: catatan || `Pembayaran hutang toko ke ${target.nama_pihak}`
    };
    this.addPengeluaran(newExpense);
    return newExpense;
  }

  // Owner mencatat pengeluaran yang dibayar dari kas besar atau rekening (mis. kasir sedang tidak ada).
  // Pembelian air baku ikut menambah stok air baku, sama seperti saat dicatat dari layar kasir.
  static catatPengeluaranOwner(i: {
    sumber: 'kas_besar' | 'rekening'; rekening_id?: string; kategori: string; peruntukan: string; nominal: number; catatan?: string;
    karyawan?: { id: string; nama: string };
    air?: { vendor: string; volume: number; harga: number; tips: number };
  }): Pengeluaran {
    if (!this.keuanganSudahMulai()) throw new Error('Mulai pencatatan Keuangan Owner dulu.');
    const akun = i.sumber === 'kas_besar' ? 'kas_besar' : (i.rekening_id || '');
    if (!akun) throw new Error('Pilih rekening yang dipakai membayar.');
    let nominal = Math.round(i.nominal);
    let peruntukan = i.peruntukan.trim();
    if (i.kategori === 'pembelian_air_baku') {
      if (!i.air || !i.air.vendor.trim()) throw new Error('Nama vendor/sopir pengirim wajib diisi!');
      if (!(i.air.volume > 0)) throw new Error('Volume air masuk harus lebih besar dari 0 Liter!');
      nominal = Math.round((i.air.harga || 0) + (i.air.tips || 0));
      if (!peruntukan) peruntukan = `Pembelian Air Baku Tangki ${i.air.volume} Liter - ${i.air.vendor.trim()}`;
    }
    if (!(nominal > 0)) throw new Error('Nominal pengeluaran harus lebih besar dari Rp 0!');
    if (!peruntukan) throw new Error('Isi dulu untuk apa uang ini dipakai.');
    if (i.kategori === 'ongkir' && !i.karyawan) throw new Error('Pilih kurir yang dibayar ongkirnya.');
    this.cekSaldoCukup(akun, nominal);
    const user = this.getCurrentUser();
    const p: Pengeluaran = {
      id: `exp-${Date.now()}`, tanggal: new Date().toISOString(), nominal, peruntukan,
      kategori: i.kategori,
      karyawan_id: i.karyawan?.id, karyawan_nama: i.karyawan?.nama,
      tipe_arus_kas: 'keluar', sumber_kas: i.sumber, rekening_id: i.sumber === 'rekening' ? i.rekening_id : undefined,
      kasir_id: user.id, kasir_nama: user.nama, catatan: i.catatan?.trim() || undefined,
      nama_vendor_pengirim: i.air ? i.air.vendor.trim() : undefined,
      volume_air_masuk_liter: i.air ? Number(i.air.volume) : undefined,
      harga_perolehan_air: i.air ? Number(i.air.harga) : undefined,
      tips_sopir_pengirim: i.air ? Number(i.air.tips) : undefined
    };
    this.addPengeluaran(p);
    if (i.kategori === 'pembelian_air_baku' && i.air) {
      const peng = this.getPengaturan();
      this.savePengaturan({
        ...peng,
        stok_air_baku_saat_ini: (peng.stok_air_baku_saat_ini || 0) + Number(i.air.volume),
        meteran_air_awal_liter: (peng.meteran_air_awal_liter ?? 0) + Number(i.air.volume)
      });
      window.dispatchEvent(new Event('depo_pengaturan_updated'));
    }
    return p;
  }

  static deleteHutangToko(id: string) {
    const list = this.getHutangToko().filter(h => h.id !== id);
    this.saveHutangToko(list);
  }

  // Shift Kasir Management
  static getShiftList(): ShiftKasir[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_shift');
    return stored ? JSON.parse(stored) : [];
  }

  static saveShiftList(data: ShiftKasir[]) {
    this.persist('depo_shift', data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_shift_updated'));
    }
  }

  // ===== Foto meteran air depo per shift =====
  static getModeFotoMeter(): ModeFotoMeter {
    return this.getPengaturan().foto_meter_mode || 'opsional';
  }

  static getFotoMeter(): FotoMeter[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('depo_foto_meter');
    return stored ? JSON.parse(stored) : [];
  }

  static getFotoMeterShift(shiftId: string, jenis: 'awal' | 'akhir'): FotoMeter | undefined {
    return this.getFotoMeter().find(f => f.shift_id === shiftId && f.jenis === jenis);
  }

  // Simpan foto meter. Foto lebih lama dari 60 hari dibuang supaya penyimpanan perangkat tidak penuh.
  // Mengembalikan false bila gagal (mis. penyimpanan penuh); shift tetap berjalan tanpa foto.
  static simpanFotoMeter(shiftId: string, jenis: 'awal' | 'akhir', gambar: string): boolean {
    try {
      const user = this.getCurrentUser();
      const batas = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const list = this.getFotoMeter().filter(f => !(f.shift_id === shiftId && f.jenis === jenis) && new Date(f.waktu).getTime() >= batas);
      list.unshift({ id: `${shiftId}-${jenis}`, shift_id: shiftId, jenis, gambar, waktu: new Date().toISOString(), oleh: user.nama });
      this.persist('depo_foto_meter', list);
      window.dispatchEvent(new Event('depo_foto_meter_updated'));
      return true;
    } catch {
      return false;
    }
  }

  static getShiftAktif(kasirId?: string): ShiftKasir | null {
    const list = this.getShiftList();
    return list.find(s => (kasirId ? s.kasir_id === kasirId : true) && s.status === 'buka') || null;
  }

  static bukaShift(saldoAwal: number, meterAwal: number, kasirId?: string, kasirNama?: string): ShiftKasir {
    const user = this.getCurrentUser();
    const kid = kasirId || user.id;
    const knama = kasirNama || user.nama;
    const list = this.getShiftList();

    const newShift: ShiftKasir = {
      id: `shift-${Date.now()}`,
      kasir_id: kid,
      kasir_nama: knama,
      waktu_buka: new Date().toISOString(),
      saldo_awal: saldoAwal,
      meter_awal: meterAwal,
      total_tunai_masuk: 0,
      total_non_tunai: 0,
      status: 'buka'
    };

    list.unshift(newShift);
    this.saveShiftList(list);
    this.tandaiModalLaciDipakai();

    const p = this.getPengaturan();
    p.meteran_air_awal_liter = meterAwal;
    this.savePengaturan(p);

    return newShift;
  }

  // diserahkanSaatTutup = uang laci yang langsung diserahkan ke owner saat tutup (menunggu diterima owner)
  static tutupShift(shiftId: string, saldoAkhirAktual: number, meterAkhir: number, diserahkanSaatTutup: number = 0): ShiftKasir {
    const list = this.getShiftList();
    const idx = list.findIndex(s => s.id === shiftId);
    if (idx === -1) throw new Error('Shift tidak ditemukan!');

    const target = list[idx];
    const shiftBukaTime = new Date(target.waktu_buka).getTime();
    const serahTutup = Math.max(0, Math.round(diserahkanSaatTutup || 0));
    if (serahTutup > saldoAkhirAktual) throw new Error('Uang yang diserahkan ke owner melebihi uang di laci.');

    // Filter pesanan & pengeluaran yang terjadi SEJAK SHIFT DIBUKA (bukan seluruh pesanan hari ini)
    const allPesanan = this.getPesanan().filter(p => new Date(p.created_at).getTime() >= shiftBukaTime);
    // Tunai langsung masuk laci + setoran kurir yang diterima selama shift ini
    const totalTunai = this.totalTunaiLangsung(allPesanan) + this.totalSetoranSejak(shiftBukaTime);
    const totalSetoranKurir = this.totalSetoranSejak(shiftBukaTime);
    const totalNonTunai = allPesanan
      .filter(p => p && p.pembayaran_details && Array.isArray(p.pembayaran_details) && p.pembayaran_details.some(d => d && d.metode !== 'tunai' && d.metode !== 'hutang'))
      .reduce((acc, p) => acc + (p.total_akhir || 0), 0);

    const kasLaci = this.hitungKasLaci(target.saldo_awal, shiftBukaTime);
    const ekspektasiKas = kasLaci.ekspektasi;
    const selisihKas = saldoAkhirAktual - ekspektasiKas;
    const totalPemakaianAir = Math.max(0, meterAkhir - (target.meter_awal || 0));

    target.waktu_tutup = new Date().toISOString();
    target.saldo_akhir_aktual = saldoAkhirAktual;
    target.meter_akhir = meterAkhir;
    target.total_pemakaian_air_liter = totalPemakaianAir;
    target.total_tunai_masuk = totalTunai;
    target.total_setoran_kurir = totalSetoranKurir;
    target.uang_di_kurir_saat_tutup = this.getTotalUangDiKurir();
    target.total_non_tunai = totalNonTunai;
    target.selisih = selisihKas;
    target.total_diserahkan_owner = kasLaci.diserahkanOwner + serahTutup;
    target.sisa_laci_saat_tutup = saldoAkhirAktual - serahTutup;
    target.status = 'tutup';

    this.saveShiftList(list);

    if (serahTutup > 0) {
      const user = this.getCurrentUser();
      const setoran: SetoranOwner = {
        id: `sto-${Date.now()}`,
        waktu: target.waktu_tutup,
        jenis: 'serah_kasir',
        kasir_id: target.kasir_id,
        kasir_nama: target.kasir_nama || user.nama,
        shift_id: target.id,
        saat_tutup: true,
        nominal: serahTutup,
        status: 'menunggu',
        catatan: 'Diserahkan saat tutup shift'
      };
      const so = this.getSetoranOwner();
      so.unshift(setoran);
      this.saveSetoranOwner(so);
      this.addNotifikasi({
        jenis: 'setoran_owner',
        judul: 'Setoran kasir menunggu diterima',
        pesan: `${setoran.kasir_nama} menyerahkan ${this.formatRupiah(serahTutup)} saat tutup shift. Buka Keuangan Owner untuk menerimanya.`,
        dibuat_oleh: user.nama
      });
    }

    const p = this.getPengaturan();
    p.meteran_air_awal_liter = meterAkhir;
    this.savePengaturan(p);

    return target;
  }

  static adjustMeterAndStokByOwner(stokAir: number, meterAir: number): { pengaturan: PengaturanDepo; shiftList: ShiftKasir[] } {
    const p = this.getPengaturan();
    p.stok_air_baku_saat_ini = stokAir;
    p.meteran_air_awal_liter = meterAir;
    this.savePengaturan(p);

    const shiftList = this.getShiftList();
    const activeShift = shiftList.find(s => s.status === 'buka');
    const closedShifts = shiftList.filter(s => s.status === 'tutup' && s.meter_akhir !== undefined);
    const latestClosedShift = closedShifts.length > 0 ? closedShifts[0] : null;

    const targetShift = activeShift || latestClosedShift;

    if (targetShift) {
      const idx = shiftList.findIndex(s => s.id === targetShift.id);
      if (idx !== -1) {
        if (targetShift.status === 'tutup') {
          shiftList[idx].meter_akhir = meterAir;
          shiftList[idx].total_pemakaian_air_liter = Math.max(0, meterAir - (shiftList[idx].meter_awal || 0));
        } else {
          const pesananList = this.getPesanan();
          const shiftBukaTime = new Date(targetShift.waktu_buka).getTime();
          const pesananShift = pesananList.filter(pes => pes && pes.created_at && new Date(pes.created_at).getTime() >= shiftBukaTime);
          const produkList = this.getProduk();
          const totalLiterShift = pesananShift.reduce((acc, pes) => {
            if (!pes || !pes.items || !Array.isArray(pes.items)) return acc;
            const orderLiter = pes.items.reduce((sum, item) => {
              if (!item) return sum;
              const prod = (produkList || []).find(pr => pr && pr.id === item.produk_id);
              const nama = item.nama_produk || '';
              const vol = prod ? (prod.volume_liter || 19) : nama.includes('19L') ? 19 : nama.includes('15L') ? 15 : 10;
              return sum + (vol * (item.jumlah || 0));
            }, 0);
            return acc + orderLiter;
          }, 0);

          shiftList[idx].meter_awal = Math.max(0, meterAir - totalLiterShift);
        }
        this.saveShiftList(shiftList);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('depo_pengaturan_updated'));
    }

    return { pengaturan: p, shiftList };
  }

  static resetSelectedData(options: {
    pesanan?: boolean;
    kontak?: boolean;
    produk?: boolean;
    zona?: boolean;
    servis?: boolean;
    karyawan?: boolean;
    pengeluaran?: boolean;
    keuangan?: boolean;
    factoryAll?: boolean;
  }) {
    if (typeof window === 'undefined') return;

    if (options.keuangan && !options.factoryAll) {
      this.resetKeuangan();
    }

    if (options.factoryAll) {
      // Ditulis ulang ke nilai awal (bukan dihapus) supaya reset ikut tersinkron ke perangkat lain
      this.persist('depo_pesanan', INITIAL_PESANAN);
      this.persist('depo_setoran_kurir', []);
      this.persist('depo_setoran_owner', []);
      this.persist('depo_rekening', []);
      this.persist('depo_mutasi_keuangan', []);
      this.persist('depo_notifikasi', []);
      this.persist('depo_produk', INITIAL_PRODUK);
      this.persist('depo_zona', INITIAL_ZONA);
      this.persist('depo_pengeluaran', []);
      this.persist('depo_hutang_toko', []);
      this.persist('depo_shift', []); this.persist('depo_foto_meter', []);

      const cleanKontak = INITIAL_KONTAK.map(k => ({ ...k, hutang_saat_ini: 0, galon_dipinjam: 0 }));
      this.persist('depo_kontak', cleanKontak);

      this.persist('depo_pengaturan', { ...INITIAL_PENGATURAN, galon_pinjaman_pelanggan: [] });

      window.dispatchEvent(new Event('depo_pesanan_updated'));
      window.dispatchEvent(new Event('depo_setoran_kurir_updated'));
      window.dispatchEvent(new Event('depo_setoran_owner_updated'));
      window.dispatchEvent(new Event('depo_rekening_updated'));
      window.dispatchEvent(new Event('depo_mutasi_keuangan_updated'));
      window.dispatchEvent(new Event('depo_notifikasi_updated'));
      window.dispatchEvent(new Event('depo_kontak_updated'));
      window.dispatchEvent(new Event('depo_produk_updated'));
      window.dispatchEvent(new Event('depo_zona_updated'));
      window.dispatchEvent(new Event('depo_pengaturan_updated'));
      window.dispatchEvent(new Event('depo_pengeluaran_updated'));
      window.dispatchEvent(new Event('depo_hutang_toko_updated'));
      window.dispatchEvent(new Event('depo_shift_updated'));
      return;
    }

    if (options.pengeluaran) {
      this.persist('depo_pengeluaran', []);
      window.dispatchEvent(new Event('depo_pengeluaran_updated'));
    }

    if (options.pesanan) {
      this.persist('depo_pesanan', []);
      this.persist('depo_setoran_kurir', []);
      this.persist('depo_setoran_owner', []);
      this.persist('depo_notifikasi', []);
      this.persist('depo_pengeluaran', []);
      this.persist('depo_hutang_toko', []);
      this.persist('depo_shift', []); this.persist('depo_foto_meter', []);

      // Reset all contact debts & borrowed galons
      const currentKontak = this.getKontak();
      const cleanKontak = currentKontak.map(k => ({ ...k, hutang_saat_ini: 0, galon_dipinjam: 0 }));
      this.persist('depo_kontak', cleanKontak);

      // Clear borrowed galons
      const p = this.getPengaturan();
      p.galon_pinjaman_pelanggan = [];
      this.savePengaturan(p);

      window.dispatchEvent(new Event('depo_pesanan_updated'));
      window.dispatchEvent(new Event('depo_setoran_kurir_updated'));
      window.dispatchEvent(new Event('depo_setoran_owner_updated'));
      window.dispatchEvent(new Event('depo_notifikasi_updated'));
      window.dispatchEvent(new Event('depo_pengeluaran_updated'));
      window.dispatchEvent(new Event('depo_hutang_toko_updated'));
      window.dispatchEvent(new Event('depo_shift_updated'));
      window.dispatchEvent(new Event('depo_kontak_updated'));
      window.dispatchEvent(new Event('depo_pengaturan_updated'));
    }

    if (options.kontak) {
      const cleanKontak = INITIAL_KONTAK.map(k => ({ ...k, hutang_saat_ini: 0, galon_dipinjam: 0 }));
      this.persist('depo_kontak', cleanKontak);

      const p = this.getPengaturan();
      p.galon_pinjaman_pelanggan = [];
      this.savePengaturan(p);

      window.dispatchEvent(new Event('depo_kontak_updated'));
      window.dispatchEvent(new Event('depo_pengaturan_updated'));
    }

    if (options.produk) {
      this.persist('depo_produk', INITIAL_PRODUK);
      window.dispatchEvent(new Event('depo_produk_updated'));
    }

    if (options.zona) {
      this.persist('depo_zona', INITIAL_ZONA);
      window.dispatchEvent(new Event('depo_zona_updated'));
    }

    if (options.servis || options.karyawan) {
      const p = this.getPengaturan();
      if (options.servis) {
        p.stok_air_baku_saat_ini = 5000;
        p.meteran_air_awal_liter = 0;
        this.persist('depo_shift', []); this.persist('depo_foto_meter', []);
        window.dispatchEvent(new Event('depo_shift_updated'));
        if (p.komponen_servis_list) {
          p.komponen_servis_list = p.komponen_servis_list.map(c => ({ ...c, liter_terakhir_ganti: 0 }));
        }
      }
      if (options.karyawan) {
        p.karyawan_list = [];
      }
      this.savePengaturan(p);
    }
  }
}
