console.log('loaded service worker');

self.addEventListener('push', ev => {
  const data = ev.data.json();
  console.log('Got push', data);

  self.registration.showNotification(data.title, {
    body: 'Hello, World!',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    icon: 'http://mongoosejs.com/docs/images/mongoose5_62x30_transparent.png'
  });
});