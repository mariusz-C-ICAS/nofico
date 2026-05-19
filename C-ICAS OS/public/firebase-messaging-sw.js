importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDf7Ux_8qB41qKXC8aCIh2lsVdOWyldDwM",
  authDomain:        "app-c-icas-os.firebaseapp.com",
  projectId:         "app-c-icas-os",
  storageBucket:     "app-c-icas-os.firebasestorage.app",
  messagingSenderId: "859159856113",
  appId:             "1:859159856113:web:4ddff74aaaa7e0e01afa50",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title = 'C-ICAS OS', body = '', icon = '/favicon.png', data = {} } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon,
    badge: '/favicon.png',
    tag: data.tag || 'cicas-notification',
    data,
  });
});

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
