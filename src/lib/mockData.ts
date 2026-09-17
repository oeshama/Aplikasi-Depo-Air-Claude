import { Produk, ZoneOngkir, Kontak, UserApp, PengaturanDepo, Pesanan } from './types';

export const INITIAL_PENGATURAN: PengaturanDepo = {
  nama_depo: "Depo Air Clean & Fresh",
  nama_owner: "Owner Budi",
  password_owner: "123456",
  tagline: "Air Isi Ulang Higienis & Berkualitas",
  alamat: "Jl. Merdeka No. 45, Jakarta",
  no_wa: "081234567890",
  target_loyalitas_galon: 10,
  target_omzet_harian: 500000,
  target_galon_harian: 50,
  target_omzet_mingguan: 3500000,
  target_galon_mingguan: 350,
  target_omzet_bulanan: 15000000,
  target_galon_bulanan: 1500,
  target_omzet_tahunan: 180000000,
  target_galon_tahunan: 18000,
  header_struk: "DEPO AIR CLEAN & FRESH\nJl. Merdeka No. 45, WA: 0812-3456-7890",
  footer_struk: "Terima Kasih Atas Kunjungan Anda!\nAir Sehat Untuk Keluarga Sehat.",
  logo_url: "",
  min_stok_air_baku_liter: 2000,
  stok_air_baku_saat_ini: 4200,
  notifikasi_air_baku_aktif: true,
  notifikasi_alarm_aktif: true,
  batas_keterlambatan_menit: 90,
  durasi_snooze_menit: 15,
  mode_suara_alarm: 'beep_suara',
  stok_galon_milik_depo: 500,
  stok_galon_di_depo: 360,
  stok_galon_rusak: 15,
  meteran_air_awal_liter: 125000,
  galon_pinjaman_pelanggan: [],
  komponen_servis_list: [
    {
      id: 'komp-1',
      nama_komponen: 'Filter Spun 0.1 Micron',
      batas_liter: 5000,
      liter_terakhir_ganti: 4500,
      stok_komponen: 8,
      keterangan: 'Filter penyaring mikro bagian depan dispenser',
      aktif: true
    },
    {
      id: 'komp-2',
      nama_komponen: 'Lampu UV Sterilisasi 30W',
      batas_liter: 20000,
      liter_terakhir_ganti: 18500,
      stok_komponen: 3,
      keterangan: 'Lampu sterilisasi pembunuh bakteri',
      aktif: true
    },
    {
      id: 'komp-3',
      nama_komponen: 'Back Wash Sand & Carbon Filter',
      batas_liter: 2500,
      liter_terakhir_ganti: 2400,
      stok_komponen: 2,
      keterangan: 'Cuci & bilas tabung media utama',
      aktif: true
    }
  ],
  karyawan_list: [
    {
      id: 'kary-1',
      nama: 'Doni Pengantar',
      jabatan: 'Pengantar / Driver',
      no_hp: '0844444444',
      alamat: 'Jl. Merpati RT 03/05',
      tanggal_masuk: '2025-01-15',
      gaji_basic: 2200000,
      uang_makan_per_hari: 25000,
      tanggal_jatuh_tempo_gaji: 25,
      password: '123456',
      aktif: true
    },
    {
      id: 'kary-2',
      nama: 'Andi Kasir',
      jabatan: 'Kasir POS',
      no_hp: '0833333333',
      alamat: 'Jl. Mawar No. 10',
      tanggal_masuk: '2025-03-01',
      gaji_basic: 2500000,
      uang_makan_per_hari: 30000,
      tanggal_jatuh_tempo_gaji: 25,
      password: '123456',
      aktif: true
    },
    {
      id: 'kary-3',
      nama: 'Siti Admin',
      jabatan: 'Admin Depo',
      no_hp: '0822222222',
      alamat: 'Jl. Melati No. 8',
      tanggal_masuk: '2024-11-01',
      gaji_basic: 2800000,
      uang_makan_per_hari: 30000,
      tanggal_jatuh_tempo_gaji: 25,
      password: '123456',
      aktif: true
    }
  ]
};

export const DEMO_USERS: UserApp[] = [];

