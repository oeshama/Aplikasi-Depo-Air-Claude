import { UserRole } from './types';
import { AUTH_AKTIF } from './auth';

// Isi halaman Panduan. Setiap topik punya daftar peran: owner melihat semuanya, peran lain hanya topik miliknya.
// Nama tombol dan menu ditulis sama persis dengan yang tampil di aplikasi.

export interface Topik {
  id: string;
  kelompok: string;
  judul: string;
  ringkas: string;
  peran: UserRole[];
  langkah: string[];
  tips?: string[];
  hati?: string[];
  buka?: { href: string; label: string };
}

const SEMUA: UserRole[] = ['owner', 'admin', 'kasir', 'pengantar'];
const KASIR: UserRole[] = ['owner', 'kasir'];
const KASIR_ADMIN: UserRole[] = ['owner', 'admin', 'kasir'];
const OWNER: UserRole[] = ['owner'];
const OWNER_ADMIN: UserRole[] = ['owner', 'admin'];

export const URUTAN_KELOMPOK = [
  'Dasar',
  'Kasir: transaksi harian',
  'Kasir: uang dan shift',
  'Pengantar',
  'Pelanggan dan peta',
  'Pesanan online',
  'Owner: persiapan toko',
  'Owner: memantau usaha',
  'Owner: keuangan',
  'Bantuan',
];

// Urutan belajar yang disarankan untuk tiap peran (id topik)
export const URUTAN_BELAJAR: Record<UserRole, string[]> = {
  owner: ['masuk', 'layar', 'setup-awal', 'produk', 'zona', 'pengaturan-toko', 'karyawan', 'keuangan-mulai', 'dashboard-owner', 'laporan'],
  admin: ['masuk', 'layar', 'dashboard-admin', 'pelanggan', 'peta'],
  kasir: ['masuk', 'layar', 'buka-shift', 'menjual', 'antar', 'pengeluaran', 'tutup-shift'],
  pengantar: ['masuk', 'layar', 'antaran-lapangan', 'uang-kurir'],
};

