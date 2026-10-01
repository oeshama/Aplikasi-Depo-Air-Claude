// Memperkecil foto dari kamera HP menjadi gambar JPEG kecil (data URL) supaya ringan disimpan dan disinkronkan.
const SISI_MAKS_PX = 720;
const UKURAN_MAKS_BYTE = 60 * 1024;

export function kompresFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Pilih berkas gambar (foto).'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const skala = Math.min(1, SISI_MAKS_PX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * skala));
      const h = Math.max(1, Math.round(img.height * skala));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Browser tidak bisa memproses foto ini.'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      // Turunkan kualitas bertahap sampai ukurannya kecil
      let kualitas = 0.7;
      let hasil = canvas.toDataURL('image/jpeg', kualitas);
      while (hasil.length * 0.75 > UKURAN_MAKS_BYTE && kualitas > 0.35) {
        kualitas -= 0.1;
        hasil = canvas.toDataURL('image/jpeg', kualitas);
      }
      resolve(hasil);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Foto tidak bisa dibaca. Coba ambil foto lagi.'));
    };
    img.src = url;
  });
}
