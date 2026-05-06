const CACHE_NAME = 'dualzone-v1'
const OFFLINE_URLS = [
  '/',
  '/index.html',
]

// Try to cache icons separately without failing
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(OFFLINE_URLS))
      .then(() => {
        // Try to cache icons but don't fail if missing
        return caches.open(CACHE_NAME).then(cache => {
          return Promise.allSettled([
            cache.add('/icon-192.png'),
            cache.add('/icon-512.png'),
          ])
        })
      })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return
  // Skip Firebase and Cloudinary requests
  if (event.request.url.includes('firestore') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('cloudinary') ||
      event.request.url.includes('giphy')) return

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request)
          .then(cached => cached || caches.match('/index.html'))
      })
  )
})

importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA_T8vE-JtNJ2mSrIfMncMg8lVoLuE4vpY",
  authDomain: "dualzone-9fb82.firebaseapp.com",
  projectId: "dualzone-9fb82",
  storageBucket: "dualzone-9fb82.firebasestorage.app",
  messagingSenderId: "795876477927",
  appId: "1:795876477927:web:dc97ed233f4b4ec8e80b42",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  if (payload.data) {
    const notificationTitle = payload.data.title || 'Dual Zone';
    const notificationOptions = {
      body: payload.data.body || 'Update, there is an update',
      icon: '/icon-192.png',
      data: {
        url: payload.data.url || '/study/jee-mains'
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  
  const urlToOpen = new URL(
    event.notification.data?.url || '/study/jee-mains',
    self.location.origin
  ).href

  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then(function(clientList) {
      // If any window is open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          return client.navigate(urlToOpen)
        }
      }
      // No window open — open new one
      return clients.openWindow(urlToOpen)
    })
  )
})
