importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config injected at build-time via __FIREBASE_CONFIG__ placeholder or read from SW scope
const firebaseConfig = self.__FIREBASE_CONFIG__ || {
  apiKey:            self.VITE_FIREBASE_API_KEY,
  authDomain:        self.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         self.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     self.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             self.VITE_FIREBASE_APP_ID,
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage(payload => {
  const { title = 'C-ICAS OS', body = '', icon = '/icon-192.png', data = {} } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon,
    badge: '/icon-72.png',
    tag: data.tag || 'cicas-notification',
    data,
    actions: data.actions ? JSON.parse(data.actions) : [],
  });
});

// Notification click — open or focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
