export type UserRole = 'owner' | 'admin' | 'kasir' | 'pengantar';

export interface UserApp {
  id: string;
  nama: string;
  username: string;
  role: UserRole;
  no_hp?: string;
  password?: string;
  aktif: boolean;
  last_login?: string;
}

export type TipeKontak = 'pelanggan' | 'reseller';

export interface Kontak {
  id: string;
  nama: string;
  tipe: TipeKontak;
  no_hp: string;
  alamat: string;
  alamat_maps?: string;
  lat?: number;
  lng?: number;
  // Zona ongkir langganan pelanggan ini (id dari ZoneOngkir); kosong = belum ditentukan
  zona_id?: string;
  // Harga khusus pelanggan/reseller per produk (id produk -> harga satuan). Produk yang tidak ada di sini memakai harga umum.
  harga_khusus?: Record<string, number>;
  galon_per_minggu?: number;
  token_pesan?: string;   // kode rahasia untuk tautan pesan pribadi (/pesan?p=...)
  qr_code?: string;
  pesanan_terakhir?: any;
  aktif: boolean;
  limit_hutang?: number;
  hutang_saat_ini?: number;
  galon_dipinjam?: number;
}

export type JenisWadah = 'botol' | 'jerigen' | 'galon';

export interface Produk {
  id: string;
  nama_produk: string;
  jenis_wadah: JenisWadah;
  volume_liter: number;
  satuan_jual: string;
  harga_tempat: number;
  harga_antar?: number;
  stok_saat_ini?: number;
  stok_minimum?: number;
  dihitung_poin_loyalitas: boolean;
  adalah_galon: boolean;
  ada_tukar_galon: boolean;
  kena_ongkir: boolean;
  aktif: boolean;
  gambar_url?: string;
}

export interface HargaReseller {
  id: string;
  kontak_id: string;
  produk_id: string;
  harga_khusus: number;
}

export interface ZoneOngkir {
  id: string;
  nama_zona: string;
  keterangan: string;
  tarif_per_galon: number;
  aktif: boolean;
  urutan: number;
  // Batas jarak zona dari depo (km, garis lurus). null = tanpa batas (zona terjauh).
  // Kosong/tidak ada = memakai nilai bawaan (lihat jarakZonaKm di lib/geo.ts)
  jarak_maks_km?: number | null;
}

export type TipeTransaksi = 'isi_langsung' | 'tukar_galon' | 'titip_galon' | 'pinjam_galon' | 'pelunasan_hutang';
export type StatusPesanan = 'pending' | 'dijadwalkan' | 'dalam_perjalanan' | 'terkirim' | 'selesai' | 'batal';
export type StatusPembayaran = 'lunas' | 'belum_bayar' | 'dp' | 'hutang';
export type MetodePembayaran = 'tunai' | 'qris' | 'transfer' | 'edc' | 'hutang' | 'dp' | 'split';

export interface PesananItem {
  id: string;
  produk_id: string;
  nama_produk: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
  dihitung_ongkir: boolean;
  harga_khusus?: boolean;   // harga satuan ini harga khusus pelanggan, bukan harga umum
}

export interface PembayaranDetail {
  metode: MetodePembayaran;
  jumlah: number;
  catatan?: string;
}

export interface Pesanan {
  id: string;
  no_nota: string;
  kontak_id?: string;
  nama_pelanggan: string;
  tipe_transaksi: TipeTransaksi;
  items: PesananItem[];
  subtotal_produk: number;
  zone_ongkir_id?: string;
  tarif_ongkir_per_unit: number;
  total_unit_ongkir: number;
  total_ongkir: number;
  diskon: number;
  total_akhir: number;
  status_pesanan: StatusPesanan;
  status_pembayaran: StatusPembayaran;
  pembayaran_details: PembayaranDetail[];
  total_dibayar: number;
  sisa_hutang: number;
  kasir_id: string;
  pengantar_id?: string;
  catatan?: string;
  created_at: string;
  terkirim_at?: string;
  // Pesanan antar bayar tunai: uangnya diterima kurir dulu, baru masuk laci saat kurir menyetor
  bayar_ke_kurir?: boolean;
  kurir_uang_diterima?: number;   // tunai yang benar-benar diterima kurir dari pelanggan
  kurir_diterima_at?: string;
}

