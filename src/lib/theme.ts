// Tema tampilan disimpan per perangkat (tidak ikut disinkronkan), supaya kasir bisa memakai
// mode terang di HP-nya sementara owner tetap memakai mode gelap di laptopnya.
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'depo_theme';

// Belum pernah memilih: mode terang (terbaca di bawah matahari, terasa bersih)
export function getTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // penyimpanan diblokir: tema tetap berlaku sampai halaman dimuat ulang
  }
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new Event('depo_theme_updated'));
}