export const INITIAL_PRODUK: Produk[] = [
  {
    id: 'prod-1',
    nama_produk: 'Botol 1.5L',
    jenis_wadah: 'botol',
    volume_liter: 1.5,
    satuan_jual: 'botol',
    harga_tempat: 1000,
    harga_antar: 1000,
    stok_saat_ini: 150,
    stok_minimum: 20,
    dihitung_poin_loyalitas: false,
    adalah_galon: false,
    ada_tukar_galon: false,
    kena_ongkir: false,
    aktif: true
  },
  {
    id: 'prod-2',
    nama_produk: 'Jerigen 4L',
    jenis_wadah: 'jerigen',
    volume_liter: 4.0,
    satuan_jual: 'jerigen',
    harga_tempat: 2000,
    harga_antar: 2000,
    stok_saat_ini: 80,
    stok_minimum: 15,
    dihitung_poin_loyalitas: false,
    adalah_galon: false,
    ada_tukar_galon: false,
    kena_ongkir: false,
    aktif: true
  },
  {
    id: 'prod-3',
    nama_produk: 'Jerigen 10L',
    jenis_wadah: 'jerigen',
    volume_liter: 10.0,
    satuan_jual: 'jerigen',
    harga_tempat: 4000,
    harga_antar: 4000,
    stok_saat_ini: 50,
    stok_minimum: 10,
    dihitung_poin_loyalitas: false,
    adalah_galon: false,
    ada_tukar_galon: false,
    kena_ongkir: false,
    aktif: true
  },
  {
    id: 'prod-4',
    nama_produk: 'Jerigen 30L',
    jenis_wadah: 'jerigen',
    volume_liter: 30.0,
    satuan_jual: 'jerigen',
    harga_tempat: 9000,
    harga_antar: 9000,
    stok_saat_ini: 30,
    stok_minimum: 5,
    dihitung_poin_loyalitas: false,
    adalah_galon: false,
    ada_tukar_galon: false,
    kena_ongkir: true, // KENA ONGKIR
    aktif: true
  },
  {
    id: 'prod-5',
    nama_produk: 'Galon 15L',
    jenis_wadah: 'galon',
    volume_liter: 15.0,
    satuan_jual: 'galon',
    harga_tempat: 5500,
    harga_antar: 5500,
    stok_saat_ini: 120,
    stok_minimum: 25,
    dihitung_poin_loyalitas: true, // POIN LOYALITAS
    adalah_galon: true,
    ada_tukar_galon: true,
    kena_ongkir: true, // KENA ONGKIR
    aktif: true
  },
  {
    id: 'prod-6',
    nama_produk: 'Galon 19L',
    jenis_wadah: 'galon',
    volume_liter: 19.0,
    satuan_jual: 'galon',
    harga_tempat: 6500,
    harga_antar: 6500,
    stok_saat_ini: 200,
    stok_minimum: 40,
    dihitung_poin_loyalitas: true, // POIN LOYALITAS
    adalah_galon: true,
    ada_tukar_galon: true,
    kena_ongkir: true, // KENA ONGKIR
    aktif: true
  }
];

export const INITIAL_ZONA: ZoneOngkir[] = [
  { id: 'zn-1', nama_zona: 'Zona 1 (≤ 1 km)', keterangan: 'Area dekat depo', tarif_per_galon: 1500, aktif: true, urutan: 1 },
  { id: 'zn-2', nama_zona: 'Zona 2 (1 - 3 km)', keterangan: 'Area perumahan sedang', tarif_per_galon: 3000, aktif: true, urutan: 2 },
  { id: 'zn-3', nama_zona: 'Zona 3 (3 - 5 km)', keterangan: 'Area perumahan jauh', tarif_per_galon: 4500, aktif: true, urutan: 3 },
  { id: 'zn-4', nama_zona: 'Zona 4 (> 5 km)', keterangan: 'Luar jangkauan umum', tarif_per_galon: 6000, aktif: true, urutan: 4 },
];

