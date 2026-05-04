importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// Primary database
const primaryConfig = {
  apiKey: "AIzaSyA_T8vE-JtNJ2mSrIfMncMg8lVoLuE4vpY",
  authDomain: "dualzone-9fb82.firebaseapp.com",
  projectId: "dualzone-9fb82",
  storageBucket: "dualzone-9fb82.firebasestorage.app",
  messagingSenderId: "795876477927",
  appId: "1:795876477927:web:dc97ed233f4b4ec8e80b42"
}

// Secondary database (backup)
const secondaryConfig = {
  apiKey: "AIzaSyDVsvD0ONulvOeG04ZyEQxyQg4hO9Mz6UQ",
  authDomain: "dualzone-backup.firebaseapp.com",
  projectId: "dualzone-backup",
  storageBucket: "dualzone-backup.firebasestorage.app",
  messagingSenderId: "153713178279",
  appId: "1:153713178279:web:386fd7beb6e4a40f144d82"
}

// Use primary by default
firebase.initializeApp(primaryConfig)
const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body, data } = payload.notification || payload.data
  self.registration.showNotification(title || 'Focus Sanctuary', {
    body: body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data?.url || '/study/home' },
    silent: true,
    vibrate: [],
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/study/home'
  event.waitUntil(
    clients.openWindow(url + '?from=notification')
  )
})