// Setoran uang dari kurir ke kasir (boleh kapan saja, berapa saja)
export interface KoreksiSetoran {
  waktu: string;
  dari: number;
  ke: number;
  oleh: string;
  alasan: string;
}

export interface SetoranKurir {
  id: string;
  tanggal: string;
  kurir_id: string;
  kurir_nama: string;
  nominal: number;
  kasir_id: string;
  kasir_nama: string;
  catatan?: string;
  dibatalkan?: boolean;
  riwayat_koreksi?: KoreksiSetoran[];
}

// Pemberitahuan untuk owner/admin di dashboard (mis. kasir mengoreksi setoran)
export interface NotifikasiOwner {
  id: string;
  waktu: string;
  jenis: 'koreksi_setoran' | 'pembatalan_setoran' | 'setoran_owner' | 'selisih_setoran_owner';
  judul: string;
  pesan: string;
  dibaca: boolean;
  dibuat_oleh: string;
}

// Uang dari laci kasir ke owner: kasir menyerahkan (menunggu diterima) atau owner mengambil langsung.
// Begitu dicatat, uangnya keluar dari hitungan laci. Selisih saat diterima dicatat atas nama kasir.
export interface SetoranOwner {
  id: string;
  waktu: string;
  jenis: 'serah_kasir' | 'ambil_owner';
  kasir_id: string;
  kasir_nama: string;
  shift_id?: string;
  saat_tutup?: boolean;            // diserahkan saat tutup shift (setelah uang laci dihitung)
  nominal: number;                 // yang diserahkan kasir / diambil owner
  status: 'menunggu' | 'diterima' | 'dibatalkan';
  nominal_diterima?: number;       // yang benar-benar diterima owner
  selisih?: number;                // diterima - nominal (negatif = kurang)
  diterima_oleh?: string;
  diterima_at?: string;
  catatan?: string;
}

// Pesanan yang dikirim pelanggan lewat halaman publik /pesan. Selalu menunggu konfirmasi kasir dulu;
// setelah dikonfirmasi baru dibuatkan pesanan antar biasa (pesanan_id).
export interface PesananMasuk {
  id: string;
  no: string;                    // kode pendek untuk pelanggan dan kasir, mis. K7M2
  waktu: string;                 // ISO, waktu pesanan dikirim
  nama: string;
  no_hp: string;                 // format 62812...
  alamat: string;
  lat?: number;
  lng?: number;
  items: { produk_id: string; nama_produk: string; jumlah: number }[];
  waktu_antar: string;           // 'secepatnya' atau teks jam
  bayar: 'tunai' | 'transfer';   // pilihan pelanggan; cara bayar sebenarnya dicatat kurir saat sampai
  catatan?: string;
  status: 'baru' | 'dikonfirmasi' | 'ditolak';
  // Diisi kasir
  diproses_at?: string;
  diproses_oleh?: string;
  estimasi_tiba?: string;        // ISO
  pesanan_id?: string;
  kontak_id?: string;
  alasan_tolak?: string;
  // Pelacakan oleh pelanggan (/pesan/status?s=lacak)
  lacak?: string;
  tahap?: 'dikonfirmasi' | 'diantar' | 'terkirim' | 'batal';
  terkirim_at?: string;
  kontak_id_tautan?: string;     // pesanan dikirim lewat tautan pribadi pelanggan ini
}

// Data minimal yang dibutuhkan halaman publik untuk tautan pribadi pelanggan langganan. Kuncinya (id) adalah kode rahasia.
export interface TautanPesan {
  id: string;
  kontak_id: string;
  nama: string;
  hp: string;                    // format 62812...
  alamat: string;
  lat?: number;
  lng?: number;
  items: { produk_id: string; jumlah: number }[];   // pesanan biasanya
  aktif: boolean;
}

// Ringkasan toko yang boleh dilihat publik (tanpa harga khusus pelanggan), disinkronkan dari aplikasi
export interface Etalase {
  aktif: boolean;
  nama: string;
  wa: string;
  produk: { id: string; nama: string; volume_liter: number; harga: number }[];
}

