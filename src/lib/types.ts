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
  galon_per_minggu?: number;
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
  target_loyalitas_galon: number;
  target_omzet_harian?: number;
  target_galon_harian?: number;
  target_omzet_mingguan?: number;
  target_galon_mingguan?: number;
  target_omzet_bulanan?: number;
  target_galon_bulanan?: number;
  target_omzet_tahunan?: number;
  target_galon_tahunan?: number;
  header_struk: string;
  footer_struk: string;
  logo_url?: string;
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
  status: 'buka' | 'tutup';
}

export type Tunai = number;

export interface Pengeluaran {
  id: string;
  tanggal: string;
  nominal: number;
  peruntukan: string;
  kategori?: string; // 'operasional' | 'lain_lain' | 'konsumsi' | 'bensin' | 'ongkir' | 'gaji' | 'kasbon' | 'pengembalian_kasbon' | 'pembelian_air_baku'
  karyawan_id?: string;
  karyawan_nama?: string;
  tipe_arus_kas?: 'keluar' | 'masuk';
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
