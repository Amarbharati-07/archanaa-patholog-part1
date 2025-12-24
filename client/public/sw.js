// Service Worker DISABLED for production stability
// Service worker caching was causing stale API responses and broken bookings
// This file is kept for backward compatibility but service worker registration is disabled

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});
