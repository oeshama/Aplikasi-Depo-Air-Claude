// Service worker Depo Air: hanya menerima notifikasi push dan membuka aplikasi saat notifikasi diketuk.
// Sengaja TIDAK menyimpan (cache) halaman apa pun, supaya aplikasi selalu memuat versi terbaru.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (e) {
    d = { title: 'Depo Air', body: event.data ? event.data.text() : '' };
  }
  const judul = d.title || 'Depo Air';
  const opsi = {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    vibrate: [200, 100, 200],
    data: { url: d.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(judul, opsi));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const daftar = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of daftar) {
      if ('focus' in c) {
        await c.focus();
        if ('navigate' in c) {
          try { await c.navigate(url); } catch (e) { /* abaikan */ }
        }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
