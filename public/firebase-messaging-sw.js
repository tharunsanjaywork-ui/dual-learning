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
  event.notification.close();
  
  // Directly open the education page without needing any password
  const urlToOpen = event.notification.data?.url || '/study/jee-mains';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