export const INITIAL_KONTAK: Kontak[] = [
  {
    id: 'kt-1',
    nama: 'Walk-in Pelanggan Biasa',
    tipe: 'pelanggan',
    no_hp: '-',
    alamat: 'Datang Sendiri Ke Depo',
    aktif: true,
    limit_hutang: 0,
    hutang_saat_ini: 0
  },
  {
    id: 'kt-2',
    nama: 'Pak Hendra (Kompleks Merpati)',
    tipe: 'pelanggan',
    no_hp: '081298765432',
    alamat: 'Jl. Merpati No. 12, RT 02/05',
    alamat_maps: 'https://maps.google.com/?q=-6.200000,106.816666',
    lat: -6.200000,
    lng: 106.816666,
    galon_per_minggu: 4,
    qr_code: 'QR-PELANGGAN-002',
    aktif: true,
    limit_hutang: 100000,
    hutang_saat_ini: 0
  },
  {
    id: 'kt-3',
    nama: 'Ibu Ratna (Warteg Merdeka)',
    tipe: 'pelanggan',
    no_hp: '085711223344',
    alamat: 'Jl. Merdeka Barat No. 88',
    galon_per_minggu: 10,
    aktif: true,
    limit_hutang: 200000,
    hutang_saat_ini: 0
  },
  {
    id: 'kt-4',
    nama: 'Toko Berkah (Reseller Pak Agus)',
    tipe: 'reseller',
    no_hp: '081377889900',
    alamat: 'Pasar Baru Blok C No. 5',
    aktif: true,
    limit_hutang: 500000,
    hutang_saat_ini: 0
  }
];

