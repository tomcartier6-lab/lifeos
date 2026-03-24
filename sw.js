const CACHE_NAME = 'lifeos-v3';

// Installation
self.addEventListener('install', e => {
  self.skipWaiting();
});

// Activation — vider TOUS les anciens caches sans exception
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — index.html toujours depuis le réseau, jamais de cache
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Page principale — réseau obligatoire, pas de cache
  if(url.pathname.endsWith('/') || url.pathname.endsWith('index.html')){
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Autres ressources — réseau d'abord, cache en fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if(res && res.status === 200){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Notifications push reçues
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'Life OS';
  const options = {
    body: data.body || 'Votre bilan du soir vous attend.',
    icon: '/lifeos/icon-192.svg',
    badge: '/lifeos/icon-192.svg',
    tag: 'evening-reminder',
    requireInteraction: false,
    data: { url: '/lifeos/' }
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur notification — ouvre l'app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const lifeosClient = cls.find(c => c.url.includes('/lifeos'));
      if(lifeosClient) return lifeosClient.focus();
      return clients.openWindow('/lifeos/');
    })
  );
});

// Message depuis la page — déclencher une notif locale
self.addEventListener('message', e => {
  if(e.data?.type === 'SHOW_NOTIFICATION'){
    self.registration.showNotification(e.data.title || 'Life OS', {
      body: e.data.body || 'Bilan du soir non rempli.',
      icon: '/lifeos/icon-192.svg',
      tag: 'evening-reminder',
      data: { url: '/lifeos/' }
    });
  }
});
