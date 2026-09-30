import { 
  UserApp, Produk, ZoneOngkir, Kontak, Pesanan, TitipGalon, 
  PengaturanDepo, ShiftKasir, UserRole, Pengeluaran, HutangToko 
} from './types';
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
    const newNotaNo = `PAY-HTG-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;

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

  static bayarHutangToko(id: string, jumlahBayar: number, catatan?: string) {
    const list = this.getHutangToko();
    const idx = list.findIndex(h => h.id === id);
    if (idx === -1) throw new Error('Catatan hutang toko tidak ditemukan!');

    const target = list[idx];
    const sisa = target.sisa_hutang || 0;
    if (sisa <= 0) throw new Error('Hutang toko ini sudah lunas!');

    const bayar = Math.min(sisa, jumlahBayar);
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
      kasir_id: currentUser.id,
      kasir_nama: currentUser.nama,
      catatan: catatan || `Pembayaran hutang toko ke ${target.nama_pihak}`
    };
    this.addPengeluaran(newExpense);
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

    const p = this.getPengaturan();
    p.meteran_air_awal_liter = meterAwal;
    this.savePengaturan(p);

    return newShift;
  }

  static tutupShift(shiftId: string, saldoAkhirAktual: number, meterAkhir: number): ShiftKasir {
    const list = this.getShiftList();
    const idx = list.findIndex(s => s.id === shiftId);
    if (idx === -1) throw new Error('Shift tidak ditemukan!');

    const target = list[idx];
    const shiftBukaTime = new Date(target.waktu_buka).getTime();
    
    // Filter pesanan & pengeluaran yang terjadi SEJAK SHIFT DIBUKA (bukan seluruh pesanan hari ini)
    const allPesanan = this.getPesanan().filter(p => new Date(p.created_at).getTime() >= shiftBukaTime);
    const totalTunai = allPesanan
      .filter(p => p && p.pembayaran_details && Array.isArray(p.pembayaran_details) && p.pembayaran_details.some(d => d && d.metode === 'tunai'))
      .reduce((acc, p) => acc + (p.total_akhir || 0), 0);
    const totalNonTunai = allPesanan
      .filter(p => p && p.pembayaran_details && Array.isArray(p.pembayaran_details) && p.pembayaran_details.some(d => d && d.metode !== 'tunai' && d.metode !== 'hutang'))
      .reduce((acc, p) => acc + (p.total_akhir || 0), 0);

    const allPengeluaran = this.getPengeluaran().filter(p => new Date(p.tanggal).getTime() >= shiftBukaTime);
    const totalKeluar = allPengeluaran
      .filter(p => p.tipe_arus_kas !== 'masuk' && p.kategori !== 'pengembalian_kasbon')
      .reduce((acc, p) => acc + (p.nominal || 0), 0);
    const totalPengembalian = allPengeluaran
      .filter(p => p.tipe_arus_kas === 'masuk' || p.kategori === 'pengembalian_kasbon')
      .reduce((acc, p) => acc + (p.nominal || 0), 0);

    const ekspektasiKas = (target.saldo_awal + totalTunai + totalPengembalian) - totalKeluar;
    const selisihKas = saldoAkhirAktual - ekspektasiKas;
    const totalPemakaianAir = Math.max(0, meterAkhir - (target.meter_awal || 0));

    target.waktu_tutup = new Date().toISOString();
    target.saldo_akhir_aktual = saldoAkhirAktual;
    target.meter_akhir = meterAkhir;
    target.total_pemakaian_air_liter = totalPemakaianAir;
    target.total_tunai_masuk = totalTunai;
    target.total_non_tunai = totalNonTunai;
    target.selisih = selisihKas;
    target.status = 'tutup';

    this.saveShiftList(list);

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
    factoryAll?: boolean;
  }) {
    if (typeof window === 'undefined') return;

    if (options.factoryAll) {
      // Ditulis ulang ke nilai awal (bukan dihapus) supaya reset ikut tersinkron ke perangkat lain
      this.persist('depo_pesanan', INITIAL_PESANAN);
      this.persist('depo_produk', INITIAL_PRODUK);
      this.persist('depo_zona', INITIAL_ZONA);
      this.persist('depo_pengeluaran', []);
      this.persist('depo_hutang_toko', []);
      this.persist('depo_shift', []);

      const cleanKontak = INITIAL_KONTAK.map(k => ({ ...k, hutang_saat_ini: 0, galon_dipinjam: 0 }));
      this.persist('depo_kontak', cleanKontak);

      this.persist('depo_pengaturan', { ...INITIAL_PENGATURAN, galon_pinjaman_pelanggan: [] });

      window.dispatchEvent(new Event('depo_pesanan_updated'));
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
      this.persist('depo_pengeluaran', []);
      this.persist('depo_hutang_toko', []);
      this.persist('depo_shift', []);

      // Reset all contact debts & borrowed galons
      const currentKontak = this.getKontak();
      const cleanKontak = currentKontak.map(k => ({ ...k, hutang_saat_ini: 0, galon_dipinjam: 0 }));
      this.persist('depo_kontak', cleanKontak);

      // Clear borrowed galons
      const p = this.getPengaturan();
      p.galon_pinjaman_pelanggan = [];
      this.savePengaturan(p);

      window.dispatchEvent(new Event('depo_pesanan_updated'));
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
        this.persist('depo_shift', []);
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