export const INITIAL_PESANAN: Pesanan[] = [
  {
    id: 'psn-101',
    no_nota: 'INV-20260905-786',
    kontak_id: 'kt-2',
    nama_pelanggan: 'Pak Hendra (Kompleks Merpati)',
    tipe_transaksi: 'tukar_galon',
    items: [
      {
        id: 'item-1',
        produk_id: 'prod-6',
        nama_produk: 'Galon 19L',
        jumlah: 3,
        harga_satuan: 6500,
        subtotal: 19500,
        dihitung_ongkir: true
      }
    ],
    subtotal_produk: 19500,
    zone_ongkir_id: 'zn-2',
    tarif_ongkir_per_unit: 3000,
    total_unit_ongkir: 3,
    total_ongkir: 9000,
    diskon: 0,
    total_akhir: 28500,
    status_pesanan: 'dalam_perjalanan',
    status_pembayaran: 'belum_bayar',
    pembayaran_details: [],
    total_dibayar: 0,
    sisa_hutang: 28500,
    kasir_id: 'usr-3',
    pengantar_id: 'usr-4',
    catatan: 'Tukar 3 galon kosong di rumah',
    created_at: new Date(Date.now() - 105 * 60 * 1000).toISOString() // 1 Jam 45 Mnt lalu (> 1.5 Jam - Alarm Active!)
  },
  {
    id: 'psn-102',
    no_nota: 'INV-20260905-787',
    kontak_id: 'kt-3',
    nama_pelanggan: 'Ibu Ratna (Warteg Merdeka)',
    tipe_transaksi: 'tukar_galon',
    items: [
      {
        id: 'item-2',
        produk_id: 'prod-6',
        nama_produk: 'Galon 19L',
        jumlah: 5,
        harga_satuan: 6500,
        subtotal: 32500,
        dihitung_ongkir: true
      }
    ],
    subtotal_produk: 32500,
    zone_ongkir_id: 'zn-1',
    tarif_ongkir_per_unit: 1500,
    total_unit_ongkir: 5,
    total_ongkir: 7500,
    diskon: 0,
    total_akhir: 40000,
    status_pesanan: 'dijadwalkan',
    status_pembayaran: 'belum_bayar',
    pembayaran_details: [],
    total_dibayar: 0,
    sisa_hutang: 40000,
    kasir_id: 'usr-3',
    pengantar_id: 'usr-4',
    catatan: 'Antar siang hari',
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString() // 35 Mnt lalu (Normal)
  },
  {
    id: 'psn-103',
    no_nota: 'INV-20260905-700',
    kontak_id: 'kt-4',
    nama_pelanggan: 'Toko Berkah (Reseller Pak Agus)',
    tipe_transaksi: 'isi_langsung',
    items: [
      {
        id: 'item-3',
        produk_id: 'prod-6',
        nama_produk: 'Galon 19L',
        jumlah: 10,
        harga_satuan: 6000,
        subtotal: 60000,
        dihitung_ongkir: false
      }
    ],
    subtotal_produk: 60000,
    tarif_ongkir_per_unit: 0,
    total_unit_ongkir: 0,
    total_ongkir: 0,
    diskon: 0,
    total_akhir: 60000,
    status_pesanan: 'terkirim',
    status_pembayaran: 'lunas',
    pembayaran_details: [{ metode: 'tunai', jumlah: 60000 }],
    total_dibayar: 60000,
    sisa_hutang: 0,
    kasir_id: 'usr-3',
    pengantar_id: 'usr-4',
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(), // 3 Jam lalu
    terkirim_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 Jam lalu (Durasi: 2 Jam)
  },
  {
    id: 'psn-demo-mingguan-1',
    no_nota: 'INV-20260903-512',
    kontak_id: 'kt-2',
    nama_pelanggan: 'Pak Hendra (Kompleks Merpati)',
    tipe_transaksi: 'tukar_galon',
    items: [
      {
        id: 'item-d1',
        produk_id: 'prod-6',
        nama_produk: 'Galon 19L',
        jumlah: 20,
        harga_satuan: 6500,
        subtotal: 130000,
        dihitung_ongkir: true
      }
    ],
    subtotal_produk: 130000,
    tarif_ongkir_per_unit: 1500,
    total_unit_ongkir: 20,
    total_ongkir: 30000,
    diskon: 0,
    total_akhir: 160000,
    status_pesanan: 'terkirim',
    status_pembayaran: 'lunas',
    pembayaran_details: [{ metode: 'tunai', jumlah: 160000 }],
    total_dibayar: 160000,
    sisa_hutang: 0,
    kasir_id: 'usr-3',
    pengantar_id: 'usr-4',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 hari lalu
    terkirim_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString()
  },
  {
    id: 'psn-demo-mingguan-2',
    no_nota: 'INV-20260901-304',
    kontak_id: 'kt-3',
    nama_pelanggan: 'Ibu Ratna (Warteg Merdeka)',
    tipe_transaksi: 'tukar_galon',
    items: [
      {
        id: 'item-d2',
        produk_id: 'prod-6',
        nama_produk: 'Galon 19L',
        jumlah: 15,
        harga_satuan: 6500,
        subtotal: 97500,
        dihitung_ongkir: true
      }
    ],
    subtotal_produk: 97500,
    tarif_ongkir_per_unit: 1500,
    total_unit_ongkir: 15,
    total_ongkir: 22500,
    diskon: 0,
    total_akhir: 120000,
    status_pesanan: 'terkirim',
    status_pembayaran: 'lunas',
    pembayaran_details: [{ metode: 'tunai', jumlah: 120000 }],
    total_dibayar: 120000,
    sisa_hutang: 0,
    kasir_id: 'usr-3',
    pengantar_id: 'usr-4',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 hari lalu
    terkirim_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3600000).toISOString()
  },
  {
    id: 'psn-demo-bulanan-1',
    no_nota: 'INV-20260825-991',
    kontak_id: 'kt-4',
    nama_pelanggan: 'Toko Berkah (Reseller Pak Agus)',
    tipe_transaksi: 'isi_langsung',
    items: [
      {
        id: 'item-d3',
        produk_id: 'prod-6',
        nama_produk: 'Galon 19L',
        jumlah: 30,
        harga_satuan: 6000,
        subtotal: 180000,
        dihitung_ongkir: false
      }
    ],
    subtotal_produk: 180000,
    tarif_ongkir_per_unit: 0,
    total_unit_ongkir: 0,
    total_ongkir: 0,
    diskon: 0,
    total_akhir: 180000,
    status_pesanan: 'terkirim',
    status_pembayaran: 'lunas',
    pembayaran_details: [{ metode: 'tunai', jumlah: 180000 }],
    total_dibayar: 180000,
    sisa_hutang: 0,
    kasir_id: 'usr-3',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 hari lalu
    terkirim_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000 + 3600000).toISOString()
  }
];
