self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    (self as ServiceWorkerGlobalScope).skipWaiting();
  });
  
  self.addEventListener('fetch', (event) => {
    // Offline logic here if needed
  });
  