// Uang pegangan: uang dari kas besar owner yang dipegang seorang kasir di luar laci (mis. untuk beli air baku).
// 'beri' = owner memberi (kasir harus menerima dulu), 'kembali' = kasir mengembalikan sisa (owner harus menerima).
export interface UangPegangan {
  id: string;
  waktu: string;
  jenis: 'beri' | 'kembali';
  kasir_id: string;
  kasir_nama: string;
  nominal: number;
  tujuan?: string;
  status: 'menunggu' | 'diterima' | 'dibatalkan';
  diterima_at?: string;
  oleh: string;
}

// Asal uang pengeluaran: hanya 'laci' yang mengurangi kas laci kasir; 'pegangan' memakai uang pegangan kasir
export type SumberKas = 'laci' | 'kas_besar' | 'rekening' | 'pegangan';

// Rekening bank / dompet digital milik usaha (saldo dihitung dari saldo awal + semua mutasi)
export interface Rekening {
  id: string;
  nama: string;
  aktif: boolean;
}

export type JenisMutasi =
  | 'saldo_awal' | 'tambah_modal' | 'prive' | 'setor_bank' | 'tarik_bank'
  | 'transfer_rekening' | 'modal_laci' | 'koreksi';

// Catatan manual keluar/masuk uang di kas besar atau rekening. akun = 'kas_besar' atau id rekening.
export interface MutasiKeuangan {
  id: string;
  waktu: string;
  akun: string;
  arah: 'masuk' | 'keluar';
  nominal: number;
  jenis: JenisMutasi;
  keterangan?: string;
  pasangan_id?: string;   // transaksi dua sisi (setor bank, transfer rekening)
  dipakai?: boolean;      // modal_laci: sudah dipakai sebagai modal awal shift
  oleh: string;
}

// Saldo uang tunai yang sedang dibawa satu kurir (belum disetor ke kasir)
export interface SaldoKurir {
  kurir_id: string;
  kurir_nama: string;
  uang_diterima: number;
  disetor: number;
  saldo: number;
}

export interface TitipGalon {
  id: string;
  nomor_tiket: string;
  nama_pelanggan: string;
  no_hp?: string;
  jumlah_galon: number;
  catatan?: string;
  status: 'dititipkan' | 'diambil' | 'batal';
  created_at: string;
}

export interface KomponenServis {
  id: string;
  nama_komponen: string;
  batas_liter: number;
  liter_terakhir_ganti: number;
  keterangan?: string;
  stok_komponen?: number;
  aktif: boolean;
}

export interface Karyawan {
  id: string;
  nama: string;
  jabatan: string;
  no_hp: string;
  alamat?: string;
  tanggal_masuk: string;
  gaji_basic: number;
  uang_makan_per_hari: number;
  insentif_per_galon?: number;
  tanggal_jatuh_tempo_gaji?: number;
  password?: string;
  aktif: boolean;
}

export interface GalonPinjamanPelanggan {
  id: string;
  kontak_id?: string;
  nama_pelanggan: string;
  jumlah_galon: number;
  catatan?: string;
  tanggal_pinjam?: string;
}