export const TOPIK: Topik[] = [
  // ===================== DASAR =====================
  {
    id: 'masuk', kelompok: 'Dasar', judul: 'Masuk ke aplikasi dan keluar', peran: SEMUA,
    ringkas: 'Cara membuka aplikasi, masuk, dan keluar dengan aman.',
    langkah: AUTH_AKTIF ? [
      'Buka alamat aplikasi di HP atau komputer. Disarankan memakai Chrome.',
      'Isi "Email atau nama pengguna". Kalau Anda tidak punya email, ketik nama pengguna yang diberikan owner, tanpa tambahan apa pun.',
      'Isi "Password", lalu tekan "Masuk ke sistem". Masuk butuh internet.',
      'Untuk keluar, buka menu (tombol tiga garis di HP) lalu tekan "Keluar".',
    ] : [
      'Buka alamat aplikasi di HP atau komputer. Disarankan memakai Chrome.',
      'Pilih atau ketik nama Anda di kolom "Nama User / Karyawan".',
      'Isi "Password / PIN", lalu tekan tombol masuk.',
      'Untuk keluar, buka menu (tombol tiga garis di HP) lalu tekan "Keluar".',
    ],
    tips: [
      'Supaya terasa seperti aplikasi: di Chrome HP tekan titik tiga, lalu "Tambahkan ke layar utama".',
      'Masuk berlaku 12 jam. Setelah itu aplikasi meminta masuk lagi. Ini normal.',
      ...(AUTH_AKTIF ? ['Ganti password Anda sendiri lewat tombol "Ganti password" di menu. Gunakan minimal 8 karakter dan jangan sama dengan password di tempat lain.'] : []),
    ],
    hati: ['Jangan memberitahukan password ke orang lain. Kalau HP dipakai bergantian, selalu tekan "Keluar" saat selesai.'],
  },
  {
    id: 'layar', kelompok: 'Dasar', judul: 'Mengenal layar dan menu', peran: SEMUA,
    ringkas: 'Arti bagian-bagian di bar atas dan menu.',
    langkah: [
      'Bar atas menampilkan nama depo, status sambungan ("Tersinkron", "Mengirim ..." atau "Offline"), dan untuk kasir/owner tulisan "Kas di Tangan".',
      'Lonceng menunjukkan pemberitahuan. Angka merah di menu artinya ada yang perlu Anda kerjakan.',
      'Menu berisi halaman yang boleh dibuka sesuai peran Anda. Di HP, menu dibuka lewat tombol tiga garis.',
      'Tombol "Mode gelap" di menu mengganti tampilan terang atau gelap, berguna di tempat redup.',
    ],
    tips: [
      'Kalau ada menu yang tidak Anda temukan, kemungkinan memang bukan untuk peran Anda.',
      'Khusus owner: pilihan "Tampilan: Kasir / Admin / Pengantar" di menu memperlihatkan apa yang dilihat karyawan, berguna untuk melatih mereka.',
    ],
  },
  {
    id: 'offline', kelompok: 'Dasar', judul: 'Kalau internet putus', peran: SEMUA,
    ringkas: 'Aplikasi tetap bisa dipakai tanpa internet.',
    langkah: [
      'Saat internet putus, bar atas berubah menjadi "Offline" dan jumlah data yang menunggu terkirim, misalnya "Offline (5 antre)".',
      'Teruskan bekerja seperti biasa. Semua tercatat di perangkat Anda.',
      'Begitu internet kembali, data terkirim otomatis dan status berubah menjadi "Tersinkron". Perangkat lain ikut mendapat data terbaru.',
    ],
    hati: ['Selama masih ada antrean, jangan menghapus data browser dan jangan memakai mode penyamaran (incognito). Data yang belum terkirim bisa hilang.'],
  },

  {
    id: 'notifikasi-hp', kelompok: 'Dasar', judul: 'Notifikasi di HP (walau aplikasi tertutup)', peran: SEMUA,
    ringkas: 'HP berbunyi saat ada pesanan online, tanpa harus membuka aplikasi.',
    langkah: [
      'Masuk dengan akun Anda. Notifikasi hanya tersedia setelah masuk.',
      'Buka menu (tombol tiga garis di HP), lalu tekan "Aktifkan notifikasi". Saat Chrome bertanya, pilih "Izinkan".',
      'Tekan "Uji notifikasi". Dalam beberapa detik muncul notifikasi percobaan di layar. Kalau muncul, notifikasi sudah aktif.',
      'Siapa mendapat apa: kasir, owner, dan admin diberi tahu saat ada pesanan online baru. Pengantar diberi tahu saat kasir mengonfirmasi pesanan untuk diantar.',
      'Ketuk notifikasi untuk langsung membuka halaman yang tepat.',
      'Untuk berhenti, tekan "Matikan" di menu. Keluar dari akun juga menghentikan notifikasi di HP itu.',
    ],
    tips: [
      'Android: supaya tidak terlambat, izinkan Chrome berjalan di latar belakang dan jangan memakai penghemat baterai ketat untuk Chrome.',
      'Jangan "tutup paksa" Chrome dari daftar aplikasi terbaru. Beberapa HP lalu menghentikan notifikasi.',
    ],
    hati: ['Notifikasi dipasang per HP. Kalau Anda masuk di HP lain, aktifkan lagi di HP itu.'],
  },

  // ===================== KASIR: TRANSAKSI =====================
  {
    id: 'buka-shift', kelompok: 'Kasir: uang dan shift', judul: 'Buka shift', peran: KASIR,
    ringkas: 'Wajib dilakukan sebelum menerima pembayaran.',
    buka: { href: '/kasir', label: 'Buka POS Kasir' },
    langkah: [
      'Buka "POS Kasir". Kalau shift belum dibuka, muncul "Entri Buka Shift Kasir" atau tombol "Buka shift".',
      AUTH_AKTIF ? 'Nama Anda sudah terisi otomatis sebagai petugas shift, karena Anda sudah masuk dengan akun sendiri. Tidak perlu mengisi password lagi.' : 'Pilih nama Anda dan isi password.',
      'Isi "Modal Kas Awal di Laci": uang yang ada di laci saat Anda mulai. Hitung dulu uangnya.',
      'Isi "Meteran Air Awal Depo" sesuai angka di meteran air. Kalau diminta, foto meterannya.',
      'Tekan "Buka Shift Kasir & Cek Struk". Struk pembukaan bisa dicetak atau dikirim ke owner lewat WhatsApp.',
    ],
    tips: ['Kalau owner sudah menyiapkan "modal untuk laci", angkanya muncul otomatis di kolom modal awal.'],
  },
  {
    id: 'menjual', kelompok: 'Kasir: transaksi harian', judul: 'Menjual: dari memilih produk sampai struk', peran: KASIR,
    ringkas: 'Langkah transaksi biasa untuk pelanggan yang datang ke depo.',
    buka: { href: '/kasir', label: 'Buka POS Kasir' },
    langkah: [
      'Di "Pilih Produk", tekan tombol + pada produk yang dibeli. Tombol − untuk mengurangi.',
      'Tekan tombol hijau "Bayar" di bagian bawah. Lembar "Pembayaran" terbuka.',
      'Periksa daftar barang dan total. Ubah jumlahnya di sini kalau salah.',
      'Pilih cara bayar: Tunai, QRIS, Transfer, EDC Debit, atau Hutang.',
      'Untuk Tunai, isi "Uang diterima" atau tekan "Uang pas". Aplikasi menghitung kembalian.',
      'Tekan "Proses dan cetak struk". Selesai.',
    ],
    tips: [
      'Pelanggan umum yang membeli langsung tidak perlu dipilih namanya (otomatis "Walk-in").',
      'Pelanggan langganan dengan harga khusus otomatis ditagih harga khususnya; tampil tanda "harga khusus".',
    ],
    hati: ['Hutang hanya bisa untuk pelanggan terdaftar dan tidak boleh melebihi batas hutangnya.'],
  },
  {
    id: 'jenis-transaksi', kelompok: 'Kasir: transaksi harian', judul: 'Pelanggan baru dan jenis transaksi galon', peran: KASIR,
    ringkas: 'Memilih pelanggan, mendaftarkan yang baru, dan memilih Tukar, Isi, Titip, atau Pinjam Galon.',
    buka: { href: '/kasir', label: 'Buka POS Kasir' },
    langkah: [
      'Di lembar Pembayaran, tekan "Ubah" pada baris "Pelanggan dan jenis transaksi".',
      'Pilih nama di "Pelanggan / Reseller", atau tekan "Pelanggan baru" untuk mendaftarkan. Batas hutang pelanggan baru otomatis Rp 0 (tidak boleh berhutang).',
      'Pilih "Jenis transaksi": Tukar Galon (galon kosong ditukar galon isi), Isi Langsung (mengisi ulang galon pelanggan), Titip Galon (galon dititipkan untuk diisi), atau Pinjam Galon (meminjam galon milik depo).',
      'Pinjam Galon dan kirim antar hanya bisa untuk pelanggan terdaftar karena perlu tahu siapa dan di mana.',
    ],
    tips: ['Kalau pelanggan masih punya hutang, tampil kotak merah dengan tombol "Bayar utang".'],
  },
  {
    id: 'antar', kelompok: 'Kasir: transaksi harian', judul: 'Pesanan diantar ke rumah', peran: KASIR,
    ringkas: 'Mencatat pesanan antar, ongkir, dan menandai sudah terkirim.',
    buka: { href: '/kasir', label: 'Buka POS Kasir' },
    langkah: [
      'Di lembar Pembayaran buka "Ubah", pilih pelanggan terdaftar, lalu centang "Kirim antar ke rumah".',
      'Pilih "Zona ongkir tujuan". Kalau data pelanggan sudah punya zona, otomatis terisi. Tombol "Simpan zona ini ke data pelanggan" menyimpannya untuk berikutnya.',
      'Ongkir dihitung per unit galon sesuai zona, lalu ditambahkan ke total.',
      'Tekan "Proses dan cetak struk". Pesanan masuk ke daftar antaran.',
      'Untuk memantau, tekan tombol "Antaran" di bagian atas. Pesanan yang terlambat ditandai dan membunyikan alarm.',
      'Saat barang sampai, kurir menekan "Konfirmasi Terkirim & Terima Bayar" di aplikasinya. Kasir juga bisa menekan "Sudah terkirim" lalu memilih kurirnya.',
    ],
    tips: ['Untuk pembayaran tunai, uangnya dipegang kurir dulu. Kurir menyetor ke kasir lewat "Setoran kurir".'],
  },
  {
    id: 'setoran-kurir', kelompok: 'Kasir: uang dan shift', judul: 'Menerima setoran uang dari kurir', peran: KASIR,
    ringkas: 'Mencatat uang tunai hasil antaran yang diserahkan kurir.',
    buka: { href: '/kasir', label: 'Buka POS Kasir' },
    langkah: [
      'Tekan "Lainnya", lalu "Setoran kurir". Di situ terlihat uang yang masih dibawa tiap kurir.',
      'Pilih kurir dan isi jumlah uang yang benar-benar Anda terima, lalu simpan.',
      'Uang yang diterima masuk ke hitungan kas laci.',
    ],
    tips: ['Kurir boleh menyetor kapan saja dan berapa saja, tidak harus sekaligus.'],
  },
  {
    id: 'bayar-utang', kelompok: 'Kasir: transaksi harian', judul: 'Pelanggan membayar hutang', peran: KASIR,
    ringkas: 'Mencatat pelunasan hutang, penuh atau sebagian.',
    buka: { href: '/kasir', label: 'Buka POS Kasir' },
    langkah: [
      'Tekan "Lainnya", lalu "Bayar utang pelanggan". Atau tekan "Bayar utang" di kotak merah saat memilih pelanggan.',
      'Pilih pelanggan, isi nominal yang dibayar, dan pilih cara bayar.',
      'Untuk Tunai, isi uang yang diterima. Nominal tidak boleh melebihi total hutang.',
      'Simpan. Struk pelunasan bisa dicetak.',
    ],
  },
  {
    id: 'pengeluaran', kelompok: 'Kasir: uang dan shift', judul: 'Mencatat pengeluaran kas (termasuk beli air baku)', peran: KASIR,
    ringkas: 'Setiap uang yang keluar dari laci harus dicatat.',
    buka: { href: '/kasir', label: 'Buka POS Kasir' },
    langkah: [
      'Tekan "Lainnya", lalu "Catat pengeluaran kas".',
      'Pilih kategori: Operasional, Pembelian Air Baku, Ongkir, Bensin, Konsumsi, Lain-lain, dan seterusnya.',
      'Isi nominal dan keterangan.',
      'Untuk "Pembelian Air Baku", isi nama vendor atau sopir, volume air masuk (liter), harga air, tips sopir, dan angka meteran saat diisi. Stok air baku bertambah otomatis.',
      'Kalau Anda sedang memegang uang pegangan dari owner, muncul pilihan "Uang yang dipakai": uang laci atau uang pegangan.',
      'Simpan. Bukti pengeluaran bisa dicetak atau dikirim ke owner lewat WhatsApp.',
    ],
    hati: ['Pengeluaran dari uang laci mengurangi uang yang seharusnya ada di laci saat tutup shift. Jangan lupa mencatat, supaya tidak muncul selisih.'],
  },
  {
    id: 'hutang-toko', kelompok: 'Kasir: uang dan shift', judul: 'Mencatat hutang toko', peran: KASIR,
    ringkas: 'Untuk uang yang dipinjam depo dari karyawan atau pihak lain.',
    buka: { href: '/kasir/shift', label: 'Buka Rekap Shift' },
    langkah: [
      'Tekan "Lainnya", lalu "Catat hutang toko".',
      'Pilih pihak (karyawan atau orang ketiga), isi nominal dan keperluannya.',
      'Untuk melunasi, buka "Rekap Shift", cari catatan hutangnya, lalu tekan "Bayar Kas".',
    ],
  },
  {
    id: 'serah-owner', kelompok: 'Kasir: uang dan shift', judul: 'Menyerahkan uang laci ke owner', peran: KASIR,
    ringkas: 'Boleh kapan saja, tidak harus saat tutup shift.',
    buka: { href: '/kasir', label: 'Buka POS Kasir' },
    langkah: [
      'Tekan "Lainnya", lalu "Serahkan uang ke owner".',
      'Isi jumlah uang yang Anda serahkan, lalu simpan. Uang laci langsung berkurang di hitungan.',
      'Owner akan menerimanya di aplikasinya dan mencocokkan jumlahnya.',
      'Kalau salah ketik dan owner belum menerima, Anda masih bisa membatalkannya.',
    ],
    hati: ['Serahkan uang sesuai angka yang Anda catat. Selisih saat owner menghitung akan dicatat atas nama Anda.'],
  },
  {
    id: 'pegangan-kasir', kelompok: 'Kasir: uang dan shift', judul: 'Uang pegangan dari owner', peran: KASIR,
    ringkas: 'Uang dari owner untuk keperluan tertentu, terpisah dari laci.',
    buka: { href: '/kasir', label: 'Buka POS Kasir' },
    langkah: [
      'Kalau owner memberi uang pegangan, muncul kartu "Uang pegangan dari owner" di halaman kasir, bahkan sebelum Anda membuka shift.',
      'Setelah uangnya benar-benar Anda terima, tekan "Terima uang".',
      'Saat mencatat pengeluaran, pilih "Uang pegangan dari owner" di "Uang yang dipakai". Uang laci tidak berkurang.',
      'Kalau ada sisa, tekan "Kembalikan sisa", isi jumlahnya, lalu serahkan uangnya ke owner. Owner menerimanya di aplikasi.',
    ],
    tips: ['Uang pegangan tidak masuk hitungan laci, jadi tidak menimbulkan selisih saat tutup shift.'],
  },
  {
    id: 'tutup-shift', kelompok: 'Kasir: uang dan shift', judul: 'Tutup shift', peran: KASIR,
    ringkas: 'Dilakukan di akhir jam kerja untuk mencocokkan uang dan meteran.',
    buka: { href: '/kasir/shift', label: 'Buka Rekap Shift' },
    langkah: [
      'Buka "Rekap Shift" lalu tekan "Tutup Shift & Serahkan Kas Ke Owner". Muncul "Entri Tutup Shift Kasir". Kalau Anda menekan "Keluar" saat shift masih berjalan, aplikasi juga memintanya lebih dulu.',
      'Hitung semua uang di laci, lalu isi "Hasil Hitung Kas Akhir Di Tangan". Isi sesuai uang yang benar-benar ada, jangan menyesuaikan dengan angka aplikasi.',
      'Isi meteran air akhir (dan foto meteran kalau diminta).',
      'Tekan "Tutup Shift, Setor Kas & Cek Struk". Aplikasi menunjukkan selisih antara uang di aplikasi dan uang yang Anda hitung.',
      'Struk ringkas bisa dicetak atau dikirim ke owner lewat WhatsApp.',
    ],
    tips: ['Selisih kecil bisa terjadi karena salah kembalian. Selisih besar biasanya karena ada pengeluaran yang belum dicatat.'],
  },
  {
    id: 'rekap-shift', kelompok: 'Kasir: uang dan shift', judul: 'Melihat Rekap Shift', peran: KASIR,
    ringkas: 'Ringkasan shift berjalan dan riwayat shift sebelumnya.',
    buka: { href: '/kasir/shift', label: 'Buka Rekap Shift' },
    langkah: [
      'Buka menu "Rekap Shift".',
      'Lihat uang laci, penjualan, pengeluaran, dan uang yang diserahkan ke owner.',
      'Di halaman yang sama ada daftar hutang toko dan tombol untuk membayarnya.',
    ],
  },
  {
    id: 'cetak-struk', kelompok: 'Kasir: transaksi harian', judul: 'Mencetak struk', peran: KASIR,
    ringkas: 'Struk bisa dicetak lewat dialog biasa atau printer Bluetooth.',
    langkah: [
      'Setelah transaksi, tekan tombol cetak pada struk yang muncul.',
      'Kalau owner sudah memasang printer Bluetooth lewat aplikasi RawBT, struk langsung dikirim ke printer.',
      'Kalau tidak keluar, pastikan printer menyala, Bluetooth HP aktif, dan aplikasi RawBT terbuka sudah memilih printer yang benar.',
    ],
    tips: ['Cara memasang printer ada di topik "Memasang printer struk" (untuk owner).'],
  },

  // ===================== PENGANTAR =====================
  {
    id: 'antaran-lapangan', kelompok: 'Pengantar', judul: 'Mengantar pesanan', peran: ['owner', 'pengantar'],
    ringkas: 'Melihat tugas, menuju alamat, dan menandai terkirim.',
    buka: { href: '/pengantar', label: 'Buka Antaran Lapangan' },
    langkah: [
      'Buka "Antaran Lapangan". Setiap pesanan menunggu tampil sebagai kartu: nama pelanggan, alamat, dan barang yang harus diantar.',
      'Tekan "Navigasi ke lokasi" untuk membuka peta menuju rumah pelanggan.',
      'Kalau lokasi pelanggan belum tersimpan, setelah sampai tekan "Simpan lokasi pelanggan" supaya antaran berikutnya lebih mudah.',
      'Setelah barang diserahkan, tekan "Konfirmasi Terkirim & Terima Bayar".',
      'Pilih cara pelanggan membayar: Tunai, Transfer, QRIS, atau Belum bayar. Untuk Tunai, isi uang yang Anda terima (atau "Uang pas").',
      'Tekan "Sudah terkirim". Pesanan hilang dari daftar tugas.',
    ],
    tips: ['Bagian "Rute antaran" membantu mengurutkan alamat supaya perjalanan lebih singkat.'],
  },
  {
    id: 'uang-kurir', kelompok: 'Pengantar', judul: 'Uang tunai yang Anda bawa', peran: ['owner', 'pengantar'],
    ringkas: 'Setiap uang tunai dari pelanggan harus disetor ke kasir.',
    buka: { href: '/pengantar', label: 'Buka Antaran Lapangan' },
    langkah: [
      'Kotak "Uang tunai yang kamu bawa" di bagian atas menunjukkan uang tunai yang belum Anda setorkan.',
      'Serahkan uangnya ke kasir kapan saja. Boleh sebagian.',
      'Kasir mencatat setoran Anda, lalu angka di kotak itu berkurang.',
    ],
    hati: ['Pembayaran transfer atau QRIS tidak masuk uang yang Anda bawa, karena uangnya tidak lewat tangan Anda.'],
  },
  {
    id: 'alarm-terlambat', kelompok: 'Pengantar', judul: 'Alarm pesanan terlambat', peran: ['owner', 'kasir', 'pengantar'],
    ringkas: 'Peringatan bunyi kalau pesanan menunggu terlalu lama.',
    langkah: [
      'Kalau ada pesanan yang menunggu lebih lama dari batas yang ditentukan owner, muncul kotak merah dan alarm berbunyi.',
      '"Snooze" menunda alarm sementara. "Matikan" mematikannya untuk pesanan itu.',
      'Alarm berhenti sendiri setelah pesanannya ditandai terkirim.',
    ],
    tips: ['Batas waktu dan jenis suara diatur owner di Pengaturan Toko, kategori Operasional depo.'],
  },

  // ===================== PENGANTAR: PESANAN ONLINE =====================
  {
    id: 'online-pengantar', kelompok: 'Pengantar', judul: 'Pesanan online untuk diantar', peran: ['owner', 'pengantar'],
    ringkas: 'Pesanan dari tautan pelanggan yang sudah dikonfirmasi kasir muncul sebagai tugas antar.',
    buka: { href: '/pengantar', label: 'Buka Antaran Lapangan' },
    langkah: [
      'Saat kasir mengonfirmasi pesanan online, muncul bunyi singkat dan angka merah di menu "Antaran Lapangan".',
      'Di bagian atas halaman Antaran Lapangan ada kotak "Pesanan online untuk diantar". Setiap pesanan menampilkan kode, barang, alamat (dengan tautan Peta bila pelanggan membagikan lokasi), nomor telepon, jam antar, catatan pelanggan, dan jumlah yang harus ditagih.',
      'Ketuk nomor telepon untuk menelepon, atau "WhatsApp" untuk mengirim pesan ke pelanggan.',
      'Pesanan yang sama juga ada di daftar antaran biasa. Setelah barang sampai, tekan "Konfirmasi Terkirim & Terima Bayar" dan catat cara pelanggan membayar.',
      'Kalau ada tulisan "pesanan online lagi sedang menunggu konfirmasi kasir", itu belum menjadi tugas Anda. Tunggu sampai kasir mengonfirmasinya.',
    ],
    tips: ['Pelanggan bisa memantau pesanannya sendiri lewat tautan. Kalau terlambat, kabari lewat WhatsApp.'],
  },

  // ===================== PELANGGAN DAN PETA =====================
  {
    id: 'dashboard-admin', kelompok: 'Pelanggan dan peta', judul: 'Dashboard dan target harian', peran: ['admin'],
    ringkas: 'Memantau penjualan harian dan capaian target.',
    buka: { href: '/owner/dashboard', label: 'Buka Dashboard' },
    langkah: [
      'Buka "Dashboard & Target Harian".',
      'Pilih periode (harian, mingguan, bulanan) di kolom "Periode".',
      'Lihat omzet, sisa air baku, dan bagian "Perlu tindakan".',
    ],
    tips: ['Admin hanya melihat. Pengaturan dan keuangan owner tidak terbuka untuk admin.'],
  },
  {
    id: 'pelanggan', kelompok: 'Pelanggan dan peta', judul: 'Mengelola pelanggan dan reseller', peran: OWNER_ADMIN,
    ringkas: 'Tambah, ubah data, harga khusus, dan batas hutang.',
    buka: { href: '/admin/kontak', label: 'Buka Pelanggan & Reseller' },
    langkah: [
      'Buka "Pelanggan & Reseller", tekan tombol tambah untuk pelanggan baru.',
      'Isi nama, nomor HP, dan alamat. Pilih jenis: pelanggan atau reseller, dan zona ongkir bila diantar.',
      '"Batas hutang" menentukan berapa boleh berhutang. Rp 0 artinya tidak boleh berhutang.',
      '"Harga khusus (opsional)" dipakai untuk pelanggan atau reseller yang harganya berbeda dari harga umum. Isi hanya produk yang berbeda, sisanya memakai harga umum.',
      'Simpan. Harga khusus otomatis dipakai saat kasir memilih pelanggan itu, tanpa muncul di daftar produk.',
    ],
    tips: ['Lokasi di peta bisa disimpan dari data pelanggan, atau oleh kurir saat mengantar.'],
  },
  {
    id: 'peta', kelompok: 'Pelanggan dan peta', judul: 'Peta Pelanggan', peran: KASIR_ADMIN,
    ringkas: 'Melihat sebaran pelanggan dan seberapa sering mereka membeli.',
    buka: { href: '/peta', label: 'Buka Peta Pelanggan' },
    langkah: [
      'Buka "Peta Pelanggan".',
      'Titik di peta menunjukkan lokasi pelanggan. Warnanya menunjukkan seberapa sering mereka membeli: Sering, Sedang, Jarang, Lama tidak membeli, atau Belum pernah.',
      'Ketuk titik untuk melihat nama dan ringkasan pembelian.',
      'Pelanggan yang lama tidak membeli bisa dihubungi lewat WhatsApp untuk menawarkan lagi.',
    ],
    tips: ['Pelanggan yang tidak muncul di peta belum punya lokasi tersimpan.'],
  },

  // ===================== PESANAN ONLINE =====================
  {
    id: 'pesanan-online-kelola', kelompok: 'Pesanan online', judul: 'Mengelola pesanan online dari pelanggan', peran: KASIR,
    ringkas: 'Memeriksa, mengonfirmasi, atau menolak pesanan yang masuk lewat tautan.',
    buka: { href: '/kasir/pesanan-masuk', label: 'Buka Pesanan Online' },
    langkah: [
      'Pesanan baru muncul dengan angka merah di menu "POS Kasir" dan "Pesanan Online", disertai bunyi singkat. Di halaman POS Kasir juga ada kotak "Pesanan online menunggu konfirmasi" berisi detail setiap pesanan: barang, alamat, nomor WhatsApp, jam antar, pilihan bayar, dan catatan.',
      'Tekan "Proses pesanan" di kotak itu, atau buka menu "Pesanan Online".',
      'Periksa pesanan: barang, alamat, jam antar, dan apakah pelanggan sudah terdaftar.',
      'Tekan "Konfirmasi". Pilih "Zona ongkir" dan "Estimasi tiba" (aplikasi mengusulkan angka dari rata-rata antaran sebelumnya). Total dengan ongkir tampil sebelum dikonfirmasi.',
      'Tekan "Konfirmasi dan siapkan antar". Pesanan masuk ke daftar antar biasa, lalu muncul teks balasan WhatsApp yang sudah siap. Tekan "Balas lewat WhatsApp".',
      'Kalau tidak bisa diproses, tekan "Tolak", pilih atau tulis alasannya, lalu kabari pelanggan lewat WhatsApp.',
    ],
    tips: ['Cara bayar sebenarnya (tunai, transfer, atau belum bayar) dicatat kurir saat barang sampai.'],
  },
  {
    id: 'pesanan-online-terlambat', kelompok: 'Pesanan online', judul: 'Pesanan online terlambat dan tautan pribadi', peran: KASIR,
    ringkas: 'Mengabari pelanggan sebelum mereka bertanya, dan memberi tautan pesan cepat.',
    buka: { href: '/kasir/pesanan-masuk', label: 'Buka Pesanan Online' },
    langkah: [
      'Di bagian "Sedang diantar", pesanan yang melewati estimasi ditandai kuning, misalnya "Lewat estimasi 20 menit".',
      'Tekan "Kabari terlambat", pilih perkiraan tiba yang baru (15, 30, atau 45 menit lagi), lalu tekan "Kirim lewat WhatsApp". Halaman pantau pelanggan ikut berubah ke jam yang baru.',
      'Untuk pelanggan langganan, cari namanya di "Tautan pesan pribadi pelanggan", lalu tekan "Kirim WA" atau "Salin". Dengan tautan itu mereka cukup satu ketukan untuk pesan seperti biasa.',
      '"Matikan" membuat tautan pribadi tidak bisa dipakai lagi, misalnya kalau tautannya bocor.',
    ],
    tips: ['Pelanggan yang pesanannya dikonfirmasi otomatis mendapat tautan pantau pesanan dan tautan pribadi di balasan WhatsApp.'],
  },
  {
    id: 'pesanan-online-setup', kelompok: 'Pesanan online', judul: 'Menghidupkan pesanan online', peran: OWNER,
    ringkas: 'Membuka halaman pesan untuk pelanggan dan memasang balasan otomatis WhatsApp Business.',
    buka: { href: '/admin/pengaturan', label: 'Buka Pengaturan Toko' },
    langkah: [
      'Buka "Pengaturan Toko", lalu kategori "Pesanan online (WhatsApp)".',
      'Centang "Aktifkan pesanan online" dan isi "Nomor WhatsApp Business", misalnya 0812 3456 7890.',
      'Tekan "Simpan pengaturan". Pengaturan baru berlaku untuk pelanggan setelah tersimpan.',
      'Salin "Tautan untuk pelanggan" dan bagikan, atau cetak kode QR di bawahnya untuk stiker galon atau dinding depo.',
      'Untuk menyambut pelanggan otomatis: di aplikasi WhatsApp Business buka Pengaturan, "Alat bisnis", lalu "Pesan sambutan". Aktifkan, lalu isi pesan, misalnya: "Halo! Pesan air lebih cepat lewat tautan ini: (tempel tautan). Terima kasih."',
      'Untuk jawaban cepat, di "Alat bisnis" juga ada "Balasan cepat". Buat satu balasan berisi tautan itu.',
    ],
    tips: [
      'Menu di WhatsApp Business bisa sedikit berbeda tergantung versinya, tetapi nama "Pesan sambutan" dan "Balasan cepat" biasanya tetap.',
      'Untuk menutup sementara (misalnya libur), cukup hapus centang "Aktifkan pesanan online" lalu simpan.',
    ],
    hati: ['Jangan membagikan tautan pantau pesanan atau tautan pribadi pelanggan ke grup. Isinya khusus untuk satu orang.'],
  },

  // ===================== OWNER: PERSIAPAN =====================
  {
    id: 'setup-awal', kelompok: 'Owner: persiapan toko', judul: 'Urutan menyiapkan toko dari awal', peran: OWNER,
    ringkas: 'Kerjakan berurutan supaya semua fitur siap dipakai.',
    langkah: [
      '"Pengaturan Toko" > Toko: isi nama depo, alamat, nomor WhatsApp, header dan footer struk, logo, dan titik lokasi depo.',
      '"Produk & Harga": isi semua produk yang dijual beserta harganya.',
      '"Zona Ongkir": buat zona dan tarif per galon.',
      '"Pengaturan Toko" > Karyawan dan gaji: daftarkan kasir, kurir, dan admin beserta password mereka.',
      '"Pengaturan Toko" > Printer dan struk: pasang printer bila ada.',
      '"Pengaturan Toko" > Operasional depo: isi stok air baku, meteran, dan jadwal servis mesin.',
      '"Keuangan Owner": mulai pencatatan dengan saldo awal kas besar dan rekening.',
      '"Pengaturan Toko" > Target penjualan: isi target bila diperlukan.',
      'Masukkan data pelanggan di "Pelanggan & Reseller", lalu coba satu transaksi percobaan.',
    ],
    tips: [AUTH_AKTIF ? 'Buat akun login untuk semua orang di "Akun login dan keamanan" sebelum dipakai.' : 'Ubah semua password awal (123456) menjadi password sendiri sebelum dipakai. Lebih aman lagi, beralih ke login akun (lihat topik "Mengamankan data dengan login akun").'],
  },
  {
    id: 'keamanan-akun', kelompok: 'Owner: persiapan toko', judul: 'Mengamankan data dengan login akun', peran: OWNER,
    ringkas: 'Peralihan satu kali: setiap orang punya akun sendiri, dan data hanya terbuka untuk yang sudah login.',
    buka: { href: '/admin/pengaturan', label: 'Buka Pengaturan Toko' },
    langkah: [
      'Siapkan alamat email untuk Anda dan karyawan yang punya email. Karyawan tanpa email cukup memakai nama pengguna (aplikasi menambahkan @depo.example.com).',
      'Di Supabase buka Authentication, Users, lalu "Add user" dan "Create new user". Isi email dan password untuk setiap orang, dan centang "Auto Confirm User".',
      'Di aplikasi buka Pengaturan Toko, kategori "Akun login dan keamanan". Isi email setiap orang, tekan "Salin SQL", lalu tempel dan jalankan di Supabase (SQL Editor, Run). Ini memberi tiap akun perannya.',
      'Di Supabase buka Project Settings, API, lalu salin "service_role secret". Di Vercel buka Settings, Environment Variables, lalu tambahkan SUPABASE_SERVICE_ROLE_KEY (isi kunci itu) dan NEXT_PUBLIC_LOGIN_AKUN dengan nilai 1. Jangan menempel kunci rahasia ini di chat, grup, atau foto layar.',
      'Deploy ulang di Vercel, lalu SEGERA jalankan berkas supabase/kunci-akses.sql di SQL Editor Supabase. Berkas ini memberi izin baca dan tulis kepada akun login, dan mencabutnya dari kunci publik. Tanpa langkah ini, akun login tidak bisa membaca maupun menyimpan data ke server.',
      'Setelah itu muat ulang aplikasi, masuk dengan akun masing-masing, dan uji satu per satu: owner, kasir, dan kurir. Buat satu transaksi dan buka halaman pesan pelanggan.',
      'Kalau ada masalah, jalankan supabase/buka-kunci-darurat.sql. Berkas itu mengembalikan akses seperti semula.',
    ],
    tips: ['Lakukan peralihan saat depo sepi. Jalankan kunci-akses.sql tepat setelah deploy dengan NEXT_PUBLIC_LOGIN_AKUN=1 selesai.'],
    hati: [
      'Kalau NEXT_PUBLIC_LOGIN_AKUN sudah 1 tetapi akun belum dibuat atau perannya belum diberikan, tidak ada yang bisa masuk. Pulihkan dengan menghapus pengaturan itu di Vercel lalu deploy ulang.',
      'Setelah beralih, password lama di data aplikasi dihapus otomatis saat owner masuk pertama kali.',
    ],
  },
  {
    id: 'push-setup', kelompok: 'Owner: persiapan toko', judul: 'Menyiapkan notifikasi push', peran: OWNER,
    ringkas: 'Langkah satu kali agar HP bisa menerima notifikasi pesanan online.',
    buka: { href: '/admin/pengaturan', label: 'Buka Pengaturan Toko' },
    langkah: [
      'Di komputer, buka folder aplikasi (E:\\Depo Air Abi), klik kanan sambil menahan Shift, lalu pilih "Open PowerShell window here" (atau buka Terminal di folder itu).',
      'Ketik perintah ini, lalu Enter: npx web-push generate-vapid-keys. Muncul dua baris: Public Key dan Private Key.',
      'Di Vercel buka proyek, Environment Variables, lalu tambahkan tiga variabel: NEXT_PUBLIC_VAPID_PUBLIC_KEY (isi Public Key, tipe Config), VAPID_PRIVATE_KEY (isi Private Key, tipe Secret), dan VAPID_SUBJECT (isi mailto: diikuti email Anda, tipe Config).',
      'Deploy ulang di Vercel.',
      'Di setiap HP, masuk dengan akun, buka menu, dan tekan "Aktifkan notifikasi" lalu "Uji notifikasi".',
    ],
    hati: [
      'Private Key adalah rahasia. Tempel langsung di Vercel, jangan dikirim ke chat atau difoto.',
      'Kalau Private Key diganti, semua HP harus menekan "Aktifkan notifikasi" lagi.',
    ],
  },
  {
    id: 'produk', kelompok: 'Owner: persiapan toko', judul: 'Produk dan harga', peran: OWNER,
    ringkas: 'Menambah produk, mengubah harga, dan mengatur ongkir per produk.',
    buka: { href: '/admin/produk', label: 'Buka Produk & Harga' },
    langkah: [
      'Buka "Produk & Harga", lalu tambah produk baru atau ubah yang ada.',
      'Isi "Nama Produk Wadah", "Jenis Wadah" (botol, jerigen, galon), "Volume Air (Liter)", dan "Harga Produk".',
      'Atur "Kena Tarif Ongkir Unit?" untuk produk yang dikenai ongkir saat diantar.',
      'Atur "Dihitung Poin Loyalitas?" dan "Bisa Tukar Galon Depo?" bila perlu.',
      'Simpan. Produk yang aktif tampil di halaman kasir dan halaman pesan online.',
    ],
    tips: ['Harga khusus untuk reseller tertentu diatur di data pelanggan, bukan di sini.'],
  },
  {
    id: 'zona', kelompok: 'Owner: persiapan toko', judul: 'Zona ongkir', peran: OWNER,
    ringkas: 'Tarif antar berdasarkan jarak dari depo.',
    buka: { href: '/admin/zona', label: 'Buka Zona Ongkir' },
    langkah: [
      'Buka "Zona Ongkir".',
      'Isi "Nama Zona Ongkir", "Keterangan Jangkauan / Area", dan "Tarif Ongkir per Unit (Rp)".',
      'Isi "Batas jarak dari depo (km)" supaya aplikasi bisa memeriksa kecocokan zona dengan lokasi pelanggan. Zona terjauh boleh tanpa batas.',
      '"Urutan Tampilan" menentukan urutan zona di pilihan kasir.',
    ],
    tips: ['Titik lokasi depo harus diisi di Pengaturan Toko agar pemeriksaan jarak berjalan.'],
  },
  {
    id: 'pengaturan-toko', kelompok: 'Owner: persiapan toko', judul: 'Pengaturan Toko: isi tiap kategori', peran: OWNER,
    ringkas: 'Tinjauan semua kategori pengaturan.',
    buka: { href: '/admin/pengaturan', label: 'Buka Pengaturan Toko' },
    langkah: [
      'Toko: nama depo, nama owner, password login owner, tagline, nomor WhatsApp, alamat, lokasi depo, serta "Header Struk Cetak" dan "Footer Struk Cetak". Baris pertama header dipakai sebagai nama di bar atas, struk, dan pesan WhatsApp.',
      'Akun login dan keamanan: menyiapkan akun login karyawan di Supabase dan SQL pemberian peran.',
      'Pesanan online (WhatsApp): saklar dan nomor WhatsApp Business (lihat topik pesanan online).',
      'Karyawan dan gaji: daftar karyawan, gaji pokok, uang makan, dan tanggal gaji.',
      'Printer dan struk: cara mencetak, lebar kertas, uji cetak.',
      'Target penjualan: target omzet, galon, dan liter untuk harian, mingguan, dan bulanan.',
      'Operasional depo: stok air baku, batas minimum, meteran, jadwal servis mesin, jenis alarm suara, dan foto meteran.',
      'Data dan reset: menghapus data. Hanya dipakai kalau benar-benar perlu.',
      'Setelah mengubah, tekan "Simpan pengaturan" di bar bawah. Tulisan "Ada perubahan yang belum disimpan" menandakan belum tersimpan.',
    ],
    hati: ['"Data dan reset" menghapus data secara permanen. Baca pilihannya dengan teliti dan pastikan perlu sebelum menekan konfirmasi.'],
  },
  {
    id: 'karyawan', kelompok: 'Owner: persiapan toko', judul: 'Karyawan, akun, dan gaji', peran: OWNER,
    ringkas: 'Menambah karyawan dan mengatur gajinya.',
    buka: { href: '/admin/pengaturan', label: 'Buka Pengaturan Toko' },
    langkah: [
      'Di "Pengaturan Toko" > "Karyawan dan gaji", tambah karyawan baru.',
      'Isi nama, jabatan, nomor HP, tanggal masuk, "Gaji Basic / Pokok Bulanan", "Uang Makan per Hari", dan "Tanggal Jatuh Tempo Gaji Bulanan".',
      'Perhatikan kolom "Jabatan", karena peran di aplikasi ditentukan dari kata di dalamnya: mengandung "admin", "owner", atau "pemilik" menjadi Admin; mengandung "pengantar", "driver", atau "kurir" menjadi Pengantar; selain itu menjadi Kasir. Contoh: "Kasir Pagi", "Pengantar", "Admin Gudang".',
      AUTH_AKTIF ? 'Password tidak diisi di sini. Buat akun login karyawan di kategori "Akun login dan keamanan".' : 'Isi password karyawan. Kalau dikosongkan, memakai 123456, sebaiknya segera diganti.',
      'Simpan. Karyawan masuk dengan namanya dan password itu, lalu melihat menu sesuai perannya.',
    ],
  },
  {
    id: 'printer', kelompok: 'Owner: persiapan toko', judul: 'Memasang printer struk', peran: OWNER,
    ringkas: 'Panduan printer Bluetooth 58 mm lewat aplikasi RawBT di Android.',
    buka: { href: '/admin/pengaturan', label: 'Buka Pengaturan Toko' },
    langkah: [
      'Pasang aplikasi RawBT dari Play Store di HP Android yang dipakai kasir.',
      'Nyalakan printer. Di Pengaturan Bluetooth HP, sambungkan (pairing) dengan printer. Kata sandi bawaan biasanya 0000 atau 1234.',
      'Buka aplikasi RawBT, pilih printer yang sudah tersambung sebagai printer bawaan.',
      'Di aplikasi ini buka "Pengaturan Toko" > "Printer dan struk". Pada "Cara mencetak" pilih "Aplikasi RawBT (printer Bluetooth)", dan pada "Lebar kertas" pilih 58 mm (atau 80 mm sesuai kertas).',
      'Tekan "Uji cetak". Kalau struk percobaan keluar, printer siap.',
      'Aktifkan "Cetak otomatis setelah bayar" bila ingin struk keluar tanpa menekan tombol.',
    ],
    tips: ['Pengaturan printer berlaku di semua perangkat, tetapi RawBT harus terpasang di HP yang dipakai mencetak.'],
  },

  // ===================== OWNER: MEMANTAU =====================
  {
    id: 'dashboard-owner', kelompok: 'Owner: memantau usaha', judul: 'Dashboard Owner', peran: OWNER,
    ringkas: 'Melihat kondisi usaha dalam sekali pandang.',
    buka: { href: '/owner/dashboard', label: 'Buka Dashboard Owner' },
    langkah: [
      'Pilih periode di kolom "Periode": hari ini, minggu ini, atau bulan ini.',
      'Dua kartu utama: "Omzet" (dengan capaian target) dan "Sisa air baku" (kuning atau merah kalau menipis).',
      'Bagian "Perlu tindakan" mengumpulkan yang menunggu keputusan Anda: setoran kasir menunggu diterima, pesanan terlambat, pesanan online baru, selisih kas, dan stok air menipis.',
      'Tab "Ringkasan": rekap penjualan dan laba rugi. Tab "Keuangan": kas, pengeluaran, dan rekap kas. Tab "Staf dan Piutang": hak karyawan dan pelanggan berhutang. Tab "Mesin dan servis": meteran dan jadwal servis. Tab "Riwayat": daftar transaksi dan audit shift.',
    ],
    tips: ['Laba bersih dihitung dari omzet dikurangi harga pokok air dan biaya operasional. Pembelian air baku dihitung lewat harga pokok air, bukan sebagai biaya.'],
  },
  {
    id: 'gaji', kelompok: 'Owner: memantau usaha', judul: 'Membayar gaji, kasbon, dan uang makan', peran: OWNER,
    ringkas: 'Dari tab Staf dan Piutang di Dashboard Owner.',
    buka: { href: '/owner/dashboard', label: 'Buka Dashboard Owner' },
    langkah: [
      'Di Dashboard Owner buka tab "Staf dan Piutang".',
      'Pilih karyawan untuk melihat rinciannya: sisa gaji, kasbon aktif, ongkir yang belum dibayar, dan uang makan.',
      'Tekan tombol pembayaran, pilih jenis (gaji, kasbon, pengembalian kasbon, atau uang makan).',
      'Pilih sumber uang: kas besar, laci, atau rekening. Bawaannya kas besar.',
      'Simpan. Bukti pembayaran bisa dicetak atau dikirim.',
    ],
    hati: [
      'Pengembalian kasbon tidak boleh melebihi sisa kasbon.',
      'Kalau gaji bulan ini sudah dibayar penuh, aplikasi meminta konfirmasi sebelum membayar lagi.',
    ],
  },
  {
    id: 'air-baku', kelompok: 'Owner: memantau usaha', judul: 'Stok air baku, meteran, dan servis mesin', peran: OWNER,
    ringkas: 'Menjaga air tidak habis dan mesin terawat.',
    buka: { href: '/owner/dashboard', label: 'Buka Dashboard Owner' },
    langkah: [
      'Stok air baku berkurang otomatis mengikuti penjualan dan bertambah saat Anda atau kasir mencatat pembelian air baku.',
      'Atur batas minimum di "Pengaturan Toko" > Operasional depo. Di bawah batas itu, aplikasi memperingatkan.',
      'Di Dashboard tab "Mesin dan servis" terlihat komponen mesin (filter dan lainnya) beserta seberapa dekat jadwal servisnya.',
      'Setelah servis, perbarui "Liter Terakhir Diganti" supaya hitungan jadwal berikutnya benar.',
      'Kalau stok di aplikasi tidak sama dengan keadaan sebenarnya, perbaiki lewat koreksi stok (stok opname) di Operasional depo.',
    ],
  },
  {
    id: 'foto-meter', kelompok: 'Owner: memantau usaha', judul: 'Foto meteran air saat buka dan tutup shift', peran: OWNER,
    ringkas: 'Bukti angka meteran, supaya selisih air mudah dilacak.',
    buka: { href: '/admin/pengaturan', label: 'Buka Pengaturan Toko' },
    langkah: [
      'Di "Pengaturan Toko" > Operasional depo, cari "Foto Meteran Air Depo".',
      'Pilih "Wajib foto", "Boleh dilewati", atau "Tidak usah foto".',
      'Simpan pengaturan. Kasir akan mengikuti pilihan itu saat mengisi meteran.',
      'Foto tersimpan terkompres dan ikut terlihat di audit shift.',
    ],
  },
  {
    id: 'laporan', kelompok: 'Owner: memantau usaha', judul: 'Laporan PDF mingguan dan bulanan', peran: OWNER,
    ringkas: 'Laporan siap unduh dan bagikan untuk gambaran usaha.',
    buka: { href: '/owner/laporan', label: 'Buka Laporan PDF' },
    langkah: [
      'Buka "Laporan PDF".',
      'Pilih "Mingguan" (Senin sampai Minggu) atau "Bulanan", lalu pilih periodenya.',
      'Lihat empat angka utama: omzet, laba bersih, transaksi, dan galon terjual.',
      'Tekan "Unduh PDF". Untuk mengirim, tekan "Bagikan" (muncul bila HP mendukung) dan pilih WhatsApp atau aplikasi lain.',
    ],
    tips: [
      'Isi laporan: ringkasan dan perbandingan, grafik omzet harian, laba rugi, uang dan selisih kasir, piutang, karyawan, pelanggan dan produk terlaris, air baku.',
      'Pada Senin dan tanggal 1 muncul pengingat di Dashboard bahwa laporan periode sebelumnya siap diunduh.',
    ],
  },

  // ===================== OWNER: KEUANGAN =====================
  {
    id: 'keuangan-mulai', kelompok: 'Owner: keuangan', judul: 'Memulai Keuangan Owner', peran: OWNER,
    ringkas: 'Mencatat kas besar dan rekening milik usaha.',
    buka: { href: '/owner/keuangan', label: 'Buka Keuangan Owner' },
    langkah: [
      'Buka "Keuangan Owner". Pertama kali muncul "Mulai catat kas besar dan rekening".',
      'Isi "Uang tunai di kas besar" dan tambahkan rekening bank atau dompet digital beserta saldonya.',
      'Tekan "Mulai pencatatan". Pencatatan berjalan mulai saat itu, riwayat sebelumnya tidak dihitung ulang.',
      'Setelah itu terlihat kartu: kas besar, tiap rekening, uang di laci, uang di kurir, dan setoran menunggu diterima.',
    ],
    tips: ['Kas besar adalah uang tunai milik owner di luar laci. Laci dihitung per shift.'],
  },
  {
    id: 'setoran-kasir', kelompok: 'Owner: keuangan', judul: 'Menerima setoran kasir dan mengambil uang laci', peran: OWNER,
    ringkas: 'Memeriksa uang yang diserahkan kasir dan mencatat selisihnya.',
    buka: { href: '/owner/keuangan', label: 'Buka Keuangan Owner' },
    langkah: [
      'Di bagian "Setoran dari kasir", setiap penyerahan kasir tampil dengan jumlahnya.',
      'Hitung uang yang Anda terima, isi "Uang yang benar-benar diterima (Rp)", lalu tekan "Terima setoran".',
      'Kalau jumlahnya kurang atau lebih, selisih otomatis dicatat atas nama kasir itu.',
      'Untuk mengambil uang langsung dari laci, pakai "Ambil uang dari laci": isi jumlah dan catatan, lalu "Catat pengambilan". Ini langsung sah tanpa menunggu kasir.',
    ],
    tips: ['Rekap selisih per kasir terlihat di Dashboard Owner dan di Laporan PDF.'],
  },
  {
    id: 'catat-transaksi', kelompok: 'Owner: keuangan', judul: 'Catat transaksi kas besar dan rekening', peran: OWNER,
    ringkas: 'Modal, prive, setor dan tarik bank, transfer, dan koreksi saldo.',
    buka: { href: '/owner/keuangan', label: 'Buka Keuangan Owner' },
    langkah: [
      'Tekan "Modal, prive, setor bank, koreksi" di bagian "Catat transaksi".',
      '"Modal untuk laci": kas besar ke laci, muncul otomatis sebagai modal awal saat kasir buka shift berikutnya.',
      '"Tambah modal": uang pribadi masuk ke usaha. "Prive": uang usaha diambil untuk pribadi.',
      '"Setor tunai ke bank" dan "Tarik tunai dari bank": memindahkan uang antara kas besar dan rekening.',
      '"Transfer antar rekening": memindahkan saldo antar rekening.',
      '"Koreksi saldo": menyamakan saldo aplikasi dengan saldo sebenarnya (misalnya dari mutasi bank). Alasan wajib diisi.',
      'Lihat hasilnya di "Buku kas": pilih kas besar atau rekening untuk melihat setiap uang masuk dan keluar beserta saldonya.',
    ],
    tips: ['Penjualan non-tunai (transfer, QRIS, EDC) masuk otomatis ke rekening yang Anda pilih di bagian "Rekening dan penjualan non-tunai".'],
  },
  {
    id: 'pegangan-owner', kelompok: 'Owner: keuangan', judul: 'Uang pegangan untuk kasir', peran: OWNER,
    ringkas: 'Memberi uang kas besar ke kasir, mis. untuk beli air baku, di luar laci.',
    buka: { href: '/owner/keuangan', label: 'Buka Keuangan Owner' },
    langkah: [
      'Di bagian "Uang pegangan kasir" tekan "Beri uang pegangan".',
      'Pilih kasir, isi nominal dan keperluan, lalu tekan "Beri uang". Kas besar langsung berkurang. Boleh dilakukan sebelum kasir buka shift.',
      'Kasir menekan "Terima uang" di aplikasinya setelah uangnya benar-benar diterima. Sebelum itu masih bisa Anda batalkan.',
      '"Sedang dipegang kasir" menunjukkan sisa uang pegangan tiap kasir.',
      'Kalau kasir mengembalikan sisa, muncul kotak "mengembalikan sisa". Setelah uangnya Anda terima, tekan "Terima sisa uang". Uang kembali ke kas besar.',
    ],
    tips: ['Uang pegangan tidak memengaruhi hitungan laci dan selisih shift.'],
  },
  {
    id: 'pengeluaran-owner', kelompok: 'Owner: keuangan', judul: 'Membayar sendiri dari kas besar atau rekening', peran: OWNER,
    ringkas: 'Untuk air baku yang datang malam, hutang toko, ongkir kurir, atau biaya lain bila kasir berhalangan.',
    buka: { href: '/owner/keuangan', label: 'Buka Keuangan Owner' },
    langkah: [
      'Di bagian "Pengeluaran dari kas owner" tekan "Catat pengeluaran".',
      'Pilih jenis: Pembelian air baku, Bayar hutang toko, Ongkir kurir, Operasional depo, Bensin, Konsumsi, atau Lain-lain.',
      'Pilih "Dibayar dari": kas besar atau rekening. Saldo tiap akun tampil di pilihan.',
      'Untuk air baku isi vendor, volume, harga, dan tips sopir. Stok air baku bertambah otomatis.',
      'Untuk hutang toko pilih catatan hutangnya. Untuk ongkir pilih kurirnya.',
      'Tekan "Simpan pengeluaran". Bukti bisa dicetak.',
    ],
  },
  {
    id: 'reset-keuangan', kelompok: 'Owner: keuangan', judul: 'Mengatur ulang Keuangan Owner', peran: OWNER,
    ringkas: 'Untuk mengulang pencatatan kas besar dari nol.',
    buka: { href: '/owner/keuangan', label: 'Buka Keuangan Owner' },
    langkah: [
      'Di bagian bawah "Keuangan Owner" ada tombol atur ulang.',
      'Tekan lalu konfirmasi "Ya, atur ulang". Catatan kas besar dan rekening dihapus.',
      'Isi saldo awal lagi untuk memulai pencatatan baru.',
    ],
    hati: ['Pengaturan ulang menghapus riwayat kas besar. Gunakan hanya kalau benar-benar perlu, misalnya salah memasukkan saldo awal di awal pemakaian.'],
  },

  // ===================== BANTUAN =====================
  {
    id: 'selisih', kelompok: 'Bantuan', judul: 'Kenapa kas tutup shift selisih?', peran: KASIR,
    ringkas: 'Penyebab paling umum dan cara memeriksanya.',
    langkah: [
      'Pengeluaran dari laci belum dicatat (bensin, beli air, dan lain-lain).',
      'Uang diserahkan ke owner atau uang kurir sudah diterima tetapi belum dicatat.',
      'Pembayaran non-tunai (transfer, QRIS) dicatat sebagai tunai, atau sebaliknya.',
      'Salah kembalian atau salah hitung uang saat tutup shift.',
      'Periksa "Rekap Shift" untuk melihat setiap uang masuk dan keluar, lalu cocokkan dengan uang di laci.',
    ],
  },
  {
    id: 'struk-tidak-keluar', kelompok: 'Bantuan', judul: 'Struk tidak keluar dari printer', peran: KASIR,
    ringkas: 'Periksa berurutan.',
    langkah: [
      'Pastikan printer menyala dan kertasnya ada.',
      'Pastikan Bluetooth HP aktif dan printer masih tersambung.',
      'Buka aplikasi RawBT dan pastikan printer yang dipilih benar.',
      'Minta owner memeriksa "Pengaturan Toko" > "Printer dan struk" lalu mencoba "Uji cetak".',
      'Kalau masih gagal, cetak lewat dialog browser sebagai cadangan.',
    ],
  },
  {
    id: 'data-beda', kelompok: 'Bantuan', judul: 'Data di dua HP berbeda', peran: SEMUA,
    ringkas: 'Biasanya hanya soal sambungan internet.',
    langkah: [
      'Lihat bar atas. Kalau tertulis "Offline", data belum terkirim atau belum diterima.',
      'Nyalakan internet dan tunggu sampai status "Tersinkron".',
      'Muat ulang halaman bila perlu.',
      'Kalau masih berbeda, jangan menghapus data. Beritahu owner.',
    ],
  },
  {
    id: 'lupa-password', kelompok: 'Bantuan', judul: 'Lupa password', peran: SEMUA,
    ringkas: 'Password bisa diganti owner.',
    langkah: AUTH_AKTIF ? [
      'Karyawan: minta owner mengatur ulang password Anda di Supabase (Authentication, Users, pilih nama Anda, lalu ubah password).',
      'Owner: ubah password di dashboard Supabase dengan cara yang sama. Kalau Anda masih bisa masuk, pakai tombol "Ganti password" di menu.',
    ] : [
      'Karyawan: minta owner mengubah password di "Pengaturan Toko" > "Karyawan dan gaji" pada data karyawan Anda.',
      'Owner: password owner diubah di "Pengaturan Toko" > Toko, kolom "Password Login Owner". Kalau Anda tidak bisa masuk sama sekali, hubungi pembuat aplikasi.',
    ],
  },
];

export function topikUntuk(peran: UserRole): Topik[] {
  return TOPIK.filter(t => t.peran.includes(peran));
}