export interface PengaturanDepo {
  nama_depo: string;
  nama_owner?: string;
  password_owner?: string;
  tagline: string;
  alamat: string;
  no_wa: string;
  pesan_online_aktif?: boolean;   // halaman pesan online untuk pelanggan (/pesan) dibuka atau ditutup
  wa_business?: string;           // nomor WhatsApp Business untuk pesanan online, format 62812...
  target_loyalitas_galon: number;
  target_omzet_harian?: number;
  target_galon_harian?: number;
  target_omzet_mingguan?: number;
  target_galon_mingguan?: number;
  target_omzet_bulanan?: number;
  target_galon_bulanan?: number;
  target_omzet_tahunan?: number;
  target_galon_tahunan?: number;
  // Target volume penjualan dalam liter (kosong = target galon x 19 liter)
  target_liter_harian?: number;
  target_liter_mingguan?: number;
  target_liter_bulanan?: number;
  target_liter_tahunan?: number;
  header_struk: string;
  footer_struk: string;
  logo_url?: string;
  // Printer struk: dialog browser atau aplikasi RawBT (Android, printer Bluetooth); lebar kertas; cetak otomatis; laci kas
  printer_metode?: 'dialog' | 'rawbt';
  printer_lebar_mm?: 58 | 80;
  printer_cetak_otomatis?: boolean;
  printer_buka_laci?: boolean;
  // Foto meteran air depo saat buka/tutup shift: wajib, opsional (boleh dilewati), atau nonaktif. Kosong = opsional.
  foto_meter_mode?: ModeFotoMeter;
  // Koordinat depo (untuk peta sebaran pelanggan dan validasi zona ongkir)
  lokasi_depo_lat?: number;
  lokasi_depo_lng?: number;
  // Keuangan Owner: pencatatan dimulai tanggal ini; penjualan non-tunai sebelum itu tidak dihitung
  keuangan_mulai?: string;
  // Rekening tujuan uang dari tiap metode non-tunai
  rekening_metode?: { transfer?: string; qris?: string; edc?: string };
  min_stok_air_baku_liter: number;
  stok_air_baku_saat_ini: number;
  notifikasi_air_baku_aktif?: boolean;
  // Settings Notifikasi Alarm & Keterlambatan Pengiriman
  notifikasi_alarm_aktif?: boolean;
  batas_keterlambatan_menit?: number;
  durasi_snooze_menit?: number;
  mode_suara_alarm?: 'beep_suara' | 'silent';
  // Stok Opname & Aset Depo
  stok_galon_milik_depo?: number;
  stok_galon_di_depo?: number;
  stok_galon_rusak?: number;
  meteran_air_awal_liter?: number;
  galon_pinjaman_pelanggan?: GalonPinjamanPelanggan[];
  komponen_servis_list: KomponenServis[];
  karyawan_list: Karyawan[];
}

export interface ShiftKasir {
  id: string;
  kasir_id: string;
  kasir_nama?: string;
  waktu_buka: string;
  waktu_tutup?: string;
  saldo_awal: Tunai;
  meter_awal?: number;
  total_tunai_masuk: number;
  total_non_tunai: number;
  saldo_akhir_aktual?: number;
  meter_akhir?: number;
  total_pemakaian_air_liter?: number;
  selisih?: number;
  total_setoran_kurir?: number;        // setoran kurir yang diterima selama shift ini
  uang_di_kurir_saat_tutup?: number;   // uang tunai yang masih dibawa kurir saat shift ditutup
  total_diserahkan_owner?: number;     // uang laci yang diserahkan ke owner selama shift (termasuk saat tutup)
  sisa_laci_saat_tutup?: number;       // uang yang tetap di laci setelah tutup shift
  status: 'buka' | 'tutup';
}

export type Tunai = number;

export type ModeFotoMeter = 'wajib' | 'opsional' | 'nonaktif';

// Foto meteran air depo untuk satu shift (awal saat buka, akhir saat tutup). Gambar dikecilkan dulu supaya ringan.
export interface FotoMeter {
  id: string;            // `${shift_id}-awal` atau `${shift_id}-akhir`
  shift_id: string;
  jenis: 'awal' | 'akhir';
  gambar: string;        // data URL JPEG
  waktu: string;
  oleh: string;
}

export interface Pengeluaran {
  id: string;
  tanggal: string;
  nominal: number;
  peruntukan: string;
  kategori?: string; // 'operasional' | 'lain_lain' | 'konsumsi' | 'bensin' | 'ongkir' | 'gaji' | 'kasbon' | 'pengembalian_kasbon' | 'pembelian_air_baku'
  karyawan_id?: string;
  karyawan_nama?: string;
  tipe_arus_kas?: 'keluar' | 'masuk';
  sumber_kas?: SumberKas; // kosong = laci (data lama)
  rekening_id?: string;   // bila sumber_kas = 'rekening'
  kasir_id: string;
  kasir_nama: string;
  catatan?: string;
  // Pembelian Air Baku Tangki
  nama_vendor_pengirim?: string;
  volume_air_masuk_liter?: number;
  harga_perolehan_air?: number;
  tips_sopir_pengirim?: number;
  meteran_waktu_diisi_liter?: number;
}

export type TipePihakHutang = 'karyawan' | 'orang_ketiga';

export interface HutangToko {
  id: string;
  tanggal: string;
  tipe_pihak: TipePihakHutang;
  karyawan_id?: string;
  nama_pihak: string;
  peruntukan: string;
  nominal_hutang: number;
  total_dibayar: number;
  sisa_hutang: number;
  status: 'belum_lunas' | 'lunas';
  kasir_id: string;
  kasir_nama: string;
  catatan?: string;
}